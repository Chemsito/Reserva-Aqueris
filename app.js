const { supabaseUrl, supabaseKey, storageBucket } = window.AQUERIS_CONFIG;
const db = supabase.createClient(supabaseUrl, supabaseKey);
const state = { products: [], settings: null, category: 'Todos', search: '' };
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const SPRITE_INDEX = {
  'perfecto-amor':0,'borgona':1,'borgona-exportacion':2,'vino-de-higo':3,'borgona-coleccion-especial':4,'tinto-semi-seco':5,
  'tinto-seco':6,'mistela':7,'borgona-blanco':8,'romance':9,'vino-de-misa':10,'oporto':11,'borgona-sombreron':12,'rose-sombreron':13,
  'perfecto-amor-sombreron':14,'tinto-semi-seco-sombreron':15,'reserva-privada-damajuana':16,'champagne-espumante':17
};

function esc(value='') { return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function money(v){ return v == null ? 'Consultar' : `S/${Number(v).toFixed(2)}`; }
function imageUrl(path){
  if(!path) return null;
  if(path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
  if(path.startsWith('assets/')) return `./${path}`;
  return db.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
}
function spriteStyle(p){
  const i = SPRITE_INDEX[p.slug];
  if(i == null) return null;
  const col = i % 6, row = Math.floor(i / 6);
  return `--sprite-x:${col * 20}%;--sprite-y:${row * 50}%;`;
}
function catalogVisual(p, extra=''){
  const custom = imageUrl(p.image_path);
  if(custom) return `<img class="catalog-photo ${extra}" src="${esc(custom)}" alt="${esc(p.name)}" loading="lazy" onerror="this.classList.add('image-error')">`;
  const sprite = spriteStyle(p);
  if(sprite) return `<div class="catalog-sprite ${extra}" style="${sprite}" role="img" aria-label="${esc(p.name)}"></div>`;
  return `<img class="catalog-photo ${extra}" src="${window.AQ_LOGO || ''}" alt="${esc(p.name)}" style="object-fit:contain;padding:22%;background:#e4dbce">`;
}
function whatsappUrl(product){
  const n = state.settings?.whatsapp || '51967539019';
  const text = product
    ? `Hola Reserva Aqueris, quisiera consultar por ${product.name}. Precio unidad: ${money(product.unit_price)}${product.case_price != null ? `, ${product.case_label}: ${money(product.case_price)}` : ''}.`
    : 'Hola Reserva Aqueris, quisiera consultar por sus vinos, disponibilidad y precios.';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
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
function card(p){
  return `<article class="product-card">
    <button class="product-poster" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">
      ${catalogVisual(p)}
      ${p.featured ? '<span class="badge">Destacado</span>' : ''}
      <span class="poster-gloss" aria-hidden="true"></span>
    </button>
    <div class="product-copy">
      <div class="product-heading"><span class="category">${esc(p.category)}</span><h3>${esc(p.name)}</h3></div>
      <p>${esc(p.description || 'La temperatura ideal de servicio es entre 14°C y 16°C.')}</p>
      <div class="price-block">
        <div><small>UNIDAD</small><strong>${money(p.unit_price)}</strong></div>
        ${p.case_price != null ? `<div><small>${esc(p.case_label || 'CAJA').toUpperCase()}</small><strong>${money(p.case_price)}</strong></div>` : ''}
      </div>
      <div class="card-actions"><button class="btn btn-outline" data-open="${p.id}">Ver detalle</button><a class="btn btn-whatsapp" href="${whatsappUrl(p)}" target="_blank" rel="noopener">WhatsApp</a></div>
    </div>
  </article>`;
}
function render(){
  const q = state.search.trim().toLowerCase();
  const list = state.products.filter(p => (state.category === 'Todos' || p.category === state.category) && (!q || `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(q)));
  $('#products').innerHTML = list.map(card).join('');
  $('#empty').classList.toggle('hidden', list.length > 0);
  $$('[data-open]', $('#products')).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.open)));
}
function renderFilters(){
  const cats = ['Todos', ...new Set(state.products.map(p => p.category).filter(Boolean))];
  $('#filters').innerHTML = cats.map(c => `<button class="filter ${c === state.category ? 'active' : ''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  $$('[data-category]').forEach(b => b.addEventListener('click', () => { state.category = b.dataset.category; renderFilters(); render(); }));
}
function renderShowcase(){
  const preferred = [...state.products.filter(p => p.featured), ...state.products].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).slice(0,3);
  $('#hero-showcase').innerHTML = preferred.map((p,i) => `<button class="showcase-poster poster-${i+1}" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">${catalogVisual(p)}</button>`).join('');
  $$('[data-open]', $('#hero-showcase')).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.open)));
}
function openProduct(id){
  const p = state.products.find(x => x.id === id); if(!p) return;
  $('#modal-content').innerHTML = `<div class="modal-grid">
    <div class="modal-poster">${catalogVisual(p, 'modal-visual')}</div>
    <div class="modal-copy">
      <img class="modal-logo" data-modal-logo alt="Reserva Aqueris">
      <span class="category">${esc(p.category)}</span>
      <h2>${esc(p.name)}</h2>
      <p>${esc(p.description || 'La temperatura ideal de servicio es entre 14°C y 16°C.')}</p>
      <dl><div><dt>Marca</dt><dd>${esc(p.brand || 'Don Salvattore')}</dd></div><div><dt>Servicio</dt><dd>${esc(p.service_temp || '14°C a 16°C')}</dd></div></dl>
      <div class="modal-prices"><div><small>Unidad</small><strong>${money(p.unit_price)}</strong></div>${p.case_price != null ? `<div><small>${esc(p.case_label || 'Caja')}</small><strong>${money(p.case_price)}</strong></div>` : ''}</div>
      <a class="btn btn-whatsapp btn-large" href="${whatsappUrl(p)}" target="_blank" rel="noopener">Consultar este producto</a>
    </div>
  </div>`;
  const ml = $('[data-modal-logo]'); if(ml && window.AQ_LOGO) ml.src = window.AQ_LOGO;
  $('#product-modal').showModal();
}
async function load(){
  initBrand();
  const [{data:products,error:pErr},{data:settings,error:sErr}] = await Promise.all([
    db.from('products').select('*').eq('active', true).order('sort_order').order('name'),
    db.from('site_settings').select('*').eq('id',1).single()
  ]);
  if(pErr) console.error(pErr); else state.products = products || [];
  if(!sErr && settings){
    state.settings = settings;
    if(settings.hero_title) $('#hero-title').textContent = settings.hero_title;
    if(settings.hero_subtitle) $('#hero-subtitle').textContent = settings.hero_subtitle;
    if(settings.location) $('#location').textContent = settings.location;
    if(settings.instagram) $('#instagram').textContent = settings.instagram;
    if(settings.attention) $('#attention').textContent = settings.attention;
  }
  hydrateWhatsApp(); renderShowcase(); renderFilters(); render();
}

$('#search').addEventListener('input', e => { state.search = e.target.value; render(); });
$('#product-modal').addEventListener('click', e => { if(e.target === $('#product-modal')) $('#product-modal').close(); });
$('[data-close]').addEventListener('click', () => $('#product-modal').close());
$('#year').textContent = new Date().getFullYear();
load();
