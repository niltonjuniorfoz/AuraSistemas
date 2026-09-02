from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding="utf-8")


def one(path: str, old: str, new: str) -> None:
    value = read(path)
    if old not in value:
        raise RuntimeError(f"Trecho não encontrado em {path}: {old[:100]!r}")
    write(path, value.replace(old, new, 1))


def sub(path: str, pattern: str, replacement: str, flags: int = re.S) -> None:
    value = read(path)
    updated, count = re.subn(pattern, lambda _: replacement, value, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Padrão não encontrado em {path}: {pattern[:100]!r}")
    write(path, updated)


# Produto novo deve entrar publicado na loja por padrão.
one(
    "src/pages/Products.tsx",
    "parentId: '', variantName: '', storeVisible: false",
    "parentId: '', variantName: '', storeVisible: true",
)

# Ollama: descrição comercial útil para ecommerce, sem inventar características.
sub(
    "src/server/products.ts",
    r'''    const prompt = `Escreva uma descrição curta, clara e objetiva para cadastro interno do produto abaixo\..*?      temperature: 0\.2,\n    \}\);''',
    '''    const prompt = `Crie uma descrição comercial pronta para a página de produto de uma loja online.
Use português do Brasil, com linguagem natural, profissional e convincente, sem exageros.
Explique o que é o produto, para que ele serve e quais benefícios ou experiência de uso podem ser comunicados com segurança a partir dos dados fornecidos.
Priorize valor para o cliente e situações de uso. Não descreva apenas embalagem, cor do frasco, tampa ou aparência visual, a menos que isso seja realmente relevante para a compra.
Não invente composição, dosagem, certificações, resultados garantidos, indicação médica, fragrância, tamanho ou especificações que não estejam nos dados.
Se faltarem detalhes, escreva um texto útil usando somente o que é possível afirmar pelo nome, marca, modelo e categoria, sem preencher lacunas com suposições.
Entregue apenas o texto final, sem título, sem markdown e sem mencionar que foi gerado por IA. Use de 1 a 3 parágrafos curtos, aproximadamente 450 a 850 caracteres.
Nome: ${name || ""}
Marca: ${brand || ""}
Modelo: ${model || ""}
Grupo: ${group || ""}
Subgrupo: ${subgroup || ""}
UPC: ${upc || ""}`;

    const description = await ollamaChat({
      messages: [
        { role: "system", content: "Você é um redator de e-commerce cuidadoso. Produza copy comercial útil e verdadeira, nunca invente atributos ausentes e evite descrever somente a aparência da embalagem." },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
    });''',
)

# Store API: informa moeda padrão e entrega mais relacionados para o carrossel.
one(
    "src/server/store.ts",
    'email: cs?.email || "",\n    pixKey: pix.pixKey || "",',
    'email: cs?.email || "",\n    defaultCurrency: cs?.defaultCurrency || "BRL",\n    pixKey: pix.pixKey || "",',
)
one(
    "src/server/store.ts",
    'res.json({ storeName: c.storeName, logoUrl: c.logoUrl, city: c.city, whatsapp: c.whatsapp, instagramUrl: c.instagramUrl, email: c.email, pixEnabled: !!c.pixKey, appVersion: APP_VERSION, currencies: c.currencies });',
    'res.json({ storeName: c.storeName, logoUrl: c.logoUrl, city: c.city, whatsapp: c.whatsapp, instagramUrl: c.instagramUrl, email: c.email, defaultCurrency: c.defaultCurrency, pixEnabled: !!c.pixKey, appVersion: APP_VERSION, currencies: c.currencies });',
)
one(
    "src/server/store.ts",
    '.orderBy(desc(products.createdAt))\n      .limit(4) : [];',
    '.orderBy(desc(products.createdAt))\n      .limit(12) : [];',
)

# Shell da loja: mobile compacto e alinhado, BRL coerente, carrinho com entrada animada.
one(
    "src/pages/store/ShopLayout.tsx",
    'const { currency, rates, setRates } = useStorePrefs();',
    'const { currency, rates, setRates, setCurrency } = useStorePrefs();',
)
one(
    "src/pages/store/ShopLayout.tsx",
    'setInfo(j);\n      // Página aberta antes de uma atualização:',
    'setInfo(j);\n      if (j?.defaultCurrency === "BRL") setCurrency("BRL");\n      // Página aberta antes de uma atualização:',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<div className="border-b border-rose-100 bg-[var(--store-accent,#e96f95)]/12">',
    '<div className="hidden border-b border-rose-100 bg-[var(--store-accent,#e96f95)]/12 md:block">',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<div className="relative mx-auto flex min-h-[74px] w-[96%] max-w-[1440px] items-center gap-3 px-3 py-1.5 lg:gap-8">',
    '<div className="relative mx-auto flex min-h-[66px] w-[95%] max-w-[1600px] items-center gap-2 px-1 py-1 md:min-h-[74px] md:px-3 lg:gap-8">',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<span className="h-20 w-36 shrink-0 animate-pulse rounded-xl bg-rose-100 md:h-28 md:w-44" />',
    '<span className="h-16 w-44 shrink-0 animate-pulse rounded-xl bg-rose-100 md:h-28 md:w-44" />',
)
one(
    "src/pages/store/ShopLayout.tsx",
    'className="h-20 w-36 shrink-0 scale-[1.32] object-contain md:h-28 md:w-44 md:scale-100"',
    'className="h-16 w-44 shrink-0 scale-[1.15] object-contain md:h-28 md:w-44 md:scale-100"',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<form onSubmit={submitSearch} className="bg-white px-4 pb-3 sm:hidden">',
    '<form onSubmit={submitSearch} className="mx-auto w-[95%] max-w-[1600px] bg-white px-1 pb-2 sm:hidden">',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm" onClick={() => !sending && setOpen(false)}>',
    '<div className="store-cart-overlay fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm" onClick={() => !sending && setOpen(false)}>',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>',
    '<aside className="store-cart-drawer flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<div className="pointer-events-none absolute -bottom-10 left-1/2 w-full -translate-x-1/2 select-none text-center text-[9rem] font-black leading-none tracking-[0.02em] text-[#f8dde5]/35 sm:-bottom-24 sm:text-[15rem]">DB</div>',
    '<div className="pointer-events-none absolute inset-x-0 -bottom-3 select-none whitespace-nowrap text-center text-[6.5rem] font-black leading-none tracking-[0.02em] text-[#f8dde5]/35 sm:-bottom-20 sm:text-[15rem]">DB</div>',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<div className="mt-9 grid border-y border-rose-100 py-4 sm:grid-cols-2 lg:grid-cols-4">',
    '<div className="mt-7 grid grid-cols-4 divide-x divide-rose-100 border-y border-rose-100 py-3">',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '.map(([Icon, title, description]: any, index) => (',
    '.map(([Icon, title, description]: any) => (',
)
one(
    "src/pages/store/ShopLayout.tsx",
    'className={`flex items-center gap-3 px-5 py-3 ${index > 0 ? "sm:border-l sm:border-rose-100" : ""}`}',
    'className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-center sm:flex-row sm:gap-3 sm:px-5 sm:text-left"',
)
one(
    "src/pages/store/ShopLayout.tsx",
    '<Icon className="h-6 w-6 shrink-0 text-[var(--store-accent,#e96f95)]" />\n                <div><div className="text-xs font-bold text-[#463c3b]">{title}</div><div className="text-[10px] text-[#6b5b5a]/65">{description}</div></div>',
    '<Icon className="h-5 w-5 shrink-0 text-[var(--store-accent,#e96f95)] sm:h-6 sm:w-6" />\n                <div className="min-w-0"><div className="text-[7px] font-bold leading-tight text-[#463c3b] min-[390px]:text-[8px] sm:text-xs">{title}</div><div className="mt-0.5 hidden text-[10px] text-[#6b5b5a]/65 sm:block">{description}</div></div>',
)

# Home: remove vitrines de nicho hardcoded e deriva seções das categorias reais.
home_path = "src/pages/store/StoreHome.tsx"
home = read(home_path)
home = home.replace('  const [emagrecimento, setEmagrecimento] = useState<any[]>([]);\n  const [performance, setPerformance] = useState<any[]>([]);\n', '', 1)
home = home.replace('const [cats, newestList, brandsList, allInStockList] = await Promise.all([', 'const [, newestList, brandsList, allInStockList] = await Promise.all([', 1)
home, count = re.subn(
    r'\n\s*// Emagrecimento/Performance: busca pela categoria de verdade quando ela.*?setPerformance\(performanceList\);\n',
    '\n',
    home,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Bloco legado Emagrecimento/Performance não encontrado")
for old, new in {
    'P: "h-[145px] sm:h-[175px] md:h-[205px]"': 'P: "h-[118px] sm:h-[165px] md:h-[205px]"',
    'M: "h-[165px] sm:h-[205px] md:h-[245px]"': 'M: "h-[138px] sm:h-[195px] md:h-[245px]"',
    'G: "h-[185px] sm:h-[235px] md:h-[285px]"': 'G: "h-[162px] sm:h-[225px] md:h-[285px]"',
    'GG: "h-[205px] sm:h-[265px] md:h-[325px]"': 'GG: "h-[188px] sm:h-[255px] md:h-[325px]"',
}.items():
    if old not in home:
        raise RuntimeError(f"Tamanho de banner não encontrado: {old}")
    home = home.replace(old, new, 1)
home = home.replace(
    '<section className="mx-auto w-[94%] max-w-[1380px] px-1 py-2.5 sm:px-2">',
    '<section className="mx-auto w-[95%] max-w-[1600px] px-1 py-2 sm:px-4">',
    1,
)
home = home.replace(
    '<section className="px-4 pb-3">\n          <div className="mx-auto grid w-[95%] max-w-[1600px] grid-cols-4 divide-x divide-rose-200/70 overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-r from-[#fff5f7] to-[#f8dde5]">',
    '<section className="mx-auto w-[95%] max-w-[1600px] px-1 pb-3 sm:px-4">\n          <div className="grid w-full grid-cols-4 divide-x divide-rose-200/70 overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-r from-[#fff5f7] to-[#f8dde5]">',
    1,
)
marker = '  const renderVitrines = () => {'
if marker not in home:
    raise RuntimeError("renderVitrines não encontrado")
home = home.replace(
    marker,
    '''  const categoryShowcases = useMemo(() => (
    categories
      .map((category: any) => ({
        category,
        products: allInStock.filter((product: any) => product.groupId === category.id).slice(0, 12),
      }))
      .filter((entry) => entry.products.length > 0)
      .slice(0, 5)
  ), [categories, allInStock]);

''' + marker,
    1,
)
fallback_pattern = r'    \} else if \(featured\.length === 0\) \{.*?\n    \}\n    return \('
new_fallback = '''    } else {
      const popularProducts = allInStock.length > 0 ? allInStock.slice(0, 12) : featured;
      inner = popularProducts.length === 0 ? (
        <><div className="py-12 text-center text-stone-400">{t("home.vitrinePreparando")}</div><NewsletterBanner /></>
      ) : (
        <div className="flex flex-col gap-2">
          <ProductSection title="Produtos mais amados" link="/loja/catalogo?ord=popular" products={popularProducts} />
          <NewsletterBanner />
          {categoryShowcases.map(({ category, products }) => (
            <ProductSection
              key={category.id}
              title={translateCategoryName(category.name, i18n.language)}
              link={`/loja/catalogo?cat=${category.id}`}
              products={products}
            />
          ))}
          <ProductSection title={t("home.novidades")} link="/loja/catalogo?ord=newest" products={newest.length > 0 ? newest : popularProducts.slice().reverse()} />
        </div>
      );
    }
    return ('''
home, count = re.subn(fallback_pattern, lambda _: new_fallback, home, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Fallback das vitrines não encontrado")
write(home_path, home)

# Editor de banners: mostra proporção recomendada e os campos que o renderer já suporta.
banner_path = "src/pages/store/editor/panels/BannerPanel.tsx"
banner = read(banner_path)
banner = banner.replace('Cada item é {url, link, title, posX}', 'Cada item é {url, link, title, subtitle, posX}', 1)
banner = banner.replace(
    'const add = () => setBanners((prev) => [...prev, { url: "", link: "/loja/catalogo", title: "", posX: 50, __key: nextKeyRef.current++ }]);',
    'const add = () => setBanners((prev) => [...prev, { url: "", link: "/loja/catalogo", title: "", subtitle: "", posX: 50, __key: nextKeyRef.current++ }]);',
    1,
)
banner = banner.replace(
    '<div className="space-y-3">',
    '''<div className="space-y-3">
        <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-[11px] leading-relaxed text-stone-600">
          <strong className="text-stone-800">Tamanho recomendado: 1600 × 600 px (aprox. 8:3).</strong>
          <br />A loja mantém a arte inteira, sem cortar, e preenche a sobra de proporção com a própria imagem desfocada.
        </div>''',
    1,
)
banner = banner.replace(
    '{b.url && <img src={b.url} alt="" className="mb-2 h-20 w-full rounded-md object-cover" />}',
    '''{b.url && (
              <div className="relative mb-2 aspect-[8/3] w-full overflow-hidden rounded-md bg-[#fff7f8]">
                <img src={b.url} alt="" aria-hidden="true" style={{ objectPosition: `${b.posX ?? 50}% 50%` }} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-xl" />
                <img src={b.url} alt={`Prévia do banner ${i + 1}`} style={{ objectPosition: `${b.posX ?? 50}% 50%` }} className="relative h-full w-full object-contain" />
              </div>
            )}''',
    1,
)
one_title = '<input value={b.title || ""} onChange={(e) => update(b.__key, { title: e.target.value })} placeholder="Título (opcional — some sem CTA se vazio)" className="w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />'
if one_title not in banner:
    raise RuntimeError("Campo de título do banner não encontrado")
banner = banner.replace(
    one_title,
    '''<input value={b.title || ""} onChange={(e) => update(b.__key, { title: e.target.value })} placeholder="Título (opcional — some sem CTA se vazio)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <input value={b.subtitle || ""} onChange={(e) => update(b.__key, { subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="mb-2 w-full rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-amber-500" />
            <label className="block text-[10px] font-semibold text-stone-500">
              Enquadramento horizontal: {Math.round(Number(b.posX ?? 50))}%
              <input type="range" min="0" max="100" value={Number(b.posX ?? 50)} onChange={(e) => update(b.__key, { posX: Number(e.target.value) })} className="mt-1 w-full accent-rose-400" />
            </label>''',
    1,
)
write(banner_path, banner)

# Produto: imagem com limite, painel sticky, CTA móvel e relacionados em carrossel.
product_path = "src/pages/store/StoreProduct.tsx"
product = read(product_path)
product = product.replace(
    '  const img = p.images[imgIdx] || null;\n',
    '''  const img = p.images[imgIdx] || null;

  const addCurrentToCart = () => {
    if (remaining <= 0 || (p.hasVariants && !selectedVariant)) return;
    add({
      ...currentProduct,
      name: p.name + (p.hasVariants ? ` (${currentProduct.variantName})` : ""),
      imageUrl: p.imageUrl,
    }, Math.min(qty, remaining));
    setQty(1);
    setOpen(true);
  };
''',
    1,
)
product = product.replace(
    '<main className="mx-auto w-[95%] max-w-[1600px] px-4 py-8">',
    '<main className="mx-auto w-[95%] max-w-[1600px] px-3 pt-5 pb-36 sm:px-4 md:py-8">',
    1,
)
product = product.replace(
    '<div className="grid gap-8 md:grid-cols-2">',
    '<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:justify-center lg:gap-12">',
    1,
)
product = product.replace(
    '        {/* Galeria */}\n        <div>\n          <div className="aspect-square overflow-hidden rounded-3xl border border-stone-200 bg-white">',
    '        {/* Galeria */}\n        <div className="mx-auto w-full max-w-[560px] lg:mx-0">\n          <div className="aspect-[4/3] max-h-[500px] overflow-hidden rounded-2xl border border-stone-200 bg-white sm:rounded-3xl">',
    1,
)
product = product.replace(
    '        {/* Info */}\n        <div>',
    '        {/* Info */}\n        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">',
    1,
)
product, count = re.subn(
    r'              onClick=\{\(\) => \{\n\s*// Passar o name e imageUrl do pai se a variante não tiver\n\s*add\(\{.*?\n\s*setQty\(1\);\n\s*\}\}',
    '              onClick={addCurrentToCart}',
    product,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("CTA principal do produto não encontrado")
related_pattern = r'      /\* Relacionados \*/\n      \{p\.related\?\.length > 0 && \(.*?\n    </main>'
related = '''      {/* Relacionados */}
      {p.related?.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "var(--store-font-heading, 'Barlow Condensed'), sans-serif" }}>{t("product.vocejaGostar")}</h2>
            {p.groupId && <Link to={`/loja/catalogo?cat=${p.groupId}`} className="shrink-0 text-xs font-semibold text-[var(--store-accent,#e96f95)]">Ver mais</Link>}
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {p.related.map((r: any) => (
              <div key={r.id} className="w-[64vw] max-w-56 shrink-0 snap-start sm:w-52 lg:w-[calc((100%_-_3.75rem)/6)]">
                <ShopProductCard p={r} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[3.45rem] z-30 border-t border-rose-100 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(80,50,60,0.10)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold text-stone-500">{p.name}</div>
            <div className="text-lg font-black text-stone-900">{formatPrice(currentProduct.price, currency, rates)}</div>
          </div>
          <button
            type="button"
            onClick={addCurrentToCart}
            disabled={remaining <= 0 || (p.hasVariants && !selectedVariant)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--store-accent,#e96f95)] px-5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-4 w-4" />
            {remaining <= 0 ? t("product.esgotado") : t("product.adicionarSacola")}
          </button>
        </div>
      </div>
    </main>'''
product, count = re.subn(related_pattern, lambda _: related, product, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Relacionados do produto não encontrados")
write(product_path, product)

# Tradução do título do carrossel de relacionados.
i18n_path = "src/pages/store/i18n.ts"
i18n = read(i18n_path)
i18n = i18n.replace("vocejaGostar: 'También te puede gustar'", "vocejaGostar: 'Quienes vieron este producto también eligieron'", 1)
i18n = i18n.replace("vocejaGostar: 'Você também pode gostar'", "vocejaGostar: 'Quem viu este produto também gostou'", 1)
i18n = i18n.replace("vocejaGostar: 'You might also like'", "vocejaGostar: 'Customers who viewed this product also liked'", 1)
write(i18n_path, i18n)

# Tema claro: sidebar e superfícies de hex fixo também ficam claras.
css_path = "src/index.css"
css = read(css_path)
css, count = re.subn(
    r'  --chart-5: #d97706;\n  /\* --primary, --ring, --accent-foreground, --chart-1 e os --sidebar-\*.*?\n\}',
    '''  --chart-5: #d97706;
  --sidebar: #ffffff;
  --sidebar-foreground: #334155;
  --sidebar-primary: #ffd700;
  --sidebar-primary-foreground: #0f1b2e;
  --sidebar-accent: #eef1f7;
  --sidebar-accent-foreground: #0f1b2e;
  --sidebar-border: #dde3ee;
  --sidebar-ring: #d4af00;
  /* No modo claro a navegação e os painéis administrativos também ficam claros. */
}''',
    css,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError("Tokens do tema claro não encontrados")
css += r'''

/* Superfícies legadas que ainda usam hex fixo no ERP. */
[data-theme="light"] .bg-\[\#171717\],
[data-theme="light"] .bg-\[\#1e1e1e\],
[data-theme="light"] .bg-\[\#0a0a0a\],
[data-theme="light"] .bg-\[\#262626\] {
  background-color: #ffffff !important;
}

[data-theme="light"] .product-sale-price-panel,
[data-theme="light"] .currency-entry-toggle,
[data-theme="light"] .currency-entry-badge,
[data-theme="light"] .product-price-input,
[data-theme="light"] .product-margin-input {
  background: #ffffff;
  border-color: #dde3ee;
}

[data-theme="light"] .product-price-input,
[data-theme="light"] .product-margin-input,
[data-theme="light"] .product-sale-price-panel > h4,
[data-theme="light"] .product-price-label {
  color: #0f1b2e;
}

@keyframes store-cart-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes store-cart-drawer-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.store-cart-overlay { animation: store-cart-overlay-in 180ms ease-out both; }
.store-cart-drawer { animation: store-cart-drawer-in 260ms cubic-bezier(.2,.8,.2,1) both; }

@media (prefers-reduced-motion: reduce) {
  .store-cart-overlay,
  .store-cart-drawer { animation: none; }
}
'''
write(css_path, css)

# Invariantes antes de deixar o CI seguir para TypeScript/build.
checks = {
    "src/pages/Products.tsx": ["storeVisible: true"],
    "src/server/products.ts": ["redator de e-commerce", "aproximadamente 450 a 850 caracteres"],
    "src/server/store.ts": ['defaultCurrency: cs?.defaultCurrency || "BRL"', ".limit(12) : [];"],
    "src/pages/store/ShopLayout.tsx": ["store-cart-overlay", 'setCurrency("BRL")', "grid-cols-4 divide-x"],
    "src/pages/store/StoreHome.tsx": ["categoryShowcases", 'M: "h-[138px]', "emagrecimentoGroup"],
    "src/pages/store/StoreProduct.tsx": ["addCurrentToCart", "bottom-[3.45rem]", "snap-x snap-mandatory"],
    "src/pages/store/editor/panels/BannerPanel.tsx": ["1600 × 600", "subtitle", 'type="range"'],
    "src/index.css": ["--sidebar: #ffffff", "store-cart-drawer-in"],
}
for path, needles in checks.items():
    value = read(path)
    for needle in needles:
        if path.endswith("StoreHome.tsx") and needle == "emagrecimentoGroup":
            if needle in value:
                raise RuntimeError("Vitrine hardcoded de Emagrecimento ainda presente")
        elif needle not in value:
            raise RuntimeError(f"Invariante ausente: {path}: {needle}")

print("Storefront static invariants: OK")
