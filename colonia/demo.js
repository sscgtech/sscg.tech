// Servidor de mentira con el mismo viaje de ejemplo que la app (Demo.swift): sirve para probar sin Apple ID.
// La gente se mueve un poco en el mapa y de vez en cuando alguien escribe en el chat.
class Demo {
  static yo = 'demo-santi';
  static viajeID = 'DEMO2027';
  static centro = { lat: -34.4672, lon: -57.8395 };   // Colonia del Sacramento

  constructor() {
    this.sobres = new Map();
    this.vueltas = 0;
    this.amigos = [
      ['demo-juli', 'Juli', '🏄', 1], ['demo-pato', 'Pato', '🦆', 2], ['demo-caro', 'Caro', '🌻', 3],
      ['demo-nico', 'Nico', '🎸', 4], ['demo-lu', 'Lu', '🌙', 5], ['demo-tomi', 'Tomi', '🍕', 6],
    ];
    this.sembrar();
  }

  async usuario() { return Demo.yo; }
  async traer(id) { return this.sobres.get(id) || null; }
  async archivoURL(id) { return null; }
  async guardar(s) { this.sobres.set(s.id, { ...s, modificado: Date.now() }); }
  async cambios(viaje, desde) {
    await new Promise(r => setTimeout(r, 120));
    this.vueltas++;
    this.mover();
    if (this.vueltas % 7 === 0) this.charlar();
    return [...this.sobres.values()].filter(s => desde == null || s.modificado > desde);
  }

  poner(tipo, datos, autor, haceMin = 0) {
    this.sobres.set(datos.id, { id: datos.id, tipo, autor, datos: { ...datos, autor }, borrado: false, modificado: Date.now() - haceMin * 60000 });
  }

  sembrar() {
    const v = Demo.viajeID, yo = Demo.yo, c = Demo.centro, ahora = Date.now();
    const todos = [yo, ...this.amigos.map(a => a[0])];
    const sorpresa = new URLSearchParams(location.search).has('sorpresa');
    // ?nuevo: entro por primera vez con el link (para ver "¿Quién sos?").
    const nuevo = new URLSearchParams(location.search).has('nuevo');
    const admin = sorpresa || nuevo ? 'demo-juli' : yo;
    if (sorpresa) this.poner('decision', { id: `d-${v}-${yo}`, usuario: yo, aprobado: true, fecha: ahora }, admin, 2800);
    this.poner('viaje', {
      id: v, nombre: 'Colonia 2027', destino: 'Colonia del Sacramento', moneda: '$',
      inicio: ahora - 86400000, fin: ahora + 86400000 * 5, latitud: c.lat, longitud: c.lon,
      aviso: 'Mañana salimos 8 am de la casa 🚐', avisoFecha: ahora - 3600000, avisoAutor: 'demo-juli',
      destinoOculto: sorpresa || undefined, aeropuertoNombre: 'Aeropuerto de Ezeiza', aeropuertoLat: -34.815, aeropuertoLon: -58.5348,
    }, admin, 3000);
    if (!nuevo) this.poner('miembro', { id: `m-${v}-${yo}`, nombre: 'Santi', emoji: '🧉', color: 0, codigo: v, pedido: ahora - 3000 * 60000, comparteUbicacion: true }, yo, 3000);
    // Perfiles armados ("¿Quién sos?"): Juli, Pato y Caro ya eligieron el suyo; el resto está libre.
    ['Juli', 'Pato', 'Caro', 'Santi', 'Rama', 'Sofi', 'Mora', 'Beto', 'Tincho'].forEach((n, i) => {
      const id = `pf-${v}-${n.toLowerCase()}`;
      this.poner('ficha', { id, nombre: n, color: i % 10, orden: i, fecha: ahora - 2950 * 60000 }, admin, 2950);
      if (i < 3) this.poner('reclamo', { id: `rc-${v}-demo-${n.toLowerCase()}`, ficha: id, fecha: ahora - 2900 * 60000 }, `demo-${n.toLowerCase()}`, 2900);
    });
    for (const [id, nombre, emoji, color] of this.amigos) {
      this.poner('miembro', { id: `m-${v}-${id}`, nombre, emoji, color, codigo: v, pedido: ahora - 2900 * 60000, comparteUbicacion: true }, id, 2900);
      this.poner('decision', { id: `d-${v}-${id}`, usuario: id, aprobado: true, admin: id === 'demo-juli' && !sorpresa, fecha: ahora - 2800 * 60000 }, admin, 2800);
    }
    // Dos pedidos esperando aprobación
    this.poner('miembro', { id: `m-${v}-demo-fede`, nombre: 'Fede', emoji: '🐙', color: 7, codigo: v, pedido: ahora - 600000, comparteUbicacion: true }, 'demo-fede', 10);
    this.poner('miembro', { id: `m-${v}-demo-meli`, nombre: 'Meli', emoji: '🦋', color: 8, codigo: 'XXXX1234', pedido: ahora - 120000, comparteUbicacion: true }, 'demo-meli', 2);
    // Ubicaciones alrededor del centro
    const baterias = [0.82, 0.55, 0.31, 0.9, 0.14, 0.67, 0.48];
    todos.forEach((u, i) => {
      const ang = i * 0.9;
      this.poner('ubicacion', {
        id: `u-${v}-${u}`, latitud: c.lat + 0.0022 * Math.sin(ang) * (i % 3 + 1), longitud: c.lon + 0.0026 * Math.cos(ang) * (i % 3 + 1),
        precision: 12, fecha: ahora - i * 140000, bateria: baterias[i],
      }, u);
    });
    // Chat
    const charla = [
      ['demo-juli', '¡Llegamos! La casa es increíble 😍', 'texto', 180], ['demo-pato', 'Alguien trajo cargador tipo C?', 'texto', 170],
      ['demo-caro', 'Yo! Está en la mesa del living', 'texto', 165], ['demo-nico', 'Llegué', 'llegue', 120],
      ['demo-lu', 'Esta noche truco, quedan avisados 🃏', 'texto', 60], [yo, 'Cargué las tareas de mañana, fíjense', 'texto', 30],
      ['demo-tomi', '¿Quién se encarga del hielo? 🧊', 'texto', 8],
    ];
    charla.forEach(([autor, texto, clase, min], i) => {
      const u = this.sobres.get(`u-${v}-${autor}`).datos;
      const extra = clase === 'llegue' ? { latitud: u.latitud, longitud: u.longitud } : {};
      this.poner('mensaje', { id: `msg-demo-${i}`, texto, fecha: ahora - min * 60000, clase, ...extra }, autor, min);
    });
    // Avisos automáticos con botón al detalle
    this.poner('mensaje', { id: 'msg-demo-aviso-1', texto: '🌻 Caro creó la tarea “Comprar hielo y bebidas” para Caro y Lu · hoy', fecha: ahora - 50 * 60000, clase: 'sistema', enlace: 'tarea:t-demo-3' }, 'demo-caro', 50);
    this.poner('mensaje', { id: 'msg-demo-aviso-2', texto: '🏄 Juli abrió una votación: “¿Dónde cenamos mañana?”', fecha: ahora - 20 * 60000, clase: 'sistema', enlace: 'encuesta:enc-1' }, 'demo-juli', 20);
    // Juegos y puntajes
    const juegos = [['j-truco', 'Truco', '🃏', true], ['j-ping', 'Ping pong', '🏓', true], ['j-golf', 'Mini golf', '⛳️', false], ['j-chinchon', 'Chinchón', '🎴', false]];
    juegos.forEach(([id, nombre, emoji, ganaMayor], i) => this.poner('juego', { id, nombre, emoji, ganaMayor, fecha: ahora + i * 1000 }, yo, 1000));
    const tabla = {
      'j-truco': [30, 15, 22, 27, 9, 18, 12], 'j-ping': [21, 18, 11, 21, 15, 9, 19],
      'j-golf': [38, 45, 41, 36, 50, 44, 39], 'j-chinchon': [64, 88, 41, 102, 57, 73, 95],
    };
    for (const [juego, puntos] of Object.entries(tabla)) {
      puntos.forEach((p, i) => this.poner('puntaje', { id: `p-${juego}-${i}`, juego, jugador: todos[i], puntos: p, fecha: ahora - i * 3600000 }, yo, 500));
    }
    this.poner('equipos', {
      id: 'eq-demo', titulo: 'Fútbol en la playa', equipos: [[yo, 'demo-caro', 'demo-lu'], ['demo-juli', 'demo-pato'], ['demo-nico', 'demo-tomi']],
      nombres: ['🦫 Carpinchos', '🐦 Horneros', '🐊 Yacarés'], parejos: true, fecha: ahora - 1800000,
    }, 'demo-nico', 30);
    // Tareas
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const manana = hoy.getTime() + 86400000;
    const tareas = [
      ['Lavar los platos de la cena', 'limpieza', ['demo-juli', 'demo-nico'], ahora], ['Sacar la basura y reciclar', 'basura', ['demo-pato'], ahora],
      ['Asado del sábado', 'comida', [yo, 'demo-tomi'], manana], ['Comprar hielo y bebidas', 'bebidas', ['demo-caro', 'demo-lu'], ahora],
      ['Barrer el patio', 'limpieza', ['demo-tomi'], manana], ['Desayuno para todos', 'comida', ['demo-lu'], manana],
      ['Súper: frutas, pan, café', 'compras', [yo], ahora],
    ];
    tareas.forEach(([titulo, categoria, responsables, dia], i) => this.poner('tarea', { id: `t-demo-${i}`, titulo, categoria, responsables, dia, nota: '' }, yo, 400));
    this.poner('marca', { id: 'k-t-demo-1-demo-pato', tarea: 't-demo-1', hecha: true, fecha: ahora - 50 * 60000 }, 'demo-pato', 50);
    this.poner('marca', { id: `k-t-demo-6-${yo}`, tarea: 't-demo-6', hecha: true, fecha: ahora - 40 * 60000 }, yo, 40);
    // Gastos
    const gastos = [['Alquiler de la casa', 840000, yo], ['Súper del primer día', 96500, 'demo-caro'], ['Nafta ida', 72000, 'demo-nico'],
      ['Carne para el asado', 118000, 'demo-tomi'], ['Bebidas', 54300, 'demo-lu']];
    gastos.forEach(([descripcion, monto, pagador], i) => this.poner('gasto', {
      id: `g-demo-${i}`, descripcion, monto, pagador, entre: todos, fecha: ahora - (5 - i) * 7200000, esPago: false,
    }, pagador, 300));
    // Agenda
    const eventos = [
      ['Paseo por el Barrio Histórico', 16, 'Portón de Campo', -34.4719, -57.8508], ['Atardecer en el muelle', 19.5, 'Muelle de la Bahía', -34.4746, -57.8503],
      ['Truco y cena en casa', 22, 'La casa', c.lat, c.lon], ['Bici hasta el Real de San Carlos', 34.5, 'Real de San Carlos', -34.4398, -57.8379],
      ['Asado del sábado', 37.5, 'La casa', c.lat, c.lon], ['Ferry de vuelta', 138, 'Puerto de Colonia', -34.472, -57.8558],
    ];
    eventos.forEach(([titulo, h, lugar, latitud, longitud], i) => this.poner('evento', {
      id: `e-demo-${i}`, titulo, inicio: hoy.getTime() + h * 3600000, lugar, nota: '', latitud, longitud,
    }, yo, 200));
    // Valijas e ítems decomisados
    const todasLasPrendas = ['boxers', 'medias', 'remeras', 'seleccion', 'short', 'bermudas', 'buzo', 'urbanas', 'deportivas'];
    const armado = { 'demo-juli': todasLasPrendas, 'demo-pato': todasLasPrendas.slice(0, 5), 'demo-caro': todasLasPrendas.slice(0, 8), [yo]: ['boxers', 'medias', 'remeras', 'cepillo'] };
    for (const [u, tildados] of Object.entries(armado)) this.poner('valija', { id: `val-${v}-${u}`, tildados, fecha: ahora - 3600000 }, u, 60);
    this.poner('decomiso', { id: 'dec-demo-1', persona: 'demo-pato', item: 'Secador de pelo', multa: 'Paga el helado de todos', nota: 'Estaba escondido entre las bermudas', fecha: ahora - 25 * 60000 }, 'demo-juli', 25);
    this.poner('mensaje', { id: 'msg-demo-aviso-3', texto: '🏄 Juli decomisó a Pato: Secador de pelo · multa: Paga el helado de todos 🚨', fecha: ahora - 25 * 60000, clase: 'sistema', enlace: 'decomiso:dec-demo-1' }, 'demo-juli', 25);
    // Votaciones
    this.poner('encuesta', { id: 'enc-1', pregunta: '¿Dónde cenamos mañana?', opciones: ['Parrilla del puerto', 'Pizza en casa', 'Pescado en la rambla'],
      multiple: false, cerrada: false, fecha: ahora - 3600000 }, 'demo-juli', 60);
    this.poner('encuesta', { id: 'enc-2', pregunta: '¿A qué hora salimos para la playa?', opciones: ['10:00', '11:30', 'Después de almorzar'],
      multiple: true, cerrada: false, fecha: ahora - 7200000 }, 'demo-nico', 120);
    const votosCena = { 'demo-juli': [0], 'demo-pato': [0], 'demo-caro': [2], 'demo-nico': [1], 'demo-lu': [0] };
    for (const [u, e] of Object.entries(votosCena)) this.poner('voto', { id: `v-enc-1-${u}`, encuesta: 'enc-1', elegidas: e }, u);
    const votosPlaya = { 'demo-pato': [1, 2], 'demo-tomi': [2], 'demo-lu': [1] };
    for (const [u, e] of Object.entries(votosPlaya)) this.poner('voto', { id: `v-enc-2-${u}`, encuesta: 'enc-2', elegidas: e }, u);
  }

  // Los amigos se mueven un poquito, como en la app.
  mover() {
    for (const s of this.sobres.values()) {
      if (s.tipo !== 'ubicacion' || s.autor === Demo.yo) continue;
      s.datos = { ...s.datos, latitud: s.datos.latitud + (Math.random() - 0.5) * 0.0003, longitud: s.datos.longitud + (Math.random() - 0.5) * 0.0003, fecha: Date.now() };
      s.modificado = Date.now();
    }
  }

  charlar() {
    const frases = [['demo-pato', '¿Alguien vio mis anteojos? 🕶️'], ['demo-caro', 'Vamos a la playa en 20'], ['demo-tomi', 'Prendo el fuego 🔥'],
      ['demo-juli', 'Qué lindo día ☀️'], ['demo-lu', '¿Truco a las 22?']];
    const [autor, texto] = frases[(this.vueltas / 7) % frases.length | 0];
    const id = `msg-demo-x${this.vueltas}`;
    this.poner('mensaje', { id, texto, fecha: Date.now(), clase: 'texto' }, autor);
  }
}
