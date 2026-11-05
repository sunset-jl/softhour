import { cloud, showPrivateGate } from './cloud.js';

// Store structured entries in the existing private member-note channel.
// The announcement board excludes this namespace.
export const ledgerPrefix = '[SOFTHOURS-LEDGER-1]';
const money = new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'});
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function mountLedger(host){
  const member=await showPrivateGate(host,()=>mountLedger(host));
  if(!member||!host.isConnected)return;
  host.innerHTML=`<div class="ledger-columns">${['J','K'].map(slot=>`<section class="ledger-column" aria-label="${slot} 的账目"><h3>${slot} <small>${slot===member.slot?'我的账目':'对方的账目'}</small></h3><p class="ledger-total" data-total="${slot}"></p><ul data-entries="${slot}"></ul>${slot===member.slot?`<form class="ledger-form"><label>用途<input name="item" maxlength="60" required placeholder="例如：今天的奶茶"></label><label>金额（元）<input name="amount" type="number" min=".01" max="999999" step=".01" inputmode="decimal" required></label><button type="submit">记一笔</button></form>`:''}</section>`).join('')}</div><p class="ledger-status" role="status"></p><button class="ledger-put-away" type="button">把本子收回抽屉</button>`;
  const form=host.querySelector('form');
  const status=host.querySelector('.ledger-status');
  const notes=cloud.from('soft_hours_notes');
  const refresh=async()=>{
    const {data,error}=await notes.select('id,body,author,author_slot,created').eq('deleted',false).like('body',ledgerPrefix+'%').order('created',{ascending:false});
    if(error)throw error;
    const rows=data.flatMap(row=>{
      try{
        const entry=JSON.parse(row.body.slice(ledgerPrefix.length));
        if(typeof entry.item==='string'&&Number.isSafeInteger(entry.cents)&&entry.cents>0)return [{...row,item:entry.item,cents:entry.cents}];
      }catch{}
      return [];
    });
    for(const slot of ['J','K']){
      const entries=rows.filter(row=>row.author_slot===slot);
      host.querySelector(`[data-total="${slot}"]`)?.replaceChildren(money.format(entries.reduce((sum,row)=>sum+row.cents,0)/100));
      const list=host.querySelector(`[data-entries="${slot}"]`);
      if(list)list.innerHTML=entries.map(row=>`<li><span>${escape(row.item)}<small>${escape(new Date(row.created).toLocaleDateString('zh-CN'))}</small></span><strong>${money.format(row.cents/100)}</strong>${row.author===member.user.id?`<button type="button" data-erase="${escape(row.id)}" aria-label="删除这笔账">删除</button>`:''}</li>`).join('')||'<li class="small-note">还没有记账。</li>';
    }
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    const item=form.elements.item.value.trim(),cents=Math.round(Number(form.elements.amount.value)*100);
    if(!item||!Number.isSafeInteger(cents)||cents<1)return;
    const button=form.querySelector('button');
    button.disabled=true;status.textContent='正在保存…';
    try{
      const {error}=await notes.insert({id:crypto.randomUUID(),body:ledgerPrefix+JSON.stringify({item,cents}),author:member.user.id,author_slot:member.slot});
      if(error)throw error;
      form.reset();status.textContent='记好啦。';await refresh();
    }catch(error){status.textContent=error.message||'暂时没有保存成功。';}
    finally{button.disabled=false;}
  };
  host.querySelector('.ledger-columns').onclick=async event=>{
    const button=event.target.closest('[data-erase]');
    if(!button||button.disabled)return;
    button.disabled=true;
    try{
      const {error}=await notes.update({deleted:true}).eq('id',button.dataset.erase).eq('author',member.user.id);
      if(error)throw error;
      await refresh();
    }catch(error){status.textContent=error.message;button.disabled=false;}
  };
  host.querySelector('.ledger-put-away').onclick=()=>{
    window.dispatchEvent(new Event('soft-hours:put-notebook-away'));
    window.dispatchEvent(new Event('soft-hours:close'));
  };
  refresh().catch(error=>{status.textContent=error.message;});
}
