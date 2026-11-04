/**
 * Scene markup for the ZCode "Refraction" boot layer.
 *
 * One string so the injected document, the preview page and the stylesheet
 * share a single contract. Deliberately bare: a plane of parallel hairlines,
 * the mark, a wordmark, a status line and one hairline that doubles as the
 * loading bar and the exit cut.
 */

const Z_TOP = 'M262 288 H515 L476 352 H262 Z'
const Z_BLADE = 'M515 288 H765 L497 732 H245 Z'
const Z_BOTTOM = 'M534 668 H745 V732 H497 Z'

const Z_EDGE_RIGHT = 'M765 288 L497 732'
const Z_EDGE_LEFT = 'M515 288 L245 732'

function stroke(index, path) {
  // One stacked SVG per stroke: clip-path on the HTML box is universally
  // supported, while clip-path on an SVG child is not. The wipe sweeps the
  // full 1000-unit box, so it reads as a print head crossing the mark.
  return '<svg class="zcb__stroke" style="--i:' + index + ';" viewBox="215 258 580 504" aria-hidden="true">'
    + '<path d="' + path + '" fill="currentColor"></path>'
    + '</svg>'
}

function zMark() {
  return '<div class="zcb__mark" aria-hidden="true">'
    + '<div class="zcb__ghost">'
    + '<svg viewBox="215 258 580 504"><path d="' + Z_TOP + '" fill="currentColor"></path>'
    + '<path d="' + Z_BLADE + '" fill="currentColor"></path>'
    + '<path d="' + Z_BOTTOM + '" fill="currentColor"></path></svg>'
    + '</div>'
    + stroke(0, Z_TOP)
    + stroke(1, Z_BLADE)
    + stroke(2, Z_BOTTOM)
    + '<svg class="zcb__edge" viewBox="215 258 580 504" aria-hidden="true">'
    + '<path class="zcb__edge-glow" d="' + Z_EDGE_RIGHT + '" stroke-width="26"></path>'
    + '<path class="zcb__edge-line" d="' + Z_EDGE_RIGHT + '" stroke-width="6"></path>'
    + '<path class="zcb__edge-line zcb__edge-line--left" d="' + Z_EDGE_LEFT + '" stroke-width="2.4"></path>'
    + '</svg>'
    + '</div>'
}

function wordmark() {
  const letters = ['Z', 'C', 'o', 'd', 'e']
  return '<h1 class="zcb__title" aria-label="ZCode">'
    + '<span class="zcb__word" aria-hidden="true">'
    + letters.map((ch, i) => '<span class="zcb__mask"><span style="--i:' + i + ';">' + ch + '</span></span>').join('')
    + '<span class="zcb__dot"></span>'
    + '</span>'
    + '</h1>'
}

/* The sketch is built at run time from the mounted shell, so it can follow
   whatever form the desktop takes: rail open or collapsed, empty composer or
   restored conversation, light or dark. */
function power() {
  return '<div class="zcb__power" aria-hidden="true"></div>'
}

/* The sketch is built at run time from the mounted shell, so it can follow
   whatever form the desktop takes: rail open or collapsed, empty composer or
   restored conversation, light or dark. */
function sketch() {
  return '<svg class="zcb__sketch" aria-hidden="true"></svg>'
}

export const SCENE_HTML = '<div class="zcb" id="zcb-root" data-zcb-root role="progressbar"'
  + ' aria-label="正在启动 ZCode" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'
  + '<canvas class="zcb__field" data-zcb-canvas aria-hidden="true"></canvas>'
  + '<div class="zcb__grain" aria-hidden="true"></div>'
  + '<div class="zcb__dark" aria-hidden="true">'
  + '<div class="zcb__half zcb__half--a"></div>'
  + '<div class="zcb__half zcb__half--b"></div>'
  + '<div class="zcb__seam"></div>'
  + zMark()
  + '</div>'
  + power()
  + '<div class="zcb__ui">'
  + '<main class="zcb__hero">'
  + wordmark()
  + '<p class="zcb__status"><i></i><span data-zcb-status>正在载入工作台</span></p>'
  + '</main>'
  + '</div>'
  + '<div class="zcb__cut" aria-hidden="true"><i data-zcb-progress></i></div>'
  + '<div class="zcb__slab" aria-hidden="true"></div>'
  + sketch()
  + '<span class="zcb__skip">ESC / 任意键</span>'
  + '</div>'
