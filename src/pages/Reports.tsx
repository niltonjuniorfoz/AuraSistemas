import React from "react";
import { LogOut, FileText, PackageSearch, Users, DollarSign, Package, Activity, BarChart3, Percent, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";

const Reports = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Relatórios</h2>
        <Button
          variant="ghost"
          onClick={logout}
          className="h-auto gap-2 p-0 text-gray-400 hover:bg-transparent hover:text-white dark:hover:bg-transparent"
        >
          <LogOut className="size-[18px]" />
          <span className="text-sm font-medium">Sair</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-brand-navylight p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/reports/profit")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <DollarSign className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Dashboard Financeiro</h3>
            <p className="text-sm text-gray-400">Visão geral da empresa com vendas, lucro, despesas, margem e desempenho por período.</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/products-catalog")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <FileText className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Catálogo PDF</h3>
            <p className="text-sm text-gray-400">Gere um PDF do seu portfólio</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/products-financial")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <PackageSearch className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Relatório Financeiro de Produtos</h3>
            <p className="text-sm text-gray-400">Análise de vendas, faturamento, custos e lucratividade por produto.</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/stock-movements")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <Activity className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Movimentação de Produtos</h3>
            <p className="text-sm text-gray-400">Controle entradas, saídas, reservas, devoluções e ajustes por período e produto.</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/commissions")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <Percent className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Comissões de Vendedores</h3>
            <p className="text-sm text-gray-400">Comissão por vendedor no período, com base no faturamento das vendas.</p>
          </Button>

          <div className="bg-[#171717] border border-gray-800 rounded-xl p-6 opacity-50 flex flex-col items-center justify-center min-h-[160px] text-center">
            <Users size={40} className="text-gray-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Clientes</h3>
            <p className="text-sm text-gray-400">Em Breve</p>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/abc")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <BarChart3 className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Curva ABC de Produtos</h3>
            <p className="text-sm text-gray-400">Descubra quais produtos concentram seu faturamento (classes A, B e C).</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/statements")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <FileText className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">DRE & Patrimônio (PL)</h3>
            <p className="text-sm text-gray-400">Resultado do período (receita → CMV → despesas → lucro) e a foto do patrimônio da empresa.</p>
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/reports/real-margin")}
            className="h-auto min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-gray-800 bg-[#171717] p-6 text-center hover:border-brand-gold hover:bg-[#171717] dark:hover:bg-[#171717] whitespace-normal"
          >
            <TrendingUp className="size-10 mb-4 text-brand-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">Margem Real (câmbio)</h3>
            <p className="text-sm text-gray-400">Quanto você ganhou de verdade: venda em R$ menos o custo da época da compra (câmbio congelado).</p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
