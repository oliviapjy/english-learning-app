<!-- src/components/PracticeScreen.vue -->
<template>
  <div class="practice-container">
    <!-- Sidebar Component -->
    <TheSidebar :user="user" @logout="logout" />
    
    <div class="practice-content">
      <div class="practice-header">
        <div class="header-left">
          <button class="back-button" @click="goBack">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <h2 v-if="currentConversation">{{ currentConversation.topic.title }}</h2>
        </div>
        <div class="header-right">
          <span class="level-badge" v-if="currentConversation">{{ currentConversation.topic.level }}</span>
          <span class="environment-badge">{{ environment }}</span>
        </div>
      </div>
      
      <div class="practice-chat-container">
        <div class="chat-messages" ref="messagesContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message', message.sender === 'user' ? 'user-message' : 'ai-message']"
          >
            <div class="message-content" v-html="formatMessage(message.text)"></div>
            <div class="message-actions" v-if="message.sender === 'ai'">
              <button class="action-button play-button" @click="speakMessage(message.text)" title="Listen">
                <i class="fas fa-volume-up"></i>
              </button>
            </div>
            <div class="message-timestamp">{{ formatTime(message.timestamp) }}</div>
          </div>
          <div class="typing-indicator" v-if="isAiTyping">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
        
        <div class="practice-input-container">
          <div class="voice-input-container" :class="{ 'recording': isRecording }">
            <button 
              class="voice-button" 
              @mousedown="startRecording" 
              @mouseup="stopRecording"
              @touchstart="startRecording"
              @touchend="stopRecording"
              @mouseleave="stopRecording"
              :disabled="isProcessingAudio"
            >
              <i :class="['fas', isRecording ? 'fa-stop' : 'fa-microphone']"></i>
              {{ isRecording ? 'Release to Send' : 'Hold to Talk' }}
            </button>
            <div v-if="isProcessingAudio" class="processing-indicator">
              Processing audio...
            </div>
          </div>
          
          <div class="text-input-container">
            <textarea 
              v-model="userInput" 
              placeholder="Type your message..."
              @keydown.enter.prevent="sendMessage"
              :disabled="isAiTyping || isProcessingAudio"
              rows="1"
              ref="textInput"
            ></textarea>
            <button 
              class="send-button" 
              @click="sendMessage" 
              :disabled="!userInput.trim() || isAiTyping || isProcessingAudio"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';
import api from '../services/api';
import TheSidebar from './layout/TheSidebar.vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default {
  name: 'PracticeScreen',
  components: {
    TheSidebar
  },
  props: {
    conversationId: {
      type: String,
      required: true
    },
    environment: {
      type: String,
      default: 'everyday'
    }
  },
  setup(props) {
    const router = useRouter();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    
    // User data
    const user = ref({ name: 'User' });
    
    // Conversation data
    const currentConversation = ref(null);
    const messages = ref([]);
    
    // UI state
    const messagesContainer = ref(null);
    const textInput = ref(null);
    const userInput = ref('');
    const isAiTyping = ref(false);
    
    // Audio recording state
    const isRecording = ref(false);
    const isProcessingAudio = ref(false);
    const mediaRecorder = ref(null);
    const audioChunks = ref([]);
    
    // Realtime connection
    let realtimeConnection = null;
    let eventSource = null;
    
    // Speech API
    const audioElement = ref(null);
    
    // Format the AI message with markdown and handle translations
    const formatMessage = (text) => {
      // Security: Sanitize the HTML output
      const sanitizedHtml = DOMPurify.sanitize(marked.parse(text));
      
      // Format character names in conversation scripts
      const formattedHtml = sanitizedHtml.replace(
        /([A-Z]+):/g, 
        '<strong class="character-name">$1:</strong>'
      );
      
      return formattedHtml;
    };
    
    // Format timestamp to readable time
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Initialize the conversation
    const initConversation = async () => {
      try {
        // If the conversation exists, load it
        const conversations = await conversationStore.fetchConversations();
        currentConversation.value = conversations.find(c => c.id === props.conversationId);
        
        if (currentConversation.value) {
          messages.value = currentConversation.value.messages;
          
          // Setup realtime connection
          setupRealtimeConnection();
          
          // Scroll to bottom
          await nextTick();
          scrollToBottom();
        } else {
          console.error('Conversation not found');
          router.push('/practice-list');
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };
    
// Setup realtime connection
const setupRealtimeConnection = () => {
      realtimeConnection = api.connectRealtimeChat(
        handleRealtimeMessage,
        handleRealtimeError
      );
      
      console.log(`Setting up realtime connection with environment: ${props.environment}`);
    };
    
    // Handle incoming messages from the realtime API
    const handleRealtimeMessage = (data) => {
      if (data.error) {
        console.error('Realtime API error:', data.error);
        isAiTyping.value = false;
        return;
      }
      
      if (data.content && !data.done) {
        if (!isAiTyping.value) {
          isAiTyping.value = true;
          
          // Create a new message for streaming response
          messages.value.push({
            sender: 'ai',
            text: data.content,
            timestamp: new Date()
          });
        } else {
          // Append to the last message
          const lastMessage = messages.value[messages.value.length - 1];
          if (lastMessage && lastMessage.sender === 'ai') {
            lastMessage.text += data.content;
          }
        }
        
        // Save to store and scroll to bottom
        conversationStore.addMessage(props.conversationId, messages.value[messages.value.length - 1]);
        scrollToBottom();
      }
      
      if (data.done) {
        isAiTyping.value = false;
        
        // If there's a full content provided, update the message
        if (data.full_content) {
          const lastMessage = messages.value[messages.value.length - 1];
          if (lastMessage && lastMessage.sender === 'ai') {
            lastMessage.text = data.full_content;
            conversationStore.addMessage(props.conversationId, lastMessage);
          }
        }
      }
    };
    
    // Handle errors from the realtime API
    const handleRealtimeError = (error) => {
      console.error('Realtime connection error:', error);
      isAiTyping.value = false;
    };
    

const sendMessage = async () => {
  if (!userInput.value.trim() || isAiTyping.value) return;
  
  const messageText = userInput.value.trim();
  userInput.value = '';
  
  // Add user message to the conversation
  const userMessage = {
    sender: 'user',
    text: messageText,
    timestamp: new Date()
  };
  messages.value.push(userMessage);
  conversationStore.addMessage(props.conversationId, userMessage);
  
  // Format messages for API
  const contextMessages = messages.value.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
  
  // Send to API with environment parameter
  try {
    isAiTyping.value = true; // Start showing typing indicator immediately
    
    eventSource = await realtimeConnection.sendMessage(
      messageText, 
      contextMessages,
      props.environment // Pass the environment prop
    );
    
    // Store the event source for cleanup
    if (typeof window !== 'undefined' && eventSource) {
      window._eventSourceConnections = window._eventSourceConnections || {};
      window._eventSourceConnections[props.conversationId] = eventSource;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    isAiTyping.value = false;
  }
  
  // Focus on input and scroll to bottom
  if (textInput.value) {
    textInput.value.focus();
  }
  scrollToBottom();
};
    
    // Start audio recording
    const startRecording = async () => {
      try {
        isRecording.value = true;
        audioChunks.value = [];
        
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create media recorder
        mediaRecorder.value = new MediaRecorder(stream);
        
        // Collect audio chunks
        mediaRecorder.value.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            audioChunks.value.push(event.data);
          }
        });
        
        // Start recording
        mediaRecorder.value.start();
      } catch (error) {
        console.error('Failed to start recording:', error);
        isRecording.value = false;
        alert('Microphone access is required for voice input. Please check your browser settings.');
      }
    };
    
    // Stop audio recording and process audio
    const stopRecording = async () => {
      if (!isRecording.value || !mediaRecorder.value) return;
      
      isRecording.value = false;
      isProcessingAudio.value = true;
      
      // Stop recording
      mediaRecorder.value.stop();
      
      // Process audio when recording stops
      mediaRecorder.value.addEventListener('stop', async () => {
        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
          
          if (audioBlob.size > 100) {
            // Send audio to API for transcription
            const response = await api.transcribeAudio(audioBlob);
            
            if (response?.data?.transcription) {
              // Set transcribed text as user input and send
              userInput.value = response.data.transcription;
              await nextTick();
              sendMessage();
            } else if (response?.data?.warning) {
              console.warn('Transcription warning:', response.data.warning);
            } else if (response?.data?.error) {
              console.error('Transcription error:', response.data.error);
            }
          } else {
            console.warn('Audio too short or quiet');
          }
        } catch (error) {
          console.error('Failed to process audio:', error);
        } finally {
          // Stop all tracks to release microphone
          if (mediaRecorder.value && mediaRecorder.value.stream) {
            mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
          }
          isProcessingAudio.value = false;
        }
      });
    };
    
    // Text to speech for AI messages
    const speakMessage = async (text) => {
      try {
        // Extract the English part (before any translations in parentheses)
        let textToSpeak = text;
        const parenMatch = text.match(/^(.*?)(\(.*?\))/) || text.match(/^([^(]+)/);
        
        if (parenMatch) {
          textToSpeak = parenMatch[1].trim();
        }
        
        // Remove markdown and character names from text
        textToSpeak = textToSpeak.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
        textToSpeak = textToSpeak.replace(/_(.*?)_/g, '$1'); // Remove italics
        textToSpeak = textToSpeak.replace(/[A-Z]+:\s*/g, ''); // Remove character names
        
        // Call TTS API
        const response = await api.textToSpeech(textToSpeak);
        
        if (response.data && response.data.audio_base64) {
          // Create audio source
          const audioSrc = `data:audio/mp3;base64,${response.data.audio_base64}`;
          
          // Create or reuse audio element
          if (!audioElement.value) {
            audioElement.value = new Audio();
          }
          
          // Set source and play
          audioElement.value.src = audioSrc;
          audioElement.value.play();
        }
      } catch (error) {
        console.error('Failed to play speech:', error);
      }
    };
    
    // Scroll chat to bottom
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };
    
    // Navigate back to practice list
    const goBack = () => {
      router.push('/practice-list');
    };
    
    // Logout
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    // Cleanup resources on component unmount
    onBeforeUnmount(() => {
      // Close event source
      if (eventSource && typeof eventSource.close === 'function') {
        eventSource.close();
      }
      
      // Stop audio recording if active
      if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop();
        
        if (mediaRecorder.value.stream) {
          mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
        }
      }
      
      // Stop audio playback
      if (audioElement.value) {
        audioElement.value.pause();
        audioElement.value.src = '';
      }
    });
    
    // Initialize on component mount
    onMounted(async () => {
      // Check authentication
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      // Set user data
      user.value = authStore.user;
      
      // Initialize conversation
      await initConversation();
      
      // Auto-focus text input
      if (textInput.value) {
        textInput.value.focus();
      }
    });
    
    // Watch for changes in messages and scroll to bottom
    watch(messages, () => {
      scrollToBottom();
    }, { deep: true });
    
    return {
      user,
      currentConversation,
      messages,
      messagesContainer,
      textInput,
      userInput,
      isAiTyping,
      isRecording,
      isProcessingAudio,
      formatMessage,
      formatTime,
      sendMessage,
      startRecording,
      stopRecording,
      speakMessage,
      goBack,
      logout
    };
  }
};
</script>

<style scoped>
.practice-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.practice-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
}

.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.back-button {
  background: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.back-button:hover {
  color: #2980b9;
}

.header-right {
  display: flex;
  gap: 10px;
}

.level-badge {
  background-color: #e8f4fc;
  color: #3498db;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.environment-badge {
  background-color: #f0f8ff;
  color: #2c3e50;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.practice-chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 12px;
  position: relative;
  overflow-wrap: break-word;
  word-break: break-word;
}

.user-message {
  background-color: #3498db;
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.ai-message {
  background-color: white;
  color: #2c3e50;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message-content {
  line-height: 1.5;
  font-size: 15px;
}

.message-content :deep(.character-name) {
  color: #3498db;
  font-weight: 600;
  display: block;
  margin-top: 8px;
}

.user-message .message-content :deep(strong) {
  color: #ffffff;
}

.message-actions {
  display: flex;
  gap: 5px;
  margin-top: 5px;
  justify-content: flex-end;
}

.action-button {
  background: transparent;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 5px;
  border-radius: 3px;
}

.action-button:hover {
  color: #3498db;
  background-color: #f0f8ff;
}

.message-timestamp {
  font-size: 10px;
  color: #95a5a6;
  margin-top: 5px;
  text-align: right;
}

.user-message .message-timestamp {
  color: #e3f2fd;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 15px;
  background-color: white;
  border-radius: 12px;
  align-self: flex-start;
  margin-bottom: 10px;
}

.typing-indicator .dot {
  width: 8px;
  height: 8px;
  background-color: #3498db;
  border-radius: 50%;
  animation: bounce 1.5s infinite ease-in-out;
}

.typing-indicator .dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
}

.practice-input-container {
  padding: 15px;
  background-color: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.voice-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.voice-button {
  padding: 12px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s, transform 0.1s;
  width: 100%;
  justify-content: center;
}

.voice-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.recording .voice-button {
  background-color: #e74c3c;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}

.processing-indicator {
  font-size: 12px;
  color: #7f8c8d;
  text-align: center;
  margin-top: 5px;
}

.text-input-container {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.text-input-container textarea {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  resize: none;
  max-height: 100px;
  min-height: 45px;
  line-height: 1.4;
  transition: height 0.2s;
}

.text-input-container textarea:focus {
  outline: none;
  border-color: #3498db;
}

.text-input-container textarea:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  padding: 12px 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  height: 45px;
  width: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover {
  background-color: #2980b9;
}

.send-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* For mobile responsiveness */
@media (max-width: 768px) {
  .message {
    max-width: 90%;
  }
  
  .practice-header h2 {
    font-size: 18px;
  }
  
  .practice-input-container {
    padding: 10px;
  }
  
  .voice-button {
    padding: 10px 15px;
  }
  
  .text-input-container textarea {
    padding: 10px;
  }
}
</style>