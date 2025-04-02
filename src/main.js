// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Create app instance
const app = createApp(App);

// Add Pinia store
const pinia = createPinia();
app.use(pinia);

// Add router
app.use(router);

// Mount app
app.mount('#app');