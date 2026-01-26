import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../utils/colors';
import { communityAPI } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

interface Idea {
  id: number;
  description: string;
  image?: string;
  likes_count: number;
  comments_count?: number;
  user?: User;
}

interface Comment {
  id: number;
  comment: string;
  users?: User;
}

export default function Community() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editIdeaText, setEditIdeaText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const commentsFlatListRef = useRef<FlatList>(null);

  // Load current user from AsyncStorage
  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Fetch ideas whenever the user or filter changes
  useEffect(() => {
    if (userId !== null) fetchIdeas();
  }, [userId, showMine]);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const res = await communityAPI.getIdeas({ mine: showMine });
      const data = res.data;

      // Normalize API response and map profile pictures to avatar
      const normalized = data.map((idea: any) => {
        const apiUser = idea.users;
        const normalizedUser: User = apiUser
          ? {
              id: apiUser.id,
              username: apiUser.username,
              email: apiUser.email,
              avatar: apiUser.profile_picture_url || undefined,
            }
          : {
              id: 'unknown',
              username: 'Unknown',
            };

        return {
          ...idea,
          user: normalizedUser,
        };
      });

      setIdeas(normalized);
    } catch (err) {
      console.error('Error fetching ideas:', err);
      Alert.alert('Error', 'Failed to fetch ideas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIdea = async () => {
    if (!newIdea.trim()) return;

    const payload = { description: newIdea };

    try {
      const res = await communityAPI.createIdea(payload);
      const ideaData = (res.data as any).idea || res.data;

      const apiUser = ideaData.users;
      const normalizedUser: User = apiUser
        ? {
            id: apiUser.id,
            username: apiUser.username,
            email: apiUser.email,
            avatar: apiUser.profile_picture_url || undefined,
          }
        : {
            id: userId || 'unknown',
            username: 'Me',
          };

      const newIdeaObj = {
        ...ideaData,
        user: normalizedUser,
      };

      // Prepend new idea to list
      setIdeas(prev => [newIdeaObj, ...prev]);
      setNewIdea('');
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err) {
      console.error('Error adding idea:', err);
      Alert.alert('Error', 'Failed to add idea.');
    }
  };

  const handleUpdateIdea = async () => {
    if (!editingIdea || !editIdeaText.trim()) return;

    const payload = { description: editIdeaText };

    try {
      const res = await communityAPI.updateIdea(editingIdea.id.toString(), payload);
      const ideaData = (res.data as any).idea || res.data;

      const apiUser = ideaData.users;
      const normalizedUser: User = apiUser
        ? {
            id: apiUser.id,
            username: apiUser.username,
            email: apiUser.email,
            avatar: apiUser.profile_picture_url || undefined,
          }
        : {
            id: userId || 'unknown',
            username: 'Me',
          };

      const updatedIdeaObj = {
        ...ideaData,
        user: normalizedUser,
      };

      // Replace the existing idea in the list instead of prepending
      setIdeas(prev => prev.map(idea => idea.id === editingIdea.id ? updatedIdeaObj : idea));

      setEditModalVisible(false);
      setEditingIdea(null);
      setEditIdeaText('');
    } catch (err) {
      console.error('Error updating idea:', err);
      Alert.alert('Error', 'Failed to update idea.');
    }
  };

  const handleEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setEditIdeaText(idea.description);
    setEditModalVisible(true);
  };

  const handleDelete = (idea: Idea) => {
    Alert.alert('Delete Idea', 'Are you sure you want to delete this idea?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await communityAPI.deleteIdea(idea.id.toString());
            setIdeas(prev => prev.filter(i => i.id !== idea.id));
          } catch (err) {
            console.error('Error deleting idea:', err);
            Alert.alert('Error', 'Failed to delete idea.');
          }
        },
      },
    ]);
  };

  const handleLike = async (idea: Idea) => {
    try {
      const res = await communityAPI.likeIdea(idea.id.toString());
      setIdeas(prev =>
        prev.map(i => (i.id === idea.id ? { ...i, likes_count: res.data.likes_count } : i))
      );
    } catch (err) {
      console.error('Error liking idea:', err);
    }
  };

  const openComments = async (idea: Idea) => {
    setSelectedIdea(idea);
    setModalVisible(true);
    try {
      const res = await communityAPI.getComments(idea.id.toString());
      setComments(res.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const addComment = async () => {
    if (!commentInput.trim() || !selectedIdea) return;
    try {
      const res = await communityAPI.addComment(selectedIdea.id.toString(), commentInput);
      setComments([res.data.comment, ...comments]);
      setCommentInput('');
      commentsFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const renderIdea = ({ item }: { item: Idea }) => (
    <View style={styles.card}>
      <View style={styles.userRow}>
        <Image
          source={{ uri: item.user?.avatar || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.username}>{item.user?.username || 'Unknown'}</Text>
      </View>

      {item.image && <Image source={{ uri: item.image }} style={styles.ideaImage} />}
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
          <Ionicons
            name="heart"
            size={22}
            color={item.likes_count > 0 ? colors.primary : colors.textLight}
          />
          <Text style={styles.actionText}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.textLight} />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        {/* Show edit/delete only for user's ideas if showMine is true */}
        {item.user?.id === userId && showMine && (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={22} color="red" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Share your idea..."
            value={newIdea}
            onChangeText={setNewIdea}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleAddIdea}>
            <Ionicons name="send" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Filter */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity
          onPress={() => setShowMine(false)}
          style={{
            padding: 8,
            backgroundColor: showMine ? colors.lightGray : colors.primary,
            borderRadius: 8,
            marginHorizontal: 5,
          }}
        >
          <Text style={{ color: showMine ? colors.text : colors.white }}>All Ideas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowMine(true)}
          style={{
            padding: 8,
            backgroundColor: showMine ? colors.primary : colors.lightGray,
            borderRadius: 8,
            marginHorizontal: 5,
          }}
        >
          <Text style={{ color: showMine ? colors.white : colors.text }}>My Ideas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={ideas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderIdea}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        />
      )}

      {/* Edit Idea Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Idea</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                setEditingIdea(null);
                setEditIdeaText('');
              }}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editInput}
              placeholder="Edit your idea..."
              value={editIdeaText}
              onChangeText={setEditIdeaText}
              multiline
              numberOfLines={4}
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[styles.editBtn, styles.cancelBtn]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingIdea(null);
                  setEditIdeaText('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editBtn, styles.saveBtn]}
                onPress={handleUpdateIdea}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={commentsFlatListRef}
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.commentCard}>
                <Text style={styles.commentUser}>{item.users?.username || 'Unknown'}</Text>
                <Text style={styles.commentText}>{item.comment}</Text>
              </View>
            )}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentInput}
                onChangeText={setCommentInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
                <Ionicons name="send" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    height: 45,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm, backgroundColor: colors.lightGray },
  username: { fontWeight: fontWeight.bold, fontSize: fontSize.md },
  ideaImage: { width: '100%', height: 250, borderRadius: borderRadius.md, marginVertical: spacing.sm },
  description: { fontSize: fontSize.md, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', marginTop: spacing.sm, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginTop: 4 },
  actionText: { marginLeft: 6, fontWeight: fontWeight.bold, color: colors.textLight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  modalTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
  commentCard: { backgroundColor: colors.white, padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  commentUser: { fontWeight: fontWeight.bold, marginBottom: 2 },
  commentText: {},
  commentInputContainer: { flexDirection: 'row', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.lightGray, backgroundColor: colors.white },
  commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 45 },
  editModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  editModalContent: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, width: '90%', maxWidth: 500 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  editModalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  editInput: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.md },
  editModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  editBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  cancelBtn: { backgroundColor: colors.lightGray },
  cancelBtnText: { color: colors.text },
  saveBtn: { backgroundColor: colors.primary },
  saveBtnText: { color: colors.white, fontWeight: fontWeight.bold },
});
