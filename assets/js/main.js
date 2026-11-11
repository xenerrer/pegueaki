/* PEGUE AKI · LP da aula: revelações, contagem regressiva, formulário e página de obrigado */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const cfg = window.PEGUEAKI || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- revelações (o conteúdo já é visível sem JS) ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], [data-reveal-list]').forEach(el => io.observe(el));

  /* ---------- contagem regressiva ---------- */
  const cd = $('[data-countdown]');
  if (cd && cfg.eventStart) {
    const start = new Date(cfg.eventStart).getTime(), end = new Date(cfg.eventEnd || cfg.eventStart).getTime();
    const cells = { d: $('[data-cd="d"]', cd), h: $('[data-cd="h"]', cd), m: $('[data-cd="m"]', cd) };
    const live = $('[data-cd-live]', cd);
    const tick = () => {
      const now = Date.now();
      if (now >= end) { cd.hidden = true; return; }
      cd.hidden = false;
      if (now >= start) {
        $$('.countdown__cell', cd).forEach(c => c.hidden = true);
        live.hidden = false;
        return;
      }
      const t = Math.floor((start - now) / 60000);
      cells.d.textContent = Math.floor(t / 1440);
      cells.h.textContent = String(Math.floor((t % 1440) / 60)).padStart(2, '0');
      cells.m.textContent = String(t % 60).padStart(2, '0');
    };
    tick(); setInterval(tick, 30000);
  }

  /* ---------- botões que levam ao formulário ---------- */
  const formCard = $('#inscricao');
  const firstField = $('#f-nome');
  $$('[data-to-form]').forEach(a => a.addEventListener('click', e => {
    if (!formCard) return;
    e.preventDefault();
    formCard.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => firstField?.focus({ preventScroll: true }), reduce ? 0 : 650);
  }));

  /* ---------- barra fixa no celular: aparece quando o formulário sai da tela ---------- */
  const bar = $('[data-sticky]');
  if (bar && formCard) {
    let formVisible = true, atEnd = false, pastForm = false;
    const upd = () => bar.classList.toggle('is-on', !formVisible && pastForm && !atEnd);
    new IntersectionObserver(([e]) => {
      formVisible = e.isIntersecting;
      pastForm = e.boundingClientRect.top < 0;
      upd();
    }).observe(formCard);
    const endEl = $('.final');
    if (endEl) new IntersectionObserver(([e]) => { atEnd = e.isIntersecting; upd(); }, { rootMargin: '0px 0px -30% 0px' }).observe(endEl);
  }

  /* ---------- formulário ---------- */
  const form = $('[data-form]');
  if (form) {
    const tel = $('#f-whats');
    const digits = v => v.replace(/\D/g, '').slice(0, 11);
    const fmt = d => d.length <= 2 ? (d ? `(${d}` : '')
      : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}`
      : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    tel.addEventListener('input', () => { tel.value = fmt(digits(tel.value)); });

    const rules = {
      nome: v => v.trim().length >= 2,
      whatsapp: v => { const d = digits(v); return (d.length === 10 || d.length === 11) && +d.slice(0, 2) >= 11; },
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      cidade: v => v.trim().length >= 3,
    };
    const fieldOf = el => el.closest('.field');
    const check = el => {
      const ok = rules[el.name] ? rules[el.name](el.value) : true;
      fieldOf(el).classList.toggle('is-invalid', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    const ids = { nome: 'e-nome', whatsapp: 'e-whats', email: 'e-email', cidade: 'e-cidade' };
    Object.entries(ids).forEach(([n, id]) => form.elements[n].setAttribute('aria-describedby', id));
    $$('input[type=text], input[type=tel], input[type=email]', form).forEach(el => {
      el.addEventListener('blur', () => { if (el.value) check(el); });
      el.addEventListener('input', () => { if (fieldOf(el).classList.contains('is-invalid')) check(el); });
    });
    const radios = $$('input[name=investimento]', form);
    const radioField = radios[0].closest('.field');
    radios.forEach(r => r.addEventListener('change', () => radioField.classList.remove('is-invalid')));

    /* guarda a origem (UTM) para mandar junto */
    const params = new URLSearchParams(location.search);
    const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].forEach(k => { if (params.get(k)) utm[k] = params.get(k); });

    const btn = $('[data-submit]', form), status = $('[data-status]', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      status.textContent = '';
      const textOk = ['nome', 'whatsapp', 'email', 'cidade'].map(n => check(form.elements[n])).every(Boolean);
      const invOk = radios.some(r => r.checked);
      radioField.classList.toggle('is-invalid', !invOk);
      if (!textOk || !invOk) {
        const first = $('.field.is-invalid input', form);
        first?.focus();
        return;
      }
      btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
      const body = new URLSearchParams(new FormData(form));
      body.set('whatsapp', digits(tel.value));
      body.set('evento', 'Aula Condomínio ou rua · 25/11/2026 20h');
      body.set('enviado_em', new Date().toISOString());
      body.set('pagina', location.origin + location.pathname);
      Object.entries(utm).forEach(([k, v]) => body.set(k, v));
      try {
        if (cfg.leadEndpoint) {
          await Promise.race([
            fetch(cfg.leadEndpoint, { method: 'POST', body, mode: 'no-cors', keepalive: true }),
            new Promise(r => setTimeout(r, 5000)),
          ]);
        }
        try { sessionStorage.setItem('pa_inscrito', '1'); } catch (_) {}
        const q = new URLSearchParams(utm).toString();
        location.href = 'obrigado.html' + (q ? '?' + q : '');
      } catch (_) {
        btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
        status.textContent = 'Não conseguimos enviar agora. Confira sua conexão e toque no botão de novo.';
      }
    });
  }

  /* ---------- página de obrigado: grupo e agenda ---------- */
  $$('[data-group]').forEach(a => {
    if (cfg.whatsappGroup) { a.href = cfg.whatsappGroup; a.target = '_blank'; a.rel = 'noopener'; }
  });
  const cal = $('[data-calendar]');
  if (cal) {
    const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && !/Chrome|CriOS|Android/.test(navigator.userAgent);
    if (apple) { cal.href = 'assets/aula-pegue-aki.ics'; cal.removeAttribute('target'); cal.setAttribute('download', 'aula-pegue-aki.ics'); }
  }
})();
