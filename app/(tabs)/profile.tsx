import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { remindersAPI, wishlistAPI, cartAPI } from '../../utils/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface Reminder {
  id: string;
  event_name: string;
  event_date: string;
  recipient_name: string;
}

export default function Profile() {
  const { user, signout } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [remindersRes, wishlistRes, cartRes] = await Promise.all([
        remindersAPI.getAll(),
        wishlistAPI.get().catch(() => ({ data: [] })),
        cartAPI.get().catch(() => ({ data: [] })),
      ]);

      setReminders(remindersRes.data?.slice(0, 3) || []);
      setWishlistCount(Array.isArray(wishlistRes.data) ? wishlistRes.data.length : 0);
      setCartCount(Array.isArray(cartRes.data) ? cartRes.data.length : 0);
    } catch (error: any) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signout();
          router.replace('/auth/signin');
        },
      },
    ]);
  };

  const MenuItem = ({ icon, title, value, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={colors.primary} />
        </View>
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value !== undefined && <Text style={styles.menuItemValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.profile_picture_url ? (
              <Image source={{ uri: user.profile_picture_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={colors.white} />
            )}
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cartCount}</Text>
            <Text style={styles.statLabel}>Cart</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reminders.length}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Activity</Text>
          <MenuItem
            icon="heart"
            title="Wishlist"
            value={wishlistCount}
            onPress={() => router.push('/wishlist')}
          />
          <MenuItem icon="cart" title="Cart" onPress={() => router.push('/cart')} />
          <MenuItem
            icon="time"
            title="Purchase History"
            onPress={() => router.push('/purchase-history')}
          />
          <MenuItem
            icon="notifications"
            title="Reminders"
            value={reminders.length}
            onPress={() => router.push('/reminders' as any)}
          />
          <MenuItem
            icon="chatbox-ellipses"
            title="Feedback"
            onPress={() => router.push('/feedback' as any)}
          />

          {/* Delivery Info Tab ONLY for regular users */}
          {user?.role !== 'delivery_worker' && (
            <MenuItem
             icon="information-circle"
             title="Delivery Info"
             onPress={() => router.push('/deliveryinfo' as any)}
/>

          )}
        </View>

        {/* Delivery Worker Section */}
        {user?.role === 'delivery_worker' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <MenuItem
              icon="car"
              title="My Deliveries"
              onPress={() => router.push('/delivery' as any)}
            />
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <MenuItem
            icon="settings"
            title="Account Settings"
            onPress={() => router.push('/account-settings' as any)}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
  },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  email: { fontSize: fontSize.sm, color: colors.textSecondary },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  statDivider: { width: 1, backgroundColor: colors.lightGray },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  menuItemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuItemValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginRight: spacing.xs },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.error },
  signOutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.error, marginLeft: spacing.sm },
  footer: { alignItems: 'center', padding: spacing.xl },
  version: { fontSize: fontSize.xs, color: colors.textLight },
});
