<!-- src/components/Conversation.vue (Updated with Voice Features) -->
<template>
  <div class="conversation-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="../assets/app_logo.png" alt="App Logo" class="app-logo" />
      </div>
      <h3>Conversation</h3>
      <button @click="goHome" class="home-btn">← Back to Home</button>
      
      <div v-if="currentConversation">
        <div class="topic-info">
          <h4>{{ currentConversation.topic.title }}</h4>
          <span class="level-badge">{{ currentConversation.topic.level }}</span>
          <p class="topic-desc">{{ currentConversation.topic.description }}</p>
        </div>
      </div>
      
      <div class="user-profile">
        <span class="username">{{ user.name }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
    </div>
    
    <div class="chat-area">
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.sender]"
        >
          <div class="message-content">{{ message.text }}</div>
          <div class="message-actions" v-if="message.sender === 'ai'">
            <button @click="playAudio(message.text)" class="play-audio-btn">
              🔊
            </button>
          </div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <div v-if="isLoading" class="loading-indicator">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <div class="user-input">
        <!-- Toggle button for switching between text and audio input -->
        <div class="input-toggle">
          <button 
            :class="['toggle-btn', inputType === 'text' ? 'active' : '']" 
            @click="inputType = 'text'"
          >
            Text
          </button>
          <button 
            :class="['toggle-btn', inputType === 'audio' ? 'active' : '']" 
            @click="inputType = 'audio'"
          >
            Audio
          </button>
        </div>

        <!-- Text input - shown when inputType is 'text' -->
        <div v-if="inputType === 'text'" class="text-input-container">
          <textarea 
            v-model="userMessage" 
            placeholder="Type your message here..." 
            @keyup.enter="sendMessage"
          ></textarea>
          <button @click="sendMessage" class="send-btn">Send</button>
        </div>
        
        <!-- Audio input - shown when inputType is 'audio' -->
        <div v-else class="audio-input-container">
          <button 
            @mousedown="startRecording" 
            @mouseup="stopRecording"
            @mouseleave="stopRecording"
            :class="['record-btn', isRecording ? 'recording' : '']"
          >
            {{ isRecording ? 'Recording...' : 'Hold to Speak' }}
          </button>
          <p v-if="audioTranscript" class="audio-transcript">{{ audioTranscript }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';
import apiService from '../services/api'; // Import the API service

export default {
  name: 'ConversationComponent',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User' });
    const messagesContainer = ref(null);
    const userMessage = ref('');
    
    // Refs for audio functionality
    const inputType = ref('text'); // Default to text input
    const isRecording = ref(false);
    const audioTranscript = ref('');
    let mediaRecorder = null;
    let audioChunks = [];
    
    // Audio playback tracking
    let currentAudio = null;

    // Ref for loading state
    const isLoading = ref(false);

    // Check if user is logged in
    onMounted(async () => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      
      // Get conversation ID from route params
      const conversationId = route.params.id;
      if (conversationId) {
        // Fetch conversations if they haven't been loaded
        if (conversationStore.conversations.length === 0) {
          await conversationStore.fetchConversations();
        }
        
        // Find the current conversation
        const conversation = conversationStore.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversationStore.setCurrentConversation(conversation);
        } else {
          // Conversation not found, redirect to home
          router.push('/home');
        }
      } else if (!conversationStore.currentConversation) {
        // No conversation selected, redirect to home
        router.push('/home');
      }
      
      // Scroll to bottom of messages
      await nextTick();
      scrollToBottom();
    });
    
    const currentConversation = computed(() => conversationStore.currentConversation);
    
    const messages = computed(() => {
      return currentConversation.value ? currentConversation.value.messages : [];
    });
    
    // Watch for changes to messages and scroll to bottom
    watch(messages, async () => {
      await nextTick();
      scrollToBottom();
    });
    
    const sendMessage = async () => {
      if (!userMessage.value.trim() || !currentConversation.value) return;
      
      // Add user message to chat
      const message = {
        sender: 'user',
        text: userMessage.value,
        timestamp: new Date()
      };
      
      conversationStore.addMessage(currentConversation.value.id, message);
      
      const userQuery = userMessage.value;
      userMessage.value = '';
      
      // Scroll to bottom
      await nextTick();
      scrollToBottom();
      
      // Show loading state
      isLoading.value = true;
      
      try {
        // Prepare conversation history for context
        const previousMessages = messages.value.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        
        // Use the API service to get GPT response with context
        const response = await apiService.sendMessage(userQuery, previousMessages);
        
        if (response.data && response.data.reply) {
          // Add AI response to chat
          const aiMessage = {
            sender: 'ai',
            text: response.data.reply,
            timestamp: new Date()
          };
          
          conversationStore.addMessage(currentConversation.value.id, aiMessage);
          
          // Automatically play the response if in audio mode
          if (inputType.value === 'audio') {
            // Wait for message to be added and UI to update
            await nextTick();
            // Then play the audio
            playAudio(response.data.reply);
          }
        } else if (response.data && response.data.error) {
          console.error("API error:", response.data.error);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        isLoading.value = false;
      }
    };
    
    const startRecording = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create new media recorder with a MIME type that Whisper supports
        // Check if audio/webm is supported, otherwise try audio/mp4
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/mp4') 
            ? 'audio/mp4'
            : '';
        
        if (!mimeType) {
          console.error("No supported audio MIME type found");
          alert("Your browser doesn't support the required audio recording formats.");
          return;
        }
        
        console.log(`Using MIME type: ${mimeType}`);
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        
        // Listen for data available event
        mediaRecorder.ondataavailable = (event) => {
          console.log(`Audio chunk size: ${event.data.size}`);
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        // Listen for stop event
        mediaRecorder.onstop = () => {
          console.log(`Recording stopped. Total chunks: ${audioChunks.length}`);
          // Process recorded audio
          processAudio();
          
          // Stop all audio tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        // Start recording with smaller time slices
        mediaRecorder.start(100); // Capture in 100ms chunks
        isRecording.value = true;
        audioTranscript.value = '';
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Unable to access microphone. Please check permissions.");
      }
    };

    const stopRecording = () => {
      if (mediaRecorder && isRecording.value) {
        mediaRecorder.stop();
        isRecording.value = false;
      }
    };
    
    const processAudio = async () => {
      if (audioChunks.length === 0) {
        audioTranscript.value = "No audio recorded. Please try again.";
        return;
      }
      
      // Show processing message
      audioTranscript.value = "Processing your audio...";
      isLoading.value = true;
      
      try {
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        
        console.log("Audio blob created:", {
          size: `${audioBlob.size} bytes`,
          type: audioBlob.type
        });
        
        if (audioBlob.size < 100) {
          audioTranscript.value = "Audio too short, please try again.";
          isLoading.value = false;
          return;
        }
        
        // For debugging - create an audio element to test the recording
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("Debug audio URL:", audioUrl);
        // You can uncomment this to test the audio in browser
        // const debugAudio = new Audio(audioUrl);
        // debugAudio.play();
        
        // Send to backend for transcription
        const response = await apiService.transcribeAudio(audioBlob);
        
        if (response.data && response.data.transcription) {
          console.log("Transcription received:", response.data.transcription);
          // Update transcript with actual transcription
          audioTranscript.value = response.data.transcription;
          
          // Use the transcript as a message
          userMessage.value = response.data.transcription;
          sendMessage();
        } else if (response.data && response.data.error) {
          audioTranscript.value = "Error: Could not transcribe audio.";
          console.error("Transcription error:", response.data.error);
        }
      } catch (error) {
        audioTranscript.value = "Error processing audio.";
        console.error("Audio processing error:", error);
        // Log detailed error information
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        }
      } finally {
        isLoading.value = false;
      }
    };
    
    const playAudio = async (text) => {
      try {
        // Stop any currently playing audio
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        
        if (!text || text.trim() === '') {
          console.error("Empty text provided to TTS function");
          return;
        }
        
        console.log(`Converting text to speech: ${text.length} characters`);
        isLoading.value = true;
        
        // Truncate text if needed (OpenAI has limits)
        const truncatedText = text.length > 4000 ? text.substring(0, 4000) : text;
        
        const response = await apiService.textToSpeech(truncatedText);
        
        if (response.data && response.data.audio_base64) {
          console.log(`Received audio data: ${response.data.audio_base64.length} characters`);
          
          // Convert base64 to audio and play
          const audio = new Audio(`data:audio/mp3;base64,${response.data.audio_base64}`);
          
          // Track the current audio instance
          currentAudio = audio;
          
          // Set up event listener to clear currentAudio when playback ends
          audio.onended = () => {
            currentAudio = null;
          };
          
          // Add error handling for audio playback
          audio.onerror = (error) => {
            console.error("Audio playback error:", error);
            currentAudio = null;
          };
          
          // Begin playback
          audio.play().catch(err => {
            console.error("Audio play failed:", err);
          });
        } else if (response.data && response.data.error) {
          console.error("TTS error:", response.data.error);
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      } finally {
        isLoading.value = false;
      }
    };
    
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    };
    
    const goHome = () => {
      router.push('/home');
    };
    
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    return {
      user,
      currentConversation,
      messages,
      userMessage,
      sendMessage,
      formatTime,
      goHome,
      logout,
      messagesContainer,
      // Audio functionality
      inputType,
      isRecording,
      audioTranscript,
      startRecording,
      stopRecording,
      playAudio,
      // Loading state
      isLoading
    };
  }
}
</script>

<style scoped>
.conversation-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: white;
  padding: 0 0 20px;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  background-color: #1a2530;
  padding: 15px;
  text-align: center;
}

.app-logo {
  max-width: 120px;
  height: auto;
}

h3 {
  margin: 15px 20px 5px;
}

.home-btn {
  margin: 5px 20px 15px;
  background-color: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.home-btn:hover {
  color: #2980b9;
}

.topic-info {
  padding: 15px 20px;
  border-top: 1px solid #34495e;
  border-bottom: 1px solid #34495e;
  margin-bottom: 15px;
}

.topic-info h4 {
  margin: 0 0 5px;
  font-size: 16px;
}

.level-badge {
  background-color: #3498db;
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  display: inline-block;
}

.topic-desc {
  margin: 10px 0 0;
  font-size: 13px;
  color: #bdc3c7;
  line-height: 1.4;
}

.user-profile {
  margin-top: auto;
  padding: 15px 20px;
  border-top: 1px solid #34495e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.username {
  font-weight: 500;
}

.logout-btn {
  background-color: transparent;
  border: 1px solid white;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.chat-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.messages-container {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  max-width: 70%;
  padding: 12px 15px;
  border-radius: 12px;
  position: relative;
}

.message.user {
  align-self: flex-end;
  background-color: #3498db;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.ai {
  align-self: flex-start;
  background-color: white;
  color: #2c3e50;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message-time {
  font-size: 11px;
  margin-top: 5px;
  opacity: 0.7;
  text-align: right;
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

.play-audio-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.play-audio-btn:hover {
  opacity: 1;
}

.user-input {
  display: flex;
  flex-direction: column;
  padding: 15px;
  background-color: white;
  border-top: 1px solid #ddd;
  gap: 10px;
}

/* Input toggle styles */
.input-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  border-radius: 20px;
  background-color: #f0f0f0;
  padding: 3px;
  width: 200px;
  margin-left: auto;
  margin-right: auto;
}

.toggle-btn {
  flex: 1;
  border: none;
  background: none;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
  color: #7f8c8d;
  transition: all 0.3s ease;
}

.toggle-btn.active {
  background-color: #3498db;
  color: white;
}

/* Text input styles */
.text-input-container {
  display: flex;
}

textarea {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  height: 24px;
  font-family: inherit;
  font-size: 15px;
}

.send-btn {
  margin-left: 10px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 15px;
  cursor: pointer;
}

.send-btn:hover {
  background-color: #2980b9;
}

/* Audio input styles */
.audio-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.record-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px 24px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 50%;
}

.record-btn:hover {
  background-color: #2980b9;
}

.record-btn.recording {
  background-color: #e74c3c;
  animation: pulse 1.5s infinite;
}

.audio-transcript {
  margin: 10px 0 0;
  font-style: italic;
  color: #7f8c8d;
  font-size: 14px;
  text-align: center;
}

.loading-indicator {
  padding: 10px 20px;
  align-self: flex-start;
}

.typing-indicator {
  display: flex;
  align-items: center;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: #bbb;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
  animation: bounce 1.5s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}

@keyframes dots {
  0%, 20% { content: "."; }
  40% { content: ".."; }
  60%, 100% { content: "..."; }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>