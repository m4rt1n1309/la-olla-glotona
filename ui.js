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

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const humanos = () => E.jugadores.filter((j) => !j.bot).length;

  const TEXTOS = {
    tapa: ['Tapa', 'Protege un ingrediente tuyo de un monstruo.'],
    salsa: ['Salsa mágica', 'Arregla un ingrediente tuyo mordido.'],
    horno: ['Horno', 'Cocina un ingrediente sano: nadie lo toca más.'],
    cucharon: ['Cucharón', 'Roba un ingrediente que no tengas.'],
    cambio: ['Cambio de receta', 'Cambia tu receta con un rival.'],
    pimienta: ['Pimienta', 'Cura tus mordiscos y vuela las tapas rivales.'],
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
        <button type="button" class="secundario" data-accion="reglas">Cómo se juega</button>
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
        ${elegible ? `<button type="button" class="elegir" data-objetivo="${j}">Elegir</button>` : ''}
      </header>
      <p class="receta-nombre">${J.RECETAS[p.receta].nombre}</p>
      <div class="huecos">${J.ING.map((i) => huecoHTML(j, i, objs)).join('')}</div>
      ${propia ? '' : `<p class="cuenta">${p.mano.length} cartas en la mano</p>`}
    </section>`;
  }

  function ayudaTurno(objs) {
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
    const mostrarMano = !yo.bot && (humanos() === 1 || E.turno === visor);
    const carta = sel !== null && yo.mano.find((c) => c.id === sel);
    const directa = carta && ['ingrediente', 'pimienta', 'mercado'].includes(carta.tipo) && objs.length > 0;
    const u = E.ultimo;

    const mano = mostrarMano
      ? yo.mano.map((c) => {
          const clases = (modoTirar ? (marcadas.has(c.id) ? 'marcada' : '') : sel === c.id ? 'elegida' : '');
          return cartaHTML(c, clases, `data-carta="${c.id}" ${esTurnoVisor() ? '' : 'disabled'}`);
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
      <button type="button" class="principal" data-accion="revancha">Jugar otra vez</button>
      <button type="button" class="secundario" data-accion="salir">Cambiar jugadores</button></main>`;
  }

  function render() {
    const vistas = { inicio: vistaInicio, reglas: vistaReglas };
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

  app.addEventListener('input', (ev) => {
    const i = ev.target.dataset.nombre;
    if (i !== undefined) config.jugadores[i].nombre = ev.target.value;
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
      case 'empezar': case 'revancha': return empezar();
      case 'reglas': pantalla = 'reglas'; return render();
      case 'volver': pantalla = 'inicio'; return render();
      case 'salir': clearTimeout(temporizador); pantalla = 'inicio'; cortina = false; return render();
      case 'ver': cortina = false; return render();
      case 'tirar': modoTirar = true; sel = null; marcadas = new Set(); return render();
      case 'cancelar-tirar': modoTirar = false; marcadas = new Set(); return render();
      case 'confirmar-tirar': if (J.descartar(E, [...marcadas])) seguir(); return;
      case 'jugar-directa': { const o = objetivosSel()[0]; if (o) ejecutar(o); return; }
    }
  });

  render();
})();
