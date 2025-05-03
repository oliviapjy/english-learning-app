<!-- src/components/InfoBoardScreen.vue -->
<template>
    <div class="app-container">
      <!-- Sidebar Component -->
      <TheSidebar :user="user" @logout="logout" />
      
      <div class="content-area">
        <div class="header">
          <h2>English Practice Opportunities</h2>
          <div class="filter-actions">
            <button @click="toggleFilters" class="filter-toggle-btn">
              {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
            </button>
          </div>
        </div>
        
        <!-- Filters -->
        <div v-if="showFilters" class="filters">
          <div class="filter-group">
            <label for="type-filter">Type:</label>
            <select id="type-filter" v-model="filters.type">
              <option value="all">All Types</option>
              <option value="inperson">In-Person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="cost-filter">Cost:</label>
            <select id="cost-filter" v-model="filters.cost">
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          
          <button class="reset-btn" @click="resetFilters">Reset Filters</button>
        </div>
        
        <!-- Loading State -->
        <div v-if="loading" class="loading-indicator">
          Loading opportunities...
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredOpportunities.length === 0" class="empty-state">
          <div class="empty-message">
            <p>No opportunities found matching your filters.</p>
            <button @click="resetFilters" class="start-btn">
              Reset Filters
            </button>
          </div>
        </div>
        
        <!-- Opportunities List -->
        <div v-else class="opportunities-list">
          <div 
            v-for="opportunity in filteredOpportunities" 
            :key="opportunity.id" 
            class="opportunity-card"
          >
            <div class="opportunity-info">
              <h3>{{ opportunity.name }}</h3>
              <p class="organization">{{ opportunity.organization }}</p>
              <p class="description">{{ opportunity.description }}</p>
              <div class="opportunity-meta">
                <span class="level-badge" :class="opportunity.type">{{ opportunity.type }}</span>
                <span class="level-badge" :class="opportunity.cost">{{ opportunity.cost }}</span>
              </div>
            </div>
            
            <div class="opportunity-actions">
              <a :href="opportunity.website" target="_blank" class="action-btn view-btn">
                Visit Website
              </a>
              <button @click="saveOpportunity(opportunity)" class="action-btn" :class="savedOpportunities.includes(opportunity.id) ? 'saved-btn' : 'save-btn'">
                {{ savedOpportunities.includes(opportunity.id) ? 'Saved' : 'Save' }}
              </button>
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
  import TheSidebar from './layout/TheSidebar.vue';
  
  export default {
    name: 'InfoBoardScreen',
    components: {
      TheSidebar
    },
    setup() {
      const router = useRouter();
      const authStore = useAuthStore();
      const user = ref({ name: 'User' });
      const loading = ref(true);
      const opportunities = ref([]);
      const savedOpportunities = ref([]);
      const showFilters = ref(false);
      const filters = ref({
        type: 'all',
        cost: 'all'
      });
  
      // Mock data - in a real app, you would fetch this from an API
      const mockOpportunities = [
        {
          id: 1,
          name: 'Conversation Partners Program',
          organization: 'City Library',
          description: 'Weekly meetups with native speakers to practice conversation skills in a relaxed environment.',
          type: 'inperson',
          cost: 'free',
          website: 'https://example.com/library'
        },
        {
          id: 2,
          name: 'English Corner Online',
          organization: 'Global Language Exchange',
          description: 'Join virtual rooms with other learners and facilitators to practice speaking English on various topics.',
          type: 'online',
          cost: 'free',
          website: 'https://example.com/englishcorner'
        },
        {
          id: 3,
          name: 'Business English Workshop',
          organization: 'Professional Development Institute',
          description: 'Structured courses focused on business vocabulary, email writing, and presentation skills.',
          type: 'hybrid',
          cost: 'paid',
          website: 'https://example.com/bizworkshop'
        },
        {
          id: 4,
          name: 'Community Language Exchange',
          organization: 'Cultural Center',
          description: 'Monthly events where speakers of different languages meet to help each other practice.',
          type: 'inperson',
          cost: 'free',
          website: 'https://example.com/exchange'
        },
        {
          id: 5,
          name: 'Intensive Speaking Course',
          organization: 'English Academy',
          description: '8-week program with daily speaking practice, feedback, and personalized coaching.',
          type: 'online',
          cost: 'paid',
          website: 'https://example.com/intensive'
        },
        {
          id: 6,
          name: 'Job Interview Preparation',
          organization: 'Career Center',
          description: 'Practice English for job interviews with mock interviews and feedback from professionals.',
          type: 'hybrid',
          cost: 'free',
          website: 'https://example.com/interview'
        }
      ];
  
      onMounted(async () => {
        if (!authStore.isLoggedIn) {
          router.push('/login');
          return;
        }
        
        user.value = authStore.user;
        
        // Load saved opportunities from localStorage
        loadSavedOpportunities();
        
        // In a real app, you would fetch from an API here
        setTimeout(() => {
          opportunities.value = mockOpportunities;
          loading.value = false;
        }, 600); // Simulate API loading delay
      });
  
      // Load saved opportunities from localStorage
      const loadSavedOpportunities = () => {
        const saved = localStorage.getItem('savedOpportunities');
        if (saved) {
          savedOpportunities.value = JSON.parse(saved);
        }
      };
  
      // Toggle filters visibility
      const toggleFilters = () => {
        showFilters.value = !showFilters.value;
      };
  
      // Save an opportunity
      const saveOpportunity = (opportunity) => {
        const opportunityId = opportunity.id;
        const index = savedOpportunities.value.indexOf(opportunityId);
        
        if (index === -1) {
          // Add to saved
          savedOpportunities.value.push(opportunityId);
        } else {
          // Remove from saved
          savedOpportunities.value.splice(index, 1);
        }
        
        // Save to localStorage
        localStorage.setItem('savedOpportunities', JSON.stringify(savedOpportunities.value));
      };
  
      // Filtered opportunities based on selected filters
      const filteredOpportunities = computed(() => {
        return opportunities.value.filter(opp => {
          const typeMatch = filters.value.type === 'all' || opp.type === filters.value.type;
          const costMatch = filters.value.cost === 'all' || opp.cost === filters.value.cost;
          return typeMatch && costMatch;
        });
      });
  
      // Reset filters
      const resetFilters = () => {
        filters.value = {
          type: 'all',
          cost: 'all'
        };
      };
      
      const logout = () => {
        authStore.logout();
        router.push('/login');
      };
  
      return {
        user,
        loading,
        opportunities,
        savedOpportunities,
        showFilters,
        filters,
        filteredOpportunities,
        toggleFilters,
        saveOpportunity,
        resetFilters,
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
  
  .filter-toggle-btn {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .filter-toggle-btn:hover {
    background-color: #2980b9;
  }
  
  /* Filters */
  .filters {
    display: flex;
    gap: 16px;
    background-color: white;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    align-items: center;
    flex-wrap: wrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .filter-group label {
    font-weight: 500;
    color: #2c3e50;
  }
  
  .filter-group select {
    padding: 8px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background-color: white;
  }
  
  .reset-btn {
    margin-left: auto;
    background-color: transparent;
    border: 1px solid #dcdfe6;
    color: #606266;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .reset-btn:hover {
    background-color: #f2f6fc;
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
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
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
  
  /* Opportunity Cards */
  .opportunities-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .opportunity-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .opportunity-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  }
  
  .opportunity-info {
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .opportunity-info h3 {
    margin: 0 0 5px;
    color: #2c3e50;
  }
  
  .organization {
    font-weight: 500;
    color: #546e7a;
    margin: 0 0 8px;
    font-size: 14px;
  }
  
  .description {
    margin: 0 0 10px;
    color: #7f8c8d;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .opportunity-meta {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  
  .level-badge {
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .inperson {
    background-color: #e3f2fd;
    color: #1976d2;
  }
  
  .online {
    background-color: #e8f5e9;
    color: #388e3c;
  }
  
  .hybrid {
    background-color: #ede7f6;
    color: #5e35b1;
  }
  
  .free {
    background-color: #f3e5f5;
    color: #8e24aa;
  }
  
  .paid {
    background-color: #fff3e0;
    color: #ef6c00;
  }
  
  .opportunity-actions {
    display: flex;
    padding: 10px;
    background-color: #f9f9f9;
    border-top: 1px solid #f0f0f0;
  }
  
  .action-btn {
    flex: 1;
    padding: 8px 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    text-align: center;
    margin: 0 5px;
    transition: background-color 0.2s;
    text-decoration: none;
    display: inline-block;
  }
  
  .view-btn {
    background-color: #3498db;
    color: white;
  }
  
  .view-btn:hover {
    background-color: #2980b9;
  }
  
  .save-btn {
    background-color: #27ae60;
    color: white;
  }
  
  .save-btn:hover {
    background-color: #219653;
  }
  
  .saved-btn {
    background-color: #95a5a6;
    color: white;
  }
  
  .saved-btn:hover {
    background-color: #7f8c8d;
  }
  
  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .reset-btn {
      margin-left: 0;
      margin-top: 10px;
    }
    
    .opportunities-list {
      grid-template-columns: 1fr;
    }
  }
  </style>