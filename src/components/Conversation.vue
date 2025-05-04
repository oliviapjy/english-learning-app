<!-- src/components/Conversation.vue (Updated with TheSidebar and Markdown Support) -->
<template>
  <div class="conversation-container">
    <!-- Replace the sidebar with TheSidebar component -->
    <TheSidebar 
      :user="user" 
      @logout="logout"
      @collapse-change="handleSidebarCollapse"
    >
      <!-- Add practice content as a slot for the sidebar -->
      <template #extra-content v-if="currentConversation">
        <div class="topic-info">
          <h4>{{ currentConversation.topic.title }}</h4>
          <span class="level-badge">{{ currentConversation.topic.level }}</span>
          <p class="topic-desc">{{ currentConversation.topic.description }}</p>
          <button @click="goPractice" class="practice-btn">Practice this topic</button>
        </div>
      </template>
    </TheSidebar>
    
    <div class="chat-area" :class="{ 'with-collapsed-sidebar': sidebarCollapsed }">
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.sender]"
        >
          <!-- Render user messages normally -->
          <div v-if="message.sender === 'user'" class="message-content">{{ message.text }}</div>
          
          <!-- Render AI messages with markdown -->
          <div v-else class="message-content markdown-content" v-html="renderMarkdown(message.text)"></div>
          
          <div class="message-actions" v-if="message.sender === 'ai'">
            <button 
              @click="playAudio(message.text)" 
              class="play-audio-btn"
              :disabled="isAudioPlaying"
              :class="{ 'audio-playing': isAudioPlaying }"
            >
              {{ isAudioPlaying ? '🔊 Playing...' : '🔊' }}
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
            @touchstart="startRecording"
            @touchend="stopRecording" 
            :class="['record-btn', isRecording ? 'recording' : '']"
          >
            {{ isRecording ? `Recording${recordingTimeText}` : 'Hold to Speak' }}
          </button>
          <p v-if="audioTranscript" class="audio-transcript">{{ audioTranscript }}</p>
          <p v-if="recordingTooShort" class="recording-warning">
            Recording too short. Hold longer to record.
          </p>
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
import { marked } from 'marked'; // Import marked library for Markdown parsing
import DOMPurify from 'dompurify'; // Import DOMPurify for sanitizing HTML
import TheSidebar from './layout/TheSidebar.vue'; // Import the sidebar component

export default {
  name: 'ConversationComponent',
  components: {
    TheSidebar
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User' });
    const messagesContainer = ref(null);
    const userMessage = ref('');
    const sidebarCollapsed = ref(false);
    
    const audioContext = ref(null);
    const analyser = ref(null);
    const audioLevel = ref(0);

    // Refs for audio functionality
    const inputType = ref('text'); // Default to text input
    const isRecording = ref(false);
    const audioTranscript = ref('');
    const recordingStartTime = ref(null);
    const recordingElapsedTime = ref(0);
    const recordingTooShort = ref(false);
    const MIN_RECORDING_TIME = 500; // 500ms minimum recording time
    const recordingTimer = ref(null);
    const recordingTimeText = ref('');
    let mediaRecorder = null;
    let audioChunks = [];
    
    // Audio playback tracking
    let currentAudio = null;
    const isAudioPlaying = ref(false);

    // Ref for loading state
    const isLoading = ref(false);

    const renderMarkdown = (text) => {
      if (!text) return '';
      
      // Convert markdown to HTML using marked
      // You can configure marked options here to better handle your specific needs
      const rawHtml = marked(text, {
        gfm: true,         // GitHub Flavored Markdown
        breaks: true,      // Add line breaks
        headerIds: true,   // Generate IDs for headers
        mangle: false      // Don't escape HTML
      });
      
      // Sanitize the HTML to prevent XSS
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      
      return cleanHtml;
    };

    // Handle sidebar collapse event
    const handleSidebarCollapse = (collapsed) => {
      sidebarCollapsed.value = collapsed;
    };

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
    
    const goPractice = () => {
      if (currentConversation.value && currentConversation.value.id) {
        console.log(`Navigating to practice with conversation ID: ${currentConversation.value.id}`);
        router.push({
          name: 'Practice',
          params: { id: currentConversation.value.id }
        });
      } else {
        console.error('Cannot navigate to practice: No conversation ID available');
      }
    };

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
        // Reset recording too short warning
        recordingTooShort.value = false;
        
        // Set recording start time
        recordingStartTime.value = Date.now();
        recordingElapsedTime.value = 0;
        
        // Start updating recording time display
        recordingTimer.value = setInterval(() => {
          if (recordingStartTime.value) {
            recordingElapsedTime.value = Date.now() - recordingStartTime.value;
            
            // Format the time for display (after 1 second has passed)
            if (recordingElapsedTime.value >= 1000) {
              const seconds = Math.floor(recordingElapsedTime.value / 1000);
              recordingTimeText.value = ` (${seconds}s)`;
            }
          }
        }, 100);
        
        // Request microphone with specific constraints for optimal quality
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000, // 16kHz sample rate (Whisper's preferred rate)
            channelCount: 1    // mono channel
          } 
        });
        
        // Define recorder options for optimal Whisper compatibility
        let options = {};
        
        // WebM with Opus is preferable if available
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
          };
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options = {
            mimeType: 'audio/wav',
            audioBitsPerSecond: 256000 
          };
        } else {
          // Fallback
          options = {
            audioBitsPerSecond: 128000
          };
        }
        
        console.log(`Using audio format: ${options.mimeType || "default"}`);
        
        // Set up audio context for monitoring
        if (!audioContext.value) {
          audioContext.value = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000 // Match Whisper's preferred sample rate
          });
          analyser.value = audioContext.value.createAnalyser();
          
          const source = audioContext.value.createMediaStreamSource(stream);
          source.connect(analyser.value);
          
          // Monitor audio levels with additional noise floor detection
          const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
          let silenceCounter = 0;
          
          const checkAudioLevel = () => {
            if (isRecording.value) {
              analyser.value.getByteFrequencyData(dataArray);
              
              // Calculate average volume with better noise filtering
              let sum = 0;
              let meaningfulSamples = 0;
              for (let i = 0; i < dataArray.length; i++) {
                // Count only values above the noise floor
                if (dataArray[i] > 5) {
                  sum += dataArray[i];
                  meaningfulSamples++;
                }
              }
              
              // Calculate real audio level ignoring background noise
              audioLevel.value = meaningfulSamples ? sum / meaningfulSamples : 0;
              
              // Track periods of silence
              if (audioLevel.value < 12) {
                silenceCounter++;
                
                // Visual feedback for silence
                document.querySelector('.record-btn').classList.add('low-audio');
                if (silenceCounter > 30) { // About 0.5 seconds of silence
                  document.querySelector('.record-btn').classList.add('very-low-audio');
                }
              } else {
                silenceCounter = 0;
                document.querySelector('.record-btn').classList.remove('low-audio');
                document.querySelector('.record-btn').classList.remove('very-low-audio');
              }
              
              requestAnimationFrame(checkAudioLevel);
            }
          };
          checkAudioLevel();
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];
        
        // Gather audio chunks
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        // Handle recording stop
        mediaRecorder.onstop = () => {
          console.log(`Recording stopped. Total chunks: ${audioChunks.length}`);
          
          // Check if recording meets minimum time
          const recordingDuration = Date.now() - recordingStartTime.value;
          if (recordingDuration < MIN_RECORDING_TIME) {
            console.log(`Recording too short: ${recordingDuration}ms (minimum: ${MIN_RECORDING_TIME}ms)`);
            recordingTooShort.value = true;
            audioChunks = []; // Clear audio chunks
          } else {
            processAudio();
          }
          
          // Stop all audio tracks
          stream.getTracks().forEach(track => track.stop());
          
          // Clear recording timer
          if (recordingTimer.value) {
            clearInterval(recordingTimer.value);
            recordingTimer.value = null;
          }
          
          // Reset recording time text
          recordingTimeText.value = '';
        };
        
        // Start recording with smaller time slices
        mediaRecorder.start(100);
        isRecording.value = true;
        audioTranscript.value = '';
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Unable to access microphone. Please check permissions.");
        
        // Clear recording timer if there was an error
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value);
          recordingTimer.value = null;
        }
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
        
        // Improved check for meaningful audio - 2KB is a better minimum for speech
        if (audioBlob.size < 2000) {
          audioTranscript.value = "Audio too short or quiet. Please speak clearly and try again.";
          isLoading.value = false;
          return;
        }
        
        // Send to backend for transcription
        const response = await apiService.transcribeAudio(audioBlob);
        
        if (response.data && response.data.transcription) {
          const transcription = response.data.transcription.trim();
          console.log("Transcription received:", transcription);
          
          // More comprehensive filtering for common false positives
          const suspiciousTranscriptions = ["you", "bye", "hi", "hey", "hey you", "bye you", "you bye"];
          
          // Check if the transcription is just one of these suspicious words
          if (suspiciousTranscriptions.includes(transcription.toLowerCase()) || 
              transcription.length < 3) {
            audioTranscript.value = "Could not clearly detect speech. Please speak clearly and try again.";
            isLoading.value = false;
            return;
          }
          
          // Update transcript and send the message
          audioTranscript.value = transcription;
          userMessage.value = transcription;
          sendMessage();
        } else if (response.data && response.data.error) {
          audioTranscript.value = "Error: Could not transcribe audio.";
          console.error("Transcription error:", response.data.error);
        } else if (response.data && response.data.warning) {
          audioTranscript.value = response.data.warning;
        }
      } catch (error) {
        audioTranscript.value = "Error processing audio.";
        console.error("Audio processing error:", error);
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
          isAudioPlaying.value = false;
        }
        
        if (!text || text.trim() === '') {
          console.error("Empty text provided to TTS function");
          return;
        }
        
        console.log(`Converting text to speech: ${text.length} characters`);
        isLoading.value = true;
        isAudioPlaying.value = true;
        
        // Strip markdown for better TTS
        const stripMarkdown = (md) => {
          return md
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/_(.*?)_/g, '$1')       // Remove italics
            .replace(/\n\n/g, ' %PAUSE% ')   // Convert paragraph breaks to pauses
            .replace(/###(.*?)\n/g, '$1 ')   // Remove headers
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1'); // Remove links
        };
        
        // Clean text for TTS
        const ttsText = stripMarkdown(text);
        
        // Truncate text if needed (OpenAI has limits)
        const truncatedText = ttsText.length > 4000 ? ttsText.substring(0, 4000) : ttsText;
        
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
            isAudioPlaying.value = false;
          };
          
          // Add error handling for audio playback
          audio.onerror = (error) => {
            console.error("Audio playback error:", error);
            currentAudio = null;
            isAudioPlaying.value = false;
          };
          
          // Begin playback
          audio.play().catch(err => {
            console.error("Audio play failed:", err);
            isAudioPlaying.value = false;
          });
        } else if (response.data && response.data.error) {
          console.error("TTS error:", response.data.error);
          isAudioPlaying.value = false;
        }
      } catch (error) {
        console.error("Error playing audio:", error);
        isAudioPlaying.value = false;
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
      logout,
      goPractice,
      messagesContainer,
      renderMarkdown,
      // Sidebar state
      sidebarCollapsed,
      handleSidebarCollapse,
      // Audio functionality
      inputType,
      isRecording,
      audioTranscript,
      startRecording,
      stopRecording,
      playAudio,
      isAudioPlaying,
      // Loading state
      isLoading,
      // New recording duration tracking
      recordingTooShort,
      recordingTimeText
    };
  }
}
</script>

<style scoped>
.conversation-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.chat-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  transition: margin-left 0.3s ease;
  margin-left: 0; /* Default margin */
  min-width: 0; /* This prevents the chat area from expanding beyond its container */
}

.chat-area.with-collapsed-sidebar {
  margin-left: 0; /* Keep it aligned with the collapsed sidebar */
  /* The sidebar will take care of its own width reduction */
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

.message-content {
  line-height: 1.5;
}

/* Markdown content styling */
:deep(.markdown-content) {
  line-height: 1.5;
}

:deep(.markdown-content h1),
:deep(.markdown-content h2),
:deep(.markdown-content h3),
:deep(.markdown-content h4) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

:deep(.markdown-content h1) {
  font-size: 1.5em;
}

:deep(.markdown-content h2) {
  font-size: 1.3em;
}

:deep(.markdown-content h3) {
  font-size: 1.2em;
}

:deep(.markdown-content p) {
  margin-bottom: 1em;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  margin-left: 1.5em;
  margin-bottom: 1em;
}

:deep(.markdown-content li) {
  margin-bottom: 0.5em;
}

:deep(.markdown-content strong) {
  font-weight: bold;
}

:deep(.markdown-content em) {
  font-style: italic;
}

:deep(.markdown-content code) {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
}

:deep(.markdown-content pre) {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1em;
}

:deep(.markdown-content blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  color: #555;
  margin-bottom: 1em;
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

.play-audio-btn.audio-playing {
  animation: pulse 1.5s infinite;
  color: #3498db;
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

.recording-warning {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
  text-align: center;
  font-weight: 500;
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

.record-btn.low-audio {
  border: 2px solid #f39c12;
}

.record-btn.very-low-audio {
  border: 2px solid #e74c3c;
}

.practice-btn {
  margin-top: 15px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  width: 100%;
}

.practice-btn:hover {
  background-color: #2ecc71;
}

.practice-btn:active {
  background-color: #219653;
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