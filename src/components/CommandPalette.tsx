import * as React from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, ShoppingCart, Wallet, PiggyBank, UserRound, HandCoins, Truck, FileText,
  Package, Tags, Users, PackageSearch, Receipt, ArrowRightLeft, BarChart3, Shield, Settings,
  Plus, Search, Loader2,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { apiFetch } from "../lib/api";
import { AdminExchangeBadge } from "./AdminExchangeBadge";

type Nav = { label: string; path: string; icon: any; keywords?: string };

const NAV: Nav[] = [
  { label: "Painel", path: "/painel", icon: LayoutDashboard, keywords: "dashboard inicio home resumo" },
  { label: "Ponto de Venda", path: "/pos", icon: ShoppingCart, keywords: "pdv vender caixa frente" },
  { label: "Caixa", path: "/cash", icon: Wallet, keywords: "receber pagamento sangria suprimento fechar" },
  { label: "Financeiro", path: "/finance", icon: PiggyBank, keywords: "contas banco dinheiro cambio dolar guarani transferir" },
  { label: "Pessoal", path: "/personal", icon: UserRound, keywords: "gasto custo de vida runway orcamento distribuicao lucro" },
  { label: "Contas a Receber", path: "/receivables", icon: HandCoins, keywords: "cobranca vencida cliente deve" },
  { label: "Contas a Pagar", path: "/payables", icon: Receipt, keywords: "pagar fornecedor boleto vencimento" },
  { label: "Entregas", path: "/delivery", icon: Truck, keywords: "entregar rota separacao" },
  { label: "Vendas Realizadas", path: "/sales", icon: FileText, keywords: "notas pedidos historico" },
  { label: "Produtos", path: "/products", icon: Package, keywords: "estoque item sku catalogo lote" },
  { label: "Grupos/Categorias", path: "/groups", icon: Tags, keywords: "categoria subgrupo" },
  { label: "Clientes", path: "/customers", icon: Users, keywords: "comprador cadastro cpf" },
  { label: "Fornecedores", path: "/suppliers", icon: PackageSearch, keywords: "compra origem china eua paraguai" },
  { label: "Entrada de Mercadoria", path: "/purchases", icon: Package, keywords: "compra importacao nota entrada usd" },
  { label: "Transferências", path: "/transfers", icon: ArrowRightLeft, keywords: "estoque mover loja deposito" },
  { label: "Relatórios", path: "/reports", icon: BarChart3, keywords: "abc margem real comissoes lucro" },
  { label: "Margem Real (câmbio)", path: "/reports/real-margin", icon: BarChart3, keywords: "lucro verdadeiro custo epoca fifo" },
  { label: "DRE & Patrimônio (PL)", path: "/reports/statements", icon: BarChart3, keywords: "dre resultado balanco patrimonio liquido pl lucro demonstrativo" },
  { label: "Curva ABC", path: "/reports/abc", icon: BarChart3, keywords: "produtos mais vendem classe" },
  { label: "Usuários & Permissões", path: "/users", icon: Shield, keywords: "acesso funcionario papel" },
  { label: "Configurações", path: "/settings", icon: Settings, keywords: "empresa pix whatsapp moeda backup" },
  { label: "Moedas e cotações", path: "/settings/currencies", icon: ArrowRightLeft, keywords: "cambio cotacao dolar guarani real moedas" },
];

const ACTIONS: Nav[] = [
  { label: "Nova venda (PDV)", path: "/pos", icon: Plus, keywords: "criar vender novo pedido" },
  { label: "Novo gasto pessoal", path: "/personal", icon: Plus, keywords: "lancar despesa vida" },
  { label: "Nova entrada de mercadoria", path: "/purchases/new", icon: Plus, keywords: "comprar importar" },
  { label: "Abrir/fechar caixa", path: "/cash", icon: Wallet, keywords: "abertura fechamento conferencia" },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    const onOpen = () => setOpen(true);
    window.addEventListener("origin:open-command", onOpen as EventListener);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("origin:open-command", onOpen as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setProducts([]); setCustomers([]); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const [p, c] = await Promise.all([
          apiFetch(`/api/products?search=${encodeURIComponent(q)}&limit=5`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        const list = (v: any) => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);
        setProducts(list(p).slice(0, 5));
        setCustomers(list(c).slice(0, 5));
      } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const go = (path: string) => { setOpen(false); setQuery(""); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Navegue, busque e execute ações">
      <CommandInput placeholder="Buscar página, produto, cliente ou ação..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="flex items-center justify-center gap-2 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> buscando...</span>
          ) : "Nada encontrado."}
        </CommandEmpty>

        {products.length > 0 && (
          <CommandGroup heading="Produtos">
            {products.map((p: any) => (
              <CommandItem key={p.id} value={`produto ${p.name} ${p.sku}`} onSelect={() => go("/products")}>
                <Package className="text-muted-foreground" />
                <span className="truncate">{p.name}</span>
                <CommandShortcut className="font-mono">{p.sku}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {customers.length > 0 && (
          <CommandGroup heading="Clientes">
            {customers.map((c: any) => (
              <CommandItem key={c.id} value={`cliente ${c.name} ${c.document || ""}`} onSelect={() => go("/customers")}>
                <Users className="text-muted-foreground" />
                <span className="truncate">{c.name}</span>
                {c.document && <CommandShortcut className="font-mono">{c.document}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(products.length > 0 || customers.length > 0) && <CommandSeparator />}

        <CommandGroup heading="Ações rápidas">
          {ACTIONS.map((a) => (
            <CommandItem key={a.label} value={`${a.label} ${a.keywords || ""}`} onSelect={() => go(a.path)}>
              <a.icon className="text-primary" />
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ir para">
          {NAV.map((n) => (
            <CommandItem key={n.path + n.label} value={`${n.label} ${n.keywords || ""}`} onSelect={() => go(n.path)}>
              <n.icon className="text-muted-foreground" />
              <span>{n.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function CommandTrigger({ className = "" }: { className?: string }) {
  return (
    <>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("origin:open-command"))}
        className={`group flex h-9 items-center gap-2 rounded-lg border border-gray-800 bg-brand-navylight px-3 text-xs text-gray-400 transition hover:border-brand-gold/50 hover:text-gray-200 ${className}`}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-gray-700 bg-[#171717] px-1.5 py-0.5 font-mono text-[10px] text-gray-500 sm:inline-flex">
          Ctrl K
        </kbd>
      </button>
      <AdminExchangeBadge />
    </>
  );
}
