import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ??
  process.env.EXPO_PUBLIC_BACKEND_URL;

if (!API_URL) {
  throw new Error('❌ EXPO_PUBLIC_BACKEND_URL is missing');
}

console.log('🔗 API Base URL:', `${API_URL}/api`);


/* ======================================================
   AXIOS INSTANCES
====================================================== */

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const refreshClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});


// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    
    // If data is FormData, remove Content-Type header completely to let axios set it with boundary
    // In React Native, FormData might not be detected with instanceof, so check for _parts or other indicators
    const isFormData = config.data instanceof FormData || 
                       (config.data && typeof config.data === 'object' && '_parts' in config.data) ||
                       (config.data && typeof config.data === 'object' && config.data.constructor && config.data.constructor.name === 'FormData');
    
    if (isFormData) {
      // Remove Content-Type completely - axios will set it with the correct boundary
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      // Also remove from defaults if present
      if (api.defaults.headers.common['Content-Type']) {
        delete api.defaults.headers.common['Content-Type'];
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful requests in development
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const fullUrl = originalRequest ? `${originalRequest.baseURL || api.defaults.baseURL}${originalRequest.url || ''}` : 'unknown';
    const status = error?.response?.status;
    const message = (error?.response?.data?.message || '').toLowerCase();

    // Prevent attempting refresh for refresh endpoint itself
    const isRefreshCall = (originalRequest?.url || '').includes('/auth/refresh');

    if (!isRefreshCall && status === 401 && message.includes('token expired') && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await refreshClient.post('/auth/refresh', { refreshToken });
          const newToken = refreshResponse?.data?.token;
          if (newToken) {
            await AsyncStorage.setItem('auth_token', newToken);
            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr: any) {
        const refreshData = refreshErr?.response?.data;
        console.error('Refresh token failed:', refreshData || refreshErr?.message || refreshErr);
      }
      // If refresh fails, clear tokens so user re-authenticates
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user_data');
    }

    if (error.response) {
      console.error('❌ API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest?.url,
        fullUrl,
        method: originalRequest?.method?.toUpperCase(),
      });
    } else if (error.request) {
      console.error('❌ API Error Request (No Response):', {
        message: 'No response from server - Check if backend is running',
        url: originalRequest?.url,
        fullUrl,
        baseURL: API_URL,
        method: originalRequest?.method?.toUpperCase(),
      });
    } else {
      console.error('❌ API Error Setup:', {
        message: error.message,
        url: originalRequest?.url,
        fullUrl,
      });
    }
    return Promise.reject(error);
  }
);

// Auth API (aligned to backend routes)
export const authAPI = {
  // Backend expects: { username, email, password }
  signup: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  // Backend expects: { identifier, password }
  signin: (data: { identifier: string; password: string }) =>
    api.post('/auth/mobile-login', data),
  // Backend expects: { userId, code }
  verify: (data: { userId: string; code: string }) =>
    api.post('/auth/verify-code', data),
  // Backend expects: { email }
  requestReset: (data: { email: string }) => api.post('/auth/forgot-password', data),
  // Backend expects: { email, code, newPassword }
  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  // Protected: returns { message, user }
  getMe: () => api.get('/auth/dashboard'),
};

// Gifts API
export const giftsAPI = {
  getAll: (params?: { category?: string; occasion?: string }) =>
    api.get('/gifts', { params }),
  getById: (id: string) => api.get(`/gifts/${id}`),
  create: (data: any) => api.post('/gifts', data),
};

// Wishlist API
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  add: (giftId: string) => api.post(`/wishlist/${giftId}`),
  remove: (giftId: string) => api.delete(`/wishlist/${giftId}`),
};

// Cart API

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (giftId: string, quantity = 1) => api.post(`/cart/${giftId}`, { quantity }),
  updateQuantity: (giftId: string, quantity: number) => api.put(`/cart/${giftId}`, { quantity }),
  remove: (giftId: string) => api.delete(`/cart/${giftId}`),
  checkout: (data?: any) => api.post('/cart/checkout', data),
  getOrder: (orderId: string) => api.get(`/orders/${orderId}`),
};


// Orders API
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data?: { shipping_address?: string; payment_method?: string }) =>
    api.post('/orders', data || {}),
  updateStatus: (id: string, status: string) =>
    api.put(`/orders/${id}/status`, { status }),
};

// Chat API - extended timeout for AI responses
const chatApiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for chat (AI responses may take time, especially for surprise plans)
});

// Add auth token to chat requests
chatApiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const chatAPI = {
  sendMessage: (message: string) => chatApiClient.post('/chat/giftbot', { message }),
  getHistory: () => api.get('/chat/history'), // Use regular api for history (fast)
  clearHistory: () => api.delete('/chat/history'), // Clear all chat history
};

// Gift Card API
export const giftCardAPI = {
  generate: (data: { gift_id: string; tone: string; recipient_name?: string }) =>
    api.post('/giftcard/generate', data),
};


// Community API
export const communityAPI = {
  // If options.mine === true, hit the authenticated /my-ideas endpoint
  // Otherwise, use the public /ideas endpoint
  getIdeas: (options?: { mine?: boolean }) =>
    api.get(options?.mine ? '/community/my-ideas' : '/community/ideas'),
  createIdea: (data: any) => api.post('/community/ideas', data),
  updateIdea: (ideaId: string, data: any) => api.put(`/community/ideas/${ideaId}`, data), // <-- new
  likeIdea: (ideaId: string) => api.post(`/community/ideas/${ideaId}/like`),
  getComments: (ideaId: string) => api.get(`/community/ideas/${ideaId}/comments`),
  addComment: (ideaId: string, comment: string) =>
    api.post(`/community/ideas/${ideaId}/comments`, { comment }),
  deleteIdea: (ideaId: string) => api.delete(`/community/ideas/${ideaId}`),
};


// Donations API
export const donationsAPI = {
  getCauses: () => api.get('/donations/causes'),
  donate: (data: { cause_id: string; amount: number; message?: string }) =>
    api.post('/donations/donate', data),
  getMyDonations: () => api.get('/donations/my-donations'),
};

// Reminders API
export const remindersAPI = {
  getAll: (type?: 'ai' | 'event') => {
    const params = type ? { type } : {};
    return api.get('/reminders', { params });
  },
  create: (data: any) => api.post('/reminders', data),
  update: (reminderId: string, data: any) => api.put(`/reminders/${reminderId}`, data),
  delete: (reminderId: string) => api.delete(`/reminders/${reminderId}`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Quiz API
export const quizAPI = {
  getQuestions: () => api.get('/quiz/questions'),
  submit: (answers: any[]) => api.post('/quiz/submit', { answers }),
};

// Feed API
export const feedAPI = {
  getPersonalized: () => api.get('/feed/personalized'),
};

// Seed API
export const seedAPI = {
  seedData: () => api.post('/seed/initial-data'),
};

export const feedbackAPI = {
  getMyFeedback: async () => {
    return api.get('/feedback'); // using the pre-configured axios instance
  },
  submitFeedback: async ({
    rating,
    comment,
    user_name,
  }: {
    rating: number;
    comment: string;
    user_name?: string;
  }) => {
    return api.post('/feedback', { rating, comment, user_name }); // using pre-configured axios
  },
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: async (formData: FormData) => {
    // Use fetch for FormData uploads - React Native handles it better than axios
    const token = await AsyncStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - let fetch set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw {
        response: {
          status: response.status,
          data: errorData,
        },
        message: errorData.message || 'Request failed',
      };
    }

    const data = await response.json();
    return { data };
  },
};

// Delivery API (for delivery workers)
export const deliveryAPI = {
  getMyAssignments: () => api.get('/delivery/my-assignments'),
  updateDeliveryStatus: (assignmentId: string, status: string, driverFeedback?: string) =>
    api.put(`/delivery/${assignmentId}/status`, { status, driver_feedback: driverFeedback }),
  submitClientFeedback: (assignmentId: string, feedback: string) =>
    api.post(`/delivery/${assignmentId}/client-feedback`, { client_feedback: feedback }),
};

// User Delivery API (for normal users to track deliveries and view feedback)
export const userDeliveryAPI = {
  // Get delivery status and feedback for the current user
  getMyDeliveries: () => api.get('/delivery/user-assignments'),
};
