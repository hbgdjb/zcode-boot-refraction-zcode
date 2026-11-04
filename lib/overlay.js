/**
 * ZCode "Refraction" — timeline driver.
 *
 *   power line → the mark writes → the black plane parts along its diagonal
 *   → parallel ray field + wordmark → a black slab slides down → the desktop
 *   outline is drawn on the slab → the layer fades into the app.
 *
 * One cancelable scheduler owns every step, so a skip leaves no orphan timer.
 *
 * Query switches:
 *   ?zcb=off | only | slow | still | freeze:2600 | pose:sign|hero|slab|exit
 */
(function () {
  'use strict'

  if (window.ZCBoot) return

  var SESSION_KEY = 'zcode-boot-refraction-played'

  /* Base timeline, milliseconds from the first painted frame. */
  var T = {
    sign: 750,
    split: 1950,
    field: 2750,
    slab: 6300,
    sketch: 7400,
    dismiss: 9900,
  }

  /* Standalone splash: no desktop to trace, so the slab lands, holds, and the
     page reports completion so the native window can hand off to the app. */
  var T_SPLASH = {
    sign: 750,
    split: 1950,
    field: 2750,
    slab: 7200,
    exit: 9300,
  }

  function raf2(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn)
    })
  }

  function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value
  }

  function isDarkHost() {
    var root = document.documentElement
    var body = document.body
    if (root.hasAttribute('data-ds-dark-theme') || body.hasAttribute('data-ds-dark-theme')) return true
    if (root.hasAttribute('data-ds-light-theme') || body.hasAttribute('data-ds-light-theme')) return false
    if (root.classList.contains('dark') || body.classList.contains('dark')) return true
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (error) {
      return false
    }
  }

  /**
   * Build the desktop wireframe from the shell that is actually mounted.
   *
   * The handoff has to survive several desktop forms: rail open or collapsed,
   * fresh session (composer centred) or restored conversation (composer at the
   * bottom), light or dark, any window size. So the sketch measures the live
   * DOM instead of using fixed percentages, and falls back per-anchor when an
   * element is missing.
   */
  function buildSketch(root) {
    var svg = root.querySelector('.zcb__sketch')
    if (!svg) return
    var w = window.innerWidth
    var h = window.innerHeight
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h)
    svg.setAttribute('preserveAspectRatio', 'none')
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    function visible(el) {
      var r = el.getBoundingClientRect()
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < h && r.left < w
    }
    function box(el) {
      return el.getBoundingClientRect()
    }
    function area(el) {
      var r = el.getBoundingClientRect()
      return r.width * r.height
    }
    function nodes(selector) {
      return Array.prototype.slice.call(document.querySelectorAll(selector)).filter(visible)
    }

    // Composer: the largest editable field.
    var composer = null
    var fields = nodes('textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]')
    if (fields.length) {
      fields.sort(function (a, b) { return area(b) - area(a) })
      var fr = box(fields[0])
      var padX = Math.min(20, fr.width * 0.06)
      composer = {
        x: Math.max(6, fr.left - padX),
        y: Math.max(6, fr.top - 14),
        w: Math.min(w - 12, fr.width + padX * 2),
        h: Math.min(h - 12, fr.height + 26),
      }
    }

    // Rail: the tallest vertical surface hugging the left edge.
    var railX = null
    var rails = nodes('aside, nav, [class*="sidebar" i], [class*="rail" i], [class*="nav" i]')
    rails.sort(function (a, b) { return box(b).height - box(a).height })
    for (var r = 0; r < rails.length; r++) {
      var rr = box(rails[r])
      if (rr.left < 48 && rr.width >= 40 && rr.width < Math.min(440, w * 0.45)) {
        railX = Math.min(rr.right, w * 0.45)
        break
      }
    }

    // Top bar.
    var topY = null
    var tops = nodes('header, [class*="topbar" i], [class*="top-bar" i], [class*="header" i]')
    tops.sort(function (a, b) { return box(a).top - box(b).top })
    for (var t = 0; t < tops.length; t++) {
      var tr = box(tops[t])
      if (tr.top < 48 && tr.width > w * 0.4 && tr.height < 180) {
        topY = Math.min(tr.bottom, h * 0.22)
        break
      }
    }

    // Empty-state heading, if the shell shows one.
    var heading = null
    var heads = nodes('h1, h2')
    for (var hh = 0; hh < heads.length; hh++) {
      var hr = box(heads[hh])
      var insideComposer = composer
        && hr.bottom > composer.y
        && hr.top < composer.y + composer.h
      if (!insideComposer) {
        heading = { x: hr.left, y: hr.top + hr.height / 2, w: Math.min(hr.width, 240) }
        break
      }
    }

    // Send: the right-most button inside the composer band.
    var send = null
    if (composer) {
      var buttons = nodes('button')
      var best = null
      for (var b = 0; b < buttons.length; b++) {
        var br = box(buttons[b])
        if (br.left > composer.x + composer.w * 0.5
          && br.top > composer.y - 16
          && br.bottom < composer.y + composer.h + 24) {
          if (!best || br.right > best.right) best = br
        }
      }
      if (best) {
        send = {
          x: best.left,
          y: best.top,
          w: Math.max(18, best.width),
          h: Math.max(14, best.height),
        }
      }
    }

    if (railX == null) railX = Math.round(w * 0.1475)
    if (topY == null) topY = Math.round(h * 0.064)
    if (!composer) {
      composer = {
        x: Math.round(w * 0.336),
        y: Math.round(h * 0.505),
        w: Math.round(w * 0.475),
        h: Math.round(h * 0.108),
      }
    }
    if (!send) {
      send = {
        x: composer.x + composer.w - 70,
        y: composer.y + composer.h - 40,
        w: 42,
        h: 24,
      }
    }
    send.x = Math.max(composer.x + 8, Math.min(send.x, composer.x + composer.w - send.w - 8))
    send.y = Math.max(composer.y + 8, Math.min(send.y, composer.y + composer.h - send.h - 8))

    var shapes = [
      { tag: 'path', cls: 'rail', d: 'M' + railX + ' 0 V' + h },
      { tag: 'path', cls: 'top', d: 'M' + railX + ' ' + topY + ' H' + w },
      { tag: 'path', cls: 'brand', d: 'M16 18 H30 L16 32 H30' },
    ]
    if (heading) {
      shapes.push({
        tag: 'path',
        cls: 'head',
        d: 'M' + Math.round(heading.x) + ' ' + Math.round(heading.y)
          + ' H' + Math.round(heading.x + heading.w),
      })
    }
    shapes.push({
      tag: 'rect',
      cls: 'composer',
      x: Math.round(composer.x),
      y: Math.round(composer.y),
      width: Math.round(composer.w),
      height: Math.round(composer.h),
      rx: 18,
    })
    shapes.push({
      tag: 'path',
      cls: 'prompt',
      d: 'M' + Math.round(composer.x + 20) + ' ' + Math.round(composer.y + composer.h * 0.58)
        + ' H' + Math.round(composer.x + 20 + Math.min(150, composer.w * 0.3)),
    })
    shapes.push({
      tag: 'rect',
      cls: 'send',
      x: Math.round(send.x),
      y: Math.round(send.y),
      width: Math.round(send.w),
      height: Math.round(send.h),
      rx: Math.min(14, Math.round(send.h / 2)),
    })

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

  function makeGrain(root) {
    try {
      var size = 160
      var canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      var ctx = canvas.getContext('2d')
      var image = ctx.createImageData(size, size)
      var data = image.data
      for (var i = 0; i < data.length; i += 4) {
        var v = 96 + Math.random() * 96
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 255
      }
      ctx.putImageData(image, 0, 0)
      root.style.setProperty('--grain', 'url(' + canvas.toDataURL('image/png') + ')')
    } catch (error) {
      /* grain is optional */
    }
  }

  function play(options) {
    var opts = options || {}
    var root = opts.root || document.getElementById('zcb-root')
    if (!root || root.dataset.zcbMounted === '1') return null
    root.dataset.zcbMounted = '1'

    var splash = opts.mode === 'splash'
    var step = splash ? T_SPLASH : T

    var params = new URLSearchParams(window.location.search)
    var mode = params.get('zcb') || 'auto'
    var freezeAt = -1
    var pose = ''
    if (mode.indexOf('freeze:') === 0) {
      freezeAt = parseFloat(mode.slice(7))
      if (!isFinite(freezeAt) || freezeAt < 0) freezeAt = -1
      mode = 'freeze'
    } else if (mode.indexOf('pose:') === 0) {
      pose = mode.slice(5)
      mode = 'pose'
    }

    if (mode === 'off') {
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch (error) { /* private mode */ }
      root.remove()
      return null
    }

    var once = opts.playOncePerSession !== false
    var played = false
    try { played = sessionStorage.getItem(SESSION_KEY) === '1' } catch (error) { /* private mode */ }
    if (played && once && mode === 'auto') {
      root.remove()
      return null
    }

    var reduce = false
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch (error) { /* no media queries */ }
    if (reduce) mode = 'still'

    var K = mode === 'slow' ? 2.2 : 1
    root.classList.toggle('zcb--dark', isDarkHost())

    var canvas = root.querySelector('[data-zcb-canvas]')
    makeGrain(root)

    var field = window.ZCField && canvas ? window.ZCField.create(canvas) : null
    if (field) field.setPointer(0)

    document.documentElement.setAttribute('data-zcb-boot', '')

    var done = false
    var exiting = false
    var frozen = false
    var timers = []
    var exitTimer = 0
    var pointerFrame = 0
    var readyProbe = 0
    var hold = mode === 'only'

    function schedule(ms, fn) {
      var id = setTimeout(function () {
        var index = timers.indexOf(id)
        if (index >= 0) timers.splice(index, 1)
        if (!done && !frozen) fn()
      }, Math.max(0, ms * K))
      timers.push(id)
      return id
    }

    function cancelAll() {
      for (var i = 0; i < timers.length; i++) clearTimeout(timers[i])
      timers.length = 0
      if (readyProbe) clearInterval(readyProbe)
      readyProbe = 0
    }

    function setProgress(value) {
      root.setAttribute('aria-valuenow', String(value))
    }

    function shellReady() {
      return !document.querySelector('[data-dsh-boot], [data-dsh-boot-placeholder]')
    }

    function cleanup() {
      if (done) return
      done = true
      cancelAll()
      if (exitTimer) clearTimeout(exitTimer)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      if (pointerFrame) cancelAnimationFrame(pointerFrame)
      if (field) field.destroy()
      document.documentElement.removeAttribute('data-zcb-boot')
      if (root.parentNode) root.parentNode.removeChild(root)
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch (error) { /* private mode */ }
      try {
        window.dispatchEvent(new CustomEvent('zcb:done'))
      } catch (error) { /* older webview */ }
    }

    function exit() {
      if (exiting || done || frozen) return
      exiting = true
      setProgress(100)
      if (field) field.stop()
      root.classList.add('is-exit')
      exitTimer = setTimeout(cleanup, (reduce ? 120 : 840) + 60)
    }

    function fadeReduced() {
      if (exiting || done) return
      exiting = true
      root.style.transition = 'opacity 520ms ease'
      root.style.opacity = '0'
      exitTimer = setTimeout(cleanup, 620)
    }

    function freezeLayer() {
      if (frozen || done) return
      frozen = true
      cancelAll()
      if (exitTimer) clearTimeout(exitTimer)
      if (field) field.freeze()
      try {
        root.getAnimations({ subtree: true }).forEach(function (animation) {
          try { animation.pause() } catch (error) { /* detached */ }
        })
      } catch (error) { /* getAnimations unavailable */ }
    }

    function beginSlab() {
      if (hold || done || frozen) return
      // The shell may paint its theme attribute after first script run.
      root.classList.toggle('zcb--dark', isDarkHost())
      root.classList.add('is-slab')
      setProgress(90)
      if (field) field.stop()
      if (!splash) buildSketch(root)
    }

    function beginDismiss() {
      if (hold || done || frozen) return
      var started = performance.now()
      readyProbe = setInterval(function () {
        var elapsed = performance.now() - started
        if (shellReady() || elapsed >= 1400) {
          clearInterval(readyProbe)
          readyProbe = 0
          exit()
        }
      }, 120)
    }

    function onPointerDown(event) {
      event.preventDefault()
      skip()
    }

    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      skip()
    }

    function onPointerMove(event) {
      if (pointerFrame) return
      var clientX = event.clientX
      pointerFrame = requestAnimationFrame(function () {
        pointerFrame = 0
        var nx = clamp01(clientX / window.innerWidth) * 2 - 1
        root.style.setProperty('--px', nx.toFixed(3))
        if (field) field.setPointer(nx)
      })
    }

    function skip() {
      if (done || exiting) return
      cancelAll()
      if (reduce) {
        fadeReduced()
        return
      }
      exit()
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)

    function boot() {
      if (reduce) {
        root.classList.add('zcb--static')
        setProgress(100)
        if (field) {
          field.setEnergy(1)
          field.freeze(1100)
        }
        exitTimer = setTimeout(fadeReduced, 1500)
        return
      }

      if (mode === 'still') {
        root.classList.add('zcb--static')
        setProgress(100)
        if (field) {
          field.setEnergy(1)
          field.freeze(1100)
        }
        return
      }

      if (mode === 'pose') {
        root.classList.add('zcb--pose', 'is-sign')
        if (pose === 'sign') {
          setProgress(30)
          return
        }
        root.classList.add('is-split', 'is-field')
        if (pose === 'slab' || pose === 'exit') {
          buildSketch(root)
          root.classList.add('is-slab')
          if (pose === 'exit') root.classList.add('is-sketch')
          setProgress(100)
          return
        }
        setProgress(100)
        if (field) {
          field.setEnergy(1)
          field.freeze(1100)
        }
        return
      }

      root.classList.add('is-power')
      setProgress(4)

      schedule(step.sign, function () {
        root.classList.add('is-sign')
        setProgress(14)
      })

      schedule(step.split, function () {
        if (field) {
          field.setEnergy(0.6)
          field.start()
        }
        root.classList.add('is-split')
        setProgress(42)
      })

      schedule(step.field, function () {
        root.classList.add('is-field')
        setProgress(72)
        if (field) field.setEnergy(1)
      })

      if (freezeAt >= 0) {
        schedule(freezeAt, freezeLayer)
        return
      }

      schedule(step.slab, beginSlab)

      if (splash) {
        schedule(step.exit, exit)
        return
      }

      schedule(step.sketch, function () {
        if (!hold) root.classList.add('is-sketch')
      })

      schedule(step.dismiss, beginDismiss)
    }

    var started = false
    function bootOnce() {
      if (started) return
      started = true
      boot()
    }

    raf2(bootOnce)
    // rAF is throttled in a hidden/occluded window; the film must still start
    // its clock so the layer is not left on a frozen first frame.
    setTimeout(bootOnce, 140)

    return {
      root: root,
      skip: skip,
      destroy: cleanup,
      get frozen() {
        return frozen
      },
    }
  }

  window.ZCBoot = { play: play }
})()
