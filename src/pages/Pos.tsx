import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  CheckCircle,
  Tag,
  User as UserIcon,
  Keyboard,
  Plus,
  Camera,
  Edit2,
  FileText,
  Percent,
  Truck,
  LayoutGrid,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router";
import { apiFetch, parseApiError } from "../lib/api";
import { formatCurrency, formatDate, useCurrencyPreferences, useAdminTranslation } from "../lib/i18n";
import { Modal } from "../components/Modal";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { Money } from "../components/Money";
import { DisplayCurrencySelector } from "../components/DisplayCurrencySelector";
import { toast } from "../components/Toast";
import { PriceCurrencyInput } from "../components/PriceCurrencyInput";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const defaultShortcuts = {
  focusProductSearch: "F2",
  focusCustomerSearch: "F3",
  togglePriceTable: "F4",
  focusQuantity: "F6",
  finishSale: "F8",
  clearCart: "F9",
  cancelAction: "Escape",
  confirmAction: "Enter",
  removeCartItem: "Delete",
  increaseQuantity: "+",
  decreaseQuantity: "-",
  navigateUp: "ArrowUp",
  navigateDown: "ArrowDown",
};

type PosNote = {
  id: string;
  title: string;
  selectedCustomerId: string;
  priceTable: "A" | "B";
  cart: any[];
  observations: string;
  freightAmount?: number | null;
  discountMode?: "VALUE" | "PERCENT";
  discountValue?: number;
  deliveryStatus?: "PENDING" | "DELIVERING" | "DELIVERED";
  deliveryScheduledAt?: string;
  deliveryNotes?: string;
  createdAt: number;
  updatedAt: number;
};

const POS_NOTES_KEY = "origin:pos:open-notes";
const POS_ACTIVE_NOTE_KEY = "origin:pos:active-note-id";
const POS_LAYOUT_MODE_KEY = "origin:pos:layout-mode";
const POS_HIDE_OUT_OF_STOCK_KEY = "origin:pos:hide-out-of-stock";
type PosLayoutMode = "classic" | "catalog";

const getInitialPosLayoutMode = (): PosLayoutMode => {
  if (typeof window === "undefined") return "classic";
  return window.localStorage.getItem(POS_LAYOUT_MODE_KEY) === "catalog" ? "catalog" : "classic";
};

const getTodayDateInputValue = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
};


const newId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const makeEmptyNote = (index = 1): PosNote => ({
  id: newId(),
  title: `Nota ${index}`,
  selectedCustomerId: "",
  priceTable: "A",
  cart: [],
  observations: "",
  freightAmount: null,
  discountMode: "VALUE",
  discountValue: 0,
  deliveryStatus: "DELIVERED",
  deliveryScheduledAt: getTodayDateInputValue(),
  deliveryNotes: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const normalizeNotes = (notes: PosNote[]): PosNote[] =>
  notes.map((note, index) => ({
    ...note,
    title: `Nota ${index + 1}`,
    selectedCustomerId: note.selectedCustomerId || "",
    priceTable: note.priceTable === "B" ? "B" : "A",
    cart: Array.isArray(note.cart) ? note.cart : [],
    observations: note.observations || "",
    freightAmount: typeof note.freightAmount === "number" ? note.freightAmount : null,
    discountMode: note.discountMode === "PERCENT" ? "PERCENT" : "VALUE",
    discountValue: Number.isFinite(Number(note.discountValue)) ? Number(note.discountValue) : 0,
    deliveryStatus: ["PENDING", "DELIVERING", "DELIVERED"].includes(String(note.deliveryStatus)) ? note.deliveryStatus : "DELIVERED",
    deliveryScheduledAt: note.deliveryScheduledAt || (note.deliveryStatus === "DELIVERED" ? getTodayDateInputValue() : ""),
    deliveryNotes: note.deliveryNotes || "",
  }));

const loadPosNotes = (): PosNote[] => {
  if (typeof window === "undefined") return [makeEmptyNote(1)];
  try {
    const raw = window.localStorage.getItem(POS_NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeNotes(parsed).slice(0, 5);
    }
  } catch (error) {
    console.warn("Não foi possível restaurar notas abertas do PDV.");
  }
  return [makeEmptyNote(1)];
};

const getInitialActiveNote = (): PosNote => {
  const notes = loadPosNotes();
  if (typeof window === "undefined") return notes[0];
  const activeId = window.localStorage.getItem(POS_ACTIVE_NOTE_KEY);
  return notes.find((note) => note.id === activeId) || notes[0];
};

const getMaxOpenNotes = () => {
  if (typeof window === "undefined") return 5;
  return window.matchMedia("(max-width: 1024px)").matches ? 3 : 5;
};

const defaultQuickCustomerForm = {
  name: "",
  document: "",
  phone: "",
  email: "",
  nationality: "FOREIGN",
};

const isTouchMobileViewport = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px), (max-width: 1023px) and (pointer: coarse)").matches;
};

export function Pos() {
  const { t, language } = useAdminTranslation();
  const { currency: systemCurrency } = useCurrencyPreferences();
  const currentUser = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editSaleId = searchParams.get("editSaleId");
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const initialActiveNote = getInitialActiveNote();
  const [notes, setNotes] = useState<PosNote[]>(() => loadPosNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(initialActiveNote.id);

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialActiveNote.selectedCustomerId,
  );
  const [priceTable, setPriceTable] = useState<"A" | "B">(
    initialActiveNote.priceTable,
  );

  const [cart, setCart] = useState<any[]>(initialActiveNote.cart);
  const [observations, setObservations] = useState(initialActiveNote.observations);
  const [manualFreightAmount, setManualFreightAmount] = useState<number | null>(
    typeof initialActiveNote.freightAmount === "number" ? initialActiveNote.freightAmount : null,
  );
  const [discountMode, setDiscountMode] = useState<"VALUE" | "PERCENT">(initialActiveNote.discountMode === "PERCENT" ? "PERCENT" : "VALUE");
  const [discountValue, setDiscountValue] = useState<number>(Number(initialActiveNote.discountValue || 0));
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountDraft, setDiscountDraft] = useState(0);
  const [discountModeDraft, setDiscountModeDraft] = useState<"VALUE" | "PERCENT">("VALUE");
  const [deliveryStatus, setDeliveryStatus] = useState<"PENDING" | "DELIVERING" | "DELIVERED">((initialActiveNote.deliveryStatus as any) || "DELIVERED");
  const [deliveryScheduledAt, setDeliveryScheduledAt] = useState(initialActiveNote.deliveryScheduledAt || (((initialActiveNote.deliveryStatus as any) || "DELIVERED") === "DELIVERED" ? getTodayDateInputValue() : ""));
  const [deliveryNotes, setDeliveryNotes] = useState(initialActiveNote.deliveryNotes || "");
  const [dueDate, setDueDate] = useState("");
  const [showDueDate, setShowDueDate] = useState(false);
  const [customerCredit, setCustomerCredit] = useState<{ creditLimit: number; outstanding: number; available: number | null } | null>(null);

  useEffect(() => {
    if (!selectedCustomerId) { setCustomerCredit(null); return; }
    let cancelled = false;
    apiFetch(`/api/receivables/customer/${selectedCustomerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCustomerCredit({ creditLimit: Number(d.creditLimit) || 0, outstanding: Number(d.outstanding) || 0, available: d.available }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedCustomerId]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isDownloadingBudgetPdf, setIsDownloadingBudgetPdf] = useState(false);
  const [isMobileBudgetAction, setIsMobileBudgetAction] = useState(() => isTouchMobileViewport());
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [lotDrafts, setLotDrafts] = useState<Record<string, Array<{ lotNumber: string; quantity: string }>>>({});
  const [lotSuggestions, setLotSuggestions] = useState<Record<string, Array<{ lotNumber: string; expiryDate: string | null; physicalStock: number }>>>({});
  const [lotError, setLotError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posNotice, setPosNotice] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [freightDraft, setFreightDraft] = useState(0);
  const [quickCustomerForm, setQuickCustomerForm] = useState(defaultQuickCustomerForm);
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const [quickCustomerFields, setQuickCustomerFields] = useState<Record<string, string>>({});
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [posLayoutMode, setPosLayoutMode] = useState<PosLayoutMode>(() => getInitialPosLayoutMode());
  const [hideOutOfStock, setHideOutOfStock] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(POS_HIDE_OUT_OF_STOCK_KEY) === "true");
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    tradeName: "",
    documentType: "RUC",
    documentNumber: "",
    phone: "",
    email: "",
    address: "",
    logoUrl: "",
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const productListRef = useRef<HTMLDivElement>(null);
  const productItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const customerBoxRef = useRef<HTMLDivElement>(null);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [selectedCartIndex, setSelectedCartIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const skipNotePersistRef = useRef(false);
  const noticeTimeoutRef = useRef<number | null>(null);
  const productPointerRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
  } | null>(null);
  const suppressProductInputClickRef = useRef(false);

  const [shortcuts, setShortcuts] = useState(defaultShortcuts);
  const isCatalogLayout = posLayoutMode === "catalog";

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(POS_HIDE_OUT_OF_STOCK_KEY, String(hideOutOfStock));
  }, [hideOutOfStock]);

  const showNotice = (message: string) => {
    setPosNotice(message);
    if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setPosNotice(""), 5000);
  };

  const persistNotes = (nextNotes: PosNote[], nextActiveId = activeNoteId) => {
    const normalized = normalizeNotes(nextNotes);
    try {
      window.localStorage.setItem(POS_NOTES_KEY, JSON.stringify(normalized));
      window.localStorage.setItem(POS_ACTIVE_NOTE_KEY, nextActiveId);
    } catch (error) {
      console.warn("Não foi possível salvar as notas abertas do PDV.");
    }
    return normalized;
  };

  const snapshotCurrentNote = (sourceNotes = notes) =>
    normalizeNotes(
      sourceNotes.map((note) =>
        note.id === activeNoteId
          ? {
              ...note,
              selectedCustomerId,
              priceTable,
              cart,
              observations,
              freightAmount: manualFreightAmount,
              discountMode,
              discountValue,
              deliveryStatus,
              deliveryScheduledAt,
              deliveryNotes,
              updatedAt: Date.now(),
            }
          : note,
      ),
    );

  const loadNoteIntoScreen = (note: PosNote) => {
    skipNotePersistRef.current = true;
    setActiveNoteId(note.id);
    setSelectedCustomerId(note.selectedCustomerId || "");
    setPriceTable(note.priceTable === "B" ? "B" : "A");
    setCart(Array.isArray(note.cart) ? note.cart : []);
    setObservations(note.observations || "");
    setManualFreightAmount(typeof note.freightAmount === "number" ? note.freightAmount : null);
    setDiscountMode(note.discountMode === "PERCENT" ? "PERCENT" : "VALUE");
    setDiscountValue(Number(note.discountValue || 0));
    const normalizedDeliveryStatus = ((note.deliveryStatus as any) || "DELIVERED") as "PENDING" | "DELIVERING" | "DELIVERED";
    setDeliveryStatus(normalizedDeliveryStatus);
    setDeliveryScheduledAt(note.deliveryScheduledAt || (normalizedDeliveryStatus === "DELIVERED" ? getTodayDateInputValue() : ""));
    setDeliveryNotes(note.deliveryNotes || "");
    setLotDrafts({});
    setSearch("");
    setSelectedCartIndex(note.cart?.length ? 0 : -1);
    closeProductSearch(false);
    searchInputRef.current?.focus();
  };

  const switchPosNote = (noteId: string) => {
    if (noteId === activeNoteId) return;
    const currentSnapshot = snapshotCurrentNote();
    const target = currentSnapshot.find((note) => note.id === noteId);
    if (!target) return;
    const normalized = persistNotes(currentSnapshot, noteId);
    setNotes(normalized);
    loadNoteIntoScreen(target);
  };

  const createNewNote = () => {
    const maxNotes = getMaxOpenNotes();
    const currentSnapshot = snapshotCurrentNote();
    if (currentSnapshot.length >= maxNotes) {
      showNotice(
        t("pos.note_limit").replace("{max}", String(maxNotes)),
      );
      return;
    }
    const newNote = makeEmptyNote(currentSnapshot.length + 1);
    const nextNotes = persistNotes([...currentSnapshot, newNote], newNote.id);
    setNotes(nextNotes);
    loadNoteIntoScreen(nextNotes[nextNotes.length - 1]);
    showNotice(t("pos.new_note_opened"));
  };

  const closePosNote = (noteId: string) => {
    const currentSnapshot = snapshotCurrentNote();
    const noteIndex = currentSnapshot.findIndex((note) => note.id === noteId);
    if (noteIndex < 0) return;

    if (currentSnapshot.length === 1) {
      const cleanNote = makeEmptyNote(1);
      const nextNotes = persistNotes([cleanNote], cleanNote.id);
      setNotes(nextNotes);
      loadNoteIntoScreen(cleanNote);
      showNotice(t("pos.note_cleaned"));
      return;
    }

    const remaining = currentSnapshot.filter((note) => note.id !== noteId);
    const nextActive =
      noteId === activeNoteId
        ? remaining[Math.max(0, noteIndex - 1)]
        : remaining.find((note) => note.id === activeNoteId) || remaining[0];
    const nextNotes = persistNotes(remaining, nextActive.id);
    setNotes(nextNotes);
    if (noteId === activeNoteId) {
      const normalizedActive = nextNotes.find((note) => note.id === nextActive.id) || nextNotes[0];
      loadNoteIntoScreen(normalizedActive);
    }
    showNotice(t("pos.note_discarded"));
  };

  useEffect(() => {
    fetchCustomers();
    fetchShortcuts();
    fetchCompanyInfo();
  }, []);

  // Abre o modal de atalhos quando o botão do cabeçalho (Layout) dispara o evento.
  useEffect(() => {
    const openShortcuts = () => setShowShortcuts(true);
    window.addEventListener("origin:pos-open-shortcuts", openShortcuts);
    return () => window.removeEventListener("origin:pos-open-shortcuts", openShortcuts);
  }, []);

  useEffect(() => {
    const syncLayoutMode = () => setPosLayoutMode(getInitialPosLayoutMode());
    window.addEventListener("origin:pos-layout-change", syncLayoutMode);
    window.addEventListener("storage", syncLayoutMode);
    return () => {
      window.removeEventListener("origin:pos-layout-change", syncLayoutMode);
      window.removeEventListener("storage", syncLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (!isCatalogLayout) return;
    setIsProductSearchOpen(false);
    fetchProducts(search.trim());
  }, [isCatalogLayout]);

  useEffect(() => {
    if (!isCatalogLayout) return;
    const handle = window.setTimeout(() => fetchProducts(search.trim()), 0);
    return () => window.clearTimeout(handle);
  }, [activeNoteId, isCatalogLayout]);

  useEffect(() => {
    const updateBudgetActionMode = () => setIsMobileBudgetAction(isTouchMobileViewport());
    updateBudgetActionMode();
    window.addEventListener("resize", updateBudgetActionMode);
    return () => window.removeEventListener("resize", updateBudgetActionMode);
  }, []);

  const fetchShortcuts = async () => {
    try {
      const res = await apiFetch("/api/settings/shortcuts");
      if (res.ok) {
        const data = await res.json();
        if (data.shortcuts && Object.keys(data.shortcuts).length > 0) {
          setShortcuts({ ...defaultShortcuts, ...data.shortcuts });
        }
      }
    } catch (err) {
      console.error("Failed to load shortcuts");
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const res = await apiFetch("/api/settings/company-public");
      if (res.ok) {
        const data = await res.json();
        setCompanyInfo({
          companyName: data.companyName || "",
          tradeName: data.tradeName || data.companyName || "",
          documentType: data.documentType === "CNPJ" ? "CNPJ" : "RUC",
          documentNumber: data.documentNumber || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          logoUrl: data.logoUrl || "",
        });
      }
    } catch (err) {
      console.warn("Não foi possível carregar dados públicos da empresa.");
    }
  };

  useEffect(() => {
    if (isEditing || editSaleId) return;
    if (skipNotePersistRef.current) {
      skipNotePersistRef.current = false;
      return;
    }

    setNotes((prev) => {
      const next = persistNotes(
        prev.map((note) =>
          note.id === activeNoteId
            ? {
                ...note,
                selectedCustomerId,
                priceTable,
                cart,
                observations,
                freightAmount: manualFreightAmount,
                discountMode,
                discountValue,
                deliveryStatus,
                deliveryScheduledAt,
                deliveryNotes,
                updatedAt: Date.now(),
              }
            : note,
        ),
      );
      return next;
    });
  }, [activeNoteId, selectedCustomerId, priceTable, cart, observations, manualFreightAmount, discountMode, discountValue, deliveryStatus, deliveryScheduledAt, deliveryNotes, isEditing, editSaleId]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (editSaleId) {
      loadEditData(editSaleId);
    }
  }, [editSaleId]);

  const getOpenNotesSnapshot = () => snapshotCurrentNote(notes);

  const getPendingQtyForProduct = (productId: string, excludeActiveNote = false) => {
    return getOpenNotesSnapshot().reduce((sum, note) => {
      if (excludeActiveNote && note.id === activeNoteId) return sum;
      return sum + (note.cart || []).reduce((cartSum: number, item: any) => {
        return item.productId === productId ? cartSum + Number(item.quantity || 0) : cartSum;
      }, 0);
    }, 0);
  };

  const getServerAvailable = (product: any) => {
    if (product.stock) {
      return Number(product.stock.serverAvailable ?? product.stock.available ?? 0);
    }
    return Number(product.availableBase ?? ((product.physicalStock || 0) - (product.reservedStock || 0)));
  };

  const withPendingStock = (product: any) => {
    const serverAvailable = getServerAvailable(product);
    const pendingQty = getPendingQtyForProduct(product.id);
    const available = Math.max(0, serverAvailable - pendingQty);
    return {
      ...product,
      stock: product.stock
        ? { ...product.stock, serverAvailable, available }
        : { physical: product.physicalStock || 0, reserved: product.reservedStock || 0, serverAvailable, available },
    };
  };

  const visibleProducts = useMemo(() => products.map(withPendingStock), [products, notes, cart, activeNoteId]);
  // Filtro "Ocultar sem estoque" — compartilhado pelos dois layouts (catálogo e clássico),
  // tanto pra exibição quanto pra navegação por teclado (senão o índice do Up/Down/Enter
  // fica fora de sincronia com o que aparece na tela quando o filtro está ligado).
  const catalogProducts = hideOutOfStock
    ? visibleProducts.filter((p) => Number(p.stock ? p.stock.available : (p.physicalStock || 0) - (p.reservedStock || 0)) > 0)
    : visibleProducts;

  const loadEditData = async (id: string) => {
    setEditLoading(true);
    try {
      const res = await apiFetch(`/api/sales/${id}/edit-data`);
      if (res.ok) {
        const data = await res.json();
        setIsEditing(true);
        setSelectedCustomerId(data.customerId || "");
        setPriceTable(
          ((data.priceTable === "C" ? "A" : data.priceTable) as "A" | "B") ||
            "A",
        );
        setObservations(data.observations || "");

        const loadedCart = data.items.map((item: any) => ({
          productId: item.productId,
          name: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: item.quantity * Number(item.unitPrice),
          available: Number(item.availableStockForEdit),
          freightAmount: Number(item.ivaAmount || 0) / Math.max(Number(item.quantity || 1), 1),
          totalFreight: Number(item.ivaAmount || 0),
          serials: item.serials || [],
          hasSerials: item.hasSerials,
          requiresLot: !!item.requiresLot,
        }));

        setCart(loadedCart);
        setManualFreightAmount(Number(data.ivaAmount || 0));
        setDiscountMode("VALUE");
        setDiscountValue(Number(data.discountAmount || 0));
        const editDeliveryStatus = ((data.fulfillmentStatus as any) || "DELIVERED") as "PENDING" | "DELIVERING" | "DELIVERED";
        setDeliveryStatus(editDeliveryStatus);
        setDeliveryScheduledAt(data.deliveryScheduledAt ? String(data.deliveryScheduledAt).slice(0, 10) : (editDeliveryStatus === "DELIVERED" ? getTodayDateInputValue() : ""));
        setDeliveryNotes(data.deliveryNotes || "");
        // Hidrata o vencimento (a prazo) — sem isto, editar a venda mandava dueDate vazio e apagava a data.
        const loadedDue = data.dueDate ? String(data.dueDate).slice(0, 10) : "";
        setDueDate(loadedDue);
        setShowDueDate(!!loadedDue);

        if (
          data.fulfillmentStatus === "SEPARATED" ||
          data.fulfillmentStatus === "SEPARATING"
        ) {
          toast.error(
            "Aviso: Esta nota já possui tarefas de separação/entrega. Editar esta nota irá reiniciar a separação e cancelar o processo atual.",
          );
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao carregar dados da venda");
        navigate("/pos");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar");
      navigate("/pos");
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    if (!isProductSearchOpen || isCatalogLayout) return;

    const term = search.trim();
    const delay = setTimeout(
      () => {
        fetchProducts(term);
      },
      term ? 120 : 0,
    );

    return () => clearTimeout(delay);
  }, [search, isProductSearchOpen, isCatalogLayout]);

  useEffect(() => {
    if (!isCatalogLayout) return;
    const term = search.trim();
    const delay = window.setTimeout(() => fetchProducts(term), term ? 160 : 0);
    return () => window.clearTimeout(delay);
  }, [search, isCatalogLayout]);

  useEffect(() => {
    if (!isProductSearchOpen) return;

    const selectedEl = productItemRefs.current[selectedSearchIndex];
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedSearchIndex, isProductSearchOpen, catalogProducts]);

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      if (!isProductSearchOpen) return;
      const target = event.target as Node;
      const clickedSearch = Boolean(searchShellRef.current?.contains(target));
      const clickedList = Boolean(productListRef.current?.contains(target));
      if (!clickedSearch && !clickedList) {
        closeProductSearch(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isProductSearchOpen]);

  useEffect(() => {
    if (!isCustomerSearchOpen) return;
    const delay = window.setTimeout(() => fetchCustomers(customerQuery), 180);
    return () => window.clearTimeout(delay);
  }, [customerQuery, isCustomerSearchOpen]);

  useEffect(() => {
    const handleOutsideCustomer = (event: PointerEvent) => {
      if (!isCustomerSearchOpen) return;
      const target = event.target as Node;
      if (!customerBoxRef.current?.contains(target)) {
        setIsCustomerSearchOpen(false);
        setCustomerQuery("");
      }
    };
    document.addEventListener("pointerdown", handleOutsideCustomer);
    return () => document.removeEventListener("pointerdown", handleOutsideCustomer);
  }, [isCustomerSearchOpen]);

  const fetchProducts = async (q: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Usando o endpoint otimizado
      const term = q.trim();
      const res = await apiFetch(
        `/api/products/search?q=${encodeURIComponent(term)}&limit=40`,
        {
          signal: abortControllerRef.current.signal,
        },
      );
      const resData = await res.json();
      if (resData.data) {
        setProducts(resData.data);
        if (resData.data.length > 0) {
          setSelectedSearchIndex(0); // auto-select first item

          // Mode Scanner: se houver correspondência exata para UPC ou SKU (unico resultado ou 1o resultado exato)
          // we can check if it's exact match
          if (
            !isCatalogLayout &&
            term &&
            resData.data.length === 1 &&
            (resData.data[0].sku === term || resData.data[0].upc === term)
          ) {
            addToCart(withPendingStock(resData.data[0]));
            // clear search is handled inside addToCart
          }
        } else {
          setSelectedSearchIndex(-1);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
      }
    }
  };

  const closeProductSearch = (clearSearch = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProductSearchOpen(false);
    setProducts([]);
    setSelectedSearchIndex(-1);
    productItemRefs.current = [];
    if (clearSearch) setSearch("");
  };

  const openProductSearch = (shouldFocus = true) => {
    setIsProductSearchOpen(true);
    if (shouldFocus) searchInputRef.current?.focus();
    fetchProducts(search.trim());
  };

  const openProductListOnly = () => {
    setIsProductSearchOpen(true);
    fetchProducts(search.trim());
    window.requestAnimationFrame(() => searchInputRef.current?.blur());
  };

  const handleProductSearchPointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (isCatalogLayout) return;
    if (!isTouchMobileViewport()) return;
    if (isProductSearchOpen || search.trim()) return;

    event.preventDefault();
    suppressProductInputClickRef.current = true;
    openProductListOnly();
  };

  const handleProductSearchClick = () => {
    if (isCatalogLayout) return;
    if (suppressProductInputClickRef.current) {
      suppressProductInputClickRef.current = false;
      return;
    }
    openProductSearch(true);
  };

  const fetchCustomers = async (q = "") => {
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (q.trim()) params.set("q", q.trim());
      const res = await apiFetch(`/api/customers?${params.toString()}`);
      const resData = await res.json();
      if (resData.data) setCustomers(resData.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerChange = (value: string) => {
    if (value === "__create_customer__") {
      setIsCustomerSearchOpen(false);
      setQuickCustomerError("");
      setQuickCustomerFields({});
      setQuickCustomerForm(defaultQuickCustomerForm);
      setIsCustomerModalOpen(true);
      return;
    }
    setSelectedCustomerId(value);
    setCustomerQuery("");
    setIsCustomerSearchOpen(false);
    const cust = customers.find((c) => c.id === value);
    if (cust) {
      setPriceTable(
        (cust.priceTable === "C" ? "A" : cust.priceTable) as "A" | "B",
      );
    } else {
      setPriceTable("A");
    }
  };

  const submitQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    setQuickCustomerError("");
    setQuickCustomerFields({});
    try {
      const payload = {
        ...quickCustomerForm,
        type: "PERSON",
        documentType:
          quickCustomerForm.nationality === "PY" ? "CI" : "PASSPORT",
        country: quickCustomerForm.nationality === "PY" ? "Paraguay" : "",
        priceTable: "A",
      };
      const res = await apiFetch("/api/customers/quick-pos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const parsed = await parseApiError(res);
        setQuickCustomerFields(parsed.fields || {});
        setQuickCustomerError(parsed.message || t("pos.customer_create_error"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      const customer = data.customer;
      if (customer?.id) {
        setCustomers((prev) =>
          [...prev.filter((c) => c.id !== customer.id), customer].sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          ),
        );
        setSelectedCustomerId(customer.id);
        setCustomerQuery("");
        setPriceTable((customer.priceTable === "B" ? "B" : "A") as "A" | "B");
      }
      setIsCustomerModalOpen(false);
      setQuickCustomerForm(defaultQuickCustomerForm);
      showNotice(t("pos.customer_created"));
    } catch (error: any) {
      console.error(error);
      setQuickCustomerError(error.message || t("pos.connection_error"));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const getProductSerialPreview = (product: any) => {
    const firstSerial = String(product.serialSummary?.firstSerial || "").trim();
    const availableCount = Number(product.serialSummary?.availableCount || 0);

    if (!product.hasSerialNumber || !firstSerial || availableCount <= 0) return "—";
    return availableCount > 1 ? `${firstSerial} +${availableCount - 1}` : firstSerial;
  };

  const currentPrice = (p: any): number => {
    if (priceTable === "A") return Number(p.salePriceA);
    if (priceTable === "B") return Number(p.salePriceB || p.salePriceA);
    return Number(p.salePriceA);
  };

  const getCartPrice = (item: any, table: "A" | "B") => {
    if (table === "A") return Number(item.salePriceA || 0);
    if (table === "B") return Number(item.salePriceB || item.salePriceA || 0);
    return Number(item.salePriceA || 0);
  };

  useEffect(() => {
    setCart((prev) =>
      prev.map((item) => {
        const unitPrice = getCartPrice(item, priceTable);
        return {
          ...item,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
          totalFreight: Number(item.freightAmount || 0) * item.quantity,
        };
      }),
    );
  }, [priceTable]);

  const addToCart = (product: any) => {
    const serverAvailable = getServerAvailable(product);
    const additionalAvailable = Math.max(0, serverAvailable - getPendingQtyForProduct(product.id));
    const unitPrice = currentPrice(product);
    const freightAmount = Number(product.freightAmount ?? product.ivaPercentage ?? 0) || 0;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (additionalAvailable <= 0) {
          toast.error(`Estoque insuficiente. Disponível: ${Math.max(0, additionalAvailable)}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: (item.quantity + 1) * item.unitPrice,
                totalFreight: Number(item.freightAmount || 0) * (item.quantity + 1),
                availableBase: serverAvailable,
              }
            : item,
        );
      }
      if (additionalAvailable <= 0) {
        toast.error("Produto sem estoque disponível.");
        return prev;
      }
      return [
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          serials: product.serials || [],
          quantity: 1,
          salePriceA: Number(product.salePriceA || 0),
          salePriceB: Number(product.salePriceB || product.salePriceA || 0),
          unitPrice,
          totalPrice: unitPrice,
          freightAmount,
          totalFreight: freightAmount,
          availableBase: serverAvailable,
          available: serverAvailable,
          requiresLot: !!product.requiresLot,
        },
        ...prev,
      ];
    });
    if (isCatalogLayout) {
      showNotice(`${product.name} adicionado ao carrinho.`);
    } else {
      setSearch("");
      closeProductSearch(false);
      if (searchInputRef.current) searchInputRef.current.focus();
    }
    setSelectedCartIndex(0);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const maxForThisItem = Math.max(
            Number(item.quantity || 0),
            Number(item.availableBase ?? item.available ?? item.quantity ?? 0) - getPendingQtyForProduct(productId, true),
          );
          if (quantity > maxForThisItem) {
            toast.error(`Estoque insuficiente. Disponível: ${maxForThisItem}`);
            return item;
          }
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.unitPrice,
            totalFreight: Number(item.freightAmount || 0) * quantity,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = prev.filter((item) => item.productId !== productId);
      if (selectedCartIndex >= newCart.length) {
        setSelectedCartIndex(newCart.length - 1);
      }
      return newCart;
    });
  };

  const openLotModalBeforeSubmit = () => {
    const nextDrafts: Record<string, Array<{ lotNumber: string; quantity: string }>> = { ...lotDrafts };
    for (const item of lotRequiredItems) {
      if (!nextDrafts[item.productId] || nextDrafts[item.productId].length === 0) {
        nextDrafts[item.productId] = [{ lotNumber: "", quantity: "" }];
      }
    }
    setLotDrafts(nextDrafts);
    setLotError("");
    setIsLotModalOpen(true);
    // Busca lotes disponíveis (FEFO — ordenados por validade) para sugerir na tela.
    for (const item of lotRequiredItems) {
      apiFetch(`/api/lots/product/${item.productId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && Array.isArray(d.data)) setLotSuggestions((prev) => ({ ...prev, [item.productId]: d.data })); })
        .catch(() => {});
    }
  };

  // Preenche a primeira linha vazia do lote com a sugestão clicada (número + qtd restante).
  const applyLotSuggestion = (productId: string, lotNumber: string, available: number) => {
    const item = lotRequiredItems.find((i) => i.productId === productId);
    const info = item ? getItemLotInfo(item) : null;
    const remaining = info ? Math.max(0, item!.quantity - info.informed) : 0;
    const qty = Math.min(remaining || 0, available || 0) || remaining || 0;
    setLotDrafts((prev) => {
      const rows = [...(prev[productId] || [{ lotNumber: "", quantity: "" }])];
      const emptyIdx = rows.findIndex((r) => !r.lotNumber.trim());
      const targetIdx = emptyIdx >= 0 ? emptyIdx : rows.length;
      rows[targetIdx] = { lotNumber, quantity: qty > 0 ? String(qty) : "" };
      const hasEmptyAfter = rows.some((r, i) => i !== targetIdx && !r.lotNumber.trim());
      if (!hasEmptyAfter) rows.push({ lotNumber: "", quantity: "" });
      return { ...prev, [productId]: rows };
    });
  };

  const submitSale = async (lotPayload = buildLotPayload()) => {
    if (cart.length === 0) return toast.info(t("pos.empty_cart_alert"));
    setIsSubmitting(true);
    try {
      const salePayload = {
        customerId: selectedCustomerId || null,
        priceTable,
        items: cart,
        observations,
        freightAmount: freight,
        discountAmount,
        fulfillmentStatus: deliveryStatus,
        deliveryScheduledAt: deliveryScheduledAt || null,
        deliveryNotes,
        dueDate: dueDate || null,
        lotAllocations: lotPayload,
      };

      if (isEditing && editSaleId) {
        const res = await apiFetch(`/api/sales/${editSaleId}`, {
          method: "PUT",
          body: JSON.stringify(salePayload),
        });
        if (res.ok) {
          toast.success("Venda editada com sucesso.");
          resetPos();
          navigate("/sales");
        } else {
          const err = await res.json();
          toast.error(err.error || "Erro ao editar venda");
        }
      } else {
        const res = await apiFetch("/api/sales", {
          method: "POST",
          body: JSON.stringify(salePayload),
        });
        if (res.ok) {
          const data = await res.json();
          resetPos();
          toast.success(`Venda ${data.series}-${String(data.number).padStart(6, "0")} confirmada. Total: ${formatCurrency(data.totalAmount, language)}`);
        } else {
          const err = await res.json();
          toast.error(err.error || "Erro ao criar venda");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSale = async () => {
    if (cart.length === 0) return toast.info(t("pos.empty_cart_alert"));
    if (lotRequiredItems.length > 0 && !isLotModalOpen) {
      openLotModalBeforeSubmit();
      return;
    }
    await submitSale();
  };

  const resetPos = () => {
    setCart([]);
    setSearch("");
    setSelectedCustomerId("");
    setPriceTable("A");
    setObservations("");
    setManualFreightAmount(null);
    setDiscountMode("VALUE");
    setDiscountValue(0);
    setDeliveryStatus("PENDING");
    setDeliveryScheduledAt("");
    setDeliveryNotes("");
    setDueDate("");
    setShowDueDate(false);
    setCustomerCredit(null);
    setLotDrafts({});
    setSelectedCartIndex(-1);
    if (!isEditing) {
      const cleanedNotes = persistNotes(
        notes.map((note) =>
          note.id === activeNoteId
            ? { ...note, selectedCustomerId: "", priceTable: "A", cart: [], observations: "", freightAmount: null }
            : note,
        ),
      );
      setNotes(cleanedNotes);
    }
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // KEYBOARD HANDLERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if writing in a textarea that is not part of explicit shortcuts
      if (e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          e.target.blur();
          if (searchInputRef.current) searchInputRef.current.focus();
        }
        return;
      }

      if (isProductSearchOpen && e.key === shortcuts.cancelAction) {
        e.preventDefault();
        closeProductSearch(false);
        searchInputRef.current?.blur();
        return;
      }

      if (showShortcuts && e.key === shortcuts.cancelAction) {
        e.preventDefault();
        setShowShortcuts(false);
        return;
      }

      // Check shortcuts
      if (e.key === shortcuts.focusProductSearch) {
        e.preventDefault();
        openProductSearch();
      } else if (e.key === "F1") {
        e.preventDefault();
        setShowShortcuts(true);
      } else if (e.key === shortcuts.focusCustomerSearch) {
        e.preventDefault();
        customerSearchRef.current?.focus();
      } else if (e.key === shortcuts.togglePriceTable) {
        e.preventDefault();
        setPriceTable((prev) => (prev === "A" ? "B" : "A"));
      } else if (e.key === shortcuts.finishSale) {
        e.preventDefault();
        confirmSale();
      } else if (e.key === shortcuts.clearCart) {
        e.preventDefault();
        setCart([]);
      } else if (e.key === shortcuts.focusQuantity) {
        e.preventDefault();
        if (
          selectedCartIndex >= 0 &&
          quantityInputRefs.current[selectedCartIndex]
        ) {
          quantityInputRefs.current[selectedCartIndex]?.focus();
          quantityInputRefs.current[selectedCartIndex]?.select();
        }
      }
      // Cart navigation if not in search input
      else if (document.activeElement !== searchInputRef.current) {
        if (e.key === shortcuts.navigateDown) {
          e.preventDefault();
          setSelectedCartIndex((prev) =>
            prev < cart.length - 1 ? prev + 1 : prev,
          );
        } else if (e.key === shortcuts.navigateUp) {
          e.preventDefault();
          setSelectedCartIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (
          e.key === shortcuts.increaseQuantity &&
          selectedCartIndex >= 0
        ) {
          // ensure not inside quantity input? actually if inside, '+' might type.
          if (document.activeElement?.tagName !== "INPUT") {
            e.preventDefault();
            const item = cart[selectedCartIndex];
            if (item) updateQuantity(item.productId, item.quantity + 1);
          }
        } else if (
          e.key === shortcuts.decreaseQuantity &&
          selectedCartIndex >= 0
        ) {
          if (document.activeElement?.tagName !== "INPUT") {
            e.preventDefault();
            const item = cart[selectedCartIndex];
            if (item) updateQuantity(item.productId, item.quantity - 1);
          }
        } else if (
          e.key === shortcuts.removeCartItem &&
          selectedCartIndex >= 0
        ) {
          if (document.activeElement?.tagName !== "INPUT") {
            e.preventDefault();
            const item = cart[selectedCartIndex];
            if (item) removeFromCart(item.productId);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    shortcuts,
    cart,
    selectedCartIndex,
    selectedCustomerId,
    priceTable,
    observations,
    search,
    isProductSearchOpen,
    showShortcuts,
    manualFreightAmount,
  ]);

  // Search input specific keys
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isCatalogLayout) {
      if (e.key === shortcuts.confirmAction && catalogProducts.length > 0) {
        e.preventDefault();
        addToCart(catalogProducts[0]);
      }
      return;
    }
    if (e.key === shortcuts.navigateDown) {
      e.preventDefault();
      if (!isProductSearchOpen) {
        openProductSearch();
        return;
      }
      setSelectedSearchIndex((prev) =>
        prev < catalogProducts.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === shortcuts.navigateUp) {
      e.preventDefault();
      if (!isProductSearchOpen) {
        openProductSearch();
        return;
      }
      setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === shortcuts.confirmAction) {
      e.preventDefault();
      if (
        isProductSearchOpen &&
        selectedSearchIndex >= 0 &&
        selectedSearchIndex < catalogProducts.length
      ) {
        addToCart(catalogProducts[selectedSearchIndex]);
      } else if (isProductSearchOpen && catalogProducts.length > 0) {
        addToCart(catalogProducts[0]);
      }
    } else if (e.key === shortcuts.cancelAction) {
      e.preventDefault();
      closeProductSearch(false);
      searchInputRef.current?.blur();
    }
  };

  const handleProductPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    productPointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
  };

  const handleProductPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    product: any,
  ) => {
    const start = productPointerRef.current;
    productPointerRef.current = null;
    if (!start || start.pointerId !== e.pointerId) return;

    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    const elapsed = Date.now() - start.time;

    // Em telas touch, arrastar deve rolar a lista, não selecionar o produto.
    // Só adiciona quando for um toque/click curto e sem deslocamento relevante.
    if (distance <= 10 && elapsed < 700) {
      e.preventDefault();
      e.stopPropagation();
      addToCart(product);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setIsBarcodeScannerOpen(false);
    setSearch(code);
    setIsProductSearchOpen(true);
    searchInputRef.current?.focus();
    fetchProducts(code);
  };




  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerLabel = selectedCustomer
    ? `${selectedCustomer.name}${selectedCustomer.document ? ` (${selectedCustomer.document})` : ""}`
    : t("pos.foreign_client");
  const filteredCustomers = customers.filter((c) => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.document, c.phone, c.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });
  const isNational = selectedCustomer
    ? selectedCustomer.nationality === "PY"
    : false;

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.totalPrice, 0), [cart]);
  const autoFreight = useMemo(() => cart.reduce((acc, item) => acc + Number(item.freightAmount || 0) * Number(item.quantity || 0), 0), [cart]);
  const freight = manualFreightAmount != null ? manualFreightAmount : autoFreight;
  const rawDiscountAmount = discountMode === "PERCENT" ? subtotal * (Math.max(0, discountValue) / 100) : Math.max(0, discountValue);
  const discountAmount = Math.min(rawDiscountAmount, subtotal);
  const grandTotal = Math.max(0, subtotal - discountAmount) + freight;
  const budgetCompanyName = companyInfo.tradeName || companyInfo.companyName || "";
  const budgetMoney = (value: number) => formatCurrency(value, language);
  const budgetTextWidth = 82;
  const budgetLine = (left: string, right: string, width = budgetTextWidth) => {
    const cleanLeft = left.replace(/\s+/g, " ").trim();
    const cleanRight = right.trim();
    const maxLeft = Math.max(18, width - cleanRight.length - 2);
    const clippedLeft = cleanLeft.length > maxLeft ? `${cleanLeft.slice(0, Math.max(0, maxLeft - 1))}…` : cleanLeft;
    return `${clippedLeft}${" ".repeat(Math.max(2, width - clippedLeft.length - cleanRight.length))}${cleanRight}`;
  };
  const buildBudgetSummaryText = () => {
    const rows: string[] = [];
    rows.push("Resumo do orçamento".padStart(Math.floor((budgetTextWidth + "Resumo do orçamento".length) / 2)));
    rows.push("");
    rows.push("Cliente:");
    rows.push(selectedCustomerLabel);
    rows.push("");
    cart.forEach((item) => {
      rows.push(budgetLine(item.name, budgetMoney(item.totalPrice)));
      rows.push(`${item.quantity} × ${budgetMoney(item.unitPrice)}`);
      rows.push("-".repeat(34));
    });
    rows.push("");
    rows.push(budgetLine("Subtotal", budgetMoney(subtotal)));
    rows.push("");
    rows.push(budgetLine("Desconto", budgetMoney(discountAmount)));
    rows.push("");
    rows.push(budgetLine("Frete", budgetMoney(freight)));
    rows.push("");
    rows.push(budgetLine("Total", budgetMoney(grandTotal)));

    // WhatsApp usa fonte proporcional em mensagens normais; o bloco monoespaçado preserva alinhamento e espaços.
    return `\`\`\`\n${rows.join("\n")}\n\`\`\``;
  };
  const escapeBudgetHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const printBudget = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Permita pop-ups para imprimir ou salvar o orçamento em PDF.");
      return;
    }
    const logoSrc = companyInfo.logoUrl
      ? companyInfo.logoUrl.startsWith("/uploads/")
        ? `${window.location.origin}${companyInfo.logoUrl}`
        : companyInfo.logoUrl
      : "";
    const itemsHtml = cart.map((item) => `
      <tr>
        <td class="product">
          <strong>${escapeBudgetHtml(item.name)}</strong>
          <small>${escapeBudgetHtml(String(item.quantity))} × ${escapeBudgetHtml(budgetMoney(item.unitPrice))}</small>
        </td>
        <td class="total">${escapeBudgetHtml(budgetMoney(item.totalPrice))}</td>
      </tr>
    `).join("");
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resumo do orçamento</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 100%; max-width: 760px; margin: 0 auto; color: #111; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid #ddd; }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .logo { width: 54px; height: 54px; object-fit: contain; }
    .company { font-size: 16px; font-weight: 800; line-height: 1.15; }
    .muted { color: #444; font-size: 11px; line-height: 1.35; }
    h1 { margin: 16px 0 12px; text-align: center; font-size: 18px; letter-spacing: .02em; }
    .meta { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 14px; }
    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #555; }
    .client { font-size: 14px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; }
    tr { page-break-inside: avoid; }
    td { padding: 9px 0; border-bottom: 1px solid #e6e6e6; vertical-align: top; }
    td.product strong { display: block; font-size: 12.5px; color: #111; }
    td.product small { display: block; margin-top: 3px; color: #333; }
    td.total { width: 160px; text-align: right; font-weight: 800; color: #111; white-space: pre-line; }
    .summary { margin-top: 14px; margin-left: auto; width: min(310px, 100%); }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; color: #111; }
    .summary-row.total { margin-top: 6px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 17px; font-weight: 900; }
    .footer { margin-top: 18px; text-align: center; color: #555; font-size: 10px; }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="brand">
        ${logoSrc ? `<img class="logo" src="${escapeBudgetHtml(logoSrc)}" alt="Logo" />` : ""}
        <div>
          <div class="company">${escapeBudgetHtml(budgetCompanyName || "Orçamento")}</div>
          <div class="muted">${escapeBudgetHtml([companyInfo.documentNumber ? `${companyInfo.documentType}: ${companyInfo.documentNumber}` : "", companyInfo.phone ? `Tel: ${companyInfo.phone}` : "", companyInfo.email ? `Email: ${companyInfo.email}` : ""].filter(Boolean).join(" | "))}</div>
          ${companyInfo.address ? `<div class="muted">${escapeBudgetHtml(companyInfo.address)}</div>` : ""}
        </div>
      </div>
      <div class="muted" style="text-align:right">Gerado em<br><strong>${escapeBudgetHtml(new Date().toLocaleDateString("pt-BR"))}</strong></div>
    </header>
    <h1>RESUMO DO ORÇAMENTO</h1>
    <section class="meta">
      <div><div class="label">Cliente</div><div class="client">${escapeBudgetHtml(selectedCustomerLabel)}</div></div>
      <div class="muted" style="text-align:right">Orçamento gerado no PDV</div>
    </section>
    <table><tbody>${itemsHtml}</tbody></table>
    <section class="summary">
      <div class="summary-row"><span>Subtotal</span><strong>${escapeBudgetHtml(budgetMoney(subtotal))}</strong></div>
      <div class="summary-row"><span>Desconto</span><strong>${escapeBudgetHtml(budgetMoney(discountAmount))}</strong></div>
      <div class="summary-row"><span>Frete</span><strong>${escapeBudgetHtml(budgetMoney(freight))}</strong></div>
      <div class="summary-row total"><span>Total</span><strong>${escapeBudgetHtml(budgetMoney(grandTotal))}</strong></div>
    </section>
    <div class="footer">Orçamento sem valor fiscal. Valores sujeitos a confirmação no fechamento da venda.</div>
  </main>
  <script>window.onload = () => { window.focus(); setTimeout(() => window.print(), 250); };</script>
</body>
</html>`);
    printWindow.document.close();
  };
  const downloadBudgetPdf = async () => {
    if (cart.length === 0) {
      showNotice("Adicione produtos para gerar o orçamento.");
      return;
    }
    setIsDownloadingBudgetPdf(true);
    try {
      const res = await apiFetch("/api/sales/budget/pdf", {
        method: "POST",
        body: JSON.stringify({
          customerLabel: selectedCustomerLabel,
          items: cart.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
          })),
          subtotal,
          discountAmount,
          freight,
          grandTotal,
        }),
      });
      if (!res.ok) {
        const parsedError = await parseApiError(res);
        throw new Error(parsedError.message || "Não foi possível gerar o PDF do orçamento.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orcamento-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showNotice("PDF do orçamento baixado.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao baixar o PDF do orçamento.");
    } finally {
      setIsDownloadingBudgetPdf(false);
    }
  };

  const handleBudgetPdfAction = () => {
    if (isTouchMobileViewport()) {
      downloadBudgetPdf();
      return;
    }
    printBudget();
  };

  const copyBudgetSummary = async () => {
    try {
      await navigator.clipboard?.writeText(buildBudgetSummaryText());
      showNotice("Resumo do orçamento copiado.");
    } catch {
      toast.error("Não foi possível copiar o resumo automaticamente.");
    }
  };
  const lotRequiredItems = cart.filter((item) => item.requiresLot);
  const getItemLotRows = (productId: string) => lotDrafts[productId] || [{ lotNumber: "", quantity: "" }];
  const getItemLotInfo = (item: any) => {
    const rows = getItemLotRows(item.productId);
    const informed = rows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity || 0)), 0);
    return { rows, informed, remaining: Math.max(0, Number(item.quantity || 0) - informed), over: informed > Number(item.quantity || 0) };
  };
  const buildLotPayload = () => lotRequiredItems.flatMap((item) => getItemLotRows(item.productId)
    .filter((row) => row.lotNumber.trim() && Number(row.quantity) > 0)
    .map((row) => ({ productId: item.productId, lotNumber: row.lotNumber.trim(), quantity: Number(row.quantity) })));
  const hasCompleteLots = () => lotRequiredItems.every((item) => {
    const info = getItemLotInfo(item);
    return !info.over && info.informed === Number(item.quantity || 0);
  });
  const updateLotDraftRow = (productId: string, index: number, field: "lotNumber" | "quantity", value: string) => {
    setLotDrafts((prev) => {
      const rows = [...(prev[productId] || [{ lotNumber: "", quantity: "" }])];
      rows[index] = { ...rows[index], [field]: value };
      const item = cart.find((cartItem) => cartItem.productId === productId);
      const totalQty = Number(item?.quantity || 0);

      // Mantém a tela compacta: começa com 1 linha e só abre uma nova
      // quando a última linha tiver lote + quantidade e ainda faltar produto.
      const compactRows = rows.filter((row, rowIndex) => (
        rowIndex === 0 || row.lotNumber.trim() || String(row.quantity || "").trim()
      ));
      const safeRows = compactRows.length ? compactRows : [{ lotNumber: "", quantity: "" }];
      const informed = safeRows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity || 0)), 0);
      const last = safeRows[safeRows.length - 1];
      const lastIsComplete = Boolean(last?.lotNumber.trim()) && Number(last?.quantity || 0) > 0;

      if (informed < totalQty && lastIsComplete) {
        safeRows.push({ lotNumber: "", quantity: "" });
      }

      return { ...prev, [productId]: safeRows };
    });
  };

  const submitLotsAndSale = (allowPending = false) => {
    const hasOver = lotRequiredItems.some((item) => getItemLotInfo(item).over);
    if (hasOver) {
      setLotError("A quantidade dos lotes ultrapassa a quantidade vendida em um produto.");
      return;
    }
    if (!allowPending && !hasCompleteLots()) {
      setLotError("Preencha todos os lotes ou use a opção finalizar com lote pendente.");
      return;
    }
    setIsLotModalOpen(false);
    submitSale(buildLotPayload());
  };

  const renderCartPanel = (sideMode = false) => (
    <div className={`pos-cart-panel ${sideMode ? "pos-cart-panel-side bg-brand-navylight border border-gray-800 rounded-2xl shadow-md" : "lg:flex-1"} min-h-[8rem] sm:min-h-[12rem] lg:min-h-[16rem] flex flex-col overflow-hidden z-10`}>
      <div className="pos-cart-header px-4 py-3 border-b border-gray-800 font-semibold text-gray-300 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm">
        <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-brand-gold" /> {t("pos.cart").toUpperCase()} ({cart.length} {t("pos.items").toUpperCase()})</span>
        {sideMode ? (
          <span className="text-[11px] font-normal text-gray-500">Clique nos produtos para adicionar</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-normal text-gray-500">{t("pos.cart_help")}</span>
            <label className="pos-stock-toggle inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-800 bg-[#171717] px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:border-brand-gold/50 hover:text-brand-gold">
              <input
                type="checkbox"
                checked={hideOutOfStock}
                onChange={(event) => setHideOutOfStock(event.target.checked)}
                className="h-3.5 w-3.5 accent-brand-gold"
              />
              Ocultar sem estoque
            </label>
            <DisplayCurrencySelector />
          </div>
        )}
      </div>
      <div className="pos-cart-list flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col min-h-[9rem] items-center justify-center gap-3 text-center px-4">
            <div className="rounded-full bg-brand-navy/70 border border-gray-800 p-4"><ShoppingCart className="w-8 h-8 text-gray-600" /></div>
            <div className="text-sm font-medium text-gray-400">Nenhum produto na venda</div>
            <div className="text-xs text-gray-600 max-w-[18rem]">Busque pelo nome, SKU ou bipe o código de barras para adicionar ao carrinho.</div>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={idx + "-" + item.productId}
              className={`pos-cart-item p-2.5 border rounded-lg transition-colors
              ${idx === selectedCartIndex ? "bg-brand-navy border-brand-gold" : "bg-brand-navy/60 border-gray-800/50"}`}
              onClick={() => setSelectedCartIndex(idx)}
            >
              {sideMode ? (
                <>
                  <div className="pos-cart-product pos-cart-product-compact min-w-0">
                    <div className="pos-cart-compact-title text-white font-semibold truncate">
                      {item.name}
                    </div>
                    {item.availableBase != null && (
                      <div className={`text-[11px] ${item.quantity > item.availableBase ? "text-red-400 font-semibold" : "text-gray-500"}`}>
                        Estoque: {item.availableBase}{item.quantity > item.availableBase ? " · insuficiente!" : ""}
                      </div>
                    )}
                  </div>
                  <div className="pos-cart-actions pos-cart-actions-compact">
                    <div className="pos-cart-unit pos-cart-unit-compact text-gray-400">
                      <span className="pos-cart-mini-label">Un.</span>
                      <Money value={item.unitPrice} lang={language} />
                    </div>
                    <div className="pos-cart-quantity flex items-center gap-1" aria-label="Quantidade">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.productId, item.quantity - 1);
                        }}
                        className="pos-quantity-button h-9 w-9 rounded-lg bg-gray-800 text-base font-bold text-white hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700"
                      >
                        -
                      </Button>
                      <input
                        ref={(el) => { quantityInputRefs.current[idx] = el; }}
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.productId,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (searchInputRef.current)
                              searchInputRef.current.focus();
                          }
                        }}
                        className="pos-quantity-input w-11 text-center bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-brand-gold font-bold"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="pos-quantity-button h-9 w-9 rounded-lg bg-gray-800 text-base font-bold text-white hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700"
                      >
                        +
                      </Button>
                    </div>
                    <div className="pos-cart-total text-right font-bold text-white">
                      <span className="pos-cart-mini-label">Total</span>
                      <Money value={item.totalPrice} lang={language} />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.productId);
                      }}
                      className="pos-cart-remove h-auto rounded-none p-1.5 has-[>svg]:px-1.5 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pos-cart-product min-w-0">
                    <div className="text-white font-medium text-sm truncate pr-2">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      SKU: {item.sku}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      S/N: {item.serials?.length ? item.serials.join(", ") : "-"}
                    </div>
                    {item.availableBase != null && (
                      <div className={`text-[11px] mt-0.5 ${item.quantity > item.availableBase ? "text-red-400 font-semibold" : "text-gray-500"}`}>
                        Estoque: {item.availableBase}{item.quantity > item.availableBase ? " · insuficiente!" : ""}
                      </div>
                    )}
                  </div>
                  <div className="pos-cart-actions">
                    <div className="pos-cart-unit text-gray-400">
                      <Money value={item.unitPrice} lang={language} />
                    </div>
                    <div className="pos-cart-quantity flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.productId, item.quantity - 1);
                        }}
                        className="pos-quantity-button h-9 w-9 rounded-lg bg-gray-800 text-base font-bold text-white hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700"
                      >
                        -
                      </Button>
                      <input
                        ref={(el) => { quantityInputRefs.current[idx] = el; }}
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.productId,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (searchInputRef.current)
                              searchInputRef.current.focus();
                          }
                        }}
                        className="pos-quantity-input w-11 text-center bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-brand-gold font-bold"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="pos-quantity-button h-9 w-9 rounded-lg bg-gray-800 text-base font-bold text-white hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700"
                      >
                        +
                      </Button>
                    </div>
                    <div className="pos-cart-total text-right font-bold text-white">
                      <Money value={item.totalPrice} lang={language} />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.productId);
                      }}
                      className="pos-cart-remove h-auto rounded-none p-1.5 has-[>svg]:px-1.5 text-red-400 hover:bg-transparent hover:text-red-300 dark:hover:bg-transparent"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderCatalogProducts = () => (
    <div className="pos-catalog-panel flex min-h-[20rem] flex-1 flex-col overflow-hidden">
      <div className="pos-catalog-toolbar flex flex-col gap-2 border-b border-gray-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-brand-gold" /> Catálogo rápido</div>
          <div className="text-[11px] text-gray-500">Clique no produto para adicionar ao carrinho.</div>
        </div>
        <label className="pos-stock-toggle inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-800 bg-[#171717] px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:border-brand-gold/50 hover:text-brand-gold">
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(event) => setHideOutOfStock(event.target.checked)}
            className="h-3.5 w-3.5 accent-brand-gold"
          />
          Ocultar sem estoque
        </label>
      </div>
      <div className="pos-catalog-grid grid flex-1 auto-rows-min grid-cols-1 gap-2 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {catalogProducts.length > 0 ? (
          catalogProducts.map((p) => {
            const available = Number(p.stock ? p.stock.available : (p.physicalStock || 0) - (p.reservedStock || 0));
            const isAvailable = available > 0;
            return (
              <Button
                key={p.id}
                type="button"
                variant="ghost"
                disabled={!isAvailable}
                onClick={() => addToCart(p)}
                className={`pos-product-card group relative flex h-auto min-h-[6.25rem] flex-col items-stretch justify-start gap-0 overflow-hidden whitespace-normal rounded-xl border p-2 text-left font-normal transition disabled:opacity-100 ${isAvailable ? "border-gray-700 bg-[#171717] hover:border-brand-gold hover:bg-[#1c1c1c]" : "cursor-not-allowed border-red-500/30 bg-brand-navydark/70"}`}
              >
                {!isAvailable && (
                  <div className="pos-out-stock-overlay">
                    <span>Sem estoque</span>
                  </div>
                )}
                <div className="mb-1 min-h-[1.55rem] text-[11px] font-bold leading-snug text-white line-clamp-2">
                  {p.name}
                </div>
                <div className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.11em] text-gray-500">
                  Preço {priceTable === "A" ? "varejo" : "atacado"}
                </div>
                <div className="pos-product-card-price mb-1.5 border-b border-gray-800 pb-1 text-[11px] font-extrabold text-brand-gold">
                  <Money value={currentPrice(p)} lang={language} />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 text-[8.5px] text-gray-400">
                  <span className="min-w-0 truncate">Est: {available} | SKU: {p.sku || "—"}</span>
                  <span className="shrink-0 font-bold text-brand-gold">+ Add</span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[7.5px] text-gray-500" title={getProductSerialPreview(p)}>
                  S/N: {getProductSerialPreview(p)}
                </div>
              </Button>
            );
          })
        ) : (
          <div className="col-span-full flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-gray-800 text-sm text-gray-500">
            {hideOutOfStock ? "Nenhum produto com estoque para exibir." : t("pos.product_not_found")}
          </div>
        )}
      </div>
    </div>
  );

  if (editLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t("pos.loading_sale")}
      </div>
    );
  }

  return (
    <div className="pos-page flex h-full flex-col gap-3 md:gap-4 relative">
      {isEditing && (
        <div className="pos-page-actions flex w-full flex-wrap items-center justify-end gap-2 md:gap-3">
          {isEditing && (
            <Card className="border-blue-500/30 bg-blue-500/10 py-0 text-blue-300">
              <CardContent className="flex items-center gap-4 px-4 py-2">
                <span className="font-bold">{t("pos.editing_sale")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/sales")}
                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200"
                >
                  {t("pos.cancel_edit")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {posNotice && (
        <div className="fixed right-4 top-20 z-[70] rounded-xl border border-brand-gold/30 bg-brand-navylight/95 px-4 py-3 text-sm font-semibold text-brand-gold shadow-2xl backdrop-blur-md">
          {posNotice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-5 lg:flex-1 lg:min-h-0">
        {/* Left Column: Search & List */}
        <div className="lg:col-span-2 flex flex-col gap-3 relative lg:min-h-0">
          <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-gray-800 bg-[#171717] p-3">
          {!isEditing && (
            <div className="pos-note-tabs flex flex-wrap items-center gap-2">
              {notes.map((note) => (
                <Button
                  key={note.id}
                  type="button"
                  variant={note.id === activeNoteId ? "default" : "outline"}
                  className="pos-note-tab group h-auto gap-1 rounded-lg py-2 text-xs font-bold"
                  onClick={() => switchPosNote(note.id)}
                >
                  <span>{note.title}</span>
                  <span className="opacity-70">({note.cart.length})</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closePosNote(note.id);
                    }}
                    className={`ml-1 rounded px-1 text-sm leading-none ${
                      note.id === activeNoteId
                        ? "text-brand-navydark/70 hover:bg-brand-navydark/10"
                        : "text-gray-500 hover:bg-gray-800 hover:text-red-300"
                    }`}
                    title={t("pos.note_discarded")}
                  >
                    ×
                  </span>
                </Button>
              ))}
              <Button type="button" variant="outline" className="pos-note-new h-auto gap-1 rounded-lg py-2 text-xs font-bold text-brand-gold" onClick={createNewNote}>
                <Plus className="h-3.5 w-3.5" /> {t("pos.new_note")}
              </Button>
            </div>
          )}

          <div ref={searchShellRef} className="product-search-shell relative z-40">
            <Search className="w-6 h-6 absolute left-4 top-3 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPointerDown={handleProductSearchPointerDown}
              onClick={handleProductSearchClick}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("pos.search_placeholder")}
              className="w-full border rounded-xl pl-12 pr-14 md:pr-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold bg-[#171717] border-gray-700"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsBarcodeScannerOpen(true); }}
              title={t("pos.scan_barcode")}
              className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg border border-gray-700 bg-[#171717] text-brand-gold hover:bg-[#1c1c1c] hover:text-brand-gold md:hidden"
            >
              <Camera className="size-5" />
            </Button>

            {isProductSearchOpen && !isCatalogLayout && (
              <div
                ref={productListRef}
                className="product-search-list absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-[min(60vh,34rem)] overflow-y-auto rounded-xl border border-gray-700 bg-brand-navylight shadow-2xl z-50"
              >
                {catalogProducts.length > 0 ? (
                  catalogProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      ref={(el) => { productItemRefs.current[idx] = el; }}
                      onMouseEnter={() => setSelectedSearchIndex(idx)}
                      onPointerDown={handleProductPointerDown}
                      onPointerUp={(e) => handleProductPointerUp(e, p)}
                      onPointerCancel={() => {
                        productPointerRef.current = null;
                      }}
                      className={`product-search-item relative p-4 border-b border-gray-800/50 cursor-pointer flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center transition ${idx === selectedSearchIndex ? "bg-brand-navy border-brand-gold/30" : "hover:bg-brand-navy"}`}
                    >
                      <div className="flex min-w-0 flex-1 gap-3 items-center">
                        {idx === selectedSearchIndex && (
                          <div className="w-1.5 h-full absolute left-0 bg-brand-gold rounded-r-md"></div>
                        )}
                        <div className="min-w-0">
                          <div className="product-result-name font-medium text-white text-lg">
                            {p.name}
                          </div>
                          <div className="product-result-meta text-sm text-gray-400 font-mono mt-1">
                            <span className="product-result-meta-fixed">SKU: {p.sku}</span>
                            {p.upc ? <span className="product-result-meta-fixed product-result-upc">| UPC: {p.upc}</span> : null}
                            <span
                              className="product-result-serial"
                              title={p.hasSerialNumber
                                ? `S/N disponível: ${getProductSerialPreview(p)}`
                                : "Produto sem controle de número de série"}
                            >
                              | S/N: {getProductSerialPreview(p)}
                            </span>
                            <span className="product-result-meta-fixed">
                              | {t("pos.stock_available")}: {" "}
                              {p.stock
                                ? p.stock.available
                                : (p.physicalStock || 0) - (p.reservedStock || 0)}
                            </span>
                            {Number(p.freightAmount || 0) > 0 && (
                              <span className="product-result-meta-fixed">| Frete: <Money value={p.freightAmount} lang={language} /></span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="product-result-price shrink-0 text-brand-gold font-bold text-xl self-end sm:self-auto">
                        <Money value={currentPrice(p)} lang={language} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center text-gray-400">
                    {hideOutOfStock ? "Nenhum produto com estoque para exibir." : t("pos.product_not_found")}
                  </div>
                )}
              </div>
            )}
          </div>

          {isCatalogLayout ? renderCatalogProducts() : renderCartPanel(false)}
          </div>
        </div>

        {/* Right Column: Checkout Info */}
        <div className={`pos-checkout ${isCatalogLayout ? "pos-checkout-catalog" : ""} bg-[#171717] border border-gray-800 rounded-2xl p-4 md:p-5 shadow-md flex min-h-0 flex-col gap-3 overflow-y-auto md:gap-4`}>
          <div ref={customerBoxRef} className="relative">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              <UserIcon className="w-4 h-4" /> {t("pos.client")}
            </label>
            <input
              ref={customerSearchRef}
              type="text"
              value={isCustomerSearchOpen ? customerQuery : selectedCustomerLabel}
              onFocus={() => {
                setIsCustomerSearchOpen(true);
                setCustomerQuery("");
                fetchCustomers("");
              }}
              onClick={() => {
                setIsCustomerSearchOpen(true);
                fetchCustomers(customerQuery);
              }}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setIsCustomerSearchOpen(true);
              }}
              placeholder={t("pos.search_customer")}
              className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-brand-gold transition"
            />
            {isCustomerSearchOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-64 overflow-y-auto rounded-lg border border-gray-700 bg-[#171717] shadow-2xl">
                <button
                  type="button"
                  onClick={() => handleCustomerChange("")}
                  className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {t("pos.foreign_client")}
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomerChange("__create_customer__")}
                  className="block w-full border-t border-gray-800 px-4 py-2.5 text-left text-sm font-bold text-brand-gold hover:bg-brand-navylight"
                >
                  {t("pos.create_customer")}
                </button>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleCustomerChange(c.id)}
                      className="block w-full border-t border-gray-800 px-4 py-2.5 text-left text-sm text-gray-100 hover:bg-blue-700"
                    >
                      <span className="font-semibold">{c.name}</span>
                      {c.document && <span className="ml-1 text-gray-300">({c.document})</span>}
                    </button>
                  ))
                ) : (
                  <div className="border-t border-gray-800 px-4 py-3 text-sm text-gray-400">
                    {t("pos.no_customer_found")}
                  </div>
                )}
              </div>
            )}
            {!selectedCustomerId && (
              <p className="mt-1.5 text-[10px] font-normal leading-tight text-gray-500">
                {t("pos.foreign_default")}
              </p>
            )}
          </div>

          {isCatalogLayout && renderCartPanel(true)}

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              <Tag className="w-4 h-4" /> {t("pos.price_table")}
            </label>
            <div className="flex gap-2">
              {(["A", "B"] as const).map((table) => (
                <Button
                  key={table}
                  variant={priceTable === table ? "default" : "outline"}
                  className="h-auto flex-1 rounded-lg py-2.5 text-sm font-bold"
                  onClick={() => setPriceTable(table)}
                >
                  {table === "A" ? t("pos.retail") : t("pos.wholesale")}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              {t("pos.notes")}
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder={t("pos.notes_placeholder")}
              className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-brand-gold resize-none"
            ></textarea>
          </div>

          <div>
            {(showDueDate || dueDate) ? (
              <>
                <label className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  <span>Vencimento (a prazo)</span>
                  <button type="button" onClick={() => { setDueDate(""); setShowDueDate(false); }} className="text-[11px] normal-case font-normal text-gray-500 hover:text-red-300">remover</button>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-brand-gold"
                />
                <p className="text-[11px] text-gray-500 mt-1">Define quando a venda vence em Contas a Receber.</p>
              </>
            ) : (
              <button type="button" onClick={() => setShowDueDate(true)} className="text-xs text-gray-400 hover:text-brand-gold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Definir vencimento (venda a prazo)
              </button>
            )}
          </div>

          {customerCredit && customerCredit.creditLimit > 0 && (
            <Card className={`py-0 text-xs ${customerCredit.available !== null && customerCredit.available <= 0 ? "border-red-500/40 bg-red-500/10 text-red-200" : ""}`}>
              <CardContent className="p-2.5">
                <div className="font-semibold mb-0.5">Crédito do cliente</div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <span>Limite: <Money value={customerCredit.creditLimit} lang="pt-BR" /></span>
                  <span>Em aberto: <Money value={customerCredit.outstanding} lang="pt-BR" /></span>
                  {customerCredit.available !== null && <span>Disponível: <Money value={customerCredit.available} lang="pt-BR" /></span>}
                </div>
                {customerCredit.available !== null && customerCredit.available <= 0 && <div className="mt-1 font-semibold">Cliente sem crédito disponível. Venda a prazo será bloqueada.</div>}
              </CardContent>
            </Card>
          )}

          <div className="pos-delivery-card rounded-lg border border-gray-800 bg-brand-navy/45 p-2.5">
            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <Truck className="h-3.5 w-3.5" /> Entrega
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={deliveryStatus}
                onChange={(e) => {
                  const nextStatus = e.target.value as "PENDING" | "DELIVERING" | "DELIVERED";
                  setDeliveryStatus(nextStatus);
                  if (nextStatus === "PENDING") {
                    setDeliveryScheduledAt("");
                  } else if (!deliveryScheduledAt) {
                    setDeliveryScheduledAt(getTodayDateInputValue());
                  }
                }}
                className="rounded-lg border border-gray-700 bg-[#171717] px-2.5 py-2 text-sm text-white outline-none focus:border-brand-gold"
              >
                <option value="DELIVERED">Retirada / entregue</option>
                <option value="PENDING">Aguardando entrega</option>
                <option value="DELIVERING">Saiu para entrega</option>
              </select>
              <input
                type="date"
                value={deliveryScheduledAt}
                onChange={(e) => setDeliveryScheduledAt(e.target.value)}
                className="rounded-lg border border-gray-700 bg-[#171717] px-2.5 py-2 text-sm text-white outline-none focus:border-brand-gold"
              />
            </div>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Obs. entrega: período, endereço ou referência..."
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#171717] px-2.5 py-2 text-xs text-white outline-none focus:border-brand-gold"
            />
          </div>

          <div className="pos-summary mt-auto border-t border-gray-800 pt-4 space-y-2">
            <div className="pos-summary-row flex justify-between text-gray-400 font-medium">
              <span>{t("pos.subtotal")}</span>
              <Money value={subtotal} lang={language} className="pos-summary-money" />
            </div>
            <div className="pos-summary-row flex items-center justify-between text-gray-400 font-medium">
              <span>Desconto</span>
              <span className="flex items-center gap-2">
                <Money value={discountAmount} lang={language} className="pos-summary-money text-red-300" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="text-gray-400 hover:text-brand-gold"
                  title="Alterar desconto"
                  onClick={() => {
                    setDiscountModeDraft(discountMode);
                    setDiscountDraft(Number(discountValue || 0));
                    setIsDiscountModalOpen(true);
                  }}
                >
                  <Percent className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <div className="pos-summary-row flex items-center justify-between text-gray-400 font-medium">
              <span>{t("pos.tax")}</span>
              <span className="flex items-center gap-2">
                <Money value={freight} lang={language} className="pos-summary-money" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="text-gray-400 hover:text-brand-gold"
                  title="Alterar frete"
                  onClick={() => {
                    setFreightDraft(Number(freight.toFixed(4)));
                    setIsFreightModalOpen(true);
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <Card className="mt-2 border-primary/30 bg-primary/10 py-0">
              <CardContent className="pos-summary-total flex items-center justify-between px-4 py-3">
                <span className="text-sm font-bold uppercase tracking-wide text-primary/90">{t("pos.total")}</span>
                <Money value={grandTotal} lang={language} className="pos-summary-grand-total text-2xl md:text-3xl font-black text-primary" />
              </CardContent>
            </Card>
          </div>

          <div className="sticky bottom-0 z-10 -mx-1 mt-3 flex flex-col gap-2 border-t border-gray-800/60 bg-brand-navylight/95 px-1 pt-3 pb-1 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              disabled={cart.length === 0}
              onClick={() => setIsBudgetModalOpen(true)}
              className="h-auto w-full rounded-xl py-2.5 text-sm font-bold border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
            >
              <FileText className="h-4 w-4" /> Gerar Orçamento
            </Button>

            <Button
              type="button"
              disabled={cart.length === 0 || isSubmitting}
              onClick={confirmSale}
              className="h-auto w-full rounded-xl py-3.5 text-base font-black shadow-lg shadow-primary/10 md:py-4 md:text-lg"
            >
              <CheckCircle className="w-7 h-7" />
              {isSubmitting
                ? t("pos.processing")
                : isEditing
                  ? t("pos.save")
                  : t("pos.confirm_sale")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isFreightModalOpen}
        onClose={() => setIsFreightModalOpen(false)}
        title="Editar frete"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!Number.isFinite(freightDraft) || freightDraft < 0) {
              toast.error("Valor de frete inválido.");
              return;
            }
            setManualFreightAmount(Number(freightDraft.toFixed(4)));
            setIsFreightModalOpen(false);
          }}
          className="space-y-4"
        >
          <PriceCurrencyInput
            label="Valor total do frete"
            value={freightDraft}
            onChange={setFreightDraft}
            helperText={systemCurrency === "DUAL"
              ? "Escolha US$ ou R$. A conversão usa a cotação configurada e o valor-base é salvo em dólar."
              : "Informe o valor na moeda configurada para o sistema."}
          />

          <Card className="py-0">
            <CardContent className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-gray-500">
              <span>Frete automático dos produtos</span>
              <Money value={autoFreight} lang={language} className="text-right text-gray-400" />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setManualFreightAmount(null);
                setFreightDraft(Number(autoFreight.toFixed(4)));
                setIsFreightModalOpen(false);
              }}
            >
              Usar frete automático
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setIsFreightModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 sm:flex-none">
                Aplicar frete
              </Button>
            </div>
          </div>
        </form>
      </Modal>



      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Desconto da venda"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!Number.isFinite(discountDraft) || discountDraft < 0) {
              toast.error("Desconto inválido.");
              return;
            }
            setDiscountMode(discountModeDraft);
            setDiscountValue(Number(discountDraft));
            setIsDiscountModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-800 bg-[#171717] p-1">
            <Button
              type="button"
              variant={discountModeDraft === "VALUE" ? "default" : "ghost"}
              size="sm"
              className={discountModeDraft === "VALUE" ? undefined : "text-gray-400 hover:text-white"}
              onClick={() => setDiscountModeDraft("VALUE")}
            >
              Valor
            </Button>
            <Button
              type="button"
              variant={discountModeDraft === "PERCENT" ? "default" : "ghost"}
              size="sm"
              className={discountModeDraft === "PERCENT" ? undefined : "text-gray-400 hover:text-white"}
              onClick={() => setDiscountModeDraft("PERCENT")}
            >
              %
            </Button>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountDraft}
            onChange={(e) => setDiscountDraft(Number(e.target.value || 0))}
            className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
            placeholder={discountModeDraft === "PERCENT" ? "Ex.: 10" : "Ex.: 50.00"}
          />
          <Card className="py-0">
            <CardContent className="px-3 py-2 text-xs text-gray-400">
              Prévia do desconto: <Money value={discountModeDraft === "PERCENT" ? subtotal * (Math.max(0, discountDraft) / 100) : discountDraft} lang={language} className="font-bold text-red-300" />
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setDiscountValue(0); setDiscountMode("VALUE"); setIsDiscountModalOpen(false); }}>Remover</Button>
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isLotModalOpen}
        onClose={() => setIsLotModalOpen(false)}
        title="Informar lotes obrigatórios"
      >
        <div className="lot-modal space-y-4">
          <Card className="py-0">
            <CardContent className="px-3 py-2 text-xs text-gray-400">
              Informe um lote por linha. A venda pode seguir com lote pendente, mas ficará marcada para completar depois em Vendas Realizadas.
            </CardContent>
          </Card>
          {lotRequiredItems.map((item) => {
            const info = getItemLotInfo(item);
            return (
              <Card key={item.productId} className="py-0 border-gray-800 bg-brand-navy/50">
                <CardContent className="p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <div className={`text-xs font-bold ${info.over ? "text-red-300" : info.remaining === 0 ? "text-emerald-300" : "text-brand-gold"}`}>
                    Informado: {info.informed} / {item.quantity} · Restante: {Math.max(0, item.quantity - info.informed)}
                  </div>
                </div>
                {(lotSuggestions[item.productId] || []).length > 0 && (
                  <div className="mb-2">
                    <div className="text-[11px] text-gray-500 mb-1">Lotes disponíveis (vence primeiro à esquerda). Clique para usar:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(lotSuggestions[item.productId] || []).map((s) => (
                        <Button
                          key={s.lotNumber}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto border-gray-700 bg-[#171717] px-2 py-1 text-xs text-gray-200 hover:border-brand-gold hover:bg-[#171717] hover:text-white"
                          onClick={() => applyLotSuggestion(item.productId, s.lotNumber, s.physicalStock)}
                          title={s.expiryDate ? `Validade ${formatDate(s.expiryDate, language)}` : "Sem validade"}
                        >
                          <span className="font-semibold text-brand-gold">{s.lotNumber}</span>
                          <span className="text-gray-400"> · {s.physicalStock} un</span>
                          {s.expiryDate && <span className="text-gray-500"> · val {formatDate(s.expiryDate, language)}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {info.rows.map((row, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-gray-400">
                        Lote:
                        <input value={row.lotNumber} onChange={(e) => updateLotDraftRow(item.productId, index, "lotNumber", e.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none" placeholder="" />
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#171717] px-2 py-1.5 text-xs text-gray-400">
                        Qtd:
                        <input type="number" min="0" value={row.quantity} onChange={(e) => updateLotDraftRow(item.productId, index, "quantity", e.target.value)} className="w-full bg-transparent text-center text-sm font-bold text-white outline-none" />
                      </label>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>
            );
          })}
          {lotError && (
            <Card className="border-red-500/30 bg-red-500/10 py-0">
              <CardContent className="px-3 py-2 text-sm text-red-300">{lotError}</CardContent>
            </Card>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 hover:text-yellow-200"
              onClick={() => submitLotsAndSale(true)}
            >
              Finalizar com lote pendente
            </Button>
            <Button type="button" onClick={() => submitLotsAndSale(false)}>Confirmar lotes e finalizar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Resumo do orçamento"
      >
        <div className="pos-budget-modal space-y-4">
          <div className="rounded-xl border border-gray-800 bg-white p-4 text-black shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="min-w-0">
                {budgetCompanyName && <div className="mb-1 text-sm font-black uppercase tracking-wide text-black">{budgetCompanyName}</div>}
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-600">Cliente</div>
                <div className="font-bold text-black">{selectedCustomerLabel}</div>
              </div>
              <div className="text-right text-[11px] text-gray-600">Orçamento gerado no PDV</div>
            </div>
            <div className="divide-y divide-gray-200">
              {cart.map((item) => (
                <div key={item.productId} className="grid grid-cols-[1fr_auto] gap-3 py-2.5 text-sm text-black">
                  <div className="min-w-0">
                    <div className="font-bold text-black">{item.name}</div>
                    <div className="mt-0.5 text-xs text-gray-700">{item.quantity} × <Money value={item.unitPrice} lang={language} /></div>
                  </div>
                  <Money value={item.totalPrice} lang={language} className="text-right font-black text-black" />
                </div>
              ))}
            </div>
            <div className="ml-auto mt-4 max-w-sm space-y-1 border-t border-gray-200 pt-3 text-sm text-black">
              <div className="flex justify-between gap-4"><span>Subtotal</span><Money value={subtotal} lang={language} className="font-bold" /></div>
              <div className="flex justify-between gap-4"><span>Desconto</span><Money value={discountAmount} lang={language} className="font-bold" /></div>
              <div className="flex justify-between gap-4"><span>Frete</span><Money value={freight} lang={language} className="font-bold" /></div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-lg font-black"><span>Total</span><Money value={grandTotal} lang={language} className="font-black" /></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleBudgetPdfAction} disabled={isDownloadingBudgetPdf}>{isDownloadingBudgetPdf ? "Gerando PDF..." : isMobileBudgetAction ? "Baixar PDF" : "Imprimir / PDF"}</Button>
            <Button type="button" onClick={copyBudgetSummary}>Copiar resumo</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title={t("pos.create_customer_title")}
      >
        <form onSubmit={submitQuickCustomer} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("pos.type")}
              </label>
              <select
                value={quickCustomerForm.nationality}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    nationality: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
              >
                <option value="FOREIGN">{t("pos.foreign")}</option>
                <option value="PY">{t("pos.national_py")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("pos.document")}
              </label>
              <input
                type="text"
                value={quickCustomerForm.document}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    document: e.target.value,
                  })
                }
                placeholder="CPF, passaporte, CI ou RUC"
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
              />
              {quickCustomerFields.document && (
                <p className="mt-1 text-xs text-red-400">
                  {quickCustomerFields.document}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("pos.customer_name")}
            </label>
            <input
              required
              type="text"
              value={quickCustomerForm.name}
              onChange={(e) =>
                setQuickCustomerForm({
                  ...quickCustomerForm,
                  name: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
            />
            {quickCustomerFields.name && (
              <p className="mt-1 text-xs text-red-400">
                {quickCustomerFields.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("pos.phone")}
              </label>
              <input
                type="text"
                value={quickCustomerForm.phone}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    phone: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("pos.email")}
              </label>
              <input
                type="email"
                value={quickCustomerForm.email}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    email: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-700 bg-[#171717] px-4 py-2 text-white outline-none focus:border-brand-gold"
              />
              {quickCustomerFields.email && (
                <p className="mt-1 text-xs text-red-400">
                  {quickCustomerFields.email}
                </p>
              )}
            </div>
          </div>

          {quickCustomerError && (
            <Card className="border-red-500/30 bg-red-500/10 py-0">
              <CardContent className="px-3 py-2 text-sm text-red-300">
                {quickCustomerError}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomerModalOpen(false)}
            >
              {t("pos.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSavingCustomer}
            >
              {isSavingCustomer ? t("pos.saving") : t("pos.create_and_select")}
            </Button>
          </div>
        </form>
      </Modal>

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onDetected={handleBarcodeDetected}
        title={t("scanner.title")}
      />

      <Modal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title={
          <span className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-brand-gold" />
            {t("pos.shortcuts")} do PDV
          </span>
        }
        maxWidth="max-w-lg"
      >
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          {Object.entries({
            "Focar busca de produto": shortcuts.focusProductSearch,
            "Focar busca de cliente": shortcuts.focusCustomerSearch,
            "Alternar tabela A/B": shortcuts.togglePriceTable,
            "Editar quantidade do item selecionado":
              shortcuts.focusQuantity,
            "Finalizar venda": shortcuts.finishSale,
            "Limpar carrinho": shortcuts.clearCart,
            "Remover item do carrinho": shortcuts.removeCartItem,
            "Aumentar / Diminuir quantidade": `${shortcuts.increaseQuantity} / ${shortcuts.decreaseQuantity}`,
            "Navegar resultados/carrinho": "Setas ↑ ↓",
            "Confirmar/Selecionar": shortcuts.confirmAction,
            "Cancelar/Fechar": shortcuts.cancelAction,
          }).map(([desc, key]) => (
            <React.Fragment key={desc}>
              <div className="text-gray-400 text-sm">{desc}</div>
              <div className="text-right">
                <kbd className="bg-[#171717] border border-gray-700 rounded px-2 py-1 text-brand-gold font-mono text-xs shadow-sm font-bold">
                  {key}
                </kbd>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="mt-4 flex justify-center border-t border-gray-800 pt-4">
          <Button variant="outline" onClick={() => setShowShortcuts(false)}>
            {t("pos.cancel")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
