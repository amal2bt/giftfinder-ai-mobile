import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../utils/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<{ email: string; userId: string }>;
  verify: (userId: string, code: string) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      // backend expects username; use fullName as username
      const response = await authAPI.signup({
        username: fullName,
        email,
        password,
      });
      // Backend returns: { message, user: { id, username, email } }
      const { user } = response.data;
      if (!user || !user.id) {
        throw new Error('Invalid response from server');
      }
      return { email: user.email, userId: user.id };
    } catch (error: any) {
      // Backend returns 'message' not 'detail'
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Signup failed';
      console.error('Signup error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  };

  const verify = async (userId: string, code: string) => {
    try {
      const response = await authAPI.verify({ userId, code });
      // Backend returns: { message, token, refreshToken, user: { id, username, email } }
      const { token: newToken, user: userData, refreshToken } = response.data;
      
      if (!newToken || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Map backend user (username) to frontend user (full_name)
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.username || userData.full_name || '',
        profile_picture_url: userData.profile_picture_url,
        role: userData.role,
      };
      
      await AsyncStorage.setItem('auth_token', newToken);
      if (refreshToken) await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('user_data', JSON.stringify(mappedUser));
      
      setToken(newToken);
      setUser(mappedUser);
    } catch (error: any) {
      // Backend returns 'message' not 'detail'
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Verification failed';
      console.error('Verify error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  };

  const signin = async (email: string, password: string) => {
    try {
      // Explicitly call mobile login endpoint
      const response = await authAPI.signin({ identifier: email, password });
      // Backend returns: { message, token, refreshToken, user: { id, username, email, role } }
      const { token: newToken, user: userData, refreshToken } = response.data;
      
      if (!newToken || !userData) {
        throw new Error('Invalid response from server');
      }
      
      // Map backend user (username) to frontend user (full_name)
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.username || userData.full_name || '',
        profile_picture_url: userData.profile_picture_url,
        role: userData.role,
      };
      
      await AsyncStorage.setItem('auth_token', newToken);
      if (refreshToken) await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('user_data', JSON.stringify(mappedUser));
      setToken(newToken);
      setUser(mappedUser);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.detail || error.message || 'Signin failed';
      console.error('Signin error:', error.response?.data || error);
      throw new Error(errorMessage);
    }
  };

  const signout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data?.user ?? response.data;
      
      // Map backend user (username) to frontend user (full_name)
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.username || userData.full_name || '',
        profile_picture_url: userData.profile_picture_url,
        role: userData.role,
      };
      
      await AsyncStorage.setItem('user_data', JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        signin,
        signup,
        verify,
        signout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};