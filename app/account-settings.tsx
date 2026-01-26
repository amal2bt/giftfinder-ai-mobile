import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../utils/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function AccountSettings() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.full_name || '');
      setProfilePicture(user.profile_picture_url || null);
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      if (response.data?.user) {
        const userData = response.data.user;
        setUsername(userData.username || '');
        setProfilePicture(userData.profile_picture_url || null);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    if (newPassword && newPassword.trim()) {
      if (!currentPassword.trim()) {
        Alert.alert('Error', 'Please enter your current password to change it.');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add username
      formData.append('username', username.trim());

      // Add password fields if provided
      if (newPassword && newPassword.trim()) {
        formData.append('password', newPassword.trim());
        formData.append('currentPassword', currentPassword.trim());
      }

      // Add profile picture if changed (check if it's a local file URI)
      if (profilePicture && (profilePicture.startsWith('file://') || profilePicture.startsWith('content://') || profilePicture.startsWith('ph://'))) {
        const filename = profilePicture.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('profilePicture', {
          uri: profilePicture,
          name: filename,
          type,
        } as any);
      }

      const response = await profileAPI.updateProfile(formData);
      
      if (response.data?.user) {
        // Update local state with the response data first
        const updatedUser = response.data.user;
        if (updatedUser.username) {
          setUsername(updatedUser.username);
        }
        if (updatedUser.profile_picture_url) {
          setProfilePicture(updatedUser.profile_picture_url);
        }
        
        // Try to refresh user from server, but don't fail if it errors
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn('Error refreshing user after update (non-critical):', refreshError);
          // Still show success since the update worked
        }
        
        Alert.alert('Success', 'Profile updated successfully!');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.';
      
      // Handle "No fields to update" gracefully - don't show as error
      if (errorMessage.toLowerCase().includes('no fields to update')) {
        // Silently succeed - nothing needed to be updated
        Alert.alert('Info', 'No changes were made to your profile.');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.subtitle}>Manage your profile</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.profilePictureButton}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Ionicons name="person" size={60} color={colors.primary} />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.profilePictureHint}>Tap to change picture</Text>
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={colors.textLight}
            value={username}
            onChangeText={setUsername}
          />
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionSubtitle}>Leave blank if you don't want to change your password</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  profilePictureContainer: {
    alignItems: 'center',
  },
  profilePictureButton: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
    backgroundColor: colors.lightGray,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  profilePictureHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});

