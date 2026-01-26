import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../utils/api';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing, fontSize, fontWeight } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await authAPI.requestReset({ email });
      Alert.alert(
        'Success',
        'Reset code sent!'
      );
      setStep('reset');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, code, newPassword });
      Alert.alert('Success', 'Password reset successful!', [
        { text: 'OK', onPress: () => router.replace('/auth/signin') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="key" size={80} color={colors.primary} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'request'
              ? 'Enter your email to receive a reset code'
              : 'Enter the code and your new password'}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'request' ? (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Button
                title="Send Reset Code"
                onPress={handleRequestReset}
                loading={loading}
                fullWidth
              />
            </>
          ) : (
            <>
              <Input
                label="Reset Code"
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
              />

              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />

              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                fullWidth
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
});