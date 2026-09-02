import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { 
  Upload, X, Save, Check, FileText, AlertTriangle, 
  RefreshCw, PlusCircle, ArrowLeft, Image, ShieldAlert,
  Sliders, Info, HelpCircle, History, Camera 
} from 'lucide-react';
import { apiFetch, loadList } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useAdminTranslation, formatCurrency, formatDate, moneyFieldLabel, getBaseCurrency } from '../../lib/i18n';
import { Money } from '../../components/Money';
import { QuickGroupModal } from '../../components/QuickGroupModal';
import { QuickSubgroupModal } from '../../components/QuickSubgroupModal';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';


const translateOcrWarning = (warning: any, language: string) => {
  const text = String(warning || '').trim();
  const lower = text.toLowerCase();
  const isSpanish = language === 'es-PY';

  if (!text) return '';

  if (lower.includes('quantities for weighted items') || lower.includes('strictly integer schema')) {
    return isSpanish
      ? 'Las cantidades de productos pesables (expresadas en kg) fueron redondeadas al entero más cercano porque el sistema exige cantidad entera. Revise la cantidad antes de aprobar la entrada.'
      : 'As quantidades de produtos pesáveis (em kg) foram arredondadas para o inteiro mais próximo porque o sistema exige quantidade inteira. Confira a quantidade antes de aprovar a entrada.';
  }

  if (lower.includes('math') || lower.includes('sum') || lower.includes('total')) {
    return isSpanish
      ? 'La IA encontró una posible diferencia entre la suma de los productos y el total del documento. Revise cantidades y costos antes de aprobar.'
      : 'A IA encontrou uma possível diferença entre a soma dos produtos e o total do documento. Confira quantidades e custos antes de aprovar.';
  }

  if (text === 'Este OCR foi recuperado do histórico.') {
    return isSpanish ? 'Este OCR fue recuperado del historial.' : text;
  }

  return text;
};

const normalizeOcrWarnings = (warnings: any[] | undefined, language: string) => {
  return (Array.isArray(warnings) ? warnings : [])
    .map(w => translateOcrWarning(w, language))
    .filter(Boolean);
};

interface ExtendedOcrItem {
  id: string; // internal random id
  sku?: string;
  upc?: string;
  name: string;
  productId: string; // matched or linked product ID
  productName?: string;
  _isNew: boolean;
  quantity: number;
  unitCost: number;
  totalCost: number;
  confidence: number;
  rawText?: string;
  // New product fields
  brand?: string;
  model?: string;
  groupId: string;
  subgroupId: string;
  shelfId: string;
  salePriceA: number;
  salePriceB: number;
  hasSerialNumber: boolean;
  serials: string[];
  rawSerialsInput?: string;
}

export function PurchaseOcr() {
  const navigate = useNavigate();
  const { t, language } = useAdminTranslation();
  const user = useAuthStore(s => s.user);

  // States for dependencies
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [jobsHistory, setJobsHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Core OCR state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [ocrJobId, setOcrJobId] = useState<string | null>(null);

  // Extracted/Parsed States (Editable)
  const [supplierId, setSupplierId] = useState('');
  const [extractedSupplierName, setExtractedSupplierName] = useState('');
  const [extractedSupplierDoc, setExtractedSupplierDoc] = useState('');
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState(0);

  const [ocrItems, setOcrItems] = useState<ExtendedOcrItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  // Modal for new supplier create
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierDoc, setNewSupplierDoc] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Search filter inside item dropdown helper
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);

  // Quick modals for Groups
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [quickSubgroupParentId, setQuickSubgroupParentId] = useState('');
  const [quickCreateContextItemId, setQuickCreateContextItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadGroupsData = async () => {
      try {
          const [g, sg] = await Promise.all([
             loadList('/api/groups'),
             loadList('/api/groups/subgroups')
          ]);
          setGroups(g);
          setSubgroups(sg);
      } catch (err) {
          console.error("Failed to reload groups data", err);
      }
  };

  // Fetch all metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [s, sh, p] = await Promise.all([
          loadList('/api/suppliers?includeInactive=false&page=1&limit=500'),
          loadList('/api/shelves'),
          loadList('/api/products')
        ]);
        setSuppliers(s);
        setShelves(sh);
        setProducts(p && p.data ? p.data : p || []);
        await loadGroupsData();
      } catch (err) {
        setError('Erro ao carregar dados auxiliares do sistema.');
      }
    }
    loadMetadata();
    loadJobsHistory();
  }, []);

  const loadJobsHistory = async () => {
    try {
      const res = await apiFetch('/api/purchases/ocr/jobs');
      const data = await res.json();
      if (res.ok && data?.data) {
        setJobsHistory(data.data);
      }
    } catch (e) {
      console.error('Failed to load OCR jobs history', e);
    }
  };

  const handleOpenOcrJob = async (jobId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/purchases/ocr/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao reabrir trabalho OCR.');
      }

      if (data.status === 'FAILED') {
        throw new Error('Este trabalho de OCR falhou e não pode ser reaberto.');
      }

      setOcrJobId(data.id);
      setInvoiceNumber(data.parsedJson?.invoice?.number || data.invoice?.number || '');
      
      let formattedDate = '';
      const rawDate = data.parsedJson?.invoice?.date || data.invoice?.date;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      setInvoiceDate(formattedDate || rawDate || '');
      setInvoiceTotal(Number(data.parsedJson?.invoice?.total || data.invoice?.total) || 0);
      setExtractedSupplierName(data.parsedJson?.supplier?.name || data.supplier?.name || '');
      setExtractedSupplierDoc(data.parsedJson?.supplier?.document || data.supplier?.document || '');
      
      const ocrWarningsList = [
        'Este OCR foi recuperado do histórico.',
        ...(data.parsedJson?.warnings || data.warnings || [])
      ];
      setWarnings(normalizeOcrWarnings(ocrWarningsList, language));

      const autoMatchedSupplier = suppliers.find((s: any) => {
        const matchesName = s.name.toUpperCase().includes((data.parsedJson?.supplier?.name || data.supplier?.name || '').toUpperCase());
        const docClean = (data.parsedJson?.supplier?.document || data.supplier?.document || '').replace(/\D/g, '');
        const sDocClean = (s.document || '').replace(/\D/g, '');
        const matchesDoc = docClean && sDocClean && (docClean === sDocClean || sDocClean.includes(docClean) || docClean.includes(sDocClean));
        return matchesName || matchesDoc;
      });

      if (autoMatchedSupplier) {
        setSupplierId(autoMatchedSupplier.id);
      } else {
        setSupplierId('');
      }

      const parsedItems = (data.parsedJson?.items || data.items || []).map((item: any) => {
        const autoMatchedProduct = products.find((p: any) => {
          const skuMatch = item.sku && p.sku && p.sku.toUpperCase() === item.sku.toUpperCase();
          const upcMatch = item.upc && p.upc && p.upc.toUpperCase() === item.upc.toUpperCase();
          const nameMatch = p.name && p.name.toUpperCase() === (item.name || item.productName || '').toUpperCase();
          return skuMatch || upcMatch || nameMatch;
        });

        if (autoMatchedProduct) {
          return {
            id: Math.random().toString(36).substr(2, 9),
            sku: item.sku || autoMatchedProduct.sku || '',
            upc: item.upc || autoMatchedProduct.upc || '',
            name: item.name || item.productName || autoMatchedProduct.name || '',
            productId: autoMatchedProduct.id,
            productName: autoMatchedProduct.name,
            _isNew: false,
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost || item.costPrice) || 0,
            totalCost: Number(item.totalCost) || (Number(item.quantity) * Number(item.unitCost || item.costPrice)),
            confidence: Number(item.confidence) || 0.9,
            rawText: item.rawText || '',
            brand: autoMatchedProduct.brand || '',
            model: autoMatchedProduct.model || '',
            groupId: autoMatchedProduct.groupId || '',
            subgroupId: autoMatchedProduct.subgroupId || '',
            shelfId: autoMatchedProduct.shelfId || '',
            salePriceA: Number(autoMatchedProduct.salePriceA) || 0,
            salePriceB: Number(autoMatchedProduct.salePriceB) || 0,
            hasSerialNumber: !!autoMatchedProduct.hasSerialNumber,
            serials: [],
            rawSerialsInput: '',
          };
        } else {
          return {
            id: Math.random().toString(36).substr(2, 9),
            sku: item.sku || '',
            upc: item.upc || '',
            name: item.name || item.productName || '',
            productId: '',
            _isNew: true,
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost || item.costPrice) || 0,
            totalCost: Number(item.totalCost) || (Number(item.quantity) * Number(item.unitCost || item.costPrice)),
            confidence: Number(item.confidence) || 0.8,
            rawText: item.rawText || '',
            brand: '',
            model: '',
            groupId: '',
            subgroupId: '',
            shelfId: '',
            salePriceA: 0,
            salePriceB: 0,
            hasSerialNumber: false,
            serials: [],
            rawSerialsInput: '',
          };
        }
      });

      setOcrItems(parsedItems);
      
      // Mostrar aviso na tela de conferência
      setError('Este OCR já foi processado anteriormente. Confira se ele ainda não foi lançado como compra antes de aprovar novamente.');
      
      setStep('review');
      setShowHistory(false);
    } catch (e: any) {
      setError(e.message || 'Falha ao reabrir OCR.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOcrJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este registro de OCR? O arquivo de imagem original e o histórico serão removidos permanentemente.')) {
      return;
    }
    try {
      const res = await apiFetch(`/api/purchases/ocr/jobs/${jobId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir OCR.');
      }
      alert('Registro excluído com sucesso.');
      loadJobsHistory();
    } catch (err: any) {
      alert(err.message || 'Falha ao excluir registro.');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Formato ou tipo de arquivo inválido. Formatos suportados: JPG, PNG e WEBP.');
      return;
    }
    // Limit to 4MB
    if (selectedFile.size > 4 * 1024 * 1024) {
      setError('O tamanho do arquivo excede o limite estipulado de 4 MB.');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Create file visual preview if it is an image
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null); // PDF or binary
    }
  };

  const handleOcrSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language === 'es-PY' ? 'es' : 'pt');

    try {
      const res = await apiFetch('/api/purchases/ocr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro desconhecido ao processar com OCR.');
      }

      // 1. Populate vendor/header info
      setOcrJobId(data.jobId || null);
      setInvoiceNumber(data.invoice?.number || '');
      setInvoiceDate(data.invoice?.date || '');
      setInvoiceTotal(Number(data.invoice?.total) || 0);
      setExtractedSupplierName(data.supplier?.name || '');
      setExtractedSupplierDoc(data.supplier?.document || '');
      setWarnings(normalizeOcrWarnings(data.warnings, language));

      // 2. Try matching supplier
      const autoMatchedSupplier = suppliers.find((s: any) => {
        const matchesName = s.name.toUpperCase().includes((data.supplier?.name || '').toUpperCase());
        const docClean = (data.supplier?.document || '').replace(/\D/g, '');
        const sDocClean = (s.document || '').replace(/\D/g, '');
        const matchesDoc = docClean && sDocClean && (docClean === sDocClean || sDocClean.includes(docClean) || docClean.includes(sDocClean));
        return matchesName || matchesDoc;
      });

      if (autoMatchedSupplier) {
        setSupplierId(autoMatchedSupplier.id);
      } else {
        setSupplierId('');
      }

      // 3. Populate products and match with database
      const parsedItems = (data.items || []).map((item: any) => {
        // Try to match SKU or UPC or close name similarity in products
        const autoMatchedProduct = products.find((p: any) => {
          const skuMatch = item.sku && p.sku && p.sku.toUpperCase() === item.sku.toUpperCase();
          const upcMatch = item.upc && p.upc && p.upc.toUpperCase() === item.upc.toUpperCase();
          const nameMatch = p.name && p.name.toUpperCase() === item.name.toUpperCase();
          return skuMatch || upcMatch || nameMatch;
        });

        if (autoMatchedProduct) {
          return {
            id: Math.random().toString(36).substr(2, 9),
            sku: item.sku || autoMatchedProduct.sku || '',
            upc: item.upc || autoMatchedProduct.upc || '',
            name: item.name || autoMatchedProduct.name || '',
            productId: autoMatchedProduct.id,
            productName: autoMatchedProduct.name,
            _isNew: false,
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost) || 0,
            totalCost: Number(item.totalCost) || (Number(item.quantity) * Number(item.unitCost)),
            confidence: Number(item.confidence) || 0.9,
            rawText: item.rawText || '',
            brand: autoMatchedProduct.brand || '',
            model: autoMatchedProduct.model || '',
            groupId: autoMatchedProduct.groupId || '',
            subgroupId: autoMatchedProduct.subgroupId || '',
            shelfId: autoMatchedProduct.shelfId || '',
            salePriceA: Number(autoMatchedProduct.salePriceA) || 0,
            salePriceB: Number(autoMatchedProduct.salePriceB) || 0,
            hasSerialNumber: !!autoMatchedProduct.hasSerialNumber,
            serials: [],
            rawSerialsInput: '',
          } as ExtendedOcrItem;
        } else {
          // New product prediction
          return {
            id: Math.random().toString(36).substr(2, 9),
            sku: item.sku || '',
            upc: item.upc || '',
            name: item.name || '',
            productId: '',
            _isNew: true,
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost) || 0,
            totalCost: Number(item.totalCost) || (Number(item.quantity) * Number(item.unitCost)),
            confidence: Number(item.confidence) || 0.8,
            rawText: item.rawText || '',
            brand: '',
            model: '',
            groupId: '',
            subgroupId: '',
            shelfId: '',
            salePriceA: 0,
            salePriceB: 0,
            hasSerialNumber: false,
            serials: [],
            rawSerialsInput: '',
          } as ExtendedOcrItem;
        }
      });

      setOcrItems(parsedItems);
      setStep('review');
      loadJobsHistory();
    } catch (e: any) {
      setError(e.message || 'Falha ao processar OCR.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName) return;

    try {
      const res = await apiFetch('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: newSupplierName,
          document: newSupplierDoc,
          email: newSupplierEmail,
          phone: newSupplierPhone,
          notes: 'Criado via fluxo de OCR import'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar fornecedor');

      // Refresh list, select active, and close modal
      const refreshedList = await loadList('/api/suppliers?includeInactive=false&page=1&limit=500');
      setSuppliers(refreshedList);
      setSupplierId(data.id || refreshedList.find((s: any) => s.name === newSupplierName)?.id || '');
      setShowNewSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierDoc('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Updaters for single items property
  const updateOcrItem = (id: string, key: keyof ExtendedOcrItem, val: any) => {
    setOcrItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [key]: val };
        // If changing quantity/m_cost, recalculate line total
        if (key === 'quantity' || key === 'unitCost') {
          updated.totalCost = Number(updated.quantity) * Number(updated.unitCost);
        }
        // Handle sync parsed serial inputs
        if (key === 'rawSerialsInput') {
          updated.serials = String(val).split(',').map(s => s.trim()).filter(Boolean);
        }
        return updated;
      }
      return item;
    }));
  };

  // Change mapping of product inside row
  const linkProductToItem = (id: string, p: any) => {
    if (!p) {
      updateOcrItem(id, 'productId', '');
      updateOcrItem(id, 'productName', '');
      updateOcrItem(id, '_isNew', true);
      return;
    }
    setOcrItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          productId: p.id,
          productName: p.name,
          sku: item.sku || p.sku || '',
          upc: item.upc || p.upc || '',
          name: p.name,
          _isNew: false,
          costPrice: p.costPrice || 0,
          unitCost: item.unitCost || p.costPrice || 0,
          brand: p.brand || '',
          model: p.model || '',
          groupId: p.groupId || '',
          subgroupId: p.subgroupId || '',
          shelfId: p.shelfId || '',
          salePriceA: p.salePriceA || 0,
          salePriceB: p.salePriceB || 0,
          hasSerialNumber: !!p.hasSerialNumber,
        };
      }
      return item;
    }));
  };

  const removeOcrItem = (id: string) => {
    setOcrItems(prev => prev.filter(item => item.id !== id));
  };

  // Submit complete invoice receipt entry to confirm endpoint
  const saveOcrData = async (autoApprove: boolean) => {
    if (!supplierId) {
      setError('Por favor, selecione um fornecedor para registrar esta entrada.');
      return;
    }
    if (ocrItems.length === 0) {
      setError('Por favor, adicione ou extraia ao menos 1 item na nota antes de confirmar.');
      return;
    }

    // Validation for new products
    let validationErr = '';
    ocrItems.forEach((item, index) => {
      if (item._isNew) {
        if (!item.sku) validationErr = `Item #${index + 1} (${item.name}): SKU é obrigatório para cadastrar como novo produto.`;
        if (!item.groupId) validationErr = `Item #${index + 1} (${item.name}): Selecione o Grupo para cadastrar como novo produto.`;
      }
      if (item.hasSerialNumber && (!item.serials || item.serials.length !== item.quantity)) {
        validationErr = `Item #${index + 1} (${item.name}): Controla número de série. Digite exatamente ${item.quantity} número(s) de série separados por vírgula.`;
      }
    });

    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Map back items payload to meet the server expected structure
      const itemsPayload = ocrItems.map(item => ({
        productId: item.productId || null,
        sku: item.sku,
        upc: item.upc || null,
        productName: item.name,
        quantity: item.quantity,
        costPrice: item.unitCost,
        salePriceA: item.salePriceA || 0,
        salePriceB: item.salePriceB || 0,
        groupId: item.groupId || null,
        subgroupId: item.subgroupId || null,
        shelfId: item.shelfId || null,
        hasSerialNumber: item.hasSerialNumber,
        serials: item.serials,
        brand: item.brand || null,
        model: item.model || null,
        updateCost: true,
        updatePriceA: item._isNew || item.salePriceA > 0,
        updatePriceB: item._isNew || item.salePriceB > 0,
      }));

      const payload = {
        supplierId,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || null,
        currency: getBaseCurrency(),
        notes: `Importado dinamicamente via Foto/OCR com Inteligência Artificial.`,
        items: itemsPayload,
        autoApprove,
        ocrJobId: ocrJobId || null
      };

      const res = await apiFetch('/api/purchases/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar entrada via OCR.');
      }

      if (autoApprove) {
        alert('Entrada via OCR importada, cadastrada e APROVADA com sucesso no estoque!');
      } else {
        alert('Entrada via OCR registrada como Rascunho com sucesso!');
      }
      navigate('/purchases');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar a entrada.');
    } finally {
      setLoading(false);
    }
  };

  // Calculators
  const calcItemsSum = () => {
    return ocrItems.reduce((acc, cur) => acc + (cur.quantity * cur.unitCost), 0);
  };

  return (
    <div className="pb-32 max-w-7xl">
      {/* Top Banner and Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchases')}
            className="mb-3 gap-2 px-0 has-[>svg]:px-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para Compras
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Upload className="w-8 h-8 text-brand-gold animate-pulse" />
            Importar por Foto / OCR
          </h1>
          <p className="text-gray-400 mt-1">Extraia mercadorias e dados de notas ou fotos instantaneamente por Inteligência Artificial</p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory);
              loadJobsHistory();
            }}
            className="h-auto rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 has-[>svg]:px-4 font-medium text-white hover:bg-gray-700 hover:text-white"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'Ocultar Histórico' : 'Ver Histórico OCR'}
          </Button>

          {step === 'review' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveOcrData(false)}
                disabled={loading}
                className="h-auto rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 has-[>svg]:px-4 font-medium text-white hover:bg-gray-700 hover:text-white"
              >
                <Save className="h-4 w-4" />
                Salvar Rascunho
              </Button>
              <Button
                size="sm"
                onClick={() => saveOcrData(true)}
                disabled={loading}
                className="h-auto rounded-lg bg-brand-gold px-4 py-2 has-[>svg]:px-4 font-semibold text-brand-navydark hover:bg-brand-goldhover"
              >
                <Check className="size-5" />
                Aprovar e Dar Entrada
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Card className="mb-6 gap-0 rounded-xl border-red-500/20 bg-red-500/10 py-0 text-red-400 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Ocorreu um erro</h4>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs history tracker list */}
      {showHistory && (
        <Card className="mb-8 gap-0 rounded-xl border-gray-800 bg-brand-navylight py-0 shadow-md">
          <CardContent className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-brand-gold" />
            Histórico Recente de Trabalhos OCR
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-brand-navydark/50 text-gray-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Tamanho</th>
                  <th className="px-4 py-3">Status OCR</th>
                  <th className="px-4 py-3">Status Compra</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {jobsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">Nenhum processo OCR registrado anteriormente.</td>
                  </tr>
                ) : (
                  jobsHistory.map((job) => {
                    let purchaseStatusLabel = 'Não lançado';
                    if (job.purchaseId) {
                      purchaseStatusLabel = job.purchaseStatus === 'APPROVED' ? 'Entrada aprovada' : 'Rascunho criado';
                    }

                    return (
                      <tr key={job.id} className="hover:bg-brand-navydark/20 transition-colors">
                        <td className="px-4 py-3 text-xs">{formatDate(job.createdAt, language)}</td>
                        <td className="px-4 py-3 font-mono text-xs max-w-[150px] truncate">{job.fileName}</td>
                        <td className="px-4 py-3 text-xs">{(Number(job.fileSize) / (1024 * 1024)).toFixed(2)} MB</td>
                        <td className="px-4 py-3">
                          {job.status === 'COMPLETED' && <Badge variant="success">Completo</Badge>}
                          {job.status === 'PROCESSING' && <Badge variant="warning" className="animate-pulse">Lendo...</Badge>}
                          {job.status === 'FAILED' && <Badge variant="destructive">Falhou</Badge>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          {job.purchaseStatus === 'APPROVED' ? (
                            <span className="text-green-400">{purchaseStatusLabel}</span>
                          ) : job.purchaseId ? (
                            <span className="text-amber-400">{purchaseStatusLabel}</span>
                          ) : (
                            <span className="text-gray-500">{purchaseStatusLabel}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                          {job.status === 'COMPLETED' ? 'Itens extraídos e processados' : job.errorMessage || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs space-x-2 whitespace-nowrap">
                          {job.status === 'COMPLETED' ? (
                            job.purchaseStatus === 'APPROVED' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/purchases')}
                                className="h-auto rounded border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 shadow-none hover:bg-blue-500/25 hover:text-blue-400 dark:border-blue-500/20 dark:bg-blue-500/10 dark:hover:bg-blue-500/25"
                              >
                                Ver Compra
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenOcrJob(job.id)}
                                className="h-auto rounded border-brand-gold/20 bg-brand-gold/10 px-2 py-1 text-xs font-semibold text-brand-gold shadow-none hover:bg-brand-gold/25 hover:text-brand-gold dark:border-brand-gold/20 dark:bg-brand-gold/10 dark:hover:bg-brand-gold/25"
                              >
                                Abrir
                              </Button>
                            )
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteOcrJob(job.id, e)}
                            className="h-auto rounded border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 shadow-none hover:bg-red-500/25 hover:text-red-400 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/25"
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 1: UPLOAD PAGE */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 gap-8">
          <Card
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "gap-0 rounded-2xl border-2 border-dashed bg-brand-navylight py-0 shadow-2xl transition-all",
              isDragActive ? "border-brand-gold bg-brand-gold/5" : "border-gray-800 hover:border-gray-700"
            )}
          >
          <CardContent className="flex flex-col items-center justify-center p-12 py-20 text-center">
            <Upload className={`w-20 h-20 mb-6 transition-transform ${isDragActive ? 'scale-110 text-brand-gold' : 'text-gray-600 hover:text-gray-500'}`} />

            <h2 className="text-2xl font-bold text-white mb-2">Selecione o arquivo da Nota Fiscal ou Foto</h2>
            <p className="text-gray-400 mb-6 text-center max-w-lg text-sm leading-relaxed">
              Arraste e solte o arquivo aqui ou faça upload manual. Suporta imagens <span className="text-brand-gold">JPG, PNG, WEBP</span> com notas legíveis de até 4 MB.
            </p>

            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleFileInputChange} 
              className="hidden" 
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!file ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-auto rounded-xl bg-brand-gold px-8 py-3 font-bold text-brand-navydark shadow-lg shadow-brand-gold/15 hover:bg-brand-goldhover active:scale-95"
                >
                  Selecionar Imagem
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-auto rounded-xl border-gray-700 bg-[#171717] px-8 py-3 has-[>svg]:px-8 font-bold text-white shadow-none active:scale-95 hover:bg-gray-800 hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800"
                >
                  <Camera className="size-5 text-brand-gold" /> Tirar Foto com a Câmera
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-[#171717] rounded-xl border border-gray-800 flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-brand-gold" />
                  <div className="text-left">
                    <div className="text-white font-medium text-sm max-w-xs truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setFile(null); setFilePreview(null); }}
                    className="rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-auto rounded-xl border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 hover:text-white"
                  >
                    Trocar Arquivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-auto rounded-xl border-gray-700 bg-[#171717] px-6 py-2.5 has-[>svg]:px-6 text-sm font-medium text-white shadow-none hover:bg-gray-800 hover:text-white dark:border-gray-700 dark:bg-[#171717] dark:hover:bg-gray-800"
                  >
                    <Camera className="h-4 w-4 text-brand-gold" /> Nova Foto
                  </Button>
                  <Button
                    onClick={handleOcrSubmit}
                    disabled={loading}
                    className="h-auto rounded-xl bg-brand-gold px-8 py-2.5 has-[>svg]:px-8 text-sm font-bold text-brand-navydark shadow-lg shadow-brand-gold/15 hover:bg-brand-goldhover disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Lendo com IA...
                      </>
                    ) : (
                      'Extrair Dados com OCR'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          </Card>

          {loading && (
            <div className="bg-brand-navylight rounded-xl border border-gray-800 p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-white mb-1">Processando seu Documento</h3>
              <p className="text-gray-400 text-sm max-w-md">
                Isso pode levar de 5 a 15 segundos. Nossa Inteligência Artificial está escaneando assinaturas, tabelas, produtos, valores, impostos e referências fiscais.
              </p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW PAGE */}
      {step === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Header details and Preview Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* INVOICE / SUPPLIER SUMMARY CARD */}
            <Card className="relative gap-0 overflow-hidden rounded-xl border-gray-800 bg-brand-navylight py-0 shadow-md">
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold" />
              <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-gold-accent text-brand-gold" />
                Dados Identificados
              </h3>

              <div className="space-y-4">
                {/* Supplier selection & creation */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Fornecedor Correspondente *</label>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setNewSupplierName(extractedSupplierName);
                        setNewSupplierDoc(extractedSupplierDoc);
                        setShowNewSupplierModal(true);
                      }}
                      className="h-auto gap-1 p-0 has-[>svg]:p-0 text-xs font-medium text-primary"
                    >
                      <PlusCircle className="size-3.5" /> Cadastrar Novo
                    </Button>
                  </div>
                  
                  <select 
                    value={supplierId} 
                    onChange={e => setSupplierId(e.target.value)} 
                    className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                  >
                    <option value="">Selecione ou clique em Cadastrar ...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.document ? `(${s.document})` : ''}</option>)}
                  </select>

                  {extractedSupplierName && !supplierId && (
                    <Card className="mt-2 gap-0 rounded-lg border-amber-500/20 bg-amber-500/10 py-0 text-xs text-amber-400 shadow-none">
                      <CardContent className="flex items-start gap-2 p-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          Detectado na nota: <strong>{extractedSupplierName}</strong>
                          {extractedSupplierDoc && ` (${extractedSupplierDoc})`}. Não encontramos vínculo exato no banco de dados. Cadastre acima ou selecione um fornecedor existente.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Invoice configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Número da Nota Fiscal</label>
                    <input 
                      type="text" 
                      value={invoiceNumber} 
                      onChange={e => setInvoiceNumber(e.target.value)}
                      className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Data da Nota</label>
                    <input 
                      type="date" 
                      value={invoiceDate} 
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Financial Summary and sanity helper */}
                <Card className="mt-4 gap-0 rounded-xl border-gray-850 bg-[#171717] py-0 shadow-none">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total da Nota Fiscal Extraído:</span>
                      <span className="text-white font-semibold"><Money value={invoiceTotal} lang={language} /></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Soma Calculada dos Itens:</span>
                      <span className={`font-semibold ${Math.abs(calcItemsSum() - invoiceTotal) > 0.01 ? 'text-amber-400' : 'text-green-400'}`}>
                        <Money value={calcItemsSum()} lang={language} />
                      </span>
                    </div>
                    {Math.abs(calcItemsSum() - invoiceTotal) > 0.01 && (
                      <div className="text-[10px] text-amber-400 leading-normal flex items-start gap-1 p-1 bg-amber-500/5 rounded">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        Aviso: A soma dos produtos listados difere do total geral identificado no rodapé da nota fiscal. Verifique quantidades ou custos.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              </CardContent>
            </Card>

            {/* INTEGRATED RECEIPT PREVIEW */}
            <Card className="gap-0 rounded-xl border-gray-800 bg-brand-navylight py-0 shadow-md">
              <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Image className="w-5 h-5 text-brand-gold" />
                {language === 'es-PY' ? 'Imagen del Documento' : 'Imagem do Documento'}
              </h3>

              {filePreview ? (
                <div className="rounded-lg overflow-hidden border border-gray-800 max-h-96 bg-black relative flex items-center justify-center p-3 group">
                  <img 
                    src={filePreview} 
                    alt="Document preview" 
                    className="max-h-80 w-auto object-contain transition-transform group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded backdrop-blur">
                    {language === 'es-PY' ? 'Vista previa' : 'Pré-visualização'}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-850 bg-[#171717] p-12 text-center flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-xs text-gray-500 font-mono break-all max-w-[200px]">{file?.name}</p>
                  <p className="text-[10px] text-gray-600 mt-2">Documento em formato PDF ou similar. Sem prévia de imagem disponível.</p>
                </div>
              )}
              </CardContent>
            </Card>

            {/* WARNINGS CORNER */}
            {warnings.length > 0 && (
              <Card className="gap-0 rounded-xl border-amber-500/20 bg-amber-500/5 py-0 shadow-none">
                <CardContent className="p-4">
                  <h4 className="text-amber-400 font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide mb-2">
                    <AlertTriangle className="w-4 h-4" /> {language === 'es-PY' ? 'Notas de Análisis de la IA' : 'Notas de Análise da IA'}
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                    {warnings.map((w, idx) => <li key={idx} className="leading-relaxed">{w}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* RESET ACCORDION */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setFilePreview(null);
                  setOcrItems([]);
                  setError('');
                }}
                className="h-auto p-0 text-xs text-gray-500 underline hover:text-white"
              >
                ← Importar outro arquivo / Recomeçar OCR
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Tabular Items review */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="gap-0 rounded-xl border-gray-800 bg-brand-navylight py-0 shadow-md">
              <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-gold" />
                    Produtos Encontrados na Nota
                  </h3>
                  <p className="text-gray-400 text-xs">Vincule os produtos detectados aos itens cadastrados em seu estoque ou organize o novo cadastro.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-[#171717] px-3 py-1.5 rounded-lg border border-gray-850 text-gray-400">
                    Total de Itens: <strong className="text-brand-gold">{ocrItems.length}</strong>
                  </span>
                </div>
              </div>

              {ocrItems.length === 0 ? (
                <div className="p-12 text-center text-gray-500">Nenhum produto detectado ou extraído da nota fiscal.</div>
              ) : (
                <div className="space-y-6">
                  {ocrItems.map((item, idx) => (
                    <Card
                      key={item.id}
                      className={cn(
                        "gap-0 rounded-xl py-0 shadow-none transition-all",
                        item._isNew
                          ? "border-amber-500/20 bg-amber-500/[0.01]"
                          : "border-gray-800 bg-brand-navydark/30"
                      )}
                    >
                    <CardContent className="p-5">
                      {/* Flex header row */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 pb-3 border-b border-gray-800/40">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="uppercase">
                              Linha #{idx + 1}
                            </Badge>
                            <Badge variant={item._isNew ? "warning" : "success"}>
                              {item._isNew ? 'Novo Produto' : `Produto Vinculado: ${item.productName}`}
                            </Badge>

                            {/* Confidence Rating */}
                            <Badge variant={item.confidence < 0.8 ? "destructive" : "success"} className="gap-1">
                              Confiança: {(item.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2">
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={e => updateOcrItem(item.id, 'name', e.target.value)}
                              className="text-white font-bold bg-transparent border-b border-dashed border-gray-700 focus:border-brand-gold outline-none w-full max-w-md text-sm"
                              placeholder="Nome do produto"
                            />
                          </div>

                          {item.rawText && item.rawText !== item.name && (
                            <div className="text-[10px] text-gray-500 font-mono mt-1 italic">
                              Texto Original da Nota: "{item.rawText}"
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeOcrItem(item.id)}
                            title="Remover este item"
                            className="rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Main row grid edit fields */}
                      {item._isNew ? (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 bg-brand-navydark/25 p-4 rounded-lg border border-dashed border-gray-800">
                           <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Grupo do Produto *</label>
                               <select value={item.groupId || ''} onChange={e => {
                                 if (e.target.value === 'NEW') { 
                                   setQuickCreateContextItemId(item.id); 
                                   setShowGroupModal(true); 
                                   return; 
                                 }
                                 updateOcrItem(item.id, 'groupId', e.target.value);
                                 updateOcrItem(item.id, 'subgroupId', '');
                               }} className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none text-gray-300">
                                  <option value="">Selecione o grupo...</option>
                                  <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Grupo</option>
                                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                               </select>
                           </div>
                           <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Subgrupo</label>
                               <select disabled={!item.groupId} value={item.subgroupId || ''} onChange={e => {
                                 if (e.target.value === 'NEW') { 
                                   setQuickCreateContextItemId(item.id); 
                                   setQuickSubgroupParentId(item.groupId);
                                   setShowSubgroupModal(true); 
                                   return; 
                                 }
                                 updateOcrItem(item.id, 'subgroupId', e.target.value);
                               }} className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none text-gray-300 disabled:opacity-50">
                                  <option value="">Nenhum</option>
                                  <option value="NEW" className="font-bold text-brand-gold">+ Criar Novo Subgrupo</option>
                                  {subgroups.filter(sg => sg.groupId === item.groupId).map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                               </select>
                           </div>

                           <div className="md:col-span-3">
                             <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">SKU *</label>
                             <div className="flex gap-1">
                               <input 
                                 type="text" 
                                 value={item.sku || ''} 
                                 onChange={e => updateOcrItem(item.id, 'sku', e.target.value)}
                                 className="flex-1 min-w-0 bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none focus:border-brand-gold font-medium"
                                 placeholder="Ex: SKU-9273"
                               />
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 onClick={async () => {
                                   if (!item.groupId) {
                                     alert("Selecione um grupo de produto para este item antes de gerar o SKU.");
                                     return;
                                   }
                                   try {
                                     const r = await apiFetch(`/api/products/next-sku?groupId=${item.groupId}${item.subgroupId ? '&subgroupId=' + item.subgroupId : ''}`);
                                     if (r.ok) {
                                       const data = await r.json();
                                       updateOcrItem(item.id, 'sku', data.sku);
                                     } else {
                                       alert("Falha ao gerar SKU.");
                                     }
                                   } catch (e) {
                                     console.error(e);
                                   }
                                 }}
                                 className="h-auto shrink-0 rounded border border-brand-gold/20 bg-brand-gold/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-brand-gold hover:bg-brand-gold/20 hover:text-brand-gold dark:hover:bg-brand-gold/20"
                               >
                                 Gerar SKU
                               </Button>
                             </div>
                           </div>
                           
                           <div className="md:col-span-3">
                             <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Código de Barras (UPC/EAN)</label>
                             <input 
                               type="text" 
                               value={item.upc || ''} 
                               onChange={e => updateOcrItem(item.id, 'upc', e.target.value)}
                               className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none focus:border-brand-gold"
                               placeholder="Barcode"
                             />
                           </div>

                             <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">{moneyFieldLabel("Custo Unitário")}</label>
                               <input 
                                 type="number" 
                                 value={item.unitCost} 
                                 onChange={e => updateOcrItem(item.id, 'unitCost', Number(e.target.value))}
                                 className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none font-medium"
                                 step="0.01"
                               />
                             </div>
                             
                             <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">{moneyFieldLabel("Preço A (Varejo)")}</label>
                               <input 
                                 type="number" 
                                 value={item.salePriceA || 0} 
                                 onChange={e => updateOcrItem(item.id, 'salePriceA', Number(e.target.value))}
                                 className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none font-medium"
                                 step="0.01"
                               />
                             </div>

                             <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">{moneyFieldLabel("Preço B (Atacado)")}</label>
                               <input 
                                 type="number" 
                                 value={item.salePriceB || 0} 
                                 onChange={e => updateOcrItem(item.id, 'salePriceB', Number(e.target.value))}
                                 className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none font-medium"
                                 step="0.01"
                               />
                             </div>

                             <div className="md:col-span-3">
                               <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">Prateleira / Localização</label>
                               <select 
                                 value={item.shelfId || ''} 
                                 onChange={e => updateOcrItem(item.id, 'shelfId', e.target.value)}
                                 className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none text-gray-300"
                               >
                                 <option value="">Sem localização</option>
                                 {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                               </select>
                             </div>

                           <div className="md:col-span-2">
                             <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">Quantidade</label>
                             <input 
                               type="number" 
                               value={item.quantity} 
                               onChange={e => updateOcrItem(item.id, 'quantity', Number(e.target.value))}
                               className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none focus:border-brand-gold"
                               min="1"
                             />
                           </div>

                           <div className="md:col-span-2">
                             <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">Marca</label>
                             <input 
                               type="text"
                               value={item.brand || ''}
                               onChange={e => updateOcrItem(item.id, 'brand', e.target.value)}
                               className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none"
                             />
                           </div>

                           <div className="md:col-span-2">
                             <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">Modelo</label>
                             <input 
                               type="text"
                               value={item.model || ''}
                               onChange={e => updateOcrItem(item.id, 'model', e.target.value)}
                               className="w-full bg-[#171717] border border-gray-800 rounded px-2 py-1 text-white text-xs outline-none"
                             />
                           </div>

                           <div className="md:col-span-6 flex items-center pt-2">
                             <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                               <input 
                                 type="checkbox" 
                                 checked={item.hasSerialNumber} 
                                 onChange={e => updateOcrItem(item.id, 'hasSerialNumber', e.target.checked)}
                                 className="rounded border-gray-800 bg-[#171717] text-brand-gold focus:ring-0 w-4 h-4"
                               />
                               <span className="text-xs text-gray-300">Controla Números de Série?</span>
                             </label>
                           </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Código de Barras (UPC/EAN)</label>
                            <input 
                              type="text" 
                              value={item.upc || ''} 
                              onChange={e => updateOcrItem(item.id, 'upc', e.target.value)}
                              className="w-full bg-[#171717] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-brand-gold"
                              placeholder="Barcode"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Quantidade</label>
                            <input 
                              type="number" 
                              value={item.quantity} 
                              onChange={e => updateOcrItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-full bg-[#171717] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-brand-gold"
                              min="1"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{moneyFieldLabel("Custo Unitário")}</label>
                            <input 
                              type="number" 
                              value={item.unitCost} 
                              onChange={e => updateOcrItem(item.id, 'unitCost', Number(e.target.value))}
                              className="w-full bg-[#171717] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-brand-gold"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}

                      {/* Manual / Search and dropdown Mapping tool */}
                      <div className="bg-brand-navydark/50 p-3 rounded-lg border border-gray-850 mb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="text-xs text-gray-400">
                          {item._isNew ? (
                            <span>Este item será cadastrado como um <strong>novo produto</strong>. Deseja vinculá-lo a um estoque existente?</span>
                          ) : (
                            <span>Vinculado ao produto: <strong className="text-brand-gold">{item.productName}</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select 
                            value={item.productId || ''} 
                            onChange={e => {
                              const found = products.find(p => p.id === e.target.value);
                              linkProductToItem(item.id, found);
                            }}
                            className="bg-[#171717] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white max-w-xs focus:border-brand-gold focus:outline-none"
                          >
                            <option value="">[Cadastrar como Novo]</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(SKU: ${p.sku})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* NO EXTRA PARAMETERS SECTION - MERGED ABOVE */}

                      {/* SERIAL NUMBER FIELDS */}
                      {item.hasSerialNumber && (
                        <Card className="mt-3 gap-0 rounded-lg border-red-500/10 bg-red-500/5 py-0 shadow-none">
                          <CardContent className="p-3">
                            <label className="block text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">
                              Números de Série (Digite {item.quantity} séries separados por vírgula):
                            </label>
                            <input
                              type="text"
                              value={item.rawSerialsInput || ''}
                              onChange={e => updateOcrItem(item.id, 'rawSerialsInput', e.target.value)}
                              className="w-full bg-[#171717] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-red-500/40"
                              placeholder="ZNT0192A, ZNT0193B, ZNT0194C"
                            />
                            <div className="mt-1 flex gap-2 flex-wrap text-[10px] text-gray-450">
                              <span>Séries Identificados:</span>
                              {item.serials.map((s, sIdx) => (
                                <span key={sIdx} className="bg-[#171717] px-1.5 py-0.5 rounded text-white border border-gray-800 font-mono">
                                  {s}
                                </span>
                              ))}
                              {item.serials.length !== item.quantity && (
                                <span className="text-red-400 font-semibold animate-pulse">
                                  (Restam {item.quantity - item.serials.length} série(s))
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-brand-navydark/80 z-50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="relative w-full max-w-md gap-0 rounded-xl border-gray-800 shadow-2xl py-0">
          <CardContent className="p-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNewSupplierModal(false)}
              className="absolute top-4 right-4 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
            >
              <X className="size-5" />
            </Button>

            <h3 className="text-lg font-bold text-white mb-4">Cadastrar Novo Fornecedor</h3>
            
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Razão Social / Nome Fantasia *</label>
                <input 
                  type="text" 
                  required
                  value={newSupplierName} 
                  onChange={e => setNewSupplierName(e.target.value)}
                  className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Documento (CNPJ/RUC/CPF)</label>
                <input 
                  type="text" 
                  value={newSupplierDoc} 
                  onChange={e => setNewSupplierDoc(e.target.value)}
                  className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={newSupplierEmail} 
                    onChange={e => setNewSupplierEmail(e.target.value)}
                    className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={newSupplierPhone} 
                    onChange={e => setNewSupplierPhone(e.target.value)}
                    className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="h-auto rounded-lg border-gray-700 bg-transparent px-4 py-2 font-medium text-gray-400 shadow-none hover:bg-transparent hover:text-white dark:border-gray-700 dark:bg-transparent dark:hover:bg-transparent"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-auto rounded-lg bg-brand-gold px-4 py-2 font-bold text-brand-navydark hover:bg-brand-goldhover"
                >
                  Cadastrar e Vincular
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>
        </div>
      )}

      <QuickGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSuccess={async (newId) => {
          await loadGroupsData();
          if (quickCreateContextItemId) {
              updateOcrItem(quickCreateContextItemId, 'groupId', newId);
              updateOcrItem(quickCreateContextItemId, 'subgroupId', '');
          }
        }}
      />

      <QuickSubgroupModal
        isOpen={showSubgroupModal}
        onClose={() => setShowSubgroupModal(false)}
        groupId={quickSubgroupParentId}
        groupName={groups.find(g => g.id === quickSubgroupParentId)?.name || ""}
        onSuccess={async (newId) => {
          await loadGroupsData();
          if (quickCreateContextItemId) {
              updateOcrItem(quickCreateContextItemId, 'subgroupId', newId);
          }
        }}
      />

    </div>
  );
}
