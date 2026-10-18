export const FIELD_TYPES = {
  text: 'Texto',
  longtext: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  rating: 'Valoración',
  choice: 'Una opción',
  select: 'Varias opciones',
  yesno: 'Sí/No'
};

export const FIELD_HELP = {
  text: 'Una línea de texto corto.',
  longtext: 'Varias líneas, ideal para notas.',
  number: '',
  date: 'Se elige en un calendario.',
  rating: '',
  choice: '',
  select: '',
  yesno: 'Una casilla para marcar (sí / no).'
};

export const COUNTRIES = ["Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán", "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia", "Birmania (Myanmar)", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi", "Bután", "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Checoslovaquia (histórico)", "Chile", "China", "Chipre", "Ciudad del Vaticano", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba", "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Esuatini", "Etiopía", "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guinea", "Guinea-Bisáu", "Guinea Ecuatorial", "Guyana", "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia", "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kosovo", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo", "Macedonia del Norte", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Palestina", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática Alemana (histórico)", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia", "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam", "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Unión Soviética (histórico)", "Uruguay", "Uzbekistán", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Yugoslavia (histórico)", "Zambia", "Zimbabue"].sort((a, b) => a.localeCompare(b, 'es'));

// Campos que se pueden añadir con un toque (si ya los tienes, no aparecen)
export const EXTRAS = [
  { id: 'valoracion', label: 'Valoración', type: 'rating' },
  { id: 'notas', label: 'Notas', type: 'longtext' },
  { id: 'anio', label: 'Año', type: 'number' },
  { id: 'fecha', label: 'Fecha de adquisición', type: 'date' },
  { id: 'precio', label: 'Precio', type: 'number' },
  { id: 'material', label: 'Material', type: 'select', options: [] },
  { id: 'origen', label: 'Origen', type: 'text' },
  { id: 'estado', label: 'Estado de conservación', type: 'choice', options: ['Excelente', 'Bueno', 'Aceptable'] }
];

const BRANDS = ['Agfa','Canon','Contax','Fujifilm','Hasselblad','Kodak','Leica','Mamiya','Minolta','Nikon','Olympus','Pentax','Polaroid','Rolleiflex','Sony','Voigtländer','Yashica','Zeiss Ikon'];

// nameLabel: cómo se llama el nombre obligatorio de cada pieza
// subtitle: id del campo que sale como subtítulo en la tarjeta
export const TEMPLATES = {
  personalizada: {
    name: 'Personalizada', icon: 'spark', nameLabel: 'Nombre',
    categories: [],
    fields: [],
    subtitle: ''
  },
  camaras: {
    name: 'Cámaras', icon: 'camera', nameLabel: 'Modelo',
    categories: ['35mm', 'Instantánea', 'Digital'],
    fields: [
      { id: 'marca', label: 'Marca', type: 'choice', options: BRANDS },
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
    categories: ['Euro', 'Libra', 'Dólar', 'Corona'],
    fields: [
      { id: 'pais', label: 'País', type: 'choice', options: COUNTRIES },
      { id: 'anio', label: 'Año', type: 'number' },
      { id: 'material', label: 'Material', type: 'select', options: ['Oro', 'Plata', 'Cobre', 'Níquel', 'Bronce', 'Bimetálica'] },
      { id: 'conservacion', label: 'Conservación', type: 'choice', options: ['MC · Mala conservación', 'RC · Regular conservación', 'BC · Buena conservación', 'MBC · Muy buena conservación', 'EBC · Excelente conservación', 'SC · Sin circular', 'FDC · Flor de cuño (perfecta)'] },
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
      { id: 'lectura', label: 'Lectura', type: 'choice', options: ['Leído', 'Por leer'], badge: true },
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
  }
};
