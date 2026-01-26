import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { cartAPI } from '../utils/api';

export default function PaymentProcessing() {
  const router = useRouter();
  const { order_id } = useLocalSearchParams<{ order_id?: string }>();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!order_id) return;

    let interval: ReturnType<typeof setInterval>;
    const maxPollingTime = 120000;
    const startTime = Date.now();

    const fetchStatus = async () => {
      try {
        const res = await cartAPI.getOrder(order_id);
        const paymentStatus = res.data?.payment_status;
        const orderStatus = res.data?.status;

        if (paymentStatus === 'paid' || orderStatus === 'completed') {
          setStatus('success');
          setOrder(res.data);

          // Backend returns 'items' (not 'order_items') and 'total_amount' (not 'total')
          const orderItems = res.data.items || res.data.order_items || [];
          const fetchedItems = orderItems.map((item: any) => ({
            name: item.gifts?.name || 'Gift',
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
            subtotal: Number(item.subtotal) || (Number(item.quantity) || 0) * (Number(item.price) || 0),
          }));
          setItems(fetchedItems);

          clearInterval(interval);
        } else if (paymentStatus === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        } else {
          const elapsed = Date.now() - startTime;
          if (elapsed >= maxPollingTime) {
            setStatus('failed');
            clearInterval(interval);
          } else {
            setStatus('pending');
          }
        }
      } catch (err) {
        console.error('Error checking order:', err);
        setStatus('failed');
        clearInterval(interval);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [order_id]);

  const goToOrders = () => router.push('/purchase-history');
  const goBackToCart = () => router.push('/cart');

  // Backend returns 'total_amount' (not 'total'), use it as primary source
  const totalAmount = order?.total_amount !== undefined && order?.total_amount !== null
    ? Number(order.total_amount)
    : order?.total !== undefined && order?.total !== null
    ? Number(order.total)
    : items.reduce((sum, i) => sum + (i.subtotal || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>Checking your payment status...</Text>
          </>
        )}

        {!loading && status === 'success' && order && (
          <>
            <Text style={styles.success}>🎉 Payment Successful!</Text>

            <View style={styles.orderInfo}>
              <Text style={styles.infoText}>Order ID: {order.id}</Text>
              <Text style={styles.infoText}>Order Date: {new Date(order.created_at).toLocaleString()}</Text>
              <Text style={styles.infoText}>Payment Status: {order.payment_status}</Text>
              <Text style={styles.infoText}>Shipping Address: {order.shipping_address || 'N/A'}</Text>
            </View>

            {/* Simple list */}
           <View style={styles.list}>
  {items.map((item, index) => (
    <View key={index} style={styles.listItem}>
      <Text style={styles.itemText}>🎁 {item.name}</Text>
      <Text style={styles.itemText}>Quantity: {item.quantity}</Text>
      <Text style={styles.itemText}>Price: ${item.price.toFixed(2)}</Text>
    </View>
  ))}
</View>


            <Text style={styles.total}>Total: ${totalAmount.toFixed(2)}</Text>

            <TouchableOpacity style={styles.button} onPress={goToOrders}>
              <Text style={styles.buttonText}>View Orders</Text>
            </TouchableOpacity>
          </>
        )}

        {!loading && status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>⏳ Payment is still processing...</Text>
            <TouchableOpacity style={styles.button} onPress={goBackToCart}>
              <Text style={styles.buttonText}>Back to Cart</Text>
            </TouchableOpacity>
          </>
        )}

        {!loading && status === 'failed' && (
          <>
            <Text style={styles.failed}>❌ Payment Failed or Timed Out</Text>
            <TouchableOpacity style={styles.button} onPress={goBackToCart}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },

  message: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.text, textAlign: 'center' },
  success: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' },
  failed: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.error, marginBottom: spacing.lg, textAlign: 'center' },

  button: { backgroundColor: colors.pink, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.round, marginTop: spacing.md },
  buttonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },

  orderInfo: { marginBottom: spacing.md, width: '100%', padding: spacing.md, borderWidth: 1, borderColor: colors.gray, borderRadius: borderRadius.md, backgroundColor: colors.white },
  infoText: { marginBottom: spacing.sm, fontSize: fontSize.md },

  list: { width: '100%', marginBottom: spacing.md },
  listItem: { padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.gray, borderRadius: borderRadius.md, backgroundColor: colors.white },
  itemText: { fontSize: fontSize.md, marginBottom: spacing.xs },

  total: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.md },
});
