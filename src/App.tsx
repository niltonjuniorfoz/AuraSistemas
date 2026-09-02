import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { apiFetch } from './lib/api';
import { setBrlExchangeRate, setSystemCurrency } from './lib/i18n';
import { ToastHost } from './components/Toast';

// Cada página vira o próprio pedaço de JS, baixado só quando a rota é visitada — antes o bundle
// inteiro (3,37 MB) carregava de uma vez até pra abrir só a tela de login. `lazyNamed` existe porque
// quase toda página usa export nomeado (`export function X`), não default — React.lazy só entende
// módulo com `default`, então isso adapta o named export pro formato que ele espera.
function lazyNamed<T extends React.ComponentType<any>>(loader: () => Promise<Record<string, T>>, name: string) {
  return React.lazy(() => loader().then((m) => ({ default: m[name] })));
}

const Login = lazyNamed(() => import('./pages/Login'), 'Login');
const Products = lazyNamed(() => import('./pages/Products'), 'Products');
const ProductDetails = lazyNamed(() => import('./pages/ProductDetails'), 'ProductDetails');
const Users = lazyNamed(() => import('./pages/Users'), 'Users');
const Customers = lazyNamed(() => import('./pages/Customers'), 'Customers');
const Groups = lazyNamed(() => import('./pages/Groups'), 'Groups');
const Pos = lazyNamed(() => import('./pages/Pos'), 'Pos');
const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const Receivables = lazyNamed(() => import('./pages/Receivables'), 'Receivables');
const Payables = lazyNamed(() => import('./pages/Payables'), 'Payables');
const Finance = lazyNamed(() => import('./pages/Finance'), 'Finance');
const Sales = lazyNamed(() => import('./pages/Sales'), 'Sales');
const Archived = lazyNamed(() => import('./pages/Archived'), 'Archived');
const Cash = lazyNamed(() => import('./pages/Cash'), 'Cash');
const Separation = lazyNamed(() => import('./pages/Separation'), 'Separation');
const SimpleDeliveries = lazyNamed(() => import('./pages/SimpleDeliveries'), 'SimpleDeliveries');
const Reports = React.lazy(() => import('./pages/Reports'));
const ProductsCatalogReport = React.lazy(() => import('./pages/ProductsCatalogReport'));
const ProfitReport = lazyNamed(() => import('./pages/ProfitReport'), 'ProfitReport');
const ProductsFinancialReport = lazyNamed(() => import('./pages/ProductsFinancialReport'), 'ProductsFinancialReport');
const StockMovementReport = lazyNamed(() => import('./pages/StockMovementReport'), 'StockMovementReport');
const AbcReport = lazyNamed(() => import('./pages/AbcReport'), 'AbcReport');
const RealMarginReport = lazyNamed(() => import('./pages/RealMarginReport'), 'RealMarginReport');
const Personal = lazyNamed(() => import('./pages/Personal'), 'Personal');
const ShopLayout = lazyNamed(() => import('./pages/store/ShopLayout'), 'ShopLayout');
const StoreHome = lazyNamed(() => import('./pages/store/StoreHome'), 'StoreHome');
const StoreCatalog = lazyNamed(() => import('./pages/store/StoreCatalog'), 'StoreCatalog');
const StoreProduct = lazyNamed(() => import('./pages/store/StoreProduct'), 'StoreProduct');
const OrderStatus = lazyNamed(() => import('./pages/store/OrderStatus'), 'OrderStatus');
const AccountLayout = lazyNamed(() => import('./pages/store/account/AccountLayout'), 'AccountLayout');
const MyOrders = lazyNamed(() => import('./pages/store/account/MyOrders'), 'MyOrders');
const MyProfile = lazyNamed(() => import('./pages/store/account/MyProfile'), 'MyProfile');
const MyAddresses = lazyNamed(() => import('./pages/store/account/MyAddresses'), 'MyAddresses');
const MyWishlist = lazyNamed(() => import('./pages/store/account/MyWishlist'), 'MyWishlist');
const ResetPassword = lazyNamed(() => import('./pages/store/account/ResetPassword'), 'ResetPassword');
const StoreOrders = lazyNamed(() => import('./pages/StoreOrders'), 'StoreOrders');
const AbandonedCarts = lazyNamed(() => import('./pages/AbandonedCarts'), 'AbandonedCarts');
const StoreSettings = lazyNamed(() => import('./pages/StoreSettings'), 'StoreSettings');
const StoreEditor = lazyNamed(() => import('./pages/store/editor/StoreEditor'), 'StoreEditor');
const Intelligence = lazyNamed(() => import('./pages/Intelligence'), 'Intelligence');
const Notifications = lazyNamed(() => import('./pages/Notifications'), 'Notifications');
const Analytics = lazyNamed(() => import('./pages/Analytics'), 'Analytics');
const FinancialStatements = lazyNamed(() => import('./pages/FinancialStatements'), 'FinancialStatements');
const CommissionsReport = lazyNamed(() => import('./pages/CommissionsReport'), 'CommissionsReport');
const StockTransfers = lazyNamed(() => import('./pages/StockTransfers'), 'StockTransfers');
const Suppliers = lazyNamed(() => import('./pages/Suppliers'), 'Suppliers');
const Purchases = lazyNamed(() => import('./pages/Purchases'), 'Purchases');
const PurchaseForm = lazyNamed(() => import('./pages/purchases/PurchaseForm'), 'PurchaseForm');
const PurchaseImport = lazyNamed(() => import('./pages/purchases/PurchaseImport'), 'PurchaseImport');
const PurchaseOcr = lazyNamed(() => import('./pages/purchases/PurchaseOcr'), 'PurchaseOcr');

const SettingsDashboard = lazyNamed(() => import('./pages/settings/index'), 'SettingsDashboard');
const CompanySettings = lazyNamed(() => import('./pages/settings/CompanySettings'), 'CompanySettings');
const Currencies = lazyNamed(() => import('./pages/settings/Currencies'), 'Currencies');
const Brands = lazyNamed(() => import('./pages/settings/Brands'), 'Brands');
const Fiscal = lazyNamed(() => import('./pages/settings/Fiscal'), 'Fiscal');
const Printers = lazyNamed(() => import('./pages/settings/Printers'), 'Printers');
const Email = lazyNamed(() => import('./pages/settings/Email'), 'Email');
const Backup = lazyNamed(() => import('./pages/settings/Backup'), 'Backup');
const AuditLogs = lazyNamed(() => import('./pages/settings/AuditLogs'), 'AuditLogs');
const SystemSettings = lazyNamed(() => import('./pages/settings/System'), 'SystemSettings');
const Shortcuts = lazyNamed(() => import('./pages/settings/Shortcuts'), 'Shortcuts');
const MasterPanel = lazyNamed(() => import('./pages/MasterPanel'), 'MasterPanel');

// Fallback de rota — some, então evita salto de layout: fica no fundo já padrão da tela.
function RouteFallback() {
  return <div className="min-h-screen w-full bg-[#0a0a0a]" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      return;
    }

    // Validate the token on mount
    apiFetch("/api/auth/me")
      .then(res => res.json())
      .then(() => setIsValidating(false))
      .catch(() => {
         // apiFetch handles the logout and redirect logic on 401
         setIsValidating(false);
      });
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (isValidating) return <div className="h-screen w-screen bg-[#070b14] flex items-center justify-center text-gray-500 text-sm">Validando sessão...</div>;

  return <>{children}</>;
}

function Home() {
   return <Navigate to="/pos" replace />;
}

export default function App() {
  useEffect(() => {
    apiFetch('/api/settings/company-public')
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setSystemCurrency(data.defaultCurrency || 'USD');
        setBrlExchangeRate(data.brlRateToUsd || data.pixExchangeRate || '5.50');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleNumericFocus = (event: FocusEvent) => {
      const el = event.target as HTMLInputElement | null;
      if (!el || el.tagName !== 'INPUT') return;
      if (el.type !== 'number' && el.getAttribute('inputmode') !== 'decimal' && el.getAttribute('inputmode') !== 'numeric') return;
      const value = String(el.value ?? '').trim().replace(',', '.');
      if (value === '' || /^0+(\.0+)?$/.test(value)) {
        window.setTimeout(() => {
          try { el.select(); } catch {}
        }, 0);
      }
    };
    document.addEventListener('focusin', handleNumericFocus);
    return () => document.removeEventListener('focusin', handleNumericFocus);
  }, []);

  return (
    <BrowserRouter>
      <ToastHost />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Loja online — páginas públicas (sem login, fora do Layout do ERP) */}
        <Route path="/loja" element={<ShopLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="catalogo" element={<StoreCatalog />} />
          <Route path="produto/:id" element={<StoreProduct />} />
          <Route path="conta" element={<AccountLayout />}>
            <Route path="pedidos" element={<MyOrders />} />
            <Route path="dados" element={<MyProfile />} />
            <Route path="enderecos" element={<MyAddresses />} />
            <Route path="favoritos" element={<MyWishlist />} />
          </Route>
        </Route>
        <Route path="/loja/pedido/:code" element={<OrderStatus />} />
        <Route path="/loja/conta/redefinir-senha" element={<ResetPassword />} />
        
        <Route path="/" element={<ProtectedRoute><ErrorBoundary><Layout /></ErrorBoundary></ProtectedRoute>}>
           <Route index element={<Home />} />
           <Route path="painel" element={<Dashboard />} />
           <Route path="products" element={<Products />} />
           <Route path="products/:id" element={<ProductDetails />} />
           <Route path="users" element={<Users />} />
           <Route path="customers" element={<Customers />} />
           <Route path="groups" element={<Groups />} />
           <Route path="pos" element={<Pos />} />
           <Route path="sales" element={<Sales />} />
           <Route path="sales/:id" element={<Sales />} />
           <Route path="cash" element={<Cash />} />
           <Route path="receivables" element={<Receivables />} />
           <Route path="payables" element={<Payables />} />
           <Route path="finance" element={<Finance />} />
           <Route path="personal" element={<Personal />} />
           <Route path="store-orders" element={<StoreOrders />} />
           <Route path="abandoned-carts" element={<AbandonedCarts />} />
           <Route path="store-settings" element={<StoreSettings />} />
           <Route path="store-settings/editor/*" element={<StoreEditor />} />
           <Route path="intelligence" element={<Intelligence />} />
           <Route path="notifications" element={<Notifications />} />
           <Route path="analytics" element={<Analytics />} />
           <Route path="separation" element={<Separation />} />
           <Route path="delivery" element={<SimpleDeliveries />} />
           <Route path="suppliers" element={<Suppliers />} />
           <Route path="purchases" element={<Purchases />} />
           <Route path="purchases/new" element={<PurchaseForm />} />
           <Route path="purchases/import" element={<PurchaseImport />} />
           <Route path="purchases/ocr" element={<PurchaseOcr />} />
           <Route path="purchases/:id" element={<PurchaseForm />} />
           <Route path="transfers" element={<StockTransfers />} />
           <Route path="reports" element={<Reports />} />
           <Route path="reports/products-catalog" element={<ProductsCatalogReport />} />
           <Route path="reports/profit" element={<ProfitReport />} />
           <Route path="reports/products-financial" element={<ProductsFinancialReport />} />
           <Route path="reports/stock-movements" element={<StockMovementReport />} />
           <Route path="reports/abc" element={<AbcReport />} />
           <Route path="reports/real-margin" element={<RealMarginReport />} />
           <Route path="reports/statements" element={<FinancialStatements />} />
           <Route path="reports/commissions" element={<CommissionsReport />} />
           
           {/* Settings module */}
           <Route path="settings" element={<SettingsDashboard />} />
           <Route path="settings/company" element={<CompanySettings />} />
           <Route path="settings/archived" element={<Archived />} />
           <Route path="settings/currencies" element={<Currencies />} />
           <Route path="settings/brands" element={<Brands />} />
           <Route path="settings/fiscal" element={<Fiscal />} />
           <Route path="settings/printers" element={<Printers />} />
           <Route path="settings/email" element={<Email />} />
           <Route path="settings/backup" element={<Backup />} />
           <Route path="settings/audit" element={<AuditLogs />} />
           <Route path="settings/system" element={<SystemSettings />} />
           <Route path="settings/shortcuts" element={<Shortcuts />} />
           <Route path="master" element={<MasterPanel />} />
           
           <Route path="archived" element={<Navigate to="/settings/archived" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

