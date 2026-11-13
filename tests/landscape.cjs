const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path');
const engine=process.env.SALTLINE_ENGINE||'webkit';
const output=process.env.SALTLINE_TEST_OUTPUT||path.resolve(__dirname,'../test-results');
fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await pw[engine].launch({headless:true});const report={engine,physicalIPhone:false,checks:[],errors:[]};
const check=(name,pass,details)=>{report.checks.push({name,pass,details});console.log(JSON.stringify({name,pass}));if(!pass)throw Error(name)};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto(process.env.SALTLINE_URL||'http://127.0.0.1:8731/play/');
 const frame=await page.locator('#game').contentFrame().locator('body').waitFor().then(()=>page.frames().find(f=>f.parentFrame()));
 await frame.waitForFunction(()=>window.__ready,undefined,{timeout:60000});
 const layout=()=>page.evaluate(()=>{const f=document.querySelector('#game'),r=f.getBoundingClientRect();return {angle:SaltlineLandscape.angle,w:f.contentWindow.innerWidth,h:f.contentWindow.innerHeight,rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:innerWidth,vh:innerHeight}});
 const toHost=async p=>{const l=await layout(),cx=l.rect.x+l.rect.w/2,cy=l.rect.y+l.rect.h/2,dx=p.x-l.w/2,dy=p.y-l.h/2;return {id:p.id,x:cx+(l.angle===90?-dy:l.angle===-90?dy:dx),y:cy+(l.angle===90?dx:l.angle===-90?-dx:dy)}};
 const nativeTap=async selector=>{const locator=frame.locator(selector).filter({visible:true}).first();await locator.scrollIntoViewIfNeeded();const p=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}),h=await toHost(p);await page.touchscreen.tap(h.x,h.y)};
 let l=await layout();check('portrait displays a landscape viewport',l.angle===90&&l.w===844&&l.h===390,l);
 await page.screenshot({path:path.join(output,`landscape-${engine}-portrait-menu.png`)});
 await nativeTap('[data-act="deploy"]');await frame.waitForFunction(()=>__G.game.state==='playing');
 await frame.evaluate(()=>{window.__landscapeToken=Math.random();window.__touchSamples=[];document.addEventListener('touchstart',e=>{for(const t of e.changedTouches)__touchSamples.push({x:t.clientX,y:t.clientY,target:t.target.className})},{capture:true,passive:true})});
 const token=await frame.evaluate(()=>__landscapeToken);
 const state=()=>frame.evaluate(()=>({pos:{...__G.player.pos},yaw:__G.player.yaw,ammo:__G.weapon.ammo,move:{...__G.input.move},fire:__G.input.fire,owners:__G.input.touchState(),t:__G.time.t}));
 const wait=async(s=.15)=>{const t=(await state()).t;await frame.waitForFunction(({t,s})=>__G.time.t>=t+s,{t,s},{timeout:30000})};
 const reset=async()=>{await frame.evaluate(()=>{const g=__G;g.player.reset(g.level.playerStart);g.player.enabled=true;g.player.invulnerable=true;g.enemies.clear();g.weapon.reset();g.input.setGameplay(false);g.input.setGameplay(true)});await wait(.05)};
 const point=async(selector,id,dx=0,dy=0)=>frame.evaluate(({selector,id,dx,dy})=>{const r=document.querySelector(selector).getBoundingClientRect();return {id,x:r.x+r.width/2+dx,y:r.y+r.height/2+dy,selector}},{selector,id,dx,dy});

 const cdp=engine==='chromium'?await context.newCDPSession(page):null;
 const dispatch=async(type,changed,active)=>{
  if(cdp){const points=await Promise.all((type==='touchend'?changed:active).map(toHost));await cdp.send('Input.dispatchTouchEvent',{type:({touchstart:'touchStart',touchmove:'touchMove',touchend:'touchEnd'})[type],touchPoints:points.map(p=>({...p,radiusX:5,radiusY:5,force:1}))});}
  else await frame.evaluate(({type,changed,active})=>{const el=document.querySelector(changed[0].selector),make=t=>({...t,identifier:t.id,clientX:t.x,clientY:t.y,target:document.querySelector(t.selector)}),e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{changedTouches:{value:changed.map(make)},touches:{value:active.map(make)},targetTouches:{value:active.filter(t=>t.selector===changed[0].selector).map(make)}});el.dispatchEvent(e)},{type,changed,active});
 };
 for(const angle of [90,-90,0]){
  if(angle===-90)await page.evaluate(()=>SaltlineLandscape.flip());
  if(angle===0)await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(angle=>SaltlineLandscape.angle===angle,angle);await wait();l=await layout();
  check(`angle ${angle}: viewport stays landscape`,l.w>l.h&&l.rect.x>=-1&&l.rect.y>=-1&&l.rect.x+l.rect.w<=l.vw+1&&l.rect.y+l.rect.h<=l.vh+1,l);
  await reset();const target=await point('.t-move-zone',1,0,-40),native=await toHost(target);await page.touchscreen.tap(native.x,native.y);
  const sample=await frame.evaluate(()=>__touchSamples.at(-1));check(`angle ${angle}: native tap coordinates match joystick`,Math.abs(sample.x-target.x)<2&&Math.abs(sample.y-target.y)<2,{target,sample});
  for(const [name,dx,dy,axis,sign] of [['forward',0,-50,'y',1],['backward',0,50,'y',-1],['left',-50,0,'x',-1],['right',50,0,'x',1]]){
   await reset();const move=await point('.t-move-zone',1,dx,dy),fire=await point('.t-fire',3),look={id:2,x:450,y:170,selector:'#view'},look2={...look,x:490,y:176},before=await state();
   await dispatch('touchstart',[move],[move]);await dispatch('touchstart',[look],[move,look]);await dispatch('touchstart',[fire],[move,look,fire]);await dispatch('touchmove',[look2],[move,look2,fire]);await wait(.25);const during=await state();
   check(`angle ${angle}: ${name} + aim + fire`,during.move[axis]*sign>.5&&during.fire&&during.ammo<before.ammo&&Math.abs(during.yaw-before.yaw)>.1&&Math.hypot(during.pos.x-before.pos.x,during.pos.z-before.pos.z)>.2,{before,during});
   await dispatch('touchend',[look2],[move,fire]);await wait(.04);let s=await state();check(`angle ${angle}: release aim preserves move/fire (${name})`,s.owners.lookId===null&&s.fire&&s.move[axis]*sign>.5,s);
   await dispatch('touchend',[fire],[move]);await wait(.04);s=await state();check(`angle ${angle}: release fire preserves movement (${name})`,!s.fire&&s.move[axis]*sign>.5,s);
   await dispatch('touchend',[move],[]);await wait(.04);s=await state();check(`angle ${angle}: release joystick rests (${name})`,s.owners.moveId===null&&s.move.x===0&&s.move.y===0,s);
  }
 }
 await page.screenshot({path:path.join(output,`landscape-${engine}-game.png`)});
 await reset();const move=await point('.t-move-zone',1,0,-50);await dispatch('touchstart',[move],[move]);await wait(.1);
 await page.setViewportSize({width:844,height:350});await wait(.1);let s=await state();check('Safari toolbar resize preserves movement',s.owners.moveId!==null&&s.move.y>.5,s);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>SaltlineLandscape.angle===-90);await wait(.1);s=await state();check('rotation clears stale fingers',s.owners.moveId===null&&!s.fire&&s.move.y===0,s);
 check('rotation preserves the running mission',await frame.evaluate(token=>__landscapeToken===token&&__G.game.state==='playing',token));
 // Release native hardware contacts still held by the test driver, then use settings.
 if(cdp)await dispatch('touchend',[move],[]);
 await nativeTap('.t-pause');await frame.waitForFunction(()=>__G.game.state==='paused');
 await nativeTap('[data-act="settings"]');
 await nativeTap('#mobile-flip');await page.waitForFunction(()=>SaltlineLandscape.angle===90);
 check('settings can reverse the portrait landscape view',await frame.evaluate(()=>__G.game.state==='paused'));
 await nativeTap('[data-act="close-panel"]');
 await nativeTap('[data-act="resume"]');await frame.waitForFunction(()=>__G.game.state==='playing');
 check('no runtime errors',report.errors.length===0,report.errors);
}catch(e){report.failure=String(e);console.error(e);process.exitCode=1}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,`landscape-${engine}-results.json`),JSON.stringify(report,null,2));await browser.close()}})();
