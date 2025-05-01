<!-- src/components/FriendsScreen.vue -->
<template>
    <div class="friends-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <img src="../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
        </div>
        <h3>BlinkED</h3>
        <nav class="nav-menu">
          <router-link to="/home" class="nav-item">Home</router-link>
          <router-link to="/friends" class="nav-item active">Friends</router-link>
          <router-link to="/profile" class="nav-item">Profile</router-link>
          <router-link to="/opportunities" class="nav-item">Opportunities</router-link>
        </nav>
        <div class="user-profile">
          <span class="username">{{ user.name }}</span>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>
      </div>
      
      <div class="content-area">
        <div class="header">
          <h2>Learning Partners</h2>
          <button @click="showAddFriendModal = true" class="add-friend-btn">
            + Add Friend
          </button>
        </div>
        
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search friends..." 
            class="search-input" 
          />
        </div>
        
        <div v-if="loading" class="loading-indicator">
          Loading friends...
        </div>
        
        <div v-else-if="friends.length === 0" class="empty-state">
          <div class="empty-message">
            <img src="../assets/friends_empty.svg" alt="No friends yet" class="empty-icon" />
            <h3>No Learning Partners Yet</h3>
            <p>Add friends to track each other's progress and build learning streaks together!</p>
            <button @click="showAddFriendModal = true" class="start-btn">
              Find Learning Partners
            </button>
          </div>
        </div>
        
        <div v-else class="friends-list">
          <div 
            v-for="friend in filteredFriends" 
            :key="friend.id" 
            class="friend-card"
          >
            <div class="friend-avatar">
              <img :src="friend.avatar" :alt="friend.name" />
              <div v-if="friend.isOnline" class="online-indicator"></div>
            </div>
            
            <div class="friend-info">
              <h3>{{ friend.name }}</h3>
              <p class="friend-level">Level: {{ friend.level }}</p>
              <div class="streak-info">
                <span class="streak-icon">🔥</span>
                <span class="streak-count">{{ friend.streak }} day streak</span>
              </div>
            </div>
            
            <div class="friend-activity">
              <p class="last-active">Last practiced: {{ formatDate(friend.lastActive) }}</p>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${friend.weeklyProgress}%` }"
                ></div>
              </div>
              <p class="progress-text">{{ friend.weeklyProgress }}% of weekly goal</p>
            </div>
            
            <div class="friend-actions">
              <button @click="viewProfile(friend)" class="action-btn view-btn">
                View Profile
              </button>
              <button @click="startChallenge(friend)" class="action-btn challenge-btn">
                Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Friend Modal -->
      <div v-if="showAddFriendModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Learning Partner</h3>
            <button @click="showAddFriendModal = false" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="search-container">
              <input 
                v-model="friendSearchQuery" 
                type="text" 
                placeholder="Search by username or email" 
                class="friend-search-input" 
              />
              <button @click="searchFriends" class="search-btn">Search</button>
            </div>
            
            <div v-if="searchResults.length > 0" class="search-results">
              <div 
                v-for="result in searchResults" 
                :key="result.id" 
                class="search-result-item"
              >
                <div class="result-avatar">
                  <img :src="result.avatar" :alt="result.name" />
                </div>
                <div class="result-info">
                  <h4>{{ result.name }}</h4>
                  <p>{{ result.email }}</p>
                </div>
                <button 
                  @click="addFriend(result)" 
                  class="add-btn"
                  :disabled="result.isAdded"
                >
                  {{ result.isAdded ? 'Added' : '+ Add' }}
                </button>
              </div>
            </div>
            
            <div v-else-if="hasSearched" class="no-results">
              <p>No results found. Try a different search term.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/auth';
  
  export default {
    name: 'FriendsScreen',
    setup() {
      const router = useRouter();
      const authStore = useAuthStore();
      const user = ref({ name: 'User' });
      const loading = ref(true);
      const friends = ref([]);
      const searchQuery = ref('');
      const showAddFriendModal = ref(false);
      const friendSearchQuery = ref('');
      const searchResults = ref([]);
      const hasSearched = ref(false);
      
      // Filter friends based on search query
      const filteredFriends = computed(() => {
        if (!searchQuery.value) return friends.value;
        
        return friends.value.filter(friend => 
          friend.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
      });
      
      onMounted(async () => {
        if (!authStore.isLoggedIn) {
          router.push('/login');
          return;
        }
        
        user.value = authStore.user;
        
        // Mock data for demo purposes
        setTimeout(() => {
          friends.value = [
            {
              id: 1,
              name: 'Sarah Johnson',
              avatar: 'https://via.placeholder.com/50',
              isOnline: true,
              level: 'Intermediate',
              streak: 12,
              lastActive: new Date().getTime() - 3600000, // 1 hour ago
              weeklyProgress: 85
            },
            {
              id: 2,
              name: 'Mike Chen',
              avatar: 'https://via.placeholder.com/50',
              isOnline: false,
              level: 'Advanced',
              streak: 30,
              lastActive: new Date().getTime() - 86400000, // 1 day ago
              weeklyProgress: 60
            },
            {
              id: 3,
              name: 'Elena Rodriguez',
              avatar: 'https://via.placeholder.com/50',
              isOnline: true,
              level: 'Beginner',
              streak: 5,
              lastActive: new Date().getTime() - 1800000, // 30 min ago
              weeklyProgress: 40
            }
          ];
          loading.value = false;
        }, 1000);
      });
      
      const formatDate = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now - date;
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);
        
        if (diffSec < 60) {
          return 'Just now';
        } else if (diffMin < 60) {
          return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else if (diffHour < 24) {
          return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else {
          return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        }
      };
      
      const viewProfile = (friend) => {
        router.push(`/profile/${friend.id}`);
      };
      
      const startChallenge = (friend) => {
        // Logic to start a challenge with a friend
        alert(`Starting a challenge with ${friend.name}`);
      };
      
      const searchFriends = () => {
        if (!friendSearchQuery.value) return;
        
        // Mock search results
        hasSearched.value = true;
        searchResults.value = [
          {
            id: 101,
            name: 'Alex Thompson',
            email: 'alex.t@example.com',
            avatar: 'https://via.placeholder.com/50',
            isAdded: false
          },
          {
            id: 102,
            name: 'Jamie Lee',
            email: 'jamie.lee@example.com',
            avatar: 'https://via.placeholder.com/50',
            isAdded: false
          }
        ];
      };
      
      const addFriend = (user) => {
        // Logic to add a friend
        user.isAdded = true;
        setTimeout(() => {
          showAddFriendModal.value = false;
          // Refresh friends list after adding
          friends.value.push({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            isOnline: false,
            level: 'Beginner',
            streak: 0,
            lastActive: new Date().getTime(),
            weeklyProgress: 0
          });
        }, 1000);
      };
      
      const logout = () => {
        authStore.logout();
        router.push('/login');
      };
      
      return {
        user,
        loading,
        friends,
        searchQuery,
        filteredFriends,
        showAddFriendModal,
        friendSearchQuery,
        searchResults,
        hasSearched,
        formatDate,
        viewProfile,
        startChallenge,
        searchFriends,
        addFriend,
        logout
      };
    }
  }
  </script>
  
  <style scoped>
  .friends-container {
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
  
  .nav-menu {
    display: flex;
    flex-direction: column;
    margin-top: 20px;
  }
  
  .nav-item {
    padding: 12px 20px;
    color: #ecf0f1;
    text-decoration: none;
    border-left: 3px solid transparent;
    transition: all 0.2s;
  }
  
  .nav-item:hover, .nav-item.active {
    background-color: #34495e;
    border-left-color: #3498db;
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
  
  .add-friend-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .add-friend-btn:hover {
    background-color: #2980b9;
  }
  
  .search-box {
    margin-bottom: 20px;
  }
  
  .search-input {
    width: 100%;
    padding: 10px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
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
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    max-width: 500px;
  }
  
  .empty-icon {
    width: 120px;
    height: 120px;
    margin-bottom: 20px;
  }
  
  .empty-message h3 {
    margin: 0 0 10px;
    color: #2c3e50;
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
  
  .friends-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .friend-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    padding: 15px;
    display: flex;
    align-items: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .friend-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
  
  .friend-avatar {
    position: relative;
    margin-right: 15px;
  }
  
  .friend-avatar img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .online-indicator {
    position: absolute;
    bottom: 5px;
    right: 0;
    width: 12px;
    height: 12px;
    background-color: #2ecc71;
    border-radius: 50%;
    border: 2px solid white;
  }
  
  .friend-info {
    flex: 1;
  }
  
  .friend-info h3 {
    margin: 0 0 5px;
    color: #2c3e50;
  }
  
  .friend-level {
    margin: 0;
    color: #7f8c8d;
    font-size: 14px;
  }
  
  .streak-info {
    display: flex;
    align-items: center;
    margin-top: 5px;
  }
  
  .streak-icon {
    margin-right: 5px;
  }
  
  .streak-count {
    color: #e74c3c;
    font-weight: 500;
    font-size: 14px;
  }
  
  .friend-activity {
    width: 250px;
    padding: 0 15px;
  }
  
  .last-active {
    margin: 0 0 5px;
    font-size: 13px;
    color: #95a5a6;
  }
  
  .progress-bar {
    height: 8px;
    background-color: #ecf0f1;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
  }
  
  .progress-fill {
    height: 100%;
    background-color: #3498db;
    border-radius: 4px;
  }
  
  .progress-text {
    margin: 0;
    font-size: 13px;
    color: #7f8c8d;
  }
  
  .friend-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    text-align: center;
    transition: background-color 0.2s;
    white-space: nowrap;
  }
  
  .view-btn {
    background-color: #f0f0f0;
    color: #2c3e50;
  }
  
  .view-btn:hover {
    background-color: #e0e0e0;
  }
  
  .challenge-btn {
    background-color: #3498db;
    color: white;
  }
  
  .challenge-btn:hover {
    background-color: #2980b9;
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: white;
    border-radius: 8px;
    width: 500px;
    max-width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 5px 30px rgba(0, 0, 0, 0.15);
  }
  
  .modal-header {
    padding: 15px 20px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h3 {
    margin: 0;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #95a5a6;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .search-container {
    display: flex;
    margin-bottom: 20px;
  }
  
  .friend-search-input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 4px 0 0 4px;
    font-size: 14px;
  }
  
  .search-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    padding: 10px 20px;
    cursor: pointer;
  }
  
  .search-results {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .search-result-item {
    display: flex;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .result-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 15px;
  }
  
  .result-info {
    flex: 1;
  }
  
  .result-info h4 {
    margin: 0 0 5px;
    color: #2c3e50;
  }
  
  .result-info p {
    margin: 0;
    font-size: 14px;
    color: #7f8c8d;
  }
  
  .add-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
  }
  
  .add-btn:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
  
  .no-results {
    text-align: center;
    padding: 20px 0;
    color: #7f8c8d;
  }
  </style>