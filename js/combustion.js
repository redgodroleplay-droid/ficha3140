function combustionRules({temperature, initial, oxygen, fuel, fires, heat, nearbyHeat, distance, entropy, level, proficiency, efficiencyIndex}) {
  const T = temperature + heat;
  const delta = Math.abs(T - initial) * 2;
  const dissipation = 1 + Math.floor(distance / 6);
  const numerator = T * oxygen * fuel + fires + delta;
  const denominator = dissipation + entropy;
  const raw = Math.floor(numerator / denominator);
  const chain = Math.floor(Math.sqrt(heat * nearbyHeat));
  const saturation = heat ** 2;
  const penalty = Math.floor(saturation / 4);
  const adjusted = Math.max(0, raw + chain - penalty);
  const final = Math.min(8, adjusted);
  const excess = final === 8 ? Math.min(proficiency, adjusted - 8) : 0;
  const efficiency = (efficiencyIndex === 'raw' ? raw : final) / (T + fires + 1);
  const dieSize = final >= 6 ? 8 : final >= 4 ? 6 : final >= 2 ? 4 : 0;
  const base = 1 + Number(level >= 5) + Number(level >= 11) + Number(level >= 17);
  const ignition = T >= 5 && oxygen >= 1.5 && fuel >= 1.5 && delta >= 4 && final >= 8;
  const secondary = ignition ? Math.min(proficiency + 2, Math.ceil((T * fuel + excess) / (entropy + 1))) : 0;
  return { T, delta, dissipation, numerator, denominator, raw, chain, saturation, penalty, adjusted, final, excess, efficiency, dieSize, base, ignition, secondary };
}

function createCombustionCalculator() {
  const panel = el('details', undefined, 'combustion');
  panel.open = true;
  panel.append(el('summary', '🔥 Calculadora de Combustão'));
  panel.append(el('p', 'Use após confirmar o acerto do ataque mágico. Informe as condições do alvo antes do impacto.'));
  const form = el('form', undefined, 'combustion-form');
  const fields = {};
  function field(key, label, value, options) {
    const wrapper = el('label', label);
    const input = el(options ? 'select' : 'input');
    if (options) {
      for (const [optionValue, name] of options) {
        const option = el('option', name);
        option.value = optionValue;
        input.append(option);
      }
    } else {
      input.type = 'number';
      input.required = true;
    }
    input.value = value;
    fields[key] = input;
    wrapper.append(input);
    form.append(wrapper);
    return input;
  }
  function number(key, label, value, min, max, step = 1) {
    const input = field(key, label, value);
    input.min = min;
    input.max = max;
    input.step = step;
    return input;
  }
  field('temperature','Temperatura base',3,[[1,'1 · Frio intenso'],[2,'2 · Frio'],[3,'3 · Comum'],[4,'4 · Quente'],[5,'5 · Muito quente']]);
  number('initial','T no começo da rodada',3,1,8);
  field('oxygen','Oxigenação',1.25,[[0,'0 · Sem oxigênio'],[.5,'0,5 · Quase sem ar'],[1,'1 · Fechado'],[1.25,'1,25 · Normal'],[1.5,'1,5 · Área aberta'],[2,'2 · Corrente forte']]);
  field('fuel','Combustível',1,[[1,'1 · Nenhum relevante'],[1.25,'1,25 · Pouco'],[1.5,'1,5 · Inflamável'],[1.75,'1,75 · Muito'],[2,'2 · Altamente inflamável']]);
  number('fires','Fontes de fogo até 6 m',0,0,3);
  number('heat','Calor Residual do alvo',0,0,3);
  number('nearbyHeat','Calor de outra criatura até 3 m',0,0,3);
  number('distance','Distância até o alvo (m)',5,0,18,'any');
  number('entropy','Entropia (d4)',2,1,4);
  field('efficiencyIndex','Índice para eficiência','final',[['final','IC final · padrão do exemplo'],['raw','IC bruto · equação principal']]);
  field('conversion','Converter excedente em','none',[['none','Escolher depois'],['pressure','Pressão'],['heat','Persistência'],['transfer','Transferência']]);
  const buttonRow = el('div', undefined, 'skill-editor-tools combustion-actions');
  const entropyButton = el('button', 'Rolar entropia');
  entropyButton.type = 'button';
  const calculate = el('button', 'Calcular');
  calculate.type = 'submit';
  const rollDamage = el('button', 'Rolar dano');
  rollDamage.type = 'button';
  buttonRow.append(entropyButton, calculate, rollDamage);
  form.append(buttonRow);
  panel.append(form);
  const result = el('div', undefined, 'combustion-result');
  result.setAttribute('aria-live', 'polite');
  panel.append(result);
  const fmt = value => value.toLocaleString('pt-BR', {maximumFractionDigits: 4});
  const interpretations = el('details');
  interpretations.append(el('summary', 'Ordem de cálculo usada'), el('p', 'IC bruto é o resultado da equação principal. A Reação em Cadeia entra antes da Saturação. O limite 8 vale para o dano. Para o excedente, uso o valor após reação e saturação, antes do limite. A eficiência pode usar o IC final ou o bruto, conforme a decisão do mestre.'));
  panel.append(interpretations);
  function resolve(rolling = false) {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value]));
    const proficiency = Math.max(0, Math.floor(Number(state.prof) || 0));
    const r = combustionRules({...Object.fromEntries(Object.entries(values).map(([name,value]) => [name, Number(value)])), efficiencyIndex:values.efficiencyIndex, level:state.level, proficiency});
    const extra = r.dieSize ? ' + 1d' + r.dieSize : '';
    const pressure = values.conversion === 'pressure' ? Math.floor(r.excess / 2) : 0;
    const expression = r.base + 'd6' + extra + (pressure ? ' + ' + pressure : '');
    const efficiency = r.efficiency;
    const effect = efficiency < .5 ? 'Ineficiente · sem efeito adicional.'
      : efficiency < 1 ? 'Estável · +1 Calor Residual, sujeito ao limite de 3.'
      : efficiency < 1.5 ? 'Eficiente · pode mover a chama 1,5 m e incendiar um objeto inflamável desprotegido.'
      : 'Eficiência máxima · o dado adicional de IC tem mínimo igual à metade de seu máximo.';
    const summary = [
      ['Dano de fogo', expression],
      ['Equação principal', '⌊' + fmt(r.numerator) + ' ÷ ' + r.denominator + '⌋ = ' + r.raw + ' · T ' + r.T + ', ΔT ' + r.delta + ', D ' + r.dissipation + ', E ' + values.entropy],
      ['Reação e saturação', '+' + r.chain + ' IC por reação · ST ' + r.saturation + ' · −' + r.penalty + ' IC por saturação'],
      ['IC final', r.final + ' · ' + r.adjusted + ' antes do limite'],
      ['Eficiência η', fmt(efficiency) + ' · ' + effect],
      ['Ignição', r.ignition ? r.secondary + ' de fogo no começo do próximo turno, sem nova combustão secundária.' : 'Ponto de Ignição não atingido.']
    ];
    if (r.final === 8) {
      const options = 'Pressão +' + Math.floor(r.excess / 2) + ' dano · Persistência +' + Math.floor(r.excess / 2) + ' Calor (máximo 3) · Transferência ' + r.excess + ' de fogo até ' + fmt(1.5 * r.excess) + ' m, sem gerar Calor.';
      summary.push(['Combustão Perfeita · ET ' + r.excess, options]);
      if (values.conversion === 'heat') summary.push(['Persistência escolhida', '+' + Math.floor(r.excess / 2) + ' Calor Residual, limitado a 3 no alvo.']);
      if (values.conversion === 'transfer') summary.push(['Transferência escolhida', r.excess + ' de fogo em outra criatura a até ' + fmt(1.5 * r.excess) + ' m.']);
    }
    if (rolling) {
      const rolls = Array.from({length:r.base}, () => die(6));
      const extraRoll = r.dieSize ? die(r.dieSize) : 0;
      const extraApplied = efficiency >= 1.5 ? Math.max(extraRoll, r.dieSize / 2) : extraRoll;
      const total = rolls.reduce((sum, roll) => sum + roll, 0) + extraApplied + pressure;
      summary.unshift(['Total rolado', total + ' de fogo · base ' + rolls.join(' + ') + (extraRoll ? ' · adicional ' + extraRoll + (extraApplied !== extraRoll ? ' → ' + extraApplied : '') : '') + (pressure ? ' · pressão +' + pressure : '')]);
    }
    const list = el('dl');
    for (const [label, value] of summary) list.append(el('dt', label), el('dd', value));
    result.replaceChildren(list);
  }
  form.onsubmit = event => { event.preventDefault(); resolve(); };
  rollDamage.onclick = () => resolve(true);
  entropyButton.onclick = () => { fields.entropy.value = die(4); resolve(); };
  form.oninput = () => result.replaceChildren();
  return panel;
}
