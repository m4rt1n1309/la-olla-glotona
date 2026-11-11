// Todo lo que habla con Firebase. Solo se carga al entrar al modo online.
//
// salas/{código}/
//   host              uid de quien creó la sala (solo él empieza la partida)
//   creada            hora de creación
//   actividad         última vez que alguien hizo algo; a las 24 h sin uso la sala se puede borrar
//   jugadores/{uid}   { nombre, unido, online }
//   partida           { estado, actual, fin, v }: estado es la partida de game.js en JSON (Firebase
//                     borra las listas vacías y los null), actual es el uid de quien tiene el turno

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, initializeAuth, inMemoryPersistence, signInAnonymously, onAuthStateChanged, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, onValue, get, set, update, remove, onDisconnect, serverTimestamp,
  query, orderByChild, endAt, limitToFirst, goOffline, goOnline, connectDatabaseEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = window.FIREBASE_CONFIG;
const parametros = new URLSearchParams(location.search);
const configurado = !firebaseConfig.apiKey.startsWith("PEGAR");
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
const emulador = local && (!configurado || parametros.has("emulador"));

const app = initializeApp(
  emulador
    ? { apiKey: "demo", projectId: "demo-olla", databaseURL: "http://127.0.0.1:9000?ns=demo-olla-default-rtdb" }
    : firebaseConfig
);
// ?otro usa una identidad que no se guarda: sirve para probar con dos pestañas en el mismo navegador.
const auth = parametros.has("otro") ? initializeAuth(app, { persistence: inMemoryPersistence }) : getAuth(app);
const db = getDatabase(app);
if (emulador) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
}

class ErrorSala extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorSala";
  }
}

// En los celulares Firebase a veces queda desconectado después de bloquear la pantalla: lo reconectamos.
let conectado = false;
const avisosConexion = new Set();
let perdidaEn = Date.now();
onValue(ref(db, ".info/connected"), (snap) => {
  conectado = !!snap.val();
  if (!conectado) perdidaEn = Date.now();
  avisosConexion.forEach((cb) => cb(conectado));
});
const reconectar = (forzar) => {
  if (conectado || !navigator.onLine || (!forzar && Date.now() - perdidaEn < 8000)) return;
  perdidaEn = Date.now();
  goOffline(db);
  goOnline(db);
};
setInterval(reconectar, 4000);
addEventListener("online", () => reconectar(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) reconectar(true);
});
export const alCambiarConexion = (cb) => {
  avisosConexion.add(cb);
  return () => avisosConexion.delete(cb);
};

let uidPromesa;
export const entrar = () =>
  (uidPromesa ??= new Promise((resolve, reject) => {
    const parar = onAuthStateChanged(auth, (user) => {
      if (user) {
        parar();
        resolve(user.uid);
      }
    });
    signInAnonymously(auth).catch((err) => {
      parar();
      uidPromesa = null;
      reject(err);
    });
  }));

const salaRef = (codigo, sub = "") => ref(db, `salas/${codigo}${sub ? `/${sub}` : ""}`);

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundirlas con 1 y 0
const codigoNuevo = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => LETRAS[n % LETRAS.length]).join("");

export const normalizarCodigo = (texto) => (texto || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

const esRechazo = (err) => /permission[_ ]denied/i.test(`${err?.code || ""} ${err?.message || ""}`);
const tocar = (codigo) => set(salaRef(codigo, "actividad"), serverTimestamp()).catch(() => {});

export async function crearSala(nombre) {
  const uid = await entrar();
  for (let intento = 0; intento < 5; intento++) {
    const codigo = codigoNuevo();
    try {
      // Si el código ya existe, las reglas rechazan escribir `host` y se prueba con otro.
      await update(salaRef(codigo), {
        host: uid,
        creada: serverTimestamp(),
        actividad: serverTimestamp(),
        [`jugadores/${uid}`]: { nombre, unido: serverTimestamp(), online: true },
      });
      await marcarPresencia(codigo, uid);
      limpiarSalasViejas();
      return codigo;
    } catch (err) {
      if (!esRechazo(err)) throw err;
    }
  }
  throw new ErrorSala("No se pudo crear la sala. Intenta de nuevo.");
}

export async function soyMiembro(codigo) {
  const uid = await entrar();
  return (await get(salaRef(codigo, `jugadores/${uid}`))).exists();
}

export async function unirse(codigo, nombre) {
  const uid = await entrar();
  const snap = await get(salaRef(codigo));
  if (!snap.exists()) throw new ErrorSala(`No existe la sala ${codigo}.`);
  const sala = snap.val();
  const yo = sala.jugadores?.[uid];
  if (sala.partida && !yo) throw new ErrorSala("Esa partida ya empezó.");
  if (!yo && Object.keys(sala.jugadores || {}).length >= 4) throw new ErrorSala("La sala está llena (4 chefs).");
  await set(salaRef(codigo, `jugadores/${uid}`), {
    nombre: yo ? yo.nombre : nombre,
    unido: yo ? yo.unido : serverTimestamp(),
    online: true,
  });
  await marcarPresencia(codigo, uid);
  tocar(codigo);
}

const DIA = 24 * 60 * 60 * 1000;

// No hay servidor que borre las salas abandonadas: al crear una sala se borran hasta 20 viejas.
async function limpiarSalasViejas() {
  try {
    const viejas = query(ref(db, "salas"), orderByChild("actividad"), endAt(Date.now() - DIA - 10 * 60 * 1000), limitToFirst(20));
    const snap = await get(viejas);
    await Promise.all(Object.keys(snap.val() || {}).map((c) => remove(salaRef(c)).catch(() => {})));
  } catch (err) {
    console.warn("No se pudieron revisar las salas viejas:", err);
  }
}

// `online` pasa a false solo cuando se corta la conexión, y vuelve a true al reconectar.
const presencias = new Map();
async function marcarPresencia(codigo, uid) {
  const onlineRef = salaRef(codigo, `jugadores/${uid}/online`);
  await onDisconnect(onlineRef).set(false);
  presencias.get(codigo)?.();
  presencias.set(
    codigo,
    alCambiarConexion(async (ok) => {
      if (!ok) return;
      const snap = await get(salaRef(codigo, `jugadores/${uid}`));
      if (!snap.exists()) return;
      await onDisconnect(onlineRef).set(false);
      await set(onlineRef, true);
    })
  );
}

export async function salir(codigo, borrarme) {
  const uid = await entrar();
  presencias.get(codigo)?.();
  presencias.delete(codigo);
  await onDisconnect(salaRef(codigo, `jugadores/${uid}/online`)).cancel();
  if (borrarme) await remove(salaRef(codigo, `jugadores/${uid}`));
  else await set(salaRef(codigo, `jugadores/${uid}/online`), false);
}

export const escucharSala = (codigo, cb) => onValue(salaRef(codigo), (snap) => cb(snap.val()));

export async function guardarPartida(codigo, partida) {
  await set(salaRef(codigo, "partida"), partida);
  tocar(codigo);
}
