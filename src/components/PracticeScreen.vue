<!-- src/components/PracticeScreen.vue -->
<template>
  <div class="practice-container">
    <!-- Header section -->
    <div class="practice-header">
      <button @click="goBack" class="back-btn">← Back</button>
      <div class="topic-info">
        <h2>{{ currentTopic.title }}</h2>
        <span class="level-badge">{{ currentTopic.level }}</span>
        <span class="environment-badge">{{ environmentLabel }}</span>
      </div>
    </div>
    
    <!-- Conversation area -->
    <div class="conversation-area" ref="conversationArea">
      <div 
        v-for="(message, index) in messages" 
        :key="index" 
        :class="['message', message.sender === 'user' ? 'user-message' : 'ai-message']"
      >
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">{{ message.sender === 'user' ? 'You' : 'LangBuddy' }}</span>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text" v-html="formatMessage(message.text)"></div>
        </div>
        
        <!-- Play button for AI messages -->
        <button 
          v-if="message.sender === 'ai'" 
          @click="playMessage(message.text)" 
          class="play-btn"
          :disabled="isPlaying"
        >
          <span v-if="isPlaying && playingMessageIndex === index">▶️ Playing...</span>
          <span v-else>▶️ Listen</span>
        </button>
      </div>
      
      <!-- Typing indicator with live streamed content -->
      <div v-if="isTyping" class="message ai-message typing">
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">LangBuddy</span>
            <span class="timestamp">{{ formatTime(new Date()) }}</span>
          </div>
          <div class="message-text" v-html="formatMessage(typingContent)"></div>
          <div class="typing-indicator" v-if="!typingContent">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Input area -->
    <div class="input-area">
      <div class="input-container">
        <textarea 
          v-model="userInput" 
          @keyup.enter="sendMessage"
          placeholder="Type your message..."
          :disabled="isTyping"
          ref="inputField"
        ></textarea>
        
        <div class="input-actions">
          <button 
            @click="startRecording" 
            class="record-btn"
            :class="{ 'recording': isRecording }"
            :disabled="isTyping || isRecording"
          >
            🎤 {{ isRecording ? 'Recording...' : 'Record' }}
          </button>
          
          <button 
            @click="sendMessage" 
            class="send-btn"
            :disabled="!userInput.trim() || isTyping"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useConversationStore } from '../stores/conversation';
import api from '../services/api';

export default {
  name: 'PracticeScreen',
  props: {
    conversationId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const conversationStore = useConversationStore();
    const conversationArea = ref(null);
    const inputField = ref(null);
    
    // State variables
    const messages = ref([]);
    const userInput = ref('');
    const isTyping = ref(false);
    const isRecording = ref(false);
    const isPlaying = ref(false);
    const playingMessageIndex = ref(-1);
    const typingContent = ref('');
    const environment = ref('everyday'); // Default environment
    let audioContext = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let eventSource = null;
    
    // Environment data mapping
    const environmentData = {
      business: {
        name: 'Business English',
        icon: '💼',
        description: 'Professional conversations and negotiations'
      },
      travel: {
        name: 'Travel & Culture',
        icon: '✈️',
        description: 'Tourist phrases and cultural interactions'
      },
      academic: {
        name: 'Academic Discussions',
        icon: '🎓',
        description: 'Formal debates and presentations'
      },
      everyday: {
        name: 'Everyday Conversations',
        icon: '💬',
        description: 'Casual interactions and daily scenarios'
      }
    };
    
    // Computed properties
    const currentTopic = computed(() => {
      const conversation = conversationStore.conversations.find(c => c.id === props.conversationId);
      return conversation ? conversation.topic : { title: 'Practice', level: 'Intermediate' };
    });
    
    const environmentLabel = computed(() => {
      const envData = environmentData[environment.value];
      return envData ? `${envData.icon} ${envData.name}` : '💬 Everyday Conversations';
    });
    
    // Methods
    const loadConversation = () => {
      const conversation = conversationStore.conversations.find(c => c.id === props.conversationId);
      if (conversation) {
        messages.value = [...conversation.messages];
        
        // Get environment from URL query parameter or conversation object
        environment.value = route.query.environment || 
                           (conversation.environment || 'everyday');
        
        // If it's a new practice session, add an initial system message
        if (messages.value.length === 0) {
          // Add an initial system message based on the environment
          sendInitialMessage();
        }
      } else {
        // Handle error or redirect
        router.push('/home');
      }
    };
    
    const sendInitialMessage = () => {
      // Create a message to initialize the conversation with the selected environment
      const initialMessage = {
        sender: 'user',
        text: `Let's practice ${environmentData[environment.value].name} scenarios.`,
        timestamp: new Date()
      };
      
      // Add message to store
      conversationStore.addMessage(props.conversationId, initialMessage);
      
      // Send the initial message
      sendToAPI(initialMessage);
    };
    
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const formatMessage = (text) => {
      if (!text) return '';
      
      // Handle markdown formatting
      let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      
      // Handle script formatting (e.g., CHARACTER: text)
      formattedText = formattedText.replace(/([A-Z]+):\s/g, '<strong>$1:</strong> ');
      
      return formattedText;
    };
    
    const scrollToBottom = async () => {
      await nextTick();
      if (conversationArea.value) {
        conversationArea.value.scrollTop = conversationArea.value.scrollHeight;
      }
    };
    
    const sendMessage = async () => {
      if (!userInput.value.trim() || isTyping.value) return;
      
      const userMessage = {
        sender: 'user',
        text: userInput.value.trim(),
        timestamp: new Date()
      };
      
      // Add user message to the conversation
      messages.value.push(userMessage);
      scrollToBottom();
      
      // Clear input field
      userInput.value = '';
      
      // Add message to store
      conversationStore.addMessage(props.conversationId, userMessage);
      
      // Send to API
      sendToAPI(userMessage);
    };
    
    const sendToAPI = async (userMessage) => {
      // Set typing state
      isTyping.value = true;
      typingContent.value = '';
      
      // Format previous messages for the API
      const formattedMessages = messages.value.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Add environment context at the beginning of the conversation
      const environmentContext = {
        role: 'system',
        content: `This is a ${environmentData[environment.value].name} practice scenario. Focus on language appropriate for ${environmentData[environment.value].description}.`
      };
      
      // Insert the environment context at the beginning
      formattedMessages.unshift(environmentContext);
      
      try {
        // Close any existing event source
        if (eventSource) {
          eventSource.close();
        }
        
        // Connect to realtime chat API
        const realtimeChat = api.connectRealtimeChat(
          // Message handler
          (data) => {
            if (data.error) {
              console.error('API error:', data.error);
              isTyping.value = false;
              return;
            }
            
            if (data.content) {
              // Append to the typing content
              typingContent.value += data.content;
              scrollToBottom();
            }
            
            if (data.done) {
              isTyping.value = false;
              
              // Create the final AI message
              const aiMessage = {
                sender: 'ai',
                text: data.full_content || typingContent.value,
                timestamp: new Date()
              };
              
              // Add AI message to the conversation
              messages.value.push(aiMessage);
              
              // Add message to store
              conversationStore.addMessage(props.conversationId, aiMessage);
              
              // Reset typing content
              typingContent.value = '';
              
              // Scroll to bottom
              scrollToBottom();
              
              // Focus the input field
              nextTick(() => {
                inputField.value && inputField.value.focus();
              });
            }
          },
          // Error handler
          (error) => {
            console.error('Realtime chat error:', error);
            isTyping.value = false;
            typingContent.value = '';
          }
        );
        
        // Send the message and get event source for cleanup
        eventSource = realtimeChat.sendMessage(userMessage.text, formattedMessages);
      } catch (error) {
        console.error('Error sending message:', error);
        isTyping.value = false;
        typingContent.value = '';
      }
    };
    
    const startRecording = async () => {
      if (isRecording.value) return;
      
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create audio context if not already created
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Reset audio chunks
        audioChunks = [];
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(stream);
        
        // Setup event handlers
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          // Create blob from audio chunks
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Only proceed if there's actual audio data
          if (audioBlob.size > 1000) {
            try {
              // Send to transcription API
              const response = await api.transcribeAudio(audioBlob);
              
              if (response.data && response.data.transcription) {
                // Set transcription as user input
                userInput.value = response.data.transcription;
                
                // Auto-send if there's content
                if (userInput.value.trim()) {
                  sendMessage();
                }
              } else if (response.data && response.data.warning) {
                console.warn('Transcription warning:', response.data.warning);
              } else if (response.data && response.data.error) {
                console.error('Transcription error:', response.data.error);
              }
            } catch (error) {
              console.error('Error transcribing audio:', error);
            }
          } else {
            console.warn('Audio recording too short or empty');
          }
          
          // Reset recording state
          isRecording.value = false;
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        // Start recording
        mediaRecorder.start();
        isRecording.value = true;
        
        // Stop recording after 10 seconds
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      } catch (error) {
        console.error('Error starting recording:', error);
        isRecording.value = false;
      }
    };
    
    const stopRecording = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
    
    const playMessage = async (text) => {
      if (isPlaying.value) return;
      
      try {
        isPlaying.value = true;
        const index = messages.value.findIndex(m => m.text === text);
        playingMessageIndex.value = index;
        
        // Get audio from TTS API
        const response = await api.textToSpeech(text);
        
        if (response.data && response.data.audio_base64) {
          // Create audio element
          const audio = new Audio();
          audio.src = `data:audio/mp3;base64,${response.data.audio_base64}`;
          
          // Play audio
          audio.play();
          
          // Reset playing state when audio ends
          audio.onended = () => {
            isPlaying.value = false;
            playingMessageIndex.value = -1;
          };
        } else {
          console.error('No audio data received from TTS API');
          isPlaying.value = false;
          playingMessageIndex.value = -1;
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        isPlaying.value = false;
        playingMessageIndex.value = -1;
      }
    };
    
    const goBack = () => {
      router.push('/practice-list');
    };
    
    // Lifecycle hooks
    onMounted(() => {
      loadConversation();
      scrollToBottom();
      
      // Focus the input field
      nextTick(() => {
        inputField.value && inputField.value.focus();
      });
    });
    
    onUnmounted(() => {
      // Clean up resources
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      // Close any open EventSource connection
      if (eventSource) {
        eventSource.close();
      }
    });
    
    // Watch for changes to messages and scroll to bottom
    watch(messages, () => {
      scrollToBottom();
    });
    
    // Watch for changes to typing content and scroll to bottom
    watch(typingContent, () => {
      scrollToBottom();
    });
    
    // Watch for route changes to update environment
    watch(() => route.query.environment, (newEnvironment) => {
      if (newEnvironment && environmentData[newEnvironment]) {
        environment.value = newEnvironment;
      }
    });
    
    return {
      messages,
      userInput,
      isTyping,
      isRecording,
      isPlaying,
      playingMessageIndex,
      typingContent,
      currentTopic,
      environmentLabel,
      conversationArea,
      inputField,
      formatTime,
      formatMessage,
      sendMessage,
      startRecording,
      stopRecording,
      playMessage,
      goBack
    };
  }
};
</script>

<style scoped>
.practice-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.practice-header {
  padding: 15px 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.back-btn {
  background-color: transparent;
  border: none;
  color: #3498db;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  margin-right: 20px;
}

.topic-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.topic-info h2 {
  margin: 0;
  font-size: 20px;
  margin-right: 10px;
}

.level-badge, .environment-badge {
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 10px;
}

.level-badge {
  background-color: #e8f4fc;
  color: #3498db;
}

.environment-badge {
  background-color: #f0f8ff;
  color: #2c3e50;
}

.conversation-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.message {
  margin-bottom: 15px;
  display: flex;
  align-items: flex-start;
  max-width: 80%;
}

.user-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-message {
  align-self: flex-start;
}

.message-content {
  background-color: white;
  border-radius: 12px;
  padding: 10px 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.user-message .message-content {
  background-color: #3498db;
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
}

.sender-name {
  font-weight: 500;
}

.timestamp {
  color: #7f8c8d;
}

.user-message .timestamp {
  color: rgba(255,255,255,0.8);
}

.message-text {
  line-height: 1.4;
}

.play-btn {
  background-color: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  margin-left: 10px;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.play-btn:disabled {
  color: #95a5a6;
  cursor: not-allowed;
}

.typing-indicator {
  display: flex;
  align-items: center;
  height: 20px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  margin: 0 2px;
  background-color: #95a5a6;
  border-radius: 50%;
  display: inline-block;
  animation: typing 1.4s infinite both;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
}

.input-area {
  padding: 15px 20px;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

.input-container {
  display: flex;
  flex-direction: column;
}

textarea {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  font-size: 16px;
  resize: none;
  height: 80px;
  margin-bottom: 10px;
  font-family: inherit;
}

textarea:focus {
  outline: none;
  border-color: #3498db;
}

.input-actions {
  display: flex;
  justify-content: space-between;
}

.record-btn, .send-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.record-btn {
  background-color: #f5f5f5;
  color: #7f8c8d;
}

.record-btn.recording {
  background-color: #e74c3c;
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.send-btn {
  background-color: #3498db;
  color: white;
}

.send-btn:disabled, .record-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>