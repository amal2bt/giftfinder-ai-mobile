import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GiftCard } from '../components/GiftCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../utils/colors';
import { giftsAPI, wishlistAPI, cartAPI } from '../utils/api';
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

export default function Wishlist() {
	const router = useRouter();
	const [refreshing, setRefreshing] = useState(false);
	const [wishlistIds, setWishlistIds] = useState<string[]>([]);
	const [gifts, setGifts] = useState<Gift[]>([]);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			const [wishlistRes, giftsRes] = await Promise.all([
				wishlistAPI.get().catch(() => ({ data: [] })),
				giftsAPI.getAll(),
			]);
			const ids: string[] = Array.isArray(wishlistRes.data)
				? wishlistRes.data.map((w: any) => String(w.gift_id || w.id))
				: [];
			setWishlistIds(ids);
			const backendGifts: BackendGift[] = giftsRes.data?.gifts || [];
			const transformed = backendGifts.map(transformGift).filter((g) => ids.includes(g.id));
			setGifts(transformed);
		} catch (e) {
			console.error('Failed to load wishlist:', e);
		} finally {
			setRefreshing(false);
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		loadData();
	};

	const handleRemove = async (giftId: string) => {
		try {
			await wishlistAPI.remove(giftId);
			setWishlistIds((prev) => prev.filter((id) => id !== giftId));
			setGifts((prev) => prev.filter((g) => g.id !== giftId));
		} catch (e: any) {
			Alert.alert('Error', e?.response?.data?.message || 'Failed to remove from wishlist');
		}
	};

	const handleAddToCart = async (giftId: string) => {
		try {
			await cartAPI.add(giftId);
			Alert.alert('Success', 'Added to cart');
		} catch (e: any) {
			Alert.alert('Error', e?.response?.data?.message || 'Failed to add to cart');
		}
	};

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.title}>My Wishlist</Text>
					<Text style={styles.subtitle}>Your saved gift ideas</Text>
				</View>
			</View>
			<ScrollView
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
				contentContainerStyle={styles.content}
			>
				{gifts.map((gift) => (
					<View key={gift.id} style={styles.cardRow}>
						<GiftCard
							gift={gift}
							onPress={() => {}}
							onLike={() => handleRemove(gift.id)}
							onAddToCart={() => handleAddToCart(gift.id)}
							isLiked={wishlistIds.includes(gift.id)}
						/>
					</View>
				))}
				{gifts.length === 0 && (
					<View style={styles.emptyContainer}>
						<Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
						<Text style={styles.empty}>Your wishlist is empty.</Text>
					</View>
				)}
			</ScrollView>
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
	},
	backButton: {
		marginRight: spacing.md,
	},
	headerContent: {
		flex: 1,
	},
	title: {
		fontSize: fontSize.xl,
		fontWeight: fontWeight.bold,
		color: colors.text,
	},
	subtitle: {
		fontSize: fontSize.sm,
		color: colors.textSecondary,
		marginTop: spacing.xs,
	},
	content: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
	},
	cardRow: {
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.xl * 2,
	},
	empty: {
		textAlign: 'center',
		marginTop: spacing.md,
		color: colors.textSecondary,
		fontSize: fontSize.md,
	},
});
