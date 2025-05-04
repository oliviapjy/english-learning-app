<!-- src/components/layout/TheSidebar.vue -->
<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <img src="../../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
    </div>
    <h3 v-show="!isCollapsed">BlinkED</h3>
    <nav class="sidebar-nav">
      <router-link to="/home" class="nav-item" :class="{ active: currentRoute === '/home' }">
        <span class="nav-icon">📚</span>
        <span v-show="!isCollapsed">Conversations</span>
      </router-link>
      <router-link to="/practice-list" class="nav-item" :class="{ active: currentRoute === '/practice-list' }">
        <span class="nav-icon">🎯</span>
        <span v-show="!isCollapsed">Practice</span>
      </router-link>
      <router-link to="/info-board" class="nav-item" :class="{ active: currentRoute === '/info-board' }">
        <span class="nav-icon">📋</span>
        <span v-show="!isCollapsed">Opportunities</span>
      </router-link>
      <router-link to="/friends" class="nav-item" :class="{ active: currentRoute === '/friends' }">
        <span class="nav-icon">👥</span>
        <span v-show="!isCollapsed">Friends</span>
      </router-link>
      <router-link to="/profile" class="nav-item" :class="{ active: currentRoute === '/profile' }">
        <span class="nav-icon">👤</span>
        <span v-show="!isCollapsed">Profile</span>
      </router-link>
    </nav>
    <div class="toggle-container">
      <button @click="toggleSidebar" class="toggle-btn">
        <span v-if="isCollapsed">👉</span>
        <span v-else>👈</span>
      </button>
    </div>
    <div class="user-profile" v-show="!isCollapsed">
      <span class="username">{{ user.name }}</span>
      <button @click="$emit('logout')" class="logout-btn">Logout</button>
    </div>
    <div class="user-profile-mini" v-show="isCollapsed">
      <button @click="$emit('logout')" class="logout-btn-mini" title="Logout">
        <span>🚪</span>
      </button>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'TheSidebar',
  props: {
    user: {
      type: Object,
      required: true
    },
    initialCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['logout', 'collapse-change'],
  setup(props, { emit }) {
    const route = useRoute();
    const currentRoute = computed(() => route.path);
    const isCollapsed = ref(props.initialCollapsed);
    
    onMounted(() => {
      // Initialize the sidebar state from localStorage if available
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        isCollapsed.value = savedState === 'true';
      }
    });
    
    // Watch for prop changes and update local state
    watch(() => props.initialCollapsed, (newValue) => {
      isCollapsed.value = newValue;
    });
    
    const toggleSidebar = () => {
      isCollapsed.value = !isCollapsed.value;
      localStorage.setItem('sidebarCollapsed', isCollapsed.value);
      emit('collapse-change', isCollapsed.value);
    };
    
    return {
      currentRoute,
      isCollapsed,
      toggleSidebar
    };
  }
};
</script>

<style scoped>
.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: white;
  padding: 0 0 20px;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  height: 100vh;
  position: relative;
  z-index: 10; /* Add z-index to ensure sidebar stays above other content */
}

.sidebar.collapsed {
  width: 60px;
  overflow: hidden;
  /* No need for position: absolute since we'll fix the chat area instead */
}

.sidebar-header {
  background-color: #1a2530;
  padding: 15px;
  text-align: center;
}

.app-logo {
  max-width: 120px;
  height: auto;
  transition: max-width 0.3s ease;
}

.collapsed .app-logo {
  max-width: 30px;
}

h3 {
  margin: 15px 20px;
  transition: opacity 0.2s;
}

/* Navigation styles */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  margin: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #ecf0f1;
  text-decoration: none;
  transition: background-color 0.2s;
}

.collapsed .nav-item {
  padding: 12px;
  justify-content: center;
}

.nav-item:hover {
  background-color: #34495e;
}

.nav-item.active {
  background-color: #34495e;
  border-left: 4px solid #3498db;
}

.collapsed .nav-item.active {
  border-left: 2px solid #3498db;
}

.nav-icon {
  margin-right: 12px;
  font-size: 18px;
}

.collapsed .nav-icon {
  margin-right: 0;
}

.toggle-container {
  display: flex;
  justify-content: flex-end;
  padding: 5px 15px;
}

.toggle-btn {
  background-color: #34495e;
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background-color: #2c3e50;
}

.user-profile {
  margin-top: auto;
  padding: 15px 20px;
  border-top: 1px solid #34495e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-profile-mini {
  margin-top: auto;
  padding: 15px 0;
  display: flex;
  justify-content: center;
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

.logout-btn-mini {
  background-color: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
}
</style>