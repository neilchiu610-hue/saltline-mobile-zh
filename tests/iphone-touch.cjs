const {webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs');const path=require('node:path');const outputDir=process.env.SALTLINE_TEST_OUTPUT||path.resolve(__dirname,'../test-results');fs.mkdirSync(outputDir,{recursive:true});
(async()=>{const browser=await webkit.launch({headless:true});const report={engine:'Mac WebKit with synthetic standards-valid signed touch IDs; not physical iPhone',checks:[],errors:[]};try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.goto(process.env.SALTLINE_URL||'http://127.0.0.1:8731/');await page.waitForFunction(()=>window.__ready);await page.locator('[data-act="deploy"]').tap();await page.waitForFunction(()=>window.__G.game.state==='playing');
 const record=(name,pass,details)=>{const r={name,pass,details};report.checks.push(r);console.log(JSON.stringify(r));if(!pass)throw Error(name)};
 const state=()=>page.evaluate(()=>{const g=window.__G;return {pos:{...g.player.pos},yaw:g.player.yaw,pitch:g.player.pitch,ammo:g.weapon.ammo,move:{...g.input.move},fire:g.input.fire,touch:g.input.touchState(),t:g.time.t}});
 const simWait=async(seconds)=>{const t=(await state()).t;await page.waitForFunction(({t,seconds})=>window.__G.time.t>=t+seconds,{t,seconds},{timeout:20000})};
 async function dispatch(selector,type,changed,active){await page.evaluate(({selector,type,changed,active})=>{const el=document.querySelector(selector),make=t=>({...t,identifier:t.id,clientX:t.x,clientY:t.y,target:document.querySelector(t.selector)}),e=new Event(type,{bubbles:true,cancelable:type!=='touchcancel'});Object.defineProperties(e,{changedTouches:{value:changed.map(make)},touches:{value:active.map(make)},targetTouches:{value:active.filter(t=>t.selector===selector).map(make)}});el.dispatchEvent(e)},{selector,type,changed,active})}
 async function reset(){await page.evaluate(()=>{const g=window.__G;g.player.reset(g.level.playerStart);g.player.enabled=true;g.player.invulnerable=true;g.enemies.clear();g.weapon.reset();g.input.setGameplay(false);g.input.setGameplay(true)});await simWait(.1)}
 const zone=await page.locator('.t-move-zone').boundingBox(),fireBox=await page.locator('.t-fire').boundingBox();const x=zone.x+zone.width/2,y=zone.y+zone.height/2;
 const look={id:-2147483648,x:470,y:180,selector:'#view'},fire={id:0,x:fireBox.x+fireBox.width/2,y:fireBox.y+fireBox.height/2,selector:'.t-fire'};
 for(const [name,dx,dy,axis,sign] of [['forward',0,-50,'y',1],['backward',0,50,'y',-1],['strafe-left',-50,0,'x',-1],['strafe-right',50,0,'x',1]]){
  await reset();const move={id:-1,x:x+dx,y:y+dy,selector:'.t-move-zone'};const before=await state();
  await dispatch(move.selector,'touchstart',[move],[move]);await dispatch(look.selector,'touchstart',[look],[move,look]);await dispatch(fire.selector,'touchstart',[fire],[move,look,fire]);
  const movedLook={...look,x:look.x+55,y:look.y+10};await dispatch(look.selector,'touchmove',[movedLook],[move,movedLook,fire]);await simWait(.4);const during=await state();
  const delta=Math.hypot(during.pos.x-before.pos.x,during.pos.z-before.pos.z);
  record(name+' + look + fire',delta>.3&&during.move[axis]*sign>.5&&during.fire&&during.ammo<before.ammo&&Math.abs(during.yaw-before.yaw)>.1,{before,during,delta});
  // Releasing aim does not cancel movement or firing.
  await dispatch(look.selector,'touchend',[movedLook],[move,fire]);await simWait(.15);let s=await state();record(name+' release look preserves move/fire',s.touch.lookId===null&&s.touch.moveId===-1&&s.fire&&s.move[axis]*sign>.5,s);
  // A new camera finger takes over without stealing the existing joystick.
  const newLook={...look,id:2147483647};await dispatch(newLook.selector,'touchstart',[newLook],[move,newLook,fire]);
  await dispatch(move.selector,'touchend',[move],[newLook,fire]);await simWait(.15);s=await state();record(name+' release move preserves look/fire',s.touch.moveId===null&&s.touch.lookId===2147483647&&s.move.x===0&&s.move.y===0&&s.fire,s);
  await dispatch(fire.selector,'touchcancel',[fire],[newLook]);await simWait(.1);s=await state();record(name+' cancel fire preserves look',!s.fire&&s.touch.fireId===null&&s.touch.lookId===2147483647,s);
  await dispatch(newLook.selector,'touchend',[newLook],[]);await simWait(.1);
 }
 // Two-finger common FPS layout: left thumb moves; right thumb drags the fire button.
 await reset();const move={id:-987654321,x,y:y-50,selector:'.t-move-zone'};const before=await state();
 await dispatch(move.selector,'touchstart',[move],[move]);await dispatch(fire.selector,'touchstart',[fire],[move,fire]);const dragFire={...fire,x:fire.x-35,y:fire.y-12};await dispatch(fire.selector,'touchmove',[dragFire],[move,dragFire]);await simWait(.35);let s=await state();record('two thumbs move + fire-button drag aim',Math.hypot(s.pos.x-before.pos.x,s.pos.z-before.pos.z)>.3&&Math.abs(s.yaw-before.yaw)>.1&&s.ammo<before.ammo&&s.fire,{before,after:s});
 await dispatch(fire.selector,'touchend',[dragFire],[move]);await simWait(.1);s=await state();record('release fire preserves movement',!s.fire&&s.move.y>.5,s);
 // Safari's expanding/collapsing toolbar changes height: keep the active thumb.
 await page.setViewportSize({width:844,height:340});await simWait(.1);s=await state();record('toolbar height resize preserves movement',s.touch.moveId===move.id&&s.move.y>.5,s);
 await dispatch(move.selector,'touchcancel',[move],[]);await simWait(.1);s=await state();record('cancel joystick returns to rest',s.move.x===0&&s.move.y===0&&s.touch.moveId===null,s);
 await page.setViewportSize({width:844,height:390});
 // Simultaneous changedTouches can contain contacts belonging to different controls.
 await reset();await dispatch(move.selector,'touchstart',[fire,look,move],[move,look,fire]);await dispatch(look.selector,'touchstart',[fire,move,look],[move,look,fire]);await dispatch(fire.selector,'touchstart',[move,look,fire],[move,look,fire]);await simWait(.1);s=await state();record('batched touches assigned by target, not array order',s.touch.moveId===move.id&&s.touch.lookId===look.id&&s.touch.fireId===fire.id,s);
 await page.locator('.t-pause').tap();await page.waitForFunction(()=>window.__G.game.state==='paused');s=await state();record('pause clears all held fingers',s.touch.moveId===null&&s.touch.lookId===null&&s.touch.fireId===null&&!s.fire&&s.touch.held.length===0,s);
 await page.locator('[data-act="resume"]').tap();await page.waitForFunction(()=>window.__G.game.state==='playing');
 await dispatch(move.selector,'touchstart',[move],[move]);await simWait(.1);await page.setViewportSize({width:390,height:844});await simWait(.1);s=await state();record('orientation change cancels old coordinates',s.touch.moveId===null&&s.move.x===0&&s.move.y===0,s);
 record('no runtime errors',report.errors.length===0&&await page.evaluate(()=>window.__errors.length===0),report.errors);
}catch(e){report.failure=String(e);console.error(e);process.exitCode=1}finally{fs.writeFileSync(path.join(outputDir,'iphone-multitouch-results.json'),JSON.stringify(report,null,2));await browser.close()}})();
