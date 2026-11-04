/**
 * The parallel ray field.
 *
 * A plane of hairlines at exactly the mark's diagonal (-50deg), all parallel by
 * construction. One spectral beam crosses the plane at constant speed on a
 * fixed cycle; the lines it passes light up in order. Nothing organic, nothing
 * random: the only motion is that sweep.
 *
 * The beam is treated as light passing through glass, not paint: the paper
 * takes a wide spectral wash, the ruling dissolves where the light is strong,
 * and the lit line splits into a cool and a warm strand. Geometry stays exact.
 *
 * Exposes `window.ZCField.create(canvas)`:
 *   { start, stop, freeze, setPointer, setEnergy, destroy }
 */
(function () {
  'use strict'

  var ANGLE = (-50 * Math.PI) / 180
  var SPACING = 24
  var BEAM_SIGMA = 78
  var SWEEP_MS = 2200
  var CYCLE_MS = 2900
  var WASH_HALF = 300
  var PAPER = '#fbfaf7'
  var STOPS = [
    [120, 205, 240],
    [160, 135, 255],
    [255, 150, 175],
    [255, 200, 130],
  ]

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ]
  }

  function spectral(u) {
    var t = Math.max(0, Math.min(1, u)) * (STOPS.length - 1)
    var i = Math.min(STOPS.length - 2, Math.floor(t))
    return mix(STOPS[i], STOPS[i + 1], t - i)
  }

  function lighten(rgb, amount) {
    return mix(rgb, [255, 255, 255], amount)
  }

  function create(canvas) {
    var ctx = canvas.getContext('2d')
    if (!ctx) return null

    var dpr = Math.min(window.devicePixelRatio || 1, 2)
    var width = 1
    var height = 1
    var time = 0
    var last = 0
    var raf = 0
    var running = false
    var frozen = false
    var energy = 0
    var pointer = 0
    var pointerTarget = 0

    function resize() {
      var rect = canvas.getBoundingClientRect()
      var nextW = Math.max(1, Math.round(rect.width))
      var nextH = Math.max(1, Math.round(rect.height))
      if (nextW === width && nextH === height && canvas.width) return
      width = nextW
      height = nextH
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }

    function line(offset, dx, dy, nx, ny, reach, cx, cy) {
      ctx.beginPath()
      ctx.moveTo(cx + nx * offset - dx * reach, cy + ny * offset - dy * reach)
      ctx.lineTo(cx + nx * offset + dx * reach, cy + ny * offset + dy * reach)
      ctx.stroke()
    }

    function draw() {
      resize()
      var w = width
      var h = height
      var diag = Math.sqrt(w * w + h * h)
      var cx = w / 2
      var cy = h / 2
      var dx = Math.cos(ANGLE)
      var dy = Math.sin(ANGLE)
      var nx = -dy
      var ny = dx
      var reach = diag / 2 + 40

      var count = Math.ceil(diag / SPACING) + 4
      var start = -((count - 1) / 2) * SPACING

      // Beam position along the normal: one constant-speed pass per cycle,
      // both endpoints outside the frame so the wrap is invisible.
      var phase = time % CYCLE_MS
      var progress = Math.min(phase / SWEEP_MS, 1)
      // Start and end beyond the frame corners so the wrap is invisible, but
      // no further than that: the beam is on screen for most of each cycle.
      var beam = (-0.70 + progress * 1.40) * diag + pointer * 26

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'

      // The sheet itself: a touch warmer at the top, cooler at the foot, so the
      // plane reads as a surface with a body rather than flat fill.
      var body = ctx.createLinearGradient(0, 0, 0, h)
      body.addColorStop(0, '#fdfbf6')
      body.addColorStop(0.55, PAPER)
      body.addColorStop(1, '#f5f5f4')
      ctx.fillStyle = body
      ctx.fillRect(0, 0, w, h)

      // The sheet carries a quiet iridescence of its own: frosted glass, not
      // flat paper. Kept under 0.07 so it is felt rather than read.
      var amb = ctx.createLinearGradient(
        cx + nx * -diag * 0.55, cy + ny * -diag * 0.55,
        cx + nx * diag * 0.55, cy + ny * diag * 0.55
      )
      amb.addColorStop(0, 'rgba(160,210,245,0.06)')
      amb.addColorStop(0.3, 'rgba(205,190,255,0.07)')
      amb.addColorStop(0.55, 'rgba(255,235,240,0.03)')
      amb.addColorStop(0.78, 'rgba(255,220,185,0.06)')
      amb.addColorStop(1, 'rgba(255,235,215,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = amb
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // Light that came through the glass: a wide spectral wash tinting the
      // sheet. Multiply keeps it as pigment on paper instead of paint on top.
      var near = beam - WASH_HALF
      var far = beam + WASH_HALF
      var wash = ctx.createLinearGradient(
        cx + nx * near, cy + ny * near,
        cx + nx * far, cy + ny * far
      )
      wash.addColorStop(0, 'rgba(169,220,245,0)')
      wash.addColorStop(0.16, 'rgba(169,220,245,0.11)')
      wash.addColorStop(0.38, 'rgba(203,185,255,0.13)')
      wash.addColorStop(0.54, 'rgba(255,195,210,0.11)')
      wash.addColorStop(0.76, 'rgba(255,224,184,0.09)')
      wash.addColorStop(1, 'rgba(255,224,184,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // A soft bloom riding the beam: light pooling on the sheet.
      var bx = cx + nx * beam
      var by = cy + ny * beam
      var bloom = ctx.createRadialGradient(bx, by, 0, bx, by, 320)
      bloom.addColorStop(0, 'rgba(255,255,255,0.14)')
      bloom.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'soft-light'
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.arc(bx, by, 320, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.lineCap = 'butt'
      ctx.lineWidth = 1

      for (var i = 0; i < count; i++) {
        var offset = start + i * SPACING
        var distance = offset - beam
        var lit = Math.exp(-(distance * distance) / (2 * BEAM_SIGMA * BEAM_SIGMA))

        // The ruling dissolves under the light: the beam is an aperture, not a
        // brighter line drawn over the grid.
        var base = 0.046 + lit * 0.085 * energy
        ctx.strokeStyle = 'rgba(10,10,11,' + base.toFixed(3) + ')'
        line(offset, dx, dy, nx, ny, reach, cx, cy)

        if (lit < 0.012 || energy <= 0) continue

        // Slow caustic breathing along the normal; still one moving figure.
        var ripple = 0.9 + 0.1 * Math.sin(offset * 0.018 - time * 0.0008)
        var litA = lit * energy * ripple
        var u = 0.5 + distance / (2 * BEAM_SIGMA * 2.4)
        var hue = spectral(u)
        var cool = spectral(u - 0.24)
        var warm = spectral(u + 0.24)
        var core = lighten(hue, 0.32)
        var shift = 1.4 + 2.2 * lit
        var glow = 'rgba(' + hue[0] + ',' + hue[1] + ',' + hue[2] + ','

        ctx.strokeStyle = glow + (0.06 * litA).toFixed(3) + ')'
        ctx.lineWidth = 12
        line(offset, dx, dy, nx, ny, reach, cx, cy)

        ctx.strokeStyle = glow + (0.28 * litA).toFixed(3) + ')'
        ctx.lineWidth = 2.6
        line(offset, dx, dy, nx, ny, reach, cx, cy)

        // Dispersion: the lit hairline splits into a cool and a warm strand,
        // the way a glass edge separates the spectrum.
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(' + cool[0] + ',' + cool[1] + ',' + cool[2] + ','
          + (0.42 * litA).toFixed(3) + ')'
        line(offset - shift, dx, dy, nx, ny, reach, cx, cy)

        ctx.strokeStyle = 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ','
          + (0.42 * litA).toFixed(3) + ')'
        line(offset + shift, dx, dy, nx, ny, reach, cx, cy)

        ctx.strokeStyle = 'rgba(' + core[0] + ',' + core[1] + ',' + core[2] + ','
          + (0.62 * litA).toFixed(3) + ')'
        line(offset, dx, dy, nx, ny, reach, cx, cy)
      }
    }

    function loop(now) {
      if (!running) return
      raf = requestAnimationFrame(loop)
      if (last && now - last < 30) return
      var dt = last ? Math.min((now - last) / 1000, 0.12) : 0.016
      last = now
      time += dt * 1000
      pointer += (pointerTarget - pointer) * 0.06
      try {
        draw()
      } catch (error) {
        stop()
        if (window.console) console.warn(error)
      }
    }

    function start() {
      if (running) return
      resize()
      running = true
      last = 0
      raf = requestAnimationFrame(loop)
      window.addEventListener('resize', resize)
    }

    function stop() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.removeEventListener('resize', resize)
    }

    function freeze(at) {
      stop()
      frozen = true
      if (typeof at === 'number') time = at
      try {
        draw()
      } catch (error) {
        if (window.console) console.warn(error)
      }
    }

    function setPointer(value) {
      pointerTarget = Math.max(-1, Math.min(1, value))
    }

    function setEnergy(value) {
      energy = Math.max(0, Math.min(1, value))
    }

    function destroy() {
      stop()
    }

    return {
      start: start,
      stop: stop,
      freeze: freeze,
      setPointer: setPointer,
      setEnergy: setEnergy,
      destroy: destroy,
      get frozen() {
        return frozen
      },
    }
  }

  window.ZCField = { create: create }
})()
