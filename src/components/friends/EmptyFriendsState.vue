<!-- src/components/friends/EmptyFriendsState.vue -->
<template>
    <div class="empty-state">
      <div class="empty-message">
        <div class="empty-icon">👥</div>
        <h3>No Learning Partners Yet</h3>
        <p>Add friends to track each other's progress and build learning streaks together!</p>
        <button @click="$emit('add-friends')" class="primary-btn">
          Find Learning Partners
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'EmptyFriendsState',
    emits: ['add-friends']
  };
  </script>
  
  <style scoped>
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
    font-size: 64px;
    margin-bottom: 20px;
  }
  
  .empty-message h3 {
    margin: 0 0 10px;
    color: #2c3e50;
  }
  
  .primary-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    margin-top: 15px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .primary-btn:hover {
    background-color: #2980b9;
  }
  </style>