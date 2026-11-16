/*! motion-kit: пружинный движок + эффекты для лендингов. Без зависимостей.
 * Подключение: <link rel="stylesheet" href="motion.css"><script src="motion.js" defer></script>
 * Атрибуты (JS сам вешает рабочие классы, ничего хардкодить в разметке не надо):
 *   data-magnetic            кнопка тянется за курсором
 *   data-scramble            текст «собирается» из случайных букв при появлении
 *   data-roll                ссылка/кнопка: текст прокручивается при наведении
 *   data-reveal              плавное появление при скролле (data-reveal-delay="мс")
 *   data-pill                группа табов с резиновым хайлайтом (дети: [data-pill-item])
 *   data-stagger             дети появляются по очереди
 */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- пружинный движок ---------- */
  const S = (x = 0, [k, c] = [280, 22]) => ({ x, v: 0, t: x, k, c: reduce ? 2 * Math.sqrt(k) : c });
  const step = (s, dt) => { s.v += (-s.k * (s.x - s.t) - s.c * s.v) * dt; s.x += s.v * dt; };
  const rest = s => Math.abs(s.x - s.t) < .01 && Math.abs(s.v) < .01;
  const token = (n, f) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f);
  const spring = (n, f) => token(n, f).split(/\s+/).map(Number);

  const jobs = new Set();
  let running = false, last = 0;
  const loop = now => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    for (let i = 0; i < 4; i++) jobs.forEach(j => j.frame(dt / 4));
    jobs.forEach(j => j.render());
    jobs.forEach(j => { if (j.done && j.done()) jobs.delete(j); });
    if (jobs.size) requestAnimationFrame(loop); else running = false;
  };
  const run = job => { jobs.add(job); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };

  window.Motion = { S, step, rest, spring, token, run };

  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- magnetic ---------- */
  function magnetic(el) {
    if (!fine || reduce) return;
    const [k, c] = spring('--spring-follow', '900 50');
    const sx = S(0, [k / 3, c / 2.2]), sy = S(0, [k / 3, c / 2.2]);
    const pull = parseFloat(el.dataset.magnetic) || 0.35;
    let on = false;
    const job = {
      frame: dt => { step(sx, dt); step(sy, dt); },
      render: () => { el.style.transform = `translate3d(${sx.x.toFixed(2)}px,${sy.x.toFixed(2)}px,0)`; },
      done: () => { const d = !on && rest(sx) && rest(sy); if (d) el.style.transform = ''; return d; }
    };
    const wake = () => { on = true; run(job); };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      sx.t = (e.clientX - (r.left + r.width / 2)) * pull;
      sy.t = (e.clientY - (r.top + r.height / 2)) * pull;
      wake();
    });
    el.addEventListener('pointerleave', () => { sx.t = 0; sy.t = 0; on = false; run(job); });
  }

  /* ---------- scramble ---------- */
  const GLY = 'абвгдежзиклмнопрстуфхцчшэюя·#+*/<>';
  function scramble(el) {
    const final = el.textContent; if (reduce) return;
    el.setAttribute('aria-label', final);
    let t0 = 0, raf = 0;
    const dur = Math.min(1400, 400 + final.length * 28);
    const draw = now => {
      if (!t0) t0 = now;
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = [...final].map((ch, i) =>
        ch === ' ' || i < p * final.length ? ch : GLY[(Math.random() * GLY.length) | 0]).join('');
      if (p < 1) raf = requestAnimationFrame(draw); else el.textContent = final;
    };
    return () => { cancelAnimationFrame(raf); t0 = 0; raf = requestAnimationFrame(draw); };
  }

  /* ---------- wave: вариативный вес букв тянется за курсором (нужен шрифт с осью wght) ---------- */
  function wave(el) {
    const txt = el.textContent;
    el.setAttribute('aria-label', txt);
    const lo = parseFloat(el.dataset.waveMin) || 300, hi = parseFloat(el.dataset.waveMax) || 700, R = parseFloat(el.dataset.waveRadius) || 150;
    el.innerHTML = [...txt].map(ch => ch === ' ' ? ' ' : `<span class="mk-w" aria-hidden="true">${ch}</span>`).join('');
    const ls = $$('.mk-w', el);
    ls.forEach(l => { l.style.fontWeight = lo; });
    if (!fine || reduce) return;
    const sp = ls.map(() => S(lo, [260, 22]));
    let on = false;
    const job = {
      frame: dt => sp.forEach(s => step(s, dt)),
      render: () => ls.forEach((l, i) => { l.style.fontWeight = Math.round(sp[i].x); }),
      done: () => !on && sp.every(rest)
    };
    el.addEventListener('pointermove', e => {
      on = true;
      ls.forEach((l, i) => {
        const r = l.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) * .5;
        const d = Math.hypot(dx, dy) / R;
        sp[i].t = lo + (hi - lo) * Math.exp(-d * d);
      });
      run(job);
    });
    el.addEventListener('pointerleave', () => { on = false; sp.forEach(s => { s.t = lo; }); run(job); });
  }

  /* ---------- roll (две копии текста, стаггер по буквам) ---------- */
  function roll(el) {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.classList.add('mk-roll');
    el.innerHTML = [...txt].map((ch, i) =>
      `<span class="mk-roll__c" aria-hidden="true" style="--i:${i}"><span>${ch === ' ' ? '&nbsp;' : ch}</span><span>${ch === ' ' ? '&nbsp;' : ch}</span></span>`).join('');
  }

  /* ---------- pill: резиновый хайлайт, передний край быстрый, задний отстаёт ---------- */
  function pill(group) {
    const items = $$('[data-pill-item]', group);
    if (!items.length) return;
    group.classList.add('mk-pill');
    const hl = document.createElement('i'); hl.className = 'mk-pill__hl'; hl.setAttribute('aria-hidden', 'true');
    group.prepend(hl);
    const lead = spring('--spring-lead', '620 36'), trail = spring('--spring-trail', '190 19');
    const L = S(0, lead), R = S(0, lead); // левый и правый края
    let cur = items.find(i => i.getAttribute('aria-selected') === 'true' || i.classList.contains('is-active')) || items[0];
    const place = (snap) => {
      const g = group.getBoundingClientRect(), r = cur.getBoundingClientRect();
      const l = r.left - g.left, rr = r.right - g.left;
      if (snap || reduce) { L.x = L.t = l; R.x = R.t = rr; L.v = R.v = 0; hl.style.transform = `translateX(${l}px)`; hl.style.width = (rr - l) + 'px'; return; }
      const right = l > L.t; // едем вправо: правый край ведущий
      Object.assign(L, { k: (right ? trail : lead)[0], c: (right ? trail : lead)[1], t: l });
      Object.assign(R, { k: (right ? lead : trail)[0], c: (right ? lead : trail)[1], t: rr });
      run(job);
    };
    const job = {
      frame: dt => { step(L, dt); step(R, dt); },
      render: () => { hl.style.transform = `translateX(${L.x}px)`; hl.style.width = Math.max(8, R.x - L.x) + 'px'; },
      done: () => rest(L) && rest(R)
    };
    items.forEach(it => it.addEventListener('click', () => {
      items.forEach(x => { x.classList.toggle('is-active', x === it); x.setAttribute('aria-selected', x === it); });
      cur = it; place(false);
    }));
    cur.classList.add('is-active');
    place(true);
    addEventListener('resize', () => place(true));
    document.fonts && document.fonts.ready.then(() => place(true));
  }

  /* ---------- reveal / stagger на IntersectionObserver ---------- */
  function observe(els, fn, margin = '0px 0px -12% 0px') {
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(fn); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }), { rootMargin: margin });
    els.forEach(e => io.observe(e));
  }

  function init() {
    const stagger = parseFloat(token('--stagger', '45')) || 45;
    document.documentElement.classList.add('mk-on');

    $$('[data-magnetic]').forEach(magnetic);
    $$('[data-roll]').forEach(roll);
    $$('[data-wave]').forEach(wave);
    $$('[data-pill]').forEach(pill);

    $$('[data-reveal]').forEach(el => el.classList.add('mk-reveal'));
    observe($$('[data-reveal]'), el => {
      setTimeout(() => el.classList.add('mk-in'), parseFloat(el.dataset.revealDelay) || 0);
    });

    $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => {
      c.classList.add('mk-reveal'); c.style.setProperty('--d', i * stagger + 'ms');
    }));
    observe($$('[data-stagger]'), g => [...g.children].forEach(c => c.classList.add('mk-in')));

    const sc = $$('[data-scramble]').map(el => [el, scramble(el)]).filter(x => x[1]);
    sc.forEach(([el]) => { el.style.visibility = 'hidden'; });
    observe(sc.map(x => x[0]), el => { el.style.visibility = ''; sc.find(x => x[0] === el)[1](); });
    sc.forEach(([el, play]) => el.addEventListener('pointerenter', play));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
