// src/router/index.js (Updated)
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Import components
import Login from '../components/Login.vue';
import HomeScreen from '../components/HomeScreen.vue';
import NewConversation from '../components/NewConversation.vue';
import Conversation from '../components/Conversation.vue';
import PracticeScreen from '../components/PracticeScreen.vue';
import ProfileScreen from '../components/ProfileScreen.vue'; // Import the new ProfileScreen

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
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/:id',
    name: 'Practice',
    component: PracticeScreen,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileScreen,
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

export default router;