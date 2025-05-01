<!-- src/components/PracticeScreen.vue -->
<template>
  <div class="practice-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
      </div>
      <h3>Practice Mode</h3>
      <button @click="goToHome" class="home-btn">← Back to Home</button>
      
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
      <div class="practice-header">
        <div class="practice-info">
          <h2>Practice Mode</h2>
          <p>Practice in real-time with AI based on your current topic.</p>
        </div>
      </div>
      
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

      <div v-if="isLoading || isStreaming" class="loading-indicator">
        <div v-if="isStreaming && streamedResponse" class="streaming-response">
          <div class="message ai">
            <div class="message-content markdown-content" v-html="renderMarkdown(streamedResponse)"></div>
          </div>
        </div>
        <div v-else class="typing-indicator">
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
            :disabled="isStreaming"
          ></textarea>
          <button @click="sendMessage" class="send-btn" :disabled="isStreaming">Send</button>
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
            :disabled="isStreaming"
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

export default {
  name: 'PracticeScreen',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User' });
    const messagesContainer = ref(null);
    const userMessage = ref('');
    
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

    // Ref for loading and streaming states
    const isLoading = ref(false);
    const isStreaming = ref(false);
    const streamedResponse = ref('');
    
    // Messages for this practice session
    const messages = ref([]);

    // Function to render markdown to HTML
    const renderMarkdown = (text) => {
      if (!text) return '';
      
      // Convert markdown to HTML using marked
      const rawHtml = marked(text);
      
      // Sanitize the HTML to prevent XSS
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      
      return cleanHtml;
    };

    // Check if user is logged in and get the original conversation
    onMounted(async () => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      
      // Get original conversation ID from route params
      const sourceConversationId = route.params.sourceId;
      if (sourceConversationId) {
        // Fetch conversations if they haven't been loaded
        if (conversationStore.conversations.length === 0) {
          await conversationStore.fetchConversations();
        }
        
        // Find the source conversation
        const conversation = conversationStore.conversations.find(c => c.id === sourceConversationId);
        if (conversation) {
          // Set as reference but don't modify the original conversation
          conversationStore.setCurrentConversation(conversation);
          
          // Add a welcome message to start the practice session
          const welcomeMessage = {
            sender: 'ai',
            text: `# Welcome to Practice Mode!\n\nWe're going to practice the topic "${conversation.topic.title}". Feel free to ask questions or start a discussion about this topic. I'll respond in real-time to help you practice.\n\nWhat would you like to practice first?`,
            timestamp: new Date()
          };
          messages.value.push(welcomeMessage);
        } else {
          // Conversation not found, but we'll stay on this page and show a message
          const errorMessage = {
            sender: 'ai',
            text: `# Conversation Not Found\n\nI couldn't find the requested conversation. Please select a conversation from the home screen to practice.`,
            timestamp: new Date()
          };
          messages.value.push(errorMessage);
        }
      } else {
        // No conversation selected, but we'll stay on this page and show a message
        const errorMessage = {
          sender: 'ai',
          text: `# No Topic Selected\n\nNo practice topic was selected. You can select a topic from the home screen to start practicing.`,
          timestamp: new Date()
        };
        messages.value.push(errorMessage);
      }
      
      // Scroll to bottom of messages
      await nextTick();
      scrollToBottom();
    });
    
    const currentConversation = computed(() => conversationStore.currentConversation);
    
    // Watch for changes to messages and scroll to bottom
    watch(messages, async () => {
      await nextTick();
      scrollToBottom();
    });
    
    watch(streamedResponse, async () => {
      await nextTick();
      scrollToBottom();
    });
    
    const sendMessage = async () => {
      if (!userMessage.value.trim() || isStreaming.value) return;
      
      // Add user message to chat
      const message = {
        sender: 'user',
        text: userMessage.value,
        timestamp: new Date()
      };
      
      messages.value.push(message);
      
      const userQuery = userMessage.value;
      userMessage.value = '';
      
      // Scroll to bottom
      await nextTick();
      scrollToBottom();
      
      // Start streaming response
      streamResponse(userQuery);
    };
    
    const streamResponse = async (userQuery) => {
      isStreaming.value = true;
      streamedResponse.value = '';
      
      try {
        // Prepare conversation history for context
        const previousMessages = messages.value.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        
        // In a real implementation, you would connect to a streaming API here
        // For now, we'll simulate streaming with a simple timeout-based approach
        
        // Add context about the topic for the practice session
        const topicContext = currentConversation.value ? 
          `You are helping the user practice the topic "${currentConversation.value.topic.title}" which is described as: "${currentConversation.value.topic.description}". The level is ${currentConversation.value.topic.level}.` : 
          "You are a helpful AI assistant for language practice. The user hasn't selected a specific topic yet.";
        
        // Simulate API call to get streaming response
        const simulateStreamingResponse = async () => {
          // This would be replaced with actual streaming API call
          const fullResponse = await apiService.sendMessage(
            userQuery, 
            [...previousMessages, {role: 'system', content: topicContext}]
          );
          
          if (fullResponse.data && fullResponse.data.reply) {
            // Simulate streaming by revealing parts of the response gradually
            const finalResponse = fullResponse.data.reply;
            let currentPosition = 0;
            
            // Stream the response word by word with variable speed
            const streamInterval = setInterval(() => {
              if (currentPosition < finalResponse.length) {
                // Get the next chunk of text (a word or punctuation)
                const nextSpacePos = finalResponse.indexOf(' ', currentPosition + 1);
                const nextChunk = nextSpacePos === -1 
                  ? finalResponse.slice(currentPosition) 
                  : finalResponse.slice(currentPosition, nextSpacePos + 1);
                
                streamedResponse.value += nextChunk;
                currentPosition = nextSpacePos + 1;
                scrollToBottom();
              } else {
                // End of response
                clearInterval(streamInterval);
                
                // Add the full response as a message
                const aiMessage = {
                  sender: 'ai',
                  text: streamedResponse.value,
                  timestamp: new Date()
                };
                
                messages.value.push(aiMessage);
                streamedResponse.value = '';
                isStreaming.value = false;
                
                // Automatically play the response if in audio mode
                if (inputType.value === 'audio') {
                  playAudio(aiMessage.text);
                }
              }
            }, 50); // Adjust speed as needed
          }
        };
        
        await simulateStreamingResponse();
        
      } catch (error) {
        console.error("Error with streaming response:", error);
        isStreaming.value = false;
        
        // Add error message
        messages.value.push({
          sender: 'ai',
          text: "I'm sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date()
        });
      }
    };
    
    const startRecording = async () => {
      if (isStreaming.value) return;
      
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
    
    // Changed from goBack to explicitly go to home
    const goToHome = () => {
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
      goToHome, // Changed function name to match template
      logout,
      messagesContainer,
      renderMarkdown,
      // Audio functionality
      inputType,
      isRecording,
      audioTranscript,
      startRecording,
      stopRecording,
      playAudio,
      isAudioPlaying,
      // Loading and streaming states
      isLoading,
      isStreaming,
      streamedResponse,
      // New recording duration tracking
      recordingTooShort,
      recordingTimeText
    };
  }
}
</script>

<style scoped>
.practice-container {
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

.practice-header {
  padding: 15px 20px;
  background-color: #e8f4fc;
  border-bottom: 1px solid #d1e8f5;
}

.practice-info h2 {
  margin: 0 0 5px;
  color: #2c3e50;
}

.practice-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
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
    background-color: #f0f2f5;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }
  
  :deep(.markdown-content pre) {
    background-color: #f0f2f5;
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  
  :deep(.markdown-content pre code) {
    background-color: transparent;
    padding: 0;
    font-size: 0.9em;
    display: block;
  }
  
  :deep(.markdown-content blockquote) {
    border-left: 4px solid #3498db;
    padding-left: 10px;
    color: #7f8c8d;
    margin-left: 0;
    margin-right: 0;
  }
  
  .message-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
  }
  
  .play-audio-btn {
    background: transparent;
    border: none;
    color: #7f8c8d;
    font-size: 14px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .play-audio-btn:hover {
    background-color: rgba(52, 152, 219, 0.1);
  }
  
  .play-audio-btn.audio-playing {
    color: #3498db;
    background-color: rgba(52, 152, 219, 0.1);
  }
  
  .play-audio-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .message-time {
    position: absolute;
    bottom: -20px;
    font-size: 11px;
    color: #95a5a6;
    right: 5px;
  }
  
  .message.ai .message-time {
    left: 5px;
    right: auto;
  }
  
  .loading-indicator {
    padding: 10px 20px;
  }
  
  .typing-indicator {
    background-color: white;
    border-radius: 12px;
    padding: 12px 15px;
    display: inline-block;
    align-self: flex-start;
    margin-right: auto;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  .typing-indicator span {
    display: inline-block;
    height: 8px;
    width: 8px;
    background-color: #95a5a6;
    border-radius: 50%;
    margin-right: 5px;
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
    margin-right: 0;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.7;
    }
  }
  
  .streaming-response {
    width: 100%;
  }
  
  .user-input {
    padding: 15px;
    background-color: white;
    border-top: 1px solid #e1e8ed;
    display: flex;
    flex-direction: column;
  }
  
  /* Input toggle styling */
  .input-toggle {
    display: flex;
    margin-bottom: 10px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #e1e8ed;
    width: fit-content;
  }
  
  .toggle-btn {
    background-color: #f5f5f5;
    border: none;
    padding: 8px 16px;
    cursor: pointer;
    flex: 1;
  }
  
  .toggle-btn.active {
    background-color: #3498db;
    color: white;
  }
  
  /* Text input styling */
  .text-input-container {
    display: flex;
    gap: 10px;
  }
  
  textarea {
    flex-grow: 1;
    padding: 12px;
    border: 1px solid #e1e8ed;
    border-radius: 4px;
    resize: none;
    height: 50px;
    font-family: inherit;
    font-size: 14px;
  }
  
  textarea:focus {
    outline: none;
    border-color: #3498db;
  }
  
  .send-btn {
    padding: 0 15px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .send-btn:hover {
    background-color: #2980b9;
  }
  
  .send-btn:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
  
  /* Audio input styling */
  .audio-input-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .record-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 15px 30px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    width: 80%;
    max-width: 300px;
  }
  
  .record-btn:hover {
    background-color: #2980b9;
    box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  }
  
  .record-btn.recording {
    background-color: #e74c3c;
    animation: pulse-record 1.5s infinite;
  }
  
  /* Visual feedback for low audio levels */
  .record-btn.low-audio {
    background-color: #f39c12;
  }
  
  .record-btn.very-low-audio {
    background-color: #e67e22;
  }
  
  @keyframes pulse-record {
    0% {
      box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
    }
  }
  
  .audio-transcript {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    color: #2c3e50;
    width: 100%;
    margin: 0;
    text-align: center;
    font-style: italic;
    height: 60px;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .recording-warning {
    color: #e74c3c;
    font-size: 13px;
    margin: 0;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .practice-container {
      flex-direction: column;
    }
    
    .sidebar {
      width: 100%;
      height: auto;
      max-height: 30%;
      overflow-y: auto;
    }
    
    .message {
      max-width: 85%;
    }
    
    .topic-info {
      padding: 10px 15px;
    }
    
    .user-profile {
      padding: 10px 15px;
    }
  }
  
  /* Animations for smooth message appearance */
  .message {
    animation: fadeSlideIn 0.3s ease forwards;
    opacity: 0;
    transform: translateY(10px);
  }
  
  @keyframes fadeSlideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Accessibility enhancements */
  button:focus, textarea:focus {
    outline: 2px solid #3498db;
    outline-offset: 2px;
  }
  
  /* Scrollbar styling */
  .messages-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .messages-container::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  .messages-container::-webkit-scrollbar-thumb {
    background: #bdc3c7;
    border-radius: 4px;
  }
  
  .messages-container::-webkit-scrollbar-thumb:hover {
    background: #95a5a6;
  }
</style>