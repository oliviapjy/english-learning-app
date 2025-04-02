<!-- src/components/Login.vue -->
<template>
    <div class="login-container">
      <div class="login-form">
        <h2>Welcome to English Buddy</h2>
        <p>Sign in to start improving your English</p>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="Enter your email"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Enter your password"
            required
          />
        </div>
        
        <button @click="login" class="login-btn">Login</button>
        <p class="signup-text">Don't have an account? <a href="#" @click.prevent="toggleForm">Sign up</a></p>
        
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
      
      <div v-if="showSignup" class="signup-form">
        <h2>Create Your Account</h2>
        
        <div class="form-group">
          <label for="newName">Full Name</label>
          <input 
            type="text" 
            id="newName" 
            v-model="newUser.name" 
            placeholder="Enter your name"
          />
        </div>
        
        <div class="form-group">
          <label for="newEmail">Email</label>
          <input 
            type="email" 
            id="newEmail" 
            v-model="newUser.email" 
            placeholder="Enter your email"
          />
        </div>
        
        <div class="form-group">
          <label for="newPassword">Password</label>
          <input 
            type="password" 
            id="newPassword" 
            v-model="newUser.password" 
            placeholder="Choose a password"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="newUser.confirmPassword" 
            placeholder="Confirm your password"
          />
        </div>
        
        <button @click="signup" class="signup-btn">Sign Up</button>
        <button @click="toggleForm" class="back-btn">Back to Login</button>
        
        <div v-if="signupError" class="error-message">{{ signupError }}</div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/auth';
  
  export default {
    name: 'LoginComponent',
    setup() {
      const email = ref('');
      const password = ref('');
      const error = ref('');
      const showSignup = ref(false);
      const router = useRouter();
      const authStore = useAuthStore();
      
      const newUser = ref({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      const signupError = ref('');
      
      const login = async () => {
        if (!email.value || !password.value) {
          error.value = 'Please enter both email and password';
          return;
        }
        
        try {
          // In a real app, you would call your API here
          await authStore.login(email.value, password.value);
          router.push('/conversation');
        } catch (err) {
          error.value = err.message || 'Login failed. Please try again.';
        }
      };
      
      const signup = async () => {
        if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
          signupError.value = 'Please fill in all fields';
          return;
        }
        
        if (newUser.value.password !== newUser.value.confirmPassword) {
          signupError.value = 'Passwords do not match';
          return;
        }
        
        try {
          // In a real app, you would call your API here
          await authStore.signup(newUser.value);
          showSignup.value = false;
          email.value = newUser.value.email;
          password.value = newUser.value.password;
          signupError.value = '';
          // Optional: auto-login after signup
          await login();
        } catch (err) {
          signupError.value = err.message || 'Signup failed. Please try again.';
        }
      };
      
      const toggleForm = () => {
        showSignup.value = !showSignup.value;
        error.value = '';
        signupError.value = '';
      };
      
      return {
        email,
        password,
        error,
        login,
        showSignup,
        newUser,
        signupError,
        signup,
        toggleForm
      };
    }
  }
  </script>
  
  <style scoped>
  .login-container {
    max-width: 400px;
    margin: 40px auto;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    background: white;
  }
  
  .login-form, .signup-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  h2 {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 10px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  label {
    margin-bottom: 5px;
    font-weight: 500;
    color: #2c3e50;
  }
  
  input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }
  
  .login-btn, .signup-btn, .back-btn {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s;
  }
  
  .login-btn:hover, .signup-btn:hover {
    background-color: #3aa876;
  }
  
  .back-btn {
    background-color: #95a5a6;
  }
  
  .back-btn:hover {
    background-color: #7f8c8d;
  }
  
  .signup-text {
    text-align: center;
    font-size: 14px;
  }
  
  .error-message {
    color: #e74c3c;
    font-size: 14px;
    text-align: center;
  }
  
  a {
    color: #3498db;
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
  </style>