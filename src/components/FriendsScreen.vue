<!-- src/components/FriendsScreen.vue -->
<template>
  <div class="app-container">
    <!-- Sidebar Component -->
    <TheSidebar :user="user" @logout="logout" />

    <div class="content-area">
      <div class="header">
        <h2>Learning Partners</h2>
        <button @click="showAddFriendModal = true" class="primary-btn">
          + Add Friend
        </button>
      </div>
      
      <!-- Search Box -->
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search friends..." 
          class="input-field full-width" 
        />
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="loading-indicator">
        Loading friends...
      </div>
      
      <!-- Empty State -->
      <EmptyFriendsState 
        v-else-if="friends.length === 0" 
        @add-friends="showAddFriendModal = true"
      />
      
      <!-- Friends List -->
      <div v-else class="friends-list">
        <FriendCard 
          v-for="friend in filteredFriends" 
          :key="friend.id" 
          :friend="friend"
          @view-profile="viewProfile"
          @start-challenge="startChallenge"
        />
      </div>
    </div>
    
    <!-- Add Friend Modal -->
    <AddFriendModal
      v-if="showAddFriendModal"
      :search-query="friendSearchQuery"
      :search-results="searchResults"
      :has-searched="hasSearched"
      @close="showAddFriendModal = false"
      @search="searchFriends"
      @add-friend="addFriend"
      @update:search-query="friendSearchQuery = $event"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import TheSidebar from './layout/TheSidebar.vue';
import FriendCard from './friends/FriendCard.vue';
import EmptyFriendsState from './friends/EmptyFriendsState.vue';
import AddFriendModal from './friends/AddFriendModal.vue';

export default {
  name: 'FriendsScreen',
  components: {
    TheSidebar,
    FriendCard,
    EmptyFriendsState,
    AddFriendModal
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    // State
    const user = ref({ name: 'User' });
    const loading = ref(true);
    const friends = ref([]);
    const searchQuery = ref('');
    const showAddFriendModal = ref(false);
    const friendSearchQuery = ref('');
    const searchResults = ref([]);
    const hasSearched = ref(false);
    
    // Computed properties
    const filteredFriends = computed(() => {
      if (!searchQuery.value) return friends.value;
      
      return friends.value.filter(friend => 
        friend.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    });
    
    // Lifecycle hooks
    onMounted(async () => {
      if (!authStore.isLoggedIn) {
        router.push('/login');
        return;
      }
      
      user.value = authStore.user;
      loadFriendsData();
    });
    
    // Methods
    const loadFriendsData = () => {
      // Simulate API call to fetch friends data
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
      // Mark user as added in search results
      const userToUpdate = searchResults.value.find(result => result.id === user.id);
      if (userToUpdate) {
        userToUpdate.isAdded = true;
      }
      
      // Simulate API call to add friend
      setTimeout(() => {
        showAddFriendModal.value = false;
        // Add new friend to list
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
      viewProfile,
      startChallenge,
      searchFriends,
      addFriend,
      logout
    };
  }
};
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

.primary-btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.primary-btn:hover {
  background-color: #2980b9;
}

.search-box {
  margin-bottom: 20px;
}

.input-field {
  padding: 10px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
}

.full-width {
  width: 100%;
}

.loading-indicator {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>