// Dibujos originales de La Olla Glotona, hechos con SVG.
(function (raiz) {
  'use strict';

  const svg = (cuerpo) => `<svg viewBox="0 0 100 100" aria-hidden="true">${cuerpo}</svg>`;
  const ojo = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.2}" cy="${y + r * 0.15}" r="${r * 0.55}" fill="#26190f"/><circle cx="${x + r * 0.4}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#fff"/>`;
  const sonrisa = (x, y, w) => `<path d="M${x - w} ${y}q${w} ${w} ${w * 2} 0" fill="none" stroke="#26190f" stroke-width="3" stroke-linecap="round"/>`;

  const ARTE = {
    tomate: svg(`<circle cx="50" cy="56" r="35" fill="#e0402f"/><ellipse cx="37" cy="42" rx="9" ry="6" fill="#f58a78" transform="rotate(-30 37 42)"/>
      <path d="M50 28l-16-8 9 12-14 4 16 3 5 11 5-11 16-3-14-4 9-12z" fill="#3c9a3f"/>${ojo(40, 60, 6)}${ojo(60, 60, 6)}${sonrisa(50, 72, 7)}`),
    queso: svg(`<path d="M10 58L72 20q18 12 20 38z" fill="#ffd451"/><path d="M10 58h82v26H10z" fill="#f6b92c"/>
      <circle cx="74" cy="42" r="6" fill="#e39e16"/><circle cx="52" cy="44" r="4" fill="#e39e16"/><circle cx="82" cy="74" r="5" fill="#d68f0f"/><circle cx="20" cy="76" r="4" fill="#d68f0f"/>${ojo(40, 69, 6)}${ojo(60, 69, 6)}${sonrisa(50, 77, 5)}`),
    brocoli: svg(`<path d="M38 56h24l6 34H32z" fill="#a6d36b"/><circle cx="28" cy="44" r="17" fill="#3f9b44"/><circle cx="72" cy="44" r="17" fill="#3f9b44"/><circle cx="50" cy="30" r="21" fill="#4eae50"/><circle cx="50" cy="52" r="17" fill="#3f9b44"/>
      <circle cx="42" cy="22" r="4" fill="#79cc6d"/><circle cx="24" cy="38" r="3" fill="#79cc6d"/><circle cx="74" cy="36" r="3" fill="#79cc6d"/>${ojo(42, 68, 5)}${ojo(58, 68, 5)}${sonrisa(50, 78, 5)}`),
    berenjena: svg(`<ellipse cx="52" cy="60" rx="27" ry="33" fill="#6a3a9c" transform="rotate(14 52 60)"/><ellipse cx="42" cy="48" rx="6" ry="11" fill="#9a6ccc" transform="rotate(20 42 48)"/>
      <path d="M60 28q-16-4-24 6 10-2 13 4 3-6 11-2 8 2 12 8 1-12-12-16z" fill="#3c9a3f"/><path d="M60 28q2-12 12-16" stroke="#3c9a3f" stroke-width="6" fill="none" stroke-linecap="round"/>${ojo(42, 64, 6)}${ojo(60, 66, 6)}${sonrisa(49, 77, 6)}`),
    pescado: svg(`<path d="M72 50l22-20v40z" fill="#2f7fc4"/><ellipse cx="44" cy="50" rx="36" ry="24" fill="#4aa3df"/><path d="M38 28q10-14 22-8l-4 12z" fill="#2f7fc4"/><path d="M50 52q10 4 12 14-12 0-16-8z" fill="#2f7fc4"/>
      <path d="M56 36q6 14 0 28M66 40q4 10 0 20" stroke="#2f7fc4" stroke-width="3" fill="none"/>${ojo(26, 44, 8)}${sonrisa(20, 60, 5)}`),

    grunon: svg(`<path d="M26 34L16 8l24 16zM74 34l10-26-24 16z" fill="#f2d9a4"/><rect x="16" y="22" width="68" height="68" rx="26" fill="#d9472e"/>${ojo(38, 50, 9)}${ojo(62, 50, 9)}
      <path d="M26 38l20 8M74 38l-20 8" stroke="#26190f" stroke-width="6" stroke-linecap="round"/><path d="M32 74q18-14 36 0" fill="none" stroke="#26190f" stroke-width="5" stroke-linecap="round"/><path d="M38 69l3 8 4-10zM60 69l-3 8-4-10z" fill="#fff"/>`),
    babita: svg(`<path d="M14 88q-6-48 36-68 42 20 36 68-8 6-14-2-6 8-14 0-8 10-16 0-8 8-14 0-8 8-14 2z" fill="#7cc04a"/>${ojo(38, 48, 10)}${ojo(62, 48, 10)}
      <path d="M36 64q14 12 28 0z" fill="#26190f"/><path d="M58 68q6 8 3 18-3 6-6 0-2-10 3-18z" fill="#bfeeff"/>`),
    mordelon: svg(`<ellipse cx="50" cy="54" rx="40" ry="36" fill="#7a4fc0"/>${ojo(34, 34, 8)}${ojo(66, 34, 8)}
      <rect x="20" y="50" width="60" height="30" rx="12" fill="#26190f"/><path d="M22 50h56l-7 12-7-12-7 12-7-12-7 12-7-12-7 12zM26 80h48l-6-11-6 11-6-11-6 11-6-11-6 11z" fill="#fff"/>`),
    pelusa: svg(`<path d="M50 6l8 12 12-8 3 14 14-3-3 14 13 5-9 11 9 11-13 5 3 14-14-3-3 14-12-8-8 12-8-12-12 8-3-14-14 3 3-14-13-5 9-11-9-11 13-5-3-14 14 3 3-14 12 8z" fill="#2a9d9b"/>${ojo(38, 46, 11)}${ojo(62, 46, 11)}<ellipse cx="50" cy="68" rx="9" ry="7" fill="#26190f"/><path d="M45 63h10v5h-10z" fill="#fff"/>`),
    zampon: svg(`<circle cx="50" cy="54" r="40" fill="#ef8a22"/><ellipse cx="50" cy="66" rx="30" ry="22" fill="#26190f"/><ellipse cx="50" cy="78" rx="17" ry="9" fill="#e0524c"/><path d="M26 54h48l-6 8-6-6-6 6-6-6-6 6-6-6-6 6z" fill="#fff"/>${ojo(50, 28, 14)}<path d="M46 14q4-14 12-10" fill="none" stroke="#ef8a22" stroke-width="6" stroke-linecap="round"/>`),
    tragon: svg(`<path d="M50 8q44 2 42 50-2 36-42 36T8 58Q6 10 50 8z" fill="#3b3550"/>${ojo(30, 36, 8)}${ojo(50, 26, 9)}${ojo(70, 36, 8)}${ojo(40, 50, 5)}${ojo(61, 50, 5)}
      <path d="M22 62q28 34 56 0z" fill="#e0524c"/><path d="M22 62h56l-8 10-6-8-7 9-7-9-7 9-6-9-6 8z" fill="#fff"/>`),

    tapa: svg(`<path d="M12 70a38 38 0 0 1 76 0z" fill="#c6d0d8"/><path d="M24 62a28 28 0 0 1 22-24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="26" r="8" fill="#8896a3"/><rect x="6" y="70" width="88" height="10" rx="5" fill="#8896a3"/>`),
    salsa: svg(`<rect x="42" y="6" width="16" height="22" rx="4" fill="#3c9a3f"/><path d="M40 28h20l10 18v38q0 10-10 10H40q-10 0-10-10V46z" fill="#d9472e"/><rect x="30" y="52" width="40" height="24" fill="#fff4dc"/><path d="M50 58l2.6 5.2 5.4.8-4 4 1 5.6-5-2.6-5 2.6 1-5.6-4-4 5.4-.8z" fill="#f6b92c"/>`),
    horno: svg(`<rect x="10" y="14" width="80" height="76" rx="9" fill="#55606b"/><circle cx="26" cy="25" r="5" fill="#f6b92c"/><circle cx="44" cy="25" r="5" fill="#f6b92c"/><rect x="20" y="38" width="60" height="42" rx="6" fill="#26190f"/><path d="M50 42q16 16 12 28-3 8-12 8t-12-8q-2-8 5-14 1 6 5 6 4-8 2-20z" fill="#ef8a22"/><path d="M50 60q7 8 5 13-2 4-5 4t-5-4q-1-5 5-13z" fill="#ffd451"/>`),
    cucharon: svg(`<path d="M80 10L46 56" stroke="#8896a3" stroke-width="9" stroke-linecap="round"/><path d="M12 54a26 26 0 0 0 52 0z" fill="#c6d0d8" transform="rotate(-14 38 54)"/><circle cx="82" cy="10" r="7" fill="#d9472e"/><ellipse cx="37" cy="53" rx="20" ry="5" fill="#ef8a22" transform="rotate(-14 37 53)"/>`),
    cambio: svg(`<rect x="8" y="16" width="38" height="50" rx="4" fill="#fff4dc" stroke="#b58a4c" stroke-width="3"/><rect x="54" y="34" width="38" height="50" rx="4" fill="#fff4dc" stroke="#b58a4c" stroke-width="3"/><path d="M15 30h24M15 40h24M15 50h16M61 48h24M61 58h24M61 68h16" stroke="#b58a4c" stroke-width="3"/><path d="M50 12q22 0 24 16l6-4-8 12-10-10 7 1q-3-9-19-9z" fill="#d9472e"/><path d="M50 88q-22 0-24-16l-6 4 8-12 10 10-7-1q3 9 19 9z" fill="#2f7fc4"/>`),
    pimienta: svg(`<path d="M32 40h36l6 48q0 6-6 6H32q-6 0-6-6z" fill="#fff4dc" stroke="#b58a4c" stroke-width="3"/><path d="M34 40q0-26 16-26t16 26z" fill="#8896a3"/><circle cx="44" cy="28" r="2.4" fill="#26190f"/><circle cx="56" cy="28" r="2.4" fill="#26190f"/><circle cx="50" cy="21" r="2.4" fill="#26190f"/><path d="M29 60h42v20H29z" fill="#26190f"/><circle cx="16" cy="16" r="3" fill="#26190f"/><circle cx="26" cy="8" r="2.4" fill="#26190f"/><circle cx="82" cy="12" r="3" fill="#26190f"/><circle cx="74" cy="6" r="2" fill="#26190f"/>`),
    mercado: svg(`<path d="M28 44q0-30 22-30t22 30" fill="none" stroke="#a36a2f" stroke-width="6"/><circle cx="36" cy="42" r="11" fill="#e0402f"/><circle cx="60" cy="38" r="12" fill="#4eae50"/><path d="M10 46h80l-9 42q-1 4-5 4H24q-4 0-5-4z" fill="#c98b45"/><path d="M26 54l4 32M42 54l1 32M58 54l-1 32M74 54l-4 32M15 68h70" stroke="#a36a2f" stroke-width="3"/>`),
    resbalon: svg(`<ellipse cx="50" cy="84" rx="38" ry="8" fill="#b9a98b"/><path d="M50 40Q28 52 14 80q18-8 30-22-2 12-4 26 12-12 14-26 10 16 28 22Q72 52 50 40z" fill="#ffd451"/><path d="M42 42q2-20 6-28h10q2 14 0 28z" fill="#f6c02f"/><rect x="46" y="8" width="12" height="9" rx="2" fill="#7c5a23"/>`),
    olla: svg(`<path d="M36 14q-6 6 0 12t0 12M52 10q-6 6 0 12t0 12M68 14q-6 6 0 12t0 12" fill="none" stroke="#c6d0d8" stroke-width="4" stroke-linecap="round"/><rect x="6" y="52" width="14" height="10" rx="4" fill="#26190f"/><rect x="80" y="52" width="14" height="10" rx="4" fill="#26190f"/><path d="M16 44h68v34q0 14-14 14H30q-14 0-14-14z" fill="#3b3550"/><rect x="11" y="40" width="78" height="10" rx="5" fill="#55606b"/>${ojo(38, 64, 8)}${ojo(62, 64, 8)}<path d="M38 80q12 8 24 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  };

  raiz.Arte = ARTE;
})(typeof window !== 'undefined' ? window : globalThis);
