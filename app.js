const { supabaseUrl, supabaseKey, storageBucket } = window.AQUERIS_CONFIG;
const db = supabase.createClient(supabaseUrl, supabaseKey);
const state = { products: [], categories: [], categoriesLoaded: false, settings: null, category: 'Todos', search: '' };
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const SPRITE_INDEX = {
  'perfecto-amor':0,'borgona':1,'borgona-exportacion':2,'vino-de-higo':3,'borgona-coleccion-especial':4,'tinto-semi-seco':5,
  'tinto-seco':6,'mistela':7,'borgona-blanco':8,'romance':9,'vino-de-misa':10,'oporto':11,'borgona-sombreron':12,'rose-sombreron':13,
  'perfecto-amor-sombreron':14,'tinto-semi-seco-sombreron':15,'reserva-privada-damajuana':16,'champagne-espumante':17
};
const AVAILABILITY = {
  available: { label:'Disponible', className:'availability-available' },
  consult: { label:'Consultar', className:'availability-consult' },
  out: { label:'Agotado temporalmente', className:'availability-out' },
  soon: { label:'Próximamente', className:'availability-soon' }
};

function esc(value='') { return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function money(v){ return v == null ? 'Consultar' : `S/${Number(v).toFixed(2)}`; }
function normalizeText(value=''){ return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function availability(p){ return AVAILABILITY[p.availability_status] || AVAILABILITY.available; }
function imageUrl(path){
  if(!path) return null;
  if(path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
  if(path.startsWith('assets/')) return `./${path}`;
  return db.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
}
function absoluteUrl(value){
  if(!value) return null;
  try { return new URL(value, location.href).href; } catch { return null; }
}
function spriteStyle(p){
  const i = SPRITE_INDEX[p.slug];
  if(i == null) return null;
  const col = i % 6, row = Math.floor(i / 6);
  return `--sprite-x:${col * 20}%;--sprite-y:${row * 50}%;`;
}
function catalogVisual(p, extra=''){
  const custom = imageUrl(p.image_path);
  if(custom) return `<img class="catalog-photo ${extra}" src="${esc(custom)}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="this.classList.add('image-error')">`;
  const sprite = spriteStyle(p);
  if(sprite) return `<div class="catalog-sprite ${extra}" style="${sprite}" role="img" aria-label="${esc(p.name)}"></div>`;
  return `<img class="catalog-photo ${extra}" src="${esc(window.AQ_LOGO || '')}" alt="${esc(p.name)}" style="object-fit:contain;padding:22%;background:#e4dbce">`;
}
function whatsappUrl(product){
  const n = state.settings?.whatsapp || '51967539019';
  const text = product
    ? `Hola Reserva Aqueris, quisiera consultar disponibilidad de ${product.name}. Precio referencial por unidad: ${money(product.unit_price)}${product.case_price != null ? `, ${product.case_label || 'Caja'}: ${money(product.case_price)}` : ''}.`
    : 'Hola Reserva Aqueris, quisiera consultar por su carta de vinos y disponibilidad.';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
function productUrl(product){
  const url = new URL(location.href);
  url.searchParams.set('vino', product.slug);
  url.hash = '';
  return url;
}
function baseUrl(){
  const url = new URL(location.href);
  url.searchParams.delete('vino');
  url.hash = '';
  return url;
}
function hydrateWhatsApp(){
  $$('[data-whatsapp]').forEach(a => { a.href = whatsappUrl(); a.target = '_blank'; a.rel = 'noopener'; });
}
function initBrand(){
  if(window.AQ_LOGO){
    $$('[data-brand-logo]').forEach(el => el.src = window.AQ_LOGO);
    const favicon = $('#site-favicon'); if(favicon) favicon.href = window.AQ_LOGO;
  }
  if(window.AQ_SPRITE) document.documentElement.style.setProperty('--catalog-sprite', `url("${window.AQ_SPRITE}")`);
}
function setMeta(selector, content){ const el=$(selector); if(el && content) el.setAttribute('content', content); }
function updateStructuredData(product=null){
  const settings = state.settings || {};
  const localBusiness = {
    '@type':'LocalBusiness',
    name: settings.business_name || 'Reserva Aqueris',
    description: settings.seo_description || 'Carta digital de Reserva Aqueris en Arequipa.',
    address: { '@type':'PostalAddress', streetAddress: settings.location || 'Arequipa', addressLocality:'Arequipa', addressCountry:'PE' },
    telephone: settings.whatsapp ? `+${settings.whatsapp}` : '+51967539019',
    url: baseUrl().href
  };
  const graph = [localBusiness];
  if(product){
    const productSchema = {
      '@type':'Product',
      name: product.name,
      description: product.description || `${product.name} en la carta de Reserva Aqueris.`,
      category: product.category,
      brand: { '@type':'Brand', name: product.brand || 'Don Salvattore' },
      url: productUrl(product).href
    };
    const image = absoluteUrl(imageUrl(product.image_path));
    if(image) productSchema.image = image;
    graph.push(productSchema);
  }
  const target=$('#structured-data');
  if(target) target.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
}
function updateSeo(product=null){
  const settings = state.settings || {};
  const baseTitle = settings.seo_title || 'Reserva Aqueris | Carta de vinos en Arequipa';
  const baseDescription = settings.seo_description || 'Carta digital de Reserva Aqueris en Arequipa. Descubre vinos Don Salvattore y consulta disponibilidad por WhatsApp.';
  const title = product ? `${product.name} | Reserva Aqueris` : baseTitle;
  const description = product ? (product.description || `${product.name} · ${product.category} · Reserva Aqueris, Arequipa.`) : baseDescription;
  const url = product ? productUrl(product).href : baseUrl().href;
  document.title = title;
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  const canonical=$('#canonical-url'); if(canonical) canonical.href=url;
  updateStructuredData(product);
}
function productBadges(p){
  const left = p.featured ? '<span class="badge">Selección</span>' : '';
  const right = p.badge ? `<span class="badge badge-secondary">${esc(p.badge)}</span>` : '';
  return left || right ? `<div class="product-badges">${left}<span></span>${right}</div>` : '';
}
function card(p){
  const a=availability(p);
  return `<article class="product-card ${p.availability_status==='out'?'is-unavailable':''}">
    <button class="product-poster" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.name)}">
      ${catalogVisual(p)}
      ${productBadges(p)}
      <span class="poster-gloss" aria-hidden="true"></span>
    </button>
    <div class="product-copy">
      <div class="product-heading"><div class="product-heading-top"><span class="category">${esc(p.category)}</span><span class="availability-pill ${a.className}">${esc(a.label)}</span></div><h3>${esc(p.name)}</h3></div>
      <p>${esc(p.description || 'Conoce esta presentación de la carta Reserva Aqueris.')}</p>
      <div class="price-block">
        <div><small>UNIDAD</small><strong>${money(p.unit_price)}</strong></div>
        ${p.case_price != null ? `<div><small>${esc(p.case_label || 'CAJA').toUpperCase()}</small><strong>${money(p.case_price)}</strong></div>` : ''}
      </div>
      <div class="card-actions"><button class="btn btn-outline" data-open="${esc(p.id)}">Ver ficha</button><a class="btn btn-whatsapp" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Consultar</a></div>
    </div>
  </article>`;
}
function render(){
  const q = normalizeText(state.search.trim());
  const list = state.products.filter(p => {
    const matchesCategory = state.category === 'Todos' || p.category === state.category;
    const haystack = normalizeText([p.name,p.category,p.brand,p.description,p.tasting_notes,p.pairing,p.origin,p.presentation,p.badge].filter(Boolean).join(' '));
    return matchesCategory && (!q || haystack.includes(q));
  });
  $('#products').innerHTML = list.map(card).join('');
  $('#empty').classList.toggle('hidden', list.length > 0);
  if(!$('#catalog-status').classList.contains('error')) $('#catalog-status').textContent = list.length ? `${list.length} ${list.length===1?'presentación':'presentaciones'} en la carta.` : '';
  $$('[data-open]', $('#products')).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.open)));
}
function renderFilters(){
  const ordered = state.categories.filter(c=>c.active).map(c=>c.name);
  const legacy = state.categoriesLoaded ? [] : state.products.map(p=>p.category).filter(Boolean).filter(name=>!ordered.includes(name));
  const cats = ['Todos', ...ordered, ...new Set(legacy)];
  if(!cats.includes(state.category)) state.category='Todos';
  $('#filters').innerHTML = cats.map(c => `<button class="filter ${c === state.category ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  $$('[data-category]').forEach(b => b.addEventListener('click', () => { state.category = b.dataset.category; renderFilters(); render(); }));
}
function renderShowcase(){
  const preferred = [...state.products.filter(p => p.featured), ...state.products].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).slice(0,3);
  $('#hero-showcase').innerHTML = preferred.map((p,i) => `<button class="showcase-poster poster-${i+1}" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.name)}">${catalogVisual(p)}</button>`).join('');
  $$('[data-open]', $('#hero-showcase')).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.open)));
}
function detailSpec(label,value){ return value ? `<div class="detail-spec"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>` : ''; }
function editorialBlock(title,value){ return value ? `<article><h3>${esc(title)}</h3><p>${esc(value)}</p></article>` : ''; }
function findProduct(ref){ return state.products.find(x => x.id === ref || x.slug === ref); }
function setShareStatus(text){ const el=$('#share-status'); if(el) el.textContent=text||''; }
async function copyText(text){
  if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(text); return; }
  const area=document.createElement('textarea'); area.value=text; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
}
async function shareProduct(p){
  const url=productUrl(p).href;
  try{
    if(navigator.share) await navigator.share({title:`${p.name} | Reserva Aqueris`,text:`Conoce ${p.name} en la carta de Reserva Aqueris.`,url});
    else { await copyText(url); setShareStatus('Enlace copiado.'); }
  }catch(err){ if(err?.name!=='AbortError') setShareStatus('No se pudo compartir. Puedes copiar el enlace.'); }
}
async function toggleQr(p){
  const wrap=$('#product-qr-wrap'),canvas=$('#product-qr'); if(!wrap||!canvas)return;
  const show=!wrap.classList.contains('visible'); wrap.classList.toggle('visible',show); if(!show)return;
  if(!window.QRCode || typeof window.QRCode.toCanvas!=='function'){
    wrap.classList.remove('visible');
    setShareStatus('El QR no está disponible en este momento; usa “Copiar enlace”.');
    return;
  }
  try{ await window.QRCode.toCanvas(canvas,productUrl(p).href,{width:180,margin:1}); setShareStatus('QR listo para compartir o mostrar desde tu pantalla.'); }
  catch{ wrap.classList.remove('visible'); setShareStatus('No se pudo generar el QR.'); }
}
function bindProductActions(p){
  $('[data-share-product]')?.addEventListener('click',()=>shareProduct(p));
  $('[data-copy-product]')?.addEventListener('click',async()=>{try{await copyText(productUrl(p).href);setShareStatus('Enlace copiado.');}catch{setShareStatus('No se pudo copiar el enlace.');}});
  $('[data-qr-product]')?.addEventListener('click',()=>toggleQr(p));
}
function openProduct(ref,{updateUrl=true}={}){
  const p = findProduct(ref); if(!p) return false;
  const a=availability(p);
  $('#modal-content').innerHTML = `<div class="modal-grid">
    <div class="modal-poster">${catalogVisual(p, 'modal-visual')}</div>
    <div class="modal-copy">
      <img class="modal-logo" data-modal-logo alt="Reserva Aqueris">
      <div class="modal-topline"><span class="category">${esc(p.category)}</span><span class="availability-pill ${a.className}">${esc(a.label)}</span>${p.badge?`<span class="availability-pill availability-consult">${esc(p.badge)}</span>`:''}</div>
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.description || 'Conoce esta presentación de la carta Reserva Aqueris.')}</p>
      <div class="detail-specs">
        ${detailSpec('Marca',p.brand || 'Don Salvattore')}
        ${detailSpec('Servicio',p.service_temp)}
        ${detailSpec('Origen',p.origin)}
        ${detailSpec('Presentación',p.presentation)}
        ${detailSpec('Grado alcohólico',p.alcohol_content)}
      </div>
      <div class="detail-editorial">${editorialBlock('Notas de cata',p.tasting_notes)}${editorialBlock('Maridaje sugerido',p.pairing)}</div>
      <div class="modal-prices"><div><small>Unidad</small><strong>${money(p.unit_price)}</strong></div>${p.case_price != null ? `<div><small>${esc(p.case_label || 'Caja')}</small><strong>${money(p.case_price)}</strong></div>` : ''}</div>
      <div class="modal-actions-stack">
        <a class="btn btn-whatsapp btn-large" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Consultar disponibilidad</a>
        <div class="modal-secondary-actions"><button class="btn btn-outline" type="button" data-share-product>Compartir</button><button class="btn btn-outline" type="button" data-copy-product>Copiar enlace</button></div>
        <button class="text-button" type="button" data-qr-product>Mostrar QR de esta ficha</button>
        <p id="share-status" class="share-status" aria-live="polite"></p>
        <div id="product-qr-wrap" class="product-qr-wrap"><canvas id="product-qr" width="180" height="180" aria-label="Código QR de ${esc(p.name)}"></canvas><div class="product-qr-copy"><strong>Ficha directa</strong><span>Escanea este código para abrir este vino directamente en la carta.</span></div></div>
      </div>
    </div>
  </div>`;
  const ml = $('[data-modal-logo]'); if(ml && window.AQ_LOGO) ml.src = window.AQ_LOGO;
  bindProductActions(p);
  const dialog=$('#product-modal'); if(!dialog.open) dialog.showModal();
  if(updateUrl && new URL(location.href).searchParams.get('vino')!==p.slug) history.pushState({vino:p.slug},'',productUrl(p));
  updateSeo(p);
  return true;
}
function closeProduct({updateUrl=true}={}){
  const dialog=$('#product-modal'); if(dialog.open) dialog.close();
  if(updateUrl && new URL(location.href).searchParams.has('vino')) history.replaceState({},'',baseUrl());
  updateSeo();
}
function hydrateSettings(settings){
  state.settings=settings;
  if(settings.hero_title) $('#hero-title').textContent = settings.hero_title;
  if(settings.hero_subtitle) $('#hero-subtitle').textContent = settings.hero_subtitle;
  if(settings.location) $('#location').textContent = settings.location;
  if(settings.instagram){ $('#instagram').textContent = settings.instagram; $('#instagram-strip').textContent=settings.instagram; }
  if(settings.attention){ $('#attention').textContent = settings.attention; $('#attention-strip').textContent=settings.attention; }
  if(settings.story_title) $('#story-title').textContent=settings.story_title;
  if(settings.story_body) $('#story-body').textContent=settings.story_body;
  hydrateWhatsApp();
  updateSeo();
}
async function load(){
  initBrand();
  $('#catalog-status').textContent='Cargando carta…';
  const [{data:products,error:pErr},{data:settings,error:sErr},{data:categories,error:cErr}] = await Promise.all([
    db.from('products').select('*').eq('active', true).order('sort_order').order('name'),
    db.from('site_settings').select('*').eq('id',1).single(),
    db.from('categories').select('*').eq('active',true).order('sort_order').order('name')
  ]);
  if(pErr){ console.error(pErr); $('#catalog-status').textContent='No se pudo cargar la carta. Intenta nuevamente.'; $('#catalog-status').classList.add('error'); }
  else state.products = products || [];
  if(cErr) console.warn('Categorías no disponibles:',cErr.message); else { state.categories=categories||[]; state.categoriesLoaded=true; }
  if(!sErr && settings) hydrateSettings(settings); else { hydrateWhatsApp(); updateSeo(); }
  renderShowcase(); renderFilters(); render();
  const deepLink=new URL(location.href).searchParams.get('vino');
  if(deepLink && !openProduct(deepLink,{updateUrl:false})){
    history.replaceState({},'',baseUrl());
    $('#catalog-status').textContent='La ficha compartida ya no está disponible; te mostramos la carta completa.';
  }
}

$('#search').addEventListener('input', e => { state.search = e.target.value; render(); });
$('#product-modal').addEventListener('click', e => { if(e.target === $('#product-modal')) closeProduct(); });
$('#product-modal').addEventListener('close',()=>{ if(new URL(location.href).searchParams.has('vino')) history.replaceState({},'',baseUrl()); updateSeo(); });
$('[data-close]').addEventListener('click', () => closeProduct());
window.addEventListener('popstate',()=>{
  const slug=new URL(location.href).searchParams.get('vino');
  if(slug) openProduct(slug,{updateUrl:false}); else closeProduct({updateUrl:false});
});
$('#year').textContent = new Date().getFullYear();
load();
