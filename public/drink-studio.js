const bases={jasmine:{label:'茉莉绿茶',color:'#c8c893'},oolong:{label:'乌龙茶',color:'#b9895d'},black:{label:'红茶',color:'#a56f56'}};
const flavors={peach:{label:'蜜桃',symbol:'🍑',color:'#e6aa9d'},grape:{label:'葡萄',symbol:'🍇',color:'#aa95b4'},lemon:{label:'柠檬',symbol:'🍋',color:'#e6cf8b'},plain:{label:'原味',symbol:'◌',color:null}};
const extras={pearls:{label:'珍珠',symbol:'●'},coconut:{label:'椰果',symbol:'◇'},cream:{label:'奶盖',symbol:'〰'}};

export function mountDrinkStudio(host,onBrew){
  const recipe={base:'oolong',flavor:'peach',extras:[],sweetness:'少糖',ice:'少冰',name:''};
  let step=0;
  host.innerHTML=`<div class="drink-studio">
    <div class="drink-preview" aria-label="透明杯饮品实时预览"><div class="drink-preview__glow"></div><div class="drink-preview__cup"><div class="drink-preview__liquid"><div class="drink-preview__foam"></div><div class="drink-preview__pearls"></div><div class="drink-preview__fruit"></div><div class="drink-preview__ice"></div></div><span class="drink-preview__mark">J & K</span></div><p class="drink-preview__caption" aria-live="polite"></p></div>
    <div class="drink-maker"><div class="drink-maker__steps" aria-label="制作步骤"><span>01 茶底</span><span>02 风味</span><span>03 口感</span></div><h3 class="drink-maker__heading"></h3><p class="drink-maker__hint"></p><div class="drink-maker__choices"></div><div class="drink-maker__tuning" hidden><label>甜度<select name="sweetness"><option>无糖</option><option selected>少糖</option><option>半糖</option><option>正常糖</option></select></label><label>冰量<select name="ice"><option>去冰</option><option selected>少冰</option><option>正常冰</option></select></label></div><label class="drink-maker__name" hidden>给这杯茶起个名字<input maxlength="20" placeholder="例如：蜜桃云朵乌龙"></label><div class="drink-maker__actions"><button class="drink-maker__back" type="button">上一步</button><button class="drink-maker__next" type="button">下一步</button></div></div><div class="drink-finish" hidden role="status"><span>一饮而尽！</span><button type="button">再调一杯</button></div>
  </div>`;
  const q=selector=>host.querySelector(selector);
  const options=q('.drink-maker__choices'),next=q('.drink-maker__next'),back=q('.drink-maker__back');
  function updatePreview(){
    const base=bases[recipe.base];
    q('.drink-preview').style.setProperty('--drink-color',base.color);
    q('.drink-preview').style.setProperty('--drink-light',flavors[recipe.flavor].color||base.color);
    q('.drink-preview__foam').hidden=!recipe.extras.includes('cream');
    q('.drink-preview__pearls').hidden=!recipe.extras.includes('pearls');
    q('.drink-preview__fruit').hidden=recipe.flavor==='plain';
    q('.drink-preview__ice').hidden=recipe.ice==='去冰';
    q('.drink-preview__caption').textContent=`${recipe.name||flavors[recipe.flavor].label+base.label} · ${recipe.sweetness} · ${recipe.ice}${recipe.extras.length?' · '+recipe.extras.map(x=>extras[x].label).join(' / '):''}`;
  }
  function render(){
    const groups=[bases,flavors,extras],titles=['先选一款茶底','为茶添一点风味','调成你喜欢的口感'],hints=['茉莉清新，乌龙醇香，红茶温暖。','果香会慢慢融进透明杯中的茶汤。','小料可多选，再决定甜度与冰量。'];
    q('.drink-maker__heading').textContent=titles[step];q('.drink-maker__hint').textContent=hints[step];
    q('.drink-maker__steps').querySelectorAll('span').forEach((el,i)=>el.classList.toggle('is-current',i===step));
    options.replaceChildren();
    Object.entries(groups[step]).forEach(([key,item])=>{
      const selected=step===0?recipe.base===key:step===1?recipe.flavor===key:recipe.extras.includes(key);
      const button=document.createElement('button');button.type='button';button.className='drink-maker__option';button.setAttribute('aria-pressed',selected);button.innerHTML=`<span aria-hidden="true">${item.symbol||'◕'}</span><strong>${item.label}</strong>`;
      button.onclick=()=>{if(step===0)recipe.base=key;else if(step===1)recipe.flavor=key;else recipe.extras=selected?recipe.extras.filter(x=>x!==key):[...recipe.extras,key];updatePreview();render();};
      options.append(button);
    });
    q('.drink-maker__name').hidden=step!==2;q('.drink-maker__tuning').hidden=step!==2;back.hidden=step===0;next.textContent=step===2?'调好这杯茶':'下一步';
    updatePreview();
  }
  back.onclick=()=>{step=Math.max(0,step-1);render();};
  q('.drink-maker__tuning').onchange=event=>{recipe[event.target.name]=event.target.value;updatePreview();};
  next.onclick=()=>{if(step<2){step++;render();return;}recipe.name=q('.drink-maker__name input').value.trim();updatePreview();onBrew({...recipe,extras:[...recipe.extras]});q('.drink-finish').hidden=false;};
  q('.drink-finish button').onclick=()=>{q('.drink-finish').hidden=true;step=0;recipe.extras=[];recipe.name='';q('.drink-maker__name input').value='';render();};
  render();
}
