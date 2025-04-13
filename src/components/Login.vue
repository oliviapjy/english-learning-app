<!-- src/components/Login.vue -->
<template>
  <div class="login-container">
    <!-- Back Arrow (visible on login/signup screens) -->
    <button v-if="currentScreen !== 'choose'" class="back-arrow" @click="currentScreen = 'choose'">
      ←
    </button>

    <!-- Choose Screen (Initial) -->
    <div v-if="currentScreen === 'choose'" class="choose-screen">
      <div class="logo-container">
        <img src="../assets/app_logo.png" alt="App Logo" class="app-logo" />
      </div>
      <h2>Welcome to TalkEase</h2>
      <p>Improve your English through daily conversations</p>

      <div class="button-group">
        <button @click="currentScreen = 'login'" class="primary-btn">Login</button>
        <button @click="currentScreen = 'signup'" class="secondary-btn">Sign Up</button>
      </div>
    </div>

    <!-- Login Screen -->
    <div v-if="currentScreen === 'login'" class="login-form">
      <div class="logo-container">
        <img src="../assets/app_logo.png" alt="App Logo" class="app-logo" />
      </div>
      <h2>Welcome Back</h2>
      <p>Sign in to continue your journey</p>

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

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>

    <!-- Signup Screen -->
    <div v-if="currentScreen === 'signup'" class="signup-form">
      <div class="logo-container">
        <img src="../assets/app_logo.png" alt="App Logo" class="app-logo" />
      </div>
      <h2>Create Your Account</h2>

      <div class="form-group">
        <label for="newName">Username</label>
        <input 
          type="text" 
          id="newName" 
          v-model="newUser.name" 
          placeholder="Enter your username"
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

      <div class="form-group terms-checkbox">
        <input type="checkbox" id="terms" v-model="acceptTerms" />
        <label for="terms">I accept the <a href="#" target="_blank">terms and conditions</a></label>
      </div>

      <button @click="signup" class="signup-btn" :disabled="!acceptTerms">Sign Up</button>

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
    const currentScreen = ref('choose');
    const router = useRouter();
    const authStore = useAuthStore();

    const newUser = ref({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    const signupError = ref('');
    const acceptTerms = ref(false);

    const login = async () => {
      if (!email.value || !password.value) {
        error.value = 'Please enter both email and password';
        return;
      }

      try {
        await authStore.login(email.value, password.value);
        router.push('/home');
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

      if (!acceptTerms.value) {
        signupError.value = 'You must accept the terms and conditions';
        return;
      }

      try {
        await authStore.signup(newUser.value);
        email.value = newUser.value.email;
        password.value = newUser.value.password;
        signupError.value = '';
        currentScreen.value = 'login';
      } catch (err) {
        signupError.value = err.message || 'Signup failed. Please try again.';
      }
    };

    return {
      email,
      password,
      error,
      login,
      currentScreen,
      newUser,
      signupError,
      signup,
      acceptTerms
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
  position: relative;
}

.back-arrow {
  position: absolute;
  top: 10px;
  left: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #2c3e50;
}

.logo-container {
  text-align: center;
  margin-bottom: 20px;
}

.app-logo {
  max-width: 150px;
  height: auto;
}

.login-form, .signup-form, .choose-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 0;
}

.choose-screen p {
  text-align: center;
  color: #7f8c8d;
  margin-top: 5px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.terms-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #2c3e50;
}

label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

input[type="text"],
input[type="email"],
input[type="password"] {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.primary-btn, .secondary-btn, .login-btn, .signup-btn, .back-btn {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  border: none;
}

.primary-btn, .login-btn, .signup-btn {
  background-color: #000000;
  color: white;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.primary-btn:hover, .login-btn:hover, .signup-btn:hover {
  background-color: rgb(53, 53, 53);
  color: #ffffff;
}

.secondary-btn, .back-btn {
  background-color: white;
  color: #000000;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.secondary-btn:hover, .back-btn:hover {
  background-color: #bebebe;
  color: rgb(0, 0, 0);
}

.back-btn {
  background-color: #ffffff;
  color: rgb(0, 0, 0);
}

.back-btn:hover {
  background-color: #000000;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
}
</style>
