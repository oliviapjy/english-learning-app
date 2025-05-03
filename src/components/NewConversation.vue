<!-- src/components/NewConversation.vue -->
<template>
  <div class="new-conversation-layout">
    <TheSidebar 
      :user="user" 
      @logout="logout"
      @collapse-change="handleSidebarCollapse"
      :initial-collapsed="sidebarCollapsed"
    />
    
    <div class="content-area" :class="{ 'expanded': sidebarCollapsed }">
      <div class="header">
        <button @click="goBack" class="back-btn">← Back to Home</button>
        <h2>Choose a Conversation Topic</h2>
      </div>
      
      <div class="topics-grid">
        <div 
          v-for="(topic, index) in topics" 
          :key="index" 
          class="topic-card"
          @click="selectTopic(index)"
        >
          <h3>{{ topic.title }}</h3>
          <p class="description">{{ topic.description }}</p>
          <span class="level-badge">{{ topic.level }}</span>
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
  name: 'NewConversation',
  components: {
    TheSidebar
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User' });
    const topics = ref([]);
    const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
    
    onMounted(() => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      topics.value = conversationStore.getAvailableTopics();
    });
    
    const goBack = () => {
      router.push('/home');
    };
    
    const selectTopic = async (topicIndex) => {
      try {
        const newConversation = await conversationStore.createConversation(topicIndex);
        conversationStore.setCurrentConversation(newConversation);
        router.push({
          name: 'Conversation',
          params: { id: newConversation.id }
        });
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    };
    
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    const handleSidebarCollapse = (isCollapsed) => {
      sidebarCollapsed.value = isCollapsed;
      localStorage.setItem('sidebarCollapsed', isCollapsed);
    };
    
    return {
      user,
      topics,
      goBack,
      selectTopic,
      logout,
      sidebarCollapsed,
      handleSidebarCollapse
    };
  }
}
</script>

<style scoped>
.new-conversation-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.content-area {
  flex-grow: 1;
  padding: 20px;
  background-color: #f5f5f5;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
}

.content-area.expanded {
  margin-left: 0;
}

.header {
  display: flex;
  flex-direction: column;
  margin-bottom: 30px;
}

.back-btn {
  align-self: flex-start;
  background-color: transparent;
  border: none;
  color: #3498db;
  padding: 0;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 15px;
}

.back-btn:hover {
  color: #2980b9;
}

.header h2 {
  margin: 0;
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.topic-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.topic-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.topic-card h3 {
  margin: 0 0 10px;
  color: #2c3e50;
}

.description {
  margin: 0 0 15px;
  color: #7f8c8d;
}

.level-badge {
  background-color: #e8f4fc;
  color: #3498db;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
</style>