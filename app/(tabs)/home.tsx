import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { giftsAPI, wishlistAPI, cartAPI, notificationsAPI } from '../../utils/api';
import { GiftCard } from '../../components/GiftCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface Gift {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  occasion: string;
  image?: string | null;
  image_base64?: string;
  tags: string[];
}

interface BackendGift {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  created_at?: string;
  updated_at?: string;
}

const transformGift = (backendGift: BackendGift): Gift => ({
  id: String(backendGift.id),
  title: backendGift.name,
  description: `A perfect ${backendGift.category} gift for any occasion`,
  price: Number(backendGift.price),
  category: backendGift.category,
  occasion: 'Any Occasion',
  image: backendGift.image || undefined,
  tags: [backendGift.category],
});

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [giftsRes, wishlistRes, cartRes, notificationsRes] = await Promise.all([
        giftsAPI.getAll(),
        wishlistAPI.get().catch(() => ({ data: [] })),
        cartAPI.get().catch(() => ({ data: [] })),
        notificationsAPI.getUnreadCount().catch(() => ({ data: { count: 0 } })),
      ]);

      const backendGifts: BackendGift[] = giftsRes.data?.gifts || [];
      const transformedGifts = backendGifts.map(transformGift);
      setGifts(transformedGifts);

      if (wishlistRes.data && Array.isArray(wishlistRes.data)) {
        setWishlist(wishlistRes.data.map((item: any) => String(item.gift_id || item.id)));
      }

      if (cartRes.data && Array.isArray(cartRes.data)) {
        const totalItems = cartRes.data.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(totalItems);
      }

      if (notificationsRes.data) {
        setUnreadCount(notificationsRes.data.count || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLike = async (giftId: string) => {
    try {
      if (wishlist.includes(giftId)) {
        await wishlistAPI.remove(giftId);
        setWishlist(wishlist.filter(id => id !== giftId));
      } else {
        await wishlistAPI.add(giftId);
        setWishlist([...wishlist, giftId]);
      }
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      alert(error?.response?.data?.message || 'Failed to update wishlist');
    }
  };

  const handleAddToCart = async (giftId: string) => {
    try {
      const response = await cartAPI.add(giftId);
      const cartRes = await cartAPI.get().catch(() => ({ data: [] }));
      if (cartRes.data && Array.isArray(cartRes.data)) {
        const totalItems = cartRes.data.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(totalItems);
      }
      alert(response.data?.message || 'Added to cart!');
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      alert(error?.response?.data?.message || 'Failed to add to cart');
    }
  };

  // 🔍 Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 🔍 Filter gifts by debounced search + category
  const filteredGifts = useMemo(() => {
    let data = gifts;

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      data = data.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "All") {
      data = data.filter(g => g.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    return data;
  }, [debouncedQuery, selectedCategory, gifts]);

  const renderGift = ({ item }: { item: Gift }) => (
    <GiftCard
      gift={item}
      onPress={() => {}}
      onLike={() => handleLike(item.id)}
      onAddToCart={() => handleAddToCart(item.id)}
      isLiked={wishlist.includes(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name || 'there'}! 👋</Text>
          <Text style={styles.subtitle}>Find the perfect gift today</Text>
        </View>

        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          placeholder="Search gifts… (e.g. toys, makeup, hoodie)"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["All", "Accessories", "Toys", "Clothing", "Perfumes", "Makeup"].map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* All Gifts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Gifts 🎁</Text>
          <FlatList
            data={filteredGifts}
            renderItem={renderGift}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },

  greeting: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  notificationButton: {
    position: 'relative',
    backgroundColor: colors.pink,
    borderRadius: borderRadius.round,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#f1f1f1',
    borderRadius: borderRadius.md,
  },
  searchInput: { marginLeft: spacing.sm, flex: 1, fontSize: fontSize.md, color: colors.text },

  categoriesContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  categoryChip: { backgroundColor: colors.lavender, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.round, marginRight: spacing.sm },
  categoryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryTextActive: { color: colors.white, fontWeight: fontWeight.bold },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  row: { justifyContent: 'space-between' },
});
