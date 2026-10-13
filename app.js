import { TEMPLATES, FIELD_TYPES, FIELD_HELP, EXTRAS } from './templates.js';
import { firebaseConfig } from './firebase-config.js';

const CLOUD = !!(firebaseConfig && (firebaseConfig.publicApiKey || firebaseConfig.apiKey));
const DB_ID = (firebaseConfig && firebaseConfig.databaseId) || '(default)';
const LS_KEY = 'bobina-v2';
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 850000;

const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const clone = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(3, '0');

let state = { collections: [], items: [] };
let user = null, fb = null, db = null, auth = null;
let ready = !CLOUD;
let view = { name: 'home', id: null };
let filters = { category: 'Todas', q: '' };
let form = null;
let draft = null;
let cdraft = null;
let selTpl = null;
let autoOpened = false;

const curCol = () => state.collections.find(c => c.id === view.id);

/* ---------- iconos vectoriales ---------- */
const svg = (p, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  settings: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-3.6 3.9-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>', 20),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 22),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 14),
  up: svg('<path d="M6 14l6-6 6 6"/>', 16),
  down: svg('<path d="M6 10l6 6 6-6"/>', 16),
  pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 16),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 13)
};
const ICON_PATHS = {
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  fan: '<path d="M12 20L4 9a10 10 0 0 1 16 0z"/><path d="M12 20V6.5M12 20L7.5 7.3M12 20l4.5-12.7"/>',
  coin: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
  stamp: '<path d="M5 5h14v14H5z"/><rect x="8.5" y="8.5" width="7" height="7"/>',
  book: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v15H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 1 6.5 19H19"/>',
  vinyl: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 7a5 5 0 0 1 5 5"/>',
  spark: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>'
};
const ICON_MAP = { '📷': 'camera', '🌸': 'fan', '🪙': 'coin', '✉️': 'stamp', '📚': 'book', '💿': 'vinyl', '✨': 'spark' };
const cicon = (c, s = 20) => {
  const k = ICON_PATHS[c.icon] ? c.icon : (ICON_MAP[c.icon] || 'spark');
  return `<svg class="cicon" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[k]}</svg>`;
};
const logo = (s, stroke = '#b4c3dc') => `<svg class="reel-icon" viewBox="0 0 64 64" width="${s}" height="${s}" fill="none" stroke="${stroke}" stroke-width="2.4" aria-hidden="true"><rect x="8" y="8" width="24" height="48" rx="5"/><rect x="36" y="8" width="20" height="22" rx="5"/><rect x="36" y="34" width="20" height="22" rx="5"/></svg>`;

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ---------- textos de ayuda (los largos van en una ventana con la "i") ---------- */
const INFO = {
  fields: {
    t: 'Datos de cada pieza',
    h: `<p>Cada pieza tiene siempre un <b>nombre</b> (obligatorio, no se puede quitar). Además puedes guardar los datos que quieras:</p>
      <p><b>Extras:</b> toca uno de los sugeridos (Notas, Valoración, Material…) y se añade al momento. Si lo quitas, vuelve a aparecer ahí por si lo quieres de nuevo.</p>
      <p><b>Campo propio:</b> escribe el nombre, elige el tipo y pulsa el botón <b>+</b>. Hasta que no lo pulses no se añade.</p>
      <p><b>Tipos:</b> Texto (una línea), Texto largo (notas), Número, Fecha, Valoración (estrellas, su nombre no se cambia), Lista (opciones separadas por comas) y Sí/No (casilla).</p>
      <p>Con las flechas cambias el orden y con la X quitas el campo. Al quitar uno se borran sus datos de todas las piezas cuando guardes.</p>`
  },
  cats: {
    t: 'Categorías',
    h: `<p>Las categorías sirven para agrupar y filtrar tus piezas. Cada pieza puede tener una (o ninguna).</p>
      <p><b>Todas</b> siempre está y no se puede editar. Las demás puedes renombrarlas, reordenarlas, borrarlas o crear nuevas.</p>
      <p>Para añadir una, escribe el nombre (es obligatorio) y pulsa el botón <b>+</b>.</p>
      <p>Si renombras una categoría, las piezas que la tenían se actualizan solas. Si la borras, esas piezas se quedan sin categoría.</p>`
  }
};

function showInfo(k) {
  const d = INFO[k];
  if (!d) return;
  const m = document.createElement('div');
  m.className = 'modalbg';
  m.innerHTML = `<div class="modal"><h3>${esc(d.t)}</h3>${d.h}<button class="btn primary" data-act="closeInfo">Entendido</button></div>`;
  document.body.appendChild(m);
}
const closeInfo = () => document.querySelectorAll('.modalbg').forEach(m => m.remove());

/* ---------- datos ---------- */
function makeCollection(key, name, order) {
  const t = TEMPLATES[key];
  return {
    id: uid(), name: name || t.name, icon: t.icon, nameLabel: t.nameLabel,
    categories: [...t.categories], fields: clone(t.fields), subtitle: t.subtitle,
    order, createdAt: Date.now()
  };
}

// Convierte colecciones y piezas del formato anterior (título como campo) al nuevo (nombre fijo + subtítulo)
function normalizeState(st) {
  const ch = { c: [], i: [] };
  for (const c of st.collections) {
    if (c.nameLabel !== undefined) continue;
    const tf = (c.fields || []).find(f => f.id === c.cardTitle);
    c.nameLabel = tf ? tf.label : 'Nombre';
    if (tf) c.fields = c.fields.filter(f => f.id !== tf.id);
    c.subtitle = c.fields.some(f => f.id === c.cardEyebrow) ? c.cardEyebrow : '';
    delete c.cardTitle; delete c.cardEyebrow;
    ch.c.push(c);
    for (const it of st.items.filter(i => i.collectionId === c.id)) {
      if (it.name !== undefined) continue;
      it.values = it.values || {};
      let n = tf ? it.values[tf.id] : '';
      if (!n && c.subtitle) n = it.values[c.subtitle];
      it.name = String(n || '').trim();
      if (tf) delete it.values[tf.id];
      ch.i.push(it);
    }
  }
  return ch;
}

function loadLocal() {
  let s = null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const p = JSON.parse(raw); s = { collections: p.collections || [], items: p.items || [] }; }
  } catch (e) { /* ignorar */ }
  if (!s) s = migrateOld();
  const ch = normalizeState(s);
  if (ch.c.length || ch.i.length) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { /* ignorar */ } }
  return s;
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
    const marca = c.fields.find(f => f.id === 'marca');
    const items = old.map(o => {
      if (o.format && !c.categories.includes(o.format)) c.categories.push(o.format);
      if (o.brand && !marca.options.includes(o.brand)) marca.options.push(o.brand);
      return {
        id: o.id || uid(), collectionId: c.id, name: o.model || '', category: o.format || '',
        status: 'poseída', photos: o.photo ? [o.photo] : [],
        values: { marca: o.brand || '', anio: o.year || '', condicion: o.rating || 0, notas: o.notes || '' },
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
    maybeAutoOpen();
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
    if (u) {
      await loadCloud();
      const ch = normalizeState(state);
      ch.c.forEach(c => dbSet('collections', c));
      ch.i.forEach(i => dbSet('items', i));
      await maybeUploadLocal();
    } else state = loadLocal();
  } catch (e) {
    console.error(e);
    toast('No se pudieron cargar tus datos');
  }
  ready = true;
  maybeAutoOpen();
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

// Con una sola colección, la app se abre directamente en ella
function maybeAutoOpen() {
  if (autoOpened || !ready) return;
  autoOpened = true;
  if (state.collections.length === 1) {
    view = { name: 'col', id: state.collections[0].id };
    filters = { category: 'Todas', q: '' };
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
  box.innerHTML = form.photos.map((p, i) => `<div class="ph"><img src="${p}" alt=""><button data-act="rmPhoto" data-i="${i}">${IC.x}</button></div>`).join('')
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

const subtitleOf = (c, it) => {
  const f = c.fields.find(x => x.id === c.subtitle);
  return f ? fmtVal(f, (it.values || {})[f.id]) : '';
};

function searchText(c, it) {
  const vals = Object.values(it.values || {}).filter(x => typeof x === 'string' || typeof x === 'number');
  return [it.name || '', ...vals, it.category || ''].join(' ').toLowerCase();
}

function cardHtml(c, it) {
  const sub = subtitleOf(c, it);
  const cover = (it.photos || [])[0];
  return `<div class="card">
    <div class="thumb" data-act="thumb" data-id="${it.id}">${cover ? `<img src="${cover}" alt="">` : logo(30)}</div>
    <div class="cardbody" data-act="openItem" data-id="${it.id}">
      <p class="model">${esc(it.name || 'Sin nombre')}</p>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div></div>`;
}

/* ---------- pantallas ---------- */
function accountBtn() {
  if (!CLOUD || !ready) return '';
  return `<button class="iconbtn${user ? ' on' : ''}" data-act="account" aria-label="${user ? 'Tu cuenta' : 'Iniciar sesión'}">${IC.user}</button>`;
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
      <div class="brandrow"><h1 class="brand">Mis colecciones</h1>
        <div class="brandright"><span class="counter">${cols.length} ${cols.length === 1 ? 'colección' : 'colecciones'}</span>${accountBtn()}</div>
      </div>
    </div>
    <div class="content">
      ${cols.length ? '' : '<p class="hint center">Crea tu primera colección con una plantilla o desde cero.</p>'}
      <div class="colgrid">
        ${cols.map(c => {
          const n = state.items.filter(i => i.collectionId === c.id).length;
          return `<button class="colcard" data-act="openCol" data-id="${c.id}"><span class="nmrow"><span class="nm">${esc(c.name)}</span>${cicon(c, 20)}</span><span class="ct">${n} ${n === 1 ? 'pieza' : 'piezas'}</span></button>`;
        }).join('')}
        <button class="colcard newcol" data-act="newCol">+ Nueva colección</button>
      </div>
    </div></div>`;
}

function renderCollection() {
  const c = curCol();
  $('#app').innerHTML = `<div class="page">
    <div class="topbar">
      <div class="brandrow">
        <div class="brandleft"><button class="iconbtn" data-act="home" aria-label="Volver">${IC.back}</button><h1><span class="t">${esc(c.name)}</span>${cicon(c, 20)}</h1></div>
        <div class="brandright"><span class="counter" id="counter">000/000</span><button class="iconbtn" data-act="editCol" aria-label="Ajustes de la colección">${IC.settings}</button></div>
      </div>
      <div class="searchwrap" style="margin-top:10px;">
        <input class="search" id="search" placeholder="Buscar…" value="${esc(filters.q)}">
        <button class="clearsearch" id="clearSearch" data-act="clearSearch" style="${filters.q ? 'display:flex;' : ''}" aria-label="Borrar búsqueda">${IC.x}</button>
      </div>
      <div class="dial" id="catDial"></div>
    </div>
    <div class="content"><div class="empty" id="empty"></div><div class="grid" id="grid"></div></div>
  </div>
  <div class="fab"><button data-act="newItem" aria-label="Añadir pieza">${IC.plus}</button></div>`;
  renderDials();
  renderGrid();
}

function renderDials() {
  const c = curCol();
  if (!c || !$('#catDial')) return;
  $('#catDial').innerHTML = ['Todas', ...c.categories].map(x => `<button data-act="cat" data-v="${esc(x)}" class="${x === filters.category ? 'active' : ''}">${esc(x)}</button>`).join('')
    + `<button class="editcats" data-act="editCats" aria-label="Editar categorías">${IC.pencil}</button>`;
}

function renderGrid() {
  const c = curCol();
  if (!c || !$('#grid')) return;
  const all = state.items.filter(i => i.collectionId === c.id);
  const q = filters.q.trim().toLowerCase();
  const list = all.filter(it =>
    (filters.category === 'Todas' || it.category === filters.category) &&
    (!q || searchText(c, it).includes(q)));
  $('#counter').textContent = pad(list.length) + '/' + pad(all.length);
  const empty = $('#empty');
  if (!all.length) {
    empty.className = 'empty show';
    empty.innerHTML = `${logo(46, '#4a7fc1')}<h3>Aún no hay piezas</h3><p>Añade la primera pieza de esta colección.</p><button data-act="newItem">Añadir pieza</button>`;
  } else if (!list.length) {
    empty.className = 'empty show';
    empty.innerHTML = '<h3>Nada por aquí</h3><p>No hay piezas con estos filtros.</p>';
  } else empty.className = 'empty';
  $('#grid').innerHTML = list.map(it => cardHtml(c, it)).join('');
}

/* ---------- paneles ---------- */
function openSheet(html) { $('#sheet').innerHTML = html; $('#overlay').classList.add('open'); }
function closeSheet() { $('#overlay').classList.remove('open'); form = null; draft = null; cdraft = null; selTpl = null; }
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
      return `<div class="field">${lab}<div class="stars" data-fid="${f.id}" data-val="${n}">${[1, 2, 3, 4, 5].map(i => `<span data-act="star" data-v="${i}" class="${i <= n ? 'on' : ''}">${starSvg(26)}</span>`).join('')}</div></div>`;
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
const starSvg = s => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><polygon points="12,2.5 14.9,8.9 21.8,9.6 16.6,14.2 18.1,21 12,17.5 5.9,21 7.4,14.2 2.2,9.6 9.1,8.9"/></svg>`;

/* ----- nueva / editar pieza ----- */
function openItem(id) {
  const c = curCol();
  const it = id ? state.items.find(x => x.id === id) : null;
  form = { id: it ? it.id : null, photos: it ? [...(it.photos || [])] : [], collectionDirty: false };
  const v = it ? it.values || {} : {};
  const cats = [...c.categories];
  if (it && it.category && !cats.includes(it.category)) cats.push(it.category);
  openSheet(`<h2>${it ? 'Editar pieza' : 'Nueva pieza'}</h2>
    <div class="field"><label>Fotos</label><div class="photos" id="photos"></div><input type="file" id="photoInput" accept="image/*" multiple hidden></div>
    <div class="field"><label>${esc(c.nameLabel || 'Nombre')} <span class="req">obligatorio</span></label><input type="text" id="f_name" value="${esc(it ? it.name : '')}"></div>
    <div class="field"><label>Categoría</label>
      <select id="f_cat"><option value="">Sin categoría</option>${cats.map(x => `<option value="${esc(x)}" ${it && it.category === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="__new__">+ Nueva categoría…</option></select>
      <input type="text" class="newinput" id="f_cat_new" placeholder="Nombre de la categoría (obligatorio)">
    </div>
    ${c.fields.map(f => fieldHtml(f, v[f.id])).join('')}
    <div class="sheetactions">
      <button class="btn ghost" data-act="closeSheet">Cancelar</button>
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
  const name = $('#f_name').value.trim();
  if (!name) { toast('El nombre es obligatorio'); $('#f_name').focus(); return; }
  let category = $('#f_cat').value;
  if (category === '__new__') {
    category = $('#f_cat_new').value.trim();
    if (!category) { toast('Escribe el nombre de la nueva categoría'); $('#f_cat_new').focus(); return; }
    if (category.toLowerCase() === 'todas') { toast('«Todas» ya existe, elige otro nombre'); return; }
    if (!c.categories.includes(category)) { c.categories.push(category); form.collectionDirty = true; }
  }
  const values = readItemValues(c);
  const now = Date.now();
  let it = form.id ? state.items.find(x => x.id === form.id) : null;
  if (it) Object.assign(it, { name, category, status: 'poseída', photos: form.photos, values, updatedAt: now });
  else {
    it = { id: uid(), collectionId: c.id, name, category, status: 'poseída', photos: form.photos, values, createdAt: now, updatedAt: now };
    state.items.push(it);
  }
  const dirty = form.collectionDirty;
  closeSheet();
  if (filters.category !== 'Todas' && filters.category !== it.category) filters.category = 'Todas';
  if (dirty) dbSet('collections', c);
  dbSet('items', it);
  renderDials();
  renderGrid();
}

function delItem() {
  const it = state.items.find(x => x.id === form.id);
  if (!it) return;
  if (!confirm(`¿Seguro que quieres eliminar "${it.name || 'esta pieza'}"?`)) return;
  state.items = state.items.filter(x => x.id !== it.id);
  closeSheet();
  dbDel('items', it.id);
  renderGrid();
}

/* ----- nueva colección ----- */
function openNewCol() {
  selTpl = null;
  openSheet(`<h2>Nueva colección</h2>
    <p class="hint">1. Elige una plantilla o empieza desde cero. Después podrás cambiar sus categorías y datos.</p>
    <div class="tpls">${Object.entries(TEMPLATES).map(([k, t]) => `<button class="tpl" data-act="pickTpl" data-k="${k}">${esc(t.name)}</button>`).join('')}</div>
    <div class="field"><label>2. Nombre de la colección</label><input type="text" id="n_name" placeholder="Elige una plantilla…"></div>
    <div class="sheetactions rowfix">
      <button class="btn primary" data-act="createCol">Crear colección</button>
      <button class="btn ghost" data-act="closeSheet">Cancelar</button>
    </div>`);
}

function pickTpl(k) {
  selTpl = k;
  document.querySelectorAll('.tpl').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const n = $('#n_name');
  n.placeholder = k === 'personalizada' ? 'Ponle un nombre a tu colección' : TEMPLATES[k].name;
}

function createCol() {
  if (!selTpl) { toast('Elige una plantilla para empezar'); return; }
  const name = $('#n_name').value.trim();
  if (selTpl === 'personalizada' && !name) { toast('Ponle un nombre a tu colección'); $('#n_name').focus(); return; }
  const c = makeCollection(selTpl, name || null, state.collections.length);
  state.collections.push(c);
  closeSheet();
  dbSet('collections', c);
  openCol(c.id);
}

function openCol(id) {
  view = { name: 'col', id };
  filters = { category: 'Todas', q: '' };
  history.pushState({ col: true }, '');
  render();
}

function goHome() {
  view = { name: 'home', id: null };
  if (history.state && history.state.col) history.back();
  render();
}

/* ----- ajustes de la colección (nombre, datos de cada pieza, subtítulo) ----- */
function openEditCol() {
  const c = curCol();
  draft = { name: c.name, fields: clone(c.fields), subtitle: c.subtitle || '', newFieldLabel: '', newFieldType: 'text' };
  renderEditCol();
}

function syncDraft() {
  if (!draft) return;
  const n = $('#c_name'); if (n) draft.name = n.value;
  document.querySelectorAll('[data-flabel]').forEach(el => { draft.fields[+el.dataset.flabel].label = el.value; });
  document.querySelectorAll('[data-fopts]').forEach(el => {
    draft.fields[+el.dataset.fopts].options = el.value.split(',').map(s => s.trim()).filter(Boolean);
  });
  const s = $('#c_sub'); if (s) draft.subtitle = s.value;
  const nl = $('#newFieldLabel'); if (nl) draft.newFieldLabel = nl.value;
  const nt = $('#newFieldType'); if (nt) draft.newFieldType = nt.value;
}

function fieldRowHtml(f, i) {
  const locked = f.type === 'rating';
  return `<div class="fieldedit">
    <div class="rowedit">${locked
      ? `<span class="lockname">${IC.lock}${esc(f.label)}</span>`
      : `<input type="text" data-flabel="${i}" value="${esc(f.label)}" placeholder="Nombre del campo">`}
      <button data-act="fieldUp" data-i="${i}" aria-label="Subir">${IC.up}</button><button data-act="fieldDown" data-i="${i}" aria-label="Bajar">${IC.down}</button><button data-act="fieldDel" data-i="${i}" aria-label="Quitar">${IC.x}</button></div>
    <div class="rowedit meta"><span class="typetag">${FIELD_TYPES[f.type] || f.type}</span>${f.type === 'select' ? `<input type="text" data-fopts="${i}" placeholder="Madera, Tela, Papel…" value="${esc((f.options || []).join(', '))}">` : ''}</div>
    <p class="help">${f.type === 'select' ? 'Escribe el nombre de cada opción separado por comas. Así las tendrás en la lista al añadir o editar una pieza.' : esc(FIELD_HELP[f.type] || '')}</p>
  </div>`;
}

function renderEditCol() {
  const c = curCol();
  const subOpts = draft.fields.filter(f => ['text', 'select', 'number', 'date'].includes(f.type));
  const used = new Set(draft.fields.map(f => f.id));
  const extras = EXTRAS.filter(e => !used.has(e.id));
  const top = $('#sheet').scrollTop;
  openSheet(`<h2>Ajustes de la colección</h2>
    <div class="sect">
      <h3>Nombre de la colección</h3>
      <div class="field"><input type="text" id="c_name" value="${esc(draft.name)}"></div>
    </div>
    <div class="sect">
      <div class="secthead"><h3>Datos de cada pieza</h3><button class="infobtn" data-act="info" data-k="fields" aria-label="Más información">i</button></div>
      <p class="hint">Lo que guardas de cada pieza. El nombre es obligatorio y siempre está; lo demás lo decides tú.</p>
      <div class="lockedrow"><span>${IC.lock}${esc(c.nameLabel || 'Nombre')}</span><span class="tag">Obligatorio</span></div>
      ${draft.fields.map(fieldRowHtml).join('')}
      <p class="subhead">Extras que puedes añadir</p>
      <div class="chips">${extras.length ? extras.map(e => `<button class="chip" data-act="addExtra" data-id="${e.id}">+ ${esc(e.label)}</button>`).join('') : '<span class="hint">Ya tienes todos los extras.</span>'}</div>
      <p class="subhead">O crea un campo propio</p>
      <p class="hint">Escribe el nombre, elige el tipo y pulsa el botón <b>+</b> para añadirlo.</p>
      <div class="rowedit">
        <input type="text" id="newFieldLabel" data-addinput="fieldAdd" placeholder="Nombre del campo" value="${esc(draft.newFieldLabel)}">
        <select id="newFieldType">${Object.entries(FIELD_TYPES).map(([k, l]) => `<option value="${k}" ${draft.newFieldType === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="addbtn${draft.newFieldLabel.trim() ? ' ready' : ''}" data-act="fieldAdd" aria-label="Añadir campo">${IC.plus}</button>
      </div>
    </div>
    <div class="sect">
      <h3>Subtítulo de la tarjeta</h3>
      <p class="hint">Un dato que aparece bajo el nombre en cada tarjeta. En la tarjeta solo hay nombre y subtítulo.</p>
      <select id="c_sub"><option value="">Ninguno</option>${subOpts.map(f => `<option value="${f.id}" ${draft.subtitle === f.id ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select>
    </div>
    <div class="sheetactions rowfix">
      <button class="btn primary" data-act="saveCol">Guardar</button>
      <button class="btn ghost" data-act="closeSheet">Cancelar</button>
      <button class="btn text" data-act="delCol">Eliminar colección</button>
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
  if (draft.newFieldLabel.trim()) { toast(`Falta pulsar + para añadir «${draft.newFieldLabel.trim()}»`); return; }
  if (!draft.name.trim()) { toast('La colección necesita un nombre'); return; }
  if (draft.fields.some(f => !f.label.trim())) { toast('Todos los campos necesitan un nombre'); return; }
  const ids = new Set(draft.fields.map(f => f.id));
  const changed = [];
  state.items.filter(i => i.collectionId === c.id).forEach(it => {
    let ch = false;
    Object.keys(it.values || {}).forEach(k => { if (!ids.has(k)) { delete it.values[k]; ch = true; } });
    if (ch) changed.push(it);
  });
  c.name = draft.name.trim();
  c.fields = draft.fields.map(f => ({ ...f, label: f.label.trim() }));
  c.subtitle = ids.has(draft.subtitle) ? draft.subtitle : '';
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

/* ----- categorías (lápiz al final de la fila) ----- */
function openEditCats() {
  const c = curCol();
  cdraft = { rows: c.categories.map(n => ({ orig: n, name: n })), newCat: '' };
  renderEditCats();
}

function syncCats() {
  if (!cdraft) return;
  document.querySelectorAll('[data-cat]').forEach(el => { cdraft.rows[+el.dataset.cat].name = el.value; });
  const n = $('#newCat'); if (n) cdraft.newCat = n.value;
}

function renderEditCats() {
  const top = $('#sheet').scrollTop;
  openSheet(`<div class="secthead"><h2>Categorías</h2><button class="infobtn" data-act="info" data-k="cats" aria-label="Más información">i</button></div>
    <p class="hint">Sirven para agrupar y filtrar tus piezas. Puedes cambiar el nombre de todas, reordenarlas o borrarlas.</p>
    <div class="lockedrow"><span>${IC.lock}Todas</span><span class="tag">Siempre está</span></div>
    ${cdraft.rows.map((r, i) => `<div class="rowedit"><input type="text" data-cat="${i}" value="${esc(r.name)}" placeholder="Nombre de la categoría"><button data-act="catUp" data-i="${i}" aria-label="Subir">${IC.up}</button><button data-act="catDown" data-i="${i}" aria-label="Bajar">${IC.down}</button><button data-act="catDel" data-i="${i}" aria-label="Borrar">${IC.x}</button></div>`).join('')}
    <p class="subhead">Añadir una categoría</p>
    <p class="hint">Escribe el nombre (es obligatorio) y pulsa el botón <b>+</b> para añadirla.</p>
    <div class="rowedit">
      <input type="text" id="newCat" data-addinput="catAdd" placeholder="Nombre de la nueva categoría" value="${esc(cdraft.newCat)}">
      <button class="addbtn${cdraft.newCat.trim() ? ' ready' : ''}" data-act="catAdd" aria-label="Añadir categoría">${IC.plus}</button>
    </div>
    <div class="sheetactions rowfix">
      <button class="btn primary" data-act="saveCats">Guardar</button>
      <button class="btn ghost" data-act="closeSheet">Cancelar</button>
    </div>`);
  $('#sheet').scrollTop = top;
}

function saveCats() {
  syncCats();
  const c = curCol();
  if (cdraft.newCat.trim()) { toast(`Falta pulsar + para añadir «${cdraft.newCat.trim()}»`); return; }
  if (cdraft.rows.some(r => !r.name.trim())) { toast('Todas las categorías necesitan un nombre'); return; }
  if (cdraft.rows.some(r => r.name.trim().toLowerCase() === 'todas')) { toast('«Todas» ya existe, elige otro nombre'); return; }
  const rename = {};
  cdraft.rows.forEach(r => { if (r.orig && r.orig !== r.name.trim()) rename[r.orig] = r.name.trim(); });
  const keep = new Set(cdraft.rows.filter(r => r.orig).map(r => r.orig));
  const removed = c.categories.filter(o => !keep.has(o));
  const newCats = [];
  cdraft.rows.forEach(r => { const n = r.name.trim(); if (!newCats.includes(n)) newCats.push(n); });
  const changed = [];
  state.items.filter(i => i.collectionId === c.id).forEach(it => {
    if (!it.category) return;
    if (it.category in rename) { it.category = rename[it.category]; changed.push(it); }
    else if (removed.includes(it.category)) { it.category = ''; changed.push(it); }
  });
  c.categories = newCats;
  filters.category = 'Todas';
  closeSheet();
  dbSet('collections', c);
  changed.forEach(i => dbSet('items', i));
  renderDials();
  renderGrid();
}

/* ---------- eventos ---------- */
const A = {
  home: () => goHome(),
  openCol: el => openCol(el.dataset.id),
  newCol: () => openNewCol(),
  pickTpl: el => pickTpl(el.dataset.k),
  createCol: () => createCol(),
  editCol: () => openEditCol(),
  saveCol: () => saveCol(),
  delCol: () => delCol(),
  editCats: () => openEditCats(),
  saveCats: () => saveCats(),
  newItem: () => openItem(null),
  openItem: el => openItem(el.dataset.id),
  saveItem: () => saveItem(),
  delItem: () => delItem(),
  closeSheet: () => closeSheet(),
  info: el => showInfo(el.dataset.k),
  closeInfo: () => closeInfo(),
  thumb: el => {
    const it = state.items.find(x => x.id === el.dataset.id);
    if (it && it.photos && it.photos.length) openLightbox(it.photos); else openItem(el.dataset.id);
  },
  cat: el => { filters.category = el.dataset.v; renderDials(); renderGrid(); },
  clearSearch: () => {
    filters.q = '';
    const s = $('#search'); s.value = ''; s.focus();
    $('#clearSearch').style.display = 'none';
    renderGrid();
  },
  account: () => {
    if (user) openSheet(`<h2>Tu cuenta</h2><p class="hint">${esc(user.displayName || '')}${user.displayName && user.email ? '<br>' : ''}${esc(user.email || '')}</p><div class="sheetactions"><button class="btn ghost" data-act="closeSheet">Cerrar</button><button class="btn danger" data-act="logout">Cerrar sesión</button></div>`);
    else login();
  },
  login: () => login(),
  logout: () => { closeSheet(); if (fb) fb.signOut(auth); },
  addPhoto: () => $('#photoInput').click(),
  rmPhoto: el => { form.photos.splice(+el.dataset.i, 1); renderPhotos(); },
  star: el => {
    const st = el.closest('.stars');
    let n = +el.dataset.v;
    if (+st.dataset.val === n) n = 0;
    st.dataset.val = n;
    st.querySelectorAll('span').forEach(s => s.classList.toggle('on', +s.dataset.v <= n));
  },
  catAdd: () => {
    syncCats();
    const v = cdraft.newCat.trim();
    if (!v) { toast('Escribe el nombre de la categoría antes de pulsar +'); $('#newCat').focus(); return; }
    if (v.toLowerCase() === 'todas' || cdraft.rows.some(r => r.name.trim().toLowerCase() === v.toLowerCase())) { toast('Esa categoría ya existe'); return; }
    cdraft.rows.push({ orig: null, name: v });
    cdraft.newCat = '';
    renderEditCats();
  },
  catUp: el => { syncCats(); move(cdraft.rows, +el.dataset.i, -1); renderEditCats(); },
  catDown: el => { syncCats(); move(cdraft.rows, +el.dataset.i, 1); renderEditCats(); },
  catDel: el => { syncCats(); cdraft.rows.splice(+el.dataset.i, 1); renderEditCats(); },
  fieldAdd: () => {
    syncDraft();
    const label = draft.newFieldLabel.trim();
    if (!label) { toast('Escribe el nombre del campo antes de pulsar +'); $('#newFieldLabel').focus(); return; }
    const f = { id: 'f' + uid(), label, type: draft.newFieldType };
    if (f.type === 'select') f.options = [];
    draft.fields.push(f);
    draft.newFieldLabel = '';
    renderEditCol();
  },
  addExtra: el => {
    syncDraft();
    const e = EXTRAS.find(x => x.id === el.dataset.id);
    if (e && !draft.fields.some(f => f.id === e.id)) draft.fields.push(clone(e));
    renderEditCol();
  },
  fieldUp: el => { syncDraft(); move(draft.fields, +el.dataset.i, -1); renderEditCol(); },
  fieldDown: el => { syncDraft(); move(draft.fields, +el.dataset.i, 1); renderEditCol(); },
  fieldDel: el => {
    syncDraft();
    const f = draft.fields[+el.dataset.i];
    if (!confirm(`¿Quitar el campo "${f.label}"? Se perderán sus datos en todas las piezas al guardar.`)) return;
    draft.fields.splice(+el.dataset.i, 1);
    if (draft.subtitle === f.id) draft.subtitle = '';
    renderEditCol();
  }
};

document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('modalbg')) { closeInfo(); return; }
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
  const t = e.target;
  if (t.id === 'search') {
    filters.q = t.value;
    $('#clearSearch').style.display = t.value ? 'flex' : 'none';
    renderGrid();
  }
  if (t.dataset && t.dataset.addinput) {
    const b = document.querySelector(`[data-act="${t.dataset.addinput}"]`);
    if (b) b.classList.toggle('ready', !!t.value.trim());
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.addinput) {
    e.preventDefault();
    const b = document.querySelector(`[data-act="${e.target.dataset.addinput}"]`);
    if (b) b.click();
  }
});

window.addEventListener('popstate', () => {
  const restore = () => { if (view.name === 'col') history.pushState({ col: true }, ''); };
  if (document.querySelector('.modalbg')) { closeInfo(); restore(); return; }
  if ($('#lightbox').classList.contains('open')) { closeLightbox(); restore(); return; }
  if ($('#overlay').classList.contains('open')) { closeSheet(); restore(); return; }
  if (view.name === 'col') { view = { name: 'home', id: null }; render(); }
});

/* ---------- arranque ---------- */
state = loadLocal();
maybeAutoOpen();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
initFirebase();
setTimeout(() => { if (!ready) { ready = true; maybeAutoOpen(); render(); } }, 8000);
