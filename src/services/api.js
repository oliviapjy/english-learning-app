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
  transcribeAudio(audioBlob) {
    // Create a proper audio file with extension to help the server identify the format
    const audioFile = new File([audioBlob], "recording.webm", {
      type: "audio/webm",
    });
    
    const formData = new FormData();
    formData.append('file', audioFile);
    
    // Log the request for debugging
    console.log("Sending audio file, size:", audioFile.size);
    
    return apiClient.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Text to speech conversion
  textToSpeech(text) {
    return apiClient.post('/tts', { text });
  }
};