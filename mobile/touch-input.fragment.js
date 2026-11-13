// Replacement for the upstream touch section inside v_. Keyboard/gamepad stay upstream.
// Touch.identifier is an opaque signed long: negative values, including -1, are valid.
// null alone means that no finger owns a control. Never use sign/truthiness as ownership.
let M=null,E=0,w=null,H=0,O=0,q=null,U=0,T=0,D=null,C=0,G=0,j=false;
const heldTouches=new Map();
function Q(dx,dy){f.look.dx+=dx*d_*f.sensitivity;f.look.dy+=dy*d_*f.sensitivity*(f.invertY?-1:1)}
function ie(){w=null;H=O=0;f.move.x=f.move.y=0;if(M){M.nub.style.transform='translate3d(0,0,0)';M.stick.classList.remove('active')}}
function resetTouch(){ie();q=D=null;j=false;heldTouches.clear();if(M){for(const button of Object.values(M.btn))button.classList.remove('active');M.btn.ads.setAttribute('aria-pressed','false')}f.fire=f.ads=false;f.look.dx=f.look.dy=0}
function N(){
 const root=document.createElement('div');root.className='touch';
 root.innerHTML=`<div class="t-move-zone" aria-label="移动摇杆：前进、后退、左右平移"><div class="t-stick"><i class="t-ring"></i><i class="t-nub"></i><span class="t-stick-label">移动</span><span class="t-forward">前进</span></div></div><div class="t-look-hint">右侧滑动 · 转动视角</div><button class="t-btn t-fire" data-a="fire" aria-label="开火"><span>开火</span></button><button class="t-btn t-ads" data-a="ads" aria-label="瞄准"><span>瞄准</span></button><button class="t-btn t-reload" data-a="reload" aria-label="换弹"><span>换弹</span></button><button class="t-btn t-jump" data-a="jump" aria-label="跳跃"><span>跳跃</span></button><button class="t-btn t-interact" data-a="interact" aria-label="按住交互"><span>交互</span></button><button class="t-btn t-pause" data-a="pause" aria-label="暂停"><span>Ⅱ</span></button>`;
 t.appendChild(root);
 const find=s=>root.querySelector(s),ui={root,zone:find('.t-move-zone'),stick:find('.t-stick'),nub:find('.t-nub'),btn:{fire:find('.t-fire'),ads:find('.t-ads'),reload:find('.t-reload'),jump:find('.t-jump'),interact:find('.t-interact'),pause:find('.t-pause')}};
 const stop=event=>{if(event.cancelable)event.preventDefault();event.stopPropagation();E=performance.now()};
 function move(touch){
  const bounds=ui.zone.getBoundingClientRect(),dx=touch.clientX-(bounds.left+bounds.width/2),dy=touch.clientY-(bounds.top+bounds.height/2),length=Math.hypot(dx,dy),radius=52;
  const scale=length>radius?radius/length:1,clamped=Math.min(length/radius,1),force=clamped<.08?0:(clamped-.08)/.92;
  H=length?dx/length*force:0;O=length?-dy/length*force:0;
  ui.nub.style.transform=`translate3d(${(dx*scale).toFixed(1)}px,${(dy*scale).toFixed(1)}px,0)`;
 }
 ui.zone.addEventListener('touchstart',event=>{stop(event);if(!r||w!==null)return;const touch=Array.from(event.changedTouches).find(touch=>ui.zone.contains(touch.target||event.target));if(!touch)return;w=touch.identifier;ui.stick.classList.add('active');move(touch)},{passive:false});
 ui.zone.addEventListener('touchmove',event=>{stop(event);if(!r)return;for(const touch of event.changedTouches)if(touch.identifier===w)move(touch)},{passive:false});
 const endMove=event=>{stop(event);for(const touch of event.changedTouches)if(touch.identifier===w)ie()};
 ui.zone.addEventListener('touchend',endMove,{passive:false});ui.zone.addEventListener('touchcancel',endMove,{passive:false});
 for(const [action,button] of Object.entries(ui.btn)){
  button.addEventListener('touchstart',event=>{stop(event);if(!r||heldTouches.has(action))return;const touch=Array.from(event.changedTouches).find(touch=>button.contains(touch.target||event.target));if(!touch)return;heldTouches.set(action,touch.identifier);
   if(action==='ads'){j=!j;button.classList.toggle('active',j);button.setAttribute('aria-pressed',String(j));return}
   if(action==='fire'){D=touch.identifier;C=touch.clientX;G=touch.clientY}
   button.classList.add('active');d('touch',action,true);
  },{passive:false});
  const end=event=>{stop(event);for(const touch of event.changedTouches){if(touch.identifier!==heldTouches.get(action))continue;heldTouches.delete(action);if(action==='ads')continue;if(action==='fire')D=null;button.classList.remove('active');d('touch',action,false);if(action==='fire')f.fire=false}};
  button.addEventListener('touchend',end,{passive:false});button.addEventListener('touchcancel',end,{passive:false});
  button.addEventListener('touchmove',event=>{stop(event);if(!r||action!=='fire')return;for(const touch of event.changedTouches)if(touch.identifier===D){Q(touch.clientX-C,touch.clientY-G);C=touch.clientX;G=touch.clientY}},{passive:false});
  button.addEventListener('contextmenu',event=>event.preventDefault());
 }
 return ui;
}
function K(){if(f.touch)return;f.touch=true;_();if(!M)M=N();M.root.classList.toggle('on',r);document.documentElement.classList.add('is-touch');p('touch')}
addEventListener('touchstart',()=>{E=performance.now();K()},{passive:true,capture:true});
e.addEventListener('touchstart',event=>{event.preventDefault();if(!r)return;for(const touch of event.changedTouches)if((touch.target||event.target)===e&&touch.clientX>=innerWidth*.4&&q===null){q=touch.identifier;U=touch.clientX;T=touch.clientY}},{passive:false});
e.addEventListener('touchmove',event=>{event.preventDefault();if(!r)return;for(const touch of event.changedTouches)if(touch.identifier===q){Q(touch.clientX-U,touch.clientY-T);U=touch.clientX;T=touch.clientY}},{passive:false});
const endLook=event=>{for(const touch of event.changedTouches)if(touch.identifier===q)q=null};
e.addEventListener('touchend',endLook,{passive:false});e.addEventListener('touchcancel',endLook,{passive:false});
let previousWidth=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-previousWidth)>80)v();previousWidth=innerWidth});addEventListener('orientationchange',()=>v());document.addEventListener('visibilitychange',()=>{if(document.hidden)v()});

// Read-only diagnostics for this local test build; nothing is transmitted.
f.touchState=()=>({moveId:w,lookId:q,fireId:D,rawMove:{x:H,y:O},held:[...heldTouches.keys()]});
