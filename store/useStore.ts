import { create } from 'zustand';

interface Gift {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  occasion: string;
  image_base64?: string;
  tags: string[];
  quantity?: number;
}

interface StoreState {
  wishlist: Gift[];
  cart: Gift[];
  setWishlist: (wishlist: Gift[]) => void;
  setCart: (cart: Gift[]) => void;
  addToWishlist: (gift: Gift) => void;
  removeFromWishlist: (giftId: string) => void;
  addToCart: (gift: Gift) => void;
  removeFromCart: (giftId: string) => void;
  clearCart: () => void;
}

export const useStore = create<StoreState>((set) => ({
  wishlist: [],
  cart: [],
  setWishlist: (wishlist) => set({ wishlist }),
  setCart: (cart) => set({ cart }),
  addToWishlist: (gift) =>
    set((state) => ({
      wishlist: [...state.wishlist, gift],
    })),
  removeFromWishlist: (giftId) =>
    set((state) => ({
      wishlist: state.wishlist.filter((g) => g.id !== giftId),
    })),
  addToCart: (gift) =>
    set((state) => {
      const existing = state.cart.find((g) => g.id === gift.id);
      if (existing) {
        return {
          cart: state.cart.map((g) =>
            g.id === gift.id ? { ...g, quantity: (g.quantity || 1) + 1 } : g
          ),
        };
      }
      return { cart: [...state.cart, { ...gift, quantity: 1 }] };
    }),
  removeFromCart: (giftId) =>
    set((state) => ({
      cart: state.cart.filter((g) => g.id !== giftId),
    })),
  clearCart: () => set({ cart: [] }),
}));