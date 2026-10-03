export const MATE_ACTIONS = Object.freeze({
  idle: { label: '待机', animation: 'PET_IDLE', loop: true, duration: [3, 8] },
  walk: { label: '行走', animation: 'PET_WALK_RIGHT', loop: true },
  dragging: { label: '拖拽', animation: 'PET_DRAGGING', loop: true },
  hover: { label: '悬停反应', animation: 'HoverReaction', duration: 1.2 },
  touch: { label: '触摸反应', animation: 'FACE_HAIR_STROKE', duration: 1.8 },
  happy: { label: '开心', animation: 'PET_HAPPY', duration: 2.2 },
  sit: { label: '坐下', animation: 'PET_SITTING', loop: true },
  sleep: { label: '睡眠', animation: 'PET_SLEEPING', loop: true },
  dance: { label: '跳舞', animation: 'PET_DANCING', duration: 8 },
  hide: { label: '躲起来', animation: 'PET_HIDING', duration: 3 },
  bigScreen: { label: '大屏模式', animation: 'PET_BIG_SCREEN', loop: true },
})

export const MATE_EVENTS = Object.freeze([
  'boot',
  'idle',
  'hover',
  'touch',
  'drag-start',
  'drag-end',
  'double-tap',
  'dance',
  'sit',
  'sleep',
  'hide',
  'big-screen',
])

const TRANSIENT_ACTIONS = new Set(['hover', 'touch', 'happy', 'dance', 'hide'])

export class MateActionController {
  constructor(onChange = () => {}) {
    this.current = 'idle'
    this.elapsed = 0
    this.lockedUntil = 0
    this.idleDuration = 4
    this.manual = false
    this.onChange = onChange
  }

  get definition() {
    return MATE_ACTIONS[this.current] ?? MATE_ACTIONS.idle
  }

  get label() {
    return this.definition.label
  }

  is(name) {
    return this.current === name
  }

  play(name, options = {}) {
    if (!MATE_ACTIONS[name]) {
      return false
    }
    const changed = this.current !== name
    this.current = name
    this.elapsed = 0
    this.manual = options.manual ?? true
    const duration = options.duration ?? this.durationFor(name)
    this.lockedUntil = duration > 0 ? duration : 0
    if (changed || options.force) {
      this.onChange(name, this.definition)
    }
    return true
  }

  handle(event, payload = {}) {
    switch (event) {
      case 'boot':
      case 'idle':
        return this.play('idle', { manual: false, force: true })
      case 'hover':
        return this.play('hover')
      case 'touch':
      case 'double-tap':
        return this.play('touch')
      case 'drag-start':
        return this.play('dragging', { manual: false, duration: 0 })
      case 'drag-end':
        return this.play('happy', { manual: false })
      case 'dance':
        return this.play('dance', { duration: payload.duration ?? 8 })
      case 'sit':
        return this.play('sit', { duration: 0 })
      case 'sleep':
        return this.play('sleep', { duration: 0 })
      case 'hide':
        return this.play('hide')
      case 'big-screen':
        return this.play('bigScreen', { duration: 0 })
      default:
        return false
    }
  }

  update(delta, context = {}) {
    this.elapsed += delta
    if (this.lockedUntil > 0 && this.elapsed < this.lockedUntil) {
      return this.current
    }

    if (context.dragging) {
      if (!this.is('dragging')) {
        this.play('dragging', { manual: false, duration: 0 })
      }
      return this.current
    }
    if (context.bigScreen) {
      if (!this.is('bigScreen')) {
        this.play('bigScreen', { manual: false, duration: 0 })
      }
      return this.current
    }
    if (context.sleeping) {
      if (!this.is('sleep')) {
        this.play('sleep', { manual: false, duration: 0 })
      }
      return this.current
    }
    if (context.sitting) {
      if (!this.is('sit')) {
        this.play('sit', { manual: false, duration: 0 })
      }
      return this.current
    }
    if (this.lockedUntil > 0) {
      this.lockedUntil = 0
    }
    if (TRANSIENT_ACTIONS.has(this.current)) {
      this.play(context.moving ? 'walk' : 'idle', { manual: false })
      return this.current
    }
    if (context.moving) {
      if (!this.is('walk')) {
        this.play('walk', { manual: false, duration: 0 })
      }
      return this.current
    }
    if (!this.is('idle')) {
      this.play('idle', { manual: false })
      return this.current
    }
    if (this.elapsed >= this.idleDuration) {
      this.elapsed = 0
      this.idleDuration = this.durationFor('idle')
    }
    return this.current
  }

  durationFor(name) {
    const duration = MATE_ACTIONS[name]?.duration
    if (Array.isArray(duration)) {
      return duration[0] + Math.random() * (duration[1] - duration[0])
    }
    return duration ?? 0
  }
}
