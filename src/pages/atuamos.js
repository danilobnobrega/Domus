import { createMark } from '../gl/mark.js';
import { clamp, smooth } from '../gl/core.js';
import { talk, footer, archParallax, wireForms } from '../ui.js';

const STEPS = [
  ['Anamnese patrimonial', 'Levantamos dados completos sobre finanças, bens tangíveis e intangíveis.'],
  ['Definição de objetivos', 'Identificamos prioridades de curto e longo prazo, conectando os objetivos financeiros aos valores e sonhos da família.'],
  ['Planejamento e estratégia', 'Criação de um orçamento detalhado para entender qual estratégia será necessária, integrando gestão financeira, governança e sucessão para segurança e crescimento sustentável.'],
  ['Análise e implementação do plano', 'Avaliamos todas as soluções pertinentes sob a ótica de custo, atratividade e benefícios esperados, para então executarmos o plano com eficiência e clareza.'],
  ['Acompanhamento e ajustes', 'Revisamos resultados, adaptamos às mudanças no cenário legislativo e econômico e garantimos que o patrimônio e o legado evoluam com as necessidades da família.'],
];

const DIFS = [
  ['Imparcialidade', 'Como Consultores de investimentos CVM, somos obrigados por lei a representar exclusivamente o cliente com independência e transparência, sem receber comissões por venda de produtos financeiros.'],
  ['Personalização', 'Cada plano é único e adaptado à realidade da família.'],
  ['Proximidade e Exclusividade', 'Limitamos o número de clientes para garantir atendimento dedicado.'],
  ['Concierge', 'Resolvemos tudo em um só lugar.'],
  ['Eficiência', 'Negociamos com todas as instituições para acessar os melhores produtos, minimizar custos de transação, maximizando o retorno da sua carteira.'],
  ['Visão Integrada', 'Unimos finanças, governança e sucessão em uma estratégia coesa.'],
];

const CONC = [
  ['Gestão de Tempos', 'Agendamento de compromissos, organização da agenda e lembretes importantes.'],
  ['Assistência em viagens', 'Reservas de passagens, hotéis, roteiros personalizados e experiências exclusivas.'],
  ['Compras e encomendas', 'Busca por produtos específicos, organização de listas de compras e entregas.'],
  ['Reservas e eventos', 'Agendamento de restaurantes, ingressos para eventos e experiências VIP.'],
  ['Serviços domésticos', 'Indicação e contratação de diaristas, motoristas, babás e manutenção residencial.'],
];

const WORD = 'Concierge';

export default {
  path: '/como-atuamos',
  label: 'Como atuamos',
  title: 'Como atuamos · Domus',
  html: () => `
<section class="cah dark" data-theme="dark">
  <p class="eyebrow" data-fade>Como atuamos</p>
  <h1 class="h1" data-split>Modelo de atuação</h1>
</section>

<section class="steps dark" data-theme="dark">
  <div class="steps__track"><div class="steps__fill"></div></div>
  <div class="steps__mark"><div class="gl"></div></div>
  <div class="steps__list">
    ${STEPS.map(
      ([t, d], i) => `
    <article class="step">
      <p class="step__n">ETAPA ${String(i + 1).padStart(2, '0')}</p>
      <h2 class="h2">${t}</h2>
      <p class="body">${d}</p>
    </article>`,
    ).join('')}
  </div>
</section>

<section class="difs light" data-theme="light">
  <p class="eyebrow" data-fade>Diferenciais</p>
  <h2 class="h2" style="margin-top:22px" data-split>Nossos diferenciais</h2>
  <div class="difs__grid">
    ${DIFS.map(([t, d], i) => `<article class="dif" style="--i:${i}"><span class="card__n">${String(i + 1).padStart(2, '0')}</span><h3 class="h3">${t}</h3><p>${d}</p></article>`).join('')}
  </div>
</section>

<section class="conc dark" data-theme="dark">
  <h2 class="conc__word" aria-label="${WORD}">${[...WORD].map((c, i) => `<span style="--o:${(i - (WORD.length - 1) / 2) * 2.6}">${c}</span>`).join('')}</h2>
  <div class="conc__body">
    <div class="conc__media">
      <figure class="arch"><img src="/img/dinner.jpg" alt="" /></figure>
      <figure class="arch"><img src="/img/plane.jpg" alt="" /></figure>
    </div>
    <div>
      <p class="lede" data-fade>Facilitamos sua vida, ajudando com tarefas do dia a dia, reservas e experiências exclusivas, otimizando seu tempo, oferecendo conveniência, comodidade e soluções sob medida.</p>
      <div class="conc__list">
        ${CONC.map(([t, d], i) => `<div data-fade style="--d:${0.1 + i * 0.08}s"><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
    </div>
  </div>
</section>

${talk()}
${footer()}`,

  mount(root, S) {
    const steps = root.querySelector('.steps');
    const track = steps.querySelector('.steps__track');
    const items = [...steps.querySelectorAll('.step')];
    const mark = S.add(createMark(S, steps.querySelector('.steps__mark .gl'), { tone: 'cream' }));
    const conc = root.querySelector('.conc');
    const word = conc.querySelector('.conc__word');
    const para = archParallax(root);
    wireForms(root);

    return {
      tick() {
        const vh = window.innerHeight;
        const tr = track.getBoundingClientRect();
        const p = clamp((vh / 2 - tr.top) / tr.height);
        track.style.setProperty('--p', p.toFixed(4));

        // the stone travels the line with the reader; it opens a little at every stage
        let pulse = 0;
        for (const it of items) {
          const r = it.getBoundingClientRect();
          const c = r.top + Math.min(r.height * 0.3, 160);
          it.classList.toggle('on', c < vh * 0.62);
          const d = (c - vh / 2) / (vh * 0.12);
          pulse += Math.exp(-d * d);
        }
        mark.pose.s = 1.45;
        mark.pose.spin = p * Math.PI * 4;
        mark.pose.tilt = 0.15;
        mark.pose.open = Math.min(1, pulse) * 0.32;
        mark.pose.alpha = smooth(0, 0.02, p) * (1 - smooth(0.985, 1, p));

        // the word gathers its letters as it arrives
        const wr = word.getBoundingClientRect();
        const wp = clamp((vh - wr.top) / (vh * 0.9));
        word.style.setProperty('--s', (1 - smooth(0, 1, wp)).toFixed(4));
        para();
      },
      destroy() {},
    };
  },
};
