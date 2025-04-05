<!-- src/components/Conversation.vue -->
<template>
  <div class="conversation-container">
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="../assets/app_logo.png" alt="App Logo" class="app-logo" />
      </div>
      <h3>Conversation Topics</h3>
      <ul class="topic-list">
        <li 
          v-for="(topic, index) in topics" 
          :key="index" 
          @click="selectTopic(topic)"
          :class="{ active: selectedTopic === topic }"
        >
          {{ topic.title }}
        </li>
      </ul>
      <div class="user-profile">
        <span class="username">{{ user.name }}</span>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
    </div>
    
    <div class="chat-area">
      <div class="topic-header" v-if="selectedTopic">
        <h2>{{ selectedTopic.title }}</h2>
        <p>{{ selectedTopic.description }}</p>
      </div>
      
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
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export default {
  name: 'ConversationComponent',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const user = ref({ name: 'User' });
    const messagesContainer = ref(null);
    
    // Check if user is logged in
    onMounted(() => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
      } else {
        user.value = authStore.user;
      }
    });
    
    const topics = ref([
      {
        title: 'Everyday Conversations',
        description: 'Practice common phrases and expressions used in daily interactions.',
        level: 'Beginner'
      },
      {
        title: 'Business English',
        description: 'Learn professional vocabulary and expressions for the workplace.',
        level: 'Intermediate'
      },
      {
        title: 'Travel & Culture',
        description: 'Prepare for conversations while traveling and discussing cultural topics.',
        level: 'Intermediate'
      },
      {
        title: 'Academic Discussions',
        description: 'Practice expressing complex ideas and arguments in English.',
        level: 'Advanced'
      }
    ]);
    
    const selectedTopic = ref(null);
    const messages = ref([]);
    const userMessage = ref('');
    
    const selectTopic = (topic) => {
      selectedTopic.value = topic;
      messages.value = [
        {
          sender: 'ai',
          text: `Welcome to the "${topic.title}" conversation! I'm your English practice partner. Let's start practicing ${topic.level}-level English. How can I help you today?`,
          timestamp: new Date()
        }
      ];
    };
    
    const sendMessage = async () => {
      if (!userMessage.value.trim()) return;
      
      // Add user message to chat
      messages.value.push({
        sender: 'user',
        text: userMessage.value,
        timestamp: new Date()
      });
      
      const userQuery = userMessage.value;
      userMessage.value = '';
      
      // Scroll to bottom
      await nextTick();
      scrollToBottom();
      
      // Simulate AI response (in a real app, you'd call your API here)
      setTimeout(() => {
        generateAIResponse(userQuery);
      }, 1000);
    };
    
    const generateAIResponse = (query) => {
      // In a real app, this would be an API call to your backend
      // which would then call an AI service like OpenAI
      let response = "I'm sorry, I didn't understand that. Could you please rephrase?";
      
      if (selectedTopic.value.title === 'Everyday Conversations') {
        if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
          response = "Hi there! It's nice to meet you. How are you doing today?";
        } else if (query.toLowerCase().includes('how are you')) {
          response = "I'm doing well, thank you for asking! How about yourself?";
        } else if (query.toLowerCase().includes('weather')) {
          response = "Talking about the weather is a common topic in English conversations! What's the weather like where you are?";
        }
      } else if (selectedTopic.value.title === 'Business English') {
        if (query.toLowerCase().includes('meeting')) {
          response = "Meetings are an important part of business communication. Some useful phrases include 'Let's get started', 'I'd like to discuss', and 'Does anyone have any questions?'";
        } else if (query.toLowerCase().includes('email')) {
          response = "Professional emails typically start with 'Dear' followed by the recipient's name or title. Would you like to practice writing a business email?";
        }
      }
      
      // Add AI response to chat
      messages.value.push({
        sender: 'ai',
        text: response,
        timestamp: new Date()
      });
      
      // Scroll to bottom again
      nextTick(() => {
        scrollToBottom();
      });
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
    
    // Auto-select first topic
    onMounted(() => {
      if (topics.value.length > 0) {
        selectTopic(topics.value[0]);
      }
    });
    
    return {
      user,
      topics,
      selectedTopic,
      messages,
      userMessage,
      selectTopic,
      sendMessage,
      formatTime,
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
  margin: 15px 20px;
}

.topic-list {
  list-style: none;
  padding: 0 20px;
  margin: 0;
  flex-grow: 1;
}

.topic-list li {
  padding: 10px 15px;
  margin-bottom: 5px;
  border-radius: 4px;
  cursor: pointer;
}

.topic-list li:hover {
  background-color: #34495e;
}

.topic-list li.active {
  background-color: #3498db;
}

.user-profile {
  margin-top: auto;
  padding: 15px 20px 0;
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

.topic-header {
  padding: 15px;
  border-bottom: 1px solid #ddd;
  background-color: white;
}

.topic-header h2 {
  margin: 0 0 5px;
}

.topic-header p {
  margin: 0;
  color: #7f8c8d;
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