/**
 * Portrait timeline for the phone splash.
 *
 * Same four acts as the desktop film, compressed to about eight seconds, with
 * a shell traced for a phone: a header line, the brand, and the composer at
 * the foot. Touch or any key ends it immediately.
 */
(function () {
  'use strict'

  var T = {
    sign: 600,
    split: 1500,
    field: 2150,
    slab: 4950,
    sketch: 6250,
    exit: 7350,
  }

  var root = document.getElementById('zcb-root')
  if (!root) return

  root.classList.add('zcb--dark')

  var canvas = root.querySelector('[data-zcb-canvas]')
  var field = window.ZCField && canvas
    ? window.ZCField.create(canvas, { spacing: 18, sigma: 58 })
    : null
  var timers = []
  var done = false

  function after(ms, fn) {
    timers.push(setTimeout(function () {
      if (!done) fn()
    }, ms))
  }

  function stopTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i])
    timers.length = 0
  }

  /**
   * The phone shell: a header rule, the mark, and the composer pinned to the
   * foot of the screen — the shape ZCode's app settles into on a phone.
   */
  function traceShell() {
    var svg = root.querySelector('.zcb__sketch')
    if (!svg) return
    var w = window.innerWidth
    var h = window.innerHeight
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h)
    svg.setAttribute('preserveAspectRatio', 'none')
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    var top = Math.round(h * 0.082)
    // The home screen keeps the composer in the middle, with the greeting
    // above it — not pinned to the foot like a conversation does.
    var box = {
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.455),
      w: Math.round(w * 0.9),
      h: Math.round(h * 0.088),
    }
    var send = Math.max(26, Math.round(box.h * 0.42))

    var shapes = [
      { tag: 'path', cls: 'top', d: 'M0 ' + top + ' H' + w },
      { tag: 'path', cls: 'brand', d: 'M18 26 H34 L18 46 H34' },
      {
        tag: 'path',
        cls: 'head',
        d: 'M' + Math.round(w * 0.1) + ' ' + Math.round(h * 0.4)
          + ' H' + Math.round(w * 0.52),
      },
      {
        tag: 'rect',
        cls: 'composer',
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        rx: 22,
      },
      {
        tag: 'path',
        cls: 'prompt',
        d: 'M' + (box.x + 20) + ' ' + (box.y + Math.round(box.h * 0.56))
          + ' H' + (box.x + 20 + Math.round(box.w * 0.34)),
      },
      {
        tag: 'rect',
        cls: 'send',
        x: box.x + box.w - 18 - send,
        y: box.y + Math.round((box.h - send) / 2),
        width: send,
        height: send,
        rx: Math.round(send / 2),
      },
    ]

    for (var s = 0; s < shapes.length; s++) {
      var spec = shapes[s]
      var el = document.createElementNS('http://www.w3.org/2000/svg', spec.tag)
      el.setAttribute('class', 'zcb__sk zcb__sk--' + spec.cls)
      el.style.setProperty('--i', String(s))
      if (spec.tag === 'path') {
        el.setAttribute('d', spec.d)
      } else {
        el.setAttribute('x', spec.x)
        el.setAttribute('y', spec.y)
        el.setAttribute('width', spec.width)
        el.setAttribute('height', spec.height)
        el.setAttribute('rx', spec.rx)
      }
      svg.appendChild(el)
      try {
        el.style.setProperty('--len', (el.getTotalLength() + 8).toFixed(2))
      } catch (error) {
        /* the CSS fallback length still hides the shape */
      }
    }
  }

  function exit() {
    if (done) return
    done = true
    stopTimers()
    if (field) field.stop()
    root.classList.add('is-exit')
    setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root)
    }, 900)
  }

  after(T.sign, function () {
    root.classList.add('is-sign')
  })

  after(T.split, function () {
    root.classList.add('is-split')
    if (field) {
      field.setEnergy(0.6)
      field.start()
    }
  })

  after(T.field, function () {
    root.classList.add('is-field')
    if (field) field.setEnergy(1)
  })

  after(T.slab, function () {
    root.classList.add('is-slab')
    if (field) field.stop()
    traceShell()
  })

  after(T.sketch, function () {
    root.classList.add('is-sketch')
  })

  after(T.exit, exit)

  window.addEventListener('pointerdown', exit, true)
  window.addEventListener('keydown', exit, true)
  window.addEventListener('resize', function () {
    if (root.classList.contains('is-slab')) traceShell()
  })

  function expose() {
    window.__ZCB_MOBILE__ = { exit: exit, timings: T, trace: traceShell }
  }

  expose()

  /* Static poses for design checks: ?pose=sign|hero|slab|sketch */
  var want = new URLSearchParams(location.search).get('pose')
  if (want) {
    stopTimers()
    root.classList.add('is-power', 'is-sign')
    if (want !== 'sign') {
      root.classList.add('is-split', 'is-field')
      if (field) {
        field.setEnergy(1)
        field.freeze(1100)
      }
    }
    if (want !== 'sign' && want !== 'hero') {
      root.classList.add('is-slab')
      traceShell()
      if (want === 'sketch') root.classList.add('is-sketch')
    }
  }
})()
