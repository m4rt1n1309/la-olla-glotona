// La Olla Glotona: reglas del juego (sin nada de pantalla, para poder probarlas solas).
(function (raiz) {
  'use strict';

  const INGREDIENTES = {
    tomate: { nombre: 'Tomate' },
    queso: { nombre: 'Queso' },
    brocoli: { nombre: 'Brócoli' },
    berenjena: { nombre: 'Berenjena' },
    pescado: { nombre: 'Pescado' },
  };
  const ING = Object.keys(INGREDIENTES);

  const MONSTRUOS = {
    grunon: { nombre: 'Gruñón', gusta: ['tomate', 'queso'] },
    babita: { nombre: 'Babita', gusta: ['queso', 'brocoli'] },
    mordelon: { nombre: 'Mordelón', gusta: ['brocoli', 'berenjena'] },
    pelusa: { nombre: 'Pelusa', gusta: ['berenjena', 'pescado'] },
    zampon: { nombre: 'Zampón', gusta: ['pescado', 'tomate'] },
    tragon: { nombre: 'Tragón Total', gusta: ING },
  };

  // Cada receta usa 4 de los 5 ingredientes: se define por el que NO lleva.
  const RECETAS = {
    pizza: { nombre: 'Pizza Explosiva', falta: 'pescado' },
    sopa: { nombre: 'Sopa Burbujeante', falta: 'queso' },
    lasana: { nombre: 'Lasaña Lunar', falta: 'tomate' },
    guiso: { nombre: 'Guiso Pirata', falta: 'brocoli' },
    hamburguesa: { nombre: 'Hamburguesa Gigante', falta: 'berenjena' },
  };

  const MANO = 4;
  const CANTIDADES = { tapa: 9, salsa: 8, horno: 4, cucharon: 3, cambio: 2, pimienta: 2, mercado: 3, resbalon: 3 };

  function mezclar(lista, rng) {
    for (let i = lista.length - 1; i > 0; i--) {
      const k = Math.floor(rng() * (i + 1));
      [lista[i], lista[k]] = [lista[k], lista[i]];
    }
    return lista;
  }

  function crearMazo() {
    const mazo = [];
    let id = 1;
    for (const ing of ING) for (let i = 0; i < 5; i++) mazo.push({ id: id++, tipo: 'ingrediente', ing });
    for (const m of Object.keys(MONSTRUOS)) {
      const copias = m === 'tragon' ? 2 : 3;
      for (let i = 0; i < copias; i++) mazo.push({ id: id++, tipo: 'monstruo', monstruo: m });
    }
    for (const tipo of Object.keys(CANTIDADES)) {
      for (let i = 0; i < CANTIDADES[tipo]; i++) mazo.push({ id: id++, tipo });
    }
    return mazo;
  }

  function ingredientesDeReceta(receta) {
    return ING.filter((i) => i !== RECETAS[receta].falta);
  }

  // Cuántos ingredientes de su receta tiene sanos en la mesa (gana con 4).
  function progreso(jugador, receta) {
    return ingredientesDeReceta(receta || jugador.receta).filter((i) => jugador.mesa[i] && !jugador.mesa[i].mordisco).length;
  }

  function robar(e, rng) {
    if (!e.mazo.length) {
      e.mazo = mezclar(e.descarte, rng);
      e.descarte = [];
    }
    return e.mazo.pop();
  }

  function crearPartida(config, rng) {
    rng = rng || Math.random;
    const recetas = mezclar(Object.keys(RECETAS), rng);
    const e = {
      mazo: mezclar(crearMazo(), rng),
      descarte: [],
      turno: 0,
      ganador: null,
      log: [],
      ultimo: null,
      jugadores: config.map((c, i) => ({
        nombre: c.nombre,
        bot: !!c.bot,
        receta: recetas[i],
        mano: [],
        mesa: {},
        salta: false,
      })),
    };
    for (const j of e.jugadores) for (let i = 0; i < MANO; i++) j.mano.push(robar(e, rng));
    e.turno = Math.floor(rng() * e.jugadores.length);
    return e;
  }

  function rivales(e, j) {
    return e.jugadores.map((_, i) => i).filter((i) => i !== j);
  }

  function hayIngredienteDisponible(e, j) {
    const yo = e.jugadores[j];
    const faltan = ingredientesDeReceta(yo.receta).filter((i) => !yo.mesa[i]);
    return e.mazo.concat(e.descarte).some((c) => c.tipo === 'ingrediente' && faltan.includes(c.ing));
  }

  // Pimienta: cura un solo mordisco tuyo (primero los de tu receta).
  function mordidoACurar(e, j) {
    const yo = e.jugadores[j];
    const receta = ingredientesDeReceta(yo.receta);
    const orden = receta.concat(ING.filter((i) => !receta.includes(i)));
    return orden.find((i) => yo.mesa[i] && yo.mesa[i].mordisco) || null;
  }

  // Pimienta: tapas rivales sobre ingredientes que tu receta pide y todavía no tenés.
  function tapasQueMeFrenan(e, j) {
    const yo = e.jugadores[j];
    const faltan = ingredientesDeReceta(yo.receta).filter((i) => !yo.mesa[i]);
    const res = [];
    for (const r of rivales(e, j)) {
      for (const ing of faltan) {
        const p = e.jugadores[r].mesa[ing];
        if (p && p.tapa) res.push({ jugador: r, ing });
      }
    }
    return res;
  }

  // Lista de lugares donde se puede usar una carta. Vacía = ahora no se puede jugar.
  function objetivos(e, carta, j) {
    if (j === undefined) j = e.turno;
    const yo = e.jugadores[j];
    const propios = (filtro) => ING.filter((i) => yo.mesa[i] && filtro(yo.mesa[i])).map((ing) => ({ jugador: j, ing }));
    const res = [];
    switch (carta.tipo) {
      case 'ingrediente':
        if (!yo.mesa[carta.ing]) res.push({ jugador: j, ing: carta.ing });
        break;
      case 'monstruo':
        for (const r of rivales(e, j)) {
          for (const ing of MONSTRUOS[carta.monstruo].gusta) {
            const p = e.jugadores[r].mesa[ing];
            if (p && !p.horno) res.push({ jugador: r, ing });
          }
        }
        break;
      case 'tapa':
        return propios((p) => !p.tapa && !p.horno && !p.mordisco);
      case 'salsa':
        return propios((p) => p.mordisco);
      case 'horno':
        return propios((p) => !p.horno && !p.mordisco);
      case 'cucharon':
        for (const r of rivales(e, j)) {
          for (const ing of ING) {
            const p = e.jugadores[r].mesa[ing];
            if (p && !p.horno && !yo.mesa[ing]) res.push({ jugador: r, ing });
          }
        }
        break;
      case 'cambio':
        for (const r of rivales(e, j)) res.push({ jugador: r });
        break;
      case 'resbalon':
        for (const r of rivales(e, j)) if (!e.jugadores[r].salta) res.push({ jugador: r });
        break;
      case 'pimienta':
        if (mordidoACurar(e, j) || tapasQueMeFrenan(e, j).length) res.push({ jugador: j });
        break;
      case 'mercado':
        if (hayIngredienteDisponible(e, j)) res.push({ jugador: j });
        break;
    }
    return res;
  }

  function anotar(e, texto) {
    e.log.push(texto);
    if (e.log.length > 40) e.log.shift();
  }

  function aplicar(e, carta, o, rng) {
    const j = e.turno;
    const yo = e.jugadores[j];
    const otro = e.jugadores[o.jugador];
    const nomIng = o.ing ? INGREDIENTES[o.ing].nombre : '';
    switch (carta.tipo) {
      case 'ingrediente':
        yo.mesa[carta.ing] = { carta, tapa: null, mordisco: null, horno: null };
        return `${yo.nombre} pone ${nomIng} en su mesa.`;
      case 'monstruo': {
        const p = otro.mesa[o.ing];
        const m = MONSTRUOS[carta.monstruo].nombre;
        e.descarte.push(carta);
        if (p.tapa) {
          e.descarte.push(p.tapa);
          p.tapa = null;
          return `${m} choca con la tapa del ${nomIng} de ${otro.nombre}. ¡La tapa salió volando!`;
        }
        if (p.mordisco) {
          e.descarte.push(p.carta, p.mordisco);
          delete otro.mesa[o.ing];
          return `¡${m} se comió el ${nomIng} de ${otro.nombre}!`;
        }
        e.descarte.pop();
        p.mordisco = carta;
        return `${m} le da un mordisco al ${nomIng} de ${otro.nombre}.`;
      }
      case 'tapa':
        yo.mesa[o.ing].tapa = carta;
        return `${yo.nombre} tapa su ${nomIng}.`;
      case 'salsa': {
        const p = yo.mesa[o.ing];
        e.descarte.push(p.mordisco, carta);
        p.mordisco = null;
        return `${yo.nombre} arregla su ${nomIng} con salsa mágica.`;
      }
      case 'horno': {
        const p = yo.mesa[o.ing];
        if (p.tapa) e.descarte.push(p.tapa);
        p.tapa = null;
        p.horno = carta;
        return `${yo.nombre} cocina su ${nomIng}. ¡Ya ningún monstruo lo puede tocar!`;
      }
      case 'cucharon':
        yo.mesa[o.ing] = otro.mesa[o.ing];
        delete otro.mesa[o.ing];
        e.descarte.push(carta);
        return `${yo.nombre} le roba el ${nomIng} a ${otro.nombre} con el cucharón.`;
      case 'cambio':
        [yo.receta, otro.receta] = [otro.receta, yo.receta];
        e.descarte.push(carta);
        return `${yo.nombre} cambia su receta con ${otro.nombre}.`;
      case 'resbalon':
        otro.salta = true;
        e.descarte.push(carta);
        return `${otro.nombre} pisa una cáscara y perderá su próximo turno.`;
      case 'pimienta': {
        const curado = mordidoACurar(e, j);
        const tapas = tapasQueMeFrenan(e, j);
        if (curado) {
          e.descarte.push(yo.mesa[curado].mordisco);
          yo.mesa[curado].mordisco = null;
        }
        for (const t of tapas) {
          const p = e.jugadores[t.jugador].mesa[t.ing];
          e.descarte.push(p.tapa);
          p.tapa = null;
        }
        e.descarte.push(carta);
        const partes = [];
        if (curado) partes.push(`cura su ${INGREDIENTES[curado].nombre}`);
        if (tapas.length) {
          const nombres = [...new Set(tapas.map((t) => INGREDIENTES[t.ing].nombre))].join(', ');
          partes.push(`vuela ${tapas.length === 1 ? 'la tapa' : 'las tapas'} de ${nombres}`);
        }
        return `¡Achís! ${yo.nombre} ${partes.join(' y ')}.`;
      }
      case 'mercado': {
        const faltan = ingredientesDeReceta(yo.receta).filter((i) => !yo.mesa[i]);
        const sirve = (c) => c.tipo === 'ingrediente' && faltan.includes(c.ing);
        if (!e.mazo.some(sirve)) {
          e.mazo = mezclar(e.mazo.concat(e.descarte), rng);
          e.descarte = [];
        }
        const idx = e.mazo.findIndex(sirve);
        const [encontrada] = e.mazo.splice(idx, 1);
        yo.mesa[encontrada.ing] = { carta: encontrada, tapa: null, mordisco: null, horno: null };
        mezclar(e.mazo, rng);
        e.descarte.push(carta);
        return `${yo.nombre} va al mercado y trae ${INGREDIENTES[encontrada.ing].nombre}.`;
      }
    }
    throw new Error('Carta desconocida: ' + carta.tipo);
  }

  function revisarGanador(e) {
    const n = e.jugadores.length;
    for (let k = 0; k < n; k++) {
      const i = (e.turno + k) % n;
      if (progreso(e.jugadores[i]) === 4) {
        e.ganador = i;
        return true;
      }
    }
    return false;
  }

  function terminarTurno(e, rng) {
    if (revisarGanador(e)) return;
    const yo = e.jugadores[e.turno];
    while (yo.mano.length < MANO) yo.mano.push(robar(e, rng));
    const n = e.jugadores.length;
    let sig = (e.turno + 1) % n;
    while (e.jugadores[sig].salta) {
      e.jugadores[sig].salta = false;
      anotar(e, `${e.jugadores[sig].nombre} se resbala y pierde el turno.`);
      sig = (sig + 1) % n;
    }
    e.turno = sig;
  }

  function jugar(e, cartaId, objetivo, rng) {
    rng = rng || Math.random;
    if (e.ganador !== null) return false;
    const yo = e.jugadores[e.turno];
    const idx = yo.mano.findIndex((c) => c.id === cartaId);
    if (idx < 0) return false;
    const carta = yo.mano[idx];
    const valido = objetivos(e, carta).some((o) => o.jugador === objetivo.jugador && o.ing === objetivo.ing);
    if (!valido) return false;
    yo.mano.splice(idx, 1);
    const texto = aplicar(e, carta, objetivo, rng);
    anotar(e, texto);
    e.ultimo = { carta, texto, jugador: e.turno };
    terminarTurno(e, rng);
    return true;
  }

  function descartar(e, ids, rng) {
    rng = rng || Math.random;
    if (e.ganador !== null || !ids.length) return false;
    const yo = e.jugadores[e.turno];
    if (!ids.every((id) => yo.mano.some((c) => c.id === id))) return false;
    for (const id of ids) {
      const idx = yo.mano.findIndex((c) => c.id === id);
      e.descarte.push(yo.mano.splice(idx, 1)[0]);
    }
    const texto = `${yo.nombre} tira ${ids.length === 1 ? '1 carta' : ids.length + ' cartas'} y roba nuevas.`;
    anotar(e, texto);
    e.ultimo = { carta: null, texto, jugador: e.turno };
    terminarTurno(e, rng);
    return true;
  }

  // ---- Chefs de la computadora ----
  function puntuar(e, carta, o, rng) {
    const j = e.turno;
    const yo = e.jugadores[j];
    const receta = ingredientesDeReceta(yo.receta);
    const copia = JSON.parse(JSON.stringify(e));
    jugar(copia, carta.id, o, rng);
    if (copia.ganador === j) return 1000;
    if (copia.ganador !== null) return -1000;
    const otro = e.jugadores[o.jugador];
    const necesito = o.ing && receta.includes(o.ing);
    switch (carta.tipo) {
      case 'ingrediente':
        return necesito ? 50 : 1;
      case 'salsa':
        return necesito ? 60 : 2;
      case 'mercado':
        return 52;
      case 'tapa':
        return necesito ? 20 : 2;
      case 'horno':
        return necesito ? 26 : 2;
      case 'monstruo': {
        const p = otro.mesa[o.ing];
        const leSirve = ingredientesDeReceta(otro.receta).includes(o.ing);
        return (leSirve ? 25 : 4) + progreso(otro) * 6 + (p.mordisco ? 12 : 0) - (p.tapa ? 10 : 0);
      }
      case 'cucharon':
        return necesito ? (otro.mesa[o.ing].mordisco ? 35 : 56) : 3;
      case 'cambio': {
        const ganancia = progreso(yo, otro.receta) - progreso(yo) + progreso(otro, otro.receta) - progreso(otro, yo.receta);
        return ganancia > 0 ? 25 + ganancia * 12 : 0;
      }
      case 'resbalon':
        return 12 + progreso(otro) * 8;
      case 'pimienta': {
        const curado = mordidoACurar(e, j);
        return (curado && receta.includes(curado) ? 40 : 0) + tapasQueMeFrenan(e, j).length * 10 + 2;
      }
    }
    return 0;
  }

  function decidirBot(e, rng) {
    rng = rng || Math.random;
    const yo = e.jugadores[e.turno];
    let mejor = null;
    const valorCarta = new Map();
    for (const carta of yo.mano) {
      let tope = 0;
      for (const o of objetivos(e, carta)) {
        const p = puntuar(e, carta, o, rng) + rng() * 4;
        tope = Math.max(tope, p);
        if (!mejor || p > mejor.p) mejor = { p, carta, o };
      }
      valorCarta.set(carta.id, tope);
    }
    if (mejor && mejor.p >= 12) return { accion: 'jugar', carta: mejor.carta.id, objetivo: mejor.o };
    const inutiles = yo.mano.filter((c) => valorCarta.get(c.id) < 12).map((c) => c.id);
    return { accion: 'descartar', ids: inutiles.length ? inutiles : [yo.mano[0].id] };
  }

  function turnoBot(e, rng) {
    const d = decidirBot(e, rng);
    return d.accion === 'jugar' ? jugar(e, d.carta, d.objetivo, rng) : descartar(e, d.ids, rng);
  }

  const api = {
    INGREDIENTES, ING, MONSTRUOS, RECETAS, MANO,
    crearMazo, crearPartida, ingredientesDeReceta, progreso, objetivos,
    jugar, descartar, decidirBot, turnoBot,
  };
  raiz.Juego = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
