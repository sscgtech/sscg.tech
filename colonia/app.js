// Colonia web: la misma app del viaje, desde el navegador. Usa los mismos datos que la app de iPhone
// (CloudKit, contenedor iCloud.com.sgiqueaux.colonia, base pública, registros "Dato"), así que un viaje
// creado acá se ve en la app y al revés. Cada uno entra con su Apple ID.
'use strict';

const CONTENEDOR = 'iCloud.com.sgiqueaux.colonia';
const TOKEN = '4cf2963d6d29416f76a58f828a19fe9d89449355ab6633d675f7ed41fbae5255';   // token web (solo funciona en sscg.tech)
const WEB = 'https://sscg.tech/colonia/';
const SEIS_SEG = 6000;

// ───────────────────────── Utilidades

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nuevoID = p => `${p}-${crypto.randomUUID().toUpperCase().slice(0, 12)}`;
const ahora = () => Date.now();
const guardarLS = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const leerLS = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const mezclar = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const COLORES = ['rgb(232,97,61)', 'rgb(41,153,158)', 'rgb(92,107,217)', 'rgb(237,176,33)', 'rgb(158,84,191)',
  'rgb(77,176,92)', 'rgb(219,77,133)', 'rgb(107,140,173)', 'rgb(191,128,77)', 'rgb(51,115,102)'];
const color = i => COLORES[((i % COLORES.length) + COLORES.length) % COLORES.length];
const EMOJIS = ['🧉', '🏄', '🦆', '🌻', '🎸', '🌙', '🍕', '🐙', '🦋', '🐻', '🦊', '🐸', '🌵', '⚽️', '🎧', '🍉', '🚲', '🔥', '🌊', '⭐️'];
const EMOJIS_JUEGO = ['🎲', '🃏', '🏓', '⛳️', '🎴', '⚽️', '🏐', '🎯', '🎳', '🏊', '🧠', '🍺', '🎤', '♟️', '🏃'];
const NOMBRES_EQUIPO = ['🐆 Yaguaretés', '🦫 Carpinchos', '🐦 Horneros', '🦩 Flamencos', '🐊 Yacarés', '🦙 Guanacos', '🐧 Pingüinos', '🦉 Lechuzas', '🐎 Criollos', '🐋 Ballenas'];
const CATEGORIAS = [['limpieza', 'Limpieza', '🧽'], ['basura', 'Basura', '🗑️'], ['comida', 'Comida', '🍽️'], ['bebidas', 'Bebidas', '🍷'], ['compras', 'Compras', '🛒'], ['otra', 'Otras', '📋']];
const PUNTOS_POR_PUESTO = [10, 8, 6, 5, 4, 3, 2];
const RADIO_AEROPUERTO = 2500;

const fmt = (d, o) => new Intl.DateTimeFormat('es-AR', o).format(new Date(d));
const hora = d => fmt(d, { hour: '2-digit', minute: '2-digit', hour12: false });
const inicioDia = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const esHoy = d => inicioDia(d) === inicioDia(ahora());
const esManana = d => inicioDia(d) === inicioDia(ahora() + 86400000);
function haceCuanto(d) {
  const s = (ahora() - d) / 1000;
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${s / 60 | 0} min`;
  if (s < 86400) return `hace ${s / 3600 | 0} h`;
  return fmt(d, { day: 'numeric', month: 'short' });
}
function relativo(d) {
  const s = (d - ahora()) / 1000, r = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
  const a = Math.abs(s);
  if (a < 3600) return r.format(Math.round(s / 60), 'minute');
  if (a < 86400) return r.format(Math.round(s / 3600), 'hour');
  return r.format(Math.round(s / 86400), 'day');
}
function plata(m, moneda) {
  const dec = m >= 100 || Math.round(m) === m ? 0 : 2;
  return `${moneda} ${m.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}
const numero = n => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const lista = nombres => nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
function distanciaM(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const distancia = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

// ───────────────────────── Formato compartido con la app (Swift Codable)
// Las fechas van como segundos desde el 1/1/2001 (lo que usa JSONEncoder por defecto) y los datos binarios en base64.

const REF_2001 = 978307200000;
const FECHAS = {
  viaje: ['inicio', 'fin', 'revelarA', 'avisoFecha'], miembro: ['pedido'], decision: ['fecha'], mensaje: ['fecha'], ubicacion: ['fecha'],
  juego: ['fecha'], puntaje: ['fecha'], equipos: ['fecha'], tarea: ['dia'], marca: ['fecha'], gasto: ['fecha'],
  evento: ['inicio'], encuesta: ['fecha'], voto: [], foto: ['fecha'], oculto: ['fecha'], ajustes: ['fecha'], valija: ['fecha'], decomiso: ['fecha'],
  ficha: ['fecha'], reclamo: ['fecha'], liberacion: ['fecha'], llave: ['fecha'], documento: ['fecha'], acceso: [], reporte: ['fecha'], bloqueo: ['fecha'], mvp: ['fecha'],
};
function codificar(tipo, obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;   // Swift omite los opcionales vacíos
    o[k] = FECHAS[tipo]?.includes(k) ? (v - REF_2001) / 1000 : v;
  }
  if (tipo === 'ajustes' && o.viaje) o.viaje = codificar('viaje', o.viaje);   // el viaje va adentro, con sus fechas
  return o;
}
function decodificar(tipo, obj) {
  const o = { ...obj };
  for (const k of FECHAS[tipo] || []) if (typeof o[k] === 'number') o[k] = o[k] * 1000 + REF_2001;
  if (tipo === 'ajustes' && o.viaje) o.viaje = decodificar('viaje', o.viaje);
  return o;
}
function aBase64(texto) {
  const b = new TextEncoder().encode(texto);
  let bin = '';
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
}
const deBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

// Registros nuevos con todos los campos que la app exige (en Swift los que tienen valor por defecto igual se piden).
const Nuevo = {
  mensaje: (texto, clase = 'texto', extra = {}) => ({ id: nuevoID('msg'), autor: '', texto, fecha: ahora(), clase, ...extra }),
  miembro: (codigo, p) => ({ id: `m-${codigo}-${a.yo}`, autor: a.yo, nombre: p.nombre, emoji: p.emoji, color: p.color, codigo, pedido: ahora(), comparteUbicacion: true }),
  // Cada organizador escribe su propia decisión sobre cada persona (en CloudKit cada uno solo puede tocar lo suyo); vale la más nueva.
  decision: (usuario, aprobado, admin) => ({ id: `d-${a.viajeID}-${usuario}-${a.yo}`, autor: '', usuario, aprobado, admin, fecha: ahora() }),
  oculto: (registro, oculto) => ({ id: `o-${registro}-${a.yo}`, autor: '', registro, oculto, fecha: ahora() }),
  reporte: (registro, usuario, motivo) => ({ id: `rp-${registro}-${a.yo}`, autor: '', registro, usuario, motivo, fecha: ahora() }),
  mvp: candidato => ({ id: `mvp-${a.viajeID}-${a.yo}`, autor: '', candidato, fecha: ahora() }),
  bloqueo: (usuario, bloqueado) => ({ id: `bl-${a.viajeID}-${a.yo}-${usuario}`, autor: '', usuario, bloqueado, fecha: ahora() }),
  ajustes: viaje => ({ id: `a-${a.viajeID}-${a.yo}`, autor: '', viaje, fecha: ahora() }),
  juego: (nombre, emoji, ganaMayor) => ({ id: nuevoID('j'), autor: '', nombre, emoji, ganaMayor, fecha: ahora() }),
  puntaje: (juego, jugador, puntos) => ({ id: nuevoID('p'), autor: '', juego, jugador, puntos, fecha: ahora() }),
  equipos: (titulo, equipos, nombres, parejos) => ({ id: nuevoID('eq'), autor: '', titulo, equipos, nombres, parejos, fecha: ahora() }),
  tarea: (titulo, categoria, responsables, dia) => ({ id: nuevoID('t'), autor: '', titulo, categoria, responsables, dia, nota: '' }),
  marca: (tarea, hecha) => ({ id: `k-${tarea}-${a.yo}`, autor: '', tarea, hecha, fecha: ahora() }),
  gasto: (descripcion, monto, pagador, entre, esPago = false) => ({ id: nuevoID('g'), autor: '', descripcion, monto, pagador, entre, fecha: ahora(), esPago }),
  evento: (titulo, inicio, lugar, nota, latitud, longitud) => ({ id: nuevoID('e'), autor: '', titulo, inicio, lugar, nota, latitud, longitud }),
  encuesta: (pregunta, opciones, multiple) => ({ id: nuevoID('enc'), autor: '', pregunta, opciones, multiple, cerrada: false, fecha: ahora() }),
  voto: (encuesta, elegidas, cambios) => ({ id: `v-${encuesta}-${a.yo}`, autor: '', encuesta, elegidas, cambios }),
  valija: tildados => ({ id: `val-${a.viajeID}-${a.yo}`, autor: '', tildados, fecha: ahora() }),
  decomiso: (persona, item, multa, nota, miniatura) => ({ id: nuevoID('dec'), autor: '', persona, item, multa, nota, miniatura, fecha: ahora() }),
  // Perfiles armados ("¿Quién sos?") y documentos cifrados (ver Modelo.swift)
  ficha: (nombre, foto, color, orden) => ({ id: `pf-${a.viajeID}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, autor: '', nombre, foto, color, orden, fecha: ahora() }),
  reclamo: ficha => ({ id: `rc-${a.viajeID}-${a.yo}`, autor: '', ficha, fecha: ahora() }),
  liberacion: (ficha, usuario) => ({ id: nuevoID('lb'), autor: '', ficha, usuario, fecha: ahora() }),
  llave: (dispositivo, publica) => ({ id: `ll-${a.viajeID}-${a.yo}-${dispositivo}`, autor: '', publica, dispositivo: 'Web', fecha: ahora() }),
  documento: (id, persona, meta, contenido) => ({ id, autor: '', persona, meta, contenido, fecha: ahora() }),
  acceso: (documento, llave, envuelta) => ({ id: `ac-${documento}-${llave}`, autor: '', documento, llave, envuelta }),
};

// ───────────────────────── Cifrado de documentos (el mismo esquema que Cifrado.swift)
// Cada documento: clave AES-256 propia, AES-GCM (nonce ‖ cifrado ‖ tag). La clave se envuelve para cada dispositivo
// (iPhone o navegador) del dueño y de los organizadores: ECDH P-256 con una clave efímera + HKDF-SHA256 + AES-GCM.

const bytesDe64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
function b64De(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const unir = (...partes) => { const r = new Uint8Array(partes.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of partes) { r.set(p, i); i += p.length; } return r; };
const Cifra = {
  sal: new TextEncoder().encode('colonia-documentos'),
  async sellar(datos, clave) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return unir(iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, datos)));
  },
  async abrir(datos, clave) {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.slice(0, 12) }, clave, datos.slice(12)));
  },
  aes: crudo => crypto.subtle.importKey('raw', crudo, 'AES-GCM', true, ['encrypt', 'decrypt']),
  async kek(privada, publica) {
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: publica }, privada, 256);
    const base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: this.sal, info: new Uint8Array() }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  publica: crudo => crypto.subtle.importKey('raw', crudo, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
  async envolver(clave, publica65) {
    const efimera = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const k = await this.kek(efimera.privateKey, await this.publica(publica65));
    const cruda = new Uint8Array(await crypto.subtle.exportKey('raw', clave));
    return unir(new Uint8Array(await crypto.subtle.exportKey('raw', efimera.publicKey)), await this.sellar(cruda, k));
  },
  async desenvolver(envuelta, privada) {
    const k = await this.kek(privada, await this.publica(envuelta.slice(0, 65)));
    return this.aes(await this.abrir(envuelta.slice(65), k));
  },
};

/** La clave privada de este navegador (no sale de acá). Una por Apple ID. */
const llaveLocal = {
  cache: null,
  async cargar() {
    if (this.cache?.yo === a.yo) return this.cache;
    const k = `colonia-llave-${a.yo}`;
    let g = leerLS(k);
    if (!g) {
      const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
      g = { dispositivo: crypto.randomUUID().slice(0, 8).toUpperCase(), privada: await crypto.subtle.exportKey('jwk', par.privateKey),
            publica: b64De(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))) };
      guardarLS(k, g);
    }
    const privada = await crypto.subtle.importKey('jwk', g.privada, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    this.cache = { yo: a.yo, dispositivo: g.dispositivo, publica: g.publica, privada };
    return this.cache;
  },
};

// ───────────────────────── Servidor real: CloudKit JS

class NubeCloudKit {
  constructor(contenedor) {
    this.c = contenedor;
    this.db = contenedor.publicCloudDatabase;
    this.yo = '';
    this.etiquetas = new Map();   // recordChangeTag de cada registro, para poder actualizarlo
    this.sinIndiceDeFecha = false;
  }

  async usuario() {
    const id = await this.c.setUpAuth();
    if (!id) throw new Error('Entrá con tu Apple ID para usar un viaje real.');
    this.yo = id.userRecordName;
    return this.yo;
  }

  sobre(r) {
    const f = r.fields || {};
    if (!f.tipo || !f.datos) return null;
    this.etiquetas.set(r.recordName, r.recordChangeTag);
    let autor = r.created?.userRecordName || '';
    if (!autor || autor === '__defaultOwner__') autor = this.yo;
    let datos;
    try { datos = decodificar(f.tipo.value, JSON.parse(deBase64(f.datos.value))); } catch { return null; }
    return { id: r.recordName, tipo: f.tipo.value, autor, datos, borrado: !!(f.borrado && f.borrado.value), modificado: r.modified?.timestamp || ahora() };
  }

  async traer(id) {
    const res = await this.db.fetchRecords([id], { desiredKeys: ['tipo', 'datos', 'borrado'] });
    const r = res.records?.[0];
    if (!r || r.serverErrorCode || res.hasErrors) return null;
    return this.sobre(r);
  }

  async cambios(viaje, desde) {
    const filtros = [{ fieldName: 'viaje', comparator: 'EQUALS', fieldValue: { value: viaje } }];
    if (desde && !this.sinIndiceDeFecha) filtros.push({ systemFieldName: 'modifiedTimestamp', comparator: 'GREATER_THAN', fieldValue: { value: desde } });
    try {
      return await this.consultar(filtros);
    } catch (e) {
      if (filtros.length > 1) { this.sinIndiceDeFecha = true; return this.consultar(filtros.slice(0, 1)); }
      throw e;
    }
  }

  async consultar(filtros) {
    const salida = [];
    let res = await this.db.performQuery({ recordType: 'Dato', filterBy: filtros }, { desiredKeys: ['tipo', 'datos', 'borrado'], resultsLimit: 200 });
    for (;;) {
      if (res.hasErrors) throw res.errors[0];
      for (const r of res.records) { const s = this.sobre(r); if (s) salida.push(s); }
      if (!res.moreComing) break;
      res = await this.db.performQuery(res);
    }
    return salida;
  }

  async guardar(s, viaje, resumen, archivo) {
    const fields = {
      viaje: { value: viaje }, tipo: { value: s.tipo },
      datos: { value: aBase64(JSON.stringify(codificar(s.tipo, s.datos))) }, borrado: { value: s.borrado ? 1 : 0 },
    };
    if (resumen) fields.resumen = { value: resumen.slice(0, 180) };
    if (archivo) fields.archivo = { value: archivo };
    if (s.borrado) fields.resumen = { value: null };   // borrado: no queda el resumen (el archivo se va con eliminar)
    // Igual que la app (.allKeys): pisa lo que haya. Si el registro ya existe hace falta su etiqueta de cambio.
    for (let intento = 0; intento < 3; intento++) {
      const rec = { recordType: 'Dato', recordName: s.id, fields };
      const tag = this.etiquetas.get(s.id);
      if (tag) rec.recordChangeTag = tag;
      let res, error;
      try { res = await this.db.saveRecords([rec]); if (res.hasErrors) error = res.errors[0]; } catch (e) { error = e; }
      if (!error) { const r = res.records?.[0]; if (r) this.etiquetas.set(r.recordName, r.recordChangeTag); return; }
      const cod = `${error.ckErrorCode || ''} ${error.serverErrorCode || ''} ${error.reason || error.message || ''}`;
      if (!/CONFLICT|EXISTS|already exists|changed/i.test(cod)) throw error;
      const f = await this.db.fetchRecords([s.id], { desiredKeys: ['tipo'] });
      this.etiquetas.set(s.id, f.records?.[0]?.recordChangeTag);
    }
    throw new Error('No se pudo guardar (el registro cambió mientras lo guardaba).');
  }

  async archivoURL(id) {
    const res = await this.db.fetchRecords([id], { desiredKeys: ['archivo'] });
    const u = res.records?.[0]?.fields?.archivo?.value?.downloadURL;
    return u ? u.replace('${f}', 'foto') : null;
  }
}

// ───────────────────────── El estado (igual que Almacen.swift)

const a = {
  perfil: leerLS('perfil'),
  viajeID: leerLS('viajeID'),
  esDemo: leerLS('demo', false),
  yo: '',
  servidor: null,
  nube: null,              // NubeCloudKit cuando hay Apple ID
  conectado: false,        // hay sesión de Apple ID
  cloudkitListo: false,
  cloudkitError: null,
  cargando: false,
  error: null,
  ultimaSincronizacion: null,
  sobres: new Map(),
  desde: null,
  leidosHasta: leerLS('leidosHasta', 0),
  viaje: null, miembros: {}, decisiones: {}, mensajes: [], ubicaciones: {}, juegos: [], puntajes: [], tareas: [], marcas: [],
  gastos: [], eventos: [], encuestas: [], votos: [], fotos: [], sorteos: [], valijas: {}, decomisos: [],
  organizadores: new Set(), ocultos: new Set(), ocultosLista: [], reportes: [], bloqueados: new Set(), votosMVP: {},
  fichas: [], duenoFicha: {}, fichaDe: {}, miReclamoPerdido: false, documentos: [], llaves: [], accesos: {},
  get fichasLibres() { return this.fichas.filter(f => !this.duenoFicha[f.id]); },
  /** Hay que mostrar "¿Quién sos?" sí o sí: entró con el link y no eligió (o perdió el que eligió). */
  get debeElegirFicha() {
    if (!this.viaje || this.yo === this.creador || this.fichaDe[this.yo] || !this.fichasLibres.length) return false;
    return !this.miembros[this.yo] || this.miReclamoPerdido;
  },
  /** La foto de alguien (data URL): la que puso él o la de su perfil armado. */
  foto(u) {
    const f = this.miembros[u]?.foto || this.fichas.find(x => x.id === this.fichaDe[u])?.foto;
    return f ? `data:image/jpeg;base64,${f}` : null;
  },
  duenoDe(persona) { return persona?.startsWith('pf-') ? this.duenoFicha[persona] : persona; },
  nombrePersona(p) { return this.fichas.find(f => f.id === p)?.nombre ?? this.nombre(p); },

  /** El que creó el viaje: siempre organiza y no se lo puede sacar. */
  get creador() { return this.viaje?.autor; },
  get soyAdmin() { return this.organizadores.has(this.yo); },
  organiza(u) { return this.organizadores.has(u); },
  estado(u) {
    if (u === this.creador) return 'aprobado';
    const d = this.decisiones[u];
    if (d) return d.aprobado ? 'aprobado' : 'rechazado';
    if (this.fichaDe[u]) return 'aprobado';   // eligió su perfil armado: entra directo
    return this.viaje?.autoAprobar ? 'aprobado' : 'pendiente';
  },
  get miEstado() { return this.estado(this.yo); },
  get aprobados() {
    const rango = u => u === this.creador ? 0 : this.organiza(u) ? 1 : 2;
    return Object.values(this.miembros).filter(m => this.estado(m.autor) === 'aprobado')
      .sort((x, y) => rango(x.autor) - rango(y.autor) || x.nombre.localeCompare(y.nombre));
  },
  get pendientes() { return Object.values(this.miembros).filter(m => this.estado(m.autor) === 'pendiente').sort((x, y) => x.pedido - y.pedido); },
  get rechazados() { return Object.values(this.miembros).filter(m => this.estado(m.autor) === 'rechazado'); },
  nombre(u) { return u === this.yo ? 'Vos' : (this.miembros[u]?.nombre ?? 'Alguien'); },
  emoji(u) { return this.miembros[u]?.emoji ?? '🙂'; },
  color(u) { return color(this.miembros[u]?.color ?? 0); },
  cuenta(u) { return this.estado(u) === 'aprobado'; },
  get moneda() { return this.viaje?.moneda || '$'; },
};

function codigoDe(texto) {
  const t = (texto || '').trim();
  try { const c = new URL(t).searchParams.get('c'); if (c) return c.toUpperCase(); } catch {}
  const limpio = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return limpio.length === 8 ? limpio : null;
}
function codigoNuevo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O ni 1/I para que se lea bien
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => letras[n % letras.length]).join('');
}
const linkInvitacion = () => `${WEB}?c=${a.viajeID}`;

function activarDemo() {
  a.servidor = new Demo();
  a.esDemo = true;
  a.yo = Demo.yo;
  if (!a.perfil) a.perfil = { nombre: 'Santi', emoji: '🧉', color: 0 };
  a.viajeID = Demo.viajeID;
  guardarLocal();
}
function guardarLocal() { guardarLS('perfil', a.perfil); guardarLS('viajeID', a.viajeID); guardarLS('demo', a.esDemo); }

/** "Borrar mis datos y salir": vacía en el servidor lo personal mío de este viaje y sale (lo del grupo queda). */
const TIPOS_PERSONALES = new Set(['miembro', 'mensaje', 'ubicacion', 'foto', 'voto', 'mvp', 'reclamo', 'llave', 'reporte', 'bloqueo', 'valija', 'marca']);
async function borrarMisDatos() {
  if (!a.viajeID || a.esDemo) return;
  const misDocs = new Set(a.documentos.filter(d => a.duenoDe(d.persona) === a.yo).map(d => d.id));
  const mios = [...a.sobres.values()].filter(s => s.autor === a.yo && !s.borrado &&
    (TIPOS_PERSONALES.has(s.tipo) || (s.tipo === 'documento' && misDocs.has(s.id)) || (s.tipo === 'acceso' && [...misDocs].some(d => s.id.startsWith(`ac-${d}-`)))));
  avisar('Borrando tus datos…', true);
  for (const s of mios) { try { await a.servidor.guardar({ ...s, datos: {}, borrado: true }, a.viajeID, null, null); } catch {} }
  // Lo que tiene archivo (fotos y documentos grandes) además se borra del servidor, que es como se va el archivo.
  const conArchivo = mios.filter(s => s.tipo === 'foto' || s.tipo === 'documento').map(s => s.id);
  if (conArchivo.length && a.servidor.db) { try { await a.servidor.db.deleteRecords(conArchivo); } catch {} }
  try { localStorage.removeItem(`colonia-llave-${a.yo}`); } catch {}
  salirDelViaje();
  avisar('Listo: borramos tus datos de ese viaje.', true);
}

function salirDelViaje() {
  detener();
  a.viajeID = null; a.sobres = new Map(); a.desde = null;
  llavePublicada = false; accesosEnviados.clear(); clavesDoc.clear(); metasDoc.clear();
  if (a.esDemo) { a.esDemo = false; a.servidor = a.nube; a.yo = a.nube?.yo || ''; }
  reconstruir(); guardarLocal();
  ui.pestana = CHAT; ui.seccion = null; ui.juego = null;
  render();
}

async function conError(trabajo) {
  a.cargando = true; a.error = null; render();
  try { await trabajo(); } catch (e) { a.error = mensajeError(e); }
  a.cargando = false; render();
}
function mensajeError(e) {
  const t = e?.reason || e?.message || String(e);
  if (/AUTHENTICATION|NOT_AUTHENTICATED|401/i.test(`${e?.ckErrorCode} ${e?.serverErrorCode} ${t}`)) return 'Tu sesión de Apple ID venció. Volvé a entrar.';
  if (/network|Failed to fetch|NETWORK/i.test(t)) return 'Sin conexión a internet.';
  return t;
}

async function crearViaje(nombre, destino) {
  await conError(async () => {
    a.yo = await a.servidor.usuario();
    const v = { id: codigoNuevo(), autor: a.yo, nombre, destino, moneda: '$' };
    if (destino) { const r = await buscarLugar(destino); if (r[0]) { v.latitud = r[0].lat; v.longitud = r[0].lon; } }
    a.viajeID = v.id; guardarLocal();
    await enviar('viaje', v);
    await enviar('miembro', Nuevo.miembro(v.id, a.perfil));
    arrancar();
  });
}

async function unirse(codigo) {
  await conError(async () => {
    a.yo = await a.servidor.usuario();
    const s = await a.servidor.traer(codigo);
    if (!s || s.tipo !== 'viaje') throw new Error('No encontré ningún viaje con ese código. Revisá el link o pedile uno nuevo al organizador.');
    a.viajeID = codigo; guardarLocal();
    ingerir([s]);
    await sincronizar();
    if (!a.miembros[a.yo]) {
      if (a.viaje?.entradaCerrada) {
        a.viajeID = null; a.sobres = new Map(); a.desde = null; reconstruir(); guardarLocal();
        throw new Error('Este viaje no está aceptando gente nueva por ahora. Avisale a quien organiza.');
      }
      // Con perfiles armados libres, primero elige quién es ("¿Quién sos?") y ahí se manda.
      if (!a.fichasLibres.length) await enviar('miembro', Nuevo.miembro(codigo, { ...a.perfil, nombre: a.perfil.nombre || 'Sin nombre' }));
    }
    arrancar();
  });
}

function actualizarPerfil(p) {
  a.perfil = p; guardarLocal();
  const m = a.miembros[a.yo];
  if (m) guardar('miembro', { ...m, nombre: p.nombre, emoji: p.emoji, color: p.color });
}

// ── Perfiles armados ("¿Quién sos?")

/** "Soy yo": queda atado a mi Apple ID, sale de la lista y entro directo con ese nombre y esa foto. */
function elegirFicha(f) {
  if (a.duenoFicha[f.id]) return avisar('Ese perfil ya lo eligió otro');
  const antes = a.miembros[a.yo] ? a.estado(a.yo) : 'pendiente';
  a.perfil = { nombre: f.nombre, emoji: a.perfil?.emoji || '🙂', color: f.color ?? 0 }; guardarLocal();
  guardar('reclamo', Nuevo.reclamo(f.id));
  const m = a.miembros[a.yo] || Nuevo.miembro(a.viajeID, a.perfil);
  guardar('miembro', { ...m, nombre: f.nombre, color: f.color ?? 0 });
  if (antes !== 'aprobado') guardar('mensaje', Nuevo.mensaje(`👋 ${f.nombre} se sumó al viaje`, 'sistema'));
}
/** No está en la lista: pide entrar como siempre (si tenía un "soy yo" que ya no vale, lo borra). */
async function noEstoyEnLaLista(nombre) {
  if (nombre && (!a.perfil?.nombre || !a.miembros[a.yo])) { a.perfil = { ...(a.perfil || {}), nombre }; guardarLocal(); }
  const r = a.sobres.get(`rc-${a.viajeID}-${a.yo}`);
  if (r && !r.borrado) borrar('reclamo', { ...r.datos, autor: a.yo });
  if (!a.miembros[a.yo]) await enviar('miembro', Nuevo.miembro(a.viajeID, { ...a.perfil, nombre: a.perfil.nombre || 'Sin nombre' }));
  a.miReclamoPerdido = false; render();
}
function liberarFicha(f) {
  const u = a.duenoFicha[f.id];
  if (a.soyAdmin && u) guardar('liberacion', Nuevo.liberacion(f.id, u));
}
/** Recorte cuadrado al centro, JPEG (base64). */
async function cuadrada(file, lado = 400) {
  const img = await createImageBitmap(file).catch(() => null) || await new Promise((ok, mal) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No pude leer la imagen (probá con JPG)')); i.src = URL.createObjectURL(file);
  });
  const m = Math.min(img.width, img.height);
  const c = document.createElement('canvas'); c.width = c.height = lado;
  c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
  return c.toDataURL('image/jpeg', 0.72).split(',')[1];
}
/** Organizar → cargar varias fotos de una: el nombre del archivo es el apodo. */
async function cargarFichas(archivos) {
  let orden = Math.max(0, ...a.fichas.map(f => f.orden ?? 0));
  const ordenados = [...archivos].sort((x, y) => x.name.localeCompare(y.name));
  for (const f of ordenados) {
    const nombre = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    try { guardar('ficha', Nuevo.ficha(nombre, await cuadrada(f), (a.fichas.length + orden) % COLORES.length, ++orden)); }
    catch (e) { avisar(`${f.name}: ${mensajeError(e)}`); }
  }
  avisar(`${ordenados.length} perfiles cargados`, true);
}

// ── Documentos (cifrados)

const clavesDoc = new Map(), metasDoc = new Map(), accesosEnviados = new Set();
let llavePublicada = false;
const miLlaveID = l => `ll-${a.viajeID}-${a.yo}-${l.dispositivo}`;

async function publicarMiLlave() {
  if (llavePublicada || !a.yo || !a.miembros[a.yo] || a.estado(a.yo) !== 'aprobado') return;
  llavePublicada = true;
  const l = await llaveLocal.cargar();
  if (!a.llaves.some(x => x.id === miLlaveID(l))) guardar('llave', Nuevo.llave(l.dispositivo, l.publica));
}
async function claveDoc(d) {
  if (clavesDoc.has(d.id)) return clavesDoc.get(d.id);
  const l = await llaveLocal.cargar();
  const ac = a.accesos[`ac-${d.id}-${miLlaveID(l)}`];
  if (!ac) return null;
  try { const k = await Cifra.desenvolver(bytesDe64(ac.envuelta), l.privada); clavesDoc.set(d.id, k); return k; } catch { return null; }
}
/** Descifra los títulos de los documentos que puedo abrir y vuelve a pintar si apareció alguno. */
async function descifrarMetas() {
  let nuevo = false;
  for (const d of a.documentos) {
    if (metasDoc.has(d.id)) continue;
    const k = await claveDoc(d);
    if (!k) continue;
    try { metasDoc.set(d.id, JSON.parse(new TextDecoder().decode(await Cifra.abrir(bytesDe64(d.meta), k)))); nuevo = true; } catch {}
  }
  if (nuevo) render();
}
const llavesAutorizadas = d => { const dueno = a.duenoDe(d.persona); return a.llaves.filter(l => a.organiza(l.autor) || l.autor === dueno); };
/** Si puedo abrir un documento y algún dispositivo autorizado todavía no tiene su copia de la clave, se la dejo. */
async function compartirDocumentos() {
  for (const d of a.documentos) {
    const k = await claveDoc(d);
    if (!k) continue;
    for (const l of llavesAutorizadas(d)) {
      const id = `ac-${d.id}-${l.id}`;
      if (a.accesos[id] || accesosEnviados.has(id)) continue;
      accesosEnviados.add(id);
      try { guardar('acceso', Nuevo.acceso(d.id, l.id, b64De(await Cifra.envolver(k, bytesDe64(l.publica))))); } catch {}
    }
  }
}
async function subirDocumento(persona, titulo, clase, file) {
  let datos = new Uint8Array(await file.arrayBuffer());
  let formato = (file.name.split('.').pop() || 'pdf').toLowerCase().replace('jpeg', 'jpg');
  if (file.type.startsWith('image/') && formato !== 'pdf') {   // las fotos se achican (así suelen entrar en el registro)
    const b64 = await miniatura(file, 2200).catch(() => null);
    if (b64) { datos = bytesDe64(b64); formato = 'jpg'; }
  }
  const clave = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const id = nuevoID('doc');
  const meta = b64De(await Cifra.sellar(new TextEncoder().encode(JSON.stringify({ titulo, clase, formato, tamano: datos.length })), clave));
  const sellado = await Cifra.sellar(datos, clave);
  clavesDoc.set(id, clave);
  const chico = sellado.length <= 550000;
  const d = Nuevo.documento(id, persona, meta, chico ? b64De(sellado) : undefined);
  if (!chico && a.esDemo) docsDemo.set(id, sellado);
  await enviar('documento', d, chico || a.esDemo ? undefined : new Blob([sellado], { type: 'application/octet-stream' }));
  const l = await llaveLocal.cargar();
  const para = llavesAutorizadas(d);
  if (!para.some(x => x.id === miLlaveID(l))) para.push({ id: miLlaveID(l), publica: l.publica });
  for (const x of para) {
    accesosEnviados.add(`ac-${id}-${x.id}`);
    guardar('acceso', Nuevo.acceso(id, x.id, b64De(await Cifra.envolver(clave, bytesDe64(x.publica)))));
  }
  descifrarMetas();
}
const docsDemo = new Map();
async function abrirDocumento(id) {
  const d = a.documentos.find(x => x.id === id), m = metasDoc.get(id);
  const k = d && await claveDoc(d);
  if (!k || !m) return avisar('Todavía no te compartieron este documento en este navegador');
  avisar('Abriendo…', true);
  try {
    let sellado = d.contenido ? bytesDe64(d.contenido) : docsDemo.get(id);
    if (!sellado) {
      const url = await a.servidor.archivoURL(id);
      sellado = new Uint8Array(await (await fetch(url)).arrayBuffer());
    }
    const datos = await Cifra.abrir(sellado, k);
    const tipo = m.formato === 'pdf' ? 'application/pdf' : m.formato === 'png' ? 'image/png' : /jpe?g|heic/.test(m.formato) ? 'image/jpeg' : 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([datos], { type: tipo }));
    const el = document.createElement('div');
    el.className = 'visor';
    el.innerHTML = `${tipo.startsWith('image/') ? `<img src="${url}" alt="">` : `<iframe class="visor-doc" src="${url}" title="${esc(m.titulo)}"></iframe>`}
      <div class="arriba"><div class="crece"><b>🔒 ${esc(m.titulo)}</b><div style="font-size:12px;opacity:.8">Solo lo ven ${esc(a.nombrePersona(d.persona))} y los organizadores</div></div>
      <a href="${url}" download="${esc(m.titulo)}.${esc(m.formato)}" title="Descargar">⬇︎</a><button data-v="cerrar" title="Cerrar">✕</button></div>`;
    el.addEventListener('click', e => { if (e.target.closest('button')?.dataset.v === 'cerrar' || e.target === el) { el.remove(); URL.revokeObjectURL(url); } });
    document.body.appendChild(el);
    $('#aviso').hidden = true;
  } catch (e) { avisar(`No se pudo abrir: ${mensajeError(e)}`); }
}

function decidir(u, aprobar) {
  if (!a.soyAdmin || u === a.creador) return;
  const antes = a.estado(u);
  guardar('decision', Nuevo.decision(u, aprobar, aprobar ? a.organiza(u) : false));
  const m = a.miembros[u];
  if (aprobar && antes !== 'aprobado' && m) guardar('mensaje', Nuevo.mensaje(`${m.emoji} ${m.nombre} se sumó al viaje`, 'sistema'));
}

/** Nombrar o quitar organizador (lo puede hacer cualquier organizador; al que creó el viaje no se lo saca). */
function hacerOrganizador(u, si) {
  if (!a.soyAdmin || u === a.creador) return;
  guardar('decision', Nuevo.decision(u, true, si));
  const m = a.miembros[u];
  if (m) guardar('mensaje', Nuevo.mensaje(si ? `⭐️ ${m.emoji} ${m.nombre} ahora también organiza` : `${m.emoji} ${m.nombre} dejó de organizar`, 'sistema'));
}

/** Los ajustes del viaje: cada organizador guarda su copia y vale la más nueva. El que creó el viaje además
 *  actualiza el registro original, así lo ven también las versiones viejas de la app. */
function guardarViaje(v) {
  if (!a.soyAdmin) return;
  const x = { ...v, autor: a.creador };
  if (a.yo === a.creador) guardar('viaje', x);
  guardar('ajustes', Nuevo.ajustes(x));
}

/** Dejar de organizar uno mismo: la decisión cuenta porque cuando la escribe todavía organiza. */
function hacerOrganizadorPropio() {
  guardar('decision', Nuevo.decision(a.yo, true, false));
  const m = a.miembros[a.yo];
  if (m) guardar('mensaje', Nuevo.mensaje(`${m.emoji} ${m.nombre} dejó de organizar`, 'sistema'));
}

/** Aviso automático en el chat cuando alguien crea algo (todo menos los gastos), con botón al detalle.
 *  enlace: "tarea:<id>", "encuesta:<id>", "evento:<id>", "juego:<id>", "equipos:<id>" o "fotos". */
function anunciar(texto, enlace) {
  const quien = a.perfil ? `${a.perfil.emoji} ${a.perfil.nombre}` : 'Alguien';
  guardar('mensaje', Nuevo.mensaje(`${quien} ${texto}`, 'sistema', { enlace }));
}

/** Reportar un mensaje o una foto de otro: deja de verse para mí y les llega a los organizadores. */
function reportar(registro, usuario) {
  if (!usuario || usuario === a.yo) return;
  guardar('reporte', Nuevo.reporte(registro, usuario, 'Ofensivo o inapropiado'));
  avisar('Gracias. Ya no lo ves y les llegó a los organizadores.', true);
}
/** Bloquear (o desbloquear) a alguien: no veo más sus mensajes ni sus fotos. */
function bloquear(usuario, si) {
  if (!usuario || usuario === a.yo) return;
  guardar('bloqueo', Nuevo.bloqueo(usuario, si));
}

function ocultar(registro, oculto) {
  if (!a.soyAdmin) return;
  guardar('oculto', Nuevo.oculto(registro, oculto));
}

/** Con "aprobar solo" prendido, el primer organizador que se conecta deja la aprobación guardada,
 *  así no se pierde si después lo apagan. */
const aprobadosSolos = new Set();
function aprobarPendientesSolos() {
  if (!a.soyAdmin || !a.viaje?.autoAprobar) return;
  for (const m of Object.values(a.miembros)) {
    if (m.autor === a.creador || a.decisiones[m.autor] || aprobadosSolos.has(m.autor)) continue;
    aprobadosSolos.add(m.autor);
    guardar('decision', Nuevo.decision(m.autor, true, false));
  }
}

// ── Sincronización

let bucle = null;
function arrancar() {
  if (!a.viajeID || bucle) return;
  sincronizar();
  bucle = setInterval(() => { if (!document.hidden) sincronizar(); }, SEIS_SEG);
  ubicacion.arrancar();
}
function detener() { clearInterval(bucle); bucle = null; ubicacion.detener(); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && bucle) sincronizar(); });

let sincronizando = false;
async function sincronizar() {
  if (!a.viajeID || !a.servidor || sincronizando) return;
  sincronizando = true;
  try {
    const nuevos = await a.servidor.cambios(a.viajeID, a.desde != null ? a.desde - 5000 : null);
    const m = Math.max(...nuevos.map(s => s.modificado), a.desde ?? 0);
    if (nuevos.length) a.desde = m;
    a.ultimaSincronizacion = ahora();
    if (a.error?.startsWith('Sin conexión con el grupo')) a.error = null;
    ingerir(nuevos);
    aprobarPendientesSolos();
    publicarMiLlave().then(compartirDocumentos).then(descifrarMetas).catch(() => {});
  } catch (e) {
    a.error = `Sin conexión con el grupo: ${mensajeError(e)}`;
    render();
  } finally { sincronizando = false; }
}

/** Guarda un registro propio: se ve al instante y se manda al servidor en segundo plano. */
function guardar(tipo, valor, archivo) {
  enviar(tipo, valor, archivo).catch(e => { a.error = `No se pudo guardar: ${mensajeError(e)}`; render(); });
}
function borrar(tipo, valor) {
  if (valor.autor !== a.yo || !a.viajeID) return;
  const s = { id: valor.id, tipo, autor: a.yo, datos: valor, borrado: true, modificado: ahora() };
  ingerir([s]);
  a.servidor.guardar(s, a.viajeID, null, null).catch(() => {});
}
async function enviar(tipo, valor, archivo) {
  if (!a.viajeID) return;
  const datos = { ...valor, autor: a.yo };
  const s = { id: datos.id, tipo, autor: a.yo, datos, borrado: false, modificado: ahora() };
  ingerir([s]);
  await a.servidor.guardar(s, a.viajeID, resumen(tipo, datos), archivo);
}

/** El texto del aviso push que les llega a los que usan la app (CloudKit lo arma con este campo). */
function resumen(tipo, v) {
  const quien = a.perfil ? `${a.perfil.emoji} ${a.perfil.nombre}` : 'Alguien';
  if (tipo === 'mensaje') {
    if (v.clase === 'llegue') return `${quien} llegó ✅`;
    if (v.clase === 'dondeEstas') return `${quien} pregunta: ${v.texto}`;
    if (v.clase === 'ubicacion') return `${quien} compartió dónde está 📍`;
    if (v.clase === 'sistema') return v.texto;
    return `${quien}: ${v.texto}`;
  }
  if (tipo === 'miembro') return `${quien} quiere sumarse al viaje`;
  return null;
}

function ingerir(nuevos) {
  if (!nuevos.length) return;
  const mensajesNuevos = [];
  let cambio = false;
  for (const s of nuevos) {
    const viejo = a.sobres.get(s.id);
    if (viejo && viejo.borrado === s.borrado && JSON.stringify(viejo.datos) === JSON.stringify(s.datos) && viejo.autor === s.autor) continue;
    if (s.tipo === 'mensaje' && !viejo && !s.borrado && s.autor !== a.yo) mensajesNuevos.push(s.datos);
    a.sobres.set(s.id, s);
    cambio = true;
  }
  if (!cambio) return;
  reconstruir();
  avisarLocal(mensajesNuevos);
  render();
}

function reconstruir() {
  const vivos = [...a.sobres.values()].filter(s => !s.borrado);
  const de = tipo => vivos.filter(s => s.tipo === tipo).map(s => ({ ...s.datos, autor: s.autor }));
  const base = de('viaje').find(v => v.id === a.viajeID) || null;
  const creador = base?.autor;
  a.miembros = {};
  for (const m of de('miembro')) if (!a.miembros[m.autor]) a.miembros[m.autor] = m;

  // Organizadores: el creador, y los que un organizador nombró. Vale la decisión más nueva sobre cada persona.
  const ultimaPor = (lista, clave) => {
    const r = {};
    for (const x of lista) if (!r[x[clave]] || x.fecha > r[x[clave]].fecha) r[x[clave]] = x;
    return r;
  };
  const decis = de('decision');
  const alguna = new Set(creador ? [creador] : []);   // los que alguna vez organizaron
  for (let cambio = true; cambio;) {
    cambio = false;
    for (const d of decis) if (alguna.has(d.autor) && d.admin === true && !alguna.has(d.usuario)) { alguna.add(d.usuario); cambio = true; }
  }
  let validas = decis.filter(d => alguna.has(d.autor));
  const previo = ultimaPor(validas, 'usuario'), desde = {};
  for (const u of alguna) if (u !== creador && previo[u] && !(previo[u].admin && previo[u].aprobado)) desde[u] = previo[u].fecha;
  // Lo que decidió alguien después de que le sacaron el rol de organizador no cuenta.
  validas = validas.filter(d => d.autor === creador || desde[d.autor] == null || d.fecha <= desde[d.autor]);
  a.decisiones = ultimaPor(validas, 'usuario');
  a.organizadores = new Set(creador ? [creador] : []);
  for (const d of Object.values(a.decisiones)) if (d.admin && d.aprobado) a.organizadores.add(d.usuario);

  // Ajustes del viaje: el más nuevo de algún organizador; si no hay, el registro original.
  const ajuste = de('ajustes').filter(x => a.organizadores.has(x.autor) && x.viaje).sort((x, y) => y.fecha - x.fecha)[0];
  a.viaje = base ? { ...base, ...(ajuste ? ajuste.viaje : {}), id: base.id, autor: creador } : null;

  // Lo que ocultó un organizador (vale la marca más nueva sobre cada cosa)
  const ocs = ultimaPor(de('oculto').filter(o => a.organizadores.has(o.autor)), 'registro');
  a.ocultosLista = Object.values(ocs).filter(o => o.oculto);
  a.ocultos = new Set(a.ocultosLista.map(o => o.registro));
  // Reportar y bloquear: lo que reporté o lo de alguien que bloqueé deja de verse para mí.
  a.bloqueados = new Set(Object.values(ultimaPor(de('bloqueo').filter(b => b.autor === a.yo), 'usuario')).filter(b => b.bloqueado).map(b => b.usuario));
  const misReportes = new Set(de('reporte').filter(r => r.autor === a.yo).map(r => r.registro));
  const existe = new Set(vivos.map(s => s.id));
  a.reportes = a.organizadores.has(a.yo)
    ? de('reporte').filter(r => a.miembros[r.autor] && !a.ocultos.has(r.registro) && existe.has(r.registro)).sort((x, y) => y.fecha - x.fecha) : [];

  // Perfiles armados: los cargan los organizadores. Cada uno es del primero que lo eligió (y no lo liberaron).
  a.fichas = de('ficha').filter(f => a.organizadores.has(f.autor) && !a.ocultos.has(f.id)).sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0) || x.nombre.localeCompare(y.nombre));
  const ids = new Set(a.fichas.map(f => f.id));
  const libs = de('liberacion').filter(l => a.organizadores.has(l.autor));
  const recs = de('reclamo').filter(r => ids.has(r.ficha) && a.miembros[r.autor] && !libs.some(l => l.ficha === r.ficha && l.usuario === r.autor && l.fecha >= r.fecha))
    .sort((x, y) => x.fecha - y.fecha || x.autor.localeCompare(y.autor));
  a.duenoFicha = {}; a.fichaDe = {};
  for (const r of recs) if (!a.duenoFicha[r.ficha] && !a.fichaDe[r.autor]) { a.duenoFicha[r.ficha] = r.autor; a.fichaDe[r.autor] = r.ficha; }
  a.miReclamoPerdido = !a.fichaDe[a.yo] && vivos.some(s => s.tipo === 'reclamo' && s.autor === a.yo);
  // Documentos: solo los ven el dueño y los organizadores (y van cifrados igual).
  a.llaves = de('llave').filter(l => a.miembros[l.autor]);
  a.accesos = Object.fromEntries(de('acceso').map(x => [x.id, x]));
  a.documentos = de('documento').filter(d => {
    const dueno = a.duenoDe(d.persona);
    return (a.organizadores.has(d.autor) || d.autor === dueno) && (a.organizadores.has(a.yo) || dueno === a.yo);
  }).sort((x, y) => y.fecha - x.fecha);

  const ok = x => a.cuenta(x.autor) && !a.ocultos.has(x.id);
  const visible = x => ok(x) && !a.bloqueados.has(x.autor) && !misReportes.has(x.id);
  a.mensajes = de('mensaje').filter(visible).sort((x, y) => x.fecha - y.fecha);
  a.ubicaciones = {};
  for (const u of de('ubicacion').filter(u => ok(u) && (a.miembros[u.autor]?.comparteUbicacion ?? true))) {
    const x = a.ubicaciones[u.autor];
    if (!x || u.fecha > x.fecha) a.ubicaciones[u.autor] = u;
  }
  a.juegos = de('juego').filter(ok).sort((x, y) => x.fecha - y.fecha);
  a.puntajes = de('puntaje').filter(ok).sort((x, y) => y.fecha - x.fecha);
  a.tareas = de('tarea').filter(ok).sort((x, y) => (x.dia ?? Infinity) - (y.dia ?? Infinity) || x.titulo.localeCompare(y.titulo));
  a.marcas = de('marca').filter(ok);
  a.gastos = de('gasto').filter(ok).sort((x, y) => y.fecha - x.fecha);
  a.eventos = de('evento').filter(ok).sort((x, y) => x.inicio - y.inicio);
  a.encuestas = de('encuesta').filter(ok).sort((x, y) => y.fecha - x.fecha);
  a.votos = de('voto').filter(ok);
  // MVP del viaje: vale el último voto de cada uno; no a uno mismo; solo gente aprobada.
  a.votosMVP = Object.fromEntries(Object.values(ultimaPor(de('mvp').filter(x => a.cuenta(x.autor) && a.cuenta(x.candidato) && x.candidato !== x.autor), 'autor')).map(x => [x.autor, x.candidato]));
  a.fotos = de('foto').filter(visible).sort((x, y) => y.fecha - x.fecha);
  a.sorteos = de('equipos').filter(ok).sort((x, y) => y.fecha - x.fecha);
  a.valijas = {};
  for (const v of de('valija').filter(v => a.cuenta(v.autor))) if (!a.valijas[v.autor] || v.fecha > a.valijas[v.autor].fecha) a.valijas[v.autor] = v;
  a.decomisos = de('decomiso').filter(ok).sort((x, y) => y.fecha - x.fecha);
  revisarRevelacion();
}

// ── Cálculos

const noLeidos = () => a.mensajes.filter(m => m.fecha > a.leidosHasta && m.autor !== a.yo).length;
function hecha(t) {
  const ms = a.marcas.filter(m => m.tarea === t.id);
  return ms.length ? ms.reduce((x, y) => (y.fecha > x.fecha ? y : x)).hecha : false;
}
function totales(j) {
  const suma = {};
  for (const p of a.puntajes.filter(p => p.juego === j.id)) suma[p.jugador] = (suma[p.jugador] || 0) + p.puntos;
  return Object.entries(suma).map(([jugador, puntos]) => ({ jugador, puntos }))
    .sort((x, y) => j.ganaMayor ? y.puntos - x.puntos : x.puntos - y.puntos);
}
/** MVP del viaje: más votos primero; empate = mismo puesto y orden alfabético. */
function rankingMVP() {
  const por = {};
  for (const [votante, c] of Object.entries(a.votosMVP)) (por[c] ||= []).push(votante);
  const filas = Object.entries(por).map(([usuario, vs]) => ({ usuario, votos: vs.length, votantes: vs.sort((x, y) => a.nombre(x).localeCompare(a.nombre(y))) }))
    .sort((x, y) => y.votos - x.votos || a.nombre(x.usuario).localeCompare(a.nombre(y.usuario)));
  filas.forEach((f, i) => { f.puesto = i > 0 && filas[i - 1].votos === f.votos ? filas[i - 1].puesto : i + 1; });
  return filas;
}
function votarMVP(candidato) {
  if (!candidato || candidato === a.yo) return;
  guardar('mvp', Nuevo.mvp(candidato));
}

function rankingGeneral(porPosiciones) {
  const total = {}, ganados = {};
  for (const m of a.aprobados) total[m.autor] = 0;
  for (const j of a.juegos) {
    totales(j).forEach((f, i) => {
      total[f.jugador] = (total[f.jugador] || 0) + (porPosiciones ? (PUNTOS_POR_PUESTO[i] ?? 1) : f.puntos);
      if (i === 0) ganados[f.jugador] = (ganados[f.jugador] || 0) + 1;
    });
  }
  return Object.entries(total).map(([jugador, puntos]) => ({ jugador, puntos, ganados: ganados[jugador] || 0 })).sort((x, y) => y.puntos - x.puntos);
}
function saldos() {
  const s = {};
  for (const m of a.aprobados) s[m.autor] = 0;
  for (const g of a.gastos) {
    if (!g.entre.length) continue;
    s[g.pagador] = (s[g.pagador] || 0) + g.monto;
    const parte = g.monto / g.entre.length;
    for (const p of g.entre) s[p] = (s[p] || 0) - parte;
  }
  return s;
}
function transferencias() {
  const s = saldos();
  const deudores = Object.entries(s).filter(([, v]) => v < -0.5).map(([k, v]) => [k, -v]).sort((x, y) => y[1] - x[1]);
  const acreedores = Object.entries(s).filter(([, v]) => v > 0.5).sort((x, y) => y[1] - x[1]);
  const salida = [];
  let i = 0, j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const monto = Math.min(deudores[i][1], acreedores[j][1]);
    salida.push({ de: deudores[i][0], a: acreedores[j][0], monto });
    deudores[i][1] -= monto; acreedores[j][1] -= monto;
    if (deudores[i][1] < 0.5) i++;
    if (acreedores[j][1] < 0.5) j++;
  }
  return salida;
}
/** Reparte a la gente en equipos. Parejos: por el ranking general, en ida y vuelta, así ningún equipo junta a todos los mejores. */
function armarEquipos(gente, cantidad, parejos) {
  if (cantidad < 1) return [];
  let orden = mezclar(gente);
  if (parejos) {
    const pts = Object.fromEntries(rankingGeneral(true).map(f => [f.jugador, f.puntos]));
    orden.sort((x, y) => (pts[y] || 0) - (pts[x] || 0));
  }
  const equipos = Array.from({ length: cantidad }, () => []);
  orden.forEach((u, i) => {
    const vuelta = i / cantidad | 0, pos = i % cantidad;
    equipos[vuelta % 2 === 0 ? pos : cantidad - 1 - pos].push(u);
  });
  return mezclar(equipos);
}

// ── Destino sorpresa

const esSorpresa = () => a.viaje?.destinoOculto === true && !!a.viaje?.destino;
const reveladoAca = () => leerLS(`revelado-${a.viajeID}`, false);
function destinoVisible() {
  const v = a.viaje;
  if (!esSorpresa() || !v) return true;
  return a.soyAdmin || v.revelado === true || reveladoAca() || (v.revelarA != null && v.revelarA <= ahora());
}
const destinoParaMostrar = () => !a.viaje?.destino ? '' : destinoVisible() ? a.viaje.destino : 'Destino secreto';
function chequearAeropuerto(lat, lon) {
  const v = a.viaje;
  if (!esSorpresa() || destinoVisible() || v.aeropuertoLat == null) return;
  if (distanciaM(lat, lon, v.aeropuertoLat, v.aeropuertoLon) <= RADIO_AEROPUERTO) {
    guardarLS(`revelado-${a.viajeID}`, true);
    guardar('mensaje', Nuevo.mensaje(`✈️ ${a.perfil?.nombre ?? 'Alguien'} llegó al aeropuerto y ya sabe el destino`, 'sistema'));
    revisarRevelacion();
    render();
  }
}
let mostrarRevelacion = false;
function revisarRevelacion() {
  if (esSorpresa() && destinoVisible() && !a.soyAdmin && !leerLS(`revelacionVista-${a.viajeID}`, false)) mostrarRevelacion = true;
}

// ── Avisos con la página abierta en segundo plano

function avisarLocal(nuevos) {
  if (!nuevos.length || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  for (const m of nuevos.slice(-3)) {
    const quien = `${a.emoji(m.autor)} ${a.nombre(m.autor)}`;
    try { new Notification(quien, { body: m.texto, icon: 'icono-192.png', tag: m.id }); } catch {}
  }
}

// ───────────────────────── Ubicación (solo con la página abierta)

const ubicacion = {
  vigia: null, actual: null, ultimoEnvio: 0, ultimoPunto: null, bateria: null, error: null,
  get comparto() { return leerLS('comparto', true); },
  arrancar() {
    if (this.vigia != null || !navigator.geolocation || !a.viajeID) return;
    navigator.getBattery?.().then(b => { this.bateria = b; }).catch(() => {});
    this.vigia = navigator.geolocation.watchPosition(p => this.nueva(p), e => { this.error = e.code === 1 ? 'denegada' : 'sin señal'; },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  },
  detener() { if (this.vigia != null) navigator.geolocation.clearWatch(this.vigia); this.vigia = null; },
  nueva(p) {
    const primera = !this.actual;
    this.actual = { lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy };
    this.error = null;
    chequearAeropuerto(this.actual.lat, this.actual.lon);
    const movio = !this.ultimoPunto || distanciaM(this.ultimoPunto.lat, this.ultimoPunto.lon, this.actual.lat, this.actual.lon) > 40;
    if (movio || ahora() - this.ultimoEnvio > 90000) this.enviar();
    if (primera && enElMapa()) mapa.actualizar();
  },
  enviar(forzar = false) {
    if (!this.actual || !a.viajeID || a.esDemo || !this.comparto || a.miEstado !== 'aprobado') return;
    if (!forzar && ahora() - this.ultimoEnvio < 20000) return;
    this.ultimoEnvio = ahora(); this.ultimoPunto = { ...this.actual };
    guardar('ubicacion', { id: `u-${a.viajeID}-${a.yo}`, autor: '', latitud: this.actual.lat, longitud: this.actual.lon,
      precision: Math.round(this.actual.precision), fecha: ahora(), bateria: this.bateria ? this.bateria.level : undefined });
  },
  /** Para "Llegué" y "Estoy acá": la posición de ahora (o la última que tengo). */
  async posicion() {
    if (this.actual) return this.actual;
    if (a.esDemo) { const u = a.ubicaciones[a.yo]; return u ? { lat: u.latitud, lon: u.longitud } : null; }
    return new Promise(r => navigator.geolocation?.getCurrentPosition(p => { this.nueva(p); r(this.actual); }, () => r(null), { enableHighAccuracy: true, timeout: 10000 }) ?? r(null));
  },
};

// ───────────────────────── Buscar lugares (OpenStreetMap)

async function buscarLugar(q, cerca) {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.search = new URLSearchParams({ format: 'jsonv2', limit: '5', 'accept-language': 'es', q });
  if (cerca) u.searchParams.set('viewbox', `${cerca.lon - 0.5},${cerca.lat + 0.5},${cerca.lon + 0.5},${cerca.lat - 0.5}`);
  try {
    const r = await (await fetch(u)).json();
    return r.map(x => ({ nombre: x.name || x.display_name.split(',')[0], detalle: x.display_name, lat: +x.lat, lon: +x.lon }));
  } catch { return []; }
}

// ───────────────────────── Interfaz

const ui = {
  pestana: 0 /* CHAT */, seccion: null, juego: null, seleccion: null, satelite: false, verLugares: true,
  porPosiciones: true, tocado: null, verTodosSorteos: false, soloMias: false, ocultarHechas: false,
  verPasados: false, verQuien: {}, saldoTocado: null, columnas: 3, codigoLink: null, primeraVista: true,
};

const SVG = {
  mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5h11a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"/><path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3"/></svg>',
  juegos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6"/></svg>',
  tareas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 6 1.5 1.5L8 4.5M3.5 12.5 5 14l3-3M3.5 19 5 20.5l3-3M11 6h10M11 12.5h10M11 19h10"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
};

function av(u, tam = 36) {
  const f = a.foto(u);
  return `<span class="av${f ? ' con-foto' : ''}" style="--c:${a.color(u)};width:${tam}px;height:${tam}px;font-size:${tam * 0.55}px;border-width:${tam > 30 ? 2 : 1.5}px">${f ? `<img src="${f}" alt="">` : esc(a.emoji(u))}</span>`;
}
function caraFicha(f, tam = 72) {
  return `<span class="av cara-ficha${f.foto ? ' con-foto' : ''}" style="--c:${color(f.color ?? 0)};width:${tam}px;height:${tam}px;font-size:${tam * 0.42}px">${f.foto ? `<img src="data:image/jpeg;base64,${f.foto}" alt="">` : esc(f.nombre.slice(0, 1))}</span>`;
}
const pila = (us, tam = 22) => `<span class="pila">${us.map(u => av(u, tam)).join('')}</span>`;
const vacio = (ico, titulo, texto) => `<div class="vacio"><div class="ico">${ico}</div><b>${esc(titulo)}</b>${esc(texto)}</div>`;
const titulo = (t, extra = '', volver = '') => `<div class="titulo">${volver}<h1>${esc(t)}</h1>${extra}</div>`;
const volverA = (accion, texto) => `<button class="volver" data-a="${accion}">‹ ${esc(texto)}</button>`;

function avisar(texto, bien = false) {
  const el = $('#aviso');
  el.textContent = texto; el.className = bien ? 'bien' : ''; el.hidden = false;
  clearTimeout(avisar.t); avisar.t = setTimeout(() => { el.hidden = true; }, 3500);
}
$('#aviso').addEventListener('click', () => { $('#aviso').hidden = true; a.error = null; });

// ── Pintar

function render() {
  const animar = !!ui.cambioDeVista || ui.primeraVista;   // las barras se animan al entrar, no en cada sincronización
  ui.primeraVista = false;
  const v = $('#vista'), nav = $('#pestanas');
  let html, conPestanas = false, clase = '';

  if (!a.perfil) html = vBienvenida();
  else if (!a.viajeID) html = vInicio();
  else if (a.debeElegirFicha) html = vQuienSos(true);
  else if (!a.viaje || !a.miembros[a.yo]) html = vConectando();
  else if (a.miEstado !== 'aprobado') html = vEspera(a.miEstado === 'rechazado');
  else {
    conPestanas = true;
    if (ui.pestana === CHAT) { html = vChat(); clase = 'chat'; }
    else if (ui.pestana === RANKING) html = ui.juego ? vJuego() : vJuegos();
    else html = ui.seccion ? ({ mapa: vMapa, tareas: vTareas, gastos: vGastos, agenda: vAgenda, votaciones: vVotaciones, fotos: vFotos, valija: vValija, grupo: vGrupo, organizar: vOrganizar, documentos: vDocumentos, perfiles: vPerfiles })[ui.seccion]() : vMas();
  }

  const scrollAntes = window.scrollY;
  v.innerHTML = html;
  v.className = conPestanas ? clase : 'sin-pestanas';
  nav.hidden = !conPestanas;
  if (conPestanas) nav.innerHTML = pestanas();
  const enMapa = conPestanas && enElMapa();
  $('#mapa-caja').hidden = !enMapa;
  if (enMapa) mapa.mostrar(); else mapa.ocultar();
  redactar.mostrar(conPestanas && ui.pestana === CHAT);
  if (conPestanas && ui.pestana === CHAT) chatAlFondo();
  else if (!ui.cambioDeVista) window.scrollTo(0, scrollAntes);
  if (ui.cambioDeVista) { window.scrollTo(0, 0); ui.cambioDeVista = false; }

  if (a.error && a.error !== render.ultimoError) avisar(a.error);
  render.ultimoError = a.error;
  if (mostrarRevelacion && conPestanas && !$('.revelacion')) pintarRevelacion();
  // Los que ya estaban en el viaje: una vez, "¿sos alguno de estos?" para tomar su perfil armado.
  if (conPestanas && !hoja && a.fichasLibres.length && !a.fichaDe[a.yo] && !leerLS(`fichaOfrecida-${a.viajeID}`)) {
    guardarLS(`fichaOfrecida-${a.viajeID}`, true);
    hojas.quienSos();
  }
  animarBarras(animar);
}

function animarBarras(animar = true) {
  const poner = () => {
    document.querySelectorAll('[data-ancho]').forEach(el => { el.style.width = el.dataset.ancho; });
    document.querySelectorAll('[data-arco]').forEach(el => { el.style.strokeDashoffset = el.dataset.arco; });
    document.querySelectorAll('[data-dash]').forEach(el => { el.style.strokeDasharray = el.dataset.dash; });
  };
  if (!animar) {   // sin animación: se ponen ya, sin transición
    document.querySelectorAll('[data-ancho],[data-arco],[data-dash]').forEach(el => { el.style.transition = 'none'; });
    poner();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(poner));
  setTimeout(poner, 150);   // por si la pestaña está en segundo plano y no hay cuadros de animación
}

// Abajo solo Chat y Ranking; todo lo demás (mapa, tareas, gastos, agenda…) está en Más.
const CHAT = 0, RANKING = 1, MAS = 2;
const enElMapa = () => ui.pestana === MAS && ui.seccion === 'mapa';
function pestanas() {
  const nl = ui.pestana === CHAT ? 0 : noLeidos(), pend = a.soyAdmin ? a.pendientes.length : 0;
  const p = [['Chat', SVG.chat, nl], ['Ranking', SVG.juegos], ['Más', SVG.mas, pend]];
  return p.map(([t, ico, n], i) => `<button data-a="pestana" data-i="${i}" class="${ui.pestana === i ? 'si' : ''}">${ico}${t}${n ? `<span class="globo">${n}</span>` : ''}</button>`).join('');
}

// ── Bienvenida, inicio y espera

let borrador = { nombre: '', emoji: '🧉', color: 0 };
function vBienvenida() {
  return `
    <img class="logo" src="flor.png" alt="">
    <h1 class="marca">Colonia</h1>
    <p class="bajada">El viaje con amigos, todo en un lugar:<br>dónde está cada uno, chat, juegos, tareas y cuentas.</p>
    ${bannerApp()}
    <div class="tarjeta">
      <label class="et" style="margin-top:0">¿Cómo te llamás?</label>
      <input class="campo" data-campo-b="nombre" placeholder="Tu nombre o apodo" value="${esc(borrador.nombre)}" autocapitalize="words" maxlength="30">
      <label class="et">Elegí tu emoji</label>
      <div class="emojis" style="--c:${color(borrador.color)}">${EMOJIS.map(e => `<button data-a="b-emoji" data-v="${e}" class="${e === borrador.emoji ? 'si' : ''}">${e}</button>`).join('')}</div>
      <label class="et">Tu color</label>
      <div class="colores">${COLORES.map((c, i) => `<button data-a="b-color" data-i="${i}" style="--c:${c}" class="${i === borrador.color ? 'si' : ''}" aria-label="Color ${i + 1}"></button>`).join('')}</div>
    </div>
    <button class="boton ancho" style="margin-top:18px" data-a="empezar" ${borrador.nombre.trim() ? '' : 'disabled'}>Empezar</button>
    <p class="pie" style="text-align:center">Al usar Colonia aceptás no publicar nada ofensivo ni abusivo. Cualquiera puede reportar un mensaje o una foto, o bloquear a otra persona.</p>`;
}

function bannerApp() {
  if (!esIOS || !ui.codigoLink) return '';
  return `<div class="tarjeta banner-app"><img src="icono-180.png" alt=""><div class="crece" style="flex:1">
    <b>¿Tenés la app Colonia?</b><div class="chico">Abrí la invitación ahí. Si no la tenés, seguí acá.</div></div>
    <a class="boton chico" href="colonia://unirse?c=${esc(ui.codigoLink)}">Abrir</a></div>`;
}

let inicioCampos = { link: '', nombre: '', destino: '' };
function vInicio() {
  const p = a.perfil;
  const ck = a.cloudkitError
    ? `<div class="tarjeta" style="margin-bottom:14px"><b>No se pudo conectar con iCloud</b><div class="chico" style="margin-top:4px">${esc(a.cloudkitError)}</div></div>`
    : !a.cloudkitListo ? `<div class="cargando oscuro"></div>`
    : !a.conectado ? `<div class="tarjeta" style="margin-bottom:14px">
        <b>Entrá con tu Apple ID</b>
        <div class="chico" style="margin:4px 0 10px">Es la misma cuenta del iPhone (iCloud). Con eso el grupo sabe que sos vos, en la app o en la web. Si usás Android, sirve cualquier Apple ID; si no tenés, se crea gratis desde la misma ventana.</div>
        <div class="apple"><button class="boton apple-propio" data-a="entrar-apple"> Entrar con Apple ID</button></div>
      </div>` : '';
  const listo = a.conectado && !a.cargando;
  const cod = codigoDe(inicioCampos.link);
  return `
    <div class="titulo"><span style="font-size:36px">${esc(p.emoji)}</span><h1 style="font-size:24px">Hola${p.nombre ? `, ${esc(p.nombre)}` : ''}<div class="chico" style="font-weight:400;margin-top:2px">¿Armás un viaje o te sumás a uno?</div></h1>
      <button class="icono-b" data-a="cambiar-perfil" title="Cambiar perfil">👤</button></div>
    ${bannerApp()}
    ${ck}
    <div class="tarjeta">
      <b>🔗 Me invitaron</b>
      <div class="chico" style="margin:4px 0 10px">Tocá el link que te pasaron, o pegá acá el link o el código de 8 letras.</div>
      <input class="campo" data-campo-i="link" placeholder="sscg.tech/colonia/?c=… o ABCD2345" value="${esc(inicioCampos.link)}" autocapitalize="characters" autocomplete="off">
      <button class="boton ancho" style="margin-top:10px" data-a="unirse" ${listo && cod ? '' : 'disabled'}>Pedir para unirme</button>
    </div>
    <div class="tarjeta">
      <b>⛺️ Organizo yo</b>
      <div class="chico" style="margin:4px 0 10px">Creás el viaje, invitás con un link y aprobás a cada uno que pide entrar. Después podés sumar más organizadores.</div>
      <input class="campo" data-campo-i="nombre" placeholder="Nombre del viaje (ej: Bariloche 2027)" value="${esc(inicioCampos.nombre)}" maxlength="40">
      <input class="campo" style="margin-top:8px" data-campo-i="destino" placeholder="Destino (opcional)" value="${esc(inicioCampos.destino)}" maxlength="60">
      <button class="boton ancho" style="margin-top:10px" data-a="crear" ${listo && inicioCampos.nombre.trim() ? '' : 'disabled'}>Crear viaje</button>
    </div>
    ${a.cargando ? '<div class="cargando oscuro"></div>' : ''}
    <div class="centro" style="margin-top:18px"><button class="enlace" data-a="demo">✨ Probar con un viaje de ejemplo</button></div>
    <p class="pie centro" style="margin-top:24px">También está la app para iPhone. <a href="../instalar/">Cómo instalarla</a></p>
    ${a.conectado ? '<p class="centro"><button class="enlace" style="font-size:13px" data-a="salir-apple">Salir de mi Apple ID</button></p>' : ''}`;
}

function vConectando() {
  if (a.cloudkitListo && !a.conectado && !a.esDemo) {
    return `<div class="espera"><img class="logo" src="flor.png" alt="" style="margin:0 auto">
      <b style="font-size:20px">Entrá con tu Apple ID</b><div class="chico" style="max-width:320px">Tu sesión se cerró. Volvé a entrar para seguir en ${esc(a.viaje?.nombre ?? 'el viaje')}.</div>
      <div class="apple"><button class="boton apple-propio" data-a="entrar-apple"> Entrar con Apple ID</button></div>${a.cloudkitError ? `<div class="chico">${esc(a.cloudkitError)}</div>` : ''}
      <button class="boton peligro" style="margin-top:20px" data-a="salir-ya">Salir del viaje</button></div>`;
  }
  return `<div class="espera"><div class="cargando oscuro"></div><div class="chico">Conectando con el grupo…</div>
    ${a.error ? `<button class="boton gris chico" data-a="salir-ya">Salir y usar otro link</button>` : ''}</div>`;
}

let noEstoy = { abierto: false, nombre: '' };
function vQuienSos(obligatorio) {
  setTimeout(() => { vQuienSos.ya = obligatorio; }, 0);   // las caras se animan al aparecer, no en cada sincronización
  const pide = !a.miembros[a.yo];
  return `<div class="quien-sos">
    <h1 class="marca" style="font-size:34px;margin:10px 0 4px">¿Quién sos?</h1>
    <p class="chico centro">${a.miReclamoPerdido ? 'El perfil que habías elegido quedó libre (lo liberó un organizador o alguien lo eligió antes). Elegí el tuyo.' : 'Tocá tu cara. Queda atado a tu Apple ID y nadie más lo puede elegir.'}</p>
    ${a.viaje ? `<p class="centro" style="margin:2px 0 14px;color:var(--acento);font-weight:700;font-size:13px">${esc(a.viaje.nombre)}</p>` : ''}
    <div class="caras${vQuienSos.ya === obligatorio ? '' : ' animar'}">${a.fichasLibres.map((f, i) => `<button data-a="elegir-ficha" data-id="${esc(f.id)}" style="animation-delay:${i * 30}ms">${caraFicha(f, 84)}<b>${esc(f.nombre)}</b></button>`).join('')}</div>
    <div class="tarjeta" style="margin-top:18px">
      <button class="enlace" data-a="no-estoy" style="font-weight:600">No estoy en la lista</button>
      ${noEstoy.abierto ? `${pide ? `<input class="campo" style="margin-top:8px" data-campo-n placeholder="Tu nombre o apodo" value="${esc(noEstoy.nombre)}" autocapitalize="words" maxlength="30">` : ''}
        <div class="chico" style="margin:6px 0 8px">${obligatorio ? 'Pedís entrar como siempre y un organizador te aprueba.' : 'Seguís con tu nombre y tu emoji.'}</div>
        <button class="boton chico" data-a="no-estoy-ok">${obligatorio ? 'Pedir para entrar' : 'Listo'}</button>` : ''}
    </div>
    ${obligatorio ? '<p class="centro"><button class="enlace" style="color:var(--rojo);font-size:13px;margin-top:14px" data-a="salir-ya">Salir y usar otro link</button></p>' : ''}
  </div>`;
}

function vEspera(rechazado) {
  const v = a.viaje;
  return `<div class="espera">
    <div class="grande">${rechazado ? '🙅' : '⏳'}</div>
    <h1 style="margin:0;font-size:24px">${rechazado ? 'El organizador no aprobó tu pedido' : 'Esperando que te aprueben'}</h1>
    <p class="chico" style="font-size:15px;max-width:340px">${rechazado
      ? `Si creés que es un error, hablá con quien organiza ${esc(v?.nombre ?? 'el viaje')}.`
      : `Pediste entrar a <b>${esc(v?.nombre ?? 'el viaje')}</b>. Apenas ${esc(a.nombre(v?.autor))} te acepte, se abre solo.`}</p>
    <button class="boton peligro" style="margin-top:30px" data-a="salir-ya">Salir y usar otro link</button></div>`;
}

// ── Mapa (Leaflet + OpenStreetMap)

const mapa = {
  m: null, capas: {}, pines: new Map(), eventos: [], yoPin: null, primeraVez: true,
  crear() {
    if (this.m || !window.L) return;
    this.m = L.map('mapa', { zoomControl: false, attributionControl: true }).setView([-34.6, -58.4], 12);
    this.capas.calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    this.capas.satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '© Esri' });
    this.capas.calles.addTo(this.m);
    $('#mapa').classList.add('claro-oscuro');
    this.m.on('click', () => { if (ui.seleccion) { ui.seleccion = null; render(); } });
  },
  mostrar() {
    this.crear();
    if (!this.m) return;
    setTimeout(() => this.m.invalidateSize(), 0);
    const quiero = ui.satelite ? 'satelite' : 'calles', otra = ui.satelite ? 'calles' : 'satelite';
    if (!this.m.hasLayer(this.capas[quiero])) { this.m.removeLayer(this.capas[otra]); this.capas[quiero].addTo(this.m); }
    $('#mapa').classList.toggle('claro-oscuro', !ui.satelite);
    this.actualizar();
    if (this.primeraVez) { this.primeraVez = false; this.verTodos(false); }
  },
  ocultar() {},
  actualizar() {
    if (!this.m) return;
    const vistos = new Set();
    for (const u of Object.values(a.ubicaciones)) {
      vistos.add(u.autor);
      const viejo = ahora() - u.fecha > 900000, elegido = ui.seleccion === u.autor;
      const html = `<div class="pin ${viejo ? 'viejo' : ''} ${elegido ? 'elegido' : ''}" style="--c:${a.color(u.autor)}"><div class="onda"></div><div class="cara">${a.foto(u.autor) ? `<img src="${a.foto(u.autor)}" alt="">` : esc(a.emoji(u.autor))}</div><div class="cola"></div></div>`;
      let p = this.pines.get(u.autor);
      if (!p) {
        p = L.marker([u.latitud, u.longitud], { icon: L.divIcon({ html, className: '', iconSize: [54, 62], iconAnchor: [27, 60] }), zIndexOffset: elegido ? 1000 : 0 })
          .on('click', e => { L.DomEvent.stopPropagation(e); ui.seleccion = ui.seleccion === u.autor ? null : u.autor; if (ui.seleccion) this.centrar(ui.seleccion); render(); })
          .addTo(this.m);
        p.html = html;
        this.pines.set(u.autor, p);
      } else {
        p.setLatLng([u.latitud, u.longitud]);
        if (p.html !== html) { p.setIcon(L.divIcon({ html, className: '', iconSize: [54, 62], iconAnchor: [27, 60] })); p.html = html; }
        p.setZIndexOffset(elegido ? 1000 : 0);
      }
      if (p.circulo) { this.m.removeLayer(p.circulo); p.circulo = null; }
      if (elegido) p.circulo = L.circle([u.latitud, u.longitud], { radius: Math.max(u.precision || 10, 10), color: a.color(u.autor), weight: 1, fillOpacity: 0.15 }).addTo(this.m);
    }
    for (const [k, p] of this.pines) if (!vistos.has(k)) { this.m.removeLayer(p); if (p.circulo) this.m.removeLayer(p.circulo); this.pines.delete(k); }
    this.eventos.forEach(e => this.m.removeLayer(e)); this.eventos = [];
    if (ui.verLugares && destinoVisible()) {
      for (const e of a.eventos.filter(e => e.latitud != null)) {
        this.eventos.push(L.marker([e.latitud, e.longitud], { icon: L.divIcon({ html: '<div class="evento-pin">📅</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] }) })
          .bindTooltip(`${esc(e.titulo)} · ${fmt(e.inicio, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`).addTo(this.m));
      }
    }
    const yo = ubicacion.actual;
    if (yo && !a.esDemo) {
      if (!this.yoPin) this.yoPin = L.marker([yo.lat, yo.lon], { icon: L.divIcon({ html: '<div class="yo-pin"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: -100 }).addTo(this.m);
      else this.yoPin.setLatLng([yo.lat, yo.lon]);
    }
  },
  centrar(u) { const x = a.ubicaciones[u]; if (x) this.m.flyTo([x.latitud, x.longitud], 17, { duration: 0.8 }); },
  verTodos(animar = true) {
    if (!this.m) return;
    const puntos = Object.values(a.ubicaciones).map(u => [u.latitud, u.longitud]);
    if (ubicacion.actual && !a.esDemo) puntos.push([ubicacion.actual.lat, ubicacion.actual.lon]);
    if (!puntos.length) {
      if (destinoVisible() && a.viaje?.latitud != null) this.m.setView([a.viaje.latitud, a.viaje.longitud], 14);
      return;
    }
    ui.seleccion = null;
    this.m.flyToBounds(L.latLngBounds(puntos).pad(0.3), { maxZoom: 17, duration: animar ? 0.8 : 0.01 });
  },
};

function vMapa() {
  const tit = destinoParaMostrar() || a.viaje.nombre;
  const s = ui.seleccion && a.ubicaciones[ui.seleccion];
  const abajoAlto = s ? 190 : 100;
  return `
    <div class="mapa-cab"><button class="flotante volver-mapa" data-a="volver-mas">‹</button><div class="nombre">${esc(tit)}</div><span class="espacio"></span>
      <div class="flotante controles" style="position:static;flex-direction:row">
        <button data-a="satelite" class="${ui.satelite ? 'si' : ''}" title="Satélite">🛰️</button>
        <button data-a="lugares" class="${ui.verLugares ? 'si' : ''}" title="Lugares de la agenda">📅</button>
      </div></div>
    ${a.viaje.aviso ? `<div class="mapa-aviso">${avisoFijo()}</div>` : ''}
    <div class="flotante controles" style="bottom:calc(${abajoAlto}px + 57px + var(--abajo))">
      <button data-a="zoom" data-v="1" title="Acercar">＋</button>
      <button data-a="zoom" data-v="-1" title="Alejar">－</button>
      <button data-a="yo-mapa" title="Dónde estoy">➤</button>
      <button data-a="todos-mapa" title="Ver a todos">👥</button>
    </div>
    <div class="mapa-abajo">
      ${s ? fichaMapa(s) : ''}
      <div class="tira">${a.aprobados.map(m => {
        const u = a.ubicaciones[m.autor];
        const punto = !u ? 'gray' : ahora() - u.fecha < 900000 ? 'var(--verde)' : 'orange';
        return `<button data-a="tira" data-u="${esc(m.autor)}" class="${!u ? 'apagado' : ''} ${ui.seleccion === m.autor ? 'si' : ''}">
          <span style="position:relative">${av(m.autor, 42)}<span class="punto" style="background:${punto}"></span></span>
          <span class="n">${esc(a.nombre(m.autor))}</span><span class="h">${u ? haceCuanto(u.fecha) : 'sin ubicación'}</span></button>`;
      }).join('')}</div>
    </div>`;
}

function fichaMapa(u) {
  const datos = [`🕐 ${haceCuanto(u.fecha)}`];
  if (ubicacion.actual && !a.esDemo) datos.push(`🚶 ${distancia(distanciaM(ubicacion.actual.lat, ubicacion.actual.lon, u.latitud, u.longitud))}`);
  if (u.bateria != null) datos.push(`<span style="color:${u.bateria < 0.2 ? 'var(--rojo)' : 'inherit'}">🔋 ${Math.round(u.bateria * 100)}%</span>`);
  const destino = esIOS ? `https://maps.apple.com/?daddr=${u.latitud},${u.longitud}&dirflg=w` : `https://www.google.com/maps/dir/?api=1&destination=${u.latitud},${u.longitud}&travelmode=walking`;
  return `<div class="flotante ficha">${av(u.autor, 44)}<div style="flex:1;min-width:0"><b>${esc(a.nombre(u.autor))}</b><div class="datos">${datos.join('')}</div></div>
    <a class="icono-b" style="font-size:26px" href="${destino}" target="_blank" rel="noopener" title="Cómo llegar">🧭</a></div>`;
}

// ── Chat

function vChat() {
  let html = titulo('Chat') + avisoFijo(), anterior = null;
  if (!a.mensajes.length) html += vacio('💬', 'Todavía no hay mensajes', 'Escribí el primero o avisá que llegaste.');
  for (const m of a.mensajes) {
    if (!anterior || inicioDia(anterior.fecha) !== inicioDia(m.fecha)) html += `<div class="dia">${fmt(m.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
    html += burbuja(m, !anterior || anterior.autor !== m.autor || anterior.clase === 'sistema');
    anterior = m;
  }
  return html;
}

const textoEnlace = e => ({ tarea: 'Ver tarea', encuesta: 'Votar', evento: 'Ver en la agenda', juego: 'Ver juego', equipos: 'Ver equipos', fotos: 'Ver fotos', decomiso: 'Ver decomiso' })[e.split(':')[0]] || 'Ver';

function burbuja(m, mostrarNombre) {
  if (m.clase === 'sistema') {
    if (!m.enlace) return `<div class="sistema"><span>${esc(m.texto)}</span></div>`;
    return `<div class="sistema anuncio"><span>${esc(m.texto)}<button class="ver-enlace" data-a="abrir-enlace" data-e="${esc(m.enlace)}">${esc(textoEnlace(m.enlace))} ›</button><i>${hora(m.fecha)}</i></span></div>`;
  }
  const mio = m.autor === a.yo;
  let cont;
  if (m.clase === 'llegue' || m.clase === 'ubicacion') {
    cont = `<button class="accion" data-a="ir-mapa" data-u="${esc(m.autor)}" data-lat="${m.latitud ?? ''}" data-lon="${m.longitud ?? ''}">${m.clase === 'llegue' ? '✅' : '📍'} ${esc(m.texto)} ›</button>`;
  } else if (m.clase === 'dondeEstas') {
    cont = esc(m.texto);
    if (m.para === a.yo) cont += `<div style="margin-top:6px"><button class="boton chico" data-a="mandar-ubicacion">Mandar mi ubicación</button></div>`;
    else if (m.para && a.ubicaciones[m.para]) cont += `<div style="margin-top:6px"><button class="enlace" style="font-size:13px;color:inherit" data-a="ir-mapa" data-u="${esc(m.para)}">Ver a ${esc(a.nombre(m.para))} en el mapa ›</button></div>`;
  } else cont = esc(m.texto);
  return `<div class="msj ${mio ? 'mio' : ''} ${mostrarNombre ? 'nuevo-autor' : ''}">
    ${mio ? '' : `<span style="visibility:${mostrarNombre ? 'visible' : 'hidden'}">${av(m.autor, 28)}</span>`}
    <div class="burbuja">${!mio && mostrarNombre ? `<div class="quien" style="color:${a.color(m.autor)}">${esc(a.nombre(m.autor))}</div>` : ''}${cont}<div class="hora">${hora(m.fecha)}${!mio && m.clase !== 'sistema' ? ` · <button class="ocultar-msj" data-a="reportar" data-id="${esc(m.id)}" data-u="${esc(m.autor)}">reportar</button>` : ''}${a.soyAdmin && !mio ? ` · <button class="ocultar-msj" data-a="ocultar" data-id="${esc(m.id)}" data-confirmar="¿Ocultar este mensaje para todos?">ocultar</button>` : ''}</div></div></div>`;
}

const redactar = {
  el: null,
  crear() {
    this.el = document.createElement('div');
    this.el.className = 'redactar';
    this.el.innerHTML = `<div class="por-dentro">
      <div class="atajos">
        <button class="atajo" style="--c:var(--verde)" data-a="llegue">✅ Llegué</button>
        <button class="atajo" style="--c:var(--rojo)" data-a="estoy-aca">📍 Estoy acá</button>
        <button class="atajo" style="--c:var(--azul)" data-a="donde-estas">❓ ¿Dónde estás?</button>
      </div>
      <div class="escribir"><textarea rows="1" placeholder="Mensaje" maxlength="2000"></textarea><button class="enviar" data-a="enviar" disabled aria-label="Enviar">↑</button></div></div>`;
    document.body.appendChild(this.el);
    const t = this.el.querySelector('textarea'), b = this.el.querySelector('.enviar');
    t.addEventListener('input', () => { b.disabled = !t.value.trim(); t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 120)}px`; });
    t.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !esIOS && !/Android/.test(navigator.userAgent)) { e.preventDefault(); acciones.enviar(); } });
  },
  mostrar(si) { if (!this.el) this.crear(); this.el.hidden = !si; },
  get texto() { return this.el.querySelector('textarea'); },
};

let ultimoMensajeVisto = null;
function chatAlFondo() {
  const ultimo = a.mensajes.at(-1)?.id;
  const cerca = window.innerHeight + window.scrollY > document.body.scrollHeight - 260;
  if (ultimo !== ultimoMensajeVisto || ui.cambioDeVista || cerca) {
    const suave = ultimoMensajeVisto && !ui.cambioDeVista;
    requestAnimationFrame(() => { if (ui.pestana === CHAT) window.scrollTo({ top: document.body.scrollHeight, behavior: suave ? 'smooth' : 'auto' }); });
  }
  ultimoMensajeVisto = ultimo;
  if (a.mensajes.length) { a.leidosHasta = ahora(); guardarLS('leidosHasta', a.leidosHasta); }
}

// ── Juegos

function vJuegos() {
  const filas = rankingGeneral(ui.porPosiciones);
  const maximo = Math.max(...filas.map(f => f.puntos), 1);
  const sorteos = a.sorteos.slice(0, ui.verTodosSorteos ? 50 : 1);
  return `${titulo('Ranking y juegos')}
    <button class="equipos-b" data-a="armar-equipos"><span class="ico">🎲</span><span style="flex:1"><b>Armar equipos</b><span class="chico" style="color:#fff;opacity:.85">Para un juego o actividad, al azar</span></span>›</button>
    ${sorteos.map(sorteoPublicado).join('')}
    ${a.sorteos.length > 1 ? `<div class="centro" style="margin-top:8px"><button class="enlace" data-a="ver-sorteos">${ui.verTodosSorteos ? 'Ver menos' : `Ver sorteos anteriores (${a.sorteos.length - 1})`}</button></div>` : ''}
    <div class="tarjeta" style="margin-top:16px">
      <b style="color:#E8920C">🏆 Ranking general</b>
      <div class="segmentos" style="margin:10px 0 6px">
        <button data-a="por-pos" data-v="1" class="${ui.porPosiciones ? 'si' : ''}">Por posiciones</button>
        <button data-a="por-pos" data-v="0" class="${ui.porPosiciones ? '' : 'si'}">Suma de puntos</button></div>
      <div class="mini" style="margin-bottom:8px">${ui.porPosiciones ? 'En cada juego: 1º suma 10, 2º 8, 3º 6, 4º 5, 5º 4, 6º 3, 7º 2, el resto 1.' : 'Suma directa de todos los puntos (sirve si los juegos usan escalas parecidas).'}</div>
      ${filas.map((f, i) => `
        <div class="rank-fila" data-a="tocar-rank" data-u="${esc(f.jugador)}">
          <span class="puesto ${i < 3 ? '' : 'n'}">${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}</span>${av(f.jugador, 30)}
          <span class="crece"><span class="arr"><span class="nom">${esc(a.nombre(f.jugador))}</span>${f.ganados ? `<span class="mini">${f.ganados} 👑</span>` : ''}<span class="pts num">${numero(f.puntos)}</span></span>
          <span class="barra" style="--c:${a.color(f.jugador)}" data-ancho="${Math.max(f.puntos / maximo * 100, 2)}%"></span></span></div>
        ${ui.tocado === f.jugador ? `<div class="detalle-j">${a.juegos.map(j => { const t = totales(j), k = t.findIndex(x => x.jugador === f.jugador); return k < 0 ? '' : `${esc(j.emoji)} ${esc(j.nombre)}: ${k + 1}º con ${numero(t[k].puntos)}<br>`; }).join('') || 'Sin puntajes todavía'}</div>` : ''}`).join('')}
    </div>
    ${vMVP()}
    <h2>Juegos <button class="boton suave chico mas" data-a="nuevo-juego">＋ Nuevo</button></h2>
    ${a.juegos.length ? '' : vacio('🎮', 'Todavía no hay juegos', 'Creá el primero: truco, ping pong, mini golf…')}
    ${a.juegos.map(j => {
      const t = totales(j), lider = t[0];
      return `<button class="tarjeta" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin-top:10px" data-a="abrir-juego" data-id="${esc(j.id)}">
        <span class="juego-emoji">${esc(j.emoji)}</span><span style="flex:1;min-width:0"><b>${esc(j.nombre)}</b><div class="chico">${lider ? (lider.jugador === a.yo ? `Vas primero con ${numero(lider.puntos)}` : `Gana ${esc(a.nombre(lider.jugador))} con ${numero(lider.puntos)}`) : 'Sin puntajes todavía'}</div></span>
        ${pila(t.slice(0, 3).map(x => x.jugador), 26)}<span style="color:var(--tinta-3)">›</span></button>`;
    }).join('')}`;
}

function vMVP() {
  const filas = rankingMVP(), maximo = Math.max(filas[0]?.votos || 1, 1), mio = a.votosMVP[a.yo];
  const candidatos = a.aprobados.filter(m => m.autor !== a.yo);
  return `<div class="tarjeta" style="margin-top:16px">
    <b style="color:#E0A800">⭐️ MVP del viaje</b>
    <div class="mini" style="margin:6px 0 10px">Cada uno vota a una persona (no a sí mismo). Los votos se ven y podés cambiar el tuyo hasta el final.</div>
    <label class="mvp-voto">${mio ? `${av(mio, 24)}<span style="flex:1"><b>Tu voto: ${esc(a.nombre(mio))}</b></span><span class="enlace">Cambiar</span>` : '<span style="flex:1"><b>👆 Votá a tu MVP</b></span>'}
      <select data-mvp aria-label="Elegí tu MVP"${candidatos.length ? '' : ' disabled'}><option value="">${mio ? 'Cambiar mi voto…' : 'Elegí a alguien…'}</option>${candidatos.map(m => `<option value="${esc(m.autor)}"${m.autor === mio ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
    ${filas.length ? '' : '<p class="pie" style="margin:10px 0 0">Todavía nadie votó.</p>'}
    ${filas.map(f => `
      <div class="rank-fila" data-a="tocar-mvp" data-u="${esc(f.usuario)}">
        <span class="puesto ${f.puesto <= 3 ? '' : 'n'}">${f.puesto <= 3 ? ['🥇', '🥈', '🥉'][f.puesto - 1] : `${f.puesto}º`}</span>${av(f.usuario, 30)}
        <span class="crece"><span class="arr"><span class="nom">${esc(a.nombre(f.usuario))}</span><span class="pts num">${f.votos} ${f.votos === 1 ? 'voto' : 'votos'}</span></span>
        <span class="barra" style="--c:${a.color(f.usuario)}" data-ancho="${Math.max(f.votos / maximo * 100, 2)}%"></span></span></div>
      ${ui.tocadoMVP === f.usuario ? `<div class="detalle-j">Lo votaron: ${f.votantes.map(v => esc(a.nombre(v))).join(', ')}</div>` : ''}`).join('')}
  </div>`;
}

function sorteoPublicado(s) {
  return `<div class="tarjeta" style="margin-top:12px" data-registro="${esc(s.id)}">
    <div class="renglon" style="margin-bottom:8px">${av(s.autor, 24)}<span class="chico" style="flex:1">${esc(a.nombre(s.autor))} sorteó · ${haceCuanto(s.fecha)}${s.parejos ? ' · parejos' : ''}</span></div>
    <b>🎲 ${esc(s.titulo)}</b>${botonOcultar(s)}
    <div style="margin-top:8px">${s.equipos.map((eq, i) => tarjetaEquipo(s.nombres[i] || `Equipo ${i + 1}`, eq, color(i * 3))).join('')}</div></div>`;
}
const tarjetaEquipo = (nombre, gente, c) => `<div class="equipo" style="--c:${c}"><b>${esc(nombre)}</b><div class="chips">${gente.map(u => `<span class="chip">${av(u, 22)}${esc(a.nombre(u))}</span>`).join('')}</div></div>`;

function vJuego() {
  const j = a.juegos.find(x => x.id === ui.juego);
  if (!j) { ui.juego = null; return vJuegos(); }
  const t = totales(j);
  return `${titulo(`${j.emoji} ${j.nombre}`, '', volverA('cerrar-juego', 'Juegos'))}
    <div class="renglon" style="gap:10px"><button class="boton" style="flex:1" data-a="cargar-puntos">＋ Cargar puntos</button><button class="boton gris" data-a="armar-equipos" data-juego="${esc(j.id)}">🎲 Equipos</button></div>
    <div class="seccion-t">Posiciones · gana el que ${j.ganaMayor ? 'más' : 'menos'} tiene</div>
    <div class="lista">${t.length ? t.map((f, i) => `<div class="fila"><span class="puesto ${i < 3 ? '' : 'n'}">${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}</span>${av(f.jugador, 28)}<span class="crece">${esc(a.nombre(f.jugador))}</span><b class="num">${numero(f.puntos)}</b></div>`).join('') : '<div class="fila chico">Sin puntajes todavía</div>'}</div>
    <div class="seccion-t">Historial</div>
    <div class="lista">${a.puntajes.filter(p => p.juego === j.id).map(p => `<div class="fila">${av(p.jugador, 24)}<span class="crece">${esc(a.nombre(p.jugador))}</span><span class="num">${p.puntos >= 0 ? '+' : ''}${numero(p.puntos)}</span><span class="mini">${haceCuanto(p.fecha)}</span>${p.autor === a.yo ? `<button class="borrar" data-a="borrar" data-tipo="puntaje" data-id="${esc(p.id)}">✕</button>` : botonOcultar(p)}</div>`).join('') || '<div class="fila chico">Nada cargado todavía</div>'}</div>
    ${j.autor === a.yo ? `<div class="centro" style="margin-top:20px"><button class="boton peligro" data-a="borrar" data-tipo="juego" data-id="${esc(j.id)}" data-confirmar="¿Borrar el juego?">Borrar juego</button></div>` : a.soyAdmin ? `<div class="centro" style="margin-top:20px">${botonOcultar(j, '¿Ocultar el juego para todos? Deja de contar en el ranking.')}</div>` : ''}`;
}

// ── Tareas

function vTareas() {
  const lst = a.tareas.filter(t => (!ui.soloMias || t.responsables.includes(a.yo)) && (!ui.ocultarHechas || !hecha(t)));
  const hechas = a.tareas.filter(hecha).length, total = Math.max(a.tareas.length, 1);
  const mias = a.tareas.filter(t => t.responsables.includes(a.yo) && !hecha(t)).length;
  const circ = 2 * Math.PI * 25;
  return `${titulo('Tareas', '<button class="boton suave chico" data-a="nueva-tarea">＋ Nueva</button>', volverA('volver-mas', 'Más'))}
    <div class="tarjeta progreso"><div class="anillo"><svg width="58" height="58"><circle class="fondo-a" cx="29" cy="29" r="25"/><circle class="lleno" cx="29" cy="29" r="25" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" data-arco="${circ * (1 - hechas / total)}"/></svg><span>${Math.round(hechas / total * 100)}%</span></div>
      <div><b style="font-size:17px">${hechas} de ${a.tareas.length} hechas</b><div class="chico">${mias === 0 ? 'No te queda nada 🎉' : mias === 1 ? 'Te queda 1 pendiente' : `Te quedan ${mias} pendientes`}</div></div></div>
    <div class="filtros" style="margin-top:12px"><button data-a="solo-mias" class="${ui.soloMias ? 'si' : ''}">Solo las mías</button><button data-a="ocultar-hechas" class="${ui.ocultarHechas ? 'si' : ''}">Ocultar las hechas</button></div>
    ${CATEGORIAS.map(([c, nom, ico]) => {
      const deEsta = lst.filter(t => t.categoria === c);
      return deEsta.length ? `<div class="seccion-t">${ico} ${nom}</div><div class="lista">${deEsta.map(filaTarea).join('')}</div>` : '';
    }).join('')}
    ${lst.length ? '' : vacio('📋', ui.soloMias ? 'No tenés tareas' : 'No hay tareas', 'Repartí la limpieza, la basura, la comida y las bebidas con ＋ Nueva.')}`;
}
function filaTarea(t) {
  const h = hecha(t), dia = t.dia != null ? (esHoy(t.dia) ? 'Hoy' : fmt(t.dia, { weekday: 'long', day: 'numeric' })) : '';
  return `<div class="fila ${h ? 'hecha' : ''}" data-registro="${esc(t.id)}"><button class="check ${h ? 'si' : ''}" data-a="marcar" data-id="${esc(t.id)}" aria-label="Marcar">${h ? '✓' : ''}</button>
    <span class="crece"><div class="t">${esc(t.titulo)}</div><div class="s">${pila(t.responsables, 20)} ${esc(lista(t.responsables.map(u => a.nombre(u))))}</div>
    ${dia ? `<div class="mini" style="font-weight:600;color:${t.dia != null && esHoy(t.dia) ? 'var(--acento)' : 'var(--tinta-2)'}">${dia}</div>` : ''}</span>
    ${t.responsables.includes(a.yo) && !h ? '<span class="vos">Vos</span>' : ''}
    ${t.autor === a.yo ? `<button class="borrar" data-a="borrar" data-tipo="tarea" data-id="${esc(t.id)}" data-confirmar="¿Borrar la tarea?">✕</button>` : botonOcultar(t)}</div>`;
}

// ── Más

function vMas() {
  const mio = saldos()[a.yo] ?? 0;
  const gastos = Math.abs(mio) < 1 ? 'Estás a mano' : mio > 0 ? `Te deben ${plata(mio, a.moneda)}` : `Debés ${plata(-mio, a.moneda)}`;
  const prox = a.eventos.find(e => e.inicio > ahora());
  const pend = a.pendientes.length;
  const mos = (s, ico, nom, c, det) => `<button class="mosaico" data-a="seccion" data-s="${s}" style="--c:${c}"><span class="ico">${ico}</span><b>${nom}</b><span class="chico">${esc(det)}</span></button>`;
  return `${titulo(a.viaje.nombre)}
    <div class="mosaicos">
      ${mos('mapa', '🗺️', 'Mapa', 'var(--azul)', `${Object.keys(a.ubicaciones).length} con ubicación`)}
      ${mos('tareas', '📋', 'Tareas', 'var(--verde)', (n => n ? `Te ${n === 1 ? 'queda 1' : `quedan ${n}`}` : 'No te queda nada')(a.tareas.filter(t => t.responsables.includes(a.yo) && !hecha(t)).length))}
      ${mos('gastos', '💲', 'Gastos', 'var(--verde)', gastos)}
      ${mos('agenda', '📅', 'Agenda', 'var(--azul)', prox ? `${prox.titulo} · ${relativo(prox.inicio)}` : 'Nada por ahora')}
      ${mos('votaciones', '📊', 'Votaciones', 'var(--violeta)', `${a.encuestas.filter(e => !e.cerrada).length} abiertas`)}
      ${mos('fotos', '🖼️', 'Fotos', 'var(--rosa)', `${a.fotos.length} fotos`)}
      ${mos('valija', '🧳', 'Valija', '#8B5E3C', `${prendasDe(a.yo)} de ${TOTAL_PRENDAS} prendas${a.decomisos.length ? ` · ${a.decomisos.length} ${a.decomisos.length === 1 ? 'decomiso' : 'decomisos'}` : ''}`)}
      ${(n => mos('documentos', '🔒', 'Documentos', '#1A9E8F', !n ? 'Seguro, pasajes… (privado)' : a.soyAdmin ? `${n} cargados` : n === 1 ? '1 documento tuyo' : `${n} documentos tuyos`))(a.documentos.length)}
      ${mos('grupo', '👥', 'Grupo', 'var(--acento)', a.soyAdmin && pend ? `${pend} esperando ✋` : `${a.aprobados.length} personas`)}
      ${a.soyAdmin ? mos('organizar', '⭐️', 'Organizar', '#E8920C', a.viaje.entradaCerrada ? 'Entrada pausada' : a.ocultosLista.length ? `${a.ocultosLista.length} ocultas` : 'Entrada, aviso, organizadores') : ''}
    </div>`;
}

// ── Gastos

function vGastos() {
  const s = Object.entries(saldos()).sort((x, y) => y[1] - x[1]);
  const total = a.gastos.filter(g => !g.esPago).reduce((t, g) => t + g.monto, 0);
  const maximo = Math.max(...s.map(([, v]) => Math.abs(v)), 1);
  const tr = transferencias();
  return `${titulo('Gastos', '<button class="boton suave chico" data-a="nuevo-gasto">＋ Nuevo</button>', volverA('volver-mas', 'Más'))}
    <div class="tarjeta"><div class="chico">Gastado en total</div><div class="total num">${plata(total, a.moneda)}</div><div class="chico">${plata(total / Math.max(a.aprobados.length, 1), a.moneda)} por persona</div></div>
    <div class="seccion-t">Quién debe y a quién le deben · tocá una barra</div>
    <div class="tarjeta">${s.map(([u, v]) => {
      const ancho = `${Math.abs(v) / maximo * 50}%`, tocado = ui.saldoTocado === u;
      return `<div class="saldo ${ui.saldoTocado && !tocado ? 'apagado' : ''}" data-a="tocar-saldo" data-u="${esc(u)}"><span class="nom">${esc(a.nombre(u))}</span>
        <span class="eje"><span class="b ${v >= 0 ? 'mas' : 'menos'}" style="width:0" data-ancho="${ancho}"></span>
        ${tocado ? `<span class="val" style="${v >= 0 ? `left:calc(50% + ${ancho} + 4px)` : `right:calc(50% + ${ancho} + 4px)`}">${plata(Math.abs(v), a.moneda)}</span>` : ''}</span></div>`;
    }).join('')}</div>
    <div class="seccion-t">Para quedar a mano</div>
    <div class="lista">${tr.length ? tr.map((x, i) => `<div class="fila">${av(x.de, 26)}→${av(x.a, 26)}<span class="crece"><div class="s">${esc(a.nombre(x.de))} → ${esc(a.nombre(x.a))}</div><b>${plata(x.monto, a.moneda)}</b></span>
      ${x.de === a.yo ? `<button class="boton gris chico" data-a="ya-pague" data-i="${i}">Ya pagué</button>` : ''}</div>`).join('') : '<div class="fila">Están todos a mano 🎉</div>'}</div>
    <div class="seccion-t">Gastos</div>
    <div class="lista">${a.gastos.map(g => `<div class="fila">${av(g.pagador, 32)}<span class="crece"><div class="t">${esc(g.esPago ? `Pago a ${a.nombre(g.entre[0])}` : g.descripcion)}</div>
      <div class="s">${g.esPago ? `${esc(a.nombre(g.pagador))} devolvió plata` : `Pagó ${esc(a.nombre(g.pagador))} · entre ${g.entre.length}`}</div></span>
      <span style="text-align:right"><b class="num" style="color:${g.esPago ? 'var(--verde)' : 'inherit'}">${plata(g.monto, a.moneda)}</b><div class="mini">${haceCuanto(g.fecha)}</div></span>
      ${g.autor === a.yo ? `<button class="borrar" data-a="borrar" data-tipo="gasto" data-id="${esc(g.id)}" data-confirmar="¿Borrar el gasto?">✕</button>` : botonOcultar(g, '¿Ocultar este gasto para todos? Deja de contar en las cuentas. Lo podés volver a mostrar desde Organizar.')}</div>`).join('') || '<div class="fila chico">Todavía no hay gastos</div>'}</div>`;
}

// ── Agenda

function vAgenda() {
  const lst = a.eventos.filter(e => ui.verPasados || e.inicio > ahora() - 3 * 3600000);
  const dias = new Map();
  for (const e of lst) { const d = inicioDia(e.inicio); if (!dias.has(d)) dias.set(d, []); dias.get(d).push(e); }
  return `${titulo('Agenda', '<button class="boton suave chico" data-a="nuevo-evento">＋ Nuevo</button>', volverA('volver-mas', 'Más'))}
    <div class="filtros"><button data-a="ver-pasados" class="${ui.verPasados ? 'si' : ''}">Ver los pasados</button></div>
    ${lst.length ? '' : vacio('📅', 'Agenda vacía', 'Cargá vuelos, salidas, reservas y planes.')}
    ${[...dias.keys()].sort((x, y) => x - y).map(d => `<div class="seccion-t">${esHoy(d) ? 'Hoy' : esManana(d) ? 'Mañana' : fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="lista">${dias.get(d).map(filaEvento).join('')}</div>`).join('')}`;
}
function filaEvento(e) {
  const enCurso = e.inicio <= ahora() && e.inicio + 3600000 > ahora();
  const lugarOk = destinoVisible();
  const ir = e.latitud != null && lugarOk ? (esIOS ? `https://maps.apple.com/?daddr=${e.latitud},${e.longitud}` : `https://www.google.com/maps/dir/?api=1&destination=${e.latitud},${e.longitud}`) : null;
  return `<div class="fila ${e.inicio < ahora() && !enCurso ? 'pasado' : ''}" style="align-items:flex-start" data-registro="${esc(e.id)}">
    <span class="hora-ev">${hora(e.inicio)}${enCurso ? '<br><span class="ahora">AHORA</span>' : ''}</span>
    <span class="crece"><div class="t">${esc(e.titulo)}</div>
      ${e.lugar ? `<div class="s">📍 ${lugarOk ? esc(e.lugar) : 'Lugar secreto 🤫'}</div>` : ''}${e.nota ? `<div class="s">${esc(e.nota)}</div>` : ''}
      <div class="mini">${e.autor === a.yo ? 'Lo cargaste vos' : `Lo cargó ${esc(a.nombre(e.autor))}`} · ${relativo(e.inicio)}</div></span>
    ${ir ? `<a class="icono-b" href="${ir}" target="_blank" rel="noopener" title="Cómo llegar">🧭</a>` : ''}
    ${e.autor === a.yo ? `<button class="borrar" data-a="borrar" data-tipo="evento" data-id="${esc(e.id)}" data-confirmar="¿Borrar el evento?">✕</button>` : botonOcultar(e)}</div>`;
}

// ── Votaciones

function vVotaciones() {
  return `${titulo('Votaciones', '<button class="boton suave chico" data-a="nueva-encuesta">＋ Nueva</button>', volverA('volver-mas', 'Más'))}
    ${a.encuestas.length ? '' : vacio('📊', 'Sin votaciones', '¿Dónde cenamos? ¿A qué hora salimos? Preguntale al grupo.')}
    ${a.encuestas.map(tarjetaEncuesta).join('')}`;
}
/** Gráfico de torta (anillo) con el % de cada opción. Cada opción tiene su color, igual que su barra. */
function torta(conteo, total, id) {
  const r = 42, circ = 2 * Math.PI * r;
  let acumulado = 0;
  const porciones = conteo.map((n, i) => {
    if (!n) return '';
    const largo = n / total * circ, desde = acumulado;
    acumulado += largo;
    return `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${color(i * 2 + 1)}" stroke-width="18" stroke-dasharray="0 ${circ}"
      data-dash="${Math.max(largo - 1.5, 0.5)} ${circ}" stroke-dashoffset="${-desde}" class="porcion" data-a="porcion" data-id="${esc(id)}" data-i="${i}"/>`;
  }).join('');
  const lider = conteo.indexOf(Math.max(...conteo));
  return `<svg class="torta" viewBox="0 0 120 120" aria-hidden="true"><circle r="${r}" cx="60" cy="60" fill="none" stroke="var(--tarjeta-2)" stroke-width="18"/>
    <g transform="rotate(-90 60 60)">${porciones}</g>
    <text x="60" y="57" text-anchor="middle" class="torta-num">${total ? Math.round(conteo[lider] / total * 100) : 0}%</text>
    <text x="60" y="73" text-anchor="middle" class="torta-txt">${total ? 'la que gana' : 'sin votos'}</text></svg>`;
}

function tarjetaEncuesta(e) {
  const votos = a.votos.filter(v => v.encuesta === e.id);
  const miVoto = votos.find(v => v.autor === a.yo);
  const mio = miVoto?.elegidas ?? [];
  const conteo = e.opciones.map((_, i) => votos.filter(v => v.elegidas.includes(i)));
  const maximo = Math.max(...conteo.map(c => c.length), 0);
  const votaron = votos.filter(v => v.elegidas.length).length;
  const elecciones = conteo.reduce((t, c) => t + c.length, 0);
  const estadoVoto = !mio.length ? 'Tocá una opción para votar' : (miVoto.cambios ?? 0) >= 1 ? 'Ya usaste tu único cambio: tu voto quedó fijo' : 'Votaste · podés cambiarlo una sola vez';
  return `<div class="tarjeta" data-registro="${esc(e.id)}">
    <div class="renglon">${av(e.autor, 24)}<span class="chico" style="flex:1">${esc(a.nombre(e.autor))} · ${haceCuanto(e.fecha)}</span>
      ${e.cerrada ? '<b class="chico">Cerrada</b>' : e.multiple ? '<span class="mini">Varias opciones</span>' : ''}</div>
    <b style="display:block;margin-top:8px;font-size:17px">${esc(e.pregunta)}</b>
    <div class="encuesta-cuerpo">
      ${torta(conteo.map(c => c.length), elecciones, e.id)}
      <div class="leyenda">${e.opciones.map((op, i) => `<span class="${ui.porcion?.[e.id] === i ? 'si' : ''}"><i style="background:${color(i * 2 + 1)}"></i>${esc(op)} · <b>${elecciones ? Math.round(conteo[i].length / elecciones * 100) : 0}%</b></span>`).join('')}</div>
    </div>
    ${e.opciones.map((op, i) => {
      const n = conteo[i].length, gana = n === maximo && n > 0, esMia = mio.includes(i), pct = elecciones ? Math.round(n / elecciones * 100) : 0;
      return `<button class="opcion ${esMia ? 'mia' : ''} ${gana ? 'gana' : ''} ${ui.porcion?.[e.id] === i ? 'resaltada' : ''}" data-a="votar" data-id="${esc(e.id)}" data-i="${i}" style="--c:${color(i * 2 + 1)}">
        <span class="relleno" style="width:0" data-ancho="${pct}%"></span>
        <span class="tilde ${esMia ? 'si' : ''}">${esMia ? '✓' : ''}</span><span class="txt">${esc(op)}</span>${pila(conteo[i].slice(0, 4).map(v => v.autor), 20)}<span class="num chico"><b>${pct}%</b> · ${n}</span></button>
        ${ui.verQuien[e.id] === i ? `<div class="mini" style="margin:4px 4px 0">${conteo[i].length ? esc(lista(conteo[i].map(v => a.nombre(v.autor)))) : 'Nadie todavía'}</div>` : ''}`;
    }).join('')}
    <div class="mini" style="margin-top:8px;color:${mio.length && (miVoto.cambios ?? 0) >= 1 ? 'var(--tinta-2)' : 'var(--acento)'}">${e.cerrada ? 'Votación cerrada' : estadoVoto}</div>
    <div class="renglon" style="margin-top:6px"><span class="mini" style="flex:1">${votaron} de ${a.aprobados.length} votaron · <button class="enlace" style="font-size:11px" data-a="ver-quien" data-id="${esc(e.id)}">ver quién</button></span>
      ${e.autor === a.yo ? `<button class="enlace" style="font-size:13px" data-a="cerrar-encuesta" data-id="${esc(e.id)}">${e.cerrada ? 'Reabrir' : 'Cerrar'}</button>
        <button class="borrar" data-a="borrar" data-tipo="encuesta" data-id="${esc(e.id)}" data-confirmar="¿Borrar la votación?">Borrar</button>` : botonOcultar(e)}</div></div>`;
}

// ── Valija (reglamento de equipaje) e ítems decomisados

const PRENDAS = [
  ['boxers', 'bóxers', 9], ['medias', 'pares de medias o soquetes', 4], ['remeras', 'remeras de manga corta o sin mangas', 10],
  ['seleccion', 'camiseta de la Selección Argentina 🇦🇷', 1], ['short', 'short deportivo', 1], ['bermudas', 'bermudas', 2],
  ['buzo', 'buzo o sweater', 1], ['urbanas', 'par de zapatillas urbanas (paseo/noche)', 1], ['deportivas', 'par de zapatillas deportivas', 1],
];
const ACCESORIOS = [['gorra', 'Gorra o gorro'], ['cinturon', 'Cinturón'], ['cepillo', 'Cepillo de dientes'], ['remedios', 'Medicamentos personales'],
  ['notebook', 'Notebook o tablet'], ['auriculares', 'Auriculares']];
const TOTAL_PRENDAS = PRENDAS.reduce((t, p) => t + p[2], 0);   // 30
const tildadosDe = u => new Set(a.valijas[u]?.tildados ?? []);
const prendasDe = u => { const t = tildadosDe(u); return PRENDAS.reduce((s, p) => s + (t.has(p[0]) ? p[2] : 0), 0); };

const COMUNICADO = `<p><b>COMUNICADO OFICIAL | REGLAMENTO DE EQUIPAJE</b></p>
<p>Estimado pasajero:</p>
<p>Por medio de la presente, se informa que deberá respetar estrictamente el siguiente listado para el armado de su valija.</p>
<p>El cumplimiento de estas disposiciones será obligatorio para todos los integrantes del grupo, sin excepción.</p>
<p><b>⚠️ ACLARACIONES IMPORTANTES</b></p>
<ol><li>Todo artículo que NO figure en el presente listado queda automáticamente excluido del equipaje autorizado.</li>
<li>La ropa utilizada durante el viaje en avión deberá estar incluida dentro de las 30 prendas obligatorias. No se admitirán prendas adicionales por llevarlas puestas.</li>
<li>Las cantidades establecidas deberán respetarse estrictamente. No se permiten modificaciones, reemplazos ni excepciones sin autorización previa.</li></ol>
<p><b>🚨 RÉGIMEN DE MULTAS</b></p>
<p>Todo pasajero que incumpla las cantidades o condiciones establecidas quedará sujeto a la multa correspondiente, cuya modalidad será informada por la organización.</p>`;

function vValija() {
  const t = tildadosDe(a.yo), mias = prendasDe(a.yo), circ = 2 * Math.PI * 25;
  const fila = (k, texto, cant) => `<div class="fila ${t.has(k) ? 'hecha' : ''}"><button class="check ${t.has(k) ? 'si' : ''}" data-a="valija" data-k="${k}" aria-label="Tildar">${t.has(k) ? '✓' : ''}</button>
    <span class="crece"><span class="t">${cant ? `<b class="num">${cant}</b> ` : ''}${esc(texto)}</span></span></div>`;
  return `${titulo('Valija', '', volverA('volver-mas', 'Más'))}
    <div class="tarjeta comunicado">
      <b>📜 Comunicado oficial · Reglamento de equipaje</b>
      <div class="chico" style="margin-top:4px">Obligatorio para todos, sin excepción. 30 prendas en total, incluida la ropa que llevás puesta en el avión.</div>
      ${ui.verComunicado ? `<div class="texto-comunicado">${COMUNICADO}</div>` : ''}
      <button class="enlace" style="margin-top:8px;font-size:13px" data-a="ver-comunicado">${ui.verComunicado ? 'Cerrar' : 'Leer el comunicado completo'}</button>
    </div>

    <div class="tarjeta progreso" style="margin-top:12px"><div class="anillo"><svg width="58" height="58"><circle class="fondo-a" cx="29" cy="29" r="25"/><circle class="lleno" cx="29" cy="29" r="25" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" data-arco="${circ * (1 - mias / TOTAL_PRENDAS)}"/></svg><span>${mias}</span></div>
      <div><b style="font-size:17px">${mias} de ${TOTAL_PRENDAS} prendas</b><div class="chico">${mias === TOTAL_PRENDAS ? 'Valija reglamentaria ✅' : 'Tildá lo que ya pusiste en la valija'}</div></div></div>

    <div class="seccion-t">👕 Prendas de vestir · obligatorias</div>
    <div class="lista">${PRENDAS.map(([k, txt, n]) => fila(k, txt, n)).join('')}</div>
    <div class="seccion-t">🎒 Accesorios · opcionales</div>
    <div class="lista">${ACCESORIOS.map(([k, txt]) => fila(k, txt)).join('')}</div>

    <div class="seccion-t">Cómo va el grupo</div>
    <div class="lista">${a.aprobados.map(m => {
      const n = prendasDe(m.autor), falta = PRENDAS.filter(p => !tildadosDe(m.autor).has(p[0]));
      return `<div class="fila" data-a="ver-valija" data-u="${esc(m.autor)}" style="cursor:pointer;flex-wrap:wrap">${av(m.autor, 30)}<span class="crece"><div class="renglon"><span class="t" style="flex:1">${esc(a.nombre(m.autor))}</span><b class="num">${n}/${TOTAL_PRENDAS}</b></div>
        <span class="barra-valija"><span style="width:0" data-ancho="${n / TOTAL_PRENDAS * 100}%" class="${n === TOTAL_PRENDAS ? 'completa' : ''}"></span></span></span>
        ${ui.valijaAbierta === m.autor ? `<div class="mini" style="width:100%;padding-left:42px">${falta.length ? `Le falta: ${esc(falta.map(p => `${p[2]} ${p[1]}`).join(', '))}` : 'Tiene todo ✅'}</div>` : ''}</div>`;
    }).join('')}</div>

    <div class="seccion-t">🚨 Ítems decomisados · ${a.decomisos.length} <button class="boton suave chico der" data-a="nuevo-decomiso">＋ Cargar</button></div>
    ${a.decomisos.length ? `<div class="lista">${a.decomisos.map(d => `<div class="fila" data-registro="${esc(d.id)}" style="align-items:flex-start">
        ${d.miniatura ? `<img class="foto-decomiso" src="data:image/jpeg;base64,${d.miniatura}" alt="">` : '<span class="foto-decomiso vacia">🚫</span>'}
        <span class="crece"><div class="t">${esc(d.item)}</div><div class="s">${av(d.persona, 18)} ${esc(a.nombre(d.persona))}${d.multa ? ` · multa: <b>${esc(d.multa)}</b>` : ''}</div>
          ${d.nota ? `<div class="s">${esc(d.nota)}</div>` : ''}<div class="mini">Lo cargó ${esc(a.nombre(d.autor))} · ${haceCuanto(d.fecha)}</div></span>
        ${d.autor === a.yo ? `<button class="borrar" data-a="borrar" data-tipo="decomiso" data-id="${esc(d.id)}" data-confirmar="¿Borrar el decomiso?">✕</button>` : botonOcultar(d)}</div>`).join('')}</div>`
      : '<p class="pie">Ningún ítem decomisado todavía. Si alguien lleva algo fuera del reglamento, cargalo acá.</p>'}`;
}

// ── Fotos

let subiendo = 0;
function vFotos() {
  const v = a.viaje;
  return `${titulo('Fotos', `${subiendo ? '<div class="cargando oscuro" style="margin:0;width:22px;height:22px"></div>' : ''}<label class="boton suave chico" style="cursor:pointer">＋ Subir<input type="file" accept="image/*" multiple hidden data-subir-fotos></label>`, volverA('volver-mas', 'Más'))}
    ${v.driveCarpeta ? `<a class="boton ancho" href="${esc(v.driveCarpeta)}" target="_blank" rel="noopener">📁 Abrir la carpeta de Google Drive</a>
      <p class="pie centro">Todas las fotos van a Drive en tamaño original. Desde ahí se descargan todas juntas.</p>`
      : a.soyAdmin ? '<p class="pie centro">Para que las fotos se guarden también en Google Drive, configurá la carpeta en Grupo → Editar el viaje.</p>' : ''}
    ${a.fotos.length ? `<div class="segmentos" style="margin:12px 0">${[2, 3, 4, 5].map(n => `<button data-a="columnas" data-v="${n}" class="${ui.columnas === n ? 'si' : ''}">${n} por fila</button>`).join('')}</div>` : vacio('🖼️', 'Álbum vacío', 'Subí las fotos del viaje y las ve todo el grupo.')}
    <div class="grilla" style="--cols:${ui.columnas}">${a.fotos.map(f => `<button data-a="ver-foto" data-id="${esc(f.id)}"><img loading="lazy" src="data:image/jpeg;base64,${f.miniatura}" alt="">${av(f.autor, 20)}</button>`).join('')}</div>`;
}

async function subirFotos(archivos) {
  let subidas = 0;
  for (const f of archivos) {
    subiendo++; render();
    try {
      const mini = await miniatura(f, 320);
      const formato = (f.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
      const id = nuevoID('f');
      await enviar('foto', { id, autor: '', pie: '', fecha: ahora(), miniatura: mini, formato }, a.esDemo ? undefined : f);
      if (a.esDemo) fotosDemo.set(id, URL.createObjectURL(f));
      mandarADrive(f, id, formato);
      subidas++;
    } catch (e) { avisar(`No se pudo subir ${f.name}: ${mensajeError(e)}`); }
    subiendo--; render();
  }
  if (subidas) anunciar(subidas === 1 ? 'subió una foto' : `subió ${subidas} fotos`, 'fotos');
}
const fotosDemo = new Map();
async function miniatura(file, lado) {
  const img = await createImageBitmap(file).catch(() => null) || await new Promise((ok, mal) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No pude leer la imagen (probá con JPG)')); i.src = URL.createObjectURL(file);
  });
  const f = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.6).split(',')[1];
}
/** Igual que la app: cada foto va también a la carpeta de Drive del viaje, en tamaño original. */
async function mandarADrive(file, id, formato) {
  const v = a.viaje;
  if (a.esDemo || !v?.driveSubida) return;
  const d = new Date(), dos = n => String(n).padStart(2, '0');
  const fecha = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}.${dos(d.getMinutes())}`;
  const datos = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(file); });
  const tipo = { heic: 'image/heic', png: 'image/png', jpg: 'image/jpeg' }[formato] || file.type || 'application/octet-stream';
  try {
    await fetch(v.driveSubida, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave: v.driveClave || '', nombre: `${fecha} - ${a.perfil?.nombre ?? 'Alguien'} - ${id}.${formato}`, tipo, datos }) });
  } catch {}
}

async function verFoto(id) {
  const f = a.fotos.find(x => x.id === id);
  if (!f) return;
  const el = document.createElement('div');
  el.className = 'visor';
  el.innerHTML = `<img src="data:image/jpeg;base64,${f.miniatura}" alt="">
    <div class="arriba">${av(f.autor, 32)}<div class="crece"><b>${esc(a.nombre(f.autor))}</b><div style="font-size:12px;opacity:.8">${fmt(f.fecha, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
      <span class="cargando"></span>
      ${f.autor === a.yo ? '<button data-v="borrar" title="Borrar">🗑</button>' : `<button data-v="reportar" title="Reportar" style="font-size:14px">Reportar</button><button data-v="bloquear" title="Bloquear" style="font-size:14px">Bloquear</button>${a.soyAdmin ? '<button data-v="ocultar" title="Ocultar para todos" style="font-size:14px">Ocultar</button>' : ''}`}<button data-v="cerrar" title="Cerrar">✕</button></div>`;
  document.body.appendChild(el);
  const img = el.querySelector('img');
  let escala = 1;
  img.addEventListener('dblclick', () => { escala = escala > 1 ? 1 : 2.5; img.style.transform = `scale(${escala})`; });
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b?.dataset.v === 'cerrar' || e.target === el) el.remove();
    if (b?.dataset.v === 'borrar' && confirm('¿Borrar la foto?')) { borrar('foto', f); el.remove(); }
    if (b?.dataset.v === 'ocultar' && confirm('¿Ocultar la foto para todos? La podés volver a mostrar desde Organizar.')) { ocultar(f.id, true); el.remove(); }
    if (b?.dataset.v === 'reportar' && confirm('¿Reportar esta foto? Deja de verse para vos y les llega a los organizadores.')) { reportar(f.id, f.autor); el.remove(); }
    if (b?.dataset.v === 'bloquear' && confirm(`¿Bloquear a ${a.nombre(f.autor)}? No vas a ver más sus mensajes ni sus fotos. Lo podés deshacer en Grupo.`)) { bloquear(f.autor, true); el.remove(); }
  });
  const url = a.esDemo ? fotosDemo.get(id) : await a.servidor.archivoURL(id).catch(() => null);
  el.querySelector('.cargando')?.remove();
  if (url) {
    img.src = url;
    el.querySelector('.crece').insertAdjacentHTML('afterend', `<a href="${esc(url)}" target="_blank" rel="noopener" title="Abrir original">⬇︎</a>`);
  }
}

// ── Grupo

function invitacion() {
  const v = a.viaje;
  return `<div class="tarjeta invitar">
      <b>Invitá al grupo</b>
      <div class="link-invitacion" data-a="copiar-link">${esc(linkInvitacion().replace('https://', ''))}</div>
      <div class="renglon" style="gap:8px;flex-wrap:wrap">
        <button class="boton chico" data-a="copiar-link">Copiar link</button>
        <a class="boton chico" style="background:#25D366" href="https://wa.me/?text=${encodeURIComponent(textoInvitacion())}" target="_blank" rel="noopener">Mandar por WhatsApp</a>
        ${navigator.share ? '<button class="boton gris chico" data-a="compartir">Compartir…</button>' : ''}
      </div>
      <div class="mini" style="margin-top:8px">Código: <b class="num">${esc(a.viajeID)}</b>${v.entradaCerrada ? ' · <b style="color:var(--rojo)">La entrada de gente nueva está pausada</b>' : v.autoAprobar ? ' · Entran solos, sin aprobación' : ''}</div>
    </div>
    <p class="pie">El que abre el link ${v.autoAprobar ? 'entra directo' : `queda esperando hasta que ${a.soyAdmin ? 'lo apruebes' : 'un organizador lo apruebe'}`}. Con la app de iPhone se abre en la app; si no, en el navegador (sirve en Android).</p>`;
}
const textoInvitacion = () => `Sumate a ${a.viaje?.nombre ?? 'nuestro viaje'} en Colonia 🏕️\n${linkInvitacion()}\n\nSi tenés la app se abre ahí; si no, en el navegador. Si no se abre, en Colonia tocá "Me invitaron" y pegá el código ${a.viajeID}.`;

function filaPersona(m) {
  const etiqueta = m.autor === a.creador ? '<span class="organiza">Creó el viaje</span>' : a.organiza(m.autor) ? '<span class="organiza">Organiza</span>' : '';
  const puedo = a.soyAdmin && m.autor !== a.creador;
  return `<div class="fila">${av(m.autor, 34)}<span class="crece">${esc(m.autor === a.yo ? `${m.nombre} (vos)` : m.nombre)} ${etiqueta}</span>
    ${a.ubicaciones[m.autor] ? `<span class="mini">${haceCuanto(a.ubicaciones[m.autor].fecha)}</span>` : ''}
    ${puedo ? `<button class="icono-b" data-a="persona" data-u="${esc(m.autor)}" aria-label="Opciones">⋯</button>` : ''}</div>`;
}

function vGrupo() {
  const notis = 'Notification' in window ? Notification.permission : 'no';
  return `${titulo('Grupo', '', volverA('volver-mas', 'Más'))}
    ${invitacion()}
    ${a.pendientes.length ? `<div class="seccion-t">Quieren sumarse</div>${listaPendientes()}` : ''}
    <div class="seccion-t">En el viaje · ${a.aprobados.length}</div>
    <div class="lista">${a.aprobados.map(filaPersona).join('')}</div>
    ${a.soyAdmin ? '<p class="pie">Tocá ⋯ en alguien para nombrarlo organizador o sacarlo del viaje. Lo demás está en Más → Organizar.</p>' : ''}
    <div class="seccion-t">Yo</div>
    <div class="lista">
      <button class="fila" style="width:100%;text-align:left" data-a="editar-perfil">${av(a.yo, 34)}<span class="crece" style="color:var(--acento)">Cambiar nombre, emoji o color</span></button>
      <label class="fila" style="cursor:pointer;color:var(--acento)">📷 ${a.foto(a.yo) ? 'Cambiar mi foto' : 'Poner una foto'}<input type="file" accept="image/*" hidden data-mi-foto></label>
      ${a.miembros[a.yo]?.foto ? '<button class="fila" style="width:100%;text-align:left;color:var(--rojo)" data-a="quitar-foto">Quitar mi foto</button>' : ''}
      ${!a.fichaDe[a.yo] && a.fichasLibres.length ? '<button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="quien-sos">🪪 Elegir mi perfil del viaje</button>' : ''}
      <label class="fila interruptor" style="padding:11px 14px"><span>Compartir mi ubicación<div class="mini">Desde la web se comparte solo con la página abierta${ubicacion.error === 'denegada' ? '. ⚠️ El navegador no tiene permiso de ubicación' : ''}.</div></span><input type="checkbox" data-a="comparto" ${ubicacion.comparto ? 'checked' : ''}></label>
      ${notis === 'default' ? '<button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="notis">🔔 Avisarme de mensajes nuevos</button>' : ''}
    </div>
    ${a.bloqueados.size ? `<div class="seccion-t">Bloqueados</div><div class="lista">${[...a.bloqueados].map(u => `<div class="fila">${av(u, 30)}<span class="crece">${esc(a.nombre(u))}</span><button class="enlace" style="font-size:13px" data-a="desbloquear" data-u="${esc(u)}">Desbloquear</button></div>`).join('')}</div><p class="pie">No ves sus mensajes ni sus fotos. No se enteran.</p>` : ''}
    <div class="lista" style="margin-top:16px">
      ${a.soyAdmin && a.yo !== a.creador ? '<button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="dejar-organizar">Dejar de organizar</button>' : ''}
      <button class="fila" style="width:100%;text-align:left;color:var(--rojo)" data-a="salir" >${a.esDemo ? 'Salir del viaje de ejemplo' : 'Salir del viaje'}</button>
      ${a.esDemo ? '' : '<button class="fila" style="width:100%;text-align:left;color:var(--rojo)" data-a="borrar-mis-datos">Borrar mis datos y salir</button>'}
    </div>
    <div class="seccion-t">Ayuda</div>
    <div class="lista">
      <a class="fila" style="color:var(--acento)" href="https://sscg.tech/soporte/" target="_blank" rel="noopener">❓ Ayuda y soporte</a>
      <a class="fila" style="color:var(--acento)" href="mailto:sscg.tech@gmail.com?subject=Colonia">✉️ Escribinos: sscg.tech@gmail.com</a>
      <a class="fila" style="color:var(--acento)" href="privacidad/" target="_blank" rel="noopener">🔒 Privacidad</a>
    </div>
    <p class="pie">No se permite contenido ofensivo ni abusivo. Podés reportar un mensaje o una foto, o bloquear a alguien.</p>
    <p class="pie">${a.ultimaSincronizacion ? `Sincronizado ${haceCuanto(a.ultimaSincronizacion)}${a.esDemo ? ' · modo ejemplo' : ''}` : ''}</p>`;
}

function listaPendientes() {
  return `<div class="lista">${a.pendientes.map(m => `<div class="fila">${av(m.autor, 36)}<span class="crece"><div class="t">${esc(m.nombre)}</div><div class="s">Pidió ${haceCuanto(m.pedido)}</div>
    ${m.codigo !== a.viajeID ? '<div class="mini" style="color:orange">⚠️ Entró con un código distinto</div>' : ''}</span>
    ${a.soyAdmin ? `<button class="no-b" data-a="decidir" data-u="${esc(m.autor)}" data-v="0" aria-label="Rechazar">✕</button><button class="ok-b" data-a="decidir" data-u="${esc(m.autor)}" data-v="1" aria-label="Aprobar">✓</button>` : '<span class="chico">Esperando</span>'}</div>`).join('')}</div>`;
}

// ── Organizar (solo organizadores)

/** Qué es algo que se ocultó, para mostrarlo en la lista. */
function descripcion(id) {
  const s = a.sobres.get(id);
  if (!s) return { ico: '❔', texto: 'Algo que ya no está' };
  const d = s.datos, quien = a.nombre(s.autor);
  const t = {
    mensaje: ['💬', `“${d.texto}”`], foto: ['🖼️', 'Una foto'], gasto: ['💲', `${d.descripcion} · ${plata(d.monto ?? 0, a.moneda)}`],
    tarea: ['📋', d.titulo], evento: ['📅', d.titulo], encuesta: ['📊', d.pregunta], juego: ['🎮', d.nombre],
    puntaje: ['🎯', `${numero(d.puntos ?? 0)} puntos de ${a.nombre(d.jugador)}`], equipos: ['🎲', d.titulo],
    decomiso: ['🚨', `Decomiso: ${d.item} (${a.nombre(d.persona)})`],
  }[s.tipo] || ['•', s.tipo];
  return { ico: t[0], texto: t[1], quien };
}

function vOrganizar() {
  const v = a.viaje;
  const orgs = [...a.organizadores].filter(u => a.miembros[u]);
  return `${titulo('Organizar', '', volverA('volver-mas', 'Más'))}
    <p class="pie" style="margin-top:-8px;margin-bottom:12px">Esto lo ven solo los organizadores.</p>

    <div class="seccion-t">Entrada de gente</div>
    <div class="tarjeta">
      <label class="interruptor" style="padding-top:0"><span>Aceptar gente nueva<div class="mini">Apagado: el link no deja pedir para entrar.</div></span><input type="checkbox" data-a="entrada" ${v.entradaCerrada ? '' : 'checked'}></label>
      <label class="interruptor" style="padding-bottom:0"><span>Aprobar solos a los que entren con el link<div class="mini">Sin esperar a que un organizador los acepte.</div></span><input type="checkbox" data-a="auto-aprobar" ${v.autoAprobar ? 'checked' : ''}></label>
    </div>
    ${a.pendientes.length ? `<div class="seccion-t">Quieren sumarse · ${a.pendientes.length}</div>${listaPendientes()}` : ''}

    <div class="seccion-t">Aviso fijo arriba del chat y del mapa</div>
    <div class="tarjeta">
      ${v.aviso ? `<div class="aviso-fijo" style="margin:0 0 10px">📌 ${esc(v.aviso)}</div><div class="renglon" style="gap:8px"><button class="boton chico" data-a="aviso">Cambiar</button><button class="boton gris chico" data-a="sacar-aviso">Sacar el aviso</button></div>`
        : '<div class="chico" style="margin-bottom:10px">Ej: "Mañana salimos 8 am de la casa".</div><button class="boton chico" data-a="aviso">Escribir un aviso</button>'}
    </div>

    <div class="seccion-t">Organizadores · ${orgs.length} <button class="enlace der" style="font-size:13px" data-a="nombrar">＋ Nombrar</button></div>
    <div class="lista">${orgs.map(u => filaPersona(a.miembros[u])).join('')}</div>
    <p class="pie">Cualquier organizador puede aprobar gente, nombrar o quitar organizadores, editar el viaje y ocultar cosas. Al que creó el viaje no se lo puede quitar.</p>

    <div class="seccion-t">¿Quién sos? · perfiles del viaje</div>
    <div class="lista"><button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="seccion" data-s="perfiles">${a.fichas.length ? `${a.fichas.length} perfiles · ${a.fichas.filter(f => a.duenoFicha[f.id]).length} ya eligieron el suyo ›` : 'Cargar las caras y los apodos ›'}</button></div>
    <p class="pie">El que entra con el link elige su cara y entra directo, sin aprobación, con ese nombre y esa foto.</p>

    <div class="seccion-t">El viaje</div>
    <div class="lista"><button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="editar-viaje">Editar nombre, destino, moneda, sorpresa y fotos en Drive ›</button></div>

    <div class="seccion-t">Reportes · ${a.reportes.length}</div>
    ${a.reportes.length ? `<div class="lista">${a.reportes.map(r => {
      const d = descripcion(r.registro);
      return `<div class="fila"><span style="font-size:20px">${d.ico}</span><span class="crece"><div class="t">${esc(d.texto)}</div><div class="s">${d.quien ? `De ${esc(d.quien)} · ` : ''}lo reportó ${esc(a.nombre(r.autor))} ${haceCuanto(r.fecha)}</div></span>
        <button class="enlace" style="font-size:13px" data-a="ocultar" data-id="${esc(r.registro)}">Ocultar</button>${r.usuario !== a.creador && a.miembros[r.usuario] ? `<button class="enlace" style="font-size:13px;color:var(--rojo)" data-a="sacar-reportado" data-u="${esc(r.usuario)}">Sacar</button>` : ''}</div>`;
    }).join('')}</div>` : '<p class="pie">Nadie reportó nada. Cualquiera puede reportar un mensaje o una foto de otro.</p>'}

    <div class="seccion-t">Cosas ocultas · ${a.ocultosLista.length}</div>
    ${a.ocultosLista.length ? `<div class="lista">${a.ocultosLista.sort((x, y) => y.fecha - x.fecha).map(o => {
      const d = descripcion(o.registro);
      return `<div class="fila"><span style="font-size:20px">${d.ico}</span><span class="crece"><div class="t">${esc(d.texto)}</div><div class="s">${d.quien ? `De ${esc(d.quien)} · ` : ''}la ocultó ${esc(a.nombre(o.autor))} ${haceCuanto(o.fecha)}</div></span>
        <button class="enlace" style="font-size:13px" data-a="mostrar" data-id="${esc(o.registro)}">Mostrar</button></div>`;
    }).join('')}</div>` : '<p class="pie">Nada oculto. Para ocultar algo de otro (un mensaje, una foto, un gasto, una tarea…) tocá “Ocultar” al lado.</p>'}

    ${a.rechazados.length ? `<div class="seccion-t">Rechazados</div><div class="lista">${a.rechazados.map(m => `<div class="fila"><span class="crece">${esc(m.emoji)} ${esc(m.nombre)}</span><button class="enlace" data-a="decidir" data-u="${esc(m.autor)}" data-v="1">Aprobar</button></div>`).join('')}</div>` : ''}`;
}

// ── Perfiles del viaje (organizadores)

function vPerfiles() {
  const elegidos = a.fichas.filter(f => a.duenoFicha[f.id]).length;
  return `${titulo('Perfiles del viaje', `<label class="boton suave chico" style="cursor:pointer">＋ Fotos<input type="file" accept="image/*" multiple hidden data-cargar-fichas></label>`, volverA('seccion-organizar', 'Organizar'))}
    <p class="pie" style="margin-top:-8px">Subí una o varias fotos: el nombre del archivo es el apodo (ej: <b>Joti.jpg</b>). Se recortan cuadradas, al centro.</p>
    <div class="seccion-t">Perfiles · ${a.fichas.length} · ${elegidos} elegidos <button class="enlace der" style="font-size:13px" data-a="nueva-ficha">＋ Uno</button></div>
    ${a.fichas.length ? `<div class="lista">${a.fichas.map(f => {
      const u = a.duenoFicha[f.id];
      return `<div class="fila" data-registro="${esc(f.id)}">${caraFicha(f, 44)}<span class="crece"><div class="t">${esc(f.nombre)}</div>
        <div class="s" style="color:${u ? 'var(--verde)' : 'var(--tinta-2)'}">${u ? (u === a.yo ? 'Lo elegiste vos' : 'Ya lo eligió') : 'Libre'}</div></span>
        ${u ? `<button class="boton gris chico" data-a="liberar" data-id="${esc(f.id)}">Liberar</button>` : ''}
        ${f.autor === a.yo ? `<button class="icono-b" data-a="editar-ficha" data-id="${esc(f.id)}" aria-label="Editar">✎</button>` : ''}
        ${f.autor === a.yo ? `<button class="borrar" data-a="borrar-ficha" data-id="${esc(f.id)}">✕</button>` : botonOcultar(f)}</div>`;
    }).join('')}</div>` : vacio('🪪', 'Sin perfiles todavía', 'Cargá la cara y el apodo de cada uno.')}
    <p class="pie">Si alguien eligió mal, tocá Liberar: vuelve a la lista y esa persona tiene que elegir de nuevo.</p>`;
}

// ── Documentos

const CLASES_DOC = [['seguro', 'Seguro de viaje', '🩺'], ['pasaje', 'Pasaje', '✈️'], ['pasaporte', 'Pasaporte / DNI', '🪪'], ['reserva', 'Reserva', '🏨'], ['otro', 'Otro', '📄']];
function vDocumentos() {
  const sinFicha = a.aprobados.map(m => m.autor).filter(u => !a.fichaDe[u]);
  const mio = a.fichaDe[a.yo] || a.yo;
  const personas = a.soyAdmin ? [mio, ...[...a.fichas.map(f => f.id), ...sinFicha].filter(p => p !== mio)] : [mio];   // los míos primero
  const tam = n => n > 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
  return `${titulo('Documentos', '', volverA('volver-mas', 'Más'))}
    <div class="tarjeta renglon" style="gap:10px"><span style="font-size:20px">🔒</span><span class="chico">${a.soyAdmin ? 'Ves los documentos de todos porque organizás. Cada uno ve solo los suyos.' : 'Solo los ves vos y los organizadores. Van cifrados: ni con el código del viaje se pueden leer.'}</span></div>
    ${personas.map(p => {
      const docs = a.documentos.filter(d => d.persona === p), f = a.fichas.find(x => x.id === p);
      const mio = p === a.yo || p === a.fichaDe[a.yo];
      return `<div class="seccion-t renglon" style="gap:8px">${f ? caraFicha(f, 22) : av(p, 22)}${mio ? 'Mis documentos' : esc(a.nombrePersona(p))}${p.startsWith('pf-') && !a.duenoFicha[p] ? '<span class="mini">· todavía no entró</span>' : ''}</div>
        <div class="lista">${docs.map(d => {
          const m = metasDoc.get(d.id);
          if (!m) return `<div class="fila"><span class="chico">🔒 Documento cifrado · esperando que te lo compartan en este navegador</span></div>`;
          const c = CLASES_DOC.find(x => x[0] === m.clase) || CLASES_DOC[4];
          return `<div class="fila" data-registro="${esc(d.id)}"><span style="font-size:22px">${c[2]}</span><button class="crece" style="text-align:left" data-a="abrir-doc" data-id="${esc(d.id)}"><div class="t">${esc(m.titulo)}</div><div class="s">${c[1]} · ${esc(m.formato.toUpperCase())} · ${tam(m.tamano || 0)} · ${haceCuanto(d.fecha)}</div></button>
            ${d.autor === a.yo ? `<button class="borrar" data-a="borrar-doc" data-id="${esc(d.id)}">✕</button>` : ''}</div>`;
        }).join('')}
        <button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-a="nuevo-doc" data-p="${esc(p)}">＋ Cargar documento</button></div>`;
    }).join('')}`;
}

/** El aviso fijo arriba del chat y del mapa. */
function avisoFijo() {
  const v = a.viaje;
  if (!v?.aviso) return '';
  return `<div class="aviso-fijo">📌 ${esc(v.aviso)}${v.avisoAutor ? `<div class="mini">${esc(a.nombre(v.avisoAutor))}${v.avisoFecha ? ` · ${haceCuanto(v.avisoFecha)}` : ''}</div>` : ''}</div>`;
}

/** Botón "Ocultar" para un organizador sobre lo de otro (lo propio se borra). */
const botonOcultar = (x, confirmar = '¿Ocultarlo para todos? Lo podés volver a mostrar desde Organizar.') =>
  a.soyAdmin && x.autor !== a.yo ? `<button class="borrar" style="color:var(--tinta-2)" data-a="ocultar" data-id="${esc(x.id)}" data-confirmar="${esc(confirmar)}">Ocultar</button>` : '';

// ── Revelación del destino sorpresa

function pintarRevelacion() {
  const el = document.createElement('div');
  el.className = 'revelacion';
  const confeti = Array.from({ length: 70 }, () => `<span class="papel" style="left:${Math.random() * 100}%;background:hsl(${Math.random() * 360},90%,60%);animation-duration:${2.5 + Math.random() * 3}s;animation-delay:${Math.random() * 1.5}s"></span>`).join('');
  el.innerHTML = `${confeti}<div class="avion">✈️</div><h2>¡Se reveló el destino!</h2><div class="destino">${esc(a.viaje.destino)}</div>
    <button class="boton" style="background:#fff;color:var(--acento);margin-top:40px" data-v="listo">¡Vamos!</button>`;
  el.addEventListener('click', e => { if (e.target.dataset.v === 'listo') { guardarLS(`revelacionVista-${a.viajeID}`, true); mostrarRevelacion = false; el.remove(); render(); } });
  document.body.appendChild(el);
}

// ───────────────────────── Hojas (formularios)

let hoja = null;   // { titulo, cuerpo(), ok(), okTexto, puedeOk(), estado }
function abrirHoja(h) { hoja = h; $('#hoja-fondo').hidden = false; pintarHoja(); setTimeout(() => $('#hoja input:not([type=checkbox]):not([type=file]), #hoja textarea')?.focus(), 250); }
function cerrarHoja() { hoja = null; $('#hoja-fondo').hidden = true; $('#hoja').innerHTML = ''; }
function pintarHoja() {
  if (!hoja) return;
  const scroll = $('#hoja').scrollTop;
  $('#hoja').innerHTML = `<div class="hoja-cab"><button data-h="cancelar">Cancelar</button><b>${esc(hoja.titulo)}</b>${hoja.ok ? `<button data-h="ok" ${hoja.puedeOk && !hoja.puedeOk() ? 'disabled' : ''}>${esc(hoja.okTexto || 'Guardar')}</button>` : '<span style="min-width:70px"></span>'}</div>${hoja.cuerpo()}`;
  $('#hoja').scrollTop = scroll;
  animarBarras();
}
function refrescarOk() { const b = $('#hoja [data-h=ok]'); if (b && hoja?.puedeOk) b.disabled = !hoja.puedeOk(); }
$('#hoja-fondo').addEventListener('click', async e => {
  if (e.target.id === 'hoja-fondo') return cerrarHoja();
  const h = e.target.closest('[data-h]');
  if (h?.dataset.h === 'cancelar') return cerrarHoja();
  if (h?.dataset.h === 'ok' && !h.disabled) { const r = await hoja.ok(); if (r !== false) cerrarHoja(); return; }
  const b = e.target.closest('[data-ha]');
  if (b && hoja?.accion) { hoja.accion(b.dataset.ha, b); }
});
$('#hoja').addEventListener('input', e => {
  const k = e.target.dataset.hc;
  if (k && hoja) { hoja.estado[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; refrescarOk(); if (e.target.dataset.repinta != null) pintarHoja(); }
});
$('#hoja').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.buscar != null) { e.preventDefault(); hoja.accion('buscar', e.target); } });

function elegirPersonas(sel, clave = 'gente') {
  return `<div class="lista elegir">${a.aprobados.map(m => `<div class="fila" data-ha="elegir" data-u="${esc(m.autor)}" data-k="${clave}">${av(m.autor, 28)}<span class="crece">${esc(a.nombre(m.autor))}</span><span class="tilde ${sel.includes(m.autor) ? 'si' : ''}">${sel.includes(m.autor) ? '✓' : ''}</span></div>`).join('')}</div>`;
}
function alternar(arr, u) { const i = arr.indexOf(u); i >= 0 ? arr.splice(i, 1) : arr.push(u); }

const hojas = {
  perfil(primera) {
    const p = { ...(a.perfil || borrador) };
    abrirHoja({
      titulo: 'Mi perfil', estado: p, okTexto: 'Guardar', puedeOk: () => p.nombre.trim().length > 0,
      cuerpo: () => `<label class="et">Nombre</label><input class="campo" data-hc="nombre" value="${esc(p.nombre)}" maxlength="30">
        <label class="et">Emoji</label><div class="emojis" style="--c:${color(p.color)}">${EMOJIS.map(e => `<button data-ha="emoji" data-v="${e}" class="${e === p.emoji ? 'si' : ''}">${e}</button>`).join('')}</div>
        <label class="et">Color</label><div class="colores">${COLORES.map((c, i) => `<button data-ha="color" data-i="${i}" style="--c:${c}" class="${i === p.color ? 'si' : ''}"></button>`).join('')}</div>`,
      accion: (k, b) => { if (k === 'emoji') p.emoji = b.dataset.v; if (k === 'color') p.color = +b.dataset.i; pintarHoja(); },
      ok: () => { p.nombre = p.nombre.trim(); actualizarPerfil(p); render(); },
    });
  },

  juego() {
    const e = { nombre: '', emoji: '🎲', ganaMayor: true };
    abrirHoja({
      titulo: 'Nuevo juego', estado: e, okTexto: 'Crear', puedeOk: () => e.nombre.trim().length > 0,
      cuerpo: () => `<input class="campo" data-hc="nombre" placeholder="Nombre (ej: Truco)" value="${esc(e.nombre)}" maxlength="30">
        <label class="et">Emoji</label><div class="emojis" style="--c:var(--acento)">${EMOJIS_JUEGO.map(x => `<button data-ha="emoji" data-v="${x}" class="${x === e.emoji ? 'si' : ''}">${x}</button>`).join('')}</div>
        <label class="et">¿Quién gana?</label><div class="lista elegir">
          <div class="fila" data-ha="gana" data-v="1"><span class="crece">El que más puntos tiene</span><span class="tilde ${e.ganaMayor ? 'si' : ''}">${e.ganaMayor ? '✓' : ''}</span></div>
          <div class="fila" data-ha="gana" data-v="0"><span class="crece">El que menos tiene (golf, tiempo…)</span><span class="tilde ${e.ganaMayor ? '' : 'si'}">${e.ganaMayor ? '' : '✓'}</span></div></div>`,
      accion: (k, b) => { if (k === 'emoji') e.emoji = b.dataset.v; if (k === 'gana') e.ganaMayor = b.dataset.v === '1'; pintarHoja(); },
      ok: () => {
        const j = Nuevo.juego(e.nombre.trim(), e.emoji, e.ganaMayor);
        guardar('juego', j);
        anunciar(`creó el juego ${j.emoji} ${j.nombre}`, `juego:${j.id}`);
      },
    });
  },

  puntos(j) {
    const e = {};
    abrirHoja({
      titulo: `${j.emoji} Cargar puntos`, estado: e, okTexto: 'Guardar',
      cuerpo: () => `<div class="seccion-t">Puntos de esta ronda (dejá vacío al que no jugó)</div><div class="lista">${a.aprobados.map(m => `<div class="fila">${av(m.autor, 28)}<span class="crece">${esc(a.nombre(m.autor))}</span>
        <input class="campo num" style="width:90px;text-align:right" inputmode="decimal" data-hc="${esc(m.autor)}" placeholder="0" value="${esc(e[m.autor] ?? '')}"></div>`).join('')}</div>`,
      ok: () => {
        const cargados = [];
        for (const [u, t] of Object.entries(e)) {
          const n = parseFloat(String(t).replace(',', '.'));
          if (!Number.isNaN(n)) { guardar('puntaje', Nuevo.puntaje(j.id, u, n)); cargados.push(`${a.nombre(u)} ${n >= 0 ? '+' : ''}${numero(n)}`); }
        }
        if (cargados.length) anunciar(`cargó puntos de ${j.emoji} ${j.nombre}: ${cargados.join(', ')}`, `juego:${j.id}`);
      },
    });
  },

  equipos(juego) {
    const e = { titulo: juego?.nombre ?? '', cantidad: 2, gente: a.aprobados.map(m => m.autor), parejos: false, resultado: [], nombres: [], mezclando: false };
    const pie = () => {
      const n = e.gente.length, c = e.cantidad;
      return n < c ? `Elegí al menos ${c} personas.` : `Quedan de ${n / c | 0}${n % c === 0 ? '' : ` o ${(n / c | 0) + 1}`} por equipo.${e.parejos ? ' Los mejores del ranking se reparten entre los equipos.' : ''}`;
    };
    const h = {
      titulo: 'Armar equipos', estado: e,
      cuerpo: () => `<label class="et">¿Para qué son los equipos?</label>
        <input class="campo" data-hc="titulo" placeholder="Ej: Fútbol en la playa, búsqueda del tesoro…" value="${esc(e.titulo)}" maxlength="40">
        ${a.juegos.length ? `<div class="chips" style="margin-top:8px">${a.juegos.map(j => `<button class="boton chico ${e.titulo === j.nombre ? '' : 'gris'}" data-ha="titulo" data-v="${esc(j.nombre)}">${esc(j.emoji)} ${esc(j.nombre)}</button>`).join('')}</div>` : ''}
        <div class="tarjeta" style="margin-top:14px">
          <div class="renglon"><span style="flex:1">Cantidad de equipos</span><span class="contador"><button data-ha="menos">−</button><b class="num">${e.cantidad}</b><button data-ha="mas">＋</button></span></div>
          <label class="interruptor"><span>Parejos según el ranking</span><input type="checkbox" data-hc="parejos" data-repinta ${e.parejos ? 'checked' : ''}></label>
          <div class="mini">${pie()}</div></div>
        ${e.resultado.length ? `<div class="seccion-t">Equipos</div><div class="${e.mezclando ? 'mezclando' : ''}">${e.resultado.map((g, i) => tarjetaEquipo(e.nombres[i], g, color(i * 3))).join('')}</div>` : ''}
        <div class="renglon" style="margin-top:14px;gap:10px"><button class="boton ${e.resultado.length ? 'gris' : ''}" style="flex:1" data-ha="sortear" ${e.gente.length < e.cantidad || e.mezclando ? 'disabled' : ''}>🎲 ${e.resultado.length ? 'Otra vez' : 'Sortear'}</button>
          ${e.resultado.length ? `<button class="boton" style="flex:1" data-ha="publicar" ${e.mezclando ? 'disabled' : ''}>Publicar</button>` : ''}</div>
        <div class="seccion-t">Quiénes juegan · ${e.gente.length} <button class="enlace der" style="font-size:13px" data-ha="todos">${e.gente.length === a.aprobados.length ? 'Ninguno' : 'Todos'}</button></div>
        ${elegirPersonas(e.gente)}`,
      accion: async (k, b) => {
        if (k === 'titulo') e.titulo = b.dataset.v;
        if (k === 'menos') e.cantidad = Math.max(2, e.cantidad - 1);
        if (k === 'mas') e.cantidad = Math.min(10, Math.max(2, Math.min(e.cantidad + 1, e.gente.length)));
        if (k === 'elegir') alternar(e.gente, b.dataset.u);
        if (k === 'todos') e.gente = e.gente.length === a.aprobados.length ? [] : a.aprobados.map(m => m.autor);
        if (k === 'sortear') {
          e.mezclando = true;
          e.nombres = mezclar(NOMBRES_EQUIPO).slice(0, e.cantidad);
          for (let i = 0; i < 8; i++) { e.resultado = armarEquipos(e.gente, e.cantidad, false); pintarHoja(); await new Promise(r => setTimeout(r, 60 + i * 25)); }
          e.resultado = armarEquipos(e.gente, e.cantidad, e.parejos);
          e.mezclando = false;
          navigator.vibrate?.(30);
        }
        if (k === 'publicar') {
          const tit = e.titulo.trim() || 'Equipos';
          const eq = Nuevo.equipos(tit, e.resultado, e.nombres, e.parejos);
          guardar('equipos', eq);
          anunciar(`armó equipos para ${e.titulo.trim() || 'jugar'}: ${e.resultado.map((g, i) => `${e.nombres[i]} (${g.map(u => a.nombre(u)).join(', ')})`).join(' · ')}`, `equipos:${eq.id}`);
          cerrarHoja(); return;
        }
        pintarHoja();
      },
    };
    abrirHoja(h);
  },

  tarea() {
    const e = { titulo: '', categoria: 'limpieza', responsables: [], conDia: true, dia: new Date().toISOString().slice(0, 10), cuantos: 2 };
    abrirHoja({
      titulo: 'Nueva tarea', estado: e, okTexto: 'Crear', puedeOk: () => e.titulo.trim() && e.responsables.length,
      cuerpo: () => `<input class="campo" data-hc="titulo" placeholder="Qué hay que hacer" value="${esc(e.titulo)}" maxlength="60">
        <label class="et">Tipo</label><div class="chips">${CATEGORIAS.map(([c, n, i]) => `<button class="boton chico ${e.categoria === c ? '' : 'gris'}" data-ha="cat" data-v="${c}">${i} ${n}</button>`).join('')}</div>
        <label class="interruptor"><span>Para un día</span><input type="checkbox" data-hc="conDia" data-repinta ${e.conDia ? 'checked' : ''}></label>
        ${e.conDia ? `<input type="date" class="campo" data-hc="dia" value="${e.dia}">` : ''}
        <div class="seccion-t">Responsables</div>${elegirPersonas(e.responsables, 'resp')}
        <div class="renglon" style="margin-top:10px"><span class="contador" style="flex:1"><button data-ha="menos">−</button><span>Sortear ${e.cuantos}</span><button data-ha="mas">＋</button></span><button class="boton gris chico" data-ha="sortear">🎲 Sortear</button></div>`,
      accion: (k, b) => {
        if (k === 'cat') e.categoria = b.dataset.v;
        if (k === 'elegir') alternar(e.responsables, b.dataset.u);
        if (k === 'menos') e.cuantos = Math.max(1, e.cuantos - 1);
        if (k === 'mas') e.cuantos = Math.min(Math.max(a.aprobados.length, 1), e.cuantos + 1);
        if (k === 'sortear') {   // sorteo justo: primero los que menos tareas tienen, y entre ellos al azar
          const carga = {};
          for (const u of a.tareas.flatMap(t => t.responsables)) carga[u] = (carga[u] || 0) + 1;
          e.responsables = mezclar(a.aprobados.map(m => m.autor)).sort((x, y) => (carga[x] || 0) - (carga[y] || 0)).slice(0, e.cuantos);
        }
        pintarHoja();
      },
      ok: () => {
        const dia = e.conDia && e.dia ? new Date(`${e.dia}T00:00:00`).getTime() : undefined;
        const t = Nuevo.tarea(e.titulo.trim(), e.categoria, e.responsables, dia);
        guardar('tarea', t);
        anunciar(`creó la tarea “${t.titulo}” para ${lista(t.responsables.map(u => a.nombre(u)))}${dia != null ? ` · ${esHoy(dia) ? 'hoy' : fmt(dia, { weekday: 'long', day: 'numeric' })}` : ''}`, `tarea:${t.id}`);
      },
    });
  },

  gasto() {
    const e = { descripcion: '', monto: '', pagador: a.yo, entre: a.aprobados.map(m => m.autor) };
    const valor = () => { const v = parseFloat(String(e.monto).replace(/\./g, '').replace(',', '.')); return v > 0 ? v : null; };
    const leToca = () => valor() && e.entre.length ? `Le toca ${plata(valor() / e.entre.length, a.moneda)} a cada uno.` : '';
    abrirHoja({
      titulo: 'Nuevo gasto', estado: e, okTexto: 'Guardar', puedeOk: () => valor() && e.descripcion.trim() && e.entre.length,
      cuerpo: () => `<input class="campo" data-hc="descripcion" placeholder="En qué (ej: Súper)" value="${esc(e.descripcion)}" maxlength="50">
        <input class="campo num" style="margin-top:8px" inputmode="decimal" data-hc="monto" placeholder="Cuánto" value="${esc(e.monto)}">
        <label class="et">Pagó</label><select class="campo" data-hc="pagador">${a.aprobados.map(m => `<option value="${esc(m.autor)}" ${m.autor === e.pagador ? 'selected' : ''}>${esc(m.emoji)} ${esc(a.nombre(m.autor))}</option>`).join('')}</select>
        <div class="seccion-t">Entre quiénes se divide <button class="enlace der" style="font-size:13px" data-ha="todos">${e.entre.length === a.aprobados.length ? 'Ninguno' : 'Todos'}</button></div>
        ${elegirPersonas(e.entre)}
        <p class="pie" id="le-toca">${leToca()}</p>`,
      accion: (k, b) => {
        if (k === 'elegir') alternar(e.entre, b.dataset.u);
        if (k === 'todos') e.entre = e.entre.length === a.aprobados.length ? [] : a.aprobados.map(m => m.autor);
        pintarHoja();
      },
      ok: () => { guardar('gasto', Nuevo.gasto(e.descripcion.trim(), valor(), e.pagador, e.entre)); },
    });
    // Cuánto le toca a cada uno, mientras se escribe el monto
    $('#hoja').addEventListener('input', function cuenta(ev) {
      if (!hoja || hoja.titulo !== 'Nuevo gasto') return $('#hoja').removeEventListener('input', cuenta);
      if (ev.target.dataset.hc === 'monto') $('#le-toca').textContent = leToca();
    });
  },

  evento() {
    const d = new Date(ahora() + 3600000), dos = n => String(n).padStart(2, '0');
    const e = { titulo: '', cuando: `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:00`, lugar: '', nota: '', lat: null, lon: null, resultados: [], buscando: false };
    abrirHoja({
      titulo: 'Nuevo evento', estado: e, okTexto: 'Guardar', puedeOk: () => e.titulo.trim() && e.cuando,
      cuerpo: () => `<input class="campo" data-hc="titulo" placeholder="Qué (ej: Salida a la playa)" value="${esc(e.titulo)}" maxlength="60">
        <label class="et">Cuándo</label><input type="datetime-local" class="campo" data-hc="cuando" value="${e.cuando}">
        <label class="et">Dónde</label><div class="renglon"><input class="campo" data-hc="lugar" data-buscar placeholder="Buscá un lugar" value="${esc(e.lugar)}"><button class="boton gris chico" data-ha="buscar">Buscar</button></div>
        ${e.lat != null ? '<p class="pie" style="color:var(--verde)">📍 Ubicación en el mapa ✓</p>' : ''}
        ${e.buscando ? '<div class="cargando oscuro"></div>' : ''}
        ${e.resultados.length ? `<div class="lista" style="margin-top:8px">${e.resultados.map((r, i) => `<div class="fila" data-ha="lugar" data-i="${i}" style="cursor:pointer"><span class="crece"><div class="t">${esc(r.nombre)}</div><div class="s">${esc(r.detalle)}</div></span></div>`).join('')}</div>` : ''}
        <button class="enlace" style="margin-top:10px" data-ha="aca">📍 Usar dónde estoy ahora</button>
        <p class="pie">Escribí el lugar y tocá Buscar; así aparece en el mapa del grupo.</p>
        <label class="et">Nota (opcional)</label><textarea class="campo" data-hc="nota" maxlength="300">${esc(e.nota)}</textarea>`,
      accion: async (k, b) => {
        if (k === 'buscar') {
          e.buscando = true; pintarHoja();
          const cerca = a.viaje?.latitud != null ? { lat: a.viaje.latitud, lon: a.viaje.longitud } : ubicacion.actual;
          e.resultados = await buscarLugar(e.lugar, cerca);
          e.buscando = false;
          if (!e.resultados.length) avisar('No encontré ese lugar');
        }
        if (k === 'lugar') { const r = e.resultados[+b.dataset.i]; e.lugar = r.nombre; e.lat = r.lat; e.lon = r.lon; e.resultados = []; }
        if (k === 'aca') { const p = await ubicacion.posicion(); if (p) { e.lat = p.lat; e.lon = p.lon; if (!e.lugar) e.lugar = 'Acá'; } else avisar('No tengo tu ubicación'); }
        pintarHoja();
      },
      ok: () => {
        const ev = Nuevo.evento(e.titulo.trim(), new Date(e.cuando).getTime(), e.lugar.trim(), e.nota.trim(), e.lat ?? undefined, e.lon ?? undefined);
        guardar('evento', ev);
        anunciar(`sumó a la agenda: “${ev.titulo}” · ${fmt(ev.inicio, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`, `evento:${ev.id}`);
      },
    });
  },

  encuesta() {
    const e = { pregunta: '', opciones: ['', ''], multiple: false };
    const validas = () => e.opciones.map(o => o.trim()).filter(Boolean);
    abrirHoja({
      titulo: 'Nueva votación', estado: e, okTexto: 'Publicar', puedeOk: () => e.pregunta.trim() && validas().length >= 2,
      cuerpo: () => `<textarea class="campo" data-hc="pregunta" placeholder="Pregunta" maxlength="140">${esc(e.pregunta)}</textarea>
        <label class="et">Opciones</label>${e.opciones.map((o, i) => `<input class="campo" style="margin-top:6px" data-op="${i}" placeholder="Opción ${i + 1}" value="${esc(o)}" maxlength="60">`).join('')}
        ${e.opciones.length < 8 ? '<button class="enlace" style="margin-top:10px" data-ha="otra">＋ Agregar opción</button>' : ''}
        <label class="interruptor"><span>Se puede elegir más de una</span><input type="checkbox" data-hc="multiple" ${e.multiple ? 'checked' : ''}></label>`,
      accion: k => { if (k === 'otra') { e.opciones.push(''); pintarHoja(); $(`#hoja [data-op="${e.opciones.length - 1}"]`).focus(); } },
      ok: () => {
        const en = Nuevo.encuesta(e.pregunta.trim(), validas(), e.multiple);
        guardar('encuesta', en);
        anunciar(`abrió una votación: “${en.pregunta}”`, `encuesta:${en.id}`);
      },
    });
    $('#hoja').addEventListener('input', function op(ev) {
      if (!hoja || hoja.titulo !== 'Nueva votación') return $('#hoja').removeEventListener('input', op);
      if (ev.target.dataset.op != null) { e.opciones[+ev.target.dataset.op] = ev.target.value; refrescarOk(); }
    });
  },

  viaje() {
    const v = { ...a.viaje };
    const e = { busca: '', aeropuertos: [], buscando: false, conHora: v.revelarA != null,
      hora: v.revelarA ? new Date(v.revelarA - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' };
    const proxy = new Proxy(e, { set(t, k, val) { if (['nombre', 'destino', 'moneda', 'driveCarpeta', 'driveSubida', 'driveClave'].includes(k)) v[k] = val; else t[k] = val; return true; },
      get(t, k) { return k in v && ['nombre', 'destino', 'moneda', 'driveCarpeta', 'driveSubida', 'driveClave', 'destinoOculto'].includes(k) ? v[k] : t[k]; } });
    abrirHoja({
      titulo: 'El viaje', estado: proxy, okTexto: 'Guardar', puedeOk: () => v.nombre?.trim(),
      cuerpo: () => `<label class="et">Nombre</label><input class="campo" data-hc="nombre" value="${esc(v.nombre)}" maxlength="40">
        <label class="et">Destino</label><input class="campo" data-hc="destino" value="${esc(v.destino)}" maxlength="60">
        <label class="et">Moneda (ej: $, US$, €)</label><input class="campo" data-hc="moneda" value="${esc(v.moneda)}" maxlength="6">
        ${v.latitud != null ? '<p class="pie" style="color:var(--verde)">📍 Destino ubicado en el mapa</p>' : ''}
        <div class="seccion-t">Sorpresa</div><div class="tarjeta">
          <label class="interruptor"><span>Destino sorpresa</span><input type="checkbox" data-ha-check="oculto" ${v.destinoOculto ? 'checked' : ''}></label>
          ${v.destinoOculto ? `
            <div class="renglon"><input class="campo" data-hc="busca" data-buscar placeholder="Aeropuerto de salida (ej: Ezeiza)" value="${esc(e.busca)}"><button class="boton gris chico" data-ha="buscar">Buscar</button></div>
            ${v.aeropuertoNombre ? `<p class="pie" style="color:var(--verde)">🛫 ${esc(v.aeropuertoNombre)}</p>` : ''}
            ${e.buscando ? '<div class="cargando oscuro"></div>' : ''}
            ${e.aeropuertos.map((r, i) => `<div class="fila" data-ha="aeropuerto" data-i="${i}" style="cursor:pointer;padding-left:0"><span class="crece"><div class="t">${esc(r.nombre)}</div><div class="s">${esc(r.detalle)}</div></span></div>`).join('')}
            <label class="interruptor"><span>Revelarlo también a una hora</span><input type="checkbox" data-ha-check="conHora" ${e.conHora ? 'checked' : ''}></label>
            ${e.conHora ? `<input type="datetime-local" class="campo" data-hc="hora" value="${e.hora}">` : ''}
            <button class="boton ${v.revelado ? 'gris' : 'suave'} ancho" style="margin-top:10px" data-ha="revelar" ${v.revelado ? 'disabled' : ''}>${v.revelado ? 'Ya está revelado para todos' : 'Revelarlo ahora a todos'}</button>` : ''}
        </div>
        <p class="pie">Los demás ven "Destino secreto" hasta que llegan a menos de 2,5 km del aeropuerto: ahí su teléfono les muestra el destino. Vos lo ves siempre. Ojo con el nombre del viaje, los gastos y la agenda, que no lo delaten.</p>
        <div class="seccion-t">Fotos en Google Drive</div>
        <input class="campo" data-hc="driveCarpeta" placeholder="Link de la carpeta (para ver y descargar)" value="${esc(v.driveCarpeta ?? '')}" autocapitalize="off">
        <input class="campo" style="margin-top:6px" data-hc="driveSubida" placeholder="Dirección del script de subida" value="${esc(v.driveSubida ?? '')}" autocapitalize="off">
        <input class="campo" style="margin-top:6px" data-hc="driveClave" placeholder="Clave del script" value="${esc(v.driveClave ?? '')}" autocapitalize="off">
        <p class="pie">Cada foto que alguien comparte se sube sola a esta carpeta, en su tamaño original.</p>`,
      accion: async (k, b) => {
        if (k === 'buscar') {
          e.buscando = true; pintarHoja();
          e.aeropuertos = await buscarLugar(/aeropuerto|airport/i.test(e.busca) ? e.busca : `aeropuerto ${e.busca}`);
          e.buscando = false;
        }
        if (k === 'aeropuerto') { const r = e.aeropuertos[+b.dataset.i]; v.aeropuertoNombre = r.nombre; v.aeropuertoLat = r.lat; v.aeropuertoLon = r.lon; e.aeropuertos = []; e.busca = ''; }
        if (k === 'revelar') v.revelado = true;
        pintarHoja();
      },
      ok: async () => {
        for (const k of ['driveCarpeta', 'driveSubida', 'driveClave']) if (!v[k]?.trim()) delete v[k]; else v[k] = v[k].trim();
        if (!v.destinoOculto) delete v.destinoOculto;
        v.revelarA = v.destinoOculto && e.conHora && e.hora ? new Date(e.hora).getTime() : undefined;
        if (v.destino && (v.destino !== a.viaje.destino || v.latitud == null)) {
          const r = await buscarLugar(v.destino);
          if (r[0]) { v.latitud = r[0].lat; v.longitud = r[0].lon; }
        }
        v.nombre = v.nombre.trim();
        guardarViaje(v);
      },
    });
    $('#hoja').addEventListener('change', function chk(ev) {
      if (!hoja || hoja.titulo !== 'El viaje') return $('#hoja').removeEventListener('change', chk);
      const k = ev.target.dataset.haCheck;
      if (k === 'oculto') { v.destinoOculto = ev.target.checked || undefined; pintarHoja(); }
      if (k === 'conHora') { e.conHora = ev.target.checked; if (e.conHora && !e.hora) e.hora = new Date(ahora() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); pintarHoja(); }
    });
  },

  dondeEstas() {
    abrirHoja({
      titulo: '¿A quién le preguntás?', estado: {},
      cuerpo: () => `<div class="lista elegir">${a.aprobados.filter(m => m.autor !== a.yo).map(m => `<div class="fila" data-ha="a" data-u="${esc(m.autor)}">${av(m.autor, 32)}<span class="crece">${esc(m.nombre)}</span>›</div>`).join('')}</div>`,
      accion: (k, b) => {
        const m = a.miembros[b.dataset.u];
        guardar('mensaje', Nuevo.mensaje(`${m.nombre}, ¿dónde estás? 📍`, 'dondeEstas', { para: m.autor }));
        cerrarHoja();
      },
    });
  },

  /** Cambiar el voto en una votación de varias opciones: el único cambio permitido. */
  cambiarVoto(e, mio, tocada) {
    const sel = mio.includes(tocada) ? mio.filter(x => x !== tocada) : [...mio, tocada];
    abrirHoja({
      titulo: 'Cambiar mi voto', estado: {}, okTexto: 'Cambiar', puedeOk: () => sel.length > 0,
      cuerpo: () => `<div class="aviso-fijo" style="margin-top:4px">⚠️ Solo podés cambiar tu voto <b>una vez</b> por votación. Después queda fijo.</div>
        <b style="display:block;margin:10px 2px">${esc(e.pregunta)}</b>
        <div class="lista elegir">${e.opciones.map((op, i) => `<div class="fila" data-ha="op" data-i="${i}"><span class="crece">${esc(op)}</span><span class="tilde ${sel.includes(i) ? 'si' : ''}">${sel.includes(i) ? '✓' : ''}</span></div>`).join('')}</div>`,
      accion: (k, b) => { const i = +b.dataset.i; const p = sel.indexOf(i); p >= 0 ? sel.splice(p, 1) : sel.push(i); pintarHoja(); },
      ok: () => { if (!confirm('¿Confirmás el cambio? Es el único que tenés en esta votación.')) return false; guardar('voto', Nuevo.voto(e.id, [...sel].sort(), 1)); },
    });
  },

  decomiso() {
    const e = { persona: a.aprobados.find(m => m.autor !== a.yo)?.autor ?? a.yo, item: '', multa: '', nota: '', miniatura: null, cargando: false };
    abrirHoja({
      titulo: 'Ítem decomisado', estado: e, okTexto: 'Cargar', puedeOk: () => e.item.trim() && !e.cargando,
      cuerpo: () => `<label class="et">¿A quién?</label><select class="campo" data-hc="persona">${a.aprobados.map(m => `<option value="${esc(m.autor)}" ${m.autor === e.persona ? 'selected' : ''}>${esc(m.emoji)} ${esc(a.nombre(m.autor))}</option>`).join('')}</select>
        <label class="et">¿Qué se decomisó?</label><input class="campo" data-hc="item" placeholder="Ej: 11ª remera, secador de pelo" value="${esc(e.item)}" maxlength="60">
        <label class="et">Multa (opcional)</label><input class="campo" data-hc="multa" placeholder="Ej: paga el helado de todos" value="${esc(e.multa)}" maxlength="60">
        <label class="et">Nota (opcional)</label><input class="campo" data-hc="nota" placeholder="Ej: la llevaba puesta y no contaba" value="${esc(e.nota)}" maxlength="120">
        <label class="et">Foto de la prueba (opcional)</label>
        <label class="boton gris chico" style="cursor:pointer">${e.miniatura ? '📷 Cambiar foto' : '📷 Sacar o elegir foto'}<input type="file" accept="image/*" hidden data-foto-decomiso></label>
        ${e.cargando ? '<div class="cargando oscuro"></div>' : e.miniatura ? `<img class="foto-decomiso grande" src="data:image/jpeg;base64,${e.miniatura}" alt="">` : ''}`,
      ok: () => {
        const d = Nuevo.decomiso(e.persona, e.item.trim(), e.multa.trim() || undefined, e.nota.trim() || undefined, e.miniatura || undefined);
        guardar('decomiso', d);
        anunciar(`decomisó a ${a.nombre(e.persona) === 'Vos' ? 'sí mismo' : a.nombre(e.persona)}: ${d.item}${d.multa ? ` · multa: ${d.multa}` : ''} 🚨`, `decomiso:${d.id}`);
      },
    });
    $('#hoja').addEventListener('change', async function foto(ev) {
      if (!hoja || hoja.titulo !== 'Ítem decomisado') return $('#hoja').removeEventListener('change', foto);
      if (ev.target.dataset.fotoDecomiso == null || !ev.target.files[0]) return;
      e.cargando = true; pintarHoja();
      try { e.miniatura = await miniatura(ev.target.files[0], 480); } catch (err) { avisar(mensajeError(err)); }
      e.cargando = false; pintarHoja();
    });
  },

  aviso() {
    const e = { texto: a.viaje.aviso ?? '' };
    abrirHoja({
      titulo: 'Aviso fijo', estado: e, okTexto: 'Publicar', puedeOk: () => e.texto.trim().length > 0,
      cuerpo: () => `<textarea class="campo" data-hc="texto" maxlength="200" placeholder="Ej: Mañana salimos 8 am de la casa">${esc(e.texto)}</textarea>
        <p class="pie">Se ve arriba del chat y del mapa para todos, hasta que lo saques o lo cambies.</p>`,
      ok: () => {
        guardarViaje({ ...a.viaje, aviso: e.texto.trim(), avisoFecha: ahora(), avisoAutor: a.yo });
        guardar('mensaje', Nuevo.mensaje(`📌 ${e.texto.trim()}`));
      },
    });
  },

  persona(u) {
    const m = a.miembros[u];
    if (!m) return;
    const org = a.organiza(u);
    abrirHoja({
      titulo: m.nombre, estado: {},
      cuerpo: () => `<div class="centro" style="margin:6px 0 14px">${av(u, 64)}<div class="chico" style="margin-top:6px">${org ? 'Organiza el viaje' : 'Está en el viaje'}</div></div>
        <div class="lista">
          <button class="fila" style="width:100%;text-align:left;color:var(--acento)" data-ha="org">${org ? (u === a.yo ? 'Dejar de organizar' : 'Quitar como organizador') : '⭐️ Nombrar organizador'}</button>
          ${u !== a.yo ? '<button class="fila" style="width:100%;text-align:left;color:var(--rojo)" data-ha="sacar">Sacar del viaje</button>' : ''}
        </div>
        <p class="pie">${org ? 'Va a seguir en el viaje como uno más.' : 'Va a poder aprobar gente, nombrar organizadores, editar el viaje, poner el aviso y ocultar cosas.'}</p>`,
      accion: k => {
        if (k === 'org') hacerOrganizador(u, !org);
        if (k === 'sacar') { if (!confirm(`¿Sacar a ${m.nombre} del viaje?`)) return; decidir(u, false); }
        cerrarHoja();
      },
    });
  },

  quienSos() {
    noEstoy = { abierto: false, nombre: '' };
    abrirHoja({ titulo: 'Tu perfil del viaje', estado: {}, cuerpo: () => vQuienSos(false),
      accion: () => {} });
  },

  ficha(f) {
    const e = { nombre: f?.nombre || '', foto: f?.foto };
    abrirHoja({
      titulo: f ? 'Editar perfil' : 'Nuevo perfil', estado: e, okTexto: 'Guardar', puedeOk: () => e.nombre.trim().length > 0,
      cuerpo: () => `<div class="centro" style="margin:8px 0 14px"><label style="cursor:pointer;display:inline-block">${e.foto ? `<img src="data:image/jpeg;base64,${e.foto}" style="width:110px;height:110px;border-radius:50%;object-fit:cover" alt="">` : '<span class="av" style="width:110px;height:110px;font-size:40px;--c:var(--tinta-2)">📷</span>'}
          <input type="file" accept="image/*" hidden data-foto-ficha></label><div class="mini">Tocá para elegir la foto</div></div>
        <label class="et">Apodo</label><input class="campo" data-hc="nombre" value="${esc(e.nombre)}" maxlength="30" autocapitalize="words">`,
      ok: () => {
        const n = e.nombre.trim();
        if (f) guardar('ficha', { ...f, nombre: n, foto: e.foto, fecha: ahora() });
        else guardar('ficha', Nuevo.ficha(n, e.foto, a.fichas.length % COLORES.length, Math.max(0, ...a.fichas.map(x => x.orden ?? 0)) + 1));
      },
    });
  },

  documento(persona) {
    const e = { clase: 'seguro', titulo: '', archivo: null };
    abrirHoja({
      titulo: 'Cargar documento', estado: e, okTexto: 'Subir', puedeOk: () => !!e.archivo && e.archivo.size < 9e6,
      cuerpo: () => `<label class="et">Qué es</label><div class="segmentos" style="flex-wrap:wrap">${CLASES_DOC.map(c => `<button data-ha="clase" data-v="${c[0]}" class="${e.clase === c[0] ? 'si' : ''}">${c[2]} ${c[1]}</button>`).join('')}</div>
        <label class="et">Título</label><input class="campo" data-hc="titulo" value="${esc(e.titulo)}" placeholder="Ej: Seguro Assist Card" maxlength="60">
        <label class="et">Archivo</label><label class="boton gris ancho" style="cursor:pointer">${e.archivo ? `✅ ${esc(e.archivo.name)}` : '📎 Elegir PDF o foto'}<input type="file" accept="application/pdf,image/*" hidden data-archivo-doc></label>
        <p class="pie">Para ${esc(a.nombrePersona(persona))}. Lo ven solo esa persona y los organizadores. Va cifrado.</p>`,
      accion: (k, b) => { if (k === 'clase') { e.clase = b.dataset.v; pintarHoja(); } },
      ok: async () => {
        const c = CLASES_DOC.find(x => x[0] === e.clase);
        avisar('Subiendo y cifrando…', true);
        try { await subirDocumento(persona, e.titulo.trim() || c[1], e.clase, e.archivo); avisar('Documento cargado 🔒', true); }
        catch (err) { avisar(`No se pudo subir: ${mensajeError(err)}`); return false; }
      },
    });
  },

  nombrar() {
    const candidatos = a.aprobados.filter(m => !a.organiza(m.autor));
    abrirHoja({
      titulo: 'Nombrar organizador', estado: {},
      cuerpo: () => candidatos.length
        ? `<div class="lista elegir">${candidatos.map(m => `<div class="fila" data-ha="elegir" data-u="${esc(m.autor)}">${av(m.autor, 32)}<span class="crece">${esc(m.nombre)}</span>⭐️</div>`).join('')}</div>
           <p class="pie">Va a poder aprobar gente, nombrar organizadores, editar el viaje, poner el aviso y ocultar cosas.</p>`
        : '<p class="pie">Todos los del viaje ya organizan.</p>',
      accion: (k, b) => { hacerOrganizador(b.dataset.u, true); cerrarHoja(); },
    });
  },

};

// ───────────────────────── Acciones (todos los toques pasan por acá)

const acciones = {
  'b-emoji': b => { borrador.emoji = b.dataset.v; render(); },
  'b-color': b => { borrador.color = +b.dataset.i; render(); },
  empezar: () => { a.perfil = { nombre: borrador.nombre.trim(), emoji: borrador.emoji, color: borrador.color }; guardarLocal(); render(); },
  'cambiar-perfil': () => hojas.perfil(),
  'entrar-apple': () => entrarConApple(),
  'salir-apple': () => { if (confirm('¿Salir de tu Apple ID en este navegador?')) salirDeApple(); },
  unirse: () => { const c = codigoDe(inicioCampos.link); if (c) unirse(c); },
  crear: () => crearViaje(inicioCampos.nombre.trim(), inicioCampos.destino.trim()),
  demo: () => { activarDemo(); arrancar(); ui.cambioDeVista = true; render(); },
  'salir-ya': () => salirDelViaje(),
  'borrar-mis-datos': () => { if (confirm('¿Borrar tus datos de este viaje?\nSe borran tu perfil, tus mensajes, tu ubicación, tus fotos, tus votos y tus documentos, y salís. Lo que cargaste para todos (gastos, tareas, agenda, juegos) queda para el grupo. No se puede deshacer.')) borrarMisDatos(); },
  salir: () => { if (confirm(a.esDemo ? '¿Salir del viaje de ejemplo?' : '¿Salir del viaje?\nPodés volver a entrar con el link, pero el organizador te tiene que aprobar de nuevo.')) salirDelViaje(); },
  pestana: b => {
    const i = +b.dataset.i;
    if (ui.pestana === i) { ui.seccion = null; ui.juego = null; }
    ui.pestana = i; ui.cambioDeVista = true;
    render();
  },
  // Mapa
  satelite: () => { ui.satelite = !ui.satelite; render(); },
  lugares: () => { ui.verLugares = !ui.verLugares; render(); },
  zoom: b => mapa.m?.setZoom(mapa.m.getZoom() + +b.dataset.v),
  'yo-mapa': async () => { const p = await ubicacion.posicion(); if (p) mapa.m.flyTo([p.lat, p.lon], 17, { duration: 0.8 }); else avisar('No tengo tu ubicación: dale permiso al navegador'); },
  'todos-mapa': () => { mapa.verTodos(); render(); },
  tira: b => { const u = b.dataset.u; if (!a.ubicaciones[u]) return; ui.seleccion = ui.seleccion === u ? null : u; if (ui.seleccion) mapa.centrar(u); render(); },
  // Chat
  enviar: () => {
    const t = redactar.texto.value.trim();
    if (!t) return;
    guardar('mensaje', Nuevo.mensaje(t));
    redactar.texto.value = ''; redactar.texto.style.height = 'auto'; redactar.el.querySelector('.enviar').disabled = true;
  },
  llegue: () => mensajeConUbicacion('llegue', 'Llegué ✅'),
  'estoy-aca': () => mensajeConUbicacion('ubicacion', 'Estoy acá 📍'),
  'mandar-ubicacion': () => mensajeConUbicacion('ubicacion', 'Estoy acá 📍'),
  'donde-estas': () => hojas.dondeEstas(),
  'abrir-enlace': b => abrirEnlace(b.dataset.e),
  'ir-mapa': b => {
    const u = b.dataset.u;
    ui.pestana = MAS; ui.seccion = 'mapa'; ui.cambioDeVista = true;
    if (a.ubicaciones[u]) { ui.seleccion = u; render(); mapa.centrar(u); }
    else { render(); if (b.dataset.lat) mapa.m.flyTo([+b.dataset.lat, +b.dataset.lon], 17); }
  },
  // Juegos
  'armar-equipos': b => hojas.equipos(a.juegos.find(j => j.id === b.dataset.juego)),
  'ver-sorteos': () => { ui.verTodosSorteos = !ui.verTodosSorteos; render(); },
  'por-pos': b => { ui.porPosiciones = b.dataset.v === '1'; render(); },
  'tocar-mvp': b => { ui.tocadoMVP = ui.tocadoMVP === b.dataset.u ? null : b.dataset.u; render(); },
  'tocar-rank': b => { ui.tocado = ui.tocado === b.dataset.u ? null : b.dataset.u; render(); },
  'nuevo-juego': () => hojas.juego(),
  'abrir-juego': b => { ui.juego = b.dataset.id; ui.cambioDeVista = true; history.pushState({ v: 'juego' }, ''); render(); },
  'cerrar-juego': () => { ui.juego = null; ui.cambioDeVista = true; render(); },
  'cargar-puntos': () => hojas.puntos(a.juegos.find(j => j.id === ui.juego)),
  // Tareas
  'nueva-tarea': () => hojas.tarea(),
  marcar: b => { const t = a.tareas.find(x => x.id === b.dataset.id); if (t) { const h = !hecha(t); guardar('marca', Nuevo.marca(t.id, h)); if (h) navigator.vibrate?.(20); } },
  'solo-mias': () => { ui.soloMias = !ui.soloMias; render(); },
  'ocultar-hechas': () => { ui.ocultarHechas = !ui.ocultarHechas; render(); },
  // Más
  seccion: b => { ui.seccion = b.dataset.s; ui.cambioDeVista = true; history.pushState({ v: ui.seccion }, ''); render(); },
  'volver-mas': () => { ui.seccion = null; ui.cambioDeVista = true; render(); },
  'nuevo-gasto': () => hojas.gasto(),
  'tocar-saldo': b => { ui.saldoTocado = ui.saldoTocado === b.dataset.u ? null : b.dataset.u; render(); },
  'ya-pague': b => {
    const x = transferencias()[+b.dataset.i];
    if (x && confirm(`¿Registrar el pago?\nLe pagaste ${plata(x.monto, a.moneda)} a ${a.nombre(x.a)}.`)) guardar('gasto', Nuevo.gasto('Pago', x.monto, x.de, [x.a], true));
  },
  'nuevo-evento': () => hojas.evento(),
  'ver-pasados': () => { ui.verPasados = !ui.verPasados; render(); },
  'nueva-encuesta': () => hojas.encuesta(),
  // Se vota con un toque; el voto se puede cambiar una sola vez, con un cartel que lo confirma.
  votar: b => {
    const e = a.encuestas.find(x => x.id === b.dataset.id), i = +b.dataset.i;
    if (!e) return;
    if (e.cerrada) { ui.verQuien[e.id] = ui.verQuien[e.id] === i ? undefined : i; return render(); }
    const v = a.votos.find(x => x.encuesta === e.id && x.autor === a.yo);
    const mio = v?.elegidas ?? [];
    if (!mio.length) { guardar('voto', Nuevo.voto(e.id, [i], v ? (v.cambios ?? 0) : undefined)); navigator.vibrate?.(20); return; }
    if ((v.cambios ?? 0) >= 1) return avisar('Ya cambiaste tu voto una vez: en esta votación queda fijo.');
    if (!e.multiple) {
      if (mio.includes(i)) return avisar(`Ya votaste “${e.opciones[i]}”. Para cambiar, tocá otra opción.`);
      if (confirm(`¿Cambiar tu voto a “${e.opciones[i]}”?\n\nSolo podés cambiarlo UNA vez por votación. Después queda fijo.`)) guardar('voto', Nuevo.voto(e.id, [i], 1));
      return;
    }
    hojas.cambiarVoto(e, mio, i);
  },
  porcion: b => { ui.porcion = ui.porcion || {}; ui.porcion[b.dataset.id] = ui.porcion[b.dataset.id] === +b.dataset.i ? undefined : +b.dataset.i; render(); },
  valija: b => {
    const t = tildadosDe(a.yo);
    t.has(b.dataset.k) ? t.delete(b.dataset.k) : t.add(b.dataset.k);
    guardar('valija', Nuevo.valija([...t]));
    if (t.has(b.dataset.k)) navigator.vibrate?.(15);
  },
  'ver-comunicado': () => { ui.verComunicado = !ui.verComunicado; render(); },
  'ver-valija': b => { ui.valijaAbierta = ui.valijaAbierta === b.dataset.u ? null : b.dataset.u; render(); },
  'nuevo-decomiso': () => hojas.decomiso(),
  'ver-quien': b => { const id = b.dataset.id; ui.verQuien[id] = ui.verQuien[id] == null ? 0 : (ui.verQuien[id] + 1 < a.encuestas.find(e => e.id === id).opciones.length ? ui.verQuien[id] + 1 : undefined); render(); },
  'cerrar-encuesta': b => { const e = a.encuestas.find(x => x.id === b.dataset.id); if (e) guardar('encuesta', { ...e, cerrada: !e.cerrada }); },
  columnas: b => { ui.columnas = +b.dataset.v; render(); },
  'ver-foto': b => verFoto(b.dataset.id),
  // Grupo
  'copiar-link': async () => {
    try { await navigator.clipboard.writeText(linkInvitacion()); avisar('Link copiado ✓', true); }
    catch { prompt('Copiá el link:', linkInvitacion()); }
  },
  persona: b => hojas.persona(b.dataset.u),
  'elegir-ficha': b => {
    const f = a.fichas.find(x => x.id === b.dataset.id);
    if (!f || !confirm(`¿Sos ${f.nombre}?\n\nQueda atado a tu Apple ID y sale de la lista. Si te equivocás, un organizador lo puede liberar.`)) return;
    elegirFicha(f); if (hoja) cerrarHoja(); render();
  },
  'no-estoy': () => { noEstoy.abierto = true; hoja ? pintarHoja() : render(); },
  'no-estoy-ok': async () => {
    const n = noEstoy.nombre.trim() || a.perfil?.nombre;
    if (!a.miembros[a.yo] && !n) return avisar('Escribí tu nombre');
    await noEstoyEnLaLista(n); if (hoja) cerrarHoja();
  },
  'quien-sos': () => hojas.quienSos(),
  'quitar-foto': () => { const m = a.miembros[a.yo]; if (m && confirm('¿Quitar tu foto?')) guardar('miembro', { ...m, foto: undefined }); },
  'seccion-organizar': () => { ui.seccion = 'organizar'; ui.cambioDeVista = true; render(); },
  'nueva-ficha': () => hojas.ficha(),
  'editar-ficha': b => hojas.ficha(a.fichas.find(f => f.id === b.dataset.id)),
  'borrar-ficha': b => { const f = a.fichas.find(x => x.id === b.dataset.id); if (f && confirm(`¿Borrar el perfil de ${f.nombre}?`)) borrar('ficha', f); },
  liberar: b => { const f = a.fichas.find(x => x.id === b.dataset.id); if (f && confirm(`¿Liberar el perfil de ${f.nombre}?\nLa persona que lo eligió va a tener que elegir de nuevo (o pedir entrar).`)) liberarFicha(f); },
  'nuevo-doc': b => hojas.documento(b.dataset.p),
  'abrir-doc': b => abrirDocumento(b.dataset.id),
  'borrar-doc': b => { const d = a.documentos.find(x => x.id === b.dataset.id); if (d && confirm('¿Borrar el documento?')) borrar('documento', d); },
  nombrar: () => hojas.nombrar(),
  'dejar-organizar': () => { if (confirm('¿Dejar de organizar? Vas a seguir en el viaje.')) hacerOrganizadorPropio(); },
  aviso: () => hojas.aviso(),
  'sacar-aviso': () => { if (confirm('¿Sacar el aviso fijo?')) guardarViaje({ ...a.viaje, aviso: undefined, avisoFecha: undefined, avisoAutor: undefined }); },
  ocultar: b => { if (!b.dataset.confirmar || confirm(b.dataset.confirmar)) ocultar(b.dataset.id, true); },
  mostrar: b => ocultar(b.dataset.id, false),
  reportar: b => {
    const u = b.dataset.u;
    const r = prompt(`¿Qué querés hacer con este mensaje de ${a.nombre(u)}?\n1 = Reportarlo\n2 = Reportarlo y bloquear a ${a.nombre(u)}`, '1');
    if (r === null) return;
    reportar(b.dataset.id, u);
    if (r.trim() === '2') bloquear(u, true);
  },
  desbloquear: b => bloquear(b.dataset.u, false),
  'sacar-reportado': b => { if (confirm(`¿Sacar a ${a.nombre(b.dataset.u)} del viaje?`)) decidir(b.dataset.u, false); },
  compartir: async () => {
    const texto = textoInvitacion();
    if (navigator.share) { try { await navigator.share({ text: texto }); } catch {} }
    else { await navigator.clipboard?.writeText(texto); avisar('Link copiado', true); }
  },
  decidir: b => decidir(b.dataset.u, b.dataset.v === '1'),
  'editar-perfil': () => hojas.perfil(),
  'editar-viaje': () => hojas.viaje(),
  comparto: b => {
    guardarLS('comparto', b.checked);
    const m = a.miembros[a.yo];
    if (m && !a.esDemo) guardar('miembro', { ...m, comparteUbicacion: b.checked });
    if (b.checked) ubicacion.enviar(true);
  },
  notis: async () => { await Notification.requestPermission(); render(); },
  borrar: b => {
    if (b.dataset.confirmar && !confirm(b.dataset.confirmar)) return;
    const coleccion = { puntaje: a.puntajes, juego: a.juegos, tarea: a.tareas, gasto: a.gastos, evento: a.eventos, encuesta: a.encuestas, decomiso: a.decomisos }[b.dataset.tipo];
    const x = coleccion?.find(y => y.id === b.dataset.id);
    if (x) { borrar(b.dataset.tipo, x); if (b.dataset.tipo === 'juego') ui.juego = null; render(); }
  },
};

/** Lleva al detalle de algo avisado en el chat y lo resalta. */
function abrirEnlace(enlace) {
  const [tipo, id] = enlace.split(':');
  const existe = { tarea: a.tareas, encuesta: a.encuestas, evento: a.eventos, juego: a.juegos, equipos: a.sorteos, decomiso: a.decomisos }[tipo];
  if (existe && !existe.some(x => x.id === id)) return avisar('Ya no está (lo borraron o lo ocultaron)');
  ui.cambioDeVista = true; ui.juego = null;
  if (tipo === 'juego') { ui.pestana = RANKING; ui.juego = id; }
  else if (tipo === 'equipos') { ui.pestana = RANKING; ui.verTodosSorteos = a.sorteos[0]?.id !== id; }
  else {
    ui.pestana = MAS;
    ui.seccion = { tarea: 'tareas', encuesta: 'votaciones', evento: 'agenda', fotos: 'fotos', decomiso: 'valija' }[tipo] || null;
    if (tipo === 'tarea') { ui.soloMias = false; ui.ocultarHechas = false; }
    if (tipo === 'evento') { const ev = a.eventos.find(x => x.id === id); if (ev && ev.inicio < ahora() - 3 * 3600000) ui.verPasados = true; }
  }
  history.pushState({ v: 'enlace' }, '');
  render();
  if (id) requestAnimationFrame(() => {
    const el = document.querySelector(`[data-registro="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('resaltado');
    setTimeout(() => el.classList.remove('resaltado'), 2200);
  });
}

async function mensajeConUbicacion(clase, texto) {
  const p = await ubicacion.posicion();
  guardar('mensaje', Nuevo.mensaje(texto, clase, p ? { latitud: p.lat, longitud: p.lon } : {}));
  if (!p) avisar('Mandado sin ubicación: el navegador no tiene permiso');
  ubicacion.enviar(true);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || (b.closest('#hoja') && !['elegir-ficha', 'no-estoy', 'no-estoy-ok'].includes(b.dataset.a))) return;
  if (b.tagName === 'INPUT') return;   // los interruptores van por 'change'
  const f = acciones[b.dataset.a];
  if (f) { e.preventDefault(); f(b, e); }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-a=comparto]')) acciones.comparto(e.target);
  if (e.target.matches('[data-a=entrada]')) guardarViaje({ ...a.viaje, entradaCerrada: e.target.checked ? undefined : true });
  if (e.target.matches('[data-a=auto-aprobar]')) guardarViaje({ ...a.viaje, autoAprobar: e.target.checked || undefined });
  if (e.target.matches('[data-subir-fotos]')) { subirFotos([...e.target.files]); e.target.value = ''; }
  if (e.target.matches('[data-mvp]') && e.target.value) votarMVP(e.target.value);
  if (e.target.matches('[data-cargar-fichas]')) { cargarFichas([...e.target.files]); e.target.value = ''; }
  if (e.target.matches('[data-mi-foto]') && e.target.files[0]) {
    const m = a.miembros[a.yo];
    cuadrada(e.target.files[0]).then(foto => { if (m) guardar('miembro', { ...m, foto }); }).catch(err => avisar(mensajeError(err)));
    e.target.value = '';
  }
  if (e.target.matches('[data-foto-ficha]') && e.target.files[0] && hoja) { cuadrada(e.target.files[0]).then(f => { hoja.estado.foto = f; pintarHoja(); refrescarOk(); }); }
  if (e.target.matches('[data-archivo-doc]') && e.target.files[0] && hoja) {
    hoja.estado.archivo = e.target.files[0];
    if (!hoja.estado.titulo) hoja.estado.titulo = e.target.files[0].name.replace(/\.[^.]+$/, '');
    pintarHoja(); refrescarOk();
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.campoN != null) noEstoy.nombre = t.value;
  if (t.dataset.campoB) { borrador[t.dataset.campoB] = t.value; const b = $('[data-a=empezar]'); if (b) b.disabled = !borrador.nombre.trim(); }
  if (t.dataset.campoI) {
    inicioCampos[t.dataset.campoI] = t.value;
    const listo = a.conectado && !a.cargando;
    const u = $('[data-a=unirse]'), c = $('[data-a=crear]');
    if (u) u.disabled = !(listo && codigoDe(inicioCampos.link));
    if (c) c.disabled = !(listo && inicioCampos.nombre.trim());
  }
});
window.addEventListener('popstate', () => {
  if (hoja) return cerrarHoja();
  if (ui.juego) ui.juego = null; else if (ui.seccion) ui.seccion = null;
  ui.cambioDeVista = true; render();
});
setInterval(() => { if (bucle && !hoja && ui.pestana !== CHAT && document.activeElement?.tagName !== 'INPUT') render(); }, 30000);   // "hace X min"

// ───────────────────────── Arranque

// Inicio de sesión con Apple ID en la misma pestaña: Apple vuelve a sscg.tech/colonia/?ckWebAuthToken=… y la llave
// queda guardada acá. (La ventana emergente de Apple ya no le avisa a la página que la abrió, por eso no se usa.)
const LLAVE_SESION = 'ckWebAuthToken';
const almacenSesion = {
  getToken: () => leerLS(LLAVE_SESION),
  putToken: (_contenedor, t) => guardarLS(LLAVE_SESION, t || null),
};
(function recibirSesion() {
  // Se lee crudo: URLSearchParams cambia los "+" de la llave por espacios y la rompe. Puede venir en la query o en el #.
  const crudo = `${location.search}&${location.hash.replace(/^#/, '')}`;
  const m = crudo.match(/[?&](?:ckWebAuthToken|ckSession)=([^&#]+)/);
  if (!m) return;
  let t = m[1];
  try { t = decodeURIComponent(t); } catch {}
  guardarLS(LLAVE_SESION, t);
  const resto = location.search.replace(/^\?/, '').split('&').filter(x => x && !/^(ckWebAuthToken|ckSession)=/.test(x)).join('&');
  history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : ''));
})();

async function entrarConApple() {
  try {
    if (ui.codigoLink) guardarLS('codigoPendiente', ui.codigoLink);
    const r = await fetch(`https://api.apple-cloudkit.com/database/1/${CONTENEDOR}/production/public/users/caller?ckAPIToken=${TOKEN}`);
    const j = await r.json();
    if (!j.redirectURL) throw new Error(j.reason || 'Apple no respondió');
    location.href = j.redirectURL;
  } catch (e) { avisar(`No se pudo abrir la entrada de Apple: ${mensajeError(e)}`); }
}
function salirDeApple() {
  guardarLS(LLAVE_SESION, null);
  a.conectado = false; detener(); render();
}

async function conectarCloudKit() {
  const t0 = ahora();
  while (!window.CloudKit && ahora() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
  if (!window.CloudKit) { a.cloudkitError = 'No cargó CloudKit. Revisá la conexión y recargá la página.'; a.cloudkitListo = true; return render(); }
  try {
    CloudKit.configure({
      locale: 'es-es',
      services: { authTokenStore: almacenSesion },
      containers: [{ containerIdentifier: CONTENEDOR, environment: 'production', apiTokenAuth: { apiToken: TOKEN, persist: true, ckWebAuthToken: leerLS(LLAVE_SESION) || undefined } }],   // persist: si no, CloudKit no usa authTokenStore
    });
    const c = CloudKit.getDefaultContainer();
    a.nube = new NubeCloudKit(c);
    if (!a.esDemo) a.servidor = a.nube;
    let id = null;
    if (leerLS(LLAVE_SESION)) {
      id = await c.setUpAuth().catch(e => { console.warn('CloudKit setUpAuth', e); a.error = `No se pudo entrar con tu Apple ID: ${mensajeError(e)}`; return null; });
    }
    a.cloudkitListo = true;
    if (id) entrar(id);
    else if (leerLS(LLAVE_SESION)) { console.warn('CloudKit: la llave guardada no sirvió'); guardarLS(LLAVE_SESION, null); }
  } catch (e) {
    a.cloudkitListo = true;
    a.cloudkitError = /origin|domain|token|AUTHENTICATION/i.test(String(e?.reason || e?.message || e))
      ? 'Esta página tiene que abrirse desde sscg.tech/colonia para conectarse con iCloud.' : mensajeError(e);
  }
  render();
}
function entrar(id) {
  a.conectado = true;
  a.nube.yo = id.userRecordName;
  const pendiente = leerLS('codigoPendiente');
  if (pendiente) { guardarLS('codigoPendiente', null); if (!ui.codigoLink) { ui.codigoLink = pendiente; inicioCampos.link = pendiente; } }
  if (!a.esDemo) {
    a.yo = id.userRecordName;
    if (a.viajeID) arrancar();
    else if (ui.codigoLink && a.perfil) unirse(ui.codigoLink);
  }
}

(function iniciar() {
  const c = new URLSearchParams(location.search).get('c');
  if (c && codigoDe(c)) {
    ui.codigoLink = codigoDe(c);
    inicioCampos.link = ui.codigoLink;
    history.replaceState(null, '', location.pathname);
  }
  if (ui.codigoLink && !a.perfil) { a.perfil = { nombre: '', emoji: '🙂', color: Math.random() * COLORES.length | 0 }; guardarLocal(); }
  if (a.esDemo) { activarDemo(); arrancar(); }
  render();
  conectarCloudKit();
  // Si llegó con un link y ya tiene perfil, en cuanto entre con su Apple ID pide unirse (ver entrar()).
  const empezar = acciones.empezar;
  acciones.empezar = () => { empezar(); if (ui.codigoLink && a.conectado && !a.viajeID) unirse(ui.codigoLink); };
  if (!ui.codigoLink && leerLS('codigoPendiente')) { ui.codigoLink = leerLS('codigoPendiente'); inicioCampos.link = ui.codigoLink; }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
