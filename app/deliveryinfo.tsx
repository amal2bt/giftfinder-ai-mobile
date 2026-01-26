import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { userDeliveryAPI } from '../utils/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface DeliveryOrder {
  id: number;
  total_amount: number;
  needs_delivery: boolean;
  delivery_status: 'assigned' | 'in_transit' | 'delivered' | 'failed';
  client_feedback?: string;
  assigned_at: string;
}

export default function DeliveryInfo() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userDeliveryAPI.getMyDeliveries();
      const deliveryOrders: DeliveryOrder[] =
        (response.data?.assignments || [])
          .filter((a: any) => a.order?.needs_delivery)
          .map((a: any) => ({
            id: a.order.id,
            total_amount: a.order.total_amount,
            needs_delivery: a.order.needs_delivery,
            delivery_status: a.delivery_status,
            client_feedback: a.client_feedback,
            assigned_at: a.assigned_at,
          }));
      setOrders(deliveryOrders);
    } catch (error: any) {
      console.error('Error loading delivery orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
  }, [loadOrders]);

  const getStatusColor = (status: DeliveryOrder['delivery_status']) => {
    switch (status) {
      case 'assigned':
        return colors.primary;
      case 'in_transit':
        return colors.warning || '#FFA500';
      case 'delivered':
        return colors.success || '#10B981';
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: DeliveryOrder['delivery_status']) => {
    switch (status) {
      case 'assigned':
        return 'time-outline';
      case 'in_transit':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-circle-outline';
      case 'failed':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md }}
      >
        <Text style={styles.title}>My Delivery Orders</Text>

        {loading && <ActivityIndicator size="large" color={colors.primary} />}
        {!loading && orders.length === 0 && (
          <Text style={styles.emptyText}>No delivery orders found.</Text>
        )}

        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            {/* Header: Order ID + Status */}
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.delivery_status) + '20' },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(order.delivery_status) as any}
                  size={16}
                  color={getStatusColor(order.delivery_status)}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(order.delivery_status) }]}
                >
                  {order.delivery_status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.amount}>Total: ${order.total_amount.toFixed(2)}</Text>

            {/* Client Feedback */}
            <View style={styles.feedbackContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <Text style={styles.feedbackText} numberOfLines={2} ellipsizeMode="tail">
                {order.client_feedback || 'No feedback yet'}
              </Text>
            </View>

            <Text style={styles.assignedAt}>
              Assigned: {format(parseISO(order.assigned_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderId: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  feedbackText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
    fontStyle: 'italic',
  },
  assignedAt: { fontSize: fontSize.sm, color: colors.textSecondary },
});
