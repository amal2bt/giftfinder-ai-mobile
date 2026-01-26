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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing, fontSize, fontWeight } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Verify() {
  const params = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verify } = useAuth();
  const router = useRouter();

  const email = typeof params.email === 'string' ? params.email : '';
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const handleVerify = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      await verify(userId, code);
      Alert.alert('Success', 'Email verified! You can now sign in.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
          <Ionicons name="mail" size={80} color={colors.primary} />
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}{email}
          </Text>
          
        </View>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            value={code}
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            maxLength={6}
          />

          <Button
            title="Verify Email"
            onPress={handleVerify}
            loading={loading}
            fullWidth
          />
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
  hint: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  form: {
    marginBottom: spacing.xl,
  },
});