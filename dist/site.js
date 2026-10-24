'use strict';
import { DemoClock, formatTime, shieldCopy } from './demo-clock.mjs';

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    mobileNav.hidden = open;
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
  });
}

const demo = document.querySelector('[data-demo]');
if (demo) {
  const timer = new DemoClock();
  const mac = demo.querySelector('[data-demo-mac]');
  const phone = demo.querySelector('[data-demo-phone]');
  const clock = demo.querySelector('[data-demo-clock]');
  const start = demo.querySelector('[data-demo-start]');
  const reset = demo.querySelector('[data-demo-reset]');
  const status = demo.querySelector('[data-demo-status]');
  const caption = demo.querySelector('[data-demo-caption]');
  const subtitle = demo.querySelector('[data-demo-subtitle]');
  const plan = demo.querySelector('[data-demo-plan]');
  const progress = demo.querySelector('.clock-progress');
  const shield = demo.querySelector('[data-phone-shield]');
  const shieldTitle = demo.querySelector('[data-shield-title]');
  const shieldSubtitle = demo.querySelector('[data-shield-subtitle]');
  const phoneHome = demo.querySelector('[data-phone-home]');
  let phoneClosed = false;
  const phoneStatus = demo.querySelector('[data-phone-status]');
  const phoneFeed = demo.querySelector('.phone-feed');
  const tabs = [...demo.querySelectorAll('[data-mode]')];
  const panel = demo.querySelector('[role="tabpanel"]');
  let tick = null;
  let renderedState = null;

  function render() {
    const state = timer.snapshot();
    const active = state.phase === 'running';
    const finished = state.phase === 'complete';
    const paused = state.phase === 'paused';
    const stopwatch = state.mode === 'stopwatch';
    // Only the digits and progress arc change while time is passing. Replacing
    // button text during a pointer/keyboard press can lose that activation.
    const displayTime = formatTime(stopwatch ? state.elapsed : state.remaining);
    if (clock.textContent !== displayTime) {
      clock.textContent = displayTime;
      clock.dataset.longTime = String(displayTime.length > 5);
    }
    progress.style.strokeDashoffset = stopwatch ? '603.2' : String(603.2 * state.progress);
    // Keep one ticker, owned by the current state, including after tab restore.
    if (active && tick === null) tick = setInterval(render, 80);
    if (!active && tick !== null) { clearInterval(tick); tick = null; }
    if (!active) phoneClosed = false;
    const nextState = `${state.mode}:${state.phase}:${phoneClosed}`;
    if (renderedState === nextState) return;
    renderedState = nextState;
    mac.classList.toggle('superfocus', state.mode === 'superfocus');
    mac.classList.toggle('stopwatch', stopwatch);
    mac.classList.toggle('demo-complete', finished);
    demo.classList.toggle('is-focusing', active);
    demo.classList.toggle('is-complete', finished);
    clock.setAttribute('aria-label', stopwatch ? 'Elapsed preview time' : 'Preview time remaining');
    caption.textContent = finished ? 'TIME WELL SPENT' : state.mode === 'superfocus' ? 'SUPERFOCUS' : stopwatch ? 'STOPWATCH' : 'FOCUS TIME';
    subtitle.textContent = finished ? 'A small session. A clear head.' : state.mode === 'superfocus' ? 'Committed until the countdown ends.' : stopwatch ? 'Count up. Find your flow.' : 'A small taste of focused work.';
    plan.textContent = finished ? 'Session complete · Phone unlocked' : state.mode === 'superfocus' ? '10-second commitment · Controls locked' : stopwatch ? 'No time limit · Pause any time' : '10-second focus session';
    start.disabled = state.locked;
    start.dataset.action = active ? 'pause' : 'start';
    start.dataset.state = state.phase;
    start.textContent = state.locked ? 'Focused · unlocks at 00:00' : active ? (stopwatch ? 'Ⅱ  Pause stopwatch' : 'Ⅱ  Pause demo') : finished ? '↻  Try another 10 seconds' : paused ? (stopwatch ? '▶  Resume stopwatch' : '▶  Resume demo') : stopwatch ? '▶  Start stopwatch' : '▶  Try 10 seconds';
    reset.disabled = state.locked;
    reset.title = state.locked ? 'Reset is locked during Superfocus' : stopwatch ? 'Reset stopwatch' : 'Reset the timer preview';
    reset.setAttribute('aria-label', stopwatch ? 'Reset stopwatch' : 'Reset the timer preview');
    const statusText = finished ? 'Session complete. The phone is free again.' : state.locked ? 'One commitment. You’re almost there.' : active ? 'Focus is on. The phone preview is blocked.' : paused ? 'Paused. The phone preview is free.' : 'Start on Mac. Watch the phone.';
    if (status.textContent !== statusText) status.textContent = statusText;
    shield.hidden = !state.protected || phoneClosed;
    phoneHome.hidden = !state.protected || !phoneClosed;
    phoneFeed.setAttribute('aria-hidden', String(state.protected));
    phone.classList.toggle('is-blocked', state.protected);
    phone.classList.toggle('just-unlocked', finished);
    phone.classList.toggle('shield-superfocus', state.mode === 'superfocus');
    const copy = shieldCopy(state.mode);
    shieldTitle.textContent = copy.title;
    shieldSubtitle.textContent = copy.subtitle;
    phoneStatus.textContent = state.protected ? 'Distraction blocked' : finished ? 'Back to browsing' : paused ? 'Paused · free to browse' : 'Free to browse';
    tabs.forEach(tab => {
      const selected = tab.dataset.mode === state.mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.disabled = state.locked && !selected;
    });
    panel.setAttribute('aria-labelledby', `demo-${state.mode}`);
  }
  start.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  start.addEventListener('click', () => {
    if (start.dataset.action === 'pause') timer.pause();
    else timer.start();
    render();
  });
  reset.addEventListener('click', () => { timer.reset(); render(); });
  demo.querySelector('[data-shield-close]').addEventListener('click', () => { phoneClosed = true; render(); });
  demo.querySelector('[data-phone-open]').addEventListener('click', () => { phoneClosed = false; render(); });
  tabs.forEach(tab => tab.addEventListener('click', () => { if (timer.select(tab.dataset.mode)) phoneClosed = false; render(); }));
  demo.querySelector('[role="tablist"]').addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key) || timer.snapshot().locked) return;
    event.preventDefault();
    const current = tabs.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  document.addEventListener('visibilitychange', render);
  render();
}

const guideNav = document.querySelector('.guide-nav');
if (guideNav && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      guideNav.querySelectorAll('a').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-12% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('.guide-content > section[id]').forEach(section => observer.observe(section));
}
