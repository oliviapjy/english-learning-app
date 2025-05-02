<!-- src/components/layout/TheSidebar.vue -->
<template>
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="../../assets/app_logo_white.png" alt="App Logo" class="app-logo" />
        
      </div>
      <h3>BlinkED</h3>
      <nav class="sidebar-nav">
        <router-link to="/home" class="nav-item">
          <span class="nav-icon">📚</span>
          <span>Conversations</span>
        </router-link>
        <router-link to="/friends" class="nav-item active">
          <span class="nav-icon">👥</span>
          <span>Friends</span>
        </router-link>
        <router-link to="/profile" class="nav-item">
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
  export default {
    name: 'TheSidebar',
    props: {
      user: {
        type: Object,
        required: true
      }
    },
    emits: ['logout']
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
    height: 100vh;
  }
  
  .sidebar-header {
    background-color: #1a2530;
    padding: 15px;
    text-align: center;
  }
  
  .app-logo {
    max-width: 120px;
    height: auto;
    margin-bottom: 10px;
  }
  
  h3 {
    margin: 0;
    padding: 0 20px;
  }
  
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    margin-top: 20px;
  }
  
  .nav-item {
    padding: 12px 20px;
    color: #ecf0f1;
    text-decoration: none;
    border-left: 3px solid transparent;
    display: flex;
    align-items: center;
    transition: all 0.2s;
  }
  
  .nav-item:hover, .nav-item.active {
    background-color: #34495e;
    border-left-color: #3498db;
  }
  
  .nav-icon {
    margin-right: 10px;
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