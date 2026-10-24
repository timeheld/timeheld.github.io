const MODES = ['timer', 'stopwatch', 'superfocus'];

// Countdowns finish after ten seconds; Stopwatch measures elapsed time until paused or reset.
export class DemoClock {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.duration = 10000;
    this.mode = 'timer';
    this.phase = 'idle';
    this.elapsed = 0;
    this.startedAt = 0;
  }
  snapshot() {
    const stopwatch = this.mode === 'stopwatch';
    const total = this.elapsed + (this.phase === 'running' ? Math.max(0, this.now() - this.startedAt) : 0);
    const elapsed = stopwatch ? total : Math.min(this.duration, total);
    if (!stopwatch && this.phase === 'running' && elapsed >= this.duration) {
      this.elapsed = this.duration;
      this.phase = 'complete';
    }
    return {
      mode: this.mode, phase: this.phase,
      elapsed: Math.floor(elapsed / 1000),
      remaining: stopwatch ? null : Math.ceil((this.duration - elapsed) / 1000),
      progress: stopwatch ? null : elapsed / this.duration,
      protected: this.phase === 'running',
      locked: this.mode === 'superfocus' && this.phase === 'running'
    };
  }
  select(mode) {
    if (!MODES.includes(mode) || this.snapshot().locked) return false;
    this.mode = mode;
    return this.reset();
  }
  start() {
    const state = this.snapshot();
    if (state.locked || this.phase === 'running') return false;
    if (this.phase === 'complete') this.elapsed = 0;
    this.startedAt = this.now();
    this.phase = 'running';
    return true;
  }
  pause() {
    const state = this.snapshot();
    if (state.locked || this.phase !== 'running') return false;
    this.elapsed += Math.max(0, this.now() - this.startedAt);
    this.phase = 'paused';
    return true;
  }
  toggle() {
    return this.snapshot().phase === 'running' ? this.pause() : this.start();
  }
  reset() {
    if (this.snapshot().locked) return false;
    this.elapsed = 0;
    this.phase = 'idle';
    return true;
  }
}

export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const part = String(whole % 60).padStart(2, '0');
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${part}`
    : `${String(minutes).padStart(2, '0')}:${part}`;
}

// Copy, colours, and the mark follow FocusLockShieldExtension.swift.
// Countdown demos are under a minute; the native shield rounds up to one minute.
export function shieldCopy(mode) {
  if (mode === 'superfocus') return {
    title: 'Superfocus is on',
    subtitle: 'Superfocus stays locked until your Mac finishes. About 1 minute left.'
  };
  return {
    title: 'Timeheld is on',
    subtitle: mode === 'stopwatch'
      ? 'Your study stopwatch is running. Return to Timeheld to pause or finish.'
      : 'Back to focus. About 1 minute left.'
  };
}
