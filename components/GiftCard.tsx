import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../utils/colors';

interface Gift {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image?: string | null; // Can be URL, emoji, or base64
  image_base64?: string; // Legacy support
  tags?: string[];
}

interface GiftCardProps {
  gift: Gift;
  onPress: () => void;
  onLike?: () => void;
  onAddToCart?: () => void;
  isLiked?: boolean;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 3) / 2;

export const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  onPress,
  onLike,
  onAddToCart,
  isLiked = false,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {(() => {
          const imageSource = gift.image || gift.image_base64;
          
          // Check if it's a URL (http/https)
          if (imageSource && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
            return (
              <Image
                source={{ uri: imageSource }}
                style={styles.image}
                resizeMode="cover"
              />
            );
          }
          
          // Check if it's a base64 string (starts with data: or is long base64-like)
          if (imageSource && (imageSource.startsWith('data:') || imageSource.length > 100)) {
            const uri = imageSource.startsWith('data:') 
              ? imageSource 
              : `data:image/jpeg;base64,${imageSource}`;
            return (
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="cover"
              />
            );
          }
          
          // Check if it's an emoji (single character or short string)
          if (imageSource && imageSource.length <= 10 && !imageSource.includes('/')) {
            return (
              <View style={[styles.image, styles.placeholderImage]}>
                <Text style={styles.emoji}>{imageSource}</Text>
              </View>
            );
          }
          
          // Default placeholder
          return (
            <View style={[styles.image, styles.placeholderImage]}>
              <Ionicons name="gift" size={40} color={colors.pink} />
            </View>
          );
        })()}
        {/* Like button */}
        {onLike && (
          <TouchableOpacity style={styles.likeButton} onPress={onLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? colors.error : colors.white}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {gift.title}
        </Text>
        <Text style={styles.category}>{gift.category}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>${gift.price.toFixed(2)}</Text>
          {onAddToCart && (
            <TouchableOpacity onPress={onAddToCart} style={styles.cartButton}>
              <Ionicons name="cart" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: cardWidth * 1.2,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  placeholderImage: {
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    textAlign: 'center',
  },
  likeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.round,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  cartButton: {
    backgroundColor: colors.pink,
    borderRadius: borderRadius.round,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});