import { createMark } from '../gl/mark.js';
import { createRings } from '../gl/rings.js';
import { createBars } from '../gl/bars.js';
import { clamp, smooth, lerp, ease } from '../gl/core.js';
import { pinProgress, talk, footer, arrow, wireForms } from '../ui.js';

export const vennLabels = (root, view, names) => {
  const els = [...root.querySelectorAll('.venn__label')];
  els.forEach((el, i) => {
    if (i < 3)
      view.labels.push({
        el,
        at: (c, R, w, h) => {
          const dx = c[i].x - w / 2,
            dy = c[i].y - h / 2;
          const l = Math.hypot(dx, dy) || 1;
          return { x: c[i].x + (dx / l) * R * 0.42, y: c[i].y + (dy / l) * R * 0.42 };
        },
      });
    else view.labels.push({ el, at: (c, R, w, h) => ({ x: (c[0].x + c[1].x + c[2].x) / 3, y: (c[0].y + c[1].y + c[2].y) / 3 }) });
  });
  return els;
};

export default {
  path: '/',
  label: 'Início',
  title: 'Domus · Consultoria patrimonial independente',
  html: () => `
<section class="intro dark" data-theme="dark">
  <div class="intro__stage">
    <div class="gl intro__mark"></div>
    <div class="hero__copy over">
      <h1 class="h1 hero__title" data-split data-manual>Construindo o seu futuro, hoje.</h1>
      <p class="lede hero__sub" data-fade data-manual style="--d:.35s">Planejamento patrimonial com propósito, para proteger o que realmente importa.</p>
      <a class="pill" href="/contato" data-fade data-manual style="--d:.5s"><span>Fale com um consultor</span></a>
    </div>
    <h2 class="h2 about__head over" aria-hidden="true">Muito além de gestão</h2>
    <div class="about__text over">
      <p class="body" data-fade data-manual>A Domus é uma consultoria independente especializada em planejamento familiar e gestão de patrimônio. Atuamos com imparcialidade e profundidade técnica, oferecendo soluções personalizadas que integram finanças, sucessão e governança, sempre guiadas pelos valores e objetivos da sua família.</p>
      <a class="pill" href="/quem-somos" data-fade data-manual style="--d:.25s"><span>Saiba mais</span></a>
    </div>
    <div class="venn" style="z-index:5">
      <span class="venn__label">Imparcialidade<br />inegociável</span>
      <span class="venn__label">Transparência<br />absoluta</span>
      <span class="venn__label">Profundidade<br />técnica</span>
      <span class="venn__label venn__core">Interesse<br />da família</span>
    </div>
  </div>
</section>

<section class="sol dark" data-theme="dark">
  <p class="eyebrow" data-fade>Soluções</p>
  <h2 class="h2" data-split>Soluções integradas com foco no seu legado.</h2>
  <div class="tree">
    <svg class="tree__word" viewBox="0 0 178 29" aria-hidden="true" data-fade><use href="#wordmark" /></svg>
    <div class="tree__lines" aria-hidden="true"><i class="tree__trunk"></i><i class="tree__bar"></i><i class="tree__drop"></i><i class="tree__drop"></i><i class="tree__drop"></i></div>
    <div class="tree__cards">
      <a class="card" href="/servicos#gestao" style="--i:0"><span class="card__n">01</span><span class="card__go">${arrow}</span><h3 class="h3">Gestão de Patrimônio</h3><p>Planejamento, documentos, contratos.</p></a>
      <a class="card" href="/servicos#familiares" style="--i:1"><span class="card__n">02</span><span class="card__go">${arrow}</span><h3 class="h3">Serviços Familiares</h3><p>Concierge familiar, eventos, imóveis e veículos.</p></a>
      <a class="card" href="/servicos#financeira" style="--i:2"><span class="card__n">03</span><span class="card__go">${arrow}</span><h3 class="h3">Consultoria Financeira</h3><p>Fluxo de caixa, investimentos on e offshore, sucessão e seguros.</p></a>
    </div>
  </div>
</section>

<section class="story light" data-theme="light">
  <div class="story__stage">
    <div class="gl story__mark"></div>
    <h2 class="h2" data-split>Planejamento que<br />acompanha sua história.</h2>
    <p class="body" data-fade>Por isso, integramos o projeto de vida da família à estrutura patrimonial e à alocação de investimentos, garantindo coerência, proteção e crescimento ao longo do tempo.</p>
    <a class="pill pill--ink" href="/como-atuamos" data-fade style="--d:.3s"><span>Descubra como atuamos</span></a>
    <div class="gl bars"></div>
  </div>
</section>

${talk()}
${footer()}`,

  mount(root, S, app) {
    const intro = root.querySelector('.intro');
    const stage = intro.querySelector('.intro__stage');
    const mark = S.add(createMark(S, stage.querySelector('.intro__mark'), { tone: 'cream' }));
    const vennEl = stage.querySelector('.venn');
    const venn = S.add(createRings(S, vennEl, { mode: 'venn' }));
    const labels = vennLabels(stage, venn);
    const copy = stage.querySelector('.hero__copy');
    const copyEls = copy.querySelectorAll('[data-split], [data-fade]');
    const head = stage.querySelector('.about__head');
    const aboutEls = stage.querySelectorAll('.about__text [data-fade]');

    const story = root.querySelector('.story');
    const small = S.add(createMark(S, story.querySelector('.story__mark'), { tone: 'ink', shadow: true }));
    const bars = S.add(createBars(S, story.querySelector('.bars')));
    const tree = root.querySelector('.tree');
    wireForms(root);

    // the heading starts centred in the gap between the halves and settles into its column
    let flip = { dx: 0, dy: 0 };
    const measure = () => {
      head.style.transform = 'none';
      const r = head.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      flip = { dx: s.width / 2 - (r.left - s.left + r.width / 2), dy: s.height / 2 - (r.top - s.top + r.height / 2) };
    };
    measure();
    window.addEventListener('resize', measure);

    // entrance: the halves arrive from above and below once the veil opens
    let born = -1;
    app.onEnter(() => {
      born = S.time;
      copyEls.forEach((e) => e.classList.add('in'));
    });
    mark.pose.open = 1.6;
    mark.pose.alpha = 0;
    mark.snap();

    return {
      tick() {
        const p = pinProgress(intro);
        const m = S.mobile;
        const enter = born < 0 ? 0 : ease(clamp((S.time - born - 0.1) / 2.2));

        // ── the mark: right of the title, then centre, then it opens and leaves
        const toCentre = smooth(0.05, 0.24, p);
        const open = smooth(0.2, 0.42, p) + smooth(0.38, 0.55, p) * 1.3;
        const W = mark.worldW,
          H = mark.worldH;
        const restX = m ? 0 : W * 0.25,
          restY = m ? H * 0.17 : H * 0.02;
        const restS = m ? Math.min(0.8, W * 0.3) : Math.min(1.05, H * 0.25);
        mark.pose.x = lerp(restX, 0, toCentre);
        mark.pose.y = lerp(restY, 0, toCentre);
        mark.pose.s = lerp(restS, m ? Math.min(0.95, W * 0.36) : Math.min(1.3, H * 0.3), toCentre);
        mark.pose.spin = -0.35 * (1 - toCentre) + Math.sin(S.time * 0.3) * 0.06 + p * 0.4;
        mark.pose.tilt = 0.05;
        mark.pose.open = Math.max((1 - enter) * 1.6, open);
        mark.pose.alpha = born < 0 ? 0 : clamp(enter * 3) * (1 - smooth(0.5, 0.56, p));

        // ── hero copy leaves upward
        const out = smooth(0.06, 0.2, p);
        copy.style.opacity = String(1 - out);
        copy.style.transform = `translateY(${-out * 60}px)`;
        copy.style.pointerEvents = out > 0.5 ? 'none' : '';

        // ── the heading: born in the gap, then moves into its column
        const appear = smooth(0.26, 0.38, p);
        const k = ease(smooth(0.5, 0.64, p));
        const s0 = m ? 1.0 : 1.4;
        head.style.opacity = String(appear);
        head.style.transform = `translate(${flip.dx * (1 - k)}px, ${flip.dy * (1 - k)}px) scale(${lerp(s0 * (0.86 + 0.14 * appear), 1, k)})`;
        head.style.transformOrigin = '50% 50%';
        const showAbout = p > 0.62;
        aboutEls.forEach((e) => e.classList.toggle('in', showAbout));
        stage.querySelector('.about__text').style.pointerEvents = showAbout ? '' : 'none';

        // ── Venn: the three rings draw, come together, and the shared lens fills
        venn.state.draw = smooth(0.6, 0.76, p);
        venn.state.spread = smooth(0.7, 0.86, p);
        venn.state.fill = smooth(0.82, 0.92, p);
        venn.state.spin = (1 - venn.state.spread) * 0.6;
        venn.state.alpha = smooth(0.58, 0.62, p);
        labels.forEach((l, i) => l.classList.toggle('in', i < 3 ? p > 0.8 : p > 0.88));

        // ── tree
        const tr = tree.getBoundingClientRect();
        const tp = clamp((window.innerHeight * 0.85 - tr.top) / (window.innerHeight * 0.5));
        tree.style.setProperty('--a', smooth(0, 0.35, tp).toFixed(3));
        tree.style.setProperty('--b', smooth(0.3, 0.7, tp).toFixed(3));
        tree.style.setProperty('--c', smooth(0.65, 1, tp).toFixed(3));
        tree.querySelectorAll('.card').forEach((c) => tp > 0.8 && c.classList.add('in'));

        // ── story: the graphite stone turns slowly, the horizon rises
        const sp = pinProgress(story);
        small.pose.s = 1.65;
        small.pose.spin = sp * Math.PI * 1.2 + Math.sin(S.time * 0.4) * 0.1;
        small.pose.tilt = 0.12;
        small.pose.open = Math.max(0, Math.sin(sp * Math.PI)) * 0.12;
        bars.state.rise = smooth(0.05, 0.6, sp);
      },
      destroy() {
        window.removeEventListener('resize', measure);
      },
    };
  },
};
