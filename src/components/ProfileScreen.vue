<!-- src/components/ProfileScreen.vue -->
<template>
    <div class="profile-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <img src="../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
        </div>
        <h3>BlinkED</h3>
        <nav class="nav-links">
          <router-link to="/home" class="nav-link">Home</router-link>
          <router-link to="/profile" class="nav-link active">Profile</router-link>
        </nav>
        <div class="user-profile">
          <span class="username">{{ user.name }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </div>
      
      <div class="content-area">
        <div class="header">
          <h2>Your Profile</h2>
          <button @click="saveProfile" class="save-btn" :disabled="!hasChanges">
            Save Changes
          </button>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          Loading profile information...
        </div>
        
        <div v-else class="profile-form">
          <div class="profile-section">
            <div class="profile-avatar">
              <div class="avatar-wrapper">
                <img 
                  :src="profileData.avatarUrl || '../assets/default_avatar.png'" 
                  alt="Profile Avatar" 
                  class="avatar-img"
                />
                <button class="change-avatar-btn">Change Photo</button>
              </div>
              <div class="profile-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ conversationsCount }}</span>
                  <span class="stat-label">Conversations</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ practiceSessionsCount }}</span>
                  <span class="stat-label">Practice Sessions</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="profile-section">
            <h3 class="section-title">Personal Information</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="username">Display Name</label>
                <input 
                  id="username"
                  v-model="profileData.name"
                  type="text"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                  id="email"
                  v-model="profileData.email"
                  type="email"
                  class="form-control"
                  disabled
                />
              </div>
            </div>
          </div>
          
          <div class="profile-section">
            <h3 class="section-title">Language Learning Preferences</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="nativeLanguage">Native Language</label>
                <select 
                  id="nativeLanguage"
                  v-model="profileData.nativeLanguage"
                  class="form-control"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                </select>
              </div>
              <div class="form-group">
                <label for="learningLanguage">Learning Language</label>
                <select 
                  id="learningLanguage"
                  v-model="profileData.learningLanguage"
                  class="form-control"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="proficiencyLevel">Current Proficiency Level</label>
                <select 
                  id="proficiencyLevel"
                  v-model="profileData.proficiencyLevel"
                  class="form-control"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="fluent">Fluent</option>
                </select>
              </div>
              <div class="form-group">
                <label for="learningGoal">Learning Goal</label>
                <select 
                  id="learningGoal"
                  v-model="profileData.learningGoal"
                  class="form-control"
                >
                  <option value="travel">Travel</option>
                  <option value="business">Business</option>
                  <option value="academic">Academic</option>
                  <option value="casual">Casual Conversation</option>
                  <option value="comprehensive">Comprehensive Mastery</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="profile-section">
            <h3 class="section-title">Notification Settings</h3>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <input 
                  id="emailNotifications"
                  v-model="profileData.emailNotifications"
                  type="checkbox"
                  class="checkbox-input"
                />
                <label for="emailNotifications">Email notifications</label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <input 
                  id="practiceReminders"
                  v-model="profileData.practiceReminders"
                  type="checkbox"
                  class="checkbox-input"
                />
                <label for="practiceReminders">Daily practice reminders</label>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button @click="resetPassword" class="secondary-btn">
              Reset Password
            </button>
            <button @click="deleteAccount" class="danger-btn">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/auth';
  import { useConversationStore } from '../stores/conversation';
  
  export default {
    name: 'ProfileScreen',
    setup() {
      const router = useRouter();
      const authStore = useAuthStore();
      const conversationStore = useConversationStore();
      const user = ref({ name: 'User' });
      const loading = ref(true);
      const originalProfileData = ref({});
      const profileData = ref({
        name: '',
        email: '',
        avatarUrl: '',
        nativeLanguage: 'en',
        learningLanguage: 'es',
        proficiencyLevel: 'beginner',
        learningGoal: 'travel',
        emailNotifications: true,
        practiceReminders: true
      });
      const conversationsCount = ref(0);
      const practiceSessionsCount = ref(0);
      
      const hasChanges = computed(() => {
        return JSON.stringify(originalProfileData.value) !== JSON.stringify(profileData.value);
      });
      
      onMounted(async () => {
        if (!authStore.isLoggedIn) {
          router.push('/login');
          return;
        }
        
        user.value = authStore.user;
        await fetchProfileData();
        await fetchStats();
        loading.value = false;
      });
      
      const fetchProfileData = async () => {
        try {
          // This would be replaced with an actual API call
          // For now, we'll use the auth store user as a starting point
          profileData.value = {
            name: authStore.user.name,
            email: authStore.user.email || 'user@example.com',
            avatarUrl: authStore.user.avatarUrl || '',
            nativeLanguage: 'en',
            learningLanguage: 'es',
            proficiencyLevel: 'beginner',
            learningGoal: 'travel',
            emailNotifications: true,
            practiceReminders: true
          };
          
          // Store a copy of the original data to detect changes
          originalProfileData.value = JSON.parse(JSON.stringify(profileData.value));
        } catch (error) {
          console.error('Failed to load profile data:', error);
        }
      };
      
      const fetchStats = async () => {
        try {
          // This would be replaced with actual API calls
          // For now, we'll use the conversation store data
          await conversationStore.fetchConversations();
          conversationsCount.value = conversationStore.conversations.length;
          
          // Mock value for practice sessions
          practiceSessionsCount.value = Math.floor(Math.random() * 50);
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      };
      
      const saveProfile = async () => {
        try {
          // This would be replaced with an actual API call
          console.log('Saving profile data:', profileData.value);
          
          // Update the user in auth store (simplified)
          authStore.updateUser({
            name: profileData.value.name,
            email: profileData.value.email,
            avatarUrl: profileData.value.avatarUrl
          });
          
          // Update original data reference
          originalProfileData.value = JSON.parse(JSON.stringify(profileData.value));
          
          alert('Profile updated successfully!');
        } catch (error) {
          console.error('Failed to save profile:', error);
          alert('Failed to update profile. Please try again.');
        }
      };
      
      const resetPassword = () => {
        // This would be replaced with actual password reset logic
        alert('Password reset email has been sent to your email address.');
      };
      
      const deleteAccount = () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
          // This would be replaced with actual account deletion logic
          alert('Account deletion initiated. You will receive a confirmation email.');
        }
      };
      
      const logout = () => {
        authStore.logout();
        router.push('/login');
      };
      
      return {
        user,
        loading,
        profileData,
        hasChanges,
        conversationsCount,
        practiceSessionsCount,
        saveProfile,
        resetPassword,
        deleteAccount,
        logout
      };
    }
  }
  </script>
  
  <style scoped>
  .profile-container {
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
  
  .sidebar h3 {
    margin: 15px 20px;
  }
  
  .nav-links {
    padding: 10px 0;
  }
  
  .nav-link {
    display: block;
    padding: 10px 20px;
    color: #ecf0f1;
    text-decoration: none;
    transition: background-color 0.2s;
  }
  
  .nav-link:hover, .nav-link.active {
    background-color: #34495e;
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
  
  .save-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .save-btn:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .save-btn:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
  
  .loading-indicator {
    text-align: center;
    padding: 40px;
    color: #7f8c8d;
  }
  
  .profile-form {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    overflow: hidden;
  }
  
  .profile-section {
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .section-title {
    margin: 0 0 15px;
    color: #2c3e50;
    font-size: 18px;
  }
  
  .profile-avatar {
    display: flex;
    align-items: flex-start;
  }
  
  .avatar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 30px;
  }
  
  .avatar-img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #f0f0f0;
  }
  
  .change-avatar-btn {
    margin-top: 10px;
    background-color: #f0f0f0;
    border: none;
    color: #2c3e50;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .change-avatar-btn:hover {
    background-color: #e0e0e0;
  }
  
  .profile-stats {
    display: flex;
    flex-grow: 1;
    justify-content: space-around;
    align-items: center;
  }
  
  .stat-item {
    text-align: center;
  }
  
  .stat-value {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #3498db;
  }
  
  .stat-label {
    font-size: 14px;
    color: #7f8c8d;
  }
  
  .form-row {
    display: flex;
    margin: 0 -10px 15px;
  }
  
  .form-group {
    flex: 1;
    padding: 0 10px;
  }
  
  .form-control {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }
  
  select.form-control {
    height: 42px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    color: #34495e;
    font-weight: 500;
  }
  
  .checkbox-group {
    display: flex;
    align-items: center;
  }
  
  .checkbox-input {
    margin-right: 10px;
  }
  
  .checkbox-group label {
    margin-bottom: 0;
  }
  
  .form-actions {
    display: flex;
    justify-content: space-between;
    padding: 20px;
  }
  
  .secondary-btn, .danger-btn {
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
  }
  
  .secondary-btn {
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    color: #2c3e50;
  }
  
  .secondary-btn:hover {
    background-color: #e0e0e0;
  }
  
  .danger-btn {
    background-color: white;
    border: 1px solid #e74c3c;
    color: #e74c3c;
  }
  
  .danger-btn:hover {
    background-color: #fdedeb;
  }
  </style>