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
  
  // Initialize WebRTC connection - updated implementation
  initializeWebRTC(conversationId, onConnected, onMessage, onDisconnect) {
    // Create a new RTCPeerConnection
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // Add your TURN servers here if needed
      ]
    };
    
    const connection = new RTCPeerConnection(configuration);
    let dataChannel = null;
    
    // Connection state tracking
    let isInitiator = false;
    let isConnecting = false;
    let hasLocalDescription = false;
    let hasRemoteDescription = false;
    
    // Handle ICE candidate events
    connection.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          // Send your ICE candidate to the server
          await sendSignalingMessage({
            type: 'ice-candidate',
            conversationId,
            candidate: event.candidate
          });
        } catch (error) {
          console.error('Error sending ICE candidate:', error);
        }
      }
    };
    
    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', connection.connectionState);
      
      if (connection.connectionState === 'connected') {
        isConnecting = false;
        if (onConnected && dataChannel) {
          onConnected(dataChannel);
        }
      } else if (connection.connectionState === 'disconnected' || 
                connection.connectionState === 'failed' || 
                connection.connectionState === 'closed') {
        if (onDisconnect) {
          onDisconnect();
        }
      }
    };
    
    // Handle incoming data channel
    connection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel(dataChannel, onMessage);
    };
    
    // Handle incoming tracks
    connection.ontrack = (event) => {
      if (onMessage && event.streams) {
        onMessage({
          type: 'audio-track',
          track: event.track,
          streams: event.streams
        });
      }
    };
    
    // Create an API to handle WebRTC operations
    const webRTCApi = {
      // Add a local media stream (like microphone audio)
      async addLocalStream(stream) {
        if (!stream) return;
        
        // Add tracks from the stream to the connection
        stream.getTracks().forEach(track => {
          connection.addTrack(track, stream);
        });
        
        // If we're not already connecting, initiate the connection
        if (!isConnecting) {
          await webRTCApi.initiateConnection();
        }
        
        return true;
      },
      
      // Initiate connection as the caller
      async initiateConnection() {
        try {
          isInitiator = true;
          isConnecting = true;
          
          // Create a data channel if we're the initiator
          if (!dataChannel) {
            dataChannel = connection.createDataChannel('chat');
            setupDataChannel(dataChannel, onMessage);
          }
          
          // Create and set local description (offer)
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          hasLocalDescription = true;
          
          // Send the offer to the server
          await sendSignalingMessage({
            type: 'offer',
            conversationId,
            sdp: connection.localDescription
          });
          
          return true;
        } catch (error) {
          console.error('Error initiating WebRTC connection:', error);
          isConnecting = false;
          return false;
        }
      },
      
      // Process incoming signaling messages
      async processSignalingMessage(message) {
        try {
          if (!message) return false;
          
          if (message.type === 'offer') {
            // If we already have a local description and get an offer, we're in conflict
            // The peer with the lower ID should be the initiator
            if (hasLocalDescription && isInitiator) {
              // If we've already set our local description as an offer,
              // we need to compare IDs or some other conflict resolution
              // Here we'll just reset and accept their offer
              await connection.setLocalDescription(null);
              hasLocalDescription = false;
              isInitiator = false;
            }
            
            // Set the remote description (their offer)
            await connection.setRemoteDescription(new RTCSessionDescription(message.sdp));
            hasRemoteDescription = true;
            
            // Create and set the local description (answer)
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            hasLocalDescription = true;
            
            // Send the answer
            await sendSignalingMessage({
              type: 'answer',
              conversationId,
              sdp: connection.localDescription
            });
            
            isConnecting = true;
          } 
          else if (message.type === 'answer') {
            // Make sure we're in the right state - we should have a local offer
            if (!hasLocalDescription || !isInitiator) {
              console.error('Received answer but not expecting one');
              return false;
            }
            
            // Important: Check current signaling state before setting remote description
            if (connection.signalingState === 'have-local-offer') {
              await connection.setRemoteDescription(new RTCSessionDescription(message.sdp));
              hasRemoteDescription = true;
            } else {
              console.error('Cannot set remote answer in current state:', connection.signalingState);
            }
          } 
          else if (message.type === 'ice-candidate' && message.candidate) {
            // Add ICE candidate if connection is ready
            if (connection.remoteDescription && connection.localDescription) {
              await connection.addIceCandidate(new RTCIceCandidate(message.candidate));
            } else {
              // Queue the candidate for later if we're not ready
              // You might want to implement a queue for these
              console.warn('Received ICE candidate but connection not ready');
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error processing signaling message:', error);
          return false;
        }
      },
      
      // Method to send data through the data channel
      sendData(data) {
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(data));
          return true;
        }
        return false;
      },
      
      // Close the connection
      close() {
        if (dataChannel) {
          dataChannel.close();
          dataChannel = null;
        }
        
        if (connection) {
          connection.close();
        }
        
        // Clear any polling intervals
        clearInterval(pollInterval);
        clearInterval(connectionCheckInterval);
      }
    };
    
    // Helper function to set up data channel
    function setupDataChannel(channel, messageCallback) {
      channel.onopen = () => {
        console.log('Data channel opened');
      };
      
      channel.onclose = () => {
        console.log('Data channel closed');
      };
      
      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (messageCallback) {
            messageCallback(data);
          }
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };
    }
    
    // Helper function to send signaling messages to the server
    async function sendSignalingMessage(data) {
      try {
        // Use the existing API endpoint structure
        const response = await apiClient.post('/webrtc/signaling', {
          ...data
        });
        
        return response.data;
      } catch (error) {
        console.error('Error sending signaling message:', error);
        throw error;
      }
    }
    
    // Set up a polling mechanism to check for incoming signaling messages
    const pollInterval = setInterval(async () => {
      try {
        // Use the existing API endpoint structure
        const response = await apiClient.get(`/webrtc/signaling?conversationId=${conversationId}`);
        const messages = response.data;
        
        if (messages && messages.length > 0) {
          for (const message of messages) {
            await webRTCApi.processSignalingMessage(message);
          }
        }
      } catch (error) {
        console.error('Error polling for signaling messages:', error);
      }
    }, 1000);  // Poll every second
    
    // Check for connection status
    const connectionCheckInterval = setInterval(() => {
      if (connection.connectionState === 'connected') {
        clearInterval(connectionCheckInterval);
      } else if (!isConnecting && !hasRemoteDescription) {
        // Attempt to initiate connection if we haven't already
        webRTCApi.initiateConnection().catch(error => {
          console.error('Failed to initiate connection:', error);
        });
      }
    }, 5000);  // Check every 5 seconds
    
    return webRTCApi;
  },
  
  // This maintains the previous implementation for backward compatibility
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
  
  // Direct audio streaming via WebRTC - updated to use new implementation
  streamAudioToServer(stream, conversationId, onResponse) {
    const rtcApi = this.initializeWebRTC(
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
    );
    
    // Add the audio stream to the connection
    rtcApi.addLocalStream(stream).catch(error => {
      console.error('Failed to add local stream:', error);
    });
    
    return rtcApi;
  }
};