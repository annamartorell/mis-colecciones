export const FIELD_TYPES = {
  text: 'Texto',
  longtext: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  rating: 'Valoración',
  select: 'Lista',
  yesno: 'Sí/No'
};

export const FIELD_HELP = {
  text: 'Una línea de texto corto.',
  longtext: 'Varias líneas, ideal para notas.',
  number: 'Solo números.',
  date: 'Se elige en un calendario.',
  rating: 'Estrellas del 1 al 5. Su nombre no se puede cambiar.',
  select: 'Una lista para elegir.',
  yesno: 'Una casilla para marcar (sí / no).'
};

// Campos que se pueden añadir con un toque (si ya los tienes, no aparecen)
export const EXTRAS = [
  { id: 'valoracion', label: 'Valoración', type: 'rating' },
  { id: 'notas', label: 'Notas', type: 'longtext' },
  { id: 'anio', label: 'Año', type: 'number' },
  { id: 'fecha', label: 'Fecha de adquisición', type: 'date' },
  { id: 'precio', label: 'Precio', type: 'number' },
  { id: 'material', label: 'Material', type: 'select', options: [] },
  { id: 'origen', label: 'Origen', type: 'text' },
  { id: 'estado', label: 'Estado de conservación', type: 'select', options: ['Excelente', 'Bueno', 'Aceptable'] }
];

const BRANDS = ['Agfa','Canon','Contax','Fujifilm','Hasselblad','Kodak','Leica','Mamiya','Minolta','Nikon','Olympus','Pentax','Polaroid','Rolleiflex','Sony','Voigtländer','Yashica','Zeiss Ikon'];

// nameLabel: cómo se llama el nombre obligatorio de cada pieza
// subtitle: id del campo que sale como subtítulo en la tarjeta
export const TEMPLATES = {
  camaras: {
    name: 'Cámaras', icon: 'camera', nameLabel: 'Modelo',
    categories: ['35mm', 'Instantánea', 'Digital'],
    fields: [
      { id: 'marca', label: 'Marca', type: 'select', options: BRANDS },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'condicion', label: 'Condición', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'marca'
  },
  abanicos: {
    name: 'Abanicos', icon: 'fan', nameLabel: 'Nombre',
    categories: ['Antiguos', 'Artesanales', 'Souvenirs'],
    fields: [
      { id: 'origen', label: 'Origen', type: 'text' },
      { id: 'material', label: 'Material', type: 'select', options: ['Madera', 'Tela', 'Encaje', 'Papel', 'Plástico', 'Hueso'] },
      { id: 'epoca', label: 'Año / época', type: 'text' },
      { id: 'estado', label: 'Estado', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'origen'
  },
  monedas: {
    name: 'Monedas', icon: 'coin', nameLabel: 'Denominación',
    categories: ['España', 'Europa', 'Resto del mundo'],
    fields: [
      { id: 'pais', label: 'País', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'material', label: 'Material', type: 'select', options: ['Oro', 'Plata', 'Cobre', 'Níquel', 'Bronce', 'Bimetálica'] },
      { id: 'conservacion', label: 'Conservación', type: 'select', options: ['MC', 'EBC', 'MBC', 'BC', 'RC'] },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'pais'
  },
  sellos: {
    name: 'Sellos', icon: 'stamp', nameLabel: 'Serie / título',
    categories: ['Nacionales', 'Internacionales'],
    fields: [
      { id: 'pais', label: 'País', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'estado', label: 'Estado', type: 'select', options: ['Nuevo', 'Usado', 'Matasellado'] },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'pais'
  },
  libros: {
    name: 'Libros', icon: 'book', nameLabel: 'Título',
    categories: ['Novela', 'No ficción', 'Infantil'],
    fields: [
      { id: 'autor', label: 'Autor', type: 'text' },
      { id: 'editorial', label: 'Editorial', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'leido', label: 'Leído', type: 'yesno' },
      { id: 'porleer', label: 'Por leer', type: 'yesno' },
      { id: 'valoracion', label: 'Valoración', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'autor'
  },
  vinilos: {
    name: 'Vinilos', icon: 'vinyl', nameLabel: 'Álbum',
    categories: ['Rock', 'Pop', 'Otros'],
    fields: [
      { id: 'artista', label: 'Artista', type: 'text' },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'estado', label: 'Estado', type: 'rating' },
      { id: 'notas', label: 'Notas', type: 'longtext' }
    ],
    subtitle: 'artista'
  },
  personalizada: {
    name: 'Personalizada', icon: 'spark', nameLabel: 'Nombre',
    categories: [],
    fields: [],
    subtitle: ''
  }
};
