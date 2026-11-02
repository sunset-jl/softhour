const bases={coffee:{label:'咖啡',color:'#795449',light:'#b88c70'},milkTea:{label:'奶茶',color:'#bb8a68',light:'#e3b997'},milk:{label:'热牛奶',color:'#e9dbc3',light:'#fff4dc'}};
const extras={milk:{label:'多一点奶',symbol:'◌'},sugar:{label:'一点甜',symbol:'✦'},pearls:{label:'珍珠',symbol:'●'},cream:{label:'奶油',symbol:'〰'}};
const decorations={heart:{label:'爱心',symbol:'♥'},star:{label:'星星',symbol:'✦'},paw:{label:'猫爪',symbol:'🐾'}};

export function mountDrinkStudio(host,onBrew){
  const recipe={base:'coffee',extras:[],decoration:'heart',name:''};
  let step=0;
  host.innerHTML=`<div class="drink-studio">
    <div class="drink-preview" aria-label="饮品实时预览"><div class="drink-preview__glow"></div><div class="drink-preview__steam" aria-hidden="true"><i></i><i></i><i></i></div><div class="drink-preview__cup"><div class="drink-preview__handle"></div><div class="drink-preview__liquid"><div class="drink-preview__foam"></div><div class="drink-preview__pearls"></div><span class="drink-preview__decoration"></span></div></div><div class="drink-preview__saucer"></div><p class="drink-preview__caption" aria-live="polite"></p></div>
    <div class="drink-maker"><div class="drink-maker__steps" aria-label="制作步骤"><span>01 杯底</span><span>02 配料</span><span>03 杯面</span></div><h3 class="drink-maker__heading"></h3><p class="drink-maker__hint"></p><div class="drink-maker__choices"></div><label class="drink-maker__name" hidden>给这杯饮料起个名字<input maxlength="20" placeholder="例如：今天不许熬夜拿铁"></label><div class="drink-maker__actions"><button class="drink-maker__back" type="button">上一步</button><button class="drink-maker__next" type="button">下一步</button></div></div>
  </div>`;
  const q=selector=>host.querySelector(selector);
  const options=q('.drink-maker__choices'),next=q('.drink-maker__next'),back=q('.drink-maker__back');
  function updatePreview(){
    const base=bases[recipe.base];
    q('.drink-preview').style.setProperty('--drink-color',base.color);
    q('.drink-preview').style.setProperty('--drink-light',recipe.extras.includes('milk')?base.light:base.color);
    q('.drink-preview__foam').hidden=!recipe.extras.includes('cream');
    q('.drink-preview__pearls').hidden=!recipe.extras.includes('pearls');
    q('.drink-preview__decoration').textContent=decorations[recipe.decoration].symbol;
    q('.drink-preview__caption').textContent=`${recipe.name||base.label} · ${recipe.extras.length?recipe.extras.map(x=>extras[x].label).join(' / '):'原味'} · ${decorations[recipe.decoration].label}`;
  }
  function render(){
    const groups=[bases,extras,decorations],titles=['先选一种温暖的杯底','再加一点喜欢的味道','最后装饰杯面'],hints=['杯中的颜色会随选择改变。','配料可以多选，也可以保持原味。','把这一杯做成只属于你们的样子。'];
    q('.drink-maker__heading').textContent=titles[step];q('.drink-maker__hint').textContent=hints[step];
    q('.drink-maker__steps').querySelectorAll('span').forEach((el,i)=>el.classList.toggle('is-current',i===step));
    options.replaceChildren();
    Object.entries(groups[step]).forEach(([key,item])=>{
      const selected=step===0?recipe.base===key:step===1?recipe.extras.includes(key):recipe.decoration===key;
      const button=document.createElement('button');button.type='button';button.className='drink-maker__option';button.setAttribute('aria-pressed',selected);button.innerHTML=`<span aria-hidden="true">${item.symbol||'◕'}</span><strong>${item.label}</strong>`;
      button.onclick=()=>{if(step===0)recipe.base=key;else if(step===1)recipe.extras=selected?recipe.extras.filter(x=>x!==key):[...recipe.extras,key];else recipe.decoration=key;updatePreview();render();};
      options.append(button);
    });
    q('.drink-maker__name').hidden=step!==2;back.hidden=step===0;next.textContent=step===2?'做好这杯饮料':'下一步';
    updatePreview();
  }
  back.onclick=()=>{step=Math.max(0,step-1);render();};
  next.onclick=()=>{if(step<2){step++;render();return;}recipe.name=q('.drink-maker__name input').value.trim();updatePreview();onBrew({...recipe,extras:[...recipe.extras]});next.textContent='再做一杯';next.onclick=()=>{step=0;recipe.extras=[];recipe.name='';q('.drink-maker__name input').value='';next.onclick=advance;render();};q('.drink-maker__heading').textContent='做好啦，房间里的杯子也装满了';q('.drink-maker__hint').textContent='回到房间，看看刚做好的饮料。';options.replaceChildren();back.hidden=true;q('.drink-maker__name').hidden=true;};
  const advance=next.onclick;
  render();
}
