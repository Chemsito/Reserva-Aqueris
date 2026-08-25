const { supabaseUrl, supabaseKey, storageBucket } = window.AQUERIS_CONFIG;
const db = supabase.createClient(supabaseUrl, supabaseKey);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let products=[], editing=null;

function msg(el,text,type=''){el.textContent=text||'';el.className=`form-message ${type}`;}
function esc(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function slugify(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function money(v){return v==null?'—':`S/${Number(v).toFixed(2)}`;}
function internalImage(path){return !!path&&!/^https?:\/\//i.test(path)&&!path.startsWith('assets/');}
function nullablePrice(selector){const raw=$(selector).value.trim();if(!raw)return null;const value=Number(raw);if(!Number.isFinite(value)||value<0)throw new Error('Los precios deben ser números válidos mayores o iguales a 0.');return value;}

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

async function loadDashboard(){await Promise.all([loadProducts(),loadSettings()]);}
async function loadProducts(){const {data,error}=await db.from('products').select('*').order('sort_order').order('name');if(error)return console.error(error);products=data||[];renderProducts();}
function renderProducts(){
  const q=$('#admin-search').value.trim().toLowerCase(),list=products.filter(p=>!q||`${p.name} ${p.category}`.toLowerCase().includes(q));
  $('#admin-products').innerHTML=list.map(p=>`<article class="admin-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.category)} · ${money(p.unit_price)} ${p.active?'· Activo':'· Oculto'}</span></div><div><button class="text-button" data-edit="${esc(p.id)}">Editar</button><button class="text-button danger" data-delete="${esc(p.id)}">Eliminar</button></div></article>`).join('');
  $('#stat-total').textContent=products.length;
  $('#stat-active').textContent=products.filter(p=>p.active).length;
  $('#stat-featured').textContent=products.filter(p=>p.featured).length;
  $$('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
}

$('#admin-search').addEventListener('input',renderProducts);
$('#new-product').onclick=()=>{resetEditor();$('#name').focus();};
$('#cancel-edit').onclick=resetEditor;
$('#name').addEventListener('input',()=>{if(!editing)$('#slug').value=slugify($('#name').value);});

function resetEditor(){editing=null;$('#product-form').reset();$('#brand').value='Don Salvattore';$('#case-label').value='Caja';$('#service-temp').value='14°C a 16°C';$('#active').checked=true;$('#sort-order').value=products.length+1;$('#editor-title').textContent='Nuevo producto';$('#cancel-edit').classList.add('hidden');msg($('#product-message'),'');}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;editing=p;$('#product-id').value=p.id;$('#name').value=p.name;$('#slug').value=p.slug;$('#category').value=p.category;$('#brand').value=p.brand;$('#unit-price').value=p.unit_price??'';$('#case-price').value=p.case_price??'';$('#case-label').value=p.case_label||'Caja';$('#service-temp').value=p.service_temp||'';$('#description').value=p.description||'';$('#image-path').value=p.image_path||'';$('#featured').checked=p.featured;$('#active').checked=p.active;$('#sort-order').value=p.sort_order||0;$('#editor-title').textContent=`Editar: ${p.name}`;$('#cancel-edit').classList.remove('hidden');scrollTo({top:0,behavior:'smooth'});}

async function uploadImage(file,slug){
  if(!file)return {path:$('#image-path').value.trim()||null,uploaded:false};
  if(file.size>5*1024*1024)throw new Error('La imagen supera 5 MB.');
  const extByType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const ext=extByType[file.type];
  if(!ext)throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
  const safeSlug=slugify(slug)||'producto';
  const path=`${safeSlug}-${Date.now()}.${ext}`;
  const {error}=await db.storage.from(storageBucket).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
  if(error)throw error;
  return {path,uploaded:true};
}

$('#product-form').addEventListener('submit',async e=>{
  e.preventDefault();
  msg($('#product-message'),'Guardando...');
  let newUpload=null;
  try{
    const name=$('#name').value.trim(),slug=$('#slug').value.trim()||slugify(name);
    if(!name||!slug)throw new Error('Nombre y slug son obligatorios.');
    const upload=await uploadImage($('#image-file').files[0],slug);
    if(upload.uploaded)newUpload=upload.path;
    const payload={
      name,slug,category:$('#category').value.trim(),brand:$('#brand').value.trim(),description:$('#description').value.trim(),service_temp:$('#service-temp').value.trim(),
      unit_price:nullablePrice('#unit-price'),case_price:nullablePrice('#case-price'),case_label:$('#case-label').value.trim()||'Caja',image_path:upload.path,
      featured:$('#featured').checked,active:$('#active').checked,sort_order:Number.parseInt($('#sort-order').value,10)||0
    };
    if(!payload.category||!payload.brand)throw new Error('Categoría y marca son obligatorias.');
    const previousImage=editing?.image_path||null;
    const q=editing?db.from('products').update(payload).eq('id',editing.id):db.from('products').insert(payload);
    const {error}=await q;
    if(error)throw error;
    if(newUpload&&previousImage&&previousImage!==newUpload&&internalImage(previousImage)){
      const {error:removeError}=await db.storage.from(storageBucket).remove([previousImage]);
      if(removeError)console.warn('No se pudo limpiar la imagen anterior:',removeError.message);
    }
    resetEditor();
    await loadProducts();
    msg($('#product-message'),'Producto guardado.','success');
  }catch(err){
    if(newUpload){const {error:cleanupError}=await db.storage.from(storageBucket).remove([newUpload]);if(cleanupError)console.warn('No se pudo limpiar la imagen nueva:',cleanupError.message);}
    msg($('#product-message'),err.message||'No se pudo guardar.','error');
  }
});

async function deleteProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p||!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`))return;
  const {error}=await db.from('products').delete().eq('id',id);
  if(error)return alert(error.message);
  if(internalImage(p.image_path)){
    const {error:removeError}=await db.storage.from(storageBucket).remove([p.image_path]);
    if(removeError)console.warn('Producto eliminado, pero no se pudo limpiar su imagen:',removeError.message);
  }
  await loadProducts();
  if(editing?.id===id)resetEditor();
}

async function loadSettings(){const {data,error}=await db.from('site_settings').select('*').eq('id',1).single();if(error||!data)return;$('#setting-name').value=data.business_name;$('#setting-whatsapp').value=data.whatsapp;$('#setting-instagram').value=data.instagram;$('#setting-attention').value=data.attention;$('#setting-location').value=data.location;$('#setting-hero-title').value=data.hero_title;$('#setting-hero-subtitle').value=data.hero_subtitle;}
$('#settings-form').addEventListener('submit',async e=>{e.preventDefault();msg($('#settings-message'),'Guardando...');const whatsapp=$('#setting-whatsapp').value.replace(/\D/g,'');if(whatsapp.length<8)return msg($('#settings-message'),'Ingresa un número de WhatsApp válido.','error');const payload={business_name:$('#setting-name').value.trim(),whatsapp,instagram:$('#setting-instagram').value.trim(),attention:$('#setting-attention').value.trim(),location:$('#setting-location').value.trim(),hero_title:$('#setting-hero-title').value.trim(),hero_subtitle:$('#setting-hero-subtitle').value.trim()};const {error}=await db.from('site_settings').update(payload).eq('id',1);msg($('#settings-message'),error?error.message:'Datos actualizados.',error?'error':'success');});

db.auth.onAuthStateChange(()=>setTimeout(route,0));
resetEditor();
route();
