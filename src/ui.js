import { clamp } from './gl/core.js';

export const CONTACT = {
  name: 'Henrique Ramis',
  role: 'Diretor Geral',
  email: 'henrique.ramis@domusgestao.com',
  phone: '(51) 99353-1272',
  wa: '5551993531272',
  instagram: 'https://www.instagram.com/domus.gestao',
  linkedin: 'https://www.linkedin.com/company/domus-gestao/',
  address: ['Av. Ipiranga 7464, sala 809', 'Jardim Botânico, Porto Alegre - RS', 'CEP 90160-090'],
  maps: 'https://www.google.com/maps/search/?api=1&query=Av.+Ipiranga+7464+Porto+Alegre',
};

export const arrow = `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 7h12M8 2l5 5-5 5"/></svg>`;
export const symbol = (cls = '') => `<svg class="${cls}" viewBox="0 0 96 104" aria-hidden="true"><use href="#symbol"/></svg>`;

// progress of a tall section whose stage is sticky: 0 when it pins, 1 when it lets go
export function pinProgress(el) {
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span > 0 ? clamp(-r.top / span) : clamp(1 - r.top / window.innerHeight);
}
// 0 when the element's top enters the bottom of the screen, 1 when its bottom leaves the top
export function passProgress(el) {
  const r = el.getBoundingClientRect();
  return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
}

// headings rise word by word out of their own masks
export function splitWords(root) {
  let i = 0;
  const walk = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const parts = ch.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(' '));
          else {
            const w = document.createElement('span');
            w.className = 'w';
            const s = document.createElement('span');
            s.textContent = p;
            s.style.setProperty('--i', i++);
            w.appendChild(s);
            frag.appendChild(w);
          }
        }
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
    }
  };
  walk(root);
}

// reading text that lights up word by word as you scroll
export function splitRead(root) {
  const words = root.textContent.trim().split(/\s+/);
  root.innerHTML = words.map((w) => `<span class="rw">${w}</span>`).join(' ');
  return [...root.querySelectorAll('.rw')];
}

export function reveals(root) {
  root.querySelectorAll('[data-split]').forEach(splitWords);
  const els = root.querySelectorAll('[data-split], [data-fade], .card, .dif, .items li, .arch, .foot__word, [data-io]');
  // a fully clipped element never counts as intersecting, so arches are watched through a
  // proxy: their parent
  const owner = new Map();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          for (const el of owner.get(e.target) || []) el.classList.add('in');
          io.unobserve(e.target);
        }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
  );
  els.forEach((el) => {
    if (el.hasAttribute('data-manual')) return;
    const t = el.classList.contains('arch') ? el.parentElement : el;
    if (!owner.has(t)) owner.set(t, []);
    owner.get(t).push(el);
    io.observe(t);
  });
  return () => io.disconnect();
}

// gentle parallax inside every arch frame
export function archParallax(root) {
  const imgs = [...root.querySelectorAll('.arch')];
  return () => {
    const vh = window.innerHeight;
    for (const a of imgs) {
      const r = a.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      a.style.setProperty('--py', (-c * 7).toFixed(2));
    }
  };
}

export const talk = (title = 'Vamos construir<br />o seu futuro, hoje?') => `
<section class="talk dark" data-theme="dark">
  <div>
    <p class="eyebrow" data-fade>Contato</p>
    <h2 class="h2" style="margin-top:22px" data-split>${title}</h2>
    <p class="body" data-fade>Entre em contato e descubra como a Domus pode transformar sua relação com o patrimônio.</p>
    ${direct()}
  </div>
  ${form()}
</section>`;

export const direct = () => `
<div class="direct" data-fade>
  <span>Fale direto</span>
  <b>${CONTACT.name}</b>
  <em style="font-style:normal;color:var(--cream-2)">${CONTACT.role}</em>
  <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
  <a href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">${CONTACT.phone}</a>
</div>`;

export const form = () => `
<form class="form" data-form data-fade novalidate>
  <label class="field"><input name="nome" type="text" placeholder=" " autocomplete="name" required /><span>Nome</span><i></i></label>
  <label class="field"><input name="email" type="email" placeholder=" " autocomplete="email" required /><span>Email</span><i></i></label>
  <label class="field"><textarea name="mensagem" placeholder=" " rows="4"></textarea><span>Mensagem</span><i></i></label>
  <div class="form__row">
    <p class="form__note">Sua mensagem chega direto ao WhatsApp da Domus.</p>
    <button class="pill pill--solid" type="submit"><span>Enviar</span>${arrow.replace('<svg', '<svg width="14"')}</button>
  </div>
</form>`;

export function wireForms(root, onSend) {
  root.querySelectorAll('[data-form]').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(f);
      const nome = (d.get('nome') || '').toString().trim();
      const email = (d.get('email') || '').toString().trim();
      const msg = (d.get('mensagem') || '').toString().trim();
      if (!nome) {
        f.querySelector('[name=nome]').focus();
        return;
      }
      const text = `Olá, Domus! Sou ${nome}${email ? ` (${email})` : ''}.${msg ? `\n\n${msg}` : ''}`;
      onSend?.();
      window.open(`https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    });
  });
}

export const footer = () => `
<footer class="foot deep" data-theme="dark">
  <div class="foot__top">
    <div>
      <h4>Endereço</h4>
      <p>${CONTACT.address.join('<br />')}</p>
      <a class="ulink" href="${CONTACT.maps}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px">Ver no mapa</a>
    </div>
    <div>
      <h4>Páginas</h4>
      <nav>
        <a href="/quem-somos">Quem somos</a>
        <a href="/servicos">Serviços</a>
        <a href="/como-atuamos">Como atuamos</a>
        <a href="/contato">Contato</a>
      </nav>
    </div>
    <div>
      <h4>Redes</h4>
      <nav>
        <a href="${CONTACT.instagram}" target="_blank" rel="noopener">Instagram</a>
        <a href="${CONTACT.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">WhatsApp</a>
      </nav>
    </div>
  </div>
  <svg class="foot__word" viewBox="0 0 178 29" aria-hidden="true"><use href="#wordmark" /></svg>
  <div class="foot__line"><span>© 2026 Domus Gestão</span><span>Consultoria patrimonial independente · Porto Alegre</span></div>
</footer>`;
