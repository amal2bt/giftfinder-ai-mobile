import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { communityAPI } from '../utils/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  users?: {
    username: string;
    email: string;
  };
}

interface Post {
  id: string;
  user_id: string;
  description: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  users?: {
    username: string;
    email: string;
  };
  comments?: Comment[];
}

export default function PostDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    if (!id) return;
    
    setRefreshing(true);
    try {
      const response = await communityAPI.getPost(id);
      setPost(response.data);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    
    try {
      const response = await communityAPI.likeIdea(post.id);
      setPost({
        ...post,
        likes_count: response.data.liked
          ? post.likes_count + 1
          : Math.max(0, post.likes_count - 1),
      });
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleAddComment = async () => {
    if (!post || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const response = await communityAPI.addComment(post.id, commentText.trim());
      setCommentText('');
      // Reload post to get updated comments
      await loadPost();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const parsePostContent = (description: string) => {
    const parts = description.split('\n\n');
    if (parts.length > 1) {
      return { title: parts[0], description: parts.slice(1).join('\n\n') };
    }
    return { title: description, description: '' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { title, description } = parsePostContent(post.description);
  const username = post.users?.username || 'Anonymous';
  const date = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadPost}
              tintColor={colors.primary}
            />
          }
        >
          {/* Post Content */}
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.username}>{username}</Text>
                  <Text style={styles.postDate}>{date}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.postTitle}>{title}</Text>
            {description && (
              <Text style={styles.postDescription}>{description}</Text>
            )}

            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons name="heart" size={20} color={colors.primary} />
                <Text style={styles.actionText}>{post.likes_count || 0}</Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <Ionicons name="chatbubble" size={20} color={colors.textSecondary} />
                <Text style={styles.actionText}>{post.comments_count || 0}</Text>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments ({post.comments?.length || 0})
            </Text>

            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => {
                const commentUsername = comment.users?.username || 'Anonymous';
                const commentDate = new Date(comment.created_at).toLocaleDateString();
                return (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {commentUsername.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.commentInfo}>
                        <Text style={styles.commentUsername}>{commentUsername}</Text>
                        <Text style={styles.commentDate}>{commentDate}</Text>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textLight} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textLight}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={submitting || !commentText.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  username: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  postDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  postDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  commentsSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  commentsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  commentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  commentInfo: {
    flex: 1,
  },
  commentUsername: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  commentText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  emptyCommentsText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyCommentsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

