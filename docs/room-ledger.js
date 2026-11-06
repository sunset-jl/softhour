import { cloud, showPrivateGate } from './cloud.js';

// Goal revisions and contributions use the same private channel as the old
// ledger. Keeping the prefix also keeps them out of the announcement board.
export const ledgerPrefix = '[SOFTHOURS-LEDGER-1]';
const slots = ['J', 'K'];
const maxCents = 99_999_900;
const money = new Intl.NumberFormat('zh-CN', {style:'currency', currency:'CNY'});
const formatMoney = cents => money.format(cents / 100);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validAmount = cents => Number.isSafeInteger(cents) && cents > 0 && cents <= maxCents;
const amountField = '<input name="amount" inputmode="decimal" maxlength="24" required>';
const rowFields = 'id,body,author,author_slot,created';

function parseAmount(value){
  const amount = value.normalize('NFKC').trim().replace(/^¥\s*|\s*元$/g, '');
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)?(?:\.\d{1,2})?$/.test(amount)) return NaN;
  return Math.round(Number(amount.replace(/[, ]/g, '')) * 100);
}

let stopRefreshing;
export function unmountLedger(){
  stopRefreshing?.();
  stopRefreshing = undefined;
}

function readLedger(rows){
  let goal = null;
  const entries = [];
  const history = [];
  for(const row of rows){
    let data;
    try { data = JSON.parse(row.body.slice(ledgerPrefix.length)); }
    catch { continue; }
    if(!data || typeof data.item !== 'string' || !validAmount(data.cents)) continue;
    const item = {...row, item:data.item, cents:data.cents};
    if(data.type === 'goal') goal ??= item;
    else if(data.type === 'contribution') entries.push(item);
    else if(!data.type) history.push(item);
  }
  const saved = entries.reduce((sum, row) => sum + row.cents, 0);
  return {goal, entries, history, saved};
}

export async function mountLedger(host){
  const member = await showPrivateGate(host, () => mountLedger(host));
  if(!member || !host.isConnected) return;

  host.className = 'room-ledger';
  host.innerHTML = `
    <section class="ledger-goal" aria-label="共同目标">
      <h3 data-goal-name>共同目标</h3>
      <div class="ledger-meter" role="progressbar" aria-label="共同目标进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><i></i></div>
      <p data-goal-summary>正在打开小账本…</p>
      <details class="ledger-goal-settings" hidden>
        <summary>设定目标</summary>
        <form class="ledger-form" data-goal-form novalidate>
          <label>目标名称<input name="item" maxlength="60" required placeholder="例如：一起去看海"></label>
          <label>目标金额（元）${amountField}</label>
          <button type="submit">保存目标</button>
          <p class="ledger-form-status" role="status"></p>
        </form>
      </details>
    </section>
    <form class="ledger-form" data-contribution-form novalidate hidden>
      <label>备注（选填）<input name="item" maxlength="60" placeholder="例如：今天又靠近一点"></label>
      <label>这次存入（元）${amountField}</label>
      <button type="submit">记一笔</button>
      <p class="ledger-form-status" role="status"></p>
    </form>
    <div class="ledger-columns" hidden>${slots.map(slot => `<section aria-label="${slot} 的存入记录"><h3>${slot} <small data-total="${slot}"></small></h3><ul data-entries="${slot}"></ul></section>`).join('')}</div>
    <details class="ledger-history" hidden><summary>以前的账目</summary><ul></ul></details>
    <p class="ledger-status" role="status"></p>
    <div class="ledger-actions"><button class="ledger-retry" type="button" hidden>重新读取</button><button class="ledger-put-away" type="button">把本子收回抽屉</button></div>`;

  const goalSettings = host.querySelector('.ledger-goal-settings');
  const goalForm = host.querySelector('[data-goal-form]');
  const contributionForm = host.querySelector('[data-contribution-form]');
  const historyBox = host.querySelector('.ledger-history');
  const status = host.querySelector('.ledger-status');
  const retry = host.querySelector('.ledger-retry');
  const notes = cloud.from('soft_hours_notes');
  let active = true;
  let revision = 0;
  let snapshot = '';
  let displayedRows = [];
  let goal = null;
  let busy = false;
  const pending = new Map();

  function applyRows(rows){
    const next = JSON.stringify(rows);
    if(next === snapshot) return;
    render(rows);
    displayedRows = rows;
    snapshot = next;
  }

  function renderRows(rows, old = false){
    return rows.map(row => `<li><span>${old ? escape(row.author_slot) + ' · ' : ''}${escape(row.item)}
      <small>${escape(new Date(row.created).toLocaleDateString('zh-CN'))}</small></span>
      <strong>${formatMoney(row.cents)}</strong>
      ${row.author === member.user.id ? `<button type="button" data-erase="${escape(row.id)}" aria-label="删除这笔记录">删除</button>` : ''}</li>`
    ).join('') || '<li class="small-note">还没有存入记录。</li>';
  }

  function render(data){
    const firstLoad = goalSettings.hidden;
    const state = readLedger(data);
    goal = state.goal;
    const meter = host.querySelector('.ledger-meter');
    const percent = goal ? Math.min(100, state.saved / goal.cents * 100) : 0;
    const remaining = goal ? Math.max(0, goal.cents - state.saved) : 0;
    meter.hidden = !goal;
    meter.setAttribute('aria-valuenow', percent.toFixed(2));
    meter.firstElementChild.style.width = `${percent}%`;
    host.querySelector('[data-goal-name]').textContent = goal?.item || '一起存一个愿望';
    host.querySelector('[data-goal-summary]').textContent = goal
      ? `已存 ${formatMoney(state.saved)} / ${formatMoney(goal.cents)} · ${remaining ? '还差 ' + formatMoney(remaining) : '目标达成啦！'}`
      : '先定一个想一起完成的目标。';
    goalSettings.querySelector('summary').textContent = goal ? '调整目标' : '设定目标';
    goalSettings.hidden = false;
    if(firstLoad && !goal) goalSettings.open = true;
    contributionForm.hidden = !goal;
    host.querySelector('.ledger-columns').hidden = !goal;
    for(const slot of slots){
      const entries = state.entries.filter(row => row.author_slot === slot);
      host.querySelector(`[data-total="${slot}"]`).textContent = formatMoney(entries.reduce((sum, row) => sum + row.cents, 0));
      host.querySelector(`[data-entries="${slot}"]`).innerHTML = renderRows(entries);
    }
    historyBox.hidden = !state.history.length;
    historyBox.querySelector('ul').innerHTML = renderRows(state.history, true);
  }

  async function refresh(){
    const request = ++revision;
    try {
      const rows = [];
      const pageSize = 500;
      for(let start = 0; ; start += pageSize){
        const {data, error} = await notes.select(rowFields).eq('deleted',false)
          .like('body',ledgerPrefix+'%').order('created',{ascending:false}).order('id',{ascending:false})
          .range(start,start+pageSize-1).abortSignal(AbortSignal.timeout(12000));
        if(!active || request !== revision) return;
        if(error) throw error;
        rows.push(...data);
        if(data.length < pageSize) break;
      }
      applyRows(rows);
      if(!retry.hidden)status.textContent = '';
      retry.hidden = true;
    } catch {
      if(!active || request !== revision) return;
      status.textContent = '小账本暂时读不到，稍后可以重新读取。';
      retry.hidden = false;
    }
  }

  async function save(button, operation, success){
    if(busy) return;
    busy = true;
    button.disabled = true;
    status.textContent = '正在保存…';
    try {
      const {error} = await operation();
      if(error) throw error;
      if(!active) return;
      await refresh();
      if(active && retry.hidden) status.textContent = success;
    } catch {
      if(active) status.textContent = '这次没有保存成功，请再试一次。';
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  async function write(form, type){
    if(busy) return;
    const {item: nameInput, amount: amountInput} = form.elements;
    const feedback = form.querySelector('.ledger-form-status');
    const item = nameInput.value.trim() || (type === 'contribution' ? '存了一笔' : '');
    const cents = parseAmount(amountInput.value);
    if(!item || !validAmount(cents)){
      feedback.textContent = item ? '请输入 0.01 到 999,999 元，最多两位小数。' : '先写一个目标名称。';
      (item ? amountInput : nameInput).focus();
      return;
    }

    const button = form.querySelector('button');
    const label = button.textContent;
    const body = ledgerPrefix+JSON.stringify({type,item,cents});
    const previous = pending.get(type);
    const id = previous?.body === body ? previous.id : crypto.randomUUID();
    pending.set(type, {id,body});
    busy = true;
    button.disabled = true;
    button.textContent = '正在保存…';
    nameInput.readOnly = amountInput.readOnly = true;
    feedback.textContent = '';
    status.textContent = '';
    try {
      let {data, error} = await notes.insert({id,body,author:member.user.id,author_slot:member.slot,deleted:false})
        .select(rowFields).abortSignal(AbortSignal.timeout(12000)).single();
      if(error?.code === '23505'){
        ({data,error} = await notes.select(rowFields).eq('id',id).eq('author',member.user.id).eq('body',body)
          .eq('deleted',false).abortSignal(AbortSignal.timeout(12000)).single());
      }
      if(error || !data) throw error || Error('Missing saved row');
      if(!active) return;
      // Show the confirmed write immediately and invalidate older reads.
      revision++;
      applyRows([data,...displayedRows.filter(row => row.id !== id)]);
      pending.delete(type);
      form.reset();
      if(type === 'goal') goalSettings.open = false;
      retry.hidden = true;
      status.textContent = type === 'goal' ? '共同目标已保存。' : '又向目标靠近了一点。';
    } catch(error) {
      if(!active) return;
      feedback.textContent = ['42501','PGRST301','PGRST303'].includes(error.code)
        ? '当前登录状态无法保存，请重新登录 J/K 后再试。'
        : '暂时无法确认保存，请检查网络后再点一次。';
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = label;
      nameInput.readOnly = amountInput.readOnly = false;
    }
  }

  goalSettings.querySelector('summary').onclick = () => {
    if(goalSettings.open) return;
    goalForm.elements.item.value = goal?.item || '';
    goalForm.elements.amount.value = goal ? (goal.cents / 100).toFixed(2) : '';
  };
  goalForm.onsubmit = event => {event.preventDefault();write(goalForm,'goal');};
  contributionForm.onsubmit = event => {event.preventDefault();if(goal)write(contributionForm,'contribution');};
  host.onclick = event => {
    const button = event.target.closest('[data-erase]');
    if(button)save(button, () => notes.update({deleted:true}).eq('id',button.dataset.erase).eq('author',member.user.id), '这笔记录已删除。');
  };
  retry.onclick = () => {if(!busy)refresh();};
  host.querySelector('.ledger-put-away').onclick = () => {
    window.dispatchEvent(new Event('soft-hours:put-notebook-away'));
    window.dispatchEvent(new Event('soft-hours:close'));
  };

  const timer = setInterval(() => {if(!document.hidden && !busy)refresh();},15000);
  stopRefreshing = () => {active = false;clearInterval(timer);};
  refresh();
}
