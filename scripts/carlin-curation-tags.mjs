const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Materias bibliográficas y argumentos; no deducir géneros por una palabra del título.
export function curatedClassification(book, source) {
  const categories = normalize(source.categories);
  const title = normalize(source.title);
  const author = normalize(source.author);
  const infant = /infantil|juvenil|primeros anos|bebes|libros ilustrados/.test(categories);
  let subgenre = 'Narrativa contemporánea';
  if (/poesia/.test(categories)) subgenre = 'Poesía';
  else if (/teatro|obras dramaticas/.test(categories)) subgenre = 'Teatro';
  else if (/comic|manga|novelas graficas|tiras comicas/.test(categories)) subgenre = 'Cómic / novela gráfica';
  else if (/ciencia ficcion|distopic|utopic/.test(categories)) subgenre = 'Ciencia ficción / distopía';
  else if (/fantasia/.test(categories)) subgenre = 'Fantasía';
  else if (/terror|sobrenatural|fantasmas/.test(categories)) subgenre = 'Terror';
  else if (/romantic|romance|erotic/.test(categories)) subgenre = 'Romance';
  else if (/crimen|misterio|thriller|suspense|ficcion de espionaje/.test(categories)) subgenre = 'Thriller y misterio';
  else if (/ficcion historica|novelas historicas/.test(categories)) subgenre = 'Novela histórica';
  else if (/ficcion clasica/.test(categories)) subgenre = 'Clásicos';
  else if (/aventura/.test(categories)) subgenre = 'Aventura';
  else if (/literaria|ficcion moderna/.test(categories)) subgenre = 'Narrativa literaria';
  else if (infant) subgenre = 'Cuentos y narrativa infantil';
  else if (/biografia|autobiografia|memorias/.test(categories)) subgenre = 'Biografía / memorias';
  else if (/historia|arqueologia/.test(categories)) subgenre = 'Historia y sociedad';
  else if (/divulgacion cientifica|ciencias naturales|ciencia popular|astronomia|fisica|biologia|evolucion/.test(categories)) subgenre = 'Divulgación científica';
  else if (/filosofia/.test(categories)) subgenre = 'Filosofía';
  else if (/desarrollo personal|autoayuda|psicologia popular|mindfulness|espiritualidad|mente, cuerpo/.test(categories)) subgenre = 'Bienestar y crecimiento personal';
  else if (/cocina|recetas/.test(categories)) subgenre = 'Cocina';
  else if (/salud|nutricion/.test(categories)) subgenre = 'Bienestar y crecimiento personal';

  // Correcciones de obras concretas cuyas materias admiten más de un género.
  if (/juegos del hambre|divergente|insurgente|leal\b|22\/11\/63|\b1984\b|rebelion en la granja|dune|fundacion|problema de los tres cuerpos|bosque oscuro|fin de la muerte/.test(title)) subgenre = 'Ciencia ficción / distopía';
  if (/crepusculo|luna nueva|eclipse|amanecer/.test(title) && /meyer/.test(author)) subgenre = 'Romance';
  if (/harry potter|hobbit|senor de los anillos/.test(title)) subgenre = 'Fantasía';
  if (/cronica de una muerte anunciada/.test(title)) subgenre = 'Narrativa literaria';
  if (/matar a un ruisenor/.test(title) && /harper lee/.test(author)) subgenre = 'Clásicos';
  if (/conspiracion|imperium|dictador/.test(title) && /robert harris/.test(author)) subgenre = 'Novela histórica';
  if (/casa de bernarda alba|hamlet|romeo y julieta|macbeth|sueno de (una )?noche de verano|entremeses/.test(title)) subgenre = 'Teatro';
  if (/marca del meridiano/.test(title)) subgenre = 'Thriller y misterio';
  if (/reina del sur/.test(title)) subgenre = 'Thriller y misterio';
  if (/patria/.test(title) && /aramburu/.test(author)) subgenre = 'Narrativa literaria';
  if (/cinco esquinas/.test(title) && /vargas llosa/.test(author)) subgenre = 'Narrativa literaria';
  if (/espia que surgio del frio/.test(title)) subgenre = 'Thriller y misterio';
  if (/aurora boreal/.test(title) && /larsson/.test(author)) subgenre = 'Thriller y misterio';
  if (/alatriste|tierra firme|ojo de plata/.test(title) && /perez.reverte|asensi/.test(author)) subgenre = 'Novela histórica';
  if (/cuando te encuentre|perdona si te llamo amor|tengo ganas de ti/.test(title) && /sparks|moccia/.test(author)) subgenre = 'Romance';
  if (/club de los muertos|definitivamente muerta/.test(title) && /harris/.test(author)) subgenre = 'Fantasía';
  if (/origen perdido/.test(title) && /asensi/.test(author)) subgenre = 'Aventura';
  if (/ines del alma mia|dime quien soy/.test(title) && /allende|navarro/.test(author)) subgenre = 'Novela histórica';
  if (/enigmas sin resolver/.test(title)) subgenre = 'Historia y sociedad';
  if (/unicornia/.test(title)) subgenre = 'Fantasía';
  if (/principito/.test(title)) subgenre = 'Clásicos';
  if (/monje que vendio su ferrari/.test(title)) subgenre = 'Bienestar y crecimiento personal';
  if (/como funciona el mundo/.test(title) && /smil/.test(author)) subgenre = 'Divulgación científica';
  if (/alquimista|brida|veronika decide morir|peregrino de compostela/.test(title) && /coelho/.test(author)) subgenre = 'Narrativa contemporánea';
  if (/revelacion|profecia celestina/.test(title) && /redfield/.test(author)) subgenre = 'Narrativa contemporánea';
  if (/lord jim|lobo estepario|jilguero|heroe discreto|zahir/.test(title)) subgenre = 'Narrativa literaria';
  if (/siete hermanas|hermana perdida/.test(title) && /riley/.test(author)) subgenre = 'Romance';
  const nonfiction = ['Biografía / memorias', 'Historia y sociedad', 'Divulgación científica', 'Filosofía', 'Bienestar y crecimiento personal', 'Cocina'].includes(subgenre);
  const type = nonfiction ? 'No ficción' : 'Ficción/creativo';
  let audience = book.audience;
  if (nonfiction) audience = 'Adulto/General';
  else if (/bebes|primeros anos|libros de carton/.test(categories)) audience = 'Infantil 0-5';
  else if (/libros ilustrados|bluey|peppa|pollo pepe|oruga glotona|monstruo de colores|la ovejita/.test(`${categories} ${title}`)) audience = 'Infantil 3-12';
  else if (/escuela de monstruos|zoopencos|anna kadabra|marcus pocus|unicornia|isadora moon|mirabella|perro apestoso|polican|superpatata/.test(title)) audience = 'Infantil 6-8';
  else if (/geronimo|tea stilton|futbolisimos|forasteros del tiempo|amanda black|diario de greg|los compas/.test(`${title} ${author}`)) audience = 'Infantil/Juvenil 9-14';
  else if (/juegos del hambre|harry potter|crepusculo|divergente/.test(title)) audience = 'Juvenil/Young Adult';
  else if (!infant && !/infantil|juvenil/i.test(book.audience)) audience = 'Adulto/General';
  else if (!infant && ['Thriller y misterio', 'Romance', 'Novela histórica', 'Terror'].includes(subgenre)) audience = 'Adulto/General';
  if (infant && audience === 'Adulto/General') audience = source.page_count <= 64 ? 'Infantil 3-12' : 'Infantil/Juvenil 9-14';
  if (/principito/.test(title)) audience = 'Infantil/Juvenil 9-14';
  if (/cronicas de la torre|guardianes de la ciudadela|memorias de idhun/.test(title)) audience = 'Juvenil/Young Adult';

  const rules = [
    ['amistad', /amistad|amig[oa]s?\b/], ['familia', /familia|herman[oa]|madre|padre/],
    ['amor', /amor|enamora|romant|pareja/], ['secretos', /secret[oa]|ocult[oa]|revelacion/],
    ['investigación', /investiga|detective|inspecto|policia|resolver|enigma/], ['crimen', /crimen|asesin|homicid|delito/],
    ['magia', /magia|magico|hechiz|bruja|mago|encantamiento/], ['aventura', /aventura|expedicion|hazana/],
    ['dragones', /dragon/], ['mundos imaginarios', /reino|fantasia|mundo imaginario/],
    ['distopías', /distopic|utopic|distopia|sociedad totalitaria/], ['viajes en el tiempo', /viaj.{0,35}(tiempo|pasado)|viaje temporal/],
    ['espacio', /espacial|galaxia|planeta|universo/], ['tecnología', /robot|tecnologia|inteligencia artificial/],
    ['vampiros', /vampiro/], ['fantasmas', /fantasma|espiritus/], ['miedo', /miedo|terror|pesadilla/],
    ['historia', /historica|historico|siglo\b|medieval/], ['Segunda Guerra Mundial', /segunda guerra mundial|nazis|holocausto/],
    ['Guerra Civil española', /guerra civil espanola|guerra civil|franquismo/], ['guerra', /guerra|soldados?\b/],
    ['humor', /humor|comico|divertid|risa|disparatad/], ['escuela', /escuela|colegio|instituto|hogwarts/],
    ['emociones', /emocion|sentimiento|enfado/], ['identidad', /identidad|quien es|quien soy|quien eres/],
    ['superación', /superacion|superar|resilien|segunda oportunidad/], ['duelo', /duelo|perdida|muerte de/],
    ['naturaleza', /naturaleza|bosque|selva|ecologia/], ['animales', /animales|perro|gato|ovejita|raton|oso\b/],
    ['fútbol', /futbol/], ['piratas', /pirata/], ['dinosaurios', /dinosaurio/], ['superhéroes', /superheroe/],
    ['viajes', /viaje|viajer|viajar/], ['misterio', /misterio|misterios/], ['suspense', /suspense|thriller|intriga/],
    ['venganza', /venganza|vengar/], ['justicia', /justicia|tribunal|abogado/], ['poder', /poder|ambicion|politica/],
    ['libertad', /libertad|liberacion|rebelion/], ['feminismo', /feminism|derechos de las mujeres/],
    ['crecimiento personal', /crecimiento personal|desarrollo personal|autoayuda/], ['bienestar', /bienestar|felicidad|meditacion/],
    ['ciencia', /ciencia|cientific|divulgacion/], ['filosofía', /filosofi/], ['cocina', /cocina|recetas/],
    ['memoria', /memoria|recuerdo/], ['arte', /pintura|arte\b|artista/], ['música', /musica|musico/],
  ];
  const text = normalize(`${source.description} ${source.categories}`);
  const supernatural = ['Fantasía', 'Terror', 'Cuentos y narrativa infantil'].includes(subgenre) || audience.startsWith('Infantil');
  const themes = rules.filter(([label, pattern]) => new RegExp(`\\b(?:${pattern.source})`).test(text)
    && (!['magia', 'dragones', 'mundos imaginarios', 'fantasmas'].includes(label) || supernatural)
    && (label !== 'espacio' || ['Ciencia ficción / distopía', 'Divulgación científica'].includes(subgenre))
    && (label !== 'ciencia' || /\bciencia\b|\bcientific|\bdivulgacion/.test(text)))
    .map(([label]) => label);
  const young = audience.startsWith('Infantil');
  const difficulty = young ? source.page_count > 180 ? 'Media' : source.page_count <= 64 ? 'Muy fácil' : 'Fácil'
    : ['Clásicos', 'Narrativa literaria', 'Poesía', 'Teatro', 'Filosofía'].includes(subgenre) ? 'Alta' : source.page_count > 650 ? 'Media' : 'Fácil';
  const pace = ['Thriller y misterio', 'Aventura', 'Terror'].includes(subgenre) ? 'Ágil'
    : ['Narrativa literaria', 'Clásicos', 'Poesía', 'Filosofía'].includes(subgenre) ? 'Pausado' : 'Equilibrado';
  return { subgenre, genre: subgenre, type, audience, themes, difficulty, pace };
}

export function canonicalCuratedTitle(title) {
  if (/principito/i.test(title)) return 'el principito';
  return normalize(title).replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
    .replace(/edicion (ilustrada|especial|original|black friday|conmemorativa)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
