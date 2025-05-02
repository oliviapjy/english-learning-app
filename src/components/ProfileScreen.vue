<!-- src/components/ProfileScreen.vue -->
<template>
  <div class="app-container">
    <TheSidebar :user="user" @logout="logout" />

    <div class="content-area">
      <div class="header">
        <h2>Your Profile</h2>
      </div>

      <div class="profile-section">
        <div class="profile-card">
          <div class="profile-header">
            <div class="avatar">{{ getUserInitials() }}</div>
            <div class="profile-name">{{ user.name }}</div>
            <div class="profile-level-badge">{{ user.level }}</div>
          </div>
          
          <div class="profile-details">
            <form @submit.prevent="updateProfile" class="profile-form">
              <div class="form-group">
                <label for="name">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="userProfile.name" 
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="userProfile.email" 
                  class="form-input"
                  disabled
                />
              </div>
              
              <div class="form-group">
                <label for="level">Current Level</label>
                <select 
                  id="level" 
                  v-model="userProfile.level" 
                  class="form-input"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Learning Goals</label>
                <div class="goals-container">
                  <div 
                    v-for="(goal, index) in learningGoals" 
                    :key="index"
                    class="goal-item"
                  >
                    <input 
                      type="checkbox" 
                      :id="'goal-' + index" 
                      v-model="goal.selected"
                    />
                    <label :for="'goal-' + index">{{ goal.text }}</label>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="reminder">Practice Reminders</label>
                <select 
                  id="reminder" 
                  v-model="practiceReminder" 
                  class="form-input"
                >
                  <option value="never">Never</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              
              <div class="action-buttons">
                <button type="submit" class="save-btn">Save Changes</button>
                <button type="button" @click="resetForm" class="cancel-btn">Reset</button>
              </div>
            </form>
          </div>
          
          <div class="stats-section">
            <h3>Learning Stats</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ userStats.conversationsCount }}</div>
                <div class="stat-label">Conversations</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ userStats.practiceTime }}</div>
                <div class="stat-label">Practice Hours</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ userStats.streak }}</div>
                <div class="stat-label">Day Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ userStats.wordsLearned }}</div>
                <div class="stat-label">Words Learned</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useConversationStore } from '../stores/conversation';
import TheSidebar from './layout/TheSidebar.vue';

export default {
  name: 'ProfileScreen',
  components: {
  TheSidebar
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const conversationStore = useConversationStore();
    const user = ref({ name: 'User', email: '', level: 'Beginner' });
    
    // Create a copy of user data for the form
    const userProfile = reactive({
      name: '',
      email: '',
      level: 'Beginner'
    });
    
    // Mock learning goals
    const learningGoals = ref([
      { text: 'Improve speaking fluency', selected: true },
      { text: 'Expand vocabulary', selected: true },
      { text: 'Master grammar rules', selected: false },
      { text: 'Practice professional conversation', selected: false },
      { text: 'Prepare for language exam', selected: false }
    ]);
    
    // Mock user stats
    const userStats = reactive({
      conversationsCount: 0,
      practiceTime: 0,
      streak: 0,
      wordsLearned: 0
    });
    
    // Practice reminder setting
    const practiceReminder = ref('never');
    
    onMounted(async () => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      
      // Initialize form with user data
      userProfile.name = user.value.name;
      userProfile.email = user.value.email;
      userProfile.level = user.value.level;
      
      // Initialize learning goals from user data if available
      if (user.value.learningGoals) {
        learningGoals.value = user.value.learningGoals;
      }
      
      // Initialize practice reminder from user data if available
      if (user.value.practiceReminder) {
        practiceReminder.value = user.value.practiceReminder;
      }
      
      // Calculate mock stats based on conversations
      await conversationStore.fetchConversations();
      const convs = conversationStore.conversations;
      userStats.conversationsCount = convs.length;
      
      // Mock practice time based on number of messages
      let messageCount = 0;
      convs.forEach(conv => {
        messageCount += conv.messages.length;
      });
      userStats.practiceTime = Math.floor(messageCount / 5); // Rough estimate of hours
      
      // Mock streak (random 1-7)
      userStats.streak = Math.floor(Math.random() * 7) + 1;
      
      // Mock words learned (random significant number)
      userStats.wordsLearned = Math.floor(Math.random() * 100) + 50;
    });
    
    const getUserInitials = () => {
      if (!user.value.name) return '?';
      return user.value.name.split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase();
    };
    
    const updateProfile = async () => {
      try {
        // Collect all profile data
        const profileData = {
          name: userProfile.name,
          level: userProfile.level,
          learningGoals: learningGoals.value,
          practiceReminder: practiceReminder.value
        };
        
        // Update profile using the auth store
        await authStore.updateProfile(profileData);
        
        // Show success message
        alert('Profile updated successfully!');
      } catch (error) {
        alert('Failed to update profile. Please try again.');
        console.error('Profile update error:', error);
      }
    };
    
    const resetForm = () => {
      userProfile.name = user.value.name;
      userProfile.email = user.value.email;
      userProfile.level = user.value.level;
      
      // Reset learning goals from user data
      if (user.value.learningGoals) {
        learningGoals.value = JSON.parse(JSON.stringify(user.value.learningGoals));
      }
      
      // Reset practice reminder from user data
      if (user.value.practiceReminder) {
        practiceReminder.value = user.value.practiceReminder;
      }
    };
    
    const logout = () => {
      authStore.logout();
      router.push('/login');
    };
    
    return {
      user,
      userProfile,
      learningGoals,
      userStats,
      practiceReminder,
      getUserInitials,
      updateProfile,
      resetForm,
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
  margin-bottom: 20px;
}

.profile-section {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  overflow: hidden;
}

.profile-header {
  background-color: #3498db;
  color: white;
  padding: 30px;
  text-align: center;
  position: relative;
}

.avatar {
  width: 80px;
  height: 80px;
  background-color: white;
  color: #3498db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  margin: 0 auto 15px;
}

.profile-name {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 5px;
}

.profile-level-badge {
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.profile-details {
  padding: 20px;
}

.profile-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #3498db;
  outline: none;
}

.form-input:disabled {
  background-color: #f9f9f9;
  cursor: not-allowed;
}

.goals-container {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.goal-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.goal-item input[type="checkbox"] {
  margin-right: 10px;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.save-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn:hover {
  background-color: #2980b9;
}

.cancel-btn {
  background-color: #ecf0f1;
  color: #7f8c8d;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #dfe6e9;
}

.stats-section {
  padding: 20px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

.stats-section h3 {
  margin: 0 0 20px;
  color: #2c3e50;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
}

.stat-card {
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  padding: 15px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
}
</style>