const drinks = [
  {id:'milkTea', name:'奶茶', note:'香甜柔和', color:'#d5aa84', icon:'◕'},
  {id:'coffee', name:'咖啡', note:'醇香温暖', color:'#805943', icon:'☕'},
  {id:'orangeJuice', name:'橙汁', note:'清新明亮', color:'#eea646', icon:'◉'}
];

export function mountDrinkStudio(host,onBrew,cupIndex=0){
  host.innerHTML=`<p class="quick-drinks__hint">${cupIndex?'K':'J'} 的杯子已放好，选一杯喜欢的饮料。</p><div class="quick-drinks" aria-label="选择饮品"></div>`;
  const list=host.querySelector('.quick-drinks');
  for(const drink of drinks){
    const button=document.createElement('button');
    button.type='button';
    button.className='quick-drinks__choice';
    button.style.setProperty('--drink-color',drink.color);
    button.innerHTML=`<span class="quick-drinks__glass" aria-hidden="true"><span>${drink.icon}</span></span><strong>${drink.name}</strong><small>${drink.note}</small>`;
    button.addEventListener('click',()=>{
      onBrew({base:drink.id,flavor:'plain',extras:[],decoration:'heart'});
      window.dispatchEvent(new Event('soft-hours:close'));
    });
    list.append(button);
  }
}
