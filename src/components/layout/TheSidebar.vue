<!-- src/components/layout/TheSidebar.vue -->
<template>
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="../../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
      </div>
      <h3>BlinkED</h3>
      <nav class="sidebar-nav">
        <router-link to="/home" class="nav-item" :class="{ active: currentRoute === '/home' }">
          <span class="nav-icon">📚</span>
          <span>Conversations</span>
        </router-link>
        <router-link to="/friends" class="nav-item" :class="{ active: currentRoute === '/friends' }">
          <span class="nav-icon">👥</span>
          <span>Friends</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: currentRoute === '/profile' }">
          <span class="nav-icon">👤</span>
          <span>Profile</span>
        </router-link>
      </nav>
      <div class="user-profile">
        <span class="username">{{ user.name }}</span>
        <button @click="$emit('logout')" class="logout-btn">Logout</button>
      </div>
    </div>
  </template>
  
  <script>
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  
  export default {
    name: 'TheSidebar',
    props: {
      user: {
        type: Object,
        required: true
      }
    },
    emits: ['logout'],
    setup() {
      const route = useRoute();
      const currentRoute = computed(() => route.path);
      
      return {
        currentRoute
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
  
  .nav-item:hover {
    background-color: #34495e;
  }
  
  .nav-item.active {
    background-color: #34495e;
    border-left: 4px solid #3498db;
  }
  
  .nav-icon {
    margin-right: 12px;
    font-size: 18px;
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
  </style>