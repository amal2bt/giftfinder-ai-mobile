import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { giftsAPI, cartAPI } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

interface CartItem {
  gift_id: string;
  quantity: number;
  stock?: number;
}

interface Gift {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string | null;
}

export default function Cart() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [gifts, setGifts] = useState<Record<string, Gift>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState<boolean | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [houseName, setHouseName] = useState('');
  const [floor, setFloor] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cartRes, giftsRes] = await Promise.all([
        cartAPI.get().catch(() => ({ data: [] })),
        giftsAPI.getAll(),
      ]);

      const cartItems: CartItem[] = Array.isArray(cartRes.data)
        ? cartRes.data.map((c: any) => ({
            gift_id: String(c.gift_id || c.id),
            quantity: Number(c.quantity || 1),
            stock: c.stock !== undefined ? Number(c.stock) : undefined,
          }))
        : [];
      setItems(cartItems);

      const backendGifts: Gift[] = giftsRes.data?.gifts || [];
      const map: Record<string, Gift> = {};
      backendGifts.forEach((g) => (map[String(g.id)] = { ...g, id: String(g.id) }));
      setGifts(map);
    } catch (e) {
      console.error('Failed to load cart:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateQuantity = async (giftId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const cartItem = items.find(i => i.gift_id === giftId);
    const gift = gifts[giftId];
    const maxStock = cartItem?.stock !== undefined ? cartItem.stock : (gift?.stock || 0);
    if (newQuantity > maxStock) {
      Alert.alert('Error', `Only ${maxStock} available in stock`);
      return;
    }
    try {
      await cartAPI.updateQuantity(giftId, newQuantity);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleRemove = async (giftId: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await cartAPI.remove(giftId);
            setItems((prev) => prev.filter((i) => i.gift_id !== giftId));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to remove from cart');
          }
        },
      },
    ]);
  };

  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + (gifts[i.gift_id]?.price || 0) * i.quantity, 0);
  }, [items, gifts]);

const handleCheckout = async () => {
  if (isCheckingOut) return;
  // Show delivery modal first
  setShowDeliveryModal(true);
};

const handleDeliveryChoice = (choice: boolean) => {
  setNeedsDelivery(choice);
  if (!choice) {
    // User doesn't want delivery, proceed with checkout
    proceedWithCheckout();
  }
  // If choice is true, keep modal open to collect delivery info
};

const proceedWithCheckout = async () => {
  if (isCheckingOut) return;
  
  // Validate delivery fields if delivery is needed
  if (needsDelivery === true) {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter your delivery address');
      return;
    }
    if (!deliveryPhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
  }

  setIsCheckingOut(true);
  setShowDeliveryModal(false);
  
  try {
    const checkoutData: any = {};
    
    if (needsDelivery === true) {
      checkoutData.needs_delivery = true;
      checkoutData.delivery_address = deliveryAddress.trim();
      checkoutData.delivery_phone = deliveryPhone.trim();
      checkoutData.house_name = houseName.trim() || null;
      checkoutData.floor = floor.trim() || null;
    } else {
      checkoutData.needs_delivery = false;
    }
    
    const orderRes = await cartAPI.checkout(checkoutData);
    const orderId = orderRes.data?.order_id;
    if (!orderId) throw new Error('No order ID returned');
    
    // Reset delivery form
    setNeedsDelivery(null);
    setDeliveryAddress('');
    setDeliveryPhone('');
    setHouseName('');
    setFloor('');
    
    router.push({
      pathname: '/payment-processing',
      params: { order_id: orderId },
    });
  } catch (e: any) {
    console.error('Checkout error:', e);
    Alert.alert('Payment Failed', e?.response?.data?.message || 'Unable to complete payment');
  } finally {
    setIsCheckingOut(false);
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
    if (image.startsWith('http://') || image.startsWith('https://')) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Cart</Text>
          <Text style={styles.subtitle}>Items ready to checkout</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {items.map((item) => {
          const gift = gifts[item.gift_id];
          if (!gift) return null;
          const maxStock = item.stock !== undefined ? item.stock : gift.stock;
          return (
            <View key={item.gift_id} style={styles.cartItem}>
              {renderImage(gift.image)}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{gift.name}</Text>
                <Text style={styles.itemCategory}>{gift.category}</Text>
                <Text style={styles.itemPrice}>${gift.price.toFixed(2)}</Text>
                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantity:</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                      onPress={() => handleUpdateQuantity(item.gift_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={item.quantity <= 1 ? colors.textSecondary : colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, item.quantity >= maxStock && styles.quantityButtonDisabled]}
                      onPress={() => handleUpdateQuantity(item.gift_id, item.quantity + 1)}
                      disabled={item.quantity >= maxStock}
                    >
                      <Ionicons name="add" size={20} color={item.quantity >= maxStock ? colors.textSecondary : colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.stockText}>Max: {maxStock}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.gift_id)} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}
        {items.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.empty}>Your cart is empty.</Text>
          </View>
        )}
      </ScrollView>
      {items.length > 0 && (
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutButton, isCheckingOut && { opacity: 0.5 }]}
            onPress={handleCheckout}
            disabled={isCheckingOut}
          >
            <Text style={styles.checkoutText}>{isCheckingOut ? 'Processing...' : 'Checkout'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delivery Modal */}
      <Modal
        visible={showDeliveryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (needsDelivery === null) {
            setShowDeliveryModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {needsDelivery === null ? (
              // Ask if they want delivery
              <>
                <Text style={styles.modalTitle}>Delivery Option</Text>
                <Text style={styles.modalSubtitle}>Do you need delivery for this order?</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.yesButton]}
                    onPress={() => handleDeliveryChoice(true)}
                  >
                    <Text style={styles.modalButtonText}>Yes, I need delivery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.noButton]}
                    onPress={() => handleDeliveryChoice(false)}
                  >
                    <Text style={styles.modalButtonText}>No, pickup only</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : needsDelivery === true ? (
              // Collect delivery information
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Delivery Information</Text>
                <Text style={styles.modalSubtitle}>Please provide your delivery details</Text>
                
                <Text style={styles.inputLabel}>Delivery Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full address"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  multiline
                  numberOfLines={3}
                />
                
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={deliveryPhone}
                  onChangeText={setDeliveryPhone}
                  keyboardType="phone-pad"
                />
                
                <Text style={styles.inputLabel}>House Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter house/building name"
                  value={houseName}
                  onChangeText={setHouseName}
                />
                
                <Text style={styles.inputLabel}>Floor (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter floor number"
                  value={floor}
                  onChangeText={setFloor}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowDeliveryModal(false);
                      setNeedsDelivery(null);
                      setDeliveryAddress('');
                      setDeliveryPhone('');
                      setHouseName('');
                      setFloor('');
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={proceedWithCheckout}
                    disabled={isCheckingOut}
                  >
                    <Text style={styles.modalButtonText}>
                      {isCheckingOut ? 'Processing...' : 'Continue Checkout'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.white, borderBottomLeftRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg },
  backButton: { marginRight: spacing.md },
  headerContent: { flex: 1 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  content: { padding: spacing.lg },
  cartItem: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: borderRadius.md },
  imagePlaceholder: { width: 80, height: 80, borderRadius: borderRadius.md, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 40 },
  itemDetails: { flex: 1, marginLeft: spacing.md },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  itemCategory: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  itemPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.sm },
  quantityContainer: { marginTop: spacing.sm },
  quantityLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  quantityButton: { width: 32, height: 32, borderRadius: borderRadius.round, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center' },
  quantityButtonDisabled: { opacity: 0.5 },
  quantityValue: { marginHorizontal: spacing.md, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, minWidth: 30, textAlign: 'center' },
  stockText: { fontSize: fontSize.xs, color: colors.textSecondary },
  removeButton: { justifyContent: 'center', alignItems: 'center', padding: spacing.sm },
  checkoutBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.white, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, shadowColor: colors.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  totalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  total: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  checkoutButton: { backgroundColor: colors.pink, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.round },
  checkoutText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2 },
  empty: { textAlign: 'center', marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, maxHeight: '90%' },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  modalSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  yesButton: { backgroundColor: colors.primary },
  noButton: { backgroundColor: colors.textSecondary },
  cancelButton: { backgroundColor: colors.textSecondary },
  confirmButton: { backgroundColor: colors.pink },
  modalButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.textSecondary, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white, minHeight: 44 },
});
