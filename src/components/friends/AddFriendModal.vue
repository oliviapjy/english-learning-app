<!-- src/components/friends/AddFriendModal.vue -->
<template>
    <div class="modal-overlay">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3>Add Learning Partner</h3>
          <button @click="$emit('close')" class="close-btn">&times;</button>
        </div>
        
        <!-- Modal Body -->
        <div class="modal-body">
          <!-- Search Box -->
          <div class="search-container">
            <input 
              :value="searchQuery"
              @input="$emit('update:search-query', $event.target.value)"
              type="text" 
              placeholder="Search by username or email" 
              class="search-input" 
            />
            <button @click="$emit('search')" class="search-btn">Search</button>
          </div>
          
          <!-- Search Results -->
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
                @click="$emit('add-friend', result)" 
                class="add-btn"
                :disabled="result.isAdded"
              >
                {{ result.isAdded ? 'Added' : '+ Add' }}
              </button>
            </div>
          </div>
          
          <!-- No Results Message -->
          <div v-else-if="hasSearched" class="no-results">
            <p>No results found. Try a different search term.</p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'AddFriendModal',
    props: {
      searchQuery: {
        type: String,
        default: ''
      },
      searchResults: {
        type: Array,
        default: () => []
      },
      hasSearched: {
        type: Boolean,
        default: false
      }
    },
    emits: ['close', 'search', 'add-friend', 'update:search-query']
  };
  </script>
  
  <style scoped>
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
    color: #2c3e50;
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
  
  .search-input {
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