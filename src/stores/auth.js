// src/stores/auth.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isLoggedIn = ref(false);
  
  // For demo purposes, we'll use localStorage to persist user data
  // In a real app, you'd use secure cookies and a proper backend
  const initStore = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user.value = JSON.parse(storedUser);
      isLoggedIn.value = true;
    }
  };
  
  // Simulated login - would be API call in real app
  const login = async (email, password) => {
    // This is a mock implementation
    // In a real app, this would validate credentials against your backend
    
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        // Demo login logic (replace with real API call)
        if (email && password) {
          // Mock user object (would come from your backend)
          const userData = {
            id: '1',
            name: email.split('@')[0], // Use part of the email as name
            email: email,
            level: 'Beginner',
            learningGoals: [
              { text: 'Improve speaking fluency', selected: true },
              { text: 'Expand vocabulary', selected: true },
              { text: 'Master grammar rules', selected: false },
              { text: 'Practice professional conversation', selected: false },
              { text: 'Prepare for language exam', selected: false }
            ],
            practiceReminder: 'never'
          };
          
          user.value = userData;
          isLoggedIn.value = true;
          localStorage.setItem('user', JSON.stringify(userData));
          resolve(userData);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 800);
    });
  };
  
  const signup = async (userData) => {
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        // In a real app, this would create a new user in your database
        if (userData.email && userData.password) {
          // Create mock user
          const newUser = {
            id: Math.floor(Math.random() * 1000).toString(),
            name: userData.name,
            email: userData.email,
            level: 'Beginner',
            learningGoals: [
              { text: 'Improve speaking fluency', selected: true },
              { text: 'Expand vocabulary', selected: true },
              { text: 'Master grammar rules', selected: false },
              { text: 'Practice professional conversation', selected: false },
              { text: 'Prepare for language exam', selected: false }
            ],
            practiceReminder: 'never'
          };
          
          // Here you would typically save to your backend
          // For this demo, we'll just resolve with the new user
          resolve(newUser);
        } else {
          reject(new Error('Invalid user data'));
        }
      }, 800);
    });
  };
  
  const updateProfile = async (profileData) => {
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        try {
          // In a real app, this would update the user in your backend
          // Merge the existing user data with the updated profile data
          const updatedUser = {
            ...user.value,
            ...profileData
          };
          
          user.value = updatedUser;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          resolve(updatedUser);
        } catch (error) {
          reject(new Error('Failed to update profile'));
        }
      }, 600);
    });
  };
  
  const logout = () => {
    user.value = null;
    isLoggedIn.value = false;
    localStorage.removeItem('user');
  };
  
  // Initialize store (check if user is already logged in)
  initStore();
  
  return {
    user,
    isLoggedIn,
    login,
    signup,
    updateProfile,
    logout
  };
});