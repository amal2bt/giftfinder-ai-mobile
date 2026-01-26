import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';
import { feedbackAPI } from '../utils/api';

export default function Feedback() {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Invalid Rating', 'Please provide a rating between 1 and 5.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Empty Comment', 'Please write a comment.');
      return;
    }

    setLoading(true);
    try {
      await feedbackAPI.submitFeedback({
        rating,
        comment,
        user_name: user?.full_name,
      });
      Alert.alert('Thank You', 'Your feedback has been submitted.');
      setRating(0);
      setComment('');
    } catch (err: any) {
      console.error('Feedback submission error:', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to submit feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={colors.primary}
            style={{ marginHorizontal: spacing.xs }}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Give Your Feedback</Text>

        <Text style={styles.label}>Rating</Text>
        {renderStars()}

        <Text style={styles.label}>Comment</Text>
        <TextInput
          style={styles.input}
          placeholder="Write your feedback..."
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Feedback'}</Text>
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
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    marginBottom: spacing.lg,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
