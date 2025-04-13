<!-- src/components/Conversation.vue (Updated) -->
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
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <div class="user-input">
        <textarea 
          v-model="userMessage" 
          placeholder="Type your message here..." 
          @keyup.enter="sendMessage"
        ></textarea>
        <button @click="sendMessage" class="send-btn">Send</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';

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
      
      // Simulate AI response
      setTimeout(() => {
        generateAIResponse(userQuery);
      }, 1000);
    };
    
    const generateAIResponse = (query) => {
      if (!currentConversation.value) return;
      
      // Similar to the original component's logic
      let response = "I'm sorry, I didn't understand that. Could you please rephrase?";
      
      const topic = currentConversation.value.topic.title;
      
      if (topic === 'Everyday Conversations') {
        if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
          response = "Hi there! It's nice to meet you. How are you doing today?";
        } else if (query.toLowerCase().includes('how are you')) {
          response = "I'm doing well, thank you for asking! How about yourself?";
        } else if (query.toLowerCase().includes('weather')) {
          response = "Talking about the weather is a common topic in English conversations! What's the weather like where you are?";
        }
      } else if (topic === 'Business English') {
        if (query.toLowerCase().includes('meeting')) {
          response = "Meetings are an important part of business communication. Some useful phrases include 'Let's get started', 'I'd like to discuss', and 'Does anyone have any questions?'";
        } else if (query.toLowerCase().includes('email')) {
          response = "Professional emails typically start with 'Dear' followed by the recipient's name or title. Would you like to practice writing a business email?";
        }
      } else if (topic === 'Travel & Culture') {
        if (query.toLowerCase().includes('travel') || query.toLowerCase().includes('trip')) {
          response = "Planning a trip? Some useful phrases when traveling are 'Where is...?', 'How much does this cost?', and 'Could you recommend...?'";
        } else if (query.toLowerCase().includes('food') || query.toLowerCase().includes('cuisine')) {
          response = "Discussing local cuisine is a great way to connect with people while traveling! You can ask 'What's a traditional dish here?' or say 'I'd like to try something authentic.'";
        }
      } else if (topic === 'Academic Discussions') {
        if (query.toLowerCase().includes('opinion') || query.toLowerCase().includes('think')) {
          response = "When expressing opinions in an academic context, you might say 'In my view,' 'Based on the evidence,' or 'Research suggests that...' followed by your perspective.";
        } else if (query.toLowerCase().includes('argument') || query.toLowerCase().includes('debate')) {
          response = "In academic debates, it's important to acknowledge opposing viewpoints. You can use phrases like 'While some argue that...', 'On the other hand...', or 'Nevertheless...'";
        }
      }
      
      // Add AI response to chat
      const aiMessage = {
        sender: 'ai',
        text: response,
        timestamp: new Date()
      };
      
      conversationStore.addMessage(currentConversation.value.id, aiMessage);
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
      messagesContainer
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

.user-input {
  display: flex;
  padding: 15px;
  background-color: white;
  border-top: 1px solid #ddd;
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
</style>