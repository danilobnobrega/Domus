import { createMark } from '../gl/mark.js';
import { clamp, smooth, ease } from '../gl/core.js';
import { CONTACT, form, footer, wireForms } from '../ui.js';

export default {
  path: '/contato',
  label: 'Contato',
  title: 'Contato · Domus',
  html: () => `
<section class="ct dark" data-theme="dark">
  <div class="over">
    <p class="eyebrow" data-fade>Contato</p>
    <h1 class="h1" data-split>Vamos construir o seu futuro, hoje?</h1>
    <p class="body" data-fade style="--d:.4s">Entre em contato e descubra como a Domus pode transformar sua relação com o patrimônio.</p>
    ${form()}
  </div>
  <div class="ct__mark"><div class="gl" style="inset:0"></div></div>
</section>
<section class="ct__info dark" data-theme="dark">
  <div data-fade>
    <h4>Fale direto</h4>
    <b style="font-weight:900">${CONTACT.name}</b>
    <span style="color:var(--cream-2)">${CONTACT.role}</span>
    <a class="ulink" href="mailto:${CONTACT.email}">${CONTACT.email}</a>
    <a class="ulink" href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">${CONTACT.phone}</a>
  </div>
  <div data-fade style="--d:.25s">
    <h4>Escritório</h4>
    ${CONTACT.address.map((l) => `<span>${l}</span>`).join('')}
    <a class="ulink" href="${CONTACT.maps}" target="_blank" rel="noopener" style="margin-top:8px">Como chegar</a>
  </div>
  <div data-fade style="--d:.4s">
    <h4>Redes</h4>
    <a class="ulink" href="${CONTACT.instagram}" target="_blank" rel="noopener">Instagram</a>
    <a class="ulink" href="${CONTACT.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
  </div>
</section>
${footer()}`,

  mount(root, S, app) {
    const mark = S.add(createMark(S, root.querySelector('.ct__mark .gl'), { tone: 'cream' }));
    let born = -1;
    let sent = -1;
    app.onEnter(() => (born = S.time));
    // sending closes the gap: the two halves meet for a moment
    wireForms(root, () => (sent = S.time));
    mark.pose.open = 1.4;
    mark.pose.alpha = 0;
    mark.snap();

    return {
      tick() {
        const enter = born < 0 ? 0 : ease(clamp((S.time - born) / 2.2));
        const W = mark.worldW,
          H = mark.worldH;
        mark.pose.s = Math.min(H * 0.28, W * 0.36);
        mark.pose.alpha = born < 0 ? 0 : clamp(enter * 3);
        const since = sent < 0 ? 99 : S.time - sent;
        const meet = smooth(0, 0.5, since) * (1 - smooth(2.2, 3.2, since));
        mark.pose.close = meet;
        mark.pose.open = (1 - enter) * 1.4;
        mark.pose.spin = -0.45 + Math.sin(S.time * 0.25) * 0.12 + meet * Math.PI * 2;
        mark.pose.tilt = 0.06;
      },
      destroy() {},
    };
  },
};
