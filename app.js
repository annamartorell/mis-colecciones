import { TEMPLATES, FIELD_TYPES, ICONS } from './templates.js';
import { firebaseConfig } from './firebase-config.js';

const CLOUD = !!(firebaseConfig && (firebaseConfig.publicApiKey || firebaseConfig.apiKey));
const DB_ID = (firebaseConfig && firebaseConfig.databaseId) || '(default)';
const LS_KEY = 'bobina-v2';
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 850000;
const STATUS = [
  { l: 'Mi colección', v: 'poseída' },
  { l: 'Favoritos', v: 'deseada' },
  { l: 'Todas', v: 'Todas' }
];

const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(3, '0');

let state = { collections: [], items: [] };
let user = null, fb = null, db = null, auth = null;
let ready = !CLOUD;
let view = { name: 'home', id: null };
let filters = { category: 'Todas', status: 'poseída', q: '' };
let form = null;
let draft = null;

const curCol = () => state.collections.find(c => c.id === view.id);
const SPR = '<span></span>'.repeat(14);
const REEL = `<svg viewBox="0 0 64 64" width="30" height="30" fill="none"><circle cx="32" cy="32" r="26" stroke="#6e2836" stroke-width="3"/><circle cx="32" cy="32" r="7" stroke="#6e2836" stroke-width="3"/><circle cx="32" cy="14" r="4.5" stroke="#6e2836" stroke-width="3"/><circle cx="17" cy="41" r="4.5" stroke="#6e2836" stroke-width="3"/><circle cx="47" cy="41" r="4.5" stroke="#6e2836" stroke-width="3"/></svg>`;

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ---------- datos ---------- */
function makeCollection(key, name, order) {
  const t = TEMPLATES[key];
  return {
    id: uid(),
    name: name || t.name,
    icon: t.icon,
    categories: [...t.categories],
    fields: clone(t.fields),
    cardTitle: t.cardTitle,
    cardEyebrow: t.cardEyebrow,
    order,
    createdAt: Date.now()
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { collections: s.collections || [], items: s.items || [] };
    }
  } catch (e) { /* ignorar */ }
  return migrateOld();
}

function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch (e) { toast('No hay espacio para guardar en este dispositivo'); }
}

function migrateOld() {
  try {
    const old = JSON.parse(localStorage.getItem('cameras-v1') || '[]');
    if (!old.length) return { collections: [], items: [] };
    const c = makeCollection('camaras', null, 0);
    const items = old.map(o => {
      if (o.format && !c.categories.includes(o.format)) c.categories.push(o.format);
      if (o.brand && !c.fields[0].options.includes(o.brand)) c.fields[0].options.push(o.brand);
      return {
        id: o.id || uid(), collectionId: c.id, category: o.format || '',
        status: o.status === 'deseada' ? 'deseada' : 'poseída',
        photos: o.photo ? [o.photo] : [],
        values: { marca: o.brand || '', modelo: o.model || '', anio: o.year || '', condicion: o.rating || 0, notas: o.notes || '' },
        createdAt: Date.now(), updatedAt: Date.now()
      };
    });
    const s = { collections: [c], items };
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    return s;
  } catch (e) { return { collections: [], items: [] }; }
}

const cloudOn = () => !!(CLOUD && fb && user);

function dbSet(kind, obj) {
  if (cloudOn()) {
    fb.setDoc(fb.doc(db, 'users', user.uid, kind, obj.id), clone(obj))
      .catch(e => { console.error(e); toast('Error al guardar en la nube'); });
  } else saveLocal();
}

function dbDel(kind, id) {
  if (cloudOn()) {
    fb.deleteDoc(fb.doc(db, 'users', user.uid, kind, id))
      .catch(e => { console.error(e); toast('Error al borrar en la nube'); });
  } else saveLocal();
}

/* ---------- Firebase ---------- */
async function initFirebase() {
  if (!CLOUD) return;
  try {
    const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const [appM, authM, fsM] = await Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-auth.js'),
      import(base + 'firebase-firestore.js')
    ]);
    const { publicApiKey, databaseId, ...rest } = firebaseConfig;
    const app = appM.initializeApp({ ...rest, apiKey: publicApiKey || firebaseConfig.apiKey });
    auth = authM.getAuth(app);
    try {
      db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) }, DB_ID);
    } catch (e) { db = fsM.getFirestore(app, DB_ID); }
    fb = { ...authM, ...fsM };
    authM.onAuthStateChanged(auth, onAuth);
  } catch (e) {
    console.error(e);
    toast('No se pudo cargar el inicio de sesión');
    ready = true;
    render();
  }
}

async function loadCloud() {
  const [c, i] = await Promise.all([
    fb.getDocs(fb.collection(db, 'users', user.uid, 'collections')),
    fb.getDocs(fb.collection(db, 'users', user.uid, 'items'))
  ]);
  state = {
    collections: c.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0)),
    items: i.docs.map(d => d.data())
  };
}

async function maybeUploadLocal() {
  if (state.collections.length) return;
  const local = loadLocal();
  if (!local.collections.length) return;
  if (confirm('Hay colecciones guardadas en este dispositivo. ¿Quieres subirlas a tu cuenta?')) {
    state = local;
    for (const c of state.collections) dbSet('collections', c);
    for (const it of state.items) dbSet('items', it);
  }
}

async function onAuth(u) {
  user = u;
  try {
    if (u) { await loadCloud(); await maybeUploadLocal(); }
    else state = loadLocal();
  } catch (e) {
    console.error(e);
    toast('No se pudieron cargar tus datos');
  }
  ready = true;
  if (view.name === 'col' && !curCol()) view = { name: 'home', id: null };
  render();
}

async function login() {
  if (!fb) { toast('El inicio de sesión no está configurado'); return; }
  const p = new fb.GoogleAuthProvider();
  try { await fb.signInWithPopup(auth, p); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') fb.signInWithRedirect(auth, p);
    else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.error(e);
      toast('No se pudo iniciar sesión (' + (e.code || 'error') + ')');
    }
  }
}

/* ---------- fotos ---------- */
function compress(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = ev => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const s = Math.min(1, 640 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s);
        cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.6));
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
}

async function addFiles(files) {
  for (const f of files) {
    if (!form || form.photos.length >= MAX_PHOTOS) break;
    try {
      const data = await compress(f);
      const total = form.photos.reduce((a, p) => a + p.length, 0) + data.length;
      if (total > MAX_PHOTO_BYTES) { toast('Las fotos pesan demasiado, prueba con menos'); break; }
      form.photos.push(data);
    } catch (e) { toast('No se pudo leer una de las fotos'); }
  }
  renderPhotos();
}

function renderPhotos() {
  const box = $('#photos');
  if (!box || !form) return;
  box.innerHTML = form.photos.map((p, i) => `<div class="ph"><img src="${p}" alt=""><button data-act="rmPhoto" data-i="${i}">✕</button></div>`).join('')
    + (form.photos.length < MAX_PHOTOS ? '<button class="ph add" data-act="addPhoto">+</button>' : '');
}

/* ---------- valores y tarjetas ---------- */
function fmtVal(f, val) {
  if (!f) return '';
  if (f.type === 'yesno') return val ? f.label : '';
  if (val === undefined || val === null || val === '') return '';
  if (f.type === 'rating') return '★'.repeat(+val);
  if (f.type === 'date') { const d = new Date(val + 'T00:00'); return isNaN(d) ? String(val) : d.toLocaleDateString('es-ES'); }
  return String(val);
}

function cardInfo(c, it) {
  const v = it.values || {};
  const fld = id => c.fields.find(f => f.id === id);
  let eyebrow = fmtVal(fld(c.cardEyebrow), v[c.cardEyebrow]);
  let title = fmtVal(fld(c.cardTitle), v[c.cardTitle]);
  if (!title && eyebrow) { title = eyebrow; eyebrow = ''; }
  const used = new Set([c.cardTitle, c.cardEyebrow]);
  const others = c.fields
    .filter(f => !used.has(f.id) && ['text', 'number', 'date', 'select'].includes(f.type))
    .map(f => fmtVal(f, v[f.id])).filter(Boolean);
  const spec = [others[0], it.category].filter(Boolean).join(' · ');
  const rf = c.fields.find(f => f.type === 'rating');
  const r = rf ? (+v[rf.id] || 0) : 0;
  const stars = rf ? '★'.repeat(r) + '☆'.repeat(5 - r) : '';
  return { eyebrow, title, spec, stars };
}

function searchText(c, it) {
  const vals = Object.values(it.values || {}).filter(x => typeof x === 'string' || typeof x === 'number');
  return [...vals, it.category || ''].join(' ').toLowerCase();
}

function cardHtml(c, it) {
  const { eyebrow, title, spec, stars } = cardInfo(c, it);
  const cover = (it.photos || [])[0];
  return `<div class="card"><div class="sprockets">${SPR}</div>
    <div class="thumb" data-act="thumb" data-id="${it.id}">${cover ? `<img src="${cover}" alt="">` : REEL}</div>
    <div class="cardbody" data-act="openItem" data-id="${it.id}">
      <div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<p class="model">${esc(title || 'Sin nombre')}</p></div>
      <div class="specrow"><span class="spec">${esc(spec)}</span>${stars ? `<span class="spec">${stars}</span>` : ''}</div>
    </div>
    <div class="sprockets">${SPR}</div></div>`;
}

/* ---------- pantallas ---------- */
function accountHtml() {
  if (!CLOUD) return '<span class="muted">Solo en este dispositivo</span>';
  if (!ready) return '';
  if (user) return `<span class="muted">${esc(user.displayName || user.email || '')}</span><button class="linkbtn" data-act="logout">Cerrar sesión</button>`;
  return '<span class="muted">Solo en este dispositivo</span><button class="linkbtn" data-act="login">Iniciar sesión con Google</button>';
}

function render() {
  const app = $('#app');
  if (!ready) { app.innerHTML = '<div class="page"><div class="empty show"><h3>Cargando…</h3></div></div>'; return; }
  if (view.name === 'col' && curCol()) renderCollection();
  else { view = { name: 'home', id: null }; renderHome(); }
}

function renderHome() {
  const cols = state.collections;
  $('#app').innerHTML = `<div class="page">
    <div class="topbar">
      <div class="brandrow"><h1>Bobina</h1><span class="counter">${cols.length} ${cols.length === 1 ? 'colección' : 'colecciones'}</span></div>
      <div class="userrow">${accountHtml()}</div>
      <p class="tagline">tus colecciones, cuadro a cuadro</p>
    </div>
    <div class="content">
      <div class="colgrid">
        ${cols.map(c => {
          const n = state.items.filter(i => i.collectionId === c.id).length;
          return `<button class="colcard" data-act="openCol" data-id="${c.id}"><span class="ico">${esc(c.icon)}</span><span class="nm">${esc(c.name)}</span><span class="ct">${n} ${n === 1 ? 'pieza' : 'piezas'}</span></button>`;
        }).join('')}
        <button class="colcard newcol" data-act="newCol"><span class="ico">+</span>Nueva colección</button>
      </div>
    </div></div>`;
}

function renderCollection() {
  const c = curCol();
  $('#app').innerHTML = `<div class="page">
    <div class="topbar">
      <div class="brandrow">
        <div class="brandleft"><button class="iconbtn" data-act="home" aria-label="Volver">‹</button><h1>${esc(c.icon)} ${esc(c.name)}</h1></div>
        <div class="brandright"><span class="counter" id="counter">000/000</span><button class="iconbtn" data-act="editCol" aria-label="Ajustes de la colección">⚙</button></div>
      </div>
      <div class="searchwrap" style="margin-top:10px;">
        <input class="search" id="search" placeholder="Buscar…" value="${esc(filters.q)}">
        <button class="clearsearch" id="clearSearch" data-act="clearSearch" style="${filters.q ? 'display:flex;' : ''}" aria-label="Borrar búsqueda">✕</button>
      </div>
      <div class="dial" id="catDial"></div>
      <div class="tabrow" id="statusDial"></div>
    </div>
    <div class="content"><div class="empty" id="empty"></div><div class="grid" id="grid"></div></div>
  </div>
  <div class="fab"><button data-act="newItem" aria-label="Añadir pieza">+</button></div>`;
  renderDials();
  renderGrid();
}

function renderDials() {
  const c = curCol();
  if (!c || !$('#catDial')) return;
  const cd = $('#catDial');
  cd.style.display = c.categories.length ? 'flex' : 'none';
  cd.innerHTML = ['Todas', ...c.categories].map(x => `<button data-act="cat" data-v="${esc(x)}" class="${x === filters.category ? 'active' : ''}">${esc(x)}</button>`).join('');
  $('#statusDial').innerHTML = STATUS.map(s => `<button data-act="stat" data-v="${s.v}" class="${s.v === filters.status ? 'active' : ''}">${s.l}</button>`).join('');
}

function renderGrid() {
  const c = curCol();
  if (!c || !$('#grid')) return;
  const all = state.items.filter(i => i.collectionId === c.id);
  const q = filters.q.trim().toLowerCase();
  const list = all.filter(it =>
    (filters.category === 'Todas' || it.category === filters.category) &&
    (filters.status === 'Todas' || it.status === filters.status) &&
    (!q || searchText(c, it).includes(q)));
  $('#counter').textContent = pad(list.length) + '/' + pad(all.length);
  const empty = $('#empty');
  if (!all.length) {
    empty.className = 'empty show';
    empty.innerHTML = `<svg class="reel-icon" viewBox="0 0 64 64" width="44" height="44" fill="none"><circle cx="32" cy="32" r="26" stroke="#6e2836" stroke-width="3"/><circle cx="32" cy="32" r="7" stroke="#6e2836" stroke-width="3"/><circle cx="32" cy="14" r="4.5" stroke="#6e2836" stroke-width="3"/><circle cx="17" cy="41" r="4.5" stroke="#6e2836" stroke-width="3"/><circle cx="47" cy="41" r="4.5" stroke="#6e2836" stroke-width="3"/></svg><h3>Aún no hay piezas</h3><p>Añade la primera pieza de esta colección.</p><button data-act="newItem">Añadir pieza</button>`;
  } else if (!list.length) {
    empty.className = 'empty show';
    empty.innerHTML = '<h3>Nada por aquí</h3><p>No hay piezas con estos filtros.</p>';
  } else empty.className = 'empty';
  $('#grid').innerHTML = list.map(it => cardHtml(c, it)).join('');
}

/* ---------- paneles ---------- */
function openSheet(html) { $('#sheet').innerHTML = html; $('#overlay').classList.add('open'); }
function closeSheet() { $('#overlay').classList.remove('open'); form = null; draft = null; }
function closeLightbox() { $('#lightbox').classList.remove('open'); $('#lightbox').innerHTML = ''; }
function openLightbox(photos) {
  $('#lightbox').innerHTML = photos.map(p => `<img src="${p}" alt="">`).join('');
  $('#lightbox').classList.add('open');
}

function fieldHtml(f, val) {
  const lab = `<label>${esc(f.label)}</label>`;
  switch (f.type) {
    case 'longtext': return `<div class="field">${lab}<textarea data-fid="${f.id}">${esc(val)}</textarea></div>`;
    case 'number': return `<div class="field">${lab}<input type="text" inputmode="decimal" data-fid="${f.id}" value="${esc(val)}"></div>`;
    case 'date': return `<div class="field">${lab}<input type="date" data-fid="${f.id}" value="${esc(val)}"></div>`;
    case 'rating': {
      const n = +val || 0;
      return `<div class="field">${lab}<div class="stars" data-fid="${f.id}" data-val="${n}">${[1, 2, 3, 4, 5].map(i => `<span data-act="star" data-v="${i}" class="${i <= n ? 'on' : ''}">★</span>`).join('')}</div></div>`;
    }
    case 'yesno': return `<div class="field check"><label><input type="checkbox" data-fid="${f.id}" ${val ? 'checked' : ''}> ${esc(f.label)}</label></div>`;
    case 'select': {
      const opts = f.options || [];
      const custom = val && !opts.includes(val);
      return `<div class="field">${lab}<select data-fid="${f.id}" data-sel="1"><option value="">—</option>${opts.map(o => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}<option value="__other__" ${custom ? 'selected' : ''}>Otra (escribir)</option></select><input type="text" class="other" data-other="${f.id}" placeholder="Escribe aquí" value="${custom ? esc(val) : ''}" style="${custom ? 'display:block;' : ''}"></div>`;
    }
    default: return `<div class="field">${lab}<input type="text" data-fid="${f.id}" value="${esc(val)}"></div>`;
  }
}

function openItem(id) {
  const c = curCol();
  const it = id ? state.items.find(x => x.id === id) : null;
  form = { id: it ? it.id : null, photos: it ? [...(it.photos || [])] : [], status: it ? it.status : 'poseída', collectionDirty: false };
  const v = it ? it.values || {} : {};
  const cats = [...c.categories];
  if (it && it.category && !cats.includes(it.category)) cats.push(it.category);
  openSheet(`<h2>${it ? 'Editar pieza' : 'Nueva pieza'}</h2>
    <div class="field"><label>Fotos</label><div class="photos" id="photos"></div><input type="file" id="photoInput" accept="image/*" multiple hidden></div>
    <div class="field"><label>Categoría</label>
      <select id="f_cat"><option value="">Sin categoría</option>${cats.map(x => `<option value="${esc(x)}" ${it && it.category === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="__new__">+ Nueva categoría…</option></select>
      <input type="text" class="newinput" id="f_cat_new" placeholder="Nombre de la categoría">
    </div>
    ${c.fields.map(f => fieldHtml(f, v[f.id])).join('')}
    <div class="field"><label>Añadir a:</label>
      <div class="segrow" id="statusRow">
        <button data-act="setStatus" data-v="poseída" class="${form.status === 'poseída' ? 'on' : ''}">Mi colección</button>
        <button data-act="setStatus" data-v="deseada" class="${form.status === 'deseada' ? 'on' : ''}">Favoritos</button>
      </div></div>
    <div class="sheetactions">
      <button class="btn" data-act="closeSheet">Cancelar</button>
      ${it ? '<button class="btn danger" data-act="delItem">Eliminar</button>' : ''}
      <button class="btn primary" data-act="saveItem">Guardar</button>
    </div>`);
  renderPhotos();
}

function readItemValues(c) {
  const values = {};
  c.fields.forEach(f => {
    const el = document.querySelector(`#sheet [data-fid="${f.id}"]`);
    if (!el) return;
    if (f.type === 'rating') values[f.id] = +el.dataset.val || 0;
    else if (f.type === 'yesno') values[f.id] = el.checked;
    else if (f.type === 'select') {
      let v = el.value;
      if (v === '__other__') {
        v = document.querySelector(`#sheet [data-other="${f.id}"]`).value.trim();
        if (v && !(f.options || []).includes(v)) { (f.options = f.options || []).push(v); form.collectionDirty = true; }
      }
      values[f.id] = v;
    } else values[f.id] = el.value.trim();
  });
  return values;
}

function saveItem() {
  const c = curCol();
  const values = readItemValues(c);
  let category = $('#f_cat').value;
  if (category === '__new__') {
    category = $('#f_cat_new').value.trim();
    if (category && !c.categories.includes(category)) { c.categories.push(category); form.collectionDirty = true; }
  }
  const hasData = Object.values(values).some(v => v && v !== 0) || form.photos.length;
  if (!hasData) { closeSheet(); return; }
  const now = Date.now();
  let it = form.id ? state.items.find(x => x.id === form.id) : null;
  if (it) Object.assign(it, { category, status: form.status, photos: form.photos, values, updatedAt: now });
  else {
    it = { id: uid(), collectionId: c.id, category, status: form.status, photos: form.photos, values, createdAt: now, updatedAt: now };
    state.items.push(it);
  }
  const dirty = form.collectionDirty;
  closeSheet();
  if (filters.status !== 'Todas' && filters.status !== it.status) filters.status = it.status;
  if (filters.category !== 'Todas' && filters.category !== it.category) filters.category = 'Todas';
  if (dirty) dbSet('collections', c);
  dbSet('items', it);
  renderDials();
  renderGrid();
}

function delItem() {
  const c = curCol();
  const it = state.items.find(x => x.id === form.id);
  if (!it) return;
  const t = cardInfo(c, it);
  const titulo = [t.eyebrow, t.title].filter(Boolean).join(' ') || 'esta pieza';
  if (!confirm(`¿Seguro que quieres eliminar "${titulo}"?`)) return;
  state.items = state.items.filter(x => x.id !== it.id);
  closeSheet();
  dbDel('items', it.id);
  renderGrid();
}

function openNewCol() {
  openSheet(`<h2>Nueva colección</h2>
    <div class="field"><label>Nombre (opcional)</label><input type="text" id="n_name" placeholder="Si lo dejas vacío usamos el de la plantilla" style="display:block;"></div>
    <p class="hint">Elige una plantilla o empieza desde cero. Después puedes cambiar campos y categorías.</p>
    <div class="tpls">${Object.entries(TEMPLATES).map(([k, t]) => `<button class="tpl" data-act="pickTpl" data-k="${k}"><span>${t.icon}</span>${esc(t.name)}</button>`).join('')}</div>
    <div class="sheetactions"><button class="btn" data-act="closeSheet">Cancelar</button></div>`);
}

function pickTpl(k) {
  const name = $('#n_name').value.trim();
  const c = makeCollection(k, name || null, state.collections.length);
  state.collections.push(c);
  closeSheet();
  dbSet('collections', c);
  openCol(c.id);
  if (k === 'personalizada') openEditCol();
}

function openCol(id) {
  view = { name: 'col', id };
  filters = { category: 'Todas', status: 'poseída', q: '' };
  history.pushState({ col: true }, '');
  render();
}

function goHome() {
  view = { name: 'home', id: null };
  if (history.state && history.state.col) history.back();
  render();
}

/* ---------- editar colección ---------- */
function openEditCol() {
  const c = curCol();
  draft = {
    name: c.name, icon: c.icon,
    cats: c.categories.map(n => ({ orig: n, name: n })),
    fields: clone(c.fields),
    cardTitle: c.cardTitle || '', cardEyebrow: c.cardEyebrow || ''
  };
  renderEditCol();
}

function syncDraft() {
  if (!draft) return;
  const n = $('#c_name'); if (n) draft.name = n.value;
  document.querySelectorAll('[data-cat]').forEach(el => { draft.cats[+el.dataset.cat].name = el.value; });
  document.querySelectorAll('[data-flabel]').forEach(el => { draft.fields[+el.dataset.flabel].label = el.value; });
  document.querySelectorAll('[data-fopts]').forEach(el => {
    draft.fields[+el.dataset.fopts].options = el.value.split(',').map(s => s.trim()).filter(Boolean);
  });
  const t = $('#c_title'); if (t) draft.cardTitle = t.value;
  const e = $('#c_eyebrow'); if (e) draft.cardEyebrow = e.value;
}

function renderEditCol() {
  const textual = draft.fields.filter(f => ['text', 'select', 'number'].includes(f.type));
  const optsFor = sel => textual.map(f => `<option value="${f.id}" ${sel === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('');
  const top = $('#sheet').scrollTop;
  openSheet(`<h2>Editar colección</h2>
    <div class="field"><label>Nombre</label><input type="text" id="c_name" value="${esc(draft.name)}" style="display:block;"></div>
    <div class="field"><label>Icono</label><div class="icons">${ICONS.map(i => `<button data-act="pickIcon" data-v="${i}" class="${i === draft.icon ? 'on' : ''}">${i}</button>`).join('')}</div></div>
    <div class="field"><label>Categorías</label>
      ${draft.cats.map((r, i) => `<div class="rowedit"><input type="text" data-cat="${i}" value="${esc(r.name)}"><button data-act="catUp" data-i="${i}">↑</button><button data-act="catDown" data-i="${i}">↓</button><button data-act="catDel" data-i="${i}">✕</button></div>`).join('')}
      <div class="rowedit"><input type="text" id="newCat" placeholder="Nueva categoría"><button data-act="catAdd">+</button></div>
    </div>
    <div class="field"><label>Campos</label>
      ${draft.fields.map((f, i) => `<div class="fieldedit"><div class="rowedit"><input type="text" data-flabel="${i}" value="${esc(f.label)}"><button data-act="fieldUp" data-i="${i}">↑</button><button data-act="fieldDown" data-i="${i}">↓</button><button data-act="fieldDel" data-i="${i}">✕</button></div>
        <div class="rowedit"><span class="typetag">${FIELD_TYPES[f.type] || f.type}</span>${f.type === 'select' ? `<input type="text" data-fopts="${i}" placeholder="Opciones separadas por comas" value="${esc((f.options || []).join(', '))}">` : ''}</div></div>`).join('')}
      <div class="rowedit"><input type="text" id="newFieldLabel" placeholder="Nuevo campo"><select id="newFieldType">${Object.entries(FIELD_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button data-act="fieldAdd">+</button></div>
    </div>
    <div class="field"><label>Título de la tarjeta</label><select id="c_title">${optsFor(draft.cardTitle)}</select></div>
    <div class="field"><label>Texto sobre el título</label><select id="c_eyebrow"><option value="">Ninguno</option>${optsFor(draft.cardEyebrow)}</select></div>
    <div class="sheetactions">
      <button class="btn" data-act="closeSheet">Cancelar</button>
      <button class="btn danger" data-act="delCol">Eliminar</button>
      <button class="btn primary" data-act="saveCol">Guardar</button>
    </div>`);
  $('#sheet').scrollTop = top;
}

function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function saveCol() {
  syncDraft();
  const c = curCol();
  const rename = {};
  draft.cats.forEach(r => { if (r.orig && r.orig !== r.name.trim()) rename[r.orig] = r.name.trim(); });
  const keep = new Set(draft.cats.filter(r => r.orig).map(r => r.orig));
  const removed = c.categories.filter(o => !keep.has(o));
  const newCats = [];
  draft.cats.forEach(r => { const n = r.name.trim(); if (n && !newCats.includes(n)) newCats.push(n); });
  const fieldIds = new Set(draft.fields.map(f => f.id));
  const changed = [];
  state.items.filter(i => i.collectionId === c.id).forEach(it => {
    let ch = false;
    if (it.category) {
      if (it.category in rename) { it.category = rename[it.category]; ch = true; }
      else if (removed.includes(it.category)) { it.category = ''; ch = true; }
    }
    Object.keys(it.values || {}).forEach(k => { if (!fieldIds.has(k)) { delete it.values[k]; ch = true; } });
    if (ch) changed.push(it);
  });
  c.name = draft.name.trim() || c.name;
  c.icon = draft.icon;
  c.categories = newCats;
  c.fields = draft.fields.filter(f => f.label.trim()).map(f => ({ ...f, label: f.label.trim() }));
  const ok = id => c.fields.some(f => f.id === id);
  c.cardTitle = ok(draft.cardTitle) ? draft.cardTitle : (c.fields[0] ? c.fields[0].id : '');
  c.cardEyebrow = ok(draft.cardEyebrow) && draft.cardEyebrow !== c.cardTitle ? draft.cardEyebrow : '';
  filters.category = 'Todas';
  closeSheet();
  dbSet('collections', c);
  changed.forEach(i => dbSet('items', i));
  render();
}

function delCol() {
  const c = curCol();
  if (!confirm(`¿Seguro que quieres eliminar la colección "${c.name}" y todas sus piezas?`)) return;
  const its = state.items.filter(i => i.collectionId === c.id);
  state.items = state.items.filter(i => i.collectionId !== c.id);
  state.collections = state.collections.filter(x => x.id !== c.id);
  closeSheet();
  its.forEach(i => dbDel('items', i.id));
  dbDel('collections', c.id);
  goHome();
}

/* ---------- eventos ---------- */
const A = {
  home: () => goHome(),
  openCol: el => openCol(el.dataset.id),
  newCol: () => openNewCol(),
  pickTpl: el => pickTpl(el.dataset.k),
  editCol: () => openEditCol(),
  saveCol: () => saveCol(),
  delCol: () => delCol(),
  newItem: () => openItem(null),
  openItem: el => openItem(el.dataset.id),
  saveItem: () => saveItem(),
  delItem: () => delItem(),
  closeSheet: () => closeSheet(),
  thumb: el => {
    const it = state.items.find(x => x.id === el.dataset.id);
    if (it && it.photos && it.photos.length) openLightbox(it.photos); else openItem(el.dataset.id);
  },
  cat: el => { filters.category = el.dataset.v; renderDials(); renderGrid(); },
  stat: el => { filters.status = el.dataset.v; renderDials(); renderGrid(); },
  clearSearch: () => {
    filters.q = '';
    const s = $('#search'); s.value = ''; s.focus();
    $('#clearSearch').style.display = 'none';
    renderGrid();
  },
  login: () => login(),
  logout: () => { if (fb) fb.signOut(auth); },
  addPhoto: () => $('#photoInput').click(),
  rmPhoto: el => { form.photos.splice(+el.dataset.i, 1); renderPhotos(); },
  setStatus: el => {
    form.status = el.dataset.v;
    document.querySelectorAll('#statusRow button').forEach(b => b.classList.toggle('on', b.dataset.v === form.status));
  },
  star: el => {
    const st = el.closest('.stars');
    let n = +el.dataset.v;
    if (+st.dataset.val === n) n = 0;
    st.dataset.val = n;
    st.querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v <= n));
  },
  pickIcon: el => { syncDraft(); draft.icon = el.dataset.v; renderEditCol(); },
  catAdd: () => {
    syncDraft();
    const v = $('#newCat').value.trim();
    if (v) draft.cats.push({ orig: null, name: v });
    renderEditCol();
  },
  catUp: el => { syncDraft(); move(draft.cats, +el.dataset.i, -1); renderEditCol(); },
  catDown: el => { syncDraft(); move(draft.cats, +el.dataset.i, 1); renderEditCol(); },
  catDel: el => { syncDraft(); draft.cats.splice(+el.dataset.i, 1); renderEditCol(); },
  fieldAdd: () => {
    syncDraft();
    const label = $('#newFieldLabel').value.trim();
    const type = $('#newFieldType').value;
    if (label) {
      const f = { id: 'f' + uid(), label, type };
      if (type === 'select') f.options = [];
      draft.fields.push(f);
    }
    renderEditCol();
  },
  fieldUp: el => { syncDraft(); move(draft.fields, +el.dataset.i, -1); renderEditCol(); },
  fieldDown: el => { syncDraft(); move(draft.fields, +el.dataset.i, 1); renderEditCol(); },
  fieldDel: el => {
    syncDraft();
    const f = draft.fields[+el.dataset.i];
    if (!confirm(`¿Quitar el campo "${f.label}"? Se perderán sus datos en todas las piezas al guardar.`)) return;
    draft.fields.splice(+el.dataset.i, 1);
    if (draft.cardTitle === f.id) draft.cardTitle = draft.fields[0] ? draft.fields[0].id : '';
    if (draft.cardEyebrow === f.id) draft.cardEyebrow = '';
    renderEditCol();
  }
};

document.addEventListener('click', e => {
  if (e.target.id === 'overlay') { closeSheet(); return; }
  if (e.target.closest('#lightbox')) { closeLightbox(); return; }
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) A[el.dataset.act](el, e);
});

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'photoInput') { await addFiles(Array.from(t.files)); t.value = ''; return; }
  if (t.matches && t.matches('select[data-sel]')) {
    const o = document.querySelector(`[data-other="${t.dataset.fid}"]`);
    o.style.display = t.value === '__other__' ? 'block' : 'none';
    if (t.value === '__other__') o.focus();
  }
  if (t.id === 'f_cat') {
    const n = $('#f_cat_new');
    n.style.display = t.value === '__new__' ? 'block' : 'none';
    if (t.value === '__new__') n.focus();
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'search') {
    filters.q = e.target.value;
    $('#clearSearch').style.display = e.target.value ? 'flex' : 'none';
    renderGrid();
  }
});

window.addEventListener('popstate', () => {
  const restore = () => { if (view.name === 'col') history.pushState({ col: true }, ''); };
  if ($('#lightbox').classList.contains('open')) { closeLightbox(); restore(); return; }
  if ($('#overlay').classList.contains('open')) { closeSheet(); restore(); return; }
  if (view.name === 'col') { view = { name: 'home', id: null }; render(); }
});

/* ---------- arranque ---------- */
state = loadLocal();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
initFirebase();
setTimeout(() => { if (!ready) { ready = true; render(); } }, 8000);
