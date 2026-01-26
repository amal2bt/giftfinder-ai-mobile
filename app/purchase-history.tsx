import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, giftsAPI } from '../utils/api';

interface OrderItem {
  gift_id: number;
  quantity: number;
  price: number;
  gift?: {
    name: string;
    image: string | null;
  };
}

interface Order {
  id: number;
  total?: number;
  total_amount?: number;
  created_at: string;
  items: OrderItem[];
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
}

export default function PurchaseHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [gifts, setGifts] = useState<Record<number, { name: string; image: string | null }>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;
      if (!user?.id) throw new Error('User not logged in');

      // Fetch all gifts for mapping
      const giftsRes = await giftsAPI.getAll();
      const giftsMap: Record<number, { name: string; image: string | null }> = {};
      (giftsRes.data.gifts || []).forEach((g: any) => {
        giftsMap[Number(g.id)] = { name: g.name, image: g.image || null };
      });
      setGifts(giftsMap);

      // Fetch orders
      const res = await api.get('/orders');
      const raw = res.data;
      const ordersData: Order[] = Array.isArray(raw) ? raw : (raw.orders || []);

      // Enrich items with gift info
      const enrichedOrders = ordersData.map((order) => ({
        ...order,
        total: order.total ?? order.total_amount ?? 0,
        items: order.items.map((item) => ({
          ...item,
          gift: giftsMap[item.gift_id] || { name: 'Unknown Gift', image: null },
        })),
      }));

      setOrders(enrichedOrders);
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const renderImage = (image: string | null) => {
    if (!image) {
      return (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="gift" size={30} color={colors.pink} />
        </View>
      );
    }
    if (image.startsWith('http')) {
      return <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />;
    }
    if (image.length <= 10 && !image.includes('/')) {
      return (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.emoji}>{image}</Text>
        </View>
      );
    }
    return (
      <View style={styles.imagePlaceholder}>
        <Ionicons name="gift" size={30} color={colors.pink} />
      </View>
    );
  };

  const getPaymentStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return colors.green;
      case 'pending':
        return colors.orange;
      case 'failed':
        return colors.red;
      case 'refunded':
        return colors.purple;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Purchase History</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {orders.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.empty}>You have no past purchases.</Text>
          </View>
        )}

        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleString()}</Text>
            
            {/* Payment status badge */}
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(order.payment_status) }]}>
              <Text style={styles.paymentBadgeText}>
                {order.payment_status?.toUpperCase() || 'PENDING'}
              </Text>
            </View>

            {order.items.map((item, idx) => (
              <View key={`${order.id}-${item.gift_id}-${idx}`} style={styles.cartItem}>
                {renderImage(item.gift?.image || null)}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{item.gift?.name || 'Unknown Gift'}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.orderTotal}>
              Total: ${(order.total ?? order.total_amount ?? 0).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  content: { padding: spacing.lg },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2 },
  empty: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderDate: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  paymentBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  paymentBadgeText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  orderTotal: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, marginTop: spacing.sm },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  image: { width: 80, height: 80, borderRadius: borderRadius.md },
  imagePlaceholder: { width: 80, height: 80, borderRadius: borderRadius.md, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 40 },
  itemDetails: { flex: 1, marginLeft: spacing.md },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  itemPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.xs },
  quantityText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
