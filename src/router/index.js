// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Import your components
import Login from '../components/Login.vue';
import Conversation from '../components/Conversation.vue';

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
    path: '/conversation',
    name: 'Conversation',
    component: Conversation,
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
    // Redirect to conversation page if already logged in
    next('/conversation');
  } else {
    // Proceed as normal
    next();
  }
});

export default router;