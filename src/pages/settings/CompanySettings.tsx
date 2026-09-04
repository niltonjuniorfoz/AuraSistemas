import React, { useEffect, useState } from 'react';
import { Building2, Save, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
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
    defaultCurrency: 'DUAL',
    defaultIvaPercentage: '10',
    pixKey: '',
    pixExchangeRate: '5.50',
    logoUrl: '',
    whatsappGateway: '',
    instagramUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await apiFetch('/api/settings/company');
      if (!res.ok) throw new Error('Falha ao carregar empresa');
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
        // Mantidos no payload para preservar compatibilidade. A edição destes
        // campos agora fica exclusivamente em Configurações > Moedas.
        defaultCurrency: data.defaultCurrency || 'DUAL',
        defaultIvaPercentage: data.defaultIvaPercentage || '10',
        pixKey: data.pixKey || '',
        pixExchangeRate: data.pixExchangeRate || '5.50',
        logoUrl: data.logoUrl || '',
        whatsappGateway: data.whatsappGateway || '',
        instagramUrl: data.instagramUrl || ''
      });
    } catch (error) {
      console.error(error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/settings/company', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar configurações.');
      }
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setFetchError(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  if (!isAdmin) return <div className="p-8 text-center text-red-400">Acesso negado.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  if (fetchError) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="rounded-xl gap-0 border-red-500/30 bg-red-500/10 p-6 text-center shadow-md">
          <CardContent className="p-0">
            <h3 className="mb-2 text-xl font-bold text-red-400">Não foi possível carregar os dados da empresa</h3>
            <p className="mb-6 text-gray-300">Tente novamente. Nenhuma configuração será sobrescrita enquanto os dados não forem carregados.</p>
            <Button onClick={loadData} variant="secondary" className="h-auto rounded bg-gray-800 px-4 py-2 text-base text-white hover:bg-gray-700">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Dados da Empresa</h2>
          <p className="text-sm text-gray-400">Informações principais que aparecem em relatórios, notas e na loja online.</p>
        </div>
      </div>

      <Card className="rounded-xl gap-0 border-gray-800 bg-brand-navylight p-6 shadow-md">
        <CardContent className="p-0">
          {message.text && (
            <div className={`mb-6 rounded-lg border p-4 ${message.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Nome da Empresa (Razão Social)</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Razão social da empresa" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none transition focus:border-brand-gold" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Nome Fantasia</label>
                <input type="text" name="tradeName" value={formData.tradeName} onChange={handleChange} placeholder="Nome que aparece na loja" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none transition focus:border-brand-gold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Documento da Empresa</label>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <select name="documentType" value={formData.documentType} onChange={handleChange} className="w-full rounded-lg border border-gray-800 bg-[#171717] px-3 py-2.5 text-white outline-none focus:border-brand-gold">
                    <option value="RUC">RUC</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                  <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} placeholder={formData.documentType === 'CNPJ' ? '00.000.000/0000-00' : '80000000-1'} className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
                </div>
                <p className="text-xs text-gray-500">O tipo selecionado aparece automaticamente nas notas e recibos.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Telefone</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+595 999 000 000" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300">E-mail Comercial</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contato@sualoja.com.br" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300">WhatsApp do gateway (comprovantes)</label>
                <input type="text" name="whatsappGateway" value={formData.whatsappGateway} onChange={handleChange} placeholder="Ex.: 41 99876-5432" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
                <p className="text-xs text-gray-500">Número usado para comprovantes e contato da loja.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300">Instagram da loja</label>
                <input type="text" name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} placeholder="https://instagram.com/sualoja ou @sualoja" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300">Endereço Completo</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Av. Principal, 1234..." className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Cidade</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Ciudad del Este" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">País</label>
                <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Paraguai" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
              </div>

              <div className="space-y-2 border-t border-gray-800 pt-5 md:col-span-2">
                <h3 className="text-base font-medium text-white">Configuração fiscal padrão</h3>
                <select name="defaultIvaPercentage" value={formData.defaultIvaPercentage} onChange={handleChange} className="w-full max-w-sm rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold">
                  <option value="0">Sem acréscimo</option>
                  <option value="5">Padrão 5</option>
                  <option value="10">Padrão 10</option>
                </select>
                <p className="text-xs text-gray-500">Moeda principal e cotações foram movidas para Configurações → Moedas.</p>
              </div>

              <div className="space-y-2 border-t border-gray-800 pt-5 md:col-span-2">
                <h3 className="text-base font-medium text-white">PIX / Cobrança QR Code</h3>
                <label className="text-sm font-medium text-gray-300">Chave PIX</label>
                <input type="text" name="pixKey" value={formData.pixKey} onChange={handleChange} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className="w-full rounded-lg border border-gray-800 bg-[#171717] px-4 py-2.5 text-white outline-none focus:border-brand-gold" />
                <p className="text-xs text-gray-500">A cotação do PIX agora é configurada em Configurações → Moedas.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-300">Logo da Empresa</label>
                {formData.logoUrl ? (
                  <div className="relative inline-block rounded border border-gray-800 bg-[#171717] p-2">
                    <img src={formData.logoUrl} alt="Logo" className="max-h-32 object-contain" />
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => setFormData((current) => ({ ...current, logoUrl: '' }))} className="absolute -right-2 -top-2 size-auto rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600 hover:text-white">
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative cursor-pointer rounded-lg border-2 border-dashed border-gray-800 p-8 text-center text-gray-500 transition hover:border-gray-700 hover:bg-white/5">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024) {
                          setMessage({ type: 'error', text: 'Tamanho máximo da logo é 1MB.' });
                          return;
                        }
                        const upload = new FormData();
                        upload.append('logo', file);
                        try {
                          setSaving(true);
                          const res = await apiFetch('/api/settings/company/logo', { method: 'POST', body: upload });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Erro ao enviar logo.');
                          setFormData((current) => ({ ...current, logoUrl: data.logoUrl }));
                          setMessage({ type: 'success', text: 'Logo enviada com sucesso!' });
                        } catch (error: any) {
                          setMessage({ type: 'error', text: error.message || 'Erro de conexão.' });
                        } finally {
                          setSaving(false);
                          event.target.value = '';
                        }
                      }}
                    />
                    Clique para enviar a logo (PNG, JPG, WEBP - Max 1MB)
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving} className="h-auto gap-2 rounded-lg bg-brand-gold px-6 py-2.5 text-base font-medium text-brand-navydark hover:bg-brand-goldhover">
                <Save className="size-5" /> {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
