// src/stores/conversation.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref([]);
  const currentConversation = ref(null);
  
  // Sample topics from the Conversation.vue component
  const availableTopics = [
    {
      title: 'Everyday Conversations',
      description: 'Practice common phrases and expressions used in daily interactions.',
      level: 'Beginner'
    },
    {
      title: 'Business English',
      description: 'Learn professional vocabulary and expressions for the workplace.',
      level: 'Intermediate'
    },
    {
      title: 'Travel & Culture',
      description: 'Prepare for conversations while traveling and discussing cultural topics.',
      level: 'Intermediate'
    },
    {
      title: 'Academic Discussions',
      description: 'Practice expressing complex ideas and arguments in English.',
      level: 'Advanced'
    }
  ];
  
  // For demo purposes, we'll use localStorage to persist conversation data
  const initStore = () => {
    const storedConversations = localStorage.getItem('conversations');
    if (storedConversations) {
      conversations.value = JSON.parse(storedConversations);
    } else {
      // Initialize with some sample conversations if none exist
      const sampleConversations = [
        {
          id: '1',
          topic: availableTopics[0],
          messages: [
            {
              sender: 'ai',
              text: `Welcome to the "Everyday Conversations" practice! I'm your English practice partner. Let's start with some basic greetings.`,
              timestamp: new Date(Date.now() - 86400000) // 1 day ago
            }
          ],
          createdAt: new Date(Date.now() - 86400000),
          lastUpdated: new Date(Date.now() - 86400000)
        },
        {
          id: '2',
          topic: availableTopics[2],
          messages: [
            {
              sender: 'ai',
              text: `Welcome to "Travel & Culture"! Ready to learn how to navigate cultural conversations while traveling?`,
              timestamp: new Date(Date.now() - 172800000) // 2 days ago
            },
            {
              sender: 'user',
              text: `Yes, I'm planning a trip to Japan. What are some useful phrases I should know?`,
              timestamp: new Date(Date.now() - 172700000)
            },
            {
              sender: 'ai',
              text: `Great choice! Here are some essential Japanese phrases: "Konnichiwa" (Hello), "Arigatou" (Thank you), "Sumimasen" (Excuse me/Sorry). Would you like to practice these?`,
              timestamp: new Date(Date.now() - 172600000)
            }
          ],
          createdAt: new Date(Date.now() - 172800000),
          lastUpdated: new Date(Date.now() - 172600000)
        }
      ];
      conversations.value = sampleConversations;
      saveConversations();
    }
  };
  
  const fetchConversations = async () => {
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        initStore();
        resolve(conversations.value);
      }, 800);
    });
  };
  
  const createConversation = async (topicIndex) => {
    const topic = availableTopics[topicIndex];
    const newConversation = {
      id: Date.now().toString(),
      topic: topic,
      messages: [
        {
          sender: 'ai',
          text: `Welcome to the "${topic.title}" conversation! I'm your English practice partner. Let's start practicing ${topic.level}-level English. How can I help you today?`,
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    conversations.value.unshift(newConversation);
    saveConversations();
    
    return newConversation;
  };
  
  const setCurrentConversation = (conversation) => {
    currentConversation.value = conversation;
  };
  
  const addMessage = (conversationId, message) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (conversation) {
      conversation.messages.push(message);
      conversation.lastUpdated = new Date();
      saveConversations();
    }
  };
  
  const saveConversations = () => {
    localStorage.setItem('conversations', JSON.stringify(conversations.value));
  };
  
  const getAvailableTopics = () => {
    return availableTopics;
  };
  
  return {
    conversations,
    currentConversation,
    fetchConversations,
    createConversation,
    setCurrentConversation,
    addMessage,
    getAvailableTopics
  };
});