import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { ShoppingCart, Phone, Clock, MessageCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function AbandonedCarts() {
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/store/admin/abandoned-carts");
      const data = await res.json();
      setCarts(res.ok && Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (cart: any) => {
    const phone = cart.customerPhone.replace(/\D/g, '');
    const name = cart.customerName ? cart.customerName.split(' ')[0] : 'Cliente';
    const itemsText = Array.isArray(cart.cartData) 
      ? cart.cartData.map((i: any) => `- ${i.qty}x ${i.variantName || i.name}`).join('%0A')
      : 'seus itens';
    
    const message = `Olá ${name}! Tudo bem?%0AVi que você deixou alguns itens no carrinho da nossa loja:%0A${itemsText}%0A%0ATeve alguma dificuldade para finalizar a compra? Posso te ajudar com um desconto especial?`;
    
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Carrinhos Abandonados</h1>
          <p className="mt-1 text-sm text-gray-400">
            Recupere vendas contatando clientes que desistiram no checkout.
          </p>
        </div>
      </div>

      {carts.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
            <ShoppingBag className="mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-medium">Nenhum carrinho pendente.</p>
            <p className="text-sm">Boas notícias! Todos os checkouts iniciados foram concluídos.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#171717] text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Última Atualização</th>
                  <th className="px-6 py-4 font-medium">Itens no Carrinho</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {carts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{cart.customerName || 'Não informado'}</div>
                      <div className="flex items-center text-gray-400">
                        <Phone className="mr-1 h-3 w-3" />
                        {cart.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(cart.updatedAt).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[300px] space-y-1">
                        {Array.isArray(cart.cartData) && cart.cartData.map((item: any, idx: number) => (
                          <div key={idx} className="truncate text-xs text-gray-400">
                            {item.qty}x {item.variantName || item.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button className="bg-green-500 text-white hover:bg-green-600" onClick={() => openWhatsApp(cart)}>
                        <MessageCircle className="h-4 w-4" />
                        Recuperar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
