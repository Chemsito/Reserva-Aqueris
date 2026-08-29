const { supabaseUrl, supabaseKey, storageBucket } = window.AQUERIS_CONFIG;
const db = supabase.createClient(supabaseUrl, supabaseKey);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let products=[], categories=[], editing=null, editingCategory=null;
const AVAILABILITY={available:['Disponible','availability-available'],consult:['Consultar','availability-consult'],out:['Agotado temporalmente','availability-out'],soon:['Próximamente','availability-soon']};

function msg(el,text,type=''){el.textContent=text||'';el.className=`form-message ${type}`;}
function esc(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function slugify(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function money(v){return v==null?'—':`S/${Number(v).toFixed(2)}`;}
function internalImage(path){return !!path&&!/^https?:\/\//i.test(path)&&!path.startsWith('assets/');}
function nullablePrice(selector){const raw=$(selector).value.trim();if(!raw)return null;const value=Number(raw);if(!Number.isFinite(value)||value<0)throw new Error('Los precios deben ser números válidos mayores o iguales a 0.');return value;}
function availabilityPill(status){const [label,className]=AVAILABILITY[status]||AVAILABILITY.available;return `<span class="availability-pill ${className}">${esc(label)}</span>`;}

async function isAdmin(){
  const {data:{user},error:userError}=await db.auth.getUser();
  if(userError||!user)return false;
  const {data,error}=await db.from('site_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  return !error&&!!data;
}
async function route(){
  const {data:{session}}=await db.auth.getSession();
  $('#auth-view').classList.toggle('hidden',!!session);
  $('#unauthorized-view').classList.add('hidden');
  $('#dashboard').classList.add('hidden');
  if(!session)return;
  const admin=await isAdmin();
  $('#unauthorized-view').classList.toggle('hidden',admin);
  $('#dashboard').classList.toggle('hidden',!admin);
  if(admin)await loadDashboard();
}
$('#auth-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#auth-email').value.trim(),password=$('#auth-password').value;
  msg($('#auth-message'),'Procesando...');
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error)return msg($('#auth-message'),'No se pudo iniciar sesión. Verifica tus credenciales.','error');
  msg($('#auth-message'),'Acceso correcto.','success');
  await route();
});
async function logout(){await db.auth.signOut();location.reload();}
$('#logout').addEventListener('click',logout);
$('#logout-unauthorized').addEventListener('click',logout);

async function loadDashboard(){
  await loadCategories();
  await Promise.all([loadProducts(),loadSettings()]);
  resetEditor();
}
async function loadProducts(){
  const {data,error}=await db.from('products').select('*').order('sort_order').order('name');
  if(error){console.error(error);return msg($('#product-message'),'No se pudieron cargar los productos.','error');}
  products=data||[]; renderProducts(); renderCategories();
}
function renderProducts(){
  const q=$('#admin-search').value.trim().toLowerCase(),list=products.filter(p=>!q||`${p.name} ${p.category} ${p.badge||''}`.toLowerCase().includes(q));
  $('#admin-products').innerHTML=list.map(p=>`<article class="admin-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.category)} · ${money(p.unit_price)} ${p.active?'· Activo':'· Oculto'}</span><div class="admin-row-meta">${availabilityPill(p.availability_status)}${p.badge?`<span class="availability-pill availability-consult">${esc(p.badge)}</span>`:''}</div></div><div><button class="text-button" data-edit="${esc(p.id)}">Editar</button><button class="text-button danger" data-delete="${esc(p.id)}">Eliminar</button></div></article>`).join('');
  $('#stat-total').textContent=products.length;
  $('#stat-active').textContent=products.filter(p=>p.active).length;
  $('#stat-featured').textContent=products.filter(p=>p.featured).length;
  $$('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
}
function renderCategorySelect(selectedId='',fallbackName=''){
  const select=$('#category');
  select.innerHTML=categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}${c.active?'':' · oculta'}</option>`).join('');
  const match=selectedId&&categories.some(c=>c.id===selectedId)?selectedId:(categories.find(c=>c.name===fallbackName)?.id||categories.find(c=>c.active)?.id||categories[0]?.id||'');
  if(match)select.value=match;
}
$('#admin-search').addEventListener('input',renderProducts);
$('#new-product').onclick=()=>{resetEditor();$('#name').focus();};
$('#cancel-edit').onclick=resetEditor;
$('#name').addEventListener('input',()=>{if(!editing)$('#slug').value=slugify($('#name').value);});
function resetEditor(){
  editing=null; $('#product-form').reset();
  $('#brand').value='Don Salvattore'; $('#case-label').value='Caja'; $('#service-temp').value='14°C a 16°C'; $('#availability-status').value='available'; $('#active').checked=true; $('#sort-order').value=products.length+1;
  renderCategorySelect();
  $('#editor-title').textContent='Nuevo producto'; $('#cancel-edit').classList.add('hidden'); msg($('#product-message'),'');
}
function editProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return; editing=p;
  $('#product-id').value=p.id; $('#name').value=p.name; $('#slug').value=p.slug; renderCategorySelect(p.category_id,p.category); $('#brand').value=p.brand;
  $('#availability-status').value=p.availability_status||'available'; $('#badge').value=p.badge||''; $('#unit-price').value=p.unit_price??''; $('#case-price').value=p.case_price??''; $('#case-label').value=p.case_label||'Caja'; $('#service-temp').value=p.service_temp||'';
  $('#origin').value=p.origin||''; $('#presentation').value=p.presentation||''; $('#alcohol-content').value=p.alcohol_content||''; $('#description').value=p.description||''; $('#tasting-notes').value=p.tasting_notes||''; $('#pairing').value=p.pairing||'';
  $('#image-path').value=p.image_path||''; $('#featured').checked=p.featured; $('#active').checked=p.active; $('#sort-order').value=p.sort_order||0;
  $('#editor-title').textContent=`Editar: ${p.name}`; $('#cancel-edit').classList.remove('hidden'); scrollTo({top:0,behavior:'smooth'});
}
async function uploadImage(file,slug){
  if(!file)return {path:$('#image-path').value.trim()||null,uploaded:false};
  if(file.size>5*1024*1024)throw new Error('La imagen supera 5 MB.');
  const extByType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}; const ext=extByType[file.type];
  if(!ext)throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
  const safeSlug=slugify(slug)||'producto',path=`${safeSlug}-${Date.now()}.${ext}`;
  const {error}=await db.storage.from(storageBucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false}); if(error)throw error;
  return {path,uploaded:true};
}
$('#product-form').addEventListener('submit',async e=>{
  e.preventDefault(); msg($('#product-message'),'Guardando...'); let newUpload=null;
  try{
    const name=$('#name').value.trim(),slug=$('#slug').value.trim()||slugify(name),categoryId=$('#category').value,category=categories.find(c=>c.id===categoryId);
    if(!name||!slug)throw new Error('Nombre y slug son obligatorios.'); if(!category)throw new Error('Selecciona una categoría válida.');
    const upload=await uploadImage($('#image-file').files[0],slug); if(upload.uploaded)newUpload=upload.path;
    const payload={name,slug,category:category.name,category_id:category.id,brand:$('#brand').value.trim(),availability_status:$('#availability-status').value,badge:$('#badge').value.trim()||null,description:$('#description').value.trim(),service_temp:$('#service-temp').value.trim(),origin:$('#origin').value.trim(),presentation:$('#presentation').value.trim(),alcohol_content:$('#alcohol-content').value.trim(),tasting_notes:$('#tasting-notes').value.trim(),pairing:$('#pairing').value.trim(),unit_price:nullablePrice('#unit-price'),case_price:nullablePrice('#case-price'),case_label:$('#case-label').value.trim()||'Caja',image_path:upload.path,featured:$('#featured').checked,active:$('#active').checked,sort_order:Number.parseInt($('#sort-order').value,10)||0};
    if(!payload.brand)throw new Error('La marca es obligatoria.');
    const previousImage=editing?.image_path||null,q=editing?db.from('products').update(payload).eq('id',editing.id):db.from('products').insert(payload),{error}=await q; if(error)throw error;
    if(newUpload&&previousImage&&previousImage!==newUpload&&internalImage(previousImage)){const {error:removeError}=await db.storage.from(storageBucket).remove([previousImage]);if(removeError)console.warn('No se pudo limpiar la imagen anterior:',removeError.message);}
    await loadProducts(); resetEditor(); msg($('#product-message'),'Producto guardado.','success');
  }catch(err){
    if(newUpload){const {error:cleanupError}=await db.storage.from(storageBucket).remove([newUpload]);if(cleanupError)console.warn('No se pudo limpiar la imagen nueva:',cleanupError.message);}
    msg($('#product-message'),err.message||'No se pudo guardar.','error');
  }
});
async function deleteProduct(id){
  const p=products.find(x=>x.id===id); if(!p||!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`))return;
  const {error}=await db.from('products').delete().eq('id',id); if(error)return alert(error.message);
  if(internalImage(p.image_path)){const {error:removeError}=await db.storage.from(storageBucket).remove([p.image_path]);if(removeError)console.warn('Producto eliminado, pero no se pudo limpiar su imagen:',removeError.message);}
  await loadProducts(); if(editing?.id===id)resetEditor();
}

async function loadCategories(){
  const {data,error}=await db.from('categories').select('*').order('sort_order').order('name');
  if(error){console.error(error);return msg($('#category-message'),'No se pudieron cargar las categorías.','error');}
  categories=data||[]; renderCategories(); renderCategorySelect(editing?.category_id,editing?.category);
}
function renderCategories(){
  if(!$('#category-list'))return;
  $('#category-count').textContent=`${categories.length} categorías`;
  $('#category-list').innerHTML=categories.map(c=>{const count=products.filter(p=>p.category_id===c.id||(!p.category_id&&p.category===c.name)).length;return `<article class="category-row ${c.active?'':'inactive'}"><div><strong>${esc(c.name)}</strong><span>${count} ${count===1?'producto':'productos'} · orden ${c.sort_order} · ${c.active?'visible':'oculta'}</span></div><div class="category-actions"><button class="text-button" data-edit-category="${esc(c.id)}">Editar</button></div></article>`;}).join('')||'<p class="category-editor-note">Aún no hay categorías.</p>';
  $$('[data-edit-category]').forEach(b=>b.onclick=()=>editCategory(b.dataset.editCategory));
}
function resetCategoryEditor(){editingCategory=null;$('#category-form').reset();$('#category-active').checked=true;$('#category-order').value=categories.length+1;$('#category-editor-title').textContent='Nueva categoría';$('#cancel-category-edit').classList.add('hidden');msg($('#category-message'),'');}
function editCategory(id){const c=categories.find(x=>x.id===id);if(!c)return;editingCategory=c;$('#category-name').value=c.name;$('#category-slug').value=c.slug;$('#category-order').value=c.sort_order;$('#category-active').checked=c.active;$('#category-editor-title').textContent=`Editar: ${c.name}`;$('#cancel-category-edit').classList.remove('hidden');}
$('#category-name').addEventListener('input',()=>{if(!editingCategory)$('#category-slug').value=slugify($('#category-name').value);});
$('#cancel-category-edit').addEventListener('click',resetCategoryEditor);
$('#category-form').addEventListener('submit',async e=>{
  e.preventDefault(); msg($('#category-message'),'Guardando...');
  const name=$('#category-name').value.trim(),slug=$('#category-slug').value.trim()||slugify(name),sort_order=Number.parseInt($('#category-order').value,10)||0,active=$('#category-active').checked;
  if(!name||!slug)return msg($('#category-message'),'Nombre y slug son obligatorios.','error');
  const oldName=editingCategory?.name||null;
  const query=editingCategory?db.from('categories').update({name,slug,sort_order,active}).eq('id',editingCategory.id):db.from('categories').insert({name,slug,sort_order,active});
  const {error}=await query; if(error)return msg($('#category-message'),error.message,'error');
  if(editingCategory&&oldName!==name){const {error:syncError}=await db.from('products').update({category:name}).eq('category_id',editingCategory.id);if(syncError)return msg($('#category-message'),`La categoría se guardó, pero no se pudo sincronizar el nombre en los productos: ${syncError.message}`,'error');}
  await loadCategories(); await loadProducts(); resetCategoryEditor(); msg($('#category-message'),'Categoría guardada.','success');
});

function updateSeoPreview(){const title=$('#setting-seo-title').value.trim()||'Reserva Aqueris | Carta de vinos en Arequipa',description=$('#setting-seo-description').value.trim()||'Carta digital de Reserva Aqueris en Arequipa.';$('#seo-preview-title').textContent=title;$('#seo-preview-description').textContent=description;}
async function loadSettings(){
  const {data,error}=await db.from('site_settings').select('*').eq('id',1).single(); if(error||!data)return;
  $('#setting-name').value=data.business_name; $('#setting-whatsapp').value=data.whatsapp; $('#setting-instagram').value=data.instagram; $('#setting-attention').value=data.attention; $('#setting-location').value=data.location; $('#setting-hero-title').value=data.hero_title; $('#setting-hero-subtitle').value=data.hero_subtitle; $('#setting-story-title').value=data.story_title||''; $('#setting-story-body').value=data.story_body||''; $('#setting-seo-title').value=data.seo_title||''; $('#setting-seo-description').value=data.seo_description||''; updateSeoPreview();
}
$('#setting-seo-title').addEventListener('input',updateSeoPreview); $('#setting-seo-description').addEventListener('input',updateSeoPreview);
$('#settings-form').addEventListener('submit',async e=>{
  e.preventDefault(); msg($('#settings-message'),'Guardando...');
  const whatsapp=$('#setting-whatsapp').value.replace(/\D/g,''); if(whatsapp.length<8)return msg($('#settings-message'),'Ingresa un número de WhatsApp válido.','error');
  const payload={business_name:$('#setting-name').value.trim(),whatsapp,instagram:$('#setting-instagram').value.trim(),attention:$('#setting-attention').value.trim(),location:$('#setting-location').value.trim(),hero_title:$('#setting-hero-title').value.trim(),hero_subtitle:$('#setting-hero-subtitle').value.trim(),story_title:$('#setting-story-title').value.trim(),story_body:$('#setting-story-body').value.trim(),seo_title:$('#setting-seo-title').value.trim(),seo_description:$('#setting-seo-description').value.trim()};
  const {error}=await db.from('site_settings').update(payload).eq('id',1); msg($('#settings-message'),error?error.message:'Datos actualizados.',error?'error':'success'); if(!error)updateSeoPreview();
});

db.auth.onAuthStateChange(()=>setTimeout(route,0));
resetCategoryEditor();
route();
