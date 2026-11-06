// Add an entry with a unique, stable ID when a new feature ships.
const updates = [
  {id:'rug-roach-game', title:'拖鞋大作战', description:'点地毯看提示，再点一下掀开它。拖鞋会飞到屏幕上，帮你收拾到处爬的蟑螂。'},
  {id:'comfort-machine', title:'抽屉里的抽奖机', description:'拉开柜子最下面一排左侧的抽屉，点一下圆形小机器，再按「抽」，打开扭蛋里的安慰纸条。'},
  {id:'desktop-app', title:'把小屋装到桌面', description:'在 Edge 或 Chrome 的菜单里安装 Soft Hours，之后就能点桌面上的小屋图标进入。'},
  {id:'window-doorbell', title:'窗边多了一只小门铃', description:'对方刚到时，铃声和窗边纸条会提醒你。两个人都在时，小星星会亮起。'},
  {id:'gold-key', title:'粉色盒子里的金钥匙', description:'掀开盒盖，点一下金钥匙，看看下一张地图的预告。'},
  {id:'shared-goal', title:'一起存一个愿望', description:'打开抽屉里的小账本，J 和 K 可以为同一个目标各存一笔。'},
];

const button = document.getElementById('roomUpdates');
const badge = button.querySelector('.room-updates-badge');
const seenThisVisit = new Map();
let account = null;

function readSeen(){
  if(!account) return new Set();
  const key = `soft-hours-updates-seen:${account}`;
  if(!seenThisVisit.has(key)){
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    seenThisVisit.set(key, new Set(Array.isArray(stored) ? stored : []));
  }
  return seenThisVisit.get(key);
}

export function updateRoomNotice(member){
  account = ['J','K'].includes(member?.slot) ? member.user.id : null;
  button.hidden = !account || !updates.length;
  const seen = readSeen();
  const unread = updates.filter(({id}) => !seen.has(id)).length;
  badge.hidden = !unread;
  button.setAttribute('aria-label', unread ? `小屋更新，${unread} 条新功能` : '小屋更新');
}

export function mountRoomUpdates(host){
  host.replaceChildren();
  if(!account) return;
  const seen = readSeen();
  const list = document.createElement('ul');
  list.className = 'room-updates-list';
  for(const {id,title,description} of updates){
    const item = document.createElement('li');
    const heading = document.createElement('h3');
    heading.textContent = title;
    if(!seen.has(id)){
      const tag = document.createElement('span');
      tag.textContent = '新';
      heading.append(tag);
    }
    const summary = document.createElement('p');
    summary.textContent = description;
    item.append(heading,summary);
    list.append(item);
  }
  host.append(list);
  for(const {id} of updates) seen.add(id);
  try { localStorage.setItem(`soft-hours-updates-seen:${account}`, JSON.stringify([...seen])); } catch {}
  badge.hidden = true;
  button.setAttribute('aria-label', '小屋更新');
}
