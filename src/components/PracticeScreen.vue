<!-- src/components/PracticeScreen.vue -->
<template>
  <div class="practice-container">
    <!-- Sidebar -->
    <TheSidebar :user="user" @logout="logout" />
    
    <div class="practice-content">
      <!-- Header with environment information -->
      <div class="practice-header">
        <h2>{{ environment }} Practice</h2>
        <div class="practice-status">
          <span :class="['connection-status', connected ? 'connected' : 'disconnected']">
            {{ connected ? 'Connected' : 'Connecting...' }}
          </span>
          <button @click="goBack" class="back-button">Exit Practice</button>
        </div>
      </div>
      
      <!-- Practice area -->
      <div class="practice-area">
        <!-- Objectives panel -->
        <div class="objectives-panel">
          <h3>Your Objectives</h3>
          <div class="objective-content">
            <p v-if="objectives">{{ objectives }}</p>
            <p v-else>Loading your objectives...</p>
          </div>
          <div class="character-info">
            <h4>Your Character</h4>
            <p v-if="userCharacter">{{ userCharacter }}</p>
            <p v-else>Loading character information...</p>
          </div>
        </div>
        
        <!-- Conversation area -->
        <div class="conversation-area">
          <div ref="messagesContainer" class="messages-container">
            <div 
              v-for="(message, index) in messages" 
              :key="index" 
              :class="['message', message.role]"
            >
              <div class="message-content" v-html="formatMessage(message.content)"></div>
              
              <!-- Audio playback controls for assistant messages -->
              <div v-if="message.role === 'assistant' && message.audio" class="audio-controls">
                <button @click="playAudio(message.audio)" class="play-button">
                  <span v-if="currentlyPlaying === message.id">◼</span>
                  <span v-else>▶</span>
                </button>
              </div>
            </div>
            
            <!-- Typing indicator when AI is responding -->
            <div v-if="isTyping" class="message assistant typing">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
          
          <!-- Input area with voice support -->
          <div class="input-area">
            <textarea 
              v-model="userInput" 
              placeholder="Type your message or press the microphone to speak..." 
              @keydown.enter.prevent="sendMessage"
              :disabled="isRecording || isProcessing"
            ></textarea>
            
            <div class="input-controls">
              <button 
                @click="toggleRecording" 
                :class="['mic-button', { 'recording': isRecording }]"
                :disabled="isProcessing"
              >
                {{ isRecording ? 'Stop' : 'Mic' }}
              </button>
              
              <button 
                @click="sendMessage" 
                class="send-button"
                :disabled="!canSend || isProcessing"
              >
                Send
              </button>

              <div class="streaming-indicator" v-if="streamingActive">
                <span class="pulse"></span>
                <span>Voice streaming active</span>
              </div>              
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter, useRoute} from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';
import TheSidebar from './layout/TheSidebar.vue';
import api from '../services/api';
import { marked } from 'marked';

export default {
  name: 'PracticeScreen',
  components: {
    TheSidebar
  },
  props: {
    conversationId: {
      type: [String, Number],
      required: true
    },
    environment: {
      type: String,
      default: 'Everyday Conversations'
    }
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    
    // State variables
    const user = ref(authStore.user || { name: 'User' });
    const messages = ref([]);
    const userInput = ref('');
    const isTyping = ref(false);
    const isRecording = ref(false);
    const isProcessing = ref(false);
    const connected = ref(false);
    const currentlyPlaying = ref(null);
    const mediaRecorder = ref(null);
    const audioChunks = ref([]);
    const messagesContainer = ref(null);
    const realtimeClient = ref(null);
    const objectives = ref('');
    const userCharacter = ref('');
    
    // Extract environment from route query or use prop default
    const environmentToUse = ref(route.query.environment || props.environment);

    // Audio context for playback
    let audioContext = null;
    
    // WebRTC connection
    let audioElement = null;
    const webRTCConnection = ref(null);
    const streamingActive = ref(false);
    const audioStream = ref(null);
    
    // Computed properties
    const canSend = computed(() => {
      return userInput.value.trim().length > 0 || isRecording.value;
    });
    
    // Initialize the practice session
    onMounted(async () => {
      console.log('Using environment:', environmentToUse.value);
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      try {
        // Load conversation data
        await loadConversation();
        
        // Initialize audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize realtime client
        initializeRealtimeClient();

        // Initialize WebRTC connection
        await initializeWebRTC();
        
        // Set up first message to get objectives and roles
        if (messages.value.length === 0) {
          sendInitialMessage();
        }
        
        // Scroll to the bottom of messages
        await nextTick();
        scrollToBottom();
        
        // Set up connection status
        connected.value = true;
      } catch (error) {
        console.error('Failed to initialize practice screen:', error);
        connected.value = false;
      }
    });
    
    // Clean up resources before unmounting
    onBeforeUnmount(() => {
      cleanupResources();
    });
    
    // Watch for new messages to scroll to bottom
    watch(messages, () => {
      nextTick(() => {
        scrollToBottom();
      });
    }, { deep: true });
    
    // Load conversation data from store
    const loadConversation = async () => {
      try {
        // Try to get existing conversation
        const conversation = await conversationStore.getConversation(props.conversationId);
        
        // If conversation exists, load its messages
        if (conversation && conversation.messages) {
          messages.value = conversation.messages;
          
          // Extract objectives and character info from assistant messages if available
          const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');
          if (assistantMessages.length > 0) {
            extractObjectivesAndCharacters(assistantMessages[0].content);
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };
    
    // Initialize the realtime client
    const initializeRealtimeClient = () => {
      realtimeClient.value = api.connectRealtimeChat(
        // Message callback
        (data) => {
          if (data.error) {
            console.error('Realtime chat error:', data.error);
            isTyping.value = false;
            return;
          }
          
          // Handle incoming message chunks
          if (!data.done) {
            // If this is the first chunk, create a new message
            if (!isTyping.value) {
              isTyping.value = true;
              messages.value.push({
                id: Date.now(),
                role: 'assistant',
                content: data.content || '',
                timestamp: new Date().toISOString()
              });
            } else {
              // Append content to the current message
              const lastMessage = messages.value[messages.value.length - 1];
              lastMessage.content += data.content || '';
            }
          } else {
            // Message is complete
            isTyping.value = false;
            
            // If full content is provided, use it
            if (data.full_content) {
              const lastMessage = messages.value[messages.value.length - 1];
              lastMessage.content = data.full_content;
              
              // Extract objectives and character information from first message
              if (messages.value.length <= 2) {
                extractObjectivesAndCharacters(data.full_content);
              }
              
              // Convert to speech
              generateSpeech(lastMessage);
            }
            
            // Save the conversation
            saveConversation();
          }
        },
        // Error callback
        (error) => {
          console.error('Error in realtime chat:', error);
          isTyping.value = false;
          isProcessing.value = false;
        }
      );
    };

    // Initialize WebRTC for audio streaming
    const initializeWebRTC = async () => {
  try {
    // Close any existing connection first
    if (webRTCConnection.value) {
      webRTCConnection.value.close();
      webRTCConnection.value = null;
    }
    
    // Initialize WebRTC connection
    webRTCConnection.value = await api.initializeWebRTC(
      props.conversationId,
      // onConnected callback
      (channel) => {
        console.log('WebRTC connection established with channel:', channel.label);
        connected.value = true;
      },
      // onMessage callback
      (data) => {
        if (data.type === 'transcription') {
          // Handle incoming transcription
          handleWebRTCTranscription(data.text);
        } else if (data.type === 'audio-track') {
          // Handle incoming audio track
          handleIncomingAudioTrack(data.track, data.streams);
        }
      },
      // onDisconnect callback
      () => {
        console.log('WebRTC connection closed');
        streamingActive.value = false;
        connected.value = false;
      }
    );
    
    // Set up error handler
    window.addEventListener('webrtc-error', (event) => {
      console.error('WebRTC error event:', event.detail);
      if (streamingActive.value) {
        stopRecording(); // Stop recording if an error occurs during streaming
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize WebRTC:', error);
    return false;
  }
};

// Handle transcription coming from WebRTC
const handleWebRTCTranscription = (text) => {
  if (text && text.trim()) {
    // Add user message to the conversation
    messages.value.push({
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    });
    
    // Send to API
    sendToRealtimeAPI(text);
  }
};

const reconnectWebRTC = async () => {
  if (webRTCConnection.value) {
    webRTCConnection.value.close();
  }
  
  connected.value = false;
  streamingActive.value = false;
  
  // Short delay before reconnecting
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return initializeWebRTC();
};

// Handle incoming audio track
const handleIncomingAudioTrack = (track, streams) => {
  if (streams && streams.length > 0) {
    // Create or use existing audio element for playback
    if (!audioElement) {
      audioElement = new Audio();
    }
    
    // Set the stream as the source
    audioElement.srcObject = streams[0];
    
    // Auto-play the audio
    audioElement.play().catch(e => console.error('Audio playback error:', e));
  }
};
    
    // Send the initial message to get objectives and character info
    const sendInitialMessage = () => {
      if (messages.value.length === 0) {
        const initialMessage = `I'd like to practice ${props.environment}. Please give me an objective to achieve in this conversation and define our characters.`;
        
        // Add user message to the conversation
        messages.value.push({
          id: Date.now(),
          role: 'user',
          content: initialMessage,
          timestamp: new Date().toISOString()
        });
        
        // Send message to API
        sendToRealtimeAPI(initialMessage);
      }
    };
    
    // Extract objectives and character information from assistant message
    const extractObjectivesAndCharacters = (content) => {
      // Look for objectives in the message
      const objectiveMatch = content.match(/objective[s]?:?\s*(.+?)(?=character|your character|my character|[\n\r]|$)/i);
      if (objectiveMatch && objectiveMatch[1]) {
        objectives.value = objectiveMatch[1].trim();
      } else {
        // Alternative pattern
        const goalMatch = content.match(/goal[s]?:?\s*(.+?)(?=character|your character|my character|[\n\r]|$)/i);
        if (goalMatch && goalMatch[1]) {
          objectives.value = goalMatch[1].trim();
        }
      }
      
      // Look for user character info
      const characterMatch = content.match(/your character:?\s*(.+?)(?=my character|assistant|[\n\r]|$)/i);
      if (characterMatch && characterMatch[1]) {
        userCharacter.value = characterMatch[1].trim();
      }
      
      // If we couldn't extract info automatically, use the first paragraph
      if (!objectives.value && content) {
        const firstParagraph = content.split('\n\n')[0];
        objectives.value = firstParagraph.trim();
      }
    };
    
    // Send a message
    const sendMessage = async () => {
      if (!canSend.value || isProcessing.value) return;
      
      const messageText = userInput.value.trim();
      if (!messageText) return;
      
      isProcessing.value = true;
      
      try {
        // Add message to conversation
        messages.value.push({
          id: Date.now(),
          role: 'user',
          content: messageText,
          timestamp: new Date().toISOString()
        });
        
        // Clear input
        userInput.value = '';
        
        // Send to API
        sendToRealtimeAPI(messageText);
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        isProcessing.value = false;
      }
    };
    
    // Send message to realtime API
    const sendToRealtimeAPI = async (text) => {
      if (realtimeClient.value) {
        try {
          // Convert messages to the format expected by the API
          const context = messages.value.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          
          // Send to realtime API with the selected environment
          const eventSource = await realtimeClient.value.sendMessage(
            text,
            context.slice(0, -1), // Exclude the message we just added
            props.environment
          );
          
          // Store event source for cleanup
          if (typeof window !== 'undefined' && eventSource) {
            window._eventSourceConnections = window._eventSourceConnections || {};
            window._eventSourceConnections[props.conversationId] = eventSource;
          }
        } catch (error) {
          console.error('Error sending to realtime API:', error);
        }
      }
    };
    
    // Generate speech from text
    const generateSpeech = async (message) => {
      try {
        const response = await api.textToSpeech(message.content);
        if (response && response.data && response.data.audio_base64) {
          // Store audio data with the message
          message.audio = response.data.audio_base64;
        }
      } catch (error) {
        console.error('Error generating speech:', error);
      }
    };
    
    // Play audio for a message
    const playAudio = (audioBase64) => {
      if (!audioBase64 || currentlyPlaying.value === audioBase64) {
        // Stop playback if already playing
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
          currentlyPlaying.value = null;
        }
        return;
      }
      
      try {
        // Stop any currently playing audio
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        
        // Create audio element if needed
        if (!audioElement) {
          audioElement = new Audio();
        }
        
        // Set up audio element
        audioElement.src = `data:audio/mp3;base64,${audioBase64}`;
        audioElement.onended = () => {
          currentlyPlaying.value = null;
        };
        
        // Play audio
        audioElement.play();
        currentlyPlaying.value = audioBase64;
      } catch (error) {
        console.error('Error playing audio:', error);
        currentlyPlaying.value = null;
      }
    };
    
    // Toggle audio recording
    const toggleRecording = async () => {
      try {
        if (isRecording.value) {
          // Stop recording
          stopRecording();
        } else {
          // Start recording
          await startRecording();
        }
      } catch (error) {
        console.error('Error toggling recording:', error);
        isRecording.value = false;
      }
    };
    
// Start audio recording
const startRecording = async () => {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStream.value = stream;
    
    // If we're using WebRTC for streaming
    if (webRTCConnection.value) {
      // Make sure connection is initialized
      if (!connected.value) {
        await initializeWebRTC();
      }
      
      // Stream directly via WebRTC
      const success = await webRTCConnection.value.addLocalStream(stream);
      
      if (success) {
        streamingActive.value = true;
        isRecording.value = true;
      } else {
        throw new Error('Failed to add stream to WebRTC connection');
      }
    } else {
      // Fall back to traditional recording
      mediaRecorder.value = new MediaRecorder(stream);
      audioChunks.value = [];
      
      // Set up event handlers
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data);
        }
      };
      
      mediaRecorder.value.onstop = async () => {
        // Create blob from chunks
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
        
        // Transcribe audio
        isProcessing.value = true;
        
        try {
          const result = await api.transcribeAudio(audioBlob);
          
          if (result.data.error) {
            console.error('Transcription error:', result.data.error);
            return;
          }
          
          const transcription = result.data.transcription;
          if (transcription && transcription.trim()) {
            // Set the transcribed text as user input
            userInput.value = transcription;
            
            // Automatically send the message
            await sendMessage();
          }
        } catch (error) {
          console.error('Error processing audio:', error);
        } finally {
          isProcessing.value = false;
        }
      };
      
      // Start recording
      mediaRecorder.value.start();
      isRecording.value = true;
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
};

    
// Stop audio recording
const stopRecording = () => {
  isRecording.value = false;
  
  // Stop WebRTC streaming
  if (streamingActive.value && webRTCConnection.value) {
    streamingActive.value = false;
    
    // We don't stop the connection, just the stream
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => {
        track.stop();
        // Also remove the track from the peer connection if possible
        const senders = webRTCConnection.value.connection?.getSenders?.();
        if (senders) {
          const sender = senders.find(s => s.track === track);
          if (sender) {
            webRTCConnection.value.connection.removeTrack(sender);
          }
        }
      });
      audioStream.value = null;
    }
  }
  // Stop traditional recording
  else if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop();
    
    // Stop all tracks in the stream
    if (mediaRecorder.value.stream) {
      mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
    }
  }
};

    // Save conversation to store
    const saveConversation = () => {
      conversationStore.updateConversation({
        id: props.conversationId,
        messages: messages.value,
        environment: props.environment,
        updatedAt: new Date().toISOString()
      });
    };
    
    // Format message content with markdown
    const formatMessage = (content) => {
      if (!content) return '';
      
      // Process markdown content
      try {
        return marked(content);
      } catch (error) {
        console.error('Error formatting message:', error);
        return content;
      }
    };
    
    // Scroll to bottom of messages container
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    };
    

// Clean up resources
const cleanupResources = () => {
  // Stop any ongoing recording
  if (isRecording.value) {
    stopRecording();
  }
  
  // Stop any audio playback
  if (audioElement) {
    audioElement.pause();
    audioElement = null;
  }
  
  // Close WebRTC connection if exists
  if (webRTCConnection.value) {
    webRTCConnection.value.close();
    webRTCConnection.value = null;
  }
  
  // Clean up audio stream
  if (audioStream.value) {
    audioStream.value.getTracks().forEach(track => track.stop());
    audioStream.value = null;
  }
  
  // Close audio context
  if (audioContext) {
    audioContext.close().catch(e => console.error(e));
    audioContext = null;
  }
};
    
    // Navigate back to practice list
    const goBack = () => {
      router.push('/practice-list');
    };
    
    // User logout
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    return {
      user,
      messages,
      userInput,
      isTyping,
      isRecording,
      isProcessing,
      connected,
      currentlyPlaying,
      messagesContainer,
      canSend,
      webRTCConnection,
      reconnectWebRTC,
      streamingActive,
      objectives,
      userCharacter,
      sendMessage,
      toggleRecording,
      formatMessage,
      playAudio,
      goBack,
      logout,
    };
  }
};
</script>


<style scoped>
.practice-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.practice-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.practice-header {
  padding: 15px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.practice-status {
  display: flex;
  align-items: center;
  gap: 15px;
}

.connection-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.connection-status.connected {
  background-color: #e3f9e5;
  color: #2ecc71;
}

.connection-status.disconnected {
  background-color: #fdf2f2;
  color: #e74c3c;
}

.back-button {
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e9ecef;
}

.practice-area {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.objectives-panel {
  width: 280px;
  padding: 15px;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.objectives-panel h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #2c3e50;
}

.objective-content {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.character-info {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-top: auto;
}

.character-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #2c3e50;
}

.conversation-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  max-width: 80%;
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

.message.assistant {
  align-self: flex-start;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
  color: #2c3e50;
}

.message.typing {
  padding: 10px;
}

.message-content {
  font-size: 15px;
  line-height: 1.5;
}

.message-content :deep(p) {
  margin: 0 0 10px 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.audio-controls {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.play-button {
  padding: 5px 10px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.play-button:hover {
  background-color: #e9ecef;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.typing-indicator span {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 50%;
  animation: typing-animation 1.5s infinite ease;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-animation {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  color: #3498db;
  font-size: 14px;
}

.pulse {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #3498db;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
  }
  
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
  }
}

.input-area {
  padding: 15px;
  background-color: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

textarea {
  width: 100%;
  height: 60px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  resize: none;
  font-size: 15px;
  transition: border-color 0.2s;
}

textarea:focus {
  outline: none;
  border-color: #3498db;
}

.input-controls {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.mic-button {
  padding: 10px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.mic-button.recording {
  background-color: #fdf2f2;
  color: #e74c3c;
  border-color: #e74c3c;
}

.mic-button:hover:not(:disabled) {
  background-color: #e9ecef;
}

.send-button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #2980b9;
}

.send-button:disabled,
.mic-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>