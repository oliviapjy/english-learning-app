// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Import components
import Login from '../components/Login.vue';
import HomeScreen from '../components/HomeScreen.vue';
import NewConversation from '../components/NewConversation.vue';
import Conversation from '../components/Conversation.vue';
import PracticeScreen from '../components/PracticeScreen.vue';
import PracticeListScreen from '../components/PracticeListScreen.vue';
import ProfileScreen from '../components/ProfileScreen.vue';
import FriendsScreen from '../components/FriendsScreen.vue';
import InfoBoardScreen from '../components/InfoBoardScreen.vue'; // Import the new component

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeScreen,
    meta: { requiresAuth: true }
  },
  {
    path: '/new-conversation',
    name: 'NewConversation',
    component: NewConversation,
    meta: { requiresAuth: true }
  },
  {
    path: '/conversation/:id',
    name: 'Conversation',
    component: Conversation,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/practice-list',
    name: 'PracticeList',
    component: PracticeListScreen,
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/:id',
    name: 'Practice',
    component: PracticeScreen,
    props: route => ({ 
      conversationId: route.params.id,
      environment: route.query.environment || 'everyday'
    }),
    meta: { requiresAuth: true, realtime: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileScreen,
    meta: { requiresAuth: true }
  },
  {
    path: '/friends',
    name: 'Friends',
    component: FriendsScreen,
    meta: { requiresAuth: true }
  },
  {
    path: '/info-board',
    name: 'InfoBoard',
    component: InfoBoardScreen,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // Redirect to login page if not authenticated
    next('/login');
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    // Redirect to home page if already logged in
    next('/home');
  } else {
    // Proceed as normal
    next();
  }
});

// Clean up event source connections when leaving realtime pages
router.afterEach((to, from) => {
  // Check if we're navigating away from a realtime page
  if (from.meta.realtime && window._eventSourceConnections) {
    // Clean up any active event source connections
    Object.values(window._eventSourceConnections).forEach(connection => {
      if (connection && typeof connection.close === 'function') {
        connection.close();
      }
    });
    
    // Reset connections store
    window._eventSourceConnections = {};
  }
});

// Create a global store for event source connections
if (typeof window !== 'undefined') {
  window._eventSourceConnections = window._eventSourceConnections || {};
}

export default router;