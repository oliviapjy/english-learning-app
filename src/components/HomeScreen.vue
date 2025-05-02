<!-- src/components/HomeScreen.vue -->
<template>
  <div class="app-container">
    <!-- Sidebar Component -->
    <TheSidebar :user="user" @logout="logout" />
    
    <div class="content-area">
      <div class="header">
        <h2>Your Conversations</h2>
        <button @click="startNewConversation" class="new-conversation-btn">
          + New Conversation
        </button>
      </div>
      
      <div v-if="loading" class="loading-indicator">
        Loading conversations...
      </div>
      
      <div v-else-if="conversations.length === 0" class="empty-state">
        <div class="empty-message">
          <p>You don't have any conversations yet.</p>
          <button @click="startNewConversation" class="start-btn">
            Start your first conversation
          </button>
        </div>
      </div>
      
      <div v-else class="conversations-list">
        <div 
          v-for="conversation in conversations" 
          :key="conversation.id" 
          class="conversation-card"
        >
          <div class="conversation-info">
            <h3>{{ conversation.topic.title }}</h3>
            <p class="description">{{ conversation.topic.description }}</p>
            <div class="conversation-meta">
              <span class="level-badge">{{ conversation.topic.level }}</span>
              <span class="date">{{ formatDate(conversation.lastUpdated) }}</span>
            </div>
          </div>
          <div class="conversation-preview">
            <p v-if="conversation.messages.length > 0">
              {{ conversation.messages[conversation.messages.length - 1].text.substring(0, 60) }}...
            </p>
            <p v-else class="no-messages">No messages yet</p>
          </div>
          <div class="conversation-actions">
            <button @click="openConversation(conversation)" class="action-btn view-btn">
              View Conversation
            </button>
            <button @click="startPractice(conversation)" class="action-btn practice-btn">
              Practice Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';
import TheSidebar from './layout/TheSidebar.vue';

export default {
  name: 'HomeScreen',
  components: {
    TheSidebar
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User' });
    const loading = ref(true);
    const conversations = ref([]);
    
    onMounted(async () => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      try {
        await conversationStore.fetchConversations();
        conversations.value = conversationStore.conversations;
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        loading.value = false;
      }
    });
    
    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    const openConversation = (conversation) => {
      conversationStore.setCurrentConversation(conversation);
      router.push({
        name: 'Conversation',
        params: { id: conversation.id }
      });
    };
    
    const startPractice = (conversation) => {
      conversationStore.setCurrentConversation(conversation);
      router.push({
        name: 'Practice',
        params: { id: conversation.id }
      });
    };
    
    const startNewConversation = () => {
      router.push({ name: 'NewConversation' });
    };
    
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    return {
      user,
      loading,
      conversations,
      formatDate,
      openConversation,
      startPractice,
      startNewConversation,
      logout
    };
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.content-area {
  flex-grow: 1;
  padding: 20px;
  background-color: #f5f5f5;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.new-conversation-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.new-conversation-btn:hover {
  background-color: #2980b9;
}

.loading-indicator {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

.empty-message {
  text-align: center;
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.start-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  margin-top: 15px;
  cursor: pointer;
  font-weight: 500;
}

.conversations-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.conversation-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.conversation-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.conversation-info {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.conversation-info h3 {
  margin: 0 0 5px;
  color: #2c3e50;
}

.description {
  margin: 0 0 10px;
  color: #7f8c8d;
  font-size: 14px;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.level-badge {
  background-color: #e8f4fc;
  color: #3498db;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.date {
  color: #95a5a6;
  font-size: 12px;
}

.conversation-preview {
  padding: 15px;
  background-color: #f9f9f9;
  color: #7f8c8d;
  font-size: 14px;
  height: 80px;
  display: flex;
  align-items: center;
}

.conversation-preview p {
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.no-messages {
  font-style: italic;
  color: #95a5a6;
}

.conversation-actions {
  display: flex;
  padding: 10px;
  background-color: #f9f9f9;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  margin: 0 5px;
  transition: background-color 0.2s;
}

.view-btn {
  background-color: #f0f0f0;
  color: #2c3e50;
}

.view-btn:hover {
  background-color: #e0e0e0;
}

.practice-btn {
  background-color: #3498db;
  color: white;
}

.practice-btn:hover {
  background-color: #2980b9;
}
</style>