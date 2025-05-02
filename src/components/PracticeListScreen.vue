<!-- src/components/PracticeListScreen.vue -->
<template>
    <div class="app-container">
      <!-- Sidebar Component -->
      <TheSidebar :user="user" @logout="logout" />
      
      <div class="content-area">
        <div class="header">
          <h2>Practice Sessions</h2>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          Loading conversations...
        </div>
        
        <div v-else-if="conversations.length === 0" class="empty-state">
          <div class="empty-message">
            <p>You don't have any conversations to practice with yet.</p>
            <button @click="navigateToHome" class="start-btn">
              Create your first conversation
            </button>
          </div>
        </div>
        
        <div v-else class="practice-section">
          <p class="section-description">
            Select a conversation to practice your language skills in a simulated conversation environment.
          </p>
          
          <div class="conversations-list">
            <div 
              v-for="conversation in conversations" 
              :key="conversation.id" 
              class="conversation-card"
              @click="startPractice(conversation)"
            >
              <div class="conversation-info">
                <h3>{{ conversation.topic.title }}</h3>
                <p class="description">{{ conversation.topic.description }}</p>
                <div class="conversation-meta">
                  <span class="level-badge">{{ conversation.topic.level }}</span>
                  <span class="message-count">{{ conversation.messages.length }} messages</span>
                </div>
              </div>
              <div class="action-indicator">
                <span class="action-text">Start Practice</span>
                <span class="arrow">→</span>
              </div>
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
    name: 'PracticeListScreen',
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
      
      const startPractice = (conversation) => {
        conversationStore.setCurrentConversation(conversation);
        router.push({
          name: 'Practice',
          params: { id: conversation.id }
        });
      };
      
      const navigateToHome = () => {
        router.push('/home');
      };
      
      const logout = () => {
        authStore.logout();
        router.push('/login');
      };
      
      return {
        user,
        loading,
        conversations,
        startPractice,
        navigateToHome,
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
  
  .section-description {
    margin-bottom: 20px;
    color: #7f8c8d;
    font-size: 16px;
    max-width: 800px;
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
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }
  
  .conversation-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
  
  .conversation-info {
    padding: 15px;
    flex-grow: 1;
  }
  
  .conversation-info h3 {
    margin: 0 0 5px;
    color: #2c3e50;
  }
  
  .description {
    margin: 0 0 10px;
    color: #7f8c8d;
    font-size: 14px;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  
  .conversation-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }
  
  .level-badge {
    background-color: #e8f4fc;
    color: #3498db;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .message-count {
    color: #95a5a6;
    font-size: 12px;
  }
  
  .action-indicator {
    padding: 15px;
    background-color: #3498db;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .action-text {
    font-weight: 500;
  }
  
  .arrow {
    font-size: 18px;
  }
  </style>