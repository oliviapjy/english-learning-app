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
  
  // Transcribe audio file
// In src/services/api.js
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