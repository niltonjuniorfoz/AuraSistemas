import { create } from "zustand";

// Carrinho da loja pública, compartilhado entre home/catálogo/página de produto.
// Mesma chave de localStorage da loja antiga: carrinho de cliente não se perde.
const CART_KEY = "origin:store:cart";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxQty: number;
  imageUrl?: string;
};

type ShopCartState = {
  items: CartItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (p: { id: string; name: string; price: number; maxQty: number; imageUrl?: string }, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

function load(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function save(items: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* modo privado etc. */ }
}

export const useShopCart = create<ShopCartState>((set) => ({
  items: load(),
  open: false,
  setOpen: (open) => set({ open }),
  add: (p, qty = 1) => set((s) => {
    const found = s.items.find((i) => i.productId === p.id);
    let items: CartItem[];
    if (found) {
      items = s.items.map((i) => i.productId === p.id
        ? {
            ...i,
            quantity: Math.min(i.quantity + qty, p.maxQty),
            maxQty: p.maxQty,
            // Alguns produtos usam apenas a galeria nova e não possuem o
            // imageUrl legado. Quando a tela consegue resolver uma imagem,
            // atualiza também itens antigos já salvos no localStorage.
            imageUrl: p.imageUrl || i.imageUrl,
          }
        : i);
    } else {
      items = [...s.items, { productId: p.id, name: p.name, price: p.price, quantity: Math.min(qty, p.maxQty), maxQty: p.maxQty, imageUrl: p.imageUrl }];
    }
    save(items);
    return { items, open: true };
  }),
  setQty: (productId, qty) => set((s) => {
    const items = s.items.flatMap((i) => {
      if (i.productId !== productId) return [i];
      const next = Math.max(0, Math.min(qty, i.maxQty));
      return next === 0 ? [] : [{ ...i, quantity: next }];
    });
    save(items);
    return { items };
  }),
  clear: () => { save([]); set({ items: [] }); },
}));

export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.quantity, 0);
export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);
