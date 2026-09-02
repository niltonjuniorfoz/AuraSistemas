import React, { useEffect, useState } from 'react';
import { Building2, Save, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { normalizeSystemCurrency, setSystemCurrency } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function CompanySettings() {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'master'].includes(user?.role?.toLowerCase() || '');

  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    documentType: 'RUC',
    documentNumber: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    defaultCurrency: 'USD',
    defaultIvaPercentage: '10',
    pixKey: '',
    pixExchangeRate: '5.50',
    logoUrl: '',
    whatsappGateway: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await apiFetch('/api/settings/company');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          companyName: data.companyName || '',
          tradeName: data.tradeName || '',
          documentType: data.documentType === 'CNPJ' ? 'CNPJ' : 'RUC',
          documentNumber: data.documentNumber || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          defaultCurrency: normalizeSystemCurrency(data.defaultCurrency),
          defaultIvaPercentage: data.defaultIvaPercentage || '10',
          pixKey: data.pixKey || '',
          pixExchangeRate: data.pixExchangeRate || '5.50',
          logoUrl: data.logoUrl || '',
          whatsappGateway: data.whatsappGateway || ''
        });
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("API error:", err);
        setFetchError(true);
      }
    } catch (err) {
       console.error("Fetch error:", err);
       setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const createDefault = async () => {
    // will just act as handleSave with empty ones, but handled nicely.
    handleSave(new Event('submit') as unknown as React.FormEvent);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/settings/company', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSystemCurrency(formData.defaultCurrency);
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setFetchError(false);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações.' });
      }
    } catch(e: any) {
      console.error(e);
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="rounded-xl gap-0 border-red-500/30 bg-red-500/10 p-6 text-center shadow-md">
        <CardContent className="p-0">
           <h3 className="text-xl font-bold text-red-400 mb-2">Não foi possível carregar os dados da empresa</h3>
           <p className="text-gray-300 mb-6">Não foi possível carregar agora. Tente novamente ou crie a configuração padrão.</p>
           <div className="flex justify-center gap-4">
              <Button onClick={loadData} variant="secondary" className="h-auto rounded bg-gray-800 px-4 py-2 text-base text-white transition hover:bg-gray-700">Tentar Novamente</Button>
              <Button onClick={createDefault} className="h-auto rounded bg-brand-gold px-4 py-2 text-base font-semibold text-brand-navydark transition hover:bg-brand-goldhover">Criar Configuração Padrão</Button>
           </div>
           {message.text && (
             <div className="mt-4 text-red-400 text-sm">{message.text}</div>
           )}
        </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Dados da Empresa</h2>
          <p className="text-gray-400 text-sm">Informações principais que aparecem em relatórios e notas.</p>
        </div>
      </div>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
      <CardContent className="p-0">
        {message.text && (
           <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
           </div>
        )}
        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nome da Empresa (Razão Social)</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Razão social da empresa" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nome Fantasia</label>
              <input type="text" name="tradeName" value={formData.tradeName} onChange={handleChange} placeholder="Nome que aparece na loja" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Documento da Empresa</label>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <select name="documentType" value={formData.documentType} onChange={handleChange} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                  <option value="RUC">RUC</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
                <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} placeholder={formData.documentType === 'CNPJ' ? '00.000.000/0000-00' : '80000000-1'} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
              </div>
              <p className="text-xs text-gray-500">O tipo selecionado aparece automaticamente nas notas e recibos.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Telefone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+595 999 000 000" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">E-mail Comercial</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contato@sualoja.com.br" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">WhatsApp do gateway (comprovantes)</label>
              <input type="text" name="whatsappGateway" value={formData.whatsappGateway} onChange={handleChange} placeholder="Ex.: 41 99876-5432" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
              <p className="text-xs text-gray-500">Número fixo para onde os comprovantes PIX são enviados no PC. No celular, o menu de compartilhar deixa escolher o contato.</p>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Endereço Completo</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Av. Principal, 1234..." className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Cidade</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Ciudad del Este" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">País</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Paraguai" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-gray-800 col-span-1 md:col-span-2">
              <h3 className="text-white font-medium mb-4">Preferências do Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Moeda do Sistema</label>
                  <select name="defaultCurrency" value={formData.defaultCurrency} onChange={handleChange} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                    <option value="USD">Somente Dólar — US$</option>
                    <option value="BRL">Somente Real — R$</option>
                    <option value="DUAL">Dólar + Real — US$ e R$</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    No modo Dólar + Real, o dólar permanece como valor base e o Real é calculado pela cotação configurada.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Configuração fiscal padrão</label>
                  <select name="defaultIvaPercentage" value={formData.defaultIvaPercentage} onChange={handleChange} className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors">
                    <option value="0">Sem acréscimo</option>
                    <option value="5">Padrão 5</option>
                    <option value="10">Padrão 10</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2 mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-white font-medium mb-2">PIX / Cobrança QR Code</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Chave PIX</label>
                  <input type="text" name="pixKey" value={formData.pixKey} onChange={handleChange} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors" />
                  <p className="mt-1 text-xs text-gray-500">Usada no Caixa para gerar QR Code PIX na cobrança.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Cotação PIX (BRL por US$)</label>
                  <input type="number" step="0.0001" min="0" disabled={formData.defaultCurrency === 'BRL'} name="pixExchangeRate" value={formData.pixExchangeRate} onChange={handleChange} placeholder="5.50" className="w-full bg-[#171717] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold transition-colors disabled:opacity-50" />
                  <p className="mt-1 text-xs text-gray-500">{formData.defaultCurrency === 'BRL' ? 'Com o sistema em Real, o PIX usa o próprio valor em R$ e não aplica cotação.' : 'Usada para converter valores em US$ para R$ no PIX e no modo Dólar + Real.'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300">Logo da Empresa</label>
              {formData.logoUrl ? (
                 <div className="relative inline-block border border-gray-800 rounded p-2 bg-[#171717]">
                    <img src={formData.logoUrl} alt="Logo" className="max-h-32 object-contain" />
                    <Button
                       type="button"
                       variant="ghost"
                       size="icon-xs"
                       onClick={() => setFormData({...formData, logoUrl: ''})}
                       className="absolute -top-2 -right-2 size-auto rounded-full bg-red-500 p-1 text-white shadow transition hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white"
                    >
                       <X className="size-4" />
                    </Button>
                 </div>
              ) : (
                <div className="relative border-2 border-dashed border-gray-800 rounded-lg p-8 text-center text-gray-500 hover:border-gray-700 hover:bg-white/5 transition cursor-pointer">
                  <input type="file" accept="image/png, image/jpeg, image/webp" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     if (file.size > 1024 * 1024) {
                        setMessage({ type: 'error', text: 'Tamanho máximo da logo é 1MB.' });
                        return;
                     }
                     
                     const formDataUpload = new FormData();
                     formDataUpload.append('logo', file);
                     
                     try {
                        setSaving(true);
                        const res = await apiFetch('/api/settings/company/logo', {
                           method: 'POST',
                           body: formDataUpload
                        });
                        const data = await res.json();
                        if (res.ok) {
                           setFormData({...formData, logoUrl: data.logoUrl});
                           setMessage({ type: 'success', text: 'Logo enviada com sucesso!' });
                        } else {
                           setMessage({ type: 'error', text: data.error || 'Erro ao enviar logo.' });
                        }
                     } catch(err) {
                        setMessage({ type: 'error', text: 'Erro de conexão.' });
                     } finally {
                        setSaving(false);
                        e.target.value = '';
                     }
                  }} />
                  Clique para enviar a logo (PNG, JPG, WEBP - Max 1MB)
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="h-auto gap-2 rounded-lg bg-brand-gold px-6 py-2.5 has-[>svg]:px-6 text-base font-medium text-brand-navydark transition hover:bg-brand-goldhover"
            >
              <Save className="size-5" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>
    </div>
  );
}
