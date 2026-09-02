import { create } from 'zustand';

// Cache em memória (não-persistido, session-only) dos IDs de produto favoritados — carregado uma
// vez em ShopLayout.tsx quando o cliente loga, pra ShopProductCard não precisar de um fetch por
// card. Fonte de verdade continua sendo o servidor (customer_wishlist); isso é só cache de leitura.
interface WishlistState {
  ids: Set<string>;
  setIds: (ids: string[]) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  ids: new Set(),
  setIds: (ids) => set({ ids: new Set(ids) }),
  add: (id) => set((s) => ({ ids: new Set(s.ids).add(id) })),
  remove: (id) => set((s) => { const next = new Set(s.ids); next.delete(id); return { ids: next }; }),
  reset: () => set({ ids: new Set() }),
}));
