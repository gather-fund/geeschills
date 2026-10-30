// Shared brand pieces for the print files: a vector redraw of the logo and QR codes.
// The logo is redrawn from public/assets/logo-white-background.jpeg so it prints sharp.
(function () {
  const flake = (x, y, r) => {
    let arms = '';
    for (let a = 0; a < 360; a += 60) {
      arms += `<g transform="rotate(${a})"><path d="M0 0V${-r}M0 ${-r * 0.5}L${r * 0.34} ${-r * 0.84}M0 ${-r * 0.5}L${-r * 0.34} ${-r * 0.84}"/></g>`;
    }
    return `<g transform="translate(${x} ${y})">${arms}</g>`;
  };
  const word = (text, y) =>
    `<text x="25" y="${y}" textLength="175" lengthAdjust="spacingAndGlyphs" font-family="'Archivo Black',sans-serif" font-size="43.5" fill="#fff">${text}</text>`;
  const logo = `<svg viewBox="0 0 226 357" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GEES CHILLS">
    <rect width="226" height="357" rx="7" fill="#000"/>
    <rect x="25" y="38" width="175" height="174" fill="#00aeef"/>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none">${flake(172, 62, 12)}${flake(145, 84, 12)}${flake(174, 102, 12)}</g>
    ${word('GEES', 262)}${word('CHILLS', 297)}
    <rect x="25" y="314" width="175" height="9" fill="#00aeef"/>
  </svg>`;
  document.querySelectorAll('[data-logo]').forEach((el) => (el.innerHTML = logo));

  document.querySelectorAll('[data-qr]').forEach((el) => {
    const qr = qrcode(0, 'M');
    qr.addData(el.dataset.qr);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    const fg = el.dataset.fg || '#071e2b';
    el.innerHTML = `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="${fg}"/></svg>`;
  });
  document.documentElement.dataset.ready = '1';
})();
