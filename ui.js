// La Olla Glotona: pantallas y controles.
(function () {
  'use strict';
  const J = window.Juego;
  const A = window.Arte;
  const app = document.getElementById('app');
  const PAUSA_BOT = 1500;

  const config = {
    cantidad: 3,
    jugadores: [
      { nombre: 'Chef Peque', bot: false },
      { nombre: 'Chef Burbuja', bot: true },
      { nombre: 'Chef Cuchara', bot: true },
      { nombre: 'Chef Pimentón', bot: true },
    ],
  };

  let E = null; // partida
  let pantalla = 'inicio';
  let sel = null; // carta elegida
  let modoTirar = false;
  let marcadas = new Set();
  let visor = 0; // de quién se ven las cartas
  let cortina = false;
  let temporizador = null;

  // Modo online
  const parametros = new URLSearchParams(location.search);
  const enCompu = ['localhost', '127.0.0.1'].includes(location.hostname);
  const hayOnline = enCompu || !String((window.FIREBASE_CONFIG || {}).apiKey || 'PEGAR').startsWith('PEGAR');
  let Red = null; // módulo red.js, se carga recién al usarlo
  let online = null; // { codigo, uid, sala, v, conectado, dejar, dejarConexion }
  let ocupado = false;
  let errorOnline = '';
  let avisoCompartir = '';
  const datosOnline = { nombre: '', codigo: parametros.get('sala') || '' };

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const humanos = () => E.jugadores.filter((j) => !j.bot).length;

  const TEXTOS = {
    tapa: ['Tapa', 'Protege un ingrediente tuyo de un monstruo.'],
    salsa: ['Salsa mágica', 'Arregla un ingrediente tuyo mordido.'],
    horno: ['Horno', 'Cocina un ingrediente sano: nadie lo toca más.'],
    cucharon: ['Cucharón', 'Roba un ingrediente que no tengas.'],
    cambio: ['Cambio de receta', 'Cambia tu receta con un rival.'],
    pimienta: ['Pimienta', 'Cura 1 mordisco y vuela las tapas de lo que te falta.'],
    mercado: ['Mercado', 'Trae del mazo algo que le falta a tu receta.'],
    resbalon: ['Resbalón', 'Un rival pierde su próximo turno.'],
  };

  const mini = (ing) => `<span class="mini" title="${J.INGREDIENTES[ing].nombre}">${A[ing]}</span>`;

  function cartaHTML(c, clases, atributos) {
    let nombre, texto, arte;
    if (c.tipo === 'ingrediente') {
      nombre = J.INGREDIENTES[c.ing].nombre;
      texto = 'Ponlo en tu mesa.';
      arte = A[c.ing];
    } else if (c.tipo === 'monstruo') {
      const m = J.MONSTRUOS[c.monstruo];
      nombre = m.nombre;
      texto = c.monstruo === 'tragon' ? 'Come de todo.' : `Come ${m.gusta.map(mini).join('')}`;
      arte = A[c.monstruo];
    } else {
      [nombre, texto] = TEXTOS[c.tipo];
      arte = A[c.tipo];
    }
    return `<button type="button" class="carta t-${c.tipo} ${clases || ''}" ${atributos || ''}>
      <span class="c-nombre">${nombre}</span><span class="c-arte">${arte}</span><span class="c-texto">${texto}</span></button>`;
  }

  // ---------- Inicio ----------
  function vistaInicio() {
    const filas = config.jugadores.slice(0, config.cantidad).map((j, i) => `
      <div class="fila">
        <input aria-label="Nombre del jugador ${i + 1}" data-nombre="${i}" maxlength="16" value="${esc(j.nombre)}">
        ${i === 0
          ? '<span class="etiqueta">Persona</span>'
          : `<button type="button" class="alternar" data-tipo="${i}">${j.bot ? 'Computadora' : 'Persona'}</button>`}
      </div>`).join('');
    return `<main class="inicio">
      <div class="logo">${A.olla}</div>
      <h1>La Olla Glotona</h1>
      <p class="lema">Termina tu receta antes de que los monstruos se la coman.</p>
      <section class="caja">
        <h2>¿Cuántos chefs juegan?</h2>
        <div class="numeros">${[2, 3, 4].map((n) => `<button type="button" data-cantidad="${n}" class="${n === config.cantidad ? 'activo' : ''}">${n}</button>`).join('')}</div>
        ${filas}
        <button type="button" class="principal" data-accion="empezar">¡A cocinar!</button>
        ${hayOnline ? '<button type="button" class="secundario" data-accion="online">Jugar online</button>' : ''}
        <button type="button" class="secundario" data-accion="reglas">Cómo se juega</button>
        ${errorOnline ? `<p class="error">${esc(errorOnline)}</p>` : ''}
      </section></main>`;
  }

  function vistaOnline() {
    return `<main class="inicio">
      <div class="logo">${A.olla}</div>
      <h1>Jugar online</h1>
      <p class="lema">Cada chef desde su celular.</p>
      <section class="caja">
        <label class="campo">Nombre del chef
          <input data-campo="nombre" maxlength="16" value="${esc(datosOnline.nombre)}" placeholder="Chef Peque"></label>
        <button type="button" class="principal" data-accion="crear-sala" ${ocupado ? 'disabled' : ''}>Crear sala</button>
        <div class="separador">o con un código</div>
        <div class="fila">
          <input aria-label="Código de sala" class="entrada-codigo" data-campo="codigo" maxlength="4" autocapitalize="characters" autocomplete="off" value="${esc(datosOnline.codigo)}" placeholder="ABCD">
          <button type="button" class="alternar" data-accion="unirse" ${ocupado ? 'disabled' : ''}>Entrar</button>
        </div>
        ${ocupado ? '<p class="ayuda">Conectando...</p>' : ''}
        ${errorOnline ? `<p class="error">${esc(errorOnline)}</p>` : ''}
        <button type="button" class="secundario" data-accion="volver">Volver</button>
      </section></main>`;
  }

  const jugadoresSala = () => Object.entries(online.sala.jugadores || {}).sort((a, b) => a[1].unido - b[1].unido);
  const soyHost = () => online && online.sala && online.sala.host === online.uid;

  function vistaSala() {
    const lista = jugadoresSala();
    const listos = lista.filter(([, j]) => j.online !== false).length;
    return `<main class="inicio">
      <h1>Sala de espera</h1>
      <p class="lema">Código de la sala</p>
      <p class="codigo">${esc(online.codigo)}</p>
      <button type="button" class="secundario" data-accion="compartir">${avisoCompartir || 'Compartir enlace'}</button>
      <section class="caja">
        <h2>Chefs (${lista.length}/4)</h2>
        <ul class="chefs">${lista.map(([uid, j]) => `<li><span class="punto ${j.online === false ? 'apagado' : ''}"></span>${esc(j.nombre)}${uid === online.sala.host ? ' <small>anfitrión</small>' : ''}</li>`).join('')}</ul>
        ${soyHost()
          ? `<button type="button" class="principal" data-accion="empezar-online" ${listos >= 2 ? '' : 'disabled'}>¡A cocinar!</button>
             ${listos < 2 ? '<p class="ayuda">Falta que entre al menos un chef más.</p>' : ''}`
          : '<p class="ayuda">Esperando que el anfitrión empiece...</p>'}
        ${errorOnline ? `<p class="error">${esc(errorOnline)}</p>` : ''}
        <button type="button" class="secundario" data-accion="salir">Salir de la sala</button>
      </section></main>`;
  }

  function vistaReglas() {
    const ejemplos = [
      { tipo: 'ingrediente', ing: 'tomate' }, { tipo: 'monstruo', monstruo: 'grunon' }, { tipo: 'tapa' }, { tipo: 'salsa' }, { tipo: 'horno' },
      { tipo: 'cucharon' }, { tipo: 'cambio' }, { tipo: 'pimienta' }, { tipo: 'mercado' }, { tipo: 'resbalon' },
    ];
    return `<main class="reglas"><h1>Cómo se juega</h1>
      <section class="caja texto">
        <p><b>Objetivo:</b> tener en tu mesa los 4 ingredientes de tu receta, sin mordiscos.</p>
        <p><b>En tu turno</b> juegas una carta o tiras las que quieras. Después robas hasta tener 4.</p>
        <p><b>Monstruos:</b> cada uno come solo dos ingredientes. El primer mordisco deja el ingrediente mordido, y el segundo se lo come del todo. Si tiene tapa, el monstruo solo rompe la tapa.</p>
        <p><b>Ingrediente cocinado:</b> con el horno queda a salvo para siempre, ni los monstruos ni el cucharón lo pueden tocar.</p>
      </section>
      <div class="muestrario">${ejemplos.map((c) => cartaHTML(c, 'fija', 'tabindex="-1"')).join('')}</div>
      <button type="button" class="principal" data-accion="volver">Volver</button></main>`;
  }

  // ---------- Partida ----------
  function objetivosSel() {
    if (sel === null || !esTurnoVisor()) return [];
    const c = E.jugadores[E.turno].mano.find((x) => x.id === sel);
    return c ? J.objetivos(E, c) : [];
  }
  const esTurnoVisor = () => E.turno === visor && !E.jugadores[E.turno].bot && E.ganador === null;

  function huecoHTML(j, ing, objs) {
    const p = E.jugadores[j];
    const pieza = p.mesa[ing];
    const enReceta = J.ingredientesDeReceta(p.receta).includes(ing);
    const objetivo = objs.some((o) => o.jugador === j && o.ing === ing);
    const estado = !pieza ? 'vacío' : pieza.horno ? 'cocinado' : pieza.mordisco ? 'mordido' : pieza.tapa ? 'con tapa' : 'sano';
    const nombre = `${J.INGREDIENTES[ing].nombre}: ${estado}`;
    return `<button type="button" class="hueco ${pieza ? 'lleno' : 'vacio'} ${enReceta ? 'receta' : 'extra'} ${objetivo ? 'objetivo' : ''}"
        ${objetivo ? `data-objetivo="${j}" data-ing="${ing}"` : 'disabled'} aria-label="${nombre}" title="${nombre}">
      ${A[ing]}
      ${pieza && pieza.mordisco ? '<span class="marca mordisco"></span>' : ''}
      ${pieza && pieza.tapa ? `<span class="marca tapa">${A.tapa}</span>` : ''}
      ${pieza && pieza.horno ? `<span class="marca horno">${A.horno}</span>` : ''}
    </button>`;
  }

  function mesaHTML(j, objs, propia) {
    const p = E.jugadores[j];
    const elegible = objs.some((o) => o.jugador === j && !o.ing && j !== E.turno);
    return `<section class="mesa ${E.turno === j ? 'turno' : ''} ${propia ? 'propia' : ''} ${elegible ? 'elegible' : ''}">
      <header>
        <strong>${esc(p.nombre)}</strong>
        <span class="progreso">${J.progreso(p)}/4</span>
        ${p.salta ? '<span class="aviso">Resbalado</span>' : ''}
        ${desconectado(p) ? '<span class="aviso">Sin conexión</span>' : ''}
        ${elegible ? `<button type="button" class="elegir" data-objetivo="${j}">Elegir</button>` : ''}
      </header>
      <p class="receta-nombre">${J.RECETAS[p.receta].nombre}</p>
      ${propia ? pideHTML(p) : ''}
      <div class="huecos">${J.ING.map((i) => huecoHTML(j, i, objs)).join('')}</div>
      ${propia ? '' : `<p class="cuenta">${p.mano.length} cartas en la mano</p>`}
    </section>`;
  }

  // Lista de lo que pide tu receta, marcando lo que ya tenés.
  function pideHTML(p) {
    const items = J.ingredientesDeReceta(p.receta).map((i) => {
      const pieza = p.mesa[i];
      const estado = !pieza ? 'falta' : pieza.mordisco ? 'mordido' : 'listo';
      const texto = { falta: 'te falta', mordido: 'mordido', listo: 'listo' }[estado];
      return `<li class="${estado}" title="${J.INGREDIENTES[i].nombre}: ${texto}">${mini(i)}<span>${J.INGREDIENTES[i].nombre}</span></li>`;
    }).join('');
    return `<ul class="pide" aria-label="Tu receta pide">${items}</ul>`;
  }

  function desconectado(p) {
    const m = online && online.sala && online.sala.jugadores && online.sala.jugadores[p.uid];
    return !!m && m.online === false;
  }

  function ayudaTurno(objs) {
    const actual = E.jugadores[E.turno];
    if (online && E.turno !== visor) {
      return desconectado(actual)
        ? `${esc(actual.nombre)} se desconectó. Esperando que vuelva con el enlace de la sala...`
        : `Esperando a ${esc(actual.nombre)}...`;
    }
    if (E.jugadores[E.turno].bot) return `Está jugando ${esc(E.jugadores[E.turno].nombre)}...`;
    if (!esTurnoVisor()) return '';
    if (modoTirar) return 'Toca las cartas que quieras tirar.';
    if (sel === null) return 'Tu turno: elige una carta.';
    if (!objs.length) return 'Esta carta ahora no se puede usar. Elige otra o tírala.';
    const c = E.jugadores[E.turno].mano.find((x) => x.id === sel);
    if (['ingrediente', 'pimienta', 'mercado'].includes(c.tipo)) return 'Toca ¡Jugar! para usarla.';
    return 'Toca un lugar marcado en amarillo.';
  }

  function vistaPartida() {
    const objs = objetivosSel();
    const yo = E.jugadores[visor];
    const orden = E.jugadores.map((_, i) => i).filter((i) => i !== visor);
    const mostrarMano = !!online || (!yo.bot && (humanos() === 1 || E.turno === visor));
    const carta = sel !== null && yo.mano.find((c) => c.id === sel);
    const directa = carta && ['ingrediente', 'pimienta', 'mercado'].includes(carta.tipo) && objs.length > 0;
    const u = E.ultimo;

    const mano = mostrarMano
      ? yo.mano.map((c) => {
          const clases = (modoTirar ? (marcadas.has(c.id) ? 'marcada' : '') : sel === c.id ? 'elegida' : '');
          return cartaHTML(c, clases, `data-carta="${+c.id}" ${esTurnoVisor() ? '' : 'disabled'}`);
        }).join('')
      : '<p class="oculta">Cartas ocultas</p>';

    let botones = '';
    if (esTurnoVisor()) {
      botones = modoTirar
        ? `<button type="button" class="principal" data-accion="confirmar-tirar" ${marcadas.size ? '' : 'disabled'}>Tirar ${marcadas.size}</button>
           <button type="button" class="secundario" data-accion="cancelar-tirar">Cancelar</button>`
        : `${directa ? '<button type="button" class="principal" data-accion="jugar-directa">¡Jugar!</button>' : ''}
           <button type="button" class="secundario" data-accion="tirar">Tirar cartas</button>`;
    }

    return `<main class="partida">
      ${online && !online.conectado ? '<p class="sin-red">Sin conexión, reconectando...</p>' : ''}
      ${errorOnline ? `<p class="error">${esc(errorOnline)}</p>` : ''}
      <div class="rivales n${orden.length}">${orden.map((i) => mesaHTML(i, objs, false)).join('')}</div>
      <section class="centro">
        <div class="ultima">${u && u.carta ? cartaHTML(u.carta, 'fija pequena', `tabindex="-1" data-k="${E.log.length}"`) : `<span class="olla-mini">${A.olla}</span>`}</div>
        <div class="noticias" aria-live="polite">
          <p class="titular">${esc(E.log[E.log.length - 1] || '¡Empieza la partida!')}</p>
          <p class="ayuda">${ayudaTurno(objs)}</p>
        </div>
        <button type="button" class="salir" data-accion="salir">Salir</button>
      </section>
      ${mesaHTML(visor, objs, true)}
      <section class="mano">${mano}</section>
      <div class="botones">${botones}</div>
    </main>`;
  }

  function vistaCortina() {
    return `<main class="cortina"><div class="logo">${A.olla}</div>
      <h1>Le toca a ${esc(E.jugadores[E.turno].nombre)}</h1>
      <p>${esc(E.log[E.log.length - 1] || '')}</p>
      <p>Que los demás no miren las cartas.</p>
      <button type="button" class="principal" data-accion="ver">¡Ver mis cartas!</button></main>`;
  }

  function vistaFin() {
    const g = E.jugadores[E.ganador];
    return `<main class="fin"><div class="logo salta">${A.olla}</div>
      <h1>¡Ganó ${esc(g.nombre)}!</h1>
      <p class="lema">Terminó su ${J.RECETAS[g.receta].nombre}.</p>
      <div class="plato">${J.ingredientesDeReceta(g.receta).map((i) => `<span>${A[i]}</span>`).join('')}</div>
      ${!online || soyHost()
        ? '<button type="button" class="principal" data-accion="revancha">Jugar otra vez</button>'
        : '<p class="ayuda">Esperando que el anfitrión empiece otra partida...</p>'}
      <button type="button" class="secundario" data-accion="salir">${online ? 'Salir de la sala' : 'Cambiar jugadores'}</button></main>`;
  }

  function render() {
    const vistas = { inicio: vistaInicio, reglas: vistaReglas, online: vistaOnline, sala: vistaSala };
    if (vistas[pantalla]) app.innerHTML = vistas[pantalla]();
    else if (E.ganador !== null) app.innerHTML = vistaFin();
    else app.innerHTML = cortina ? vistaCortina() : vistaPartida();
  }

  function empezar() {
    clearTimeout(temporizador);
    E = J.crearPartida(config.jugadores.slice(0, config.cantidad).map((j, i) => ({
      nombre: j.nombre.trim() || `Chef ${i + 1}`, bot: j.bot,
    })));
    window.__partida = E;
    visor = E.jugadores[E.turno].bot ? E.jugadores.findIndex((j) => !j.bot) : E.turno;
    cortina = humanos() > 1 && !E.jugadores[E.turno].bot;
    pantalla = 'partida';
    seguir();
  }

  // Prepara la pantalla para quien tenga el turno.
  function seguir() {
    sel = null;
    modoTirar = false;
    marcadas = new Set();
    clearTimeout(temporizador);
    if (online) {
      enviarPartida(online.v + 1);
      return render();
    }
    if (E.ganador === null) {
      const actual = E.jugadores[E.turno];
      if (actual.bot) {
        temporizador = setTimeout(() => { J.turnoBot(E); seguir(); }, PAUSA_BOT);
      } else if (E.turno !== visor) {
        visor = E.turno;
        cortina = humanos() > 1;
      }
    }
    render();
  }

  function ejecutar(objetivo) {
    if (J.jugar(E, sel, objetivo)) seguir();
  }

  // ---------- Online ----------
  function direccionSala(codigo) {
    const p = new URLSearchParams(location.search);
    if (codigo) p.set('sala', codigo); else p.delete('sala');
    const q = p.toString();
    return location.pathname + (q ? '?' + q : '');
  }

  async function conEspera(tarea) {
    if (ocupado) return;
    ocupado = true;
    errorOnline = '';
    render();
    try {
      if (!Red) Red = await import('./red.js');
      await tarea();
    } catch (err) {
      console.warn(err);
      const codigoErr = `${err?.code || ''} ${err?.message || ''}`;
      if (err.name === 'ErrorSala') errorOnline = err.message;
      else if (/configuration-not-found|CONFIGURATION_NOT_FOUND|operation-not-allowed|admin-restricted/i.test(codigoErr))
        errorOnline = 'El modo online no está habilitado (falta activar el acceso anónimo en Firebase).';
      else if (/permission[_ ]denied/i.test(codigoErr)) errorOnline = 'Firebase rechazó la operación (revisa las reglas de la base de datos).';
      else if (!navigator.onLine || /network/i.test(codigoErr)) errorOnline = 'No se pudo conectar. Revisa el internet e intenta de nuevo.';
      else errorOnline = 'Error al conectar: ' + (err?.code || err?.message || 'desconocido');
    }
    ocupado = false;
    render();
  }

  async function conectar(codigo) {
    const uid = await Red.entrar();
    online = { codigo, uid, sala: null, v: null, conectado: true };
    online.dejarConexion = Red.alCambiarConexion((ok) => {
      if (!online) return;
      online.conectado = ok;
      render();
    });
    online.dejar = Red.escucharSala(codigo, alCambiarSala);
    history.replaceState(null, '', direccionSala(codigo));
  }

  function alCambiarSala(sala) {
    if (!online) return;
    if (!sala) return dejarSala('La sala ya no existe.');
    online.sala = sala;
    if (sala.partida) {
      if (sala.partida.v !== online.v) {
        online.v = sala.partida.v;
        E = JSON.parse(sala.partida.estado);
        window.__partida = E;
        sel = null;
        modoTirar = false;
        marcadas = new Set();
      }
      visor = E.jugadores.findIndex((j) => j.uid === online.uid);
      if (visor < 0) return dejarSala('Esa partida ya empezó.');
      cortina = false;
      pantalla = 'partida';
    } else {
      E = null;
      pantalla = 'sala';
    }
    render();
  }

  function enviarPartida(v) {
    online.v = v;
    Red.guardarPartida(online.codigo, {
      estado: JSON.stringify(E),
      actual: E.jugadores[E.turno].uid,
      fin: E.ganador !== null,
      v,
    }).catch((err) => {
      console.warn(err);
      errorOnline = 'No se pudo guardar la jugada.';
      render();
    });
  }

  function empezarOnline() {
    const lista = jugadoresSala().filter(([, j]) => j.online !== false).slice(0, 4);
    if (lista.length < 2) {
      errorOnline = 'Hacen falta al menos 2 chefs conectados.';
      return render();
    }
    E = J.crearPartida(lista.map(([, j]) => ({ nombre: j.nombre, bot: false })));
    E.jugadores.forEach((j, i) => { j.uid = lista[i][0]; });
    window.__partida = E;
    errorOnline = '';
    enviarPartida(Date.now());
  }

  function dejarSala(mensaje) {
    const o = online;
    online = null;
    E = null;
    pantalla = 'inicio';
    errorOnline = mensaje || '';
    history.replaceState(null, '', direccionSala(null));
    if (o) {
      if (o.dejar) o.dejar();
      if (o.dejarConexion) o.dejarConexion();
      Red.salir(o.codigo, !o.sala || !o.sala.partida).catch((err) => console.warn(err));
    }
    render();
  }

  async function compartir() {
    const url = location.origin + direccionSala(online.codigo);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'La Olla Glotona', text: `Sala ${online.codigo} de La Olla Glotona`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      avisoCompartir = '¡Enlace copiado!';
    } catch (err) {
      if (err.name === 'AbortError') return;
      avisoCompartir = url;
    }
    render();
  }

  const nombreOnline = () => datosOnline.nombre.trim() || 'Chef';

  app.addEventListener('input', (ev) => {
    const i = ev.target.dataset.nombre;
    if (i !== undefined) config.jugadores[i].nombre = ev.target.value;
    const campo = ev.target.dataset.campo;
    if (campo) datosOnline[campo] = ev.target.value;
  });

  app.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.cantidad) { config.cantidad = +d.cantidad; return render(); }
    if (d.tipo) { config.jugadores[d.tipo].bot = !config.jugadores[d.tipo].bot; return render(); }
    if (d.carta) {
      const id = +d.carta;
      if (modoTirar) { marcadas.has(id) ? marcadas.delete(id) : marcadas.add(id); }
      else sel = sel === id ? null : id;
      return render();
    }
    if (d.objetivo !== undefined) {
      const o = { jugador: +d.objetivo };
      if (d.ing) o.ing = d.ing;
      return ejecutar(o);
    }
    switch (d.accion) {
      case 'empezar': return empezar();
      case 'revancha': return online ? empezarOnline() : empezar();
      case 'reglas': pantalla = 'reglas'; return render();
      case 'volver': pantalla = 'inicio'; errorOnline = ''; return render();
      case 'salir':
        if (online) return dejarSala();
        clearTimeout(temporizador); pantalla = 'inicio'; cortina = false; return render();
      case 'online': pantalla = 'online'; errorOnline = ''; return render();
      case 'crear-sala':
        return conEspera(async () => { await conectar(await Red.crearSala(nombreOnline())); });
      case 'unirse':
        return conEspera(async () => {
          const codigo = Red.normalizarCodigo(datosOnline.codigo);
          if (codigo.length !== 4) { errorOnline = 'El código tiene 4 letras.'; return; }
          await Red.unirse(codigo, nombreOnline());
          await conectar(codigo);
        });
      case 'compartir': return compartir();
      case 'empezar-online': return empezarOnline();
      case 'ver': cortina = false; return render();
      case 'tirar': modoTirar = true; sel = null; marcadas = new Set(); return render();
      case 'cancelar-tirar': modoTirar = false; marcadas = new Set(); return render();
      case 'confirmar-tirar': if (J.descartar(E, [...marcadas])) seguir(); return;
      case 'jugar-directa': { const o = objetivosSel()[0]; if (o) ejecutar(o); return; }
    }
  });

  // Al abrir un enlace de sala: quien ya estaba vuelve a su lugar, y quien no escribe su nombre.
  if (hayOnline && datosOnline.codigo) {
    pantalla = 'online';
    conEspera(async () => {
      const codigo = Red.normalizarCodigo(datosOnline.codigo);
      if (codigo.length === 4 && await Red.soyMiembro(codigo)) {
        await Red.unirse(codigo, '');
        await conectar(codigo);
      }
    });
  }

  render();
})();
