import {createClient} from './vendor/supabase.js';

export const cloud=createClient('https://dgxlzpapxratxeyjbjum.supabase.co','sb_publishable_Brd-gLnqxFZWuwMvCoYMXQ_o30F2ech',{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const bucket=cloud.storage.from('soft-hours-private');
let identity=null;
export async function getIdentity(refresh=false){
  if(identity&&!refresh)return identity;
  const {data:{user},error}=await cloud.auth.getUser();
  if(error||!user){identity=null;return null;}
  const {data:slot,error:membershipError}=await cloud.rpc('soft_hours_slot');
  if(membershipError||!slot){identity=null;return null;}
  identity={user,slot};
  return identity;
}
cloud.auth.onAuthStateChange(()=>{identity=null;window.dispatchEvent(new Event('soft-hours:auth-change'));});
export async function signedFile(path){const {data,error}=await bucket.createSignedUrl(path,3600);if(error)throw error;return data.signedUrl;}
export async function uploadPrivate(path,file){const {error}=await bucket.upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;}
export async function removePrivate(path){const {error}=await bucket.remove([path]);if(error)throw error;}
export async function showPrivateGate(host,whenReady){
  const member=await getIdentity(true);if(member)return member;
  const {data:{session}}=await cloud.auth.getSession();
  host.innerHTML=`<div class="private-gate"><p class="modal-section-title">JUST FOR J & K</p><h3>这里留给我们两个人</h3><p>${session?'这个账号没有查看私人回忆的权限。':'访客可以自由探索小屋。J 和 K 用邮箱和密码直接进入私人模式。'}</p><form><label>邮箱地址<input type="email" name="email" autocomplete="email" required placeholder="your@email.com"></label><label>密码<input type="password" name="password" autocomplete="current-password" required placeholder="输入你的密码"></label><button type="submit">进入我们的小屋</button><button type="button" class="private-first-time">首次设置密码 · 获取邮箱链接</button></form><p class="private-gate-status" role="status"></p>${session?'<button type="button" class="private-signout">退出当前账号</button>':''}</div>`;
  const form=host.querySelector('form'),status=host.querySelector('.private-gate-status');
  form.onsubmit=async e=>{e.preventDefault();const data=new FormData(form),email=String(data.get('email')).trim().toLowerCase(),password=String(data.get('password'));status.textContent='正在进入小屋…';const button=form.querySelector('[type="submit"]');button.disabled=true;
    const {error}=await cloud.auth.signInWithPassword({email,password});
    status.textContent=error?'邮箱或密码不正确，请重试。':'欢迎回来。';button.disabled=false;};
  form.querySelector('.private-first-time').onclick=async()=>{const email=form.elements.email.value.trim().toLowerCase();if(!form.elements.email.reportValidity())return;const button=form.querySelector('.private-first-time');button.disabled=true;status.textContent='正在发送首次设置链接…';const {error}=await cloud.auth.signInWithOtp({email,options:{emailRedirectTo:'https://sunset-jl.github.io/softhour/'}});status.textContent=error?`发送失败：${error.message}`:'请打开邮箱里的链接验证一次，然后回到网站设置密码。';button.disabled=false;};
  host.querySelector('.private-signout')?.addEventListener('click',async()=>{await cloud.auth.signOut();whenReady?.();});
  return null;
}
