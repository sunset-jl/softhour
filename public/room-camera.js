const backdrop=new Image();
backdrop.src=new URL('./assets/painted-background.png',import.meta.url);
const flowers=new Image();
flowers.src=new URL('./assets/records/cover-daisies.webp',import.meta.url);

export function mountRoomCamera(host){
  host.innerHTML='<canvas class="camera-preview" aria-label="小屋取景框"></canvas><div class="camera-actions"><button type="button" class="camera-shutter">拍照并保存</button><button type="button" class="camera-selfie">和小小宇宙合照</button></div><p class="camera-status" role="status"></p><a class="camera-photo-link" target="_blank" rel="noopener" hidden>打开照片</a>';
  const view=host.querySelector('canvas'),status=host.querySelector('.camera-status'),link=host.querySelector('.camera-photo-link');
  let fileUrl;
  function compose(){
    const request={frame:null};
    window.dispatchEvent(new CustomEvent('soft-hours:camera-frame',{detail:request}));
    const frame=request.frame;
    if(!frame?.width)return false;
    const width=1080,height=Math.round(width*frame.height/frame.width);
    view.width=width;view.height=height;
    const ctx=view.getContext('2d');
    ctx.fillStyle='#f7e9d7';ctx.fillRect(0,0,width,height);
    if(backdrop.naturalWidth)ctx.drawImage(backdrop,0,0,width,height);
    ctx.drawImage(frame,0,0,width,height);
    ctx.strokeStyle='#fff5e6';ctx.lineWidth=12;ctx.strokeRect(12,12,width-24,height-24);
    ctx.fillStyle='#fff5e6e8';ctx.fillRect(26,26,228,45);
    ctx.fillStyle='#70567e';ctx.font='25px Georgia';ctx.fillText('SOFT HOURS · J & K',39,57);
    if(flowers.naturalWidth){
      ctx.save();ctx.translate(width-112,height-101);ctx.rotate(.12);
      ctx.fillStyle='#fff5e7';ctx.fillRect(-8,-8,88,92);ctx.drawImage(flowers,0,0,72,72);ctx.restore();
    }
    return true;
  }
  compose();
  host.querySelector('.camera-shutter').onclick=()=>{
    if(!compose()){status.textContent='小屋还在加载，请稍后再试。';return;}
    view.toBlob(blob=>{
      if(!blob||!view.isConnected)return;
      if(fileUrl)URL.revokeObjectURL(fileUrl);
      fileUrl=URL.createObjectURL(blob);link.href=fileUrl;link.hidden=false;
      const download=document.createElement('a');download.href=fileUrl;download.download='Soft-Hours-小屋.png';download.click();
      status.textContent='照片拍好了。';
    },'image/png');
  };
  host.querySelector('.camera-selfie').onclick=()=>{
    window.dispatchEvent(new Event('soft-hours:close'));
    window.dispatchEvent(new Event('soft-hours:globe-selfie'));
  };
  window.addEventListener('soft-hours:camera-closed',()=>{if(fileUrl)URL.revokeObjectURL(fileUrl);},{once:true});
}
