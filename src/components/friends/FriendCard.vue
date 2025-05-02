<!-- src/components/friends/FriendCard.vue -->
<template>
    <div class="friend-card">
      <!-- Friend Avatar -->
      <div class="friend-avatar">
        <img :src="friend.avatar" :alt="friend.name" />
        <div v-if="friend.isOnline" class="online-indicator"></div>
      </div>
      
      <!-- Friend Info -->
      <div class="friend-info">
        <h3>{{ friend.name }}</h3>
        <p class="friend-level">Level: {{ friend.level }}</p>
        <div class="streak-info">
          <span class="streak-icon">🔥</span>
          <span class="streak-count">{{ friend.streak }} day streak</span>
        </div>
      </div>
      
      <!-- Friend Activity -->
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
      
      <!-- Friend Actions -->
      <div class="friend-actions">
        <button @click="$emit('view-profile', friend)" class="action-btn view-btn">
          View Profile
        </button>
        <button @click="$emit('start-challenge', friend)" class="action-btn challenge-btn">
          Challenge
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FriendCard',
    props: {
      friend: {
        type: Object,
        required: true
      }
    },
    emits: ['view-profile', 'start-challenge'],
    setup() {
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
      
      return {
        formatDate
      };
    }
  };
  </script>
  
  <style scoped>
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
  </style>