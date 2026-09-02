import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

export type Language = 'pt-BR' | 'es-PY';

const ptBR: Record<string, string> = {
  // Menu
  'menu.dashboard': 'Dashboard',
  'menu.pos': 'Ponto de Venda',
  'menu.separation': 'Separação',
  'menu.delivery': 'Entrega de Merc.',
  'menu.cash': 'Caixa',
  'menu.sales': 'Vendas Realizadas',
  'menu.products': 'Produtos',
  'menu.groups': 'Grupos/Categorias',
  'menu.customers': 'Clientes',
  'menu.suppliers': 'Fornecedores',
  'menu.purchases': 'Entrada de Merc.',
  'menu.reports': 'Relatórios',
  'menu.users': 'Usuários & Permissões',
  'menu.settings': 'Configurações',
  'menu.operation': 'Operação',
  'menu.registries': 'Cadastros',
  'menu.purchases_label': 'Compras / Entrada',
  'menu.reports_label': 'Relatórios',
  'menu.admin_label': 'Administração',
  'menu.logged_as': 'Logado como:',
  'menu.logout': 'Sair do sistema',
  
  // Status
  'status.CONFIRMED': 'Confirmado',
  'status.PENDING': 'Pendente',
  'status.PAID': 'Pago',
  'status.PARTIAL': 'Parcial',
  'status.DELIVERED': 'Entregue',
  'status.SEPARATING': 'Em separação',
  'status.SEPARATED': 'Separado',
  'status.DELIVERING': 'Em entrega',
  'status.COMPLETED': 'Concluído',
  'status.CANCELED': 'Cancelado',
  'status.CANCELLED': 'Cancelado',
  'status.DRAFT': 'Rascunho',
  'status.APPROVED': 'Aprovado',
  'status.IN_PROGRESS': 'Em andamento',
  'status.DIVERGENT': 'Divergente',
  'status.AVAILABLE': 'Disponível',
  'status.SOLD': 'Vendido',
  'status.RESERVED': 'Reservado',
  'status.RETURNED': 'Devolvido',
  'status.REFUNDED': 'Reembolsado',
  // PDV
  'pos.title': 'Ponto de Venda (PDV)',
  'pos.shortcuts': 'Atalhos',
  'pos.editing_sale': 'Editando Venda',
  'pos.cancel_edit': 'Cancelar Edição',
  'pos.note_limit': 'Limite de {max} notas abertas. Feche uma nota para abrir outra.',
  'pos.new_note_opened': 'Nova nota aberta.',
  'pos.note_discarded': 'Nota fechada e descartada.',
  'pos.note_cleaned': 'Nota limpa e descartada.',
  'pos.new_note': 'Nova nota',
  'pos.search_placeholder': 'Buscar por nome, SKU, UPC (Leitor de Código de Barras)... [F2]',
  'pos.cart': 'Carrinho',
  'pos.items': 'itens',
  'pos.cart_help': 'Seta Up/Down navega • Del remove • +/- altera qtd',
  'pos.empty_cart': 'Carrinho vazio',
  'pos.client': 'Cliente [F3]',
  'pos.foreign_client': 'CLIENTE ESTRANGEIRO',
  'pos.create_customer': '+ Criar novo cliente',
  'pos.search_customer': 'Digite para buscar cliente...',
  'pos.foreign_default': 'Frete do produto aplicado automaticamente. Ajuste no lápis, se necessário.',
  'pos.price_table': 'Tabela de Preço [F4]',
  'pos.retail': 'A - Varejo',
  'pos.wholesale': 'B - Atacado',
  'pos.notes': 'Observações',
  'pos.notes_placeholder': 'Anotações para a venda...',
  'pos.subtotal': 'Subtotal',
  'pos.tax': 'Frete',
  'pos.total': 'Total',
  'pos.processing': 'Processando...',
  'pos.save': 'Salvar [F8]',
  'pos.confirm_sale': 'Confirmar Venda [F8]',
  'pos.create_customer_title': 'Criar novo cliente',
  'pos.type': 'Tipo',
  'pos.foreign': 'Estrangeiro',
  'pos.national_py': 'Nacional (PY)',
  'pos.document': 'Documento',
  'pos.customer_name': 'Nome do cliente',
  'pos.phone': 'Telefone / WhatsApp',
  'pos.email': 'E-mail',
  'pos.cancel': 'Cancelar',
  'pos.saving': 'Salvando...',
  'pos.create_and_select': 'Criar e selecionar',
  'pos.customer_created': 'Cliente criado e selecionado na nota.',
  'pos.customer_create_error': 'Erro ao criar cliente.',
  'pos.connection_error': 'Erro de conexão.',
  'pos.empty_cart_alert': 'Carrinho vazio',
  'pos.no_customer_found': 'Nenhum cliente encontrado.',
  'pos.loading_sale': 'Carregando dados da venda...',
  'pos.product_not_found': 'Nenhum produto encontrado. Digite nome, SKU ou UPC para buscar.',
  'pos.stock_available': 'Estoque Liv.',
  'scanner.title': 'Ler código de barras',
  'scanner.help': 'Aponte a câmera para o código de barras. A leitura acontece automaticamente.',
  'scanner.close': 'Fechar câmera',
  'scanner.unsupported': 'Este navegador não suporta leitura por câmera. Tente Chrome/Android ou Safari atualizado.',
  'scanner.no_camera_api': 'Câmera indisponível neste navegador.',
  'scanner.open_error': 'Não foi possível abrir a câmera.',
  'pos.scan_barcode': 'Ler código pela câmera',
  'ai.generate': 'Gerar relatório com IA',
  'ai.title': 'Relatório gerado com IA',
};

const esPY: Record<string, string> = {
  // Menu
  'menu.dashboard': 'Panel',
  'menu.pos': 'Punto de Venta',
  'menu.separation': 'Separación',
  'menu.delivery': 'Entrega de Mercadería',
  'menu.cash': 'Caja',
  'menu.sales': 'Ventas Realizadas',
  'menu.products': 'Productos',
  'menu.groups': 'Grupos/Categorías',
  'menu.customers': 'Clientes',
  'menu.suppliers': 'Proveedores',
  'menu.purchases': 'Entrada de Mercadería',
  'menu.reports': 'Informes',
  'menu.users': 'Usuarios y Permisos',
  'menu.settings': 'Configuraciones',
  'menu.operation': 'Operación',
  'menu.registries': 'Registros',
  'menu.purchases_label': 'Compras / Entrada',
  'menu.reports_label': 'Informes',
  'menu.admin_label': 'Administración',
  'menu.logged_as': 'Conectado como:',
  'menu.logout': 'Salir del sistema',
  
  // Status
  'status.CONFIRMED': 'Confirmado',
  'status.PENDING': 'Pendiente',
  'status.PAID': 'Pagado',
  'status.PARTIAL': 'Parcial',
  'status.DELIVERED': 'Entregado',
  'status.SEPARATING': 'En separación',
  'status.SEPARATED': 'Separado',
  'status.DELIVERING': 'En entrega',
  'status.COMPLETED': 'Concluido',
  'status.CANCELED': 'Cancelado',
  'status.CANCELLED': 'Cancelado',
  'status.DRAFT': 'Borrador',
  'status.APPROVED': 'Aprobado',
  'status.IN_PROGRESS': 'En progreso',
  'status.DIVERGENT': 'Divergente',
  'status.AVAILABLE': 'Disponible',
  'status.SOLD': 'Vendido',
  'status.RESERVED': 'Reservado',
  'status.RETURNED': 'Devuelto',
  'status.REFUNDED': 'Reembolsado',
  // PDV
  'pos.title': 'Punto de Venta (PDV)',
  'pos.shortcuts': 'Atajos',
  'pos.editing_sale': 'Editando Venta',
  'pos.cancel_edit': 'Cancelar Edición',
  'pos.note_limit': 'Límite de {max} notas abiertas. Cierre una nota para abrir otra.',
  'pos.new_note_opened': 'Nueva nota abierta.',
  'pos.note_discarded': 'Nota cerrada y descartada.',
  'pos.note_cleaned': 'Nota limpia y descartada.',
  'pos.new_note': 'Nueva nota',
  'pos.search_placeholder': 'Buscar por nombre, SKU, UPC (lector de código de barras)... [F2]',
  'pos.cart': 'Carrito',
  'pos.items': 'ítems',
  'pos.cart_help': 'Flechas Up/Down navegan • Del elimina • +/- cambia cant.',
  'pos.empty_cart': 'Carrito vacío',
  'pos.client': 'Cliente [F3]',
  'pos.foreign_client': 'CLIENTE EXTRANJERO',
  'pos.create_customer': '+ Crear nuevo cliente',
  'pos.search_customer': 'Escriba para buscar cliente...',
  'pos.foreign_default': 'Flete del producto aplicado automáticamente. Ajuste en el lápiz, si es necesario.',
  'pos.price_table': 'Tabla de Precio [F4]',
  'pos.retail': 'A - Minorista',
  'pos.wholesale': 'B - Mayorista',
  'pos.notes': 'Observaciones',
  'pos.notes_placeholder': 'Anotaciones para la venta...',
  'pos.subtotal': 'Subtotal',
  'pos.tax': 'Frete',
  'pos.total': 'Total',
  'pos.processing': 'Procesando...',
  'pos.save': 'Guardar [F8]',
  'pos.confirm_sale': 'Confirmar Venta [F8]',
  'pos.create_customer_title': 'Crear nuevo cliente',
  'pos.type': 'Tipo',
  'pos.foreign': 'Extranjero',
  'pos.national_py': 'Nacional (PY)',
  'pos.document': 'Documento',
  'pos.customer_name': 'Nombre del cliente',
  'pos.phone': 'Teléfono / WhatsApp',
  'pos.email': 'E-mail',
  'pos.cancel': 'Cancelar',
  'pos.saving': 'Guardando...',
  'pos.create_and_select': 'Crear y seleccionar',
  'pos.customer_created': 'Cliente creado y seleccionado en la nota.',
  'pos.customer_create_error': 'Error al crear cliente.',
  'pos.connection_error': 'Error de conexión.',
  'pos.empty_cart_alert': 'Carrito vacío',
  'pos.no_customer_found': 'Ningún cliente encontrado.',
  'pos.loading_sale': 'Cargando datos de la venta...',
  'pos.product_not_found': 'Ningún producto encontrado. Escriba nombre, SKU o UPC para buscar.',
  'pos.stock_available': 'Stock Disp.',
  'scanner.title': 'Leer código de barras',
  'scanner.help': 'Apunte la cámara al código de barras. La lectura ocurre automáticamente.',
  'scanner.close': 'Cerrar cámara',
  'scanner.unsupported': 'Este navegador no soporta lectura por cámara. Pruebe Chrome/Android o Safari actualizado.',
  'scanner.no_camera_api': 'Cámara no disponible en este navegador.',
  'scanner.open_error': 'No fue posible abrir la cámara.',
  'pos.scan_barcode': 'Leer código con la cámara',
  'ai.generate': 'Generar informe con IA',
  'ai.title': 'Informe generado con IA',
};

const dictionaries = {
  'pt-BR': ptBR,
  'es-PY': esPY
};

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Renomeado de useTranslation: nome igual ao hook do react-i18next usado na
// loja pública, mas formato de dicionário totalmente diferente — a colisão
// de nome confundia (mesmo hook, dois sistemas diferentes por trás).
export const useAdminTranslation = create<I18nStore>((set, get) => ({
  language: (localStorage.getItem('language') as Language) || 'pt-BR',
  
  setLanguage: (lang: Language) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },
  
  t: (key: string) => {
    const lang = get().language;
    const dictionary = dictionaries[lang] || dictionaries['pt-BR'];
    
    // If exact match doesn't exist, try removing namespace prefixes for a friendlier fallback
    if (dictionary[key]) return dictionary[key];
    
    // Convert "MENU.OPERATION" to "Operation", "settings.something" to "Something"
    const parts = key.split('.');
    let fallback = parts[parts.length - 1]; // get the last part
    fallback = fallback.replace(/_/g, ' '); // replace underscores with spaces
    // Title case it
    fallback = fallback.charAt(0).toUpperCase() + fallback.slice(1).toLowerCase();
    
    return fallback;
  }
}));

export type SystemCurrency = 'USD' | 'BRL' | 'DUAL';
export type BaseCurrency = 'USD' | 'BRL';

const SYSTEM_CURRENCY_KEY = 'origin:system-currency';
const BRL_EXCHANGE_RATE_KEY = 'origin:brl-exchange-rate';
const DEFAULT_BRL_EXCHANGE_RATE = 5.5;
// Sistema operado no Brasil: quando não há preferência salva, exibir em Real.
const DEFAULT_SYSTEM_CURRENCY: SystemCurrency = 'BRL';

export const normalizeSystemCurrency = (value: unknown): SystemCurrency => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'BRL') return 'BRL';
  if (normalized === 'USD') return 'USD';
  if (normalized === 'DUAL' || normalized === 'USD_BRL' || normalized === 'BOTH') return 'DUAL';
  return DEFAULT_SYSTEM_CURRENCY;
};

export const getSystemCurrency = (): SystemCurrency => {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_CURRENCY;
  const stored = window.localStorage.getItem(SYSTEM_CURRENCY_KEY);
  if (!stored) return DEFAULT_SYSTEM_CURRENCY;
  return normalizeSystemCurrency(stored);
};

export const getBaseCurrency = (currency: unknown = getSystemCurrency()): BaseCurrency => {
  return normalizeSystemCurrency(currency) === 'BRL' ? 'BRL' : 'USD';
};

export const setSystemCurrency = (value: unknown) => {
  if (typeof window === 'undefined') return;
  const currency = normalizeSystemCurrency(value);
  window.localStorage.setItem(SYSTEM_CURRENCY_KEY, currency);
  window.dispatchEvent(new CustomEvent('origin:system-currency-change', { detail: currency }));
};

export const normalizeBrlExchangeRate = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BRL_EXCHANGE_RATE;
};

export const getBrlExchangeRate = (): number => {
  if (typeof window === 'undefined') return DEFAULT_BRL_EXCHANGE_RATE;
  return normalizeBrlExchangeRate(window.localStorage.getItem(BRL_EXCHANGE_RATE_KEY));
};

export const setBrlExchangeRate = (value: unknown) => {
  if (typeof window === 'undefined') return;
  const rate = normalizeBrlExchangeRate(value);
  window.localStorage.setItem(BRL_EXCHANGE_RATE_KEY, String(rate));
  window.dispatchEvent(new CustomEvent('origin:brl-exchange-rate-change', { detail: rate }));
};


export const subscribeCurrencyPreferences = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener('origin:system-currency-change', handler);
  window.addEventListener('origin:brl-exchange-rate-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('origin:system-currency-change', handler);
    window.removeEventListener('origin:brl-exchange-rate-change', handler);
    window.removeEventListener('storage', handler);
  };
};

export const getCurrencyPreferencesSnapshot = () => `${getSystemCurrency()}:${getBrlExchangeRate()}`;

export const useCurrencyPreferences = () => {
  useSyncExternalStore(subscribeCurrencyPreferences, getCurrencyPreferencesSnapshot, () => `${DEFAULT_SYSTEM_CURRENCY}:5.5`);
  return { currency: getSystemCurrency(), brlRate: getBrlExchangeRate() };
};

export const currencySymbol = (currency: unknown = getSystemCurrency()) => {
  const normalized = normalizeSystemCurrency(currency);
  if (normalized === 'BRL') return 'R$';
  if (normalized === 'DUAL') return 'US$ e R$';
  return 'US$';
};

export const currencyCode = (currency: unknown = getSystemCurrency()) => {
  return normalizeSystemCurrency(currency);
};

export const currencyLabel = (currency: unknown = getSystemCurrency()) => {
  const normalized = normalizeSystemCurrency(currency);
  if (normalized === 'BRL') return 'Somente Real (R$)';
  if (normalized === 'DUAL') return 'Dólar + Real (US$ e R$)';
  return 'Somente Dólar (US$)';
};

export const moneyFieldLabel = (label: string, currency: unknown = getSystemCurrency()) => {
  const normalized = normalizeSystemCurrency(currency);
  if (normalized === 'DUAL') return `${label} (US$ base)`;
  return `${label} (${currencySymbol(normalized)})`;
};

const formatNumber = (value: number, locale = 'pt-BR') => new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value);

export interface CurrencyDisplayPart {
  currency: BaseCurrency;
  text: string;
  amount: number;
}

export const getCurrencyDisplayParts = (
  val: number | string | undefined,
  lang: string,
  currencyOverride?: SystemCurrency | string,
  // Cotação viva (GET /api/fx/today), passada por quem chamar (ex.: o
  // <Money>) — essa função é síncrona e não busca nada sozinha. Sem cotação
  // carregada ainda, cai pro comportamento normal (BRL/USD) abaixo.
  pygRates?: { BRLPYG?: number; USDPYG?: number; USDBRL?: number },
): CurrencyDisplayPart[] => {
  const parsed = Number(val);
  const num = val === undefined || val === null || !Number.isFinite(parsed) ? 0 : parsed;
  const usdLocale = lang === 'es-PY' ? 'es-PY' : 'pt-BR';

  if (String(currencyOverride).toUpperCase() === 'PYG') {
    // "num" está na moeda que o SystemCurrency normal usaria pra esse
    // valor (R$ se o sistema opera em Real, US$ se opera em Dólar/DUAL) -
    // só troca qual cotação usar pra chegar em Guarani.
    const base = normalizeSystemCurrency(getSystemCurrency());
    const rate = base === 'BRL' ? pygRates?.BRLPYG : pygRates?.USDPYG;
    if (rate) {
      return [{ currency: base === 'BRL' ? 'BRL' : 'USD', amount: num, text: `₲ ${Math.round(num * rate).toLocaleString('pt-BR')}` }];
    }
    // sem cotação ainda: segue pro fallback normal (BRL/USD) abaixo.
  }

  if (String(currencyOverride).toUpperCase() === 'USD') {
    const base = normalizeSystemCurrency(getSystemCurrency());
    if (base === 'BRL') {
      // "num" está gravado em R$ (sistema opera em Real) — pra virar US$ de
      // verdade (não só trocar o rótulo) precisa converter pela cotação. Usa
      // a viva (fxToday.USDBRL) e, sem ela ainda, cai pra taxa manual do
      // Financeiro (mesma usada no modo DUAL) em vez de travar em BRL puro.
      const rate = pygRates?.USDBRL || getBrlExchangeRate();
      const usdAmount = num / rate;
      return [{ currency: 'USD', amount: usdAmount, text: `US$ ${formatNumber(usdAmount, usdLocale)}` }];
    }
    // sistema já opera em US$/DUAL: "num" já está em dólar, sem conversão.
  }

  const activeCurrency = normalizeSystemCurrency(currencyOverride || getSystemCurrency());

  if (activeCurrency === 'BRL') {
    return [{ currency: 'BRL', amount: num, text: `R$ ${formatNumber(num, 'pt-BR')}` }];
  }

  const usd = { currency: 'USD' as const, amount: num, text: `US$ ${formatNumber(num, usdLocale)}` };
  if (activeCurrency === 'USD') return [usd];

  const brlAmount = num * getBrlExchangeRate();
  return [
    usd,
    { currency: 'BRL', amount: brlAmount, text: `R$ ${formatNumber(brlAmount, 'pt-BR')}` },
  ];
};

export const formatCurrency = (val: number | string | undefined, lang: string, currencyOverride?: SystemCurrency | string) => {
  return getCurrencyDisplayParts(val, lang, currencyOverride).map(part => part.text).join(' | ');
};

export const formatDate = (dateString: string | undefined, lang: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat(lang === 'es-PY' ? 'es-PY' : 'pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};
