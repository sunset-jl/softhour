import {cloud,getIdentity} from './cloud.js';
import {ledgerPrefix} from './room-ledger.js?v=room-finds-2';
import {doorbellPresenceMarker} from './doorbell-presence.js?v=1';
function fail(error){if(error)throw Object.assign(new Error(error.message||'保存失败，请重试。'),{status:error.code==='23505'?409:400});}
export async function boardApi(p){
  const me=await getIdentity();if(!me)throw Object.assign(new Error('请先登录小屋。'),{status:401});
  const notes=cloud.from('soft_hours_notes'),replies=cloud.from('soft_hours_replies'),reads=cloud.from('soft_hours_reads');
  if(!p){
    const [n,r,v]=await Promise.all([notes.select('*').eq('deleted',false).neq('body',doorbellPresenceMarker).not('body','like',ledgerPrefix+'%').order('pinned',{ascending:false}).order('created',{ascending:false}),replies.select('*').order('created'),reads.select('*')]);fail(n.error);fail(r.error);fail(v.error);
    return {me:me.slot,partnerReady:true,notes:n.data.map(item=>{const own=v.data.find(x=>x.note===item.id&&x.reader===me.user.id);const other=v.data.filter(x=>x.note===item.id&&x.reader!==me.user.id).reduce((max,x)=>Math.max(max,x.version),0);return {...item,mine:item.author===me.user.id,seen_version:own?.version||0,other_seen:other};}),replies:r.data};
  }
  if(p.action==='read'){
    for(const item of p.items||[]){const {error}=await reads.upsert({note:item.id,reader:me.user.id,version:item.version},{onConflict:'note,reader'});fail(error);}return {ok:true};
  }
  if(p.action==='create'){const {error}=await notes.insert({id:p.id,body:p.body.trim(),author:me.user.id,author_slot:me.slot});fail(error);return {ok:true};}
  const {data:note,error:lookupError}=await notes.select('*').eq('id',p.id).single();fail(lookupError);
  if(p.action==='reply'){
    if(note.archived||note.deleted)throw Object.assign(new Error('这张便签暂时不能回复。'),{status:409});
    const {error}=await replies.insert({id:p.replyId,note:p.id,body:p.body.trim(),author:me.user.id,author_slot:me.slot});fail(error);
    const {error:changeError}=await notes.update({version:note.version+1}).eq('id',p.id).eq('version',note.version);fail(changeError);return {ok:true};
  }
  if(p.version!==note.version)throw Object.assign(new Error('便签已更新，请刷新后重试。'),{status:409});
  if(['edit','delete'].includes(p.action)&&note.author!==me.user.id)throw Object.assign(new Error('只能修改自己的便签。'),{status:403});
  const changes={edit:{body:p.body.trim()},delete:{deleted:true},pin:{pinned:!note.pinned},archive:{archived:!note.archived}}[p.action];
  if(!changes)throw Error('操作无效。');
  const {data,error}=await notes.update({...changes,version:note.version+1}).eq('id',p.id).eq('version',note.version).select('id');fail(error);if(!data.length)throw Object.assign(new Error('便签已更新，请刷新后重试。'),{status:409});return {ok:true};
}
