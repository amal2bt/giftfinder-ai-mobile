import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatAPI } from '../../utils/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface ChoiceOption {
  label: string;
  value: string;
}

interface Gift {
  id: number | string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
  stock?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  options?: ChoiceOption[];
  gifts?: Gift[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToBottomRef = useRef(false);

  useEffect(() => {
    loadHistory();
  }, []);

  // Scroll to bottom when messages are loaded initially
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottomRef.current) {
      // Use a longer timeout to ensure FlatList has fully rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasScrolledToBottomRef.current = true;
      }, 300);
    }
  }, [messages.length]);

  const loadHistory = async () => {
    try {
      const response = await chatAPI.getHistory();
      setMessages(response.data);
      // Reset the scroll flag when loading new history
      hasScrolledToBottomRef.current = false;
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    try {
      setClearing(true);
      await chatAPI.clearHistory();
      // Clear messages from state
      setMessages([]);
      // Reset scroll flag
      hasScrolledToBottomRef.current = false;
    } catch (error) {
      console.error('Error clearing chat history:', error);
    } finally {
      setClearing(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatAPI.sendMessage(userMessage);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        options: response.data.options || undefined, // Include options if present
        gifts: response.data.gifts || undefined, // Include gifts if present
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Scroll to bottom - use longer delay if gifts are present to ensure they render
      const scrollDelay = response.data.gifts && response.data.gifts.length > 0 ? 300 : 100;
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), scrollDelay);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check if it's a timeout or network error
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.message?.includes('timeout') || 
                       error.message?.includes('Network Error');
      
      if (isTimeout) {
        // Show helpful message for timeout
        const timeoutMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "⏳ The response is taking longer than usual. This might be because I'm generating a detailed surprise plan for you! Please wait a moment and refresh the chat to see my response, or try asking again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, timeoutMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        // Show generic error message
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "❌ Sorry, I encountered an error. Please try again or refresh the chat to see if your message was processed.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceSelect = async (optionValue: string) => {
    // Send the selected choice as a message
    const userMessage = optionValue;
    setLoading(true);

    // Add user message immediately
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatAPI.sendMessage(userMessage);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        options: response.data.options || undefined,
        gifts: response.data.gifts || undefined, // Include gifts if present
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Scroll to bottom - use longer delay if gifts are present to ensure they render
      const scrollDelay = response.data.gifts && response.data.gifts.length > 0 ? 300 : 100;
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), scrollDelay);
    } catch (error: any) {
      console.error('Error sending choice message:', error);
      
      // Check if it's a timeout or network error
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.message?.includes('timeout') || 
                       error.message?.includes('Network Error');
      
      if (isTimeout) {
        // Show helpful message for timeout
        const timeoutMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "⏳ The response is taking longer than usual. This might be because I'm generating a detailed surprise plan for you! Please wait a moment and refresh the chat to see my response, or try asking again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, timeoutMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        // Show generic error message
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "❌ Sorry, I encountered an error. Please try again or refresh the chat to see if your message was processed.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to render gift image
  const renderGiftImage = (image: string | null | undefined) => {
    if (!image) {
      return (
        <View style={styles.giftImagePlaceholder}>
          <Ionicons name="gift" size={24} color={colors.pink} />
        </View>
      );
    }
    
    // Check if it's a URL (http/https)
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return (
        <Image
          source={{ uri: image }}
          style={styles.giftImage}
          resizeMode="cover"
        />
      );
    }
    
    // Check if it's a base64 string
    if (image.startsWith('data:') || image.length > 100) {
      const uri = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
      return (
        <Image
          source={{ uri }}
          style={styles.giftImage}
          resizeMode="cover"
        />
      );
    }
    
    // Check if it's an emoji
    if (image.length <= 10 && !image.includes('/')) {
      return (
        <View style={styles.giftImagePlaceholder}>
          <Text style={styles.giftEmoji}>{image}</Text>
        </View>
      );
    }
    
    // Default placeholder
    return (
      <View style={styles.giftImagePlaceholder}>
        <Ionicons name="gift" size={24} color={colors.pink} />
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View>
      <View
        style={[
          styles.messageContainer,
          item.role === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.role === 'user' ? colors.white : colors.text },
          ]}
        >
          {item.content}
        </Text>
      </View>
      
      {/* Render gift suggestions with images */}
      {item.role === 'assistant' && item.gifts && item.gifts.length > 0 && (
        <View style={styles.giftsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.giftsScrollContent}
          >
            {item.gifts.map((gift, index) => (
              <View key={gift.id || index} style={styles.giftCard}>
                {renderGiftImage(gift.image)}
                <View style={styles.giftInfo}>
                  <Text style={styles.giftName} numberOfLines={2}>
                    {gift.name}
                  </Text>
                  <Text style={styles.giftCategory} numberOfLines={1}>
                    {gift.category}
                  </Text>
                  <Text style={styles.giftPrice}>
                    ${typeof gift.price === 'number' ? gift.price.toFixed(2) : gift.price}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Render choice buttons if options are present */}
      {item.role === 'assistant' && item.options && item.options.length > 0 && (
        <View style={styles.optionsContainer}>
          {item.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.choiceButton}
              onPress={() => handleChoiceSelect(option.value || option.label)}
            >
              <Text style={styles.choiceButtonText}>{option.label || option.value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.botAvatar}>
          <Ionicons name="chatbubbles" size={24} color={colors.white} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>GiftBot</Text>
          <Text style={styles.headerSubtitle}>Your personal gift assistant</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={clearChatHistory}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="refresh" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Scroll to bottom when content size changes (after initial load)
          if (messages.length > 0 && !hasScrolledToBottomRef.current) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
              hasScrolledToBottomRef.current = true;
            }, 100);
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="gift" size={80} color={colors.lavender} />
            <Text style={styles.emptyText}>Start chatting with GiftBot!</Text>
            <Text style={styles.emptySubtext}>
              Ask for gift recommendations, ideas, or anything else
            </Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask GiftBot anything..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    justifyContent: 'space-between',
  },
  botAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  messagesList: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  messageContainer: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray,
  },
  optionsContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    marginLeft: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  choiceButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  giftsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.md,
  },
  giftsScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.md,
  },
  giftCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  giftImage: {
    width: '100%',
    height: 100,
    backgroundColor: colors.lavender,
  },
  giftImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  giftInfo: {
    padding: spacing.sm,
  },
  giftName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  giftCategory: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  giftPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});