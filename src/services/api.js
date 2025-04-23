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
    }
  };