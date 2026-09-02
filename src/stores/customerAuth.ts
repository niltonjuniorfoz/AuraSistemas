import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sessão do cliente da loja (Minha Conta) — separada do admin (src/stores/authStore.ts) de
// propósito: são dois mundos de autenticação diferentes, ver nota em src/lib/storeApi.ts.
export interface StoreCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}

interface CustomerAuthState {
  token: string | null;
  customer: StoreCustomer | null;
  setAuth: (token: string, customer: StoreCustomer) => void;
  logout: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set) => ({
      token: null,
      customer: null,
      setAuth: (token, customer) => set({ token, customer }),
      logout: () => set({ token: null, customer: null }),
    }),
    { name: 'store-customer-auth' }
  )
);
