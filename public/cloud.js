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
const formKey='soft-hours-auth-form-v1';
function storedForm(){try{return localStorage.getItem(formKey)==='login'?'login':'register';}catch{return 'register';}}
function rememberForm(mode){try{localStorage.setItem(formKey,mode);}catch{}}
function markPasswordReady(user){if(!user)return;try{localStorage.setItem(`soft-hours-password-ready:${user.id}`,'1');}catch{}}
function emailError(error){
  const message=error?.message||'';
  if(error?.name==='AuthRetryableFetchError'||/failed to fetch|network error|load failed|fetch failed/i.test(message))
    return '暂时连不上认证服务。请换个网络后再试；如果刚才已经注册成功，可以切换到「登录」。';
  if(error?.code==='invalid_credentials')return '邮箱或密码不正确。';
  if(error?.code==='user_already_exists'||/user already registered/i.test(message))return '这个邮箱已有账号，请切换到「登录」。';
  const wait=message.match(/after (\d+) seconds?/i);
  if(wait)return `请求太频繁，请 ${wait[1]} 秒后再试。`;
  return message||'请求失败，请稍后重试。';
}
export async function showPrivateGate(host,whenReady){
  const member=await getIdentity(true);if(member)return member;
  const {data:{session}}=await cloud.auth.getSession();
  let typedEmail='';
  function render(mode,message=''){
    host.innerHTML=`<div class="private-gate"><p class="modal-section-title">JUST FOR J & K</p><h3>${mode==='register'?'第一次来，先注册':'欢迎回来'}</h3><p>${session?'当前账号没有查看私人回忆的权限。':'访客可以探索小屋；私人回忆只属于 J 和 K。'}</p><div class="private-auth-tabs"><button type="button" data-mode="register" aria-pressed="${mode==='register'}">注册</button><button type="button" data-mode="login" aria-pressed="${mode==='login'}">登录</button></div><form><label>邮箱地址<input type="email" name="email" autocomplete="email" required placeholder="your@email.com"></label>${mode==='register'?'<label>专属邀请码<input type="text" name="invite" autocomplete="off" required placeholder="输入 J 或 K 的邀请码"></label>':''}<label>密码<input type="password" name="password" minlength="8" autocomplete="${mode==='register'?'new-password':'current-password'}" required placeholder="至少 8 位"></label>${mode==='register'?'<label>确认密码<input type="password" name="confirm" minlength="8" autocomplete="new-password" required placeholder="再输入一次密码"></label>':''}<button type="submit">${mode==='register'?'注册并进入小屋':'进入我们的小屋'}</button></form><p class="private-gate-status" role="status"></p>${session?'<button type="button" class="private-signout">退出当前账号</button>':''}</div>`;
    const form=host.querySelector('form'),status=host.querySelector('.private-gate-status');status.textContent=message;
    form.elements.namedItem('email').value=typedEmail;
    host.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
      typedEmail=form.elements.namedItem('email').value;
      rememberForm(button.dataset.mode);render(button.dataset.mode);
    });
    form.onsubmit=async e=>{e.preventDefault();const data=new FormData(form),email=String(data.get('email')).trim().toLowerCase(),password=String(data.get('password')),button=form.querySelector('[type="submit"]');
      if(mode==='register'&&password!==data.get('confirm')){status.textContent='两次输入的密码不一致。';return;}
      button.disabled=true;status.textContent=mode==='register'?'正在创建账号…':'正在进入小屋…';
      if(mode==='register'){
        const {data:signup,error}=await cloud.auth.signUp({email,password,options:{data:{soft_hours_invite:String(data.get('invite')).trim()}}});
        if(error)status.textContent=error.message.includes('Invalid invitation code')?'邮箱或邀请码不正确。':emailError(error);
        else if(signup.session){markPasswordReady(signup.user);rememberForm('login');window.dispatchEvent(new Event('soft-hours:auth-change'));window.dispatchEvent(new Event('soft-hours:close'));}
        else status.textContent='注册尚未完成，请稍后重试。';
      }else{
        const {data:login,error}=await cloud.auth.signInWithPassword({email,password});
        status.textContent=error?emailError(error):'欢迎回来。';
        if(!error){markPasswordReady(login.user);rememberForm('login');window.dispatchEvent(new Event('soft-hours:auth-change'));window.dispatchEvent(new Event('soft-hours:close'));}
      }
      button.disabled=false;
    };
    host.querySelector('.private-signout')?.addEventListener('click',async()=>{await cloud.auth.signOut();whenReady?.();});
  }
  render(storedForm());
  return null;
}
