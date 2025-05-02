// src/services/api.js
import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000',  // Adjust this to your FastAPI server URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  // Send message to chat API with context
  sendMessage(message, previousMessages = []) {
    return apiClient.post('/chat', { 
      text: message,
      context: previousMessages 
    });
  },
  
  // Connect to realtime chat API
  connectRealtimeChat(onMessageCallback, onErrorCallback) {
    return {
      sendMessage(text, context = []) {
        // Create EventSource for streaming response
        const eventSource = new EventSource(`http://127.0.0.1:8000/realtime-chat?_=${Date.now()}`);
        
        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessageCallback(data);
          } catch (error) {
            console.error('Error parsing SSE data:', error);
            onErrorCallback(error);
          }
        };
        
        // Handle errors
        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          eventSource.close();
          onErrorCallback(error);
        };
        
        // Send message data
        apiClient.post('/realtime-chat', { text, context })
          .catch(error => {
            console.error('Error sending message to realtime chat:', error);
            eventSource.close();
            onErrorCallback(error);
          });
        
        // Return the EventSource for cleanup
        return eventSource;
      }
    };
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
    }).catch(error => {
      console.error("Transcription API error:", error);
      return { data: { error: "Network error during transcription" } };
    });
  },

  // Text to speech conversion
  textToSpeech(text) {
    return apiClient.post('/tts', { text });
  }
};