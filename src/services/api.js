// src/services/api.js
import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000',  // Adjust this to your FastAPI server URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// WebRTC configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default {
  // Send message to chat API with context
  sendMessage(message, previousMessages = [], environment = 'Everyday Conversations') {
    return apiClient.post('/chat', { 
      text: message,
      context: previousMessages,
      environment
    });
  },
  
  // Connect to realtime chat API
  connectRealtimeChat(onMessageCallback, onErrorCallback) {
    return {
      sendMessage(text, context = [], environment = 'Everyday Conversations') {
        console.log(`API Service: Sending realtime message with environment: ${environment}`);
        
        // Create POST request with data
        return apiClient.post('/realtime-chat', { 
          text, 
          context,
          environment
        })
        .then(() => {
          // After successful POST, establish the EventSource connection for streaming response
          const eventSource = new EventSource(`http://127.0.0.1:8000/realtime-chat?_=${Date.now()}`);
          
          // Handle incoming messages
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              onMessageCallback(data);
              
              // Close the connection when done
              if (data.done) {
                eventSource.close();
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
              onErrorCallback(error);
              eventSource.close();
            }
          };
          
          // Handle errors
          eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            eventSource.close();
            onErrorCallback(error);
          };
          
          return eventSource;
        })
        .catch(error => {
          console.error('Error sending message to realtime chat:', error);
          onErrorCallback(error);
          return null;
        });
      }
    };
  },
  
  // Get ephemeral token for WebRTC session
  getWebRTCToken(conversationId) {
    return apiClient.post('/webrtc/token', { conversationId })
      .then(response => response.data)
      .catch(error => {
        console.error('Error getting WebRTC token:', error);
        throw error;
      });
  },
  
  // Initialize WebRTC connection
  initializeWebRTC(conversationId, onConnected, onMessage, onDisconnect) {
    return this.getWebRTCToken(conversationId)
      .then(tokenData => {
        return this.setupWebRTCConnection(tokenData, onConnected, onMessage, onDisconnect);
      });
  },
  
  // Set up WebRTC connection with signaling
  setupWebRTCConnection(tokenData, onConnected, onMessage, onDisconnect) {
    const { token, roomId } = tokenData;
    
    // Create a new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Set up data channel for text messages
    const dataChannel = peerConnection.createDataChannel('chat');
    
    // Data channel event handlers
    dataChannel.onopen = () => {
      console.log('WebRTC data channel open');
      if (onConnected) onConnected(dataChannel);
    };
    
    dataChannel.onmessage = (event) => {
      console.log('WebRTC data channel message received:', event.data);
      if (onMessage) onMessage(JSON.parse(event.data));
    };
    
    dataChannel.onclose = () => {
      console.log('WebRTC data channel closed');
      if (onDisconnect) onDisconnect();
    };
    
    // Set up signaling with WebSocket
    const signalingUrl = `ws://127.0.0.1:8000/webrtc/signaling?token=${token}&room=${roomId}`;
    const signalingSocket = new WebSocket(signalingUrl);
    
    signalingSocket.onopen = () => {
      console.log('Signaling WebSocket connected');
      // Create and send offer
      this.createAndSendOffer(peerConnection, signalingSocket);
    };
    
    signalingSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'offer':
          await this.handleRemoteOffer(peerConnection, message.offer, signalingSocket);
          break;
        
        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
          console.log('Remote answer set');
          break;
        
        case 'ice-candidate':
          if (message.candidate) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
              console.log('Added ICE candidate');
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
          break;
          
        case 'error':
          console.error('Signaling error:', message.error);
          break;
      }
    };
    
    // ICE candidate event handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingSocket.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };
    
    // Track connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        if (onDisconnect) onDisconnect();
      }
    };
    
    // Set up audio/video tracks handler
    peerConnection.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      // Handle incoming audio/video tracks
      if (event.track.kind === 'audio' && onMessage) {
        onMessage({
          type: 'audio-track',
          track: event.track,
          streams: event.streams
        });
      }
    };
    
    return {
      peerConnection,
      dataChannel,
      signalingSocket,
      
      // Method to send data through the data channel
      sendData(data) {
        if (dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(data));
          return true;
        }
        return false;
      },
      
      // Add local media stream
      async addLocalStream(stream) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
        
        // Renegotiate connection after adding tracks
        await this.createAndSendOffer(peerConnection, signalingSocket);
      },
      
      // Close the connection
      close() {
        if (dataChannel) {
          dataChannel.close();
        }
        
        if (signalingSocket) {
          signalingSocket.close();
        }
        
        if (peerConnection) {
          peerConnection.close();
        }
      }
    };
  },
  
  // Create and send WebRTC offer
  async createAndSendOffer(peerConnection, signalingSocket) {
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      signalingSocket.send(JSON.stringify({
        type: 'offer',
        offer: peerConnection.localDescription
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  },
  
  // Handle remote WebRTC offer
  async handleRemoteOffer(peerConnection, offer, signalingSocket) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      signalingSocket.send(JSON.stringify({
        type: 'answer',
        answer: peerConnection.localDescription
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  },
  
  // Transcribe audio file
  transcribeAudio(audioBlob) {
    // Do some basic validation
    if (!audioBlob || audioBlob.size < 100) {
      console.error("Audio blob is too small or invalid");
      return Promise.resolve({ data: { error: "Invalid audio data" } });
    }

    // Log audio characteristics for debugging
    console.log("Audio blob details:", {
      size: audioBlob.size + " bytes",
      type: audioBlob.type
    });
    
    // Create a proper audio file with extension
    const audioFile = new File([audioBlob], "recording.webm", {
      type: audioBlob.type || "audio/webm",
    });
    
    const formData = new FormData();
    formData.append('file', audioFile);
    
    return apiClient.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Add timeout and retry logic
      timeout: 30000,
      // Add progress tracking
      onUploadProgress: (progressEvent) => {
        console.log(`Upload progress: ${Math.round((progressEvent.loaded / progressEvent.total) * 100)}%`);
      }
    })
    .then(response => {
      console.log("Transcription successful:", response.data);
      return response;
    })
    .catch(error => {
      console.error("Transcription API error:", error);
      return { data: { error: "Network error during transcription", details: error.message } };
    });
  },

  // Text to speech conversion
  textToSpeech(text) {
    return apiClient.post('/tts', { text })
    .then(response => {
      console.log("TTS response received");
      return response;
    })
    .catch(error => {
      console.error("TTS error:", error);
      throw error;
    });
  },
  
  // Get WebRTC connection status
  checkWebRTCStatus(token) {
    return apiClient.get(`/webrtc/status?token=${token}`)
      .then(response => response.data)
      .catch(error => {
        console.error('Error checking WebRTC status:', error);
        return { connected: false, error: error.message };
      });
  },
  
// Direct audio streaming via WebRTC
streamAudioToServer(stream, conversationId, onResponse) {
  return this.initializeWebRTC(
    conversationId,
    // On Connected callback
    (channel) => {
      console.log('WebRTC audio channel connected');
      // Inform the server that we're ready to stream
      channel.send(JSON.stringify({
        type: 'stream-ready',
        conversationId
      }));
    },
    // On Message callback
    (data) => {
      if (data.type === 'transcription') {
        onResponse(data.text);
      } else if (data.type === 'error') {
        console.error('Audio streaming error:', data.error);
      }
    },
    // On Disconnect callback
    () => {
      console.log('WebRTC audio connection closed');
    }
  ).then(rtcConnection => {
    // Add the audio stream to the connection
    rtcConnection.addLocalStream(stream);
    return rtcConnection;
  });
}
};