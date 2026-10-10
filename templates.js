export const FIELD_TYPES = {
  text: 'Texto',
  longtext: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  rating: 'Valoración',
  select: 'Lista',
  yesno: 'Sí/No'
};

export const ICONS = ['📷','🌸','🪙','✉️','📚','💿','🎲','🧸','🚗','⌚','🎮','🖼️','🧩','✨'];

const BRANDS = ['Agfa','Canon','Contax','Fujifilm','Hasselblad','Kodak','Leica','Mamiya','Minolta','Nikon','Olympus','Pentax','Polaroid','Rolleiflex','Sony','Voigtländer','Yashica','Zeiss Ikon'];

export const TEMPLATES = {
  camaras: {
    name: 'Cámaras', icon: '📷',
    categories: ['35mm','Instantánea','Digital','Video','Otro'],
    fields: [
      { id: 'marca', label: 'Marca', type: 'select', options: BRANDS },
      { id: 'modelo', label: 'Modelo', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'condicion', label: 'Condición', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'modelo', cardEyebrow: 'marca'
  },
  abanicos: {
    name: 'Abanicos', icon: '🌸',
    categories: ['Antiguo','Artesanal','Souvenir','Decorativo'],
    fields: [
      { id: 'nombre', label: 'Nombre', type: 'text' },
      { id: 'origen', label: 'Origen', type: 'text' },
      { id: 'material', label: 'Material', type: 'select', options: ['Madera','Tela','Encaje','Papel','Plástico','Hueso','Otro'] },
      { id: 'epoca', label: 'Año / época', type: 'text' },
      { id: 'estado', label: 'Estado', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'nombre', cardEyebrow: 'origen'
  },
  monedas: {
    name: 'Monedas', icon: '🪙',
    categories: ['España','Europa','América','Asia','África','Conmemorativas'],
    fields: [
      { id: 'pais', label: 'País', type: 'text' },
      { id: 'denominacion', label: 'Denominación', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'material', label: 'Material', type: 'select', options: ['Oro','Plata','Cobre','Níquel','Bronce','Bimetálica','Otro'] },
      { id: 'conservacion', label: 'Conservación', type: 'select', options: ['MC','EBC','MBC','BC','RC'] },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'denominacion', cardEyebrow: 'pais'
  },
  sellos: {
    name: 'Sellos', icon: '✉️',
    categories: ['Nacionales','Internacionales','Series','Sobres'],
    fields: [
      { id: 'pais', label: 'País', type: 'text' },
      { id: 'serie', label: 'Serie / título', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'estado', label: 'Estado', type: 'select', options: ['Nuevo','Usado','Matasellado'] },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'serie', cardEyebrow: 'pais'
  },
  libros: {
    name: 'Libros', icon: '📚',
    categories: ['Novela','Ensayo','Cómic','Infantil','Otros'],
    fields: [
      { id: 'titulo', label: 'Título', type: 'text' },
      { id: 'autor', label: 'Autor', type: 'text' },
      { id: 'editorial', label: 'Editorial', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'leido', label: 'Leído', type: 'yesno' },
      { id: 'valoracion', label: 'Valoración', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'titulo', cardEyebrow: 'autor'
  },
  vinilos: {
    name: 'Vinilos', icon: '💿',
    categories: ['Rock','Pop','Jazz','Clásica','Otros'],
    fields: [
      { id: 'artista', label: 'Artista', type: 'text' },
      { id: 'album', label: 'Álbum', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'estado', label: 'Estado', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'album', cardEyebrow: 'artista'
  },
  personalizada: {
    name: 'Personalizada', icon: '✨',
    categories: [],
    fields: [
      { id: 'nombre', label: 'Nombre', type: 'text' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    cardTitle: 'nombre', cardEyebrow: ''
  }
};
