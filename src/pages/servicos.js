import { createRings } from '../gl/rings.js';
import { smooth } from '../gl/core.js';
import { pinProgress, talk, footer, archParallax, wireForms } from '../ui.js';

const chapter = (id, n, title, text, img, items, tone) => `
<section class="chap ${tone}" id="${id}" data-theme="${tone === 'light' ? 'light' : 'dark'}">
  <div class="chap__side">
    <p class="chap__n" data-fade>${n}</p>
    <h2 class="h2" data-split>${title}</h2>
    <p class="body" data-fade>${text}</p>
    <figure class="arch"><img src="/img/${img}" alt="" /></figure>
  </div>
  <ol class="items">${items.map((t) => `<li>${t}</li>`).join('')}</ol>
</section>`;

export default {
  path: '/servicos',
  label: 'Serviços',
  title: 'Serviços · Domus',
  html: () => `
<section class="svi dark" data-theme="dark">
  <div class="svi__stage">
    <div class="svi__text over">
      <p class="eyebrow" data-fade>Serviços</p>
      <h1 class="h2" data-split>Na Domus, acreditamos que cada decisão patrimonial deve partir de um propósito.</h1>
      <p class="body" data-fade style="--d:.4s">Por isso, integramos o projeto de vida da família à estrutura patrimonial e à alocação de investimentos, garantindo coerência, proteção e crescimento ao longo do tempo.</p>
    </div>
    <div class="venn" style="z-index:5">
      <span class="venn__label">Projeto<br />de vida</span>
      <span class="venn__label">Estrutura<br />patrimonial</span>
      <span class="venn__label">Alocação de<br />investimentos</span>
    </div>
  </div>
</section>

${chapter(
  'gestao',
  '01',
  'Gestão<br />de Patrimônio',
  'Planejamento patrimonial, administração de bens e documentos, apoio em contratos e transações. Oferecemos uma gestão estratégica e personalizada para garantir estabilidade, proteger conquistas e planejar o futuro.',
  'signing.jpg',
  ['Planejamento patrimonial', 'Gestão de documentos', 'Aconselhamentos em transações e contratos'],
  'dark',
)}
${chapter(
  'familiares',
  '02',
  'Serviços<br />Familiares',
  'Organização de viagens, compromissos, eventos, serviços de confiança e consultorias voltadas a imóveis e veículos. Um suporte exclusivo que promove eficiência, privacidade e leveza no dia a dia da sua família.',
  'house.jpg',
  ['Planejamento de viagens e eventos', 'Agendamento de compromissos', 'Análise de novos negócios', 'Indicação e encaminhamento de prestadores de serviço', 'Consultoria imobiliária e automotiva'],
  'light',
)}
${chapter(
  'financeira',
  '03',
  'Consultoria<br />Financeira',
  'Diagnóstico financeiro, fluxo de caixa, previdência, investimentos no Brasil e no exterior, seguros e planejamento sucessório. Um olhar humano e técnico que estrutura a base para decisões claras e crescimento sustentável.',
  'office-desk.jpg',
  ['Diagnóstico e projeções', 'Câmbio', 'Renda fixa e renda variável', 'Fluxo de caixa e balanço patrimonial familiar', 'Consultoria em seguros', 'Previdência privada', 'Investimentos offshore', 'Planejamento sucessório'],
  'dark',
)}

${talk()}
${footer()}`,

  mount(root, S, app) {
    let born = -1;
    app.onEnter(() => (born = S.time));
    const intro = root.querySelector('.svi');
    const tri = S.add(createRings(S, intro.querySelector('.venn'), { mode: 'triad', gradient: true }));
    const labels = [...intro.querySelectorAll('.venn__label')];
    labels.forEach((el, i) => tri.labels.push({ el, at: (c) => c[i] }));
    const para = archParallax(root);
    wireForms(root);

    return {
      tick() {
        const p = pinProgress(intro);
        tri.state.draw = born < 0 ? 0 : smooth(0.2, 2.2, S.time - born);
        // scrolling turns the triad a full third: each idea passes through the top
        tri.state.spin = -smooth(0.1, 0.9, p) * ((Math.PI * 2) / 3) + Math.sin(S.time * 0.2) * 0.03;
        labels.forEach((l) => l.classList.toggle('in', born >= 0 && S.time - born > 1.2));
        tri.state.link = born < 0 ? 0 : smooth(1.6, 3.4, S.time - born);
        para();
      },
      destroy() {},
    };
  },
};
