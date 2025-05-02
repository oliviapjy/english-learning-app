<!-- src/components/PracticeListScreen.vue -->
<template>
    <div class="app-container">
      <!-- Sidebar Component -->
      <TheSidebar :user="user" @logout="logout" />
      
      <div class="content-area">
        <div class="header">
          <h2>Practice Your Language Skills</h2>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          Loading environments...
        </div>
        
        <div v-else class="practice-section">
          <p class="section-description">
            Select an environment to practice your language skills in a simulated conversation.
          </p>
          
          <div class="environment-selector">
            <div class="selector-label">Choose Environment:</div>
            <select v-model="selectedEnvironmentIndex" class="environment-dropdown">
              <option value="" disabled>Select an environment</option>
              <option 
                v-for="(topic, index) in availableTopics" 
                :key="index" 
                :value="index"
              >
                {{ topic.title }} ({{ topic.level }})
              </option>
            </select>
          </div>
          
          <div class="environment-description" v-if="selectedTopic">
            <h3>{{ selectedTopic.title }}</h3>
            <p>{{ selectedTopic.description }}</p>
            <span class="level-badge">{{ selectedTopic.level }}</span>
          </div>
          
          <button 
            @click="startPractice" 
            class="practice-btn"
            :disabled="selectedEnvironmentIndex === null"
          >
            Practice Now
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
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
      const availableTopics = ref([]);
      const selectedEnvironmentIndex = ref(0);
      
      // Computed property to get the selected topic details
      const selectedTopic = computed(() => {
        if (selectedEnvironmentIndex.value === null) return null;
        return availableTopics.value[selectedEnvironmentIndex.value];
      });
      
      onMounted(async () => {
        if (!authStore.isLoggedIn) {
          router.push('/login');
          return;
        }
        
        user.value = authStore.user;
        try {
          // Get all conversations first (to initialize the store if needed)
          await conversationStore.fetchConversations();
          
          // Get available topics from the store
          availableTopics.value = conversationStore.getAvailableTopics();
          
          // Select the first topic by default
          if (availableTopics.value.length > 0) {
            selectedEnvironmentIndex.value = 0;
          }
        } catch (error) {
          console.error('Failed to initialize practice screen:', error);
        } finally {
          loading.value = false;
        }
      });
      
      const startPractice = async () => {
        if (selectedEnvironmentIndex.value === null) return;
        
        try {
          // Create a new conversation with the selected topic
          const conversation = await conversationStore.createConversation(selectedEnvironmentIndex.value);
          
          // Navigate to practice screen with the conversation ID
          router.push({
            name: 'Practice',
            params: { id: conversation.id }
          });
        } catch (error) {
          console.error('Failed to create practice conversation:', error);
        }
      };
      
      const logout = () => {
        authStore.logout();
        router.push('/login');
      };
      
      return {
        user,
        loading,
        availableTopics,
        selectedEnvironmentIndex,
        selectedTopic,
        startPractice,
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
    display: flex;
    flex-direction: column;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .section-description {
    margin-bottom: 30px;
    color: #7f8c8d;
    font-size: 16px;
    max-width: 800px;
  }
  
  .loading-indicator {
    text-align: center;
    padding: 40px;
    color: #7f8c8d;
  }
  
  .practice-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
    background-color: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }
  
  .environment-selector {
    width: 100%;
    margin-bottom: 25px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .selector-label {
    font-weight: 500;
    color: #2c3e50;
  }
  
  .environment-dropdown {
    width: 100%;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
    background-color: white;
    font-size: 16px;
    color: #2c3e50;
  }
  
  .environment-dropdown:focus {
    outline: none;
    border-color: #3498db;
  }
  
  .environment-description {
    width: 100%;
    margin-bottom: 25px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #3498db;
  }
  
  .environment-description h3 {
    margin: 0 0 10px 0;
    color: #2c3e50;
  }
  
  .environment-description p {
    margin: 0 0 10px 0;
    color: #7f8c8d;
    line-height: 1.5;
  }
  
  .level-badge {
    background-color: #e8f4fc;
    color: #3498db;
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    display: inline-block;
  }
  
  .practice-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 14px 30px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 10px;
    width: 100%;
    max-width: 300px;
  }
  
  .practice-btn:hover {
    background-color: #2980b9;
  }
  
  .practice-btn:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
  </style>