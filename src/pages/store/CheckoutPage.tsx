import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import {
  ArrowLeft, ArrowRight, Check, CircleDollarSign, Loader2, MapPin,
  MessageCircle, Package, QrCode, ShieldCheck, ShoppingBag, Truck, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { isFullName, isValidCpf, formatCpf, onlyDigits } from "../../lib/cpf";
import { calcOrderTotal, formatBrl, round2 } from "../../lib/money";
import { storeApiFetch } from "../../lib/storeApi";
import { cartTotal, useShopCart } from "../../stores/shopCart";
import { useCustomerAuthStore } from "../../stores/customerAuth";
import { basePriceToBrl, formatBrlPrice, useStorePrefs } from "../../stores/storePrefs";
import { AccountAuth } from "./account/AccountAuth";
import { PremiumCta } from "./PremiumCta";

type PaymentMethod = "PIX" | "USDT";
type DeliveryType = "PICKUP" | "DELIVERY";

type CheckoutAddress = {
  label: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const emptyAddress: CheckoutAddress = {
  label: "Casa",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  isDefault: true,
};

const inputClass = "h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none transition focus:border-[var(--store-accent,#e96f95)] focus:ring-2 focus:ring-[var(--store-accent,#e96f95)]/15";

function addressText(address: any) {
  const main = [address?.street, address?.number].filter(Boolean).join(", ");
  const area = [address?.neighborhood, address?.city, address?.state].filter(Boolean).join(" · ");
  return [main, area, address?.cep ? `CEP ${address.cep}` : ""].filter(Boolean).join(" — ");
}

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { info } = useOutletContext<{ info: any }>();
  const { items, clear, setOpen } = useShopCart();
  const customer = useCustomerAuthStore((state) => state.customer);
  const logoutCustomer = useCustomerAuthStore((state) => state.logout);
  const { currency, rates, baseCurrency } = useStorePrefs();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [form, setForm] = useState<{ deliveryType: DeliveryType; notes: string }>({ deliveryType: "PICKUP", notes: "" });
  const [payerIsBuyer, setPayerIsBuyer] = useState(true);
  const [payer, setPayer] = useState({ name: "", cpf: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [zones, setZones] = useState<any[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<CheckoutAddress>(emptyAddress);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/store/config").then((response) => response.json()),
      fetch("/api/store/shipping-zones").then((response) => response.json()),
    ]).then(([config, shipping]) => {
      if (!alive) return;
      setTermsText(String(config?.termsText || ""));
      const availableZones = Array.isArray(shipping?.data) ? shipping.data : [];
      setZones(availableZones);
      if (availableZones.length === 1) setZoneId(availableZones[0].id);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!customer) {
      setAddresses([]);
      setSelectedAddressId("");
      setAddressFormOpen(false);
      return;
    }
    let alive = true;
    setAddressesLoading(true);
    storeApiFetch("/api/store/account/addresses")
      .then(async (response) => response.ok ? response.json() : [])
      .then((rows) => {
        if (!alive) return;
        const next = Array.isArray(rows) ? rows : [];
        const preferred = next.find((item: any) => item.isDefault) || next[0];
        setAddresses(next);
        setSelectedAddressId(preferred?.id || "");
        setAddressFormOpen(next.length === 0);
        setAddressDraft({ ...emptyAddress, isDefault: next.length === 0 });
      })
      .catch(() => {
        if (!alive) return;
        setAddresses([]);
        setSelectedAddressId("");
        setAddressFormOpen(true);
      })
      .finally(() => { if (alive) setAddressesLoading(false); });
    return () => { alive = false; };
  }, [customer?.id]);

  const subtotalBase = useMemo(() => cartTotal(items), [items]);
  const selectedZone = zones.find((zone) => zone.id === zoneId) || null;
  const shippingFee = form.deliveryType === "DELIVERY" && selectedZone ? Number(selectedZone.feeBrl) : 0;
  const configuredBrlRate = Number(info?.brlExchangeRate) > 0
    ? Number(info.brlExchangeRate)
    : Number(rates.BRL) > 0 ? Number(rates.BRL) : 5.5;
  const pixBrlRate = Number(info?.pixExchangeRate) > 0 ? Number(info.pixExchangeRate) : configuredBrlRate;
  const chargeBrlRate = paymentMethod === "PIX" ? pixBrlRate : configuredBrlRate;
  const checkoutRates = useMemo(() => ({ ...rates, BRL: chargeBrlRate }), [rates, chargeBrlRate]);
  const subtotalBrl = round2(basePriceToBrl(subtotalBase, checkoutRates, baseCurrency));
  const discount = coupon?.discount || 0;
  const total = calcOrderTotal(subtotalBrl, discount, shippingFee);

  const previewCoupon = async (code: string, subtotal: number) => {
    const response = await fetch("/api/store/coupon/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });
    const data = await response.json();
    return { ok: response.ok, code: data.code, discount: data.discount, error: data.error };
  };

  useEffect(() => {
    if (!coupon) return;
    let alive = true;
    previewCoupon(coupon.code, subtotalBrl)
      .then((result) => {
        if (!alive) return;
        if (result.ok) setCoupon({ code: result.code, discount: result.discount });
        else {
          setCoupon(null);
          setCouponMsg(result.error || t("checkout.cupomExpirado"));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [subtotalBrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponMsg("");
    try {
      const result = await previewCoupon(code, subtotalBrl);
      if (!result.ok) {
        setCoupon(null);
        setCouponMsg(result.error || t("checkout.cupomInvalido"));
      } else {
        setCoupon({ code: result.code, discount: result.discount });
        setCouponInput("");
      }
    } catch {
      setCouponMsg(t("checkout.cupomErroValidar"));
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleAddressCepChange = async (value: string) => {
    const rawCep = value.replace(/\D/g, "");
    setAddressDraft((current) => ({ ...current, cep: value }));
    if (rawCep.length !== 8) return;
    setAddressError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        setAddressError(t("checkout.cepNaoEncontrado"));
        return;
      }
      setAddressDraft((current) => ({
        ...current,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));
    } catch {
      setAddressError(t("checkout.erroBuscarCep"));
    }
  };

  const saveCheckoutAddress = async () => {
    setAddressError("");
    if (!addressDraft.street.trim() || !addressDraft.number.trim() || !addressDraft.city.trim()) {
      setAddressError(t("checkout.erroEnderecoCompleto"));
      return;
    }
    setAddressSaving(true);
    try {
      const response = await storeApiFetch("/api/store/account/addresses", {
        method: "POST",
        body: JSON.stringify({ ...addressDraft, isDefault: addresses.length === 0 || addressDraft.isDefault }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || t("checkout.erroSalvarEndereco"));
      const next = saved.isDefault
        ? [saved, ...addresses.map((item) => ({ ...item, isDefault: false }))]
        : [...addresses, saved];
      setAddresses(next);
      setSelectedAddressId(saved.id);
      setAddressFormOpen(false);
      setAddressDraft({ ...emptyAddress, isDefault: false });
    } catch (addressSaveError: any) {
      setAddressError(addressSaveError.message || t("checkout.erroSalvarEndereco"));
    } finally {
      setAddressSaving(false);
    }
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setAcceptedTerms(false);
    setError("");
  };

  const selectDeliveryType = (deliveryType: DeliveryType) => {
    if (deliveryType === "DELIVERY" && zones.length === 0) return;
    setForm((current) => ({ ...current, deliveryType }));
    setError("");
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (items.length === 0) { setError(t("checkout.erroCarrinhoVazio")); return; }
    if (!customer) { setError(t("account.precisaEntrar")); return; }
    if (paymentMethod === "PIX" && !payerIsBuyer && (!isFullName(payer.name) || !isValidCpf(payer.cpf))) {
      setError(t("checkout.erroPagador"));
      return;
    }
    if (!acceptedTerms) { setError(t("checkout.erroTermos")); return; }
    if (form.deliveryType === "DELIVERY" && !zoneId) { setError(t("checkout.erroRegiao")); return; }
    if (form.deliveryType === "DELIVERY" && !selectedAddressId) { setError(t("checkout.erroSelecioneEndereco")); return; }
    if (paymentMethod === "USDT" && !info?.whatsapp) { setError(t("checkout.usdtSemWhatsapp")); return; }

    const usdtWindow = paymentMethod === "USDT" ? window.open("", "_blank") : null;
    setSending(true);
    try {
      const response = await storeApiFetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethod,
          acceptedTerms: true,
          addressId: form.deliveryType === "DELIVERY" ? selectedAddressId : undefined,
          payerIsBuyer: paymentMethod === "PIX" ? payerIsBuyer : true,
          payerDeclaredName: paymentMethod === "PIX" && !payerIsBuyer ? payer.name : undefined,
          payerDeclaredCpf: paymentMethod === "PIX" && !payerIsBuyer ? onlyDigits(payer.cpf) : undefined,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          couponCode: coupon?.code || undefined,
          shippingZoneId: form.deliveryType === "DELIVERY" ? zoneId : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("checkout.erroPedido"));
      clear();
      setOpen(false);
      if (paymentMethod === "USDT" && data.whatsappUrl) {
        if (usdtWindow && !usdtWindow.closed) {
          usdtWindow.opener = null;
          usdtWindow.location.href = data.whatsappUrl;
        } else {
          window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        }
      } else if (usdtWindow && !usdtWindow.closed) {
        usdtWindow.close();
      }
      navigate(`/loja/pedido/${data.code}`);
    } catch (submitError: any) {
      if (usdtWindow && !usdtWindow.closed) usdtWindow.close();
      setError(submitError.message || t("checkout.erroPedido"));
    } finally {
      setSending(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[56vh] w-[94%] max-w-5xl items-center justify-center px-4 py-16">
        <section className="w-full max-w-xl rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <ShoppingBag className="mx-auto h-12 w-12 text-stone-300" />
          <h1 className="mt-4 text-3xl font-black uppercase text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("checkout.carrinhoVazioTitulo")}</h1>
          <p className="mt-2 text-sm text-stone-500">{t("cart.vazio")}</p>
          <Link to="/loja/catalogo" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--store-accent,#e96f95)] px-6 py-3 text-sm font-bold text-[var(--store-accent-text,#fff)]">
            {t("cart.verProdutos")} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[94%] max-w-6xl px-4 py-8 sm:py-12">
      <Link to="/loja/catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> {t("checkout.voltarCompras")}
      </Link>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--store-accent,#e96f95)]">{t("checkout.etapaSegura")}</p>
        <h1 className="mt-1 text-4xl font-black uppercase text-stone-900 sm:text-5xl" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("checkout.tituloPagina")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-500">{t("checkout.subtituloPagina")}</p>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="space-y-5">
          {!customer ? (
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong className="block">{t("checkout.identificacaoTitulo")}</strong>
                <span className="mt-1 block text-xs leading-relaxed">{t("checkout.identificacaoAjuda")}</span>
              </div>
              <AccountAuth title={t("account.identifiqueSe")} onSuccess={() => {}} />
            </div>
          ) : (
            <form id="checkout-form" onSubmit={submitOrder} className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-stone-700"><Check className="h-4 w-4 text-emerald-700" /> {t("account.comprandoComo", { name: customer.name.split(" ")[0] })}</span>
                <button type="button" onClick={logoutCustomer} className="text-xs font-semibold text-stone-500 hover:underline">{t("account.sair")}</button>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black uppercase text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("checkout.formaPagamento")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {([
                    ["PIX", t("checkout.pagamentoPix"), QrCode, t("checkout.pagamentoPixAjuda")],
                    ["USDT", t("checkout.pagamentoUsdt"), CircleDollarSign, t("checkout.pagamentoUsdtAjuda")],
                  ] as const).map(([method, label, Icon, help]) => (
                    <button key={method} type="button" onClick={() => selectPaymentMethod(method)} className={`rounded-xl border p-4 text-left transition ${paymentMethod === method ? "border-[var(--store-accent,#e96f95)] bg-rose-50 ring-2 ring-rose-100" : "border-stone-200 hover:border-stone-400"}`}>
                      <span className="flex items-center gap-2 text-base font-bold text-stone-900"><Icon className="h-5 w-5" /> {label}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-stone-500">{help}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod === "PIX" && (
                  <div className="mt-5 border-t border-stone-100 pt-5">
                    <label className="mb-2 block text-sm font-semibold text-stone-700">{t("checkout.quemPaga")}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[[true, t("checkout.euMesmo")], [false, t("checkout.outraPessoa")]].map(([value, label]: any) => (
                        <button key={String(value)} type="button" onClick={() => setPayerIsBuyer(value)} className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${payerIsBuyer === value ? "border-[var(--store-accent,#e96f95)] bg-rose-50" : "border-stone-200 text-stone-500"}`}>{label}</button>
                      ))}
                    </div>
                    {!payerIsBuyer && (
                      <div className="mt-3 space-y-3 rounded-xl bg-stone-50 p-4">
                        <p className="text-xs leading-relaxed text-stone-500">{t("checkout.outraPessoaAjuda")}</p>
                        <input value={payer.name} onChange={(event) => setPayer({ ...payer, name: event.target.value })} placeholder={t("checkout.nomePagadorPlaceholder")} className={inputClass} />
                        <input value={payer.cpf} onChange={(event) => setPayer({ ...payer, cpf: formatCpf(event.target.value) })} placeholder={t("checkout.cpfPagadorPlaceholder")} inputMode="numeric" className={`${inputClass} ${payer.cpf && !isValidCpf(payer.cpf) ? "border-red-400" : ""}`} />
                        {payer.cpf && !isValidCpf(payer.cpf) && <p className="text-xs text-red-600">{t("checkout.cpfInvalido")}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black uppercase text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("checkout.comoReceber")}</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => selectDeliveryType("PICKUP")} className={`rounded-xl border p-4 text-left transition ${form.deliveryType === "PICKUP" ? "border-[var(--store-accent,#e96f95)] bg-rose-50 ring-2 ring-rose-100" : "border-stone-200"}`}>
                    <ShoppingBag className="h-5 w-5" /><span className="mt-2 block text-sm font-bold">{t("checkout.retirar")}</span>
                  </button>
                  <button type="button" disabled={zones.length === 0} onClick={() => selectDeliveryType("DELIVERY")} className={`rounded-xl border p-4 text-left transition ${form.deliveryType === "DELIVERY" ? "border-[var(--store-accent,#e96f95)] bg-rose-50 ring-2 ring-rose-100" : "border-stone-200"} disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400`}>
                    <Truck className="h-5 w-5" /><span className="mt-2 block text-sm font-bold">{t("checkout.entrega")}</span>{zones.length === 0 && <span className="mt-1 block text-[10px]">{t("checkout.entregaIndisponivel")}</span>}
                  </button>
                </div>

                {form.deliveryType === "DELIVERY" && (
                  <div className="mt-5 space-y-4 border-t border-stone-100 pt-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-stone-700">{t("checkout.regiaoLabel")}</label>
                      <select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className={inputClass}>
                        <option value="">{t("checkout.escolherRegiao")}</option>
                        {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} — {Number(zone.feeBrl) === 0 ? t("checkout.freteGratisOpcao") : formatBrlPrice(Number(zone.feeBrl), currency, checkoutRates)}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-stone-700">{t("checkout.selecioneEndereco")}</label>
                      {addresses.length > 0 && !addressFormOpen && <button type="button" onClick={() => { setAddressFormOpen(true); setAddressDraft({ ...emptyAddress, isDefault: false }); }} className="text-xs font-bold text-[var(--store-accent,#e96f95)]">+ {t("checkout.novoEndereco")}</button>}
                    </div>
                    {addressesLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border border-stone-200 p-4 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.carregandoEnderecos")}</div>
                    ) : addresses.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {addresses.map((address) => (
                          <button key={address.id} type="button" onClick={() => { setSelectedAddressId(address.id); setAddressFormOpen(false); }} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${selectedAddressId === address.id ? "border-[var(--store-accent,#e96f95)] bg-rose-50" : "border-stone-200"}`}>
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{address.label || t("checkout.endereco")} {address.isDefault && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] text-emerald-700">{t("checkout.padrao")}</span>}</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">{addressText(address)}</span></span>
                          </button>
                        ))}
                      </div>
                    ) : !addressFormOpen ? (
                      <button type="button" onClick={() => setAddressFormOpen(true)} className="w-full rounded-xl border border-dashed border-rose-300 bg-rose-50 p-4 text-sm font-bold text-stone-800">+ {t("checkout.cadastrarEndereco")}</button>
                    ) : null}

                    {addressFormOpen && (
                      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                        <div className="flex items-center justify-between"><h3 className="text-sm font-bold">{t("checkout.cadastrarEndereco")}</h3>{addresses.length > 0 && <button type="button" onClick={() => setAddressFormOpen(false)} aria-label={t("checkout.cancelar")}><X className="h-4 w-4" /></button>}</div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_160px]"><input value={addressDraft.label} onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })} placeholder={t("checkout.apelidoEndereco")} className={inputClass} /><input value={addressDraft.cep} onChange={(event) => handleAddressCepChange(event.target.value)} placeholder="CEP" inputMode="numeric" className={inputClass} /></div>
                        <div className="grid gap-3 sm:grid-cols-[1fr_130px]"><input value={addressDraft.street} onChange={(event) => setAddressDraft({ ...addressDraft, street: event.target.value })} placeholder={t("checkout.rua")} className={inputClass} /><input value={addressDraft.number} onChange={(event) => setAddressDraft({ ...addressDraft, number: event.target.value })} placeholder={t("checkout.numero")} className={inputClass} /></div>
                        <div className="grid gap-3 sm:grid-cols-2"><input value={addressDraft.neighborhood} onChange={(event) => setAddressDraft({ ...addressDraft, neighborhood: event.target.value })} placeholder={t("checkout.bairro")} className={inputClass} /><input value={addressDraft.city} onChange={(event) => setAddressDraft({ ...addressDraft, city: event.target.value })} placeholder={t("checkout.cidade")} className={inputClass} /></div>
                        <div className="grid items-center gap-3 sm:grid-cols-[100px_1fr]"><input value={addressDraft.state} onChange={(event) => setAddressDraft({ ...addressDraft, state: event.target.value.toUpperCase().slice(0, 2) })} placeholder="UF" className={inputClass} /><label className="flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={addresses.length === 0 || addressDraft.isDefault} disabled={addresses.length === 0} onChange={(event) => setAddressDraft({ ...addressDraft, isDefault: event.target.checked })} className="h-4 w-4 accent-emerald-600" /> {t("checkout.salvarComoPadrao")}</label></div>
                        {addressError && <p className="text-xs text-red-600">{addressError}</p>}
                        <button type="button" onClick={saveCheckoutAddress} disabled={addressSaving} className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{addressSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} {addressSaving ? t("checkout.salvandoEndereco") : t("checkout.salvarUsarEndereco")}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-stone-700">{t("checkout.cupomLabel")}</label>
                    {coupon ? (
                      <div className="flex h-11 items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3"><span className="text-sm font-bold text-emerald-800">{coupon.code} (−{formatBrlPrice(discount, currency, checkoutRates)})</span><button type="button" onClick={() => { setCoupon(null); setCouponMsg(""); }} className="text-xs font-semibold text-red-600">{t("checkout.remover")}</button></div>
                    ) : (
                      <div className="flex gap-2"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value.toUpperCase())} placeholder={t("checkout.cupomPlaceholder")} className={`${inputClass} min-w-0 font-mono uppercase`} /><button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponInput.trim()} className="rounded-lg border border-stone-900 px-4 text-sm font-bold disabled:opacity-40">{checkingCoupon ? "..." : t("checkout.aplicar")}</button></div>
                    )}
                    {couponMsg && <p className="mt-1 text-xs text-red-600">{couponMsg}</p>}
                  </div>
                  <div><label className="mb-2 block text-sm font-semibold text-stone-700">{t("checkout.obs")}</label><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t("checkout.obsPlaceholder")} className={inputClass} /></div>
                </div>
              </div>

              <div key={`checkout-note-${paymentMethod}`} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-xs leading-relaxed text-stone-600 shadow-sm">
                {paymentMethod === "PIX" ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}
                {paymentMethod === "PIX" ? t("checkout.proximaTelaNota") : t("checkout.usdtWhatsappNota")}
              </div>

              <label key={`checkout-terms-${paymentMethod}`} className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition ${acceptedTerms ? "border-emerald-300 ring-2 ring-emerald-100" : "border-stone-200"}`}>
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                <span className="text-xs leading-relaxed text-stone-600">{paymentMethod === "USDT" ? t("checkout.termosUsdt") : payerIsBuyer ? t("checkout.termosEuMesmo") : t("checkout.termosOutraPessoa", { nome: payer.name || t("checkout.pessoaInformadaAcima") })} <button type="button" onClick={(event) => { event.preventDefault(); setTermsOpen(true); }} className="font-bold text-stone-900 underline">{t("checkout.lerTermos")}</button></span>
              </label>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            </form>
          )}
        </section>

        <aside className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm lg:sticky lg:top-52 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-black uppercase text-stone-900" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}><Package className="h-5 w-5" /> {t("checkout.resumo")}</h2>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3 border-b border-stone-100 pb-3 last:border-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-50">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-stone-300" /></div>}</div>
                <div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-medium text-stone-700">{item.quantity}× {item.name}</p><p className="mt-1 text-sm font-bold text-stone-900">{formatBrlPrice(round2(basePriceToBrl(item.price * item.quantity, checkoutRates, baseCurrency)), currency, checkoutRates)}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
            <div className="flex justify-between text-stone-500"><span>{t("cart.subtotal")}</span><span>{formatBrlPrice(subtotalBrl, currency, checkoutRates)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><span>{t("checkout.cupomCodigo", { code: coupon?.code })}</span><span>−{formatBrlPrice(discount, currency, checkoutRates)}</span></div>}
            {form.deliveryType === "DELIVERY" && selectedZone && <div className="flex justify-between text-stone-500"><span>{t("checkout.freteZona", { zona: selectedZone.name })}</span><span>{shippingFee === 0 ? t("checkout.gratis") : `+${formatBrlPrice(shippingFee, currency, checkoutRates)}`}</span></div>}
            <div className="flex items-end justify-between border-t border-stone-200 pt-3"><span className="font-semibold text-stone-700">{t("checkout.total")}</span><span className="text-3xl font-black text-stone-900">{formatBrlPrice(total, currency, checkoutRates)}</span></div>
          </div>
          {paymentMethod === "PIX" && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><span className="block text-xs font-semibold text-amber-800">{t("checkout.cobrancaPixReal")}</span><strong className="mt-1 block text-xl text-amber-900">{formatBrl(total)}</strong></div>}
          {customer ? (
            <PremiumCta form="checkout-form" type="submit" size="md" disabled={sending || !acceptedTerms} className="mt-5 h-12">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.enviando")}</> : paymentMethod === "PIX" ? <>{t("checkout.gerarPix")} <ArrowRight className="h-4 w-4" /></> : <><MessageCircle className="h-4 w-4" /> {t("checkout.solicitarUsdt")}</>}
            </PremiumCta>
          ) : <p className="mt-5 rounded-xl bg-stone-100 p-3 text-center text-xs font-medium text-stone-600">{t("checkout.entreParaContinuar")}</p>}
          <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full text-center text-xs font-semibold text-stone-500 underline">{t("checkout.editarCarrinho")}</button>
        </aside>
      </div>

      {termsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setTermsOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 p-4"><h3 className="text-xl font-black uppercase" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("checkout.termosModalTitulo")}</h3><button type="button" onClick={() => setTermsOpen(false)} aria-label={t("checkout.cancelar")}><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-5"><p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">{termsText || t("checkout.termosIndisponivel")}</p></div>
            <div className="border-t border-stone-200 p-4"><button type="button" onClick={() => { setAcceptedTerms(true); setTermsOpen(false); }} className="w-full rounded-full bg-stone-900 py-3 text-sm font-bold text-white">{t("checkout.liConcordo")}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
