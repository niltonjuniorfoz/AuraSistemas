import { useNavigate } from "react-router";
import React, { useEffect, useState, useMemo } from "react";
import { Archive, Package, Plus, Search, Tag, Filter, Edit, Trash2, Camera, Upload, Loader2, Globe2, EyeOff } from "lucide-react";
import { toast } from "../components/Toast";
import { compressImage } from "../lib/imageUpload";
import { useAuthStore } from "../stores/authStore";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { HardDeleteModal } from "../components/HardDeleteModal";
import { StockModal } from "../components/StockModal";
import { QuickGroupModal } from "../components/QuickGroupModal";
import { QuickSubgroupModal } from "../components/QuickSubgroupModal";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { apiFetch, parseApiError } from "../lib/api";
import { Money } from "../components/Money";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CompositionDonut } from "../components/charts";
import { PriceCurrencyInput } from "../components/PriceCurrencyInput";
import { parseMoneyInput, round2 } from "../lib/money";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

function stockBadgeVariant(qty: number): "destructive" | "warning" | "success" {
  if (qty <= 0) return "destructive";
  if (qty <= 5) return "warning";
  return "success";
}

// Esqueleto compartilhado (label / valor / sub) pros 4 cards do infográfico — mesma estrutura
// em todos garante que o número grande sente na mesma altura em qualquer um deles.
function KpiTile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <Card className={`py-0 ${accent || "border-gray-700 bg-brand-navylight"}`}>
      <CardContent className="p-4">
        <div className="text-[11px] text-gray-400">{label}</div>
        <div className="mt-1 text-2xl font-black leading-tight text-white">{value}</div>
      <div className="mt-0.5 text-[10px] text-gray-500">{sub || " "}</div>
      </CardContent>
    </Card>
  );
}

// Ajuda de precificação: digita a margem % sobre o custo e o preço de venda sobe sozinho.
// Não sincroniza de volta (editar o preço direto não atualiza esse campo) — é só um atalho de cálculo.
function MarginPercentInput({ costPrice, price, onApply }: { costPrice: number; price: number; onApply: (newPrice: number) => void }) {
  const [draft, setDraft] = useState("");
  const currentMargin = costPrice > 0 ? ((Number(price) || 0) - costPrice) / costPrice * 100 : null;

  return (
    <div className="product-margin-row">
      <label className="product-margin-label">Margem s/ custo</label>
      <div className="product-margin-input-shell">
        <input
          type="text"
          inputMode="decimal"
          placeholder={currentMargin != null ? currentMargin.toFixed(0) : "—"}
          value={draft}
          disabled={costPrice <= 0}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const margin = parseMoneyInput(raw);
            if (!Number.isFinite(margin) || costPrice <= 0) return;
            onApply(round2(costPrice * (1 + margin / 100)));
          }}
          onBlur={() => setDraft("")}
          className="product-margin-input"
          title={costPrice <= 0 ? "Informe o preço de custo pra usar a margem." : "Margem sobre o preço de custo"}
        />
        <span className="product-margin-suffix">%</span>
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function Products() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = ["admin", "master"].includes(user?.role?.toLowerCase() || "");
  
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    groupId: "", subgroupId: "", shelfId: "",
    stockStatus: "", hasImage: "", hasSerialNumber: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("basic"); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [blockingErrors, setBlockingErrors] = useState<Record<string, string>>({});
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);

  const defaultFormData = { 
    name: '', sku: '', upc: '', description: '', brand: '', model: '', imageUrl: '',
    groupId: '', subgroupId: '', unitMeasure: 'UN',
    weightKg: 0, widthCm: 0, heightCm: 0, lengthCm: 0,
    shelfId: '', initialPhysicalStock: 0, minStock: 0, hasSerialNumber: false, requiresLot: false, entryReason: 'Estoque Inicial',
    ofertaQty: 0, ofertaPrice: 0, outletQty: 0, outletPrice: 0,
    costPrice: 0, costCurrency: 'BRL', salePriceA: 0, salePriceB: 0, ivaPercentage: 0,
    parentId: '', variantName: '', storeVisible: false
  };
  const [formData, setFormData] = useState(defaultFormData);
  // Estoque físico ATUAL do produto sendo editado — só pra feedback visual
  // imediato de "Oferta+Outlet passou do estoque" no modal; a validação de
  // verdade é sempre no servidor (products.ts).
  const [editingPhysicalStock, setEditingPhysicalStock] = useState(0);
  const [productSerialsList, setProductSerialsList] = useState<any[]>([]);
  const [productLotsList, setProductLotsList] = useState<any[]>([]);
  const [serials, setSerials] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null); // 'main' | 'extra-N'

  // Upload com compressão no navegador → vira base64 (mesmo campo que aceita URL).
  const handleImageFile = async (file: File | undefined, target: 'main' | number) => {
    if (!file) return;
    const key = target === 'main' ? 'main' : `extra-${target}`;
    setUploadingImg(key);
    try {
      const dataUrl = await compressImage(file);
      if (target === 'main') {
        updateProductField('imageUrl', dataUrl);
      } else {
        setImages(prev => prev.map((img, idx) => idx === target ? { ...img, imageUrl: dataUrl } : img));
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar a imagem.');
    } finally {
      setUploadingImg(null);
    }
  };
  const [technicalSpecs, setTechnicalSpecs] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCooldown, setAiCooldown] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<{ type: "info" | "success" | "error"; message: string } | null>(null);
  const [isUpcScannerOpen, setIsUpcScannerOpen] = useState(false);
  const [isSerialScannerOpen, setIsSerialScannerOpen] = useState(false);

  const updateProductField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setBlockingErrors(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setFormError("");
  };

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let controller = new AbortController();
    fetchProducts(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch, filters]);

  useEffect(() => {
    if (groups.length === 0) fetchGroupsAndShelves();
  }, []);

  useEffect(() => {
    if (aiCooldown <= 0) return;
    const timer = window.setInterval(() => setAiCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [aiCooldown]);

  // Séries/lotes do produto em edição, pra escolher quais unidades entram
  // em Oferta/Outlet. Só busca com o modal aberto num produto já salvo (S/N
  // e lote não existem antes de o produto ter estoque de verdade).
  useEffect(() => {
    if (!editingId) { setProductSerialsList([]); setProductLotsList([]); return; }
    if (formData.hasSerialNumber) {
      apiFetch(`/api/serials/${editingId}`).then(r => r.json()).then(j => setProductSerialsList(Array.isArray(j) ? j : [])).catch(() => {});
    }
    if (formData.requiresLot) {
      apiFetch(`/api/lots/product/${editingId}`).then(r => r.json()).then(j => setProductLotsList(j.data || [])).catch(() => {});
    }
  }, [editingId, formData.hasSerialNumber, formData.requiresLot]);

  const fetchProducts = async (q: string, signal?: AbortSignal) => {
    setProductsLoading(true);
    try {
      const qs = new URLSearchParams({ q, page: "1", limit: "50" });
      if (filters.groupId) qs.set("groupId", filters.groupId);
      if (filters.subgroupId) qs.set("subgroupId", filters.subgroupId);
      if (filters.shelfId) qs.set("shelfId", filters.shelfId);
      if (filters.stockStatus) qs.set("stockStatus", filters.stockStatus);
      if (filters.hasImage) qs.set("hasImage", filters.hasImage);
      if (filters.hasSerialNumber) qs.set("hasSerialNumber", filters.hasSerialNumber);

      const res = await apiFetch(`/api/products?${qs.toString()}`, { signal });
      const resData = await res.json();
      if(resData.data && Array.isArray(resData.data)) setProducts(resData.data);
    } catch(err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    } finally {
      if (!signal?.aborted) setProductsLoading(false);
    }
  };

  const fetchGroupsAndShelves = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        apiFetch("/api/groups"),
        apiFetch("/api/shelves")
      ]);
      const gData = await gRes.json();
      const sData = await sRes.json();
      if(gData.data) setGroups(gData.data);
      if(sData.data) setShelves(sData.data);
    } catch (error) {
      console.error(error);
    }
  };

  const generateSku = async () => {
    if (!formData.groupId) {
      alert("Selecione um grupo antes de gerar o SKU.");
      setFieldErrors(prev => ({ ...prev, sku: "Selecione um grupo antes de gerar o SKU." }));
      return;
    }
    try {
      const url = `/api/products/next-sku?groupId=${formData.groupId}${formData.subgroupId ? '&subgroupId=' + formData.subgroupId : ''}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        updateProductField('sku', data.sku);
        setFieldErrors(prev => { const copy = {...prev}; delete copy.sku; return copy; });
        setBlockingErrors(prev => { const copy = {...prev}; delete copy.sku; return copy; });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const promptCreateGroup = () => {
    setShowGroupModal(true);
  };

  const promptCreateSubgroup = () => {
    if (!formData.groupId) {
      alert("Selecione um grupo antes de criar um subgrupo.");
      return;
    }
    setShowSubgroupModal(true);
  };

  const handleCheckSku = async () => {
    if (!formData.sku) return;
    try {
      const url = `/api/products/check-sku?sku=${encodeURIComponent(formData.sku)}${editingId ? '&excludeId='+editingId : ''}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setBlockingErrors(prev => ({ ...prev, sku: data.message || "Já existe produto com este SKU" }));
        } else {
          setBlockingErrors(prev => { const copy={...prev}; delete copy.sku; return copy; });
        }
      }
    } catch {}
  };

  const handleCheckUpc = async (upcOverride?: string) => {
    // Aceita o código escaneado por parâmetro em vez de só ler formData.upc — o onDetected do
    // scanner chama isto logo após updateProductField, e o closure do evento ainda vê o
    // formData do render anterior (upc velho ou vazio), então a checagem nunca rodava certo
    // pro código recém-lido pela câmera.
    const upc = upcOverride ?? formData.upc;
    if (!upc) return;
    try {
      const url = `/api/products/check-upc?upc=${encodeURIComponent(upc)}${editingId ? '&excludeId='+editingId : ''}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setBlockingErrors(prev => ({ ...prev, upc: data.message || "Já existe produto com este UPC" }));
        } else {
          setBlockingErrors(prev => { const copy={...prev}; delete copy.upc; return copy; });
        }
      }
    } catch {}
  };

  const addSerialToList = (rawValue: string) => {
    const val = rawValue.trim().toUpperCase();
    if (!val) return;
    if (serials.includes(val)) {
      setFormError("Número de série já bipado na lista atual.");
      return;
    }
    if (formData.initialPhysicalStock > 0 && serials.length >= formData.initialPhysicalStock) {
      setFormError(`S/N Inicial: limite de ${formData.initialPhysicalStock} seriais atingido.`);
      return;
    }
    const newSerials = [...serials, val];
    setSerials(newSerials);
    setSerialInput("");
    if (formData.hasSerialNumber && formData.initialPhysicalStock > 0 && newSerials.length === formData.initialPhysicalStock) {
      setFormError("");
    }
  };

  const handleSerialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSerialToList(serialInput);
    }
  };

  const removeSerial = (idx: number) => {
    const newSerials = serials.filter((_, i) => i !== idx);
    setSerials(newSerials);
    if (formData.hasSerialNumber && formData.initialPhysicalStock > 0 && newSerials.length === formData.initialPhysicalStock) {
        setFormError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    // Local validation
    let hasLocalErr = false;
    let newFieldErr: Record<string, string> = {};
    if (!formData.name) { newFieldErr.name = "Nome é obrigatório"; hasLocalErr=true; }
    if (!formData.sku) { newFieldErr.sku = "SKU é obrigatório"; hasLocalErr=true; }
    if (!formData.groupId) { newFieldErr.groupId = "Grupo é obrigatório"; hasLocalErr=true; }
    if (formData.salePriceA <= 0) { newFieldErr.salePriceA = "Preço Base deve ser maior que zero"; hasLocalErr=true; }
    if (!formData.unitMeasure) { newFieldErr.unitMeasure = "Unid. de Medida é obrigatória"; hasLocalErr=true; }
    
    if (formData.initialPhysicalStock < 0) { newFieldErr.initialPhysicalStock = "Não pode ser negativo"; hasLocalErr=true; }
    if (formData.minStock < 0) { newFieldErr.minStock = "Não pode ser negativo"; hasLocalErr=true; }
    
    if (Object.keys(blockingErrors).length > 0) {
       setFormError("Dados Básicos: corrija os problemas com SKU ou UPC duplicados.");
       return;
    }

    if (hasLocalErr) {
       setFieldErrors(newFieldErr);
       setFormError("Corrija os campos destacados antes de salvar.");
       return;
    }

    if (formData.hasSerialNumber && formData.initialPhysicalStock > 0 && !editingId) {
      if (serials.length !== formData.initialPhysicalStock) {
        setFormError(`S/N Inicial: o produto exige exatamente ${formData.initialPhysicalStock} seriais.`);
        setActiveTab("serials");
        return;
      }
    }
    
    setIsSaving(true);
    setFormError("");
    setSuccessMsg("");
    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          groupId: formData.groupId || null,
          subgroupId: formData.subgroupId || null,
          shelfId: formData.shelfId || null,
          serials: !editingId && formData.hasSerialNumber ? serials : undefined,
          images,
          technicalSpecs
        })
      });
      
      const parsed = await parseApiError(res);
      
      if (res.ok) {
        setSuccessMsg(editingId ? "Produto atualizado com sucesso!" : "Produto salvo com sucesso!");
        setTimeout(() => {
          handleClose();
          fetchProducts(debouncedSearch);
        }, 1500);
      } else {
        if (parsed.fields && Object.keys(parsed.fields).length > 0) {
           setFieldErrors(parsed.fields);
           setFormError(`Corrija os campos destacados antes de salvar. ${parsed.message || ""}`);
        } else {
           setFormError(`Erro: ${parsed.message}`);
        }
      }
    } catch (error: any) {
      console.error(error);
      setFormError(`Erro de conexão: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hardDeleteModalOpen, setHardDeleteModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [productForStock, setProductForStock] = useState<any>(null);

  const initArchive = (id: string) => {
    setItemToDelete(id);
    setConfirmModalOpen(true);
  };

  const initHardDelete = (id: string) => {
    setItemToDelete(id);
    setHardDeleteModalOpen(true);
  };

  const initStock = (p: any) => {
    setProductForStock(p);
    setStockModalOpen(true);
  };

  const handleEdit = async (p: any) => {
    try {
      const res = await apiFetch(`/api/products/${p.id}`);
      if (res.ok) {
        const full = await res.json();
        setFormData({
          ...defaultFormData,
          name: full.name || '',
          sku: full.sku || '',
          upc: full.upc || '',
          description: full.description || '',
          brand: full.brand || '',
          model: full.model || '',
          groupId: full.groupId || '',
          subgroupId: full.subgroupId || '',
          unitMeasure: full.unitMeasure || 'UN',
          weightKg: full.weightKg ? Number(full.weightKg) : 0,
          widthCm: full.widthCm ? Number(full.widthCm) : 0,
          heightCm: full.heightCm ? Number(full.heightCm) : 0,
          lengthCm: full.lengthCm ? Number(full.lengthCm) : 0,
          shelfId: full.shelfId || '',
          minStock: full.minStock ? Number(full.minStock) : 0,
          hasSerialNumber: full.hasSerialNumber || false,
          requiresLot: full.requiresLot || false,
          ofertaQty: full.ofertaQty ? Number(full.ofertaQty) : 0,
          ofertaPrice: full.ofertaPrice ? Number(full.ofertaPrice) : 0,
          outletQty: full.outletQty ? Number(full.outletQty) : 0,
          outletPrice: full.outletPrice ? Number(full.outletPrice) : 0,
          costPrice: full.costPrice ? Number(full.costPrice) : 0,
          costCurrency: full.costCurrency || 'BRL',
          salePriceA: full.salePriceA ? Number(full.salePriceA) : 0,
          salePriceB: full.salePriceB ? Number(full.salePriceB) : 0,
          ivaPercentage: full.ivaPercentage ? Number(full.ivaPercentage) : 0,
          imageUrl: full.imageUrl || '',
          parentId: full.parentId || '',
          variantName: full.variantName || '',
          storeVisible: full.storeVisible !== false,
        });
        setImages(full.images || []);
        setTechnicalSpecs(full.technicalSpecs || []);
        setEditingPhysicalStock(full.physicalStock ? Number(full.physicalStock) : 0);
        setEditingId(p.id);
        setIsModalOpen(true);
      } else {
        alert("Erro ao carregar detalhes do produto");
      }
    } catch(err) {
       console.error(err);
    }
  };

  const handleConfirmArchive = async () => {
    if (!itemToDelete) return;
    setIsDeletingId(itemToDelete);
    setConfirmModalOpen(false);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await apiFetch(`/api/products/${itemToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro arquivado com sucesso.");
        setProducts(prev => prev.filter(p => p.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchProducts(debouncedSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(`Erro ${res.status}: ${data.error || "Erro ao arquivar produto"}`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingId(itemToDelete);
    setHardDeleteModalOpen(false);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await apiFetch(`/api/products/${itemToDelete}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        setActionSuccess("Registro excluído definitivamente com sucesso.");
        setProducts(prev => prev.filter(p => p.id !== itemToDelete));
        setTimeout(() => setActionSuccess(""), 3000);
        fetchProducts(debouncedSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erro ao excluir definitivamente o produto.");
        setTimeout(() => setActionError(""), 7000);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(`Erro: ${err.message}`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setActiveTab("basic");
    setSuccessMsg("");
    setFormError("");
    setFieldErrors({});
    setBlockingErrors({});
    setSerials([]);
    setSerialInput("");
    setImages([]);
    setTechnicalSpecs([]);
    setAiFeedback(null);
    setAiCooldown(0);
  };

  const selectedGroupObj = groups.find(g => g.id === formData.groupId);
  const subgroupsForGroup = selectedGroupObj?.subgroups || [];

  const getAiPayload = () => ({
    name: formData.name,
    brand: formData.brand,
    model: formData.model,
    group: selectedGroupObj?.name || "",
    subgroup: subgroupsForGroup.find((s: any) => s.id === formData.subgroupId)?.name || "",
    upc: formData.upc,
  });

  const getAiErrorMessage = (data: any, fallback: string) => {
    if (data?.code === "AI_RATE_LIMIT") return data.error || "Limite temporário da IA atingido. Aguarde um momento e tente novamente.";
    if (data?.code === "AI_NOT_CONFIGURED") return data.error || "Ollama ainda não foi configurado no servidor.";
    if (data?.code === "AI_UNAVAILABLE") return data.error || "A IA está temporariamente indisponível.";
    return data?.error || fallback;
  };

  const generateDescription = async () => {
    if (isGenerating || !formData.name) return;
    setIsGenerating(true);
    setAiFeedback({ type: "info", message: "Gerando descrição. Aguarde..." });
    try {
      const res = await apiFetch("/api/products/ai/description", {
        method: "POST",
        body: JSON.stringify(getAiPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "AI_RATE_LIMIT") setAiCooldown(Math.min(300, Math.max(5, Number(data.retryAfterSeconds || 30))));
        setAiFeedback({ type: "error", message: getAiErrorMessage(data, "Não foi possível gerar a descrição agora.") });
        return;
      }
      updateProductField("description", data.description || "");
      setAiFeedback({ type: "success", message: "Descrição gerada. Revise o texto antes de salvar o produto." });
    } catch (err: any) {
      setAiFeedback({ type: "error", message: err?.message === "Unauthorized" ? "Sua sessão expirou." : "Falha de conexão com a IA. Tente novamente." });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSpecs = async () => {
    if (isGenerating || !formData.name) return;
    setIsGenerating(true);
    setAiFeedback({ type: "info", message: "Gerando especificações. Aguarde..." });
    try {
      const res = await apiFetch("/api/products/ai/specs", {
        method: "POST",
        body: JSON.stringify(getAiPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "AI_RATE_LIMIT") setAiCooldown(Math.min(300, Math.max(5, Number(data.retryAfterSeconds || 30))));
        setAiFeedback({ type: "error", message: getAiErrorMessage(data, "Não foi possível gerar as especificações agora.") });
        return;
      }
      setTechnicalSpecs(Array.isArray(data.specs) ? data.specs : []);
      if (data.description) updateProductField("description", data.description);
      setAiFeedback({
        type: data.warning ? "info" : "success",
        message: data.warning || "Especificações geradas. Revise os dados antes de salvar o produto.",
      });
    } catch (err: any) {
      setAiFeedback({ type: "error", message: err?.message === "Unauthorized" ? "Sua sessão expirou." : "Falha de conexão com a IA. Tente novamente." });
    } finally {
      setIsGenerating(false);
    }
  };

  // Colunas da tabela de produtos (TanStack): ordenação, busca instantânea e paginação no DataTable.
  const productColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-300">{String(getValue() || "")}</span>,
    },
    {
      accessorKey: "name",
      header: "Produto",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-700 bg-gray-800">
            {row.original.imageUrl ? <img src={row.original.imageUrl} className="h-full w-full object-cover" /> : <div className="text-[10px] text-gray-500">S/F</div>}
          </div>
          <span className="font-medium text-gray-200">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "grupo",
      header: "Grupo",
      accessorFn: (p: any) => p.groupName || "-",
      cell: ({ row }) => (
        <div>
          <Badge variant="outline" className="gap-1.5">
            <Tag className="h-3 w-3 text-primary" />{row.original.groupName || "-"}
          </Badge>
          {row.original.subgroupName && <div className="mt-1 pl-0.5 text-[10px] text-gray-500">{row.original.subgroupName}</div>}
        </div>
      ),
    },
    {
      id: "prateleira",
      header: "Prateleira",
      accessorFn: (p: any) => p.shelfName || "-",
      cell: ({ getValue }) => <span className="text-gray-400">{String(getValue())}</span>,
    },
    {
      id: "estoque",
      header: () => <div className="text-right">Estoque Disp.</div>,
      accessorFn: (p: any) => (Number(p.physicalStock) || 0) - (Number(p.reservedStock) || 0),
      sortingFn: (a, b) =>
        ((Number(a.original.physicalStock) || 0) - (Number(a.original.reservedStock) || 0)) -
        ((Number(b.original.physicalStock) || 0) - (Number(b.original.reservedStock) || 0)),
      cell: ({ getValue }) => {
        const qty = Number(getValue()) || 0;
        return <div className="text-right"><Badge variant={stockBadgeVariant(qty)} className="font-mono tabular-nums">{qty}</Badge></div>;
      },
    },
    {
      accessorKey: "salePriceA",
      header: () => <div className="text-right">Preço Venda (A)</div>,
      sortingFn: (a, b) => Number(a.original.salePriceA) - Number(b.original.salePriceA),
      cell: ({ row }) => <div className="text-right font-medium tabular-nums text-brand-gold"><Money value={row.original.salePriceA} lang="pt-BR" /></div>,
    },
    {
      id: "acoes",
      header: () => <div className="text-right">Ações</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {isAdmin && (
              <Button variant="ghost" size="icon-sm" title="Estoque" onClick={() => initStock(p)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-blue-400"><Package className="h-4 w-4" /></Button>
            )}
            <Button variant="ghost" size="sm" title="Abrir" onClick={() => navigate(`/products/${p.id}`)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-white">Abrir</Button>
            <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(p)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold"><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" title="Arquivar" onClick={() => initArchive(p.id)} disabled={isDeletingId === p.id} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400"><Archive className="h-4 w-4" /></Button>
            {isAdmin && (
              <Button variant="ghost" size="icon-sm" title="Excluir Definitivamente" onClick={() => initHardDelete(p.id)} disabled={isDeletingId === p.id} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        );
      },
    },
  ], [isAdmin, isDeletingId]);

  // Infográfico do catálogo: números vivos calculados do que está carregado.
  const productStats = useMemo(() => {
    const qtyOf = (p: any) => (Number(p.physicalStock) || 0) - (Number(p.reservedStock) || 0);
    let units = 0, saleValue = 0, out = 0, low = 0;
    const byGroup = new Map<string, number>();
    for (const p of products) {
      const q = qtyOf(p);
      units += Math.max(0, q);
      const v = Math.max(0, q) * (Number(p.salePriceA) || 0);
      saleValue += v;
      if (q <= 0) out += 1; else if (q <= 5) low += 1;
      const g = p.groupName || "Sem grupo";
      byGroup.set(g, (byGroup.get(g) || 0) + v);
    }
    const GROUP_COLORS = ["#ffd700", "#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#64748b"];
    const groups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
    const top = groups.slice(0, 5).map(([label, value], i) => ({ label, value: Math.round(value * 100) / 100, color: GROUP_COLORS[i] }));
    const rest = groups.slice(5).reduce((s, [, v]) => s + v, 0);
    if (rest > 0) top.push({ label: "Outros", value: Math.round(rest * 100) / 100, color: GROUP_COLORS[5] });
    return { count: products.length, units, saleValue, out, low, donut: top };
  }, [products]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Produtos</h2>
      </div>

      {actionError && <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">{actionError}</div>}
      {actionSuccess && <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded border border-green-400/20">{actionSuccess}</div>}

      {/* Box pai: filtros + tabela, cada um mantendo a própria seção mas unidos numa caixa só */}
      <Card className="py-0">
      <CardContent className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-start relative">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-3 sm:top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, SKU ou UPC..."
            className="w-full bg-[#171717] border border-gray-700 rounded-lg pl-10 pr-4 py-3 sm:py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          className={`w-full sm:w-auto ${showFilters ? "" : "hover:bg-transparent hover:text-gray-300 hover:border-primary"}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 shrink-0" />
          Filtros
        </Button>
        <Button
          className="w-full sm:w-auto"
          onClick={() => { setEditingId(null); setFormData(defaultFormData); setIsModalOpen(true); }}
        >
          <Plus className="w-4 h-4 shrink-0" />
          Novo Produto
        </Button>

        {showFilters && (
          <Card className="absolute top-full right-0 z-50 mt-2 w-full py-0 shadow-xl sm:w-[500px]">
          <CardContent className="p-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Grupo</label>
                  <select value={filters.groupId} onChange={(e) => setFilters(f => ({ ...f, groupId: e.target.value, subgroupId: '' }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold">
                    <option value="">Todos</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subgrupo</label>
                  <select disabled={!filters.groupId} value={filters.subgroupId} onChange={(e) => setFilters(f => ({ ...f, subgroupId: e.target.value }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold disabled:opacity-50">
                    <option value="">Todos</option>
                    {groups.find(g => g.id === filters.groupId)?.subgroups?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Prateleira</label>
                  <select value={filters.shelfId} onChange={(e) => setFilters(f => ({ ...f, shelfId: e.target.value }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold">
                    <option value="">Todas</option>
                    {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Status de Estoque</label>
                  <select value={filters.stockStatus} onChange={(e) => setFilters(f => ({ ...f, stockStatus: e.target.value }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold">
                    <option value="">Todos</option>
                    <option value="in-stock">Com Estoque</option>
                    <option value="low-stock">Estoque Baixo</option>
                    <option value="out-of-stock">Sem Estoque</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Produto com foto</label>
                  <select value={filters.hasImage} onChange={(e) => setFilters(f => ({ ...f, hasImage: e.target.value }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold">
                    <option value="">Todos</option>
                    <option value="true">Com Foto</option>
                    <option value="false">Sem Foto</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Controla S/N</label>
                  <select value={filters.hasSerialNumber} onChange={(e) => setFilters(f => ({ ...f, hasSerialNumber: e.target.value }))} className="w-full bg-[#171717] border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-brand-gold">
                    <option value="">Todos</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
               </div>
             </div>
             <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-transparent hover:text-white"
                  onClick={() => {
                    setFilters({ groupId: "", subgroupId: "", shelfId: "", stockStatus: "", hasImage: "", hasSerialNumber: "" });
                    setShowFilters(false);
                  }}
                >
                  Limpar
                </Button>
             </div>
          </CardContent>
          </Card>
        )}
      </div>

      {/* Infográfico do catálogo (vivo: tooltips no donut ao passar o mouse) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Produtos listados" value={productStats.count} sub={`${productStats.units} un disponíveis`} />
        <KpiTile label="Valor do estoque (a venda)" accent="border-brand-gold/25 bg-brand-gold/5"
          value={<span className="tabular-nums text-brand-gold"><Money value={productStats.saleValue} lang="pt-BR" /></span>}
          sub="preço A × disponível" />
        <KpiTile label="Atenção no estoque"
          value={
            <div className="flex items-baseline gap-3">
              <span className="tabular-nums text-red-300">{productStats.out}</span><span className="text-[10px] font-normal text-gray-500">zerados</span>
              <span className="tabular-nums text-amber-300">{productStats.low}</span><span className="text-[10px] font-normal text-gray-500">baixos</span>
            </div>
          } />
        <div className="rounded-2xl border border-gray-700 bg-brand-navylight p-4">
          <div className="text-[11px] text-gray-400">Valor por grupo</div>
          <div className="mt-1">
            {productStats.donut.length > 0 ? <CompositionDonut items={productStats.donut} height={102} /> : <div className="py-4 text-center text-xs text-gray-600">sem dados</div>}
          </div>
        </div>
      </div>

      {/* Tabela desktop (TanStack): ordenar, buscar e paginar. Cards do celular seguem abaixo. */}
      <div className="hidden md:block border-t border-gray-800 pt-4">
        <DataTable
          columns={productColumns}
          data={products}
          pageSize={15}
          searchPlaceholder=""
          loading={productsLoading}
          emptyText="Nenhum produto encontrado."
          onRowClick={(p: any) => navigate(`/products/${p.id}`)}
        />
      </div>


      <div className="products-mobile-list md:hidden space-y-3">
        {products.length === 0 ? (
          <Card className="py-0 text-center text-gray-500">
            <CardContent className="p-8">
              Nenhum produto encontrado.
            </CardContent>
          </Card>
        ) : products.map(p => {
          const qty = (typeof p.physicalStock === 'string' ? parseFloat(p.physicalStock) : (p.physicalStock || 0)) - (typeof p.reservedStock === 'string' ? parseFloat(p.reservedStock) : (p.reservedStock || 0));
          return (
          <Card key={p.id} className="products-mobile-card flex flex-col gap-2 border-gray-700 bg-brand-navylight p-3 shadow-md">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-mono text-xs text-brand-gold mb-1">{p.sku}</div>
                <div className="font-medium text-white line-clamp-2">{p.name}</div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-xs text-gray-500 mb-0.5">Venda A</div>
                <div className="text-brand-gold font-medium"><Money value={p.salePriceA} lang="pt-BR" /></div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
              <Badge variant="outline" className="gap-1.5">
                <Tag className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[100px]">{p.groupName || '-'}{p.subgroupName ? ` › ${p.subgroupName}` : ''}</span>
              </Badge>
              <Badge variant={stockBadgeVariant(qty)} className="font-mono">Estoque: {qty}</Badge>
            </div>
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-700/50">
              {isAdmin && (
                <Button variant="ghost" size="icon-sm" title="Estoque" onClick={() => initStock(p)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-blue-400">
                  <Package className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" title="Abrir" onClick={() => navigate(`/products/${p.id}`)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-white">
                Abrir
              </Button>
              <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => handleEdit(p)} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-brand-gold">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Arquivar" onClick={() => initArchive(p.id)} disabled={isDeletingId === p.id} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400">
                <Archive className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon-sm" title="Excluir Definitivamente" onClick={() => initHardDelete(p.id)} disabled={isDeletingId === p.id} className="bg-gray-800/50 text-gray-400 hover:bg-gray-800/50 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                  {isDeletingId === p.id && <span className="text-[10px]">Excluindo...</span>}
                </Button>
              )}
            </div>
          </Card>
        )})}
      </div>
      </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? "Editar Produto" : "Novo Produto"} maxWidth="max-w-[1000px]">
        {formError && (
          <Card className="mb-4 border-red-500/20 bg-red-500/10 py-0 text-sm font-medium text-red-400">
          <CardContent className="p-3">
            <p>{formError}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                {fieldErrors.name && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('basic')}>Dados Básicos: Nome é obrigatório.</Button></li>}
                {fieldErrors.sku && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('basic')}>Dados Básicos: SKU é obrigatório.</Button></li>}
                {fieldErrors.groupId && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('basic')}>Dados Básicos: Grupo é obrigatório.</Button></li>}
                {fieldErrors.unitMeasure && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('stock')}>Estoque & Local: Unidade de Medida é obrigatória.</Button></li>}
                {fieldErrors.initialPhysicalStock && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('stock')}>Estoque & Local: Estoque inicial inválido.</Button></li>}
                {fieldErrors.minStock && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('stock')}>Estoque & Local: Estoque mínimo inválido.</Button></li>}
                {fieldErrors.salePriceA && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('prices')}>Preços: Preço A (Varejo) precisa ser maior que zero.</Button></li>}
              </ul>
            )}
            {Object.keys(blockingErrors).length > 0 && (
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                 {blockingErrors.sku && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('basic')}>Dados Básicos: {blockingErrors.sku}</Button></li>}
                 {blockingErrors.upc && <li><Button type="button" variant="link" className="h-auto p-0 text-inherit" onClick={() => setActiveTab('basic')}>Dados Básicos: {blockingErrors.upc}</Button></li>}
              </ul>
            )}
          </CardContent>
          </Card>
        )}
        <div className="flex flex-wrap border-b border-gray-800 mb-4 gap-2 pb-2">
          {(() => {
            const basicErr = !!(fieldErrors.name || fieldErrors.sku || fieldErrors.upc || fieldErrors.groupId || blockingErrors.sku || blockingErrors.upc);
            const stockErr = !!(fieldErrors.unitMeasure || fieldErrors.initialPhysicalStock || fieldErrors.minStock);
            const priceErr = !!fieldErrors.salePriceA;
            const serialErr = (formData.hasSerialNumber && !editingId && formData.initialPhysicalStock > 0 && serials.length !== formData.initialPhysicalStock);

            return (
              <>
                <Button type="button" variant="ghost" className={`relative rounded-lg font-medium ${activeTab === 'basic' ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`} onClick={() => setActiveTab('basic')}>Dados Básicos {basicErr && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}</Button>
                <Button type="button" variant="ghost" className={`relative rounded-lg font-medium ${activeTab === 'stock' ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`} onClick={() => setActiveTab('stock')}>Estoque & Local {stockErr && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}</Button>
                <Button type="button" variant="ghost" className={`relative rounded-lg font-medium ${activeTab === 'prices' ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`} onClick={() => setActiveTab('prices')}>Preços {priceErr && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}</Button>
                {editingId && !formData.parentId && (
                  <Button type="button" variant="ghost" className={`relative rounded-lg font-medium ${activeTab === 'variants' ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`} onClick={() => setActiveTab('variants')}>Variantes</Button>
                )}
                {formData.hasSerialNumber && !editingId && formData.initialPhysicalStock > 0 && (
                  <Button type="button" variant="ghost" className={`relative rounded-lg font-medium ${activeTab === 'serials' ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/10 hover:text-purple-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`} onClick={() => setActiveTab('serials')}>
                    S/N Inicial ({serials.length}/{formData.initialPhysicalStock}) {serialErr && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>}
                  </Button>
                )}
              </>
            );
          })()}
        </div>

        <form onSubmit={handleSubmit} className="product-form space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <Card className={`py-0 ${formData.storeVisible ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/70'}`}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${formData.storeVisible ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                      {formData.storeVisible ? <Globe2 className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Publicação no site</p>
                      <p className={`text-xs ${formData.storeVisible ? 'text-emerald-300' : 'text-gray-400'}`}>
                        {formData.storeVisible ? 'Publicado — aparece na loja assim que salvar.' : 'Rascunho — fica visível somente no sistema.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.storeVisible}
                    aria-label="Publicar produto no site"
                    onClick={() => updateProductField('storeVisible', !formData.storeVisible)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${formData.storeVisible ? 'bg-emerald-500' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${formData.storeVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </CardContent>
              </Card>
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <div className="flex flex-col gap-2 items-center justify-start mt-1">
                  <div className="w-24 h-24 bg-[#171717] border border-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {formData.imageUrl ? <img src={formData.imageUrl} alt={`Foto de ${formData.name || 'produto'}`} className="w-full h-full object-cover" /> : <div className="text-gray-600 text-xs text-center p-2">Sem Foto</div>}
                  </div>
                  <label className="cursor-pointer text-xs font-bold text-brand-navydark bg-brand-gold hover:bg-brand-goldhover rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    {uploadingImg === 'main' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingImg === 'main' ? 'Enviando...' : 'Enviar foto'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImg != null}
                      onChange={e => { handleImageFile(e.target.files?.[0], 'main'); e.target.value = ''; }} />
                  </label>
                </div>
                <div className="space-y-4">
                  <div className="space-y-4">
                    {formData.parentId && (
                      <Card className="mb-2 border-primary/30 bg-primary/10 py-0">
                      <CardContent className="p-3">
                        <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-1">Criando Variante</span>
                        <div className="text-white text-sm">Este produto é uma variação (Tamanho/Cor) de outro produto pai.</div>
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Opção (ex: Tam G, Azul) *</label>
                          <input required type="text" value={formData.variantName || ''} onChange={e => updateProductField('variantName', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" placeholder="Ex: P, M, G, Azul, Vermelho..." />
                        </div>
                      </CardContent>
                      </Card>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Produto {formData.parentId ? '(Igual ao Pai) *' : '*'}</label>
                      <input required type="text" value={formData.name} onChange={e => updateProductField('name', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" disabled={!!formData.parentId} />
                      {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Foto principal <span className="font-normal text-gray-600">(botão "Enviar foto" ao lado, ou cole uma URL)</span></label>
                    <input type="text" value={formData.imageUrl && formData.imageUrl.startsWith('data:') ? '(foto enviada do computador)' : formData.imageUrl} onChange={e => updateProductField('imageUrl', e.target.value)} disabled={!!formData.imageUrl && formData.imageUrl.startsWith('data:')} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold disabled:opacity-60" placeholder="https://" />
                    {formData.imageUrl && formData.imageUrl.startsWith('data:') && (
                      <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs text-red-400 hover:text-red-300" onClick={() => updateProductField('imageUrl', '')}>Remover foto enviada</Button>
                    )}
                    {fieldErrors.imageUrl && <p className="text-red-400 text-xs mt-1">{fieldErrors.imageUrl}</p>}

                    <div className="mt-4">
                      {images.length < 4 && (
                        <Button type="button" variant="link" className="mb-2 h-auto gap-1 p-0 has-[>svg]:p-0 text-xs font-medium text-primary hover:text-primary/90" onClick={() => setImages([...images, { imageUrl: "", isPrimary: false }])}>
                           <Plus className="size-3" /> Adicionar foto extra (Máx: 4)
                        </Button>
                      )}

                      {images.length > 0 && (
                        <div className="space-y-2 max-w-sm">
                           {images.map((img, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-[#171717] border border-gray-700 p-2 rounded-lg">
                                 <div className="w-8 h-8 bg-gray-800 rounded border border-gray-700 overflow-hidden shrink-0">
                                    {img.imageUrl ? <img src={img.imageUrl} className="w-full h-full object-cover" /> : <div className="p-1 text-[8px] text-gray-500 text-center flex items-center justify-center h-full">...</div>}
                                 </div>
                                 <label className="cursor-pointer p-1.5 rounded bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/25 shrink-0" title="Enviar arquivo">
                                    {uploadingImg === `extra-${idx}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImg != null}
                                      onChange={e => { handleImageFile(e.target.files?.[0], idx); e.target.value = ''; }} />
                                 </label>
                                 <input type="text" placeholder="ou cole a URL da foto" value={img.imageUrl && img.imageUrl.startsWith('data:') ? '(foto enviada)' : img.imageUrl} disabled={!!img.imageUrl && img.imageUrl.startsWith('data:')} onChange={e => {
                                    const newImgs = [...images];
                                    newImgs[idx].imageUrl = e.target.value;
                                    setImages(newImgs);
                                 }} className="flex-1 bg-[#171717] border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-brand-gold disabled:opacity-60" />
                                 <Button type="button" variant="ghost" size="icon-xs" title="Remover" className="shrink-0 text-red-400 hover:bg-red-400/10 hover:text-red-400" onClick={() => {
                                    setImages(images.filter((_, idxToRemove) => idxToRemove !== idx));
                                 }}>
                                    <Trash2 className="size-3" />
                                 </Button>
                              </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Grupo *</label>
                  <select value={formData.groupId} onChange={e => { 
                    if (e.target.value === 'NEW') { promptCreateGroup(); return; }
                    updateProductField('groupId', e.target.value); 
                    updateProductField('subgroupId', ''); 
                  }} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                    <option value="">Nenhum</option>
                    <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  {fieldErrors.groupId && <p className="text-red-400 text-xs mt-1">{fieldErrors.groupId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Subgrupo</label>
                  <select disabled={!formData.groupId} value={formData.subgroupId} onChange={e => {
                    if (e.target.value === 'NEW') { promptCreateSubgroup(); return; }
                    updateProductField('subgroupId', e.target.value);
                  }} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold disabled:opacity-50">
                    <option value="">Nenhum</option>
                    <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Subgrupo</option>
                    {subgroupsForGroup.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Marca</label>
                  <input type="text" value={formData.brand} onChange={e => updateProductField('brand', e.target.value)} placeholder="Ex: Apple, Samsung..." className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Modelo</label>
                  <input type="text" value={formData.model} onChange={e => updateProductField('model', e.target.value)} placeholder="Ex: iPhone 17 Pro" className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">SKU *</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input required type="text" onBlur={handleCheckSku} value={formData.sku} onChange={e => updateProductField('sku', e.target.value)} className="flex-1 w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    <Button type="button" variant="ghost" className="h-auto shrink-0 whitespace-nowrap rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 hover:text-primary sm:py-0 sm:text-xs" onClick={generateSku}>Gerar SKU</Button>
                  </div>
                  {(fieldErrors.sku || blockingErrors.sku) && <p className="text-red-400 text-xs mt-1">{fieldErrors.sku || blockingErrors.sku}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">UPC (Cód. Barras)</label>
                  <div className="flex gap-2">
                    <input type="text" onBlur={() => handleCheckUpc()} value={formData.upc} onChange={e => updateProductField('upc', e.target.value)} className="flex-1 min-w-0 bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    <Button type="button" variant="outline" className="h-auto w-9 shrink-0 rounded-lg border-gray-700 bg-[#171717] px-0 has-[>svg]:px-0 shadow-none text-primary hover:border-primary hover:bg-[#171717] hover:text-primary" onClick={() => setIsUpcScannerOpen(true)} title="Ler código pela câmera">
                      <Camera className="size-5" />
                    </Button>
                  </div>
                  {(fieldErrors.upc || blockingErrors.upc) && <p className="text-red-400 text-xs mt-1">{fieldErrors.upc || blockingErrors.upc}</p>}
                </div>
              </div>


              <div>
                 <div className="flex justify-between items-end mb-1">
                   <label className="block text-sm font-medium text-gray-400">Descrição</label>
                   <Button type="button" variant="ghost" size="sm" className="h-auto bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 hover:text-primary" disabled={isGenerating || aiCooldown > 0 || !formData.name} onClick={generateDescription}>{isGenerating ? "Gerando..." : aiCooldown > 0 ? `Aguarde ${aiCooldown}s` : "Gerar descrição com IA"}</Button>
                 </div>
                 {aiFeedback && (
                   <div className={`ai-inline-feedback mb-2 rounded-lg border px-3 py-2 text-xs ${aiFeedback.type === "error" ? "border-red-500/30 bg-red-500/10 text-red-300" : aiFeedback.type === "success" ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"}`}>
                     {aiFeedback.message}
                   </div>
                 )}
                 <textarea rows={2} value={formData.description} onChange={e => updateProductField('description', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
              </div>
              <div className="border-t border-gray-800/50 pt-4 mt-4">
                 <div className="flex justify-between items-end mb-3">
                   <label className="block text-sm font-medium text-gray-300">Especificações Técnicas</label>
                   <div className="flex gap-2 items-center">
                     <Button type="button" variant="ghost" size="sm" className="h-auto gap-1 bg-gray-800 px-2 has-[>svg]:px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-white" onClick={() => setTechnicalSpecs([...technicalSpecs, { label: "", value: "" }])}>
                        <Plus className="size-3" /> Adicionar
                     </Button>
                     <Button type="button" variant="ghost" size="sm" className="h-auto bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 hover:text-primary" disabled={isGenerating || aiCooldown > 0 || !formData.name} onClick={generateSpecs}>{isGenerating ? "Gerando..." : aiCooldown > 0 ? `Aguarde ${aiCooldown}s` : "Gerar especificações com IA"}</Button>
                   </div>
                 </div>
                 <div className="space-y-2">
                    {technicalSpecs.map((spec, idx) => (
                       <div key={idx} className="flex gap-2 items-center">
                          <input type="text" placeholder="Característica" value={spec.label} onChange={e => {
                             const newS = [...technicalSpecs];
                             newS[idx].label = e.target.value;
                             setTechnicalSpecs(newS);
                          }} className="w-1/3 bg-[#171717] border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-brand-gold outline-none" />
                          <input type="text" placeholder="Detalhes" value={spec.value} onChange={e => {
                             const newS = [...technicalSpecs];
                             newS[idx].value = e.target.value;
                             setTechnicalSpecs(newS);
                          }} className="flex-1 bg-[#171717] border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-brand-gold outline-none" />
                          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-red-400 hover:bg-red-400/10 hover:text-red-400" onClick={() => {
                             setTechnicalSpecs(technicalSpecs.filter((_, i) => i !== idx));
                          }}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    ))}
                    {technicalSpecs.length === 0 && <div className="text-xs text-gray-500 py-2">Nenhuma especificação cadastrada.</div>}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Prateleira <span className="text-gray-500 text-xs">(opcional)</span></label>
                  <select value={formData.shelfId} onChange={e => updateProductField('shelfId', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                    <option value="">Nenhuma</option>
                    {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Unidade de Medida</label>
                  <select value={formData.unitMeasure} onChange={e => updateProductField('unitMeasure', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold">
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="M2">Metro Quadrado (M2)</option>
                  </select>
                  {fieldErrors.unitMeasure && <p className="text-red-400 text-xs mt-1">{fieldErrors.unitMeasure}</p>}
                </div>
              </div>
              
              <Card className="border-primary/30 bg-primary/5 py-0">
              <CardContent className="space-y-4 p-4">
                  <h4 className="text-brand-gold text-sm font-semibold uppercase tracking-wider">Logística e Dimensões (Frete)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Peso Bruto (kg)</label>
                      <input type="number" step="0.001" min="0" value={formData.weightKg} onChange={e => updateProductField('weightKg', parseFloat(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Largura (cm)</label>
                      <input type="number" step="0.1" min="0" value={formData.widthCm} onChange={e => updateProductField('widthCm', parseFloat(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Altura (cm)</label>
                      <input type="number" step="0.1" min="0" value={formData.heightCm} onChange={e => updateProductField('heightCm', parseFloat(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Comprimento (cm)</label>
                      <input type="number" step="0.1" min="0" value={formData.lengthCm} onChange={e => updateProductField('lengthCm', parseFloat(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    </div>
                  </div>
              </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5 py-0">
              <CardContent className="space-y-4 p-4">
                <h4 className="text-brand-gold text-sm font-semibold uppercase tracking-wider">Lançamento de Estoque Inicial</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Qtd Físico Inicial</label>
                    <input type="number" min="0" value={formData.initialPhysicalStock} onChange={e => updateProductField('initialPhysicalStock', parseInt(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    {fieldErrors.initialPhysicalStock && <p className="text-red-400 text-xs mt-1">{fieldErrors.initialPhysicalStock}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Estoque Mínimo</label>
                    <input type="number" min="0" value={formData.minStock} onChange={e => updateProductField('minStock', parseInt(e.target.value) || 0)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold" />
                    {fieldErrors.minStock && <p className="text-red-400 text-xs mt-1">{fieldErrors.minStock}</p>}
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Motivo da Entrada</label>
                   <input disabled={formData.initialPhysicalStock === 0} type="text" value={formData.entryReason} onChange={e => updateProductField('entryReason', e.target.value)} className="w-full bg-[#171717] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-brand-gold disabled:opacity-50" />
                </div>
              </CardContent>
              </Card>

              <Card className="border-gray-800 bg-brand-navy/30 py-0">
              <CardContent className="space-y-3 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Oferta / Outlet</h4>
                <p className="text-xs text-gray-500">Parte do MESMO estoque acima, separada pra aparecer na vitrine de Ofertas/Outlet da loja. Não soma quantidade nova.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-amber-500/30 bg-amber-500/5 py-0">
                  <CardContent className="space-y-2 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-400">🔥 Oferta</div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quantidade</label>
                      <input type="number" min="0" value={formData.ofertaQty}
                        onChange={e => updateProductField('ofertaQty', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Preço da oferta</label>
                      <PriceCurrencyInput label="" value={formData.ofertaPrice} onChange={(v: number) => updateProductField('ofertaPrice', v)} />
                      <MarginPercentInput costPrice={Number(formData.costPrice) || 0} price={Number(formData.ofertaPrice) || 0} onApply={(p: number) => updateProductField('ofertaPrice', p)} />
                    </div>
                    {formData.hasSerialNumber && productSerialsList.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {productSerialsList.filter((s: any) => s.status === 'AVAILABLE').map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <input type="checkbox" checked={s.channel === 'OFERTA'}
                              onChange={async (e) => {
                                const channel = e.target.checked ? 'OFERTA' : null;
                                await apiFetch(`/api/serials/${editingId}/${s.id}`, { method: 'PATCH', body: JSON.stringify({ channel }) });
                                setProductSerialsList(list => list.map(x => x.id === s.id ? { ...x, channel } : x));
                              }}
                              className="h-3.5 w-3.5 accent-amber-500" />
                            {s.serialNumber}
                          </label>
                        ))}
                      </div>
                    )}
                    {formData.requiresLot && productLotsList.length > 0 && (
                      <div className="space-y-1.5">
                        {productLotsList.map((l: any) => (
                          <div key={l.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-20 shrink-0 truncate">{l.lotNumber}</span>
                            <input type="number" min="0" max={l.physicalStock} defaultValue={l.ofertaQty || 0}
                              onBlur={async (e) => {
                                const ofertaQty = parseInt(e.target.value) || 0;
                                await apiFetch(`/api/lots/${l.id}`, { method: 'PATCH', body: JSON.stringify({ ofertaQty, outletQty: l.outletQty || 0 }) });
                              }}
                              className="w-16 bg-[#171717] border border-gray-700 rounded px-2 py-0.5 text-white outline-none focus:border-amber-500" />
                            <span className="text-gray-500">de {l.physicalStock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  </Card>
                  <Card className="border-sky-500/30 bg-sky-500/5 py-0">
                  <CardContent className="space-y-2 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-sky-400">📦 Outlet</div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quantidade</label>
                      <input type="number" min="0" value={formData.outletQty}
                        onChange={e => updateProductField('outletQty', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#171717] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Preço do outlet</label>
                      <PriceCurrencyInput label="" value={formData.outletPrice} onChange={(v: number) => updateProductField('outletPrice', v)} />
                      <MarginPercentInput costPrice={Number(formData.costPrice) || 0} price={Number(formData.outletPrice) || 0} onApply={(p: number) => updateProductField('outletPrice', p)} />
                    </div>
                    {formData.hasSerialNumber && productSerialsList.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {productSerialsList.filter((s: any) => s.status === 'AVAILABLE').map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <input type="checkbox" checked={s.channel === 'OUTLET'}
                              onChange={async (e) => {
                                const channel = e.target.checked ? 'OUTLET' : null;
                                await apiFetch(`/api/serials/${editingId}/${s.id}`, { method: 'PATCH', body: JSON.stringify({ channel }) });
                                setProductSerialsList(list => list.map(x => x.id === s.id ? { ...x, channel } : x));
                              }}
                              className="h-3.5 w-3.5 accent-sky-500" />
                            {s.serialNumber}
                          </label>
                        ))}
                      </div>
                    )}
                    {formData.requiresLot && productLotsList.length > 0 && (
                      <div className="space-y-1.5">
                        {productLotsList.map((l: any) => (
                          <div key={l.id} className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-20 shrink-0 truncate">{l.lotNumber}</span>
                            <input type="number" min="0" max={l.physicalStock} defaultValue={l.outletQty || 0}
                              onBlur={async (e) => {
                                const outletQty = parseInt(e.target.value) || 0;
                                await apiFetch(`/api/lots/${l.id}`, { method: 'PATCH', body: JSON.stringify({ ofertaQty: l.ofertaQty || 0, outletQty }) });
                              }}
                              className="w-16 bg-[#171717] border border-gray-700 rounded px-2 py-0.5 text-white outline-none focus:border-sky-500" />
                            <span className="text-gray-500">de {l.physicalStock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </div>
                {(Number(formData.ofertaQty) + Number(formData.outletQty)) > (editingId ? editingPhysicalStock : Number(formData.initialPhysicalStock) || 0) && (
                  <p className="text-red-400 text-xs">Oferta + Outlet não pode passar do estoque físico do produto.</p>
                )}
              </CardContent>
              </Card>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-gray-800 bg-brand-navy/50 px-3 py-2.5">
                  <input type="checkbox" id="serial" checked={formData.hasSerialNumber} onChange={e => updateProductField('hasSerialNumber', e.target.checked)} className="h-4 w-4 accent-brand-gold bg-[#171717] border-gray-700 rounded" />
                  <span className="text-sm font-medium text-gray-300">Controlar por Número de Série?</span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
                  <input type="checkbox" id="requiresLot" checked={!!formData.requiresLot} onChange={e => updateProductField('requiresLot', e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-gold bg-[#171717] border-gray-700 rounded" />
                  <span>
                    <span className="block text-sm font-semibold text-gray-200">Exigir lote na venda</span>
                    <span className="block text-[11px] leading-tight text-gray-500">Usado para medicamentos e rastreio por cliente.</span>
                  </span>
                </label>
              </div>
            </div>
          )}



          {activeTab === 'prices' && (
            <div className="product-prices-tab space-y-3">
              <div className="product-price-grid">
                <div className="product-price-field">
                  <div className="product-price-label-row">
                    <label className="product-price-label">Moeda do custo</label>
                  </div>
                  <select
                    value={formData.costCurrency || 'BRL'}
                    onChange={(e) => updateProductField('costCurrency', e.target.value)}
                    className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-gold"
                  >
                    <option value="BRL">R$ Real</option>
                    <option value="USD">US$ Dólar</option>
                    <option value="PYG">₲ Guarani</option>
                    <option value="USDT">USDT (Tether)</option>
                  </select>
                  <p className="product-price-helper">Só informativo — não muda como o campo "Preço de Custo" abaixo é digitado/convertido. O custo real do estoque vem das compras (FIFO); use isto pra cadastro manual antes da 1ª compra.</p>
                </div>
                <PriceCurrencyInput
                  label="Preço de Custo"
                  value={formData.costPrice}
                  onChange={(value) => updateProductField('costPrice', value)}
                />
                <PriceCurrencyInput
                  label="Frete"
                  value={formData.ivaPercentage}
                  onChange={(value) => updateProductField('ivaPercentage', value)}
                  helperText="Se deixar zero ou em branco, o produto entra sem frete automático."
                />
              </div>
              <div className="product-sale-price-panel">
                <h4>Preços de Venda</h4>
                <div className="product-price-grid">
                  <div className="product-price-with-margin">
                    <PriceCurrencyInput
                      label="Preço A (Varejo)"
                      value={formData.salePriceA}
                      onChange={(value) => updateProductField('salePriceA', value)}
                      required
                      accent
                      error={fieldErrors.salePriceA}
                    />
                    <MarginPercentInput
                      costPrice={Number(formData.costPrice) || 0}
                      price={Number(formData.salePriceA) || 0}
                      onApply={(value) => updateProductField('salePriceA', value)}
                    />
                  </div>
                  <div className="product-price-with-margin">
                    <PriceCurrencyInput
                      label="Preço B (Atacado)"
                      value={formData.salePriceB}
                      onChange={(value) => updateProductField('salePriceB', value)}
                      error={fieldErrors.salePriceB}
                    />
                    <MarginPercentInput
                      costPrice={Number(formData.costPrice) || 0}
                      price={Number(formData.salePriceB) || 0}
                      onApply={(value) => updateProductField('salePriceB', value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <Card className="border-gray-700/50 bg-gray-800/30 py-0">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <h4 className="text-white font-medium">Variantes deste Produto</h4>
                  <p className="text-xs text-gray-400">Gerencie tamanhos, cores ou outras opções.</p>
                </div>
                <Button type="button" size="sm" className="text-xs font-bold" onClick={() => {
                    const currentParentId = editingId;
                    setEditingId(null);
                    setFormData({ ...formData, parentId: currentParentId || '', variantName: '', sku: '', upc: '', initialPhysicalStock: 0 });
                    setActiveTab('basic');
                  }}
                >
                  + Nova Variante
                </Button>
              </CardContent>
              </Card>
              <div className="space-y-2">
                {products.filter(p => p.parentId === editingId).length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">Nenhuma variante cadastrada.</div>
                ) : (
                  products.filter(p => p.parentId === editingId).map(v => (
                    <Card key={v.id} className="border-gray-700 bg-[#171717] py-0">
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-medium text-white">{v.variantName || v.name}</div>
                        <div className="text-xs text-gray-400">SKU: {v.sku} | Preço: {v.salePriceA}</div>
                      </div>
                      <Button type="button" variant="link" className="h-auto p-0 text-xs font-bold text-primary" onClick={() => {
                          setEditingId(v.id);
                          setFormData({
                            name: v.name || '', sku: v.sku || '', upc: v.upc || '', description: v.description || '', brand: v.brand || '', model: v.model || '', imageUrl: v.imageUrl || '',
                            groupId: v.groupId || '', subgroupId: v.subgroupId || '', unitMeasure: v.unitMeasure || 'UN',
                            weightKg: v.weightKg ? Number(v.weightKg) : 0, widthCm: v.widthCm ? Number(v.widthCm) : 0, heightCm: v.heightCm ? Number(v.heightCm) : 0, lengthCm: v.lengthCm ? Number(v.lengthCm) : 0,
                            shelfId: v.shelfId || '', initialPhysicalStock: 0, minStock: v.minStock ? Number(v.minStock) : 0, hasSerialNumber: v.hasSerialNumber || false, requiresLot: v.requiresLot || false, entryReason: 'Estoque Inicial',
                            costPrice: v.costPrice ? Number(v.costPrice) : 0, costCurrency: v.costCurrency || 'BRL', salePriceA: v.salePriceA ? Number(v.salePriceA) : 0, salePriceB: v.salePriceB ? Number(v.salePriceB) : 0, ivaPercentage: v.ivaPercentage ? Number(v.ivaPercentage) : 0,
                            ofertaQty: v.ofertaQty ? Number(v.ofertaQty) : 0, ofertaPrice: v.ofertaPrice ? Number(v.ofertaPrice) : 0, outletQty: v.outletQty ? Number(v.outletQty) : 0, outletPrice: v.outletPrice ? Number(v.outletPrice) : 0,
                            parentId: v.parentId || '', variantName: v.variantName || '', storeVisible: v.storeVisible !== false
                          });
                          setActiveTab('basic');
                        }}>
                        Editar
                      </Button>
                    </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'serials' && (
            <div className="space-y-6">
              <Card className="border-purple-500/20 bg-purple-500/10 py-0">
              <CardContent className="flex items-center justify-between p-4">
                 <div>
                    <div className="text-purple-400 font-bold mb-1">Registro Inicial de Números de Série</div>
                    <div className="text-gray-300 text-sm">Escaneie os {formData.initialPhysicalStock} números de série referentes ao estoque inicial informado.</div>
                 </div>
                 <div className="text-3xl font-mono text-purple-400">
                    {serials.length} / {formData.initialPhysicalStock}
                 </div>
              </CardContent>
              </Card>
              
              {serials.length < (formData.initialPhysicalStock || 0) ? (
                <div>
                   <div className="flex gap-2">
                     <input 
                       autoFocus 
                       type="text" 
                       value={serialInput} 
                       onChange={e => setSerialInput(e.target.value)} 
                       onKeyDown={handleSerialKeyDown}
                       className="flex-1 min-w-0 bg-[#171717] border-2 border-purple-500/50 rounded-xl px-4 py-4 text-xl font-mono text-white outline-none focus:border-purple-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition" 
                       placeholder="Bipe ou digite o S/N e aperte Enter..." 
                     />
                     <Button type="button" variant="outline" className="h-auto shrink-0 rounded-xl border-purple-500/40 bg-purple-500/10 px-4 has-[>svg]:px-4 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200" onClick={() => setIsSerialScannerOpen(true)} title="Ler S/N pela câmera">
                       <Camera className="size-6" />
                     </Button>
                   </div>
                   <p className="text-xs text-gray-400 mt-2 text-center">O campo volta a focar automaticamente após bipar.</p>
                </div>
              ) : (
                <Card className="border-green-500/20 bg-green-500/10 py-0 text-center font-bold text-green-400">
                <CardContent className="p-4">
                   Todos os {formData.initialPhysicalStock} números de série foram registrados. Pode salvar o produto.
                </CardContent>
                </Card>
              )}
              
              {serials.length > 0 && (
                <div className="border-t border-gray-800 pt-4">
                   <h4 className="text-sm font-semibold text-gray-400 mb-2">Já Bipados ({serials.length}):</h4>
                   <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
                     {serials.map((s, idx) => (
                       <Card key={idx} className="rounded border-gray-700/50 bg-gray-800/50 py-0">
                       <CardContent className="flex items-center justify-between p-2">
                          <span className="font-mono text-sm text-gray-200">{s}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs font-bold text-red-400 hover:bg-transparent hover:text-red-300" onClick={() => removeSerial(idx)}>Remover</Button>
                       </CardContent>
                       </Card>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-gray-800">
            <Button type="button" variant="ghost" className="text-gray-400 hover:bg-transparent hover:text-white" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="px-6 py-2.5 font-bold" disabled={isSaving}>
              {isSaving ? 'Salvando...' : formData.storeVisible ? 'Salvar e publicar' : 'Salvar como rascunho'}
            </Button>
          </div>
        </form>
      </Modal>


      <BarcodeScannerModal
        isOpen={isUpcScannerOpen}
        onClose={() => setIsUpcScannerOpen(false)}
        onDetected={(code) => {
          setIsUpcScannerOpen(false);
          updateProductField('upc', code);
          handleCheckUpc(code);
        }}
        title="Ler código de barras"
      />

      <BarcodeScannerModal
        isOpen={isSerialScannerOpen}
        onClose={() => setIsSerialScannerOpen(false)}
        onDetected={(code) => {
          setIsSerialScannerOpen(false);
          addSerialToList(code);
        }}
        title="Ler S/N pela câmera"
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmArchive}
      />

      <HardDeleteModal
        isOpen={hardDeleteModalOpen}
        onClose={() => setHardDeleteModalOpen(false)}
        onConfirm={handleConfirmHardDelete}
      />

      {productForStock && (
        <StockModal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          productId={productForStock.id}
          productName={productForStock.name}
          hasSerialNumber={productForStock.hasSerialNumber}
          requiresLot={productForStock.requiresLot}
          onSuccess={() => fetchProducts(debouncedSearch)}
        />
      )}
      
      <QuickGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSuccess={async (newId) => {
          await fetchGroupsAndShelves();
          updateProductField('groupId', newId);
          updateProductField('subgroupId', '');
        }}
      />

      <QuickSubgroupModal
        isOpen={showSubgroupModal}
        onClose={() => setShowSubgroupModal(false)}
        groupId={formData.groupId}
        groupName={groups.find(g => g.id === formData.groupId)?.name || ""}
        onSuccess={async (newId) => {
          await fetchGroupsAndShelves();
          updateProductField('subgroupId', newId);
        }}
      />
    </div>
  );
}
