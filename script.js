const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/H6CECL5EM7';

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* header */
  const header = $('#header');
  const burger = $('#burger');
  const nav = $('#nav');
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* phone mask */
  $$('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  /* данные сцены */
  const ITEMS = [
    { kind: 'Стиральная машина', title: 'Ремонт стиральных машин', desc: 'Находим причину и чиним: не включается, не отжимает, не сливает.', old: 'от 2 500 ₽', now: 'от 2 000 ₽', val: 'Стиральная: ремонт' },
    { kind: 'Стиральная машина', title: 'Замена ТЭНа', desc: 'Машина не греет воду: меняем нагревательный элемент.', old: '2 000 ₽', now: '1 600 ₽', val: 'Стиральная: замена ТЭНа' },
    { kind: 'Стиральная машина', title: 'Замена сливной помпы', desc: 'Вода не уходит из бака: меняем сливную помпу.', old: '2 500 ₽', now: '2 000 ₽', val: 'Стиральная: замена сливной помпы' },
    { kind: 'Стиральная машина', title: 'Замена подшипников', desc: 'Гул и скрежет при отжиме: меняем подшипники барабана.', old: '5 500 ₽', now: '4 400 ₽', val: 'Стиральная: замена подшипников' },
    { kind: 'Стиральная машина', title: 'Замена амортизаторов', desc: 'Машина прыгает при отжиме: меняем амортизаторы.', old: '2 500 ₽', now: '2 000 ₽', val: 'Стиральная: замена амортизаторов' },
    { kind: 'Посудомоечная машина', title: 'Ремонт посудомоечных машин', desc: 'Находим причину и чиним: не моет, не сушит, не включается.', old: 'от 3 000 ₽', now: 'от 2 400 ₽', val: 'Посудомоечная: ремонт' },
    { kind: 'Посудомоечная машина', title: 'Замена ТЭНа', desc: 'Не нагревает воду: меняем нагревательный элемент.', old: '3 500 ₽', now: '2 800 ₽', val: 'Посудомоечная: замена ТЭНа' },
    { kind: 'Посудомоечная машина', title: 'Замена сливной помпы', desc: 'Вода остаётся в камере: меняем сливную помпу.', old: '3 000 ₽', now: '2 400 ₽', val: 'Посудомоечная: замена сливной помпы' },
    { kind: 'Посудомоечная машина', title: 'Устранение течи', desc: 'Вода под машиной: находим место протечки и устраняем.', old: '3 500 ₽', now: '2 800 ₽', val: 'Посудомоечная: устранение течи' },
  ];
  const N = ITEMS.length;
  const STEP = 40;           // градусов на позицию
  const A0 = -160;

  /* деления программатора */
  const ticks = $('#ticks');
  if (ticks) {
    ticks.innerHTML = ITEMS.map((_, i) => {
      const a = (A0 + STEP * i) * Math.PI / 180;
      const x1 = 160 + 112 * Math.sin(a), y1 = 160 - 112 * Math.cos(a);
      const x2 = 160 + 140 * Math.sin(a), y2 = 160 - 140 * Math.cos(a);
      return `<line data-t="${i}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-opacity=".55" stroke-width="8" stroke-linecap="round"/>`;
    }).join('');
  }

  /* сцена: прогресс скролла -> позиция */
  const scene = $('.scene');
  const knob = $('#knob');
  const card = $('#card');
  const kinds = $$('.kind');
  let shown = -1, pos = 0, targetPos = 0;

  function show(i) {
    if (i === shown) return;
    shown = i;
    const it = ITEMS[i];
    $('#cKind').textContent = it.kind;
    $('#cTitle').textContent = it.title;
    $('#cDesc').textContent = it.desc;
    $('#cOld').textContent = it.old;
    $('#cNew').textContent = it.now;
    $$('#ticks line').forEach((l, k) => {
      l.setAttribute('stroke', k === i ? '#ff7a45' : '#fff');
      l.setAttribute('stroke-opacity', k === i ? '1' : '.55');
    });
    kinds.forEach((k, n) => k.classList.toggle('is-active', n === (i < 5 ? 0 : 1)));
    if (!reduce) {
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    }
  }

  function sceneProgress() {
    if (!scene) return 0;
    const r = scene.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return clamp(-r.top / total, 0, 1);
  }

  kinds.forEach(b => b.addEventListener('click', () => {
    const idx = +b.dataset.jump;
    const total = scene.offsetHeight - window.innerHeight;
    const top = scene.getBoundingClientRect().top + window.scrollY;
    const p = (idx + 0.5) / N;
    window.scrollTo({ top: top + total * p, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* выбор услуги из карточки -> форма */
  $('#cBtn')?.addEventListener('click', () => {
    const sel = $('#service');
    if (sel && shown >= 0) { sel.value = ITEMS[shown].val; updateTotal(); }
  });

  /* форма: цена со скидкой */
  const sel = $('#service');
  const totalEl = $('#total');
  function updateTotal() {
    const opt = sel.options[sel.selectedIndex];
    const price = opt?.dataset.price;
    totalEl.innerHTML = price
      ? `На первый заказ со скидкой 20%: <strong>${price}</strong>`
      : 'Мастер назовёт цену со скидкой 20% на первый заказ после осмотра';
  }
  sel?.addEventListener('change', updateTotal);
  updateTotal();

  /* hero: барабан и бегущая строка */
  const spin = $('#spin');
  const marquee = $('#marquee');
  let lastY = window.scrollY, vel = 0, mq = 0, ang = 0, last = performance.now();
  function frame(t) {
    const dt = Math.min(64, t - last); last = t;
    const y = window.scrollY;
    vel += ((y - lastY) - vel) * 0.12; lastY = y;
    if (!reduce) {
      ang += dt * 0.045 + vel * 0.35;
      spin?.setAttribute('transform', `rotate(${ang.toFixed(2)} 200 262)`);
      mq -= 0.7 + Math.min(Math.abs(vel), 40) * 0.25;
      if (marquee) {
        const w = marquee.scrollWidth / 3;
        if (-mq > w) mq += w;
        marquee.style.transform = `translate3d(${mq}px,0,0)`;
      }
    }
    // программатор
    const p = sceneProgress();
    targetPos = clamp(p * N - 0.0, 0, N - 0.001);
    pos += (targetPos - pos) * (reduce ? 1 : 0.14);
    const idx = clamp(Math.floor(targetPos), 0, N - 1);
    show(idx);
    if (knob) knob.setAttribute('transform', `rotate(${(A0 + STEP * (pos - 0.5)).toFixed(2)} 160 160)`);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* smooth anchors with offset */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length <= 1) return;
    const t = $(href);
    if (!t) return;
    e.preventDefault();
    const top = t.getBoundingClientRect().top + window.scrollY - (href === '#order' || href === '#prices' ? 0 : 64);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* форма -> Worker */
  const form = $('#leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type="submit"]', form);
    const label = $('span', btn);
    const orig = label.textContent;
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });
    if (payload._gotcha) return;
    delete payload._gotcha;
    const phoneDigits = (payload.phone || '').replace(/\D/g, '');
    if (!payload.name?.trim() || phoneDigits.length < 11) {
      label.textContent = 'Проверьте имя и телефон';
      setTimeout(() => { label.textContent = orig; }, 2500);
      return;
    }
    const opt = sel.options[sel.selectedIndex];
    payload.price_со_скидкой = opt?.dataset.price || '';
    payload.source = 'Лендинг: ремонт машин, Томск';
    btn.disabled = true;
    label.textContent = 'Отправляем...';
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      label.textContent = 'Заявка отправлена. Перезвоним!';
      form.reset(); updateTotal();
    } catch (err) {
      console.error(err);
      label.textContent = 'Не отправилось, попробуйте ещё раз';
    } finally {
      setTimeout(() => { label.textContent = orig; btn.disabled = false; }, 3500);
    }
  });
})();
