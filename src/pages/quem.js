import { createMark } from '../gl/mark.js';
import { createRings } from '../gl/rings.js';
import { smooth, clamp } from '../gl/core.js';
import { pinProgress, splitRead, talk, footer, archParallax, wireForms } from '../ui.js';
import { vennLabels } from './home.js';

export default {
  path: '/quem-somos',
  label: 'Quem somos',
  title: 'Quem somos · Domus',
  html: () => `
<section class="read light" data-theme="light">
  <div class="read__stage">
    <p class="eyebrow" data-fade>Quem somos</p>
    <p class="read__text">Somos uma consultoria independente especializada em planejamento familiar, gestão patrimonial e financeira. Atendemos famílias que valorizam confiança, excelência técnica e vínculos duradouros.</p>
  </div>
</section>

<section class="purpose light" data-theme="light">
  <div class="purpose__stage">
    <div class="gl purpose__mark"></div>
    <div>
      <p class="eyebrow" data-fade>Propósito</p>
      <h2 class="h2" style="margin-top:22px" data-split>Nosso propósito é oferecer mais do que gestão</h2>
      <p class="body" data-fade>Ajudamos famílias a construir e perpetuar seus legados com serenidade e visão. Por meio de soluções financeiras, direito familiar, governança estruturada e uma abordagem integrada, promovemos segurança e bem-estar, alinhando os objetivos de hoje à prosperidade de amanhã.</p>
    </div>
  </div>
</section>

<section class="origin light" data-theme="light">
  <div class="origin__stage">
    <div class="origin__text">
      <h2 class="h2" data-split>Nascemos para romper com o modelo tradicional de assessoria financeira no Brasil</h2>
      <p class="body" data-fade>Somos uma alternativa fundamentada em transparência absoluta, imparcialidade inegociável e profundidade técnica, sempre colocando o interesse familiar em primeiro lugar.</p>
    </div>
    <div class="venn" style="z-index:5">
      <span class="venn__label">Imparcialidade<br />inegociável</span>
      <span class="venn__label">Transparência<br />absoluta</span>
      <span class="venn__label">Profundidade<br />técnica</span>
      <span class="venn__label venn__core">Interesse<br />da família</span>
    </div>
  </div>
</section>

<section class="founders dark" data-theme="dark">
  <div class="founders__head">
    <div>
      <p class="eyebrow" data-fade>Sócios</p>
      <h2 class="h2" style="margin-top:22px" data-split>Quem está à frente da Domus</h2>
    </div>
  </div>
  <div class="people">
    <article class="person">
      <figure class="arch"><img src="/img/thiago.png" alt="Thiago Lehr Companhoni" style="object-position:50% 8%;width:124%;max-width:none;margin-left:-12%" /></figure>
      <h3 class="h3" data-fade>Thiago Lehr Companhoni</h3>
      <p data-fade>Cofundador · CFP®, CGA</p>
    </article>
    <article class="person">
      <figure class="arch"><img src="/img/henrique.png" alt="Henrique Ramis" style="object-position:50% 0%" /></figure>
      <h3 class="h3" data-fade>Henrique Ramis</h3>
      <p data-fade>Sócio fundador · Diretor Geral</p>
    </article>
  </div>
</section>

<section class="office dark" data-theme="dark">
  <p class="eyebrow" data-fade>Escritório</p>
  <div class="office__row">
    <figure class="arch"><img src="/img/office-meet.jpg" alt="" /></figure>
    <figure class="arch"><img src="/img/wood.jpg" alt="" /></figure>
    <figure class="arch"><img src="/img/office-glass.jpg" alt="" /></figure>
  </div>
  <div class="office__cap" data-fade><span>Av. Ipiranga 7464, sala 809</span><span>Jardim Botânico · Porto Alegre</span></div>
</section>

<section class="mvv deep" data-theme="dark">
  <div class="mvv__grid">
    <div data-fade><h3>MISSÃO</h3><p>Garantir a segurança e a longevidade financeira dos nossos clientes com uma gestão estratégica e duradoura.</p></div>
    <div data-fade style="--d:.25s"><h3>VISÃO</h3><p>Ser referência em consultoria financeira familiar no Brasil, ajudando famílias a fortalecer seus legados.</p></div>
    <div data-fade style="--d:.4s"><h3>VALORES</h3><ul><li>Confiança</li><li>Excelência</li><li>Sustentabilidade</li><li>Colaboração</li><li>Legado</li></ul></div>
  </div>
  <p class="closing" data-split>Proteger patrimônio é proteger o que tem valor</p>
</section>

${talk()}
${footer()}`,

  mount(root, S) {
    const read = root.querySelector('.read');
    const words = splitRead(read.querySelector('.read__text'));
    const purpose = root.querySelector('.purpose');
    const mark = S.add(createMark(S, purpose.querySelector('.purpose__mark'), { tone: 'ink', shadow: true }));
    const origin = root.querySelector('.origin');
    const venn = S.add(createRings(S, origin.querySelector('.venn'), { mode: 'venn', ink: '#2a2828' }));
    const labels = vennLabels(origin, venn);
    const para = archParallax(root);
    wireForms(root);

    return {
      tick() {
        const rp = pinProgress(read);
        const lit = Math.round(smooth(0.05, 0.85, rp) * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < lit));

        const pp = pinProgress(purpose);
        const W = mark.worldW,
          H = mark.worldH;
        mark.pose.s = Math.min(H * 0.23, W * 0.3);
        mark.pose.y = H * 0.04;
        mark.pose.spin = -0.5 + pp * Math.PI * 1.1 + Math.sin(S.time * 0.35) * 0.05;
        mark.pose.tilt = 0.1 + Math.sin(pp * Math.PI) * 0.15;
        mark.pose.open = Math.sin(clamp(pp * 1.4 - 0.2) * Math.PI) * 0.22;

        const op = pinProgress(origin);
        venn.state.draw = smooth(0.08, 0.36, op);
        venn.state.spread = smooth(0.25, 0.55, op);
        venn.state.fill = smooth(0.5, 0.65, op);
        venn.state.spin = (1 - venn.state.spread) * -0.5;
        labels.forEach((l, i) => l.classList.toggle('in', i < 3 ? op > 0.45 : op > 0.6));
        para();
      },
      destroy() {},
    };
  },
};
