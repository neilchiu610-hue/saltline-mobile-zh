/* Mobile feedback; uses the existing game AudioContext and public event bus. */
(() => {
  'use strict';
  const storageKey='saltline.mobile.v1';
  window.SaltlineMobile={version:'zh-mobile-4',attach(game){
    let landscape=null;
    try{if(parent!==window&&parent.location.origin===location.origin)landscape=parent.SaltlineLandscape}catch{}
    if(landscape){
      document.documentElement.classList.add('landscape-hosted');
      const note=document.querySelector('.m-note');
      if(note)note.textContent='横屏版 v4 · 左摇杆移动 · 右侧滑动瞄准 · 按住开火';
      const orientation=document.createElement('section');
      orientation.innerHTML='<h3>横屏游玩</h3><div class="row"><label for="mobile-flip">画面方向</label><button id="mobile-flip" class="btn small" type="button">调转方向</button></div><p class="mobile-status" id="mobile-orientation-status"></p>';
      document.querySelector('[data-pane="settings"]').appendChild(orientation);
      const button=orientation.querySelector('button'),status=orientation.querySelector('p');
      const refreshOrientation=()=>{button.disabled=landscape.angle===0;status.textContent=landscape.angle===0?'已随手机横屏显示。':'请横握手机游玩；画面倒置时可点“调转方向”。'};
      button.addEventListener('click',()=>{landscape.flip();refreshOrientation()});
      addEventListener('saltline:layout',refreshOrientation);refreshOrientation();
    }else{
      const entry=document.createElement('a');entry.className='btn';entry.href='play/';entry.textContent='横屏游玩';
      document.querySelector('.m-title .m-actions')?.appendChild(entry);
    }
    let options={sound:true,haptics:true};
    try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){options.sound=saved.sound!==false;options.haptics=saved.haptics!==false}}catch{}
    const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(options))}catch{}};
    const ctx=game.audio?.ctx;
    const supported=typeof navigator.vibrate==='function';
    let requestedVolume=game.game.menus.settings.volume,extraBus=null,lastBuzz=-1000;
    const activeTones=new Set();
    const originalSetVolume=game.audio.setVolume?.bind(game.audio);
    const applyVolume=()=>{originalSetVolume?.(options.sound?requestedVolume:0);if(extraBus)extraBus.gain.value=options.sound?requestedVolume:0};
    game.audio.setVolume=value=>{requestedVolume=Math.min(1,Math.max(0,Number(value)||0));applyVolume()};
    if(ctx){extraBus=ctx.createGain();extraBus.connect(ctx.destination)}
    applyVolume();
    function unlock(){
      if(!ctx||!options.sound||document.hidden)return;
      try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
      game.audio.resume?.();
      if(ctx.state!=='running')ctx.resume().catch(()=>{});
      // A silent source, started synchronously by a real tap, helps mobile audio unlock.
      if(!window.SaltlineMobile.audioUnlocked){
        try{const source=ctx.createBufferSource();source.buffer=ctx.createBuffer(1,1,ctx.sampleRate);source.connect(ctx.destination);source.onended=()=>{source.disconnect();window.SaltlineMobile.audioUnlocked=ctx.state==='running';refresh()};source.start()}catch{}
      }
    }
    function tone(frequency,duration=.065,gain=.08,delay=0){
      if(!ctx||!extraBus||!options.sound||ctx.state!=='running'||document.hidden)return;
      const oscillator=ctx.createOscillator(),envelope=ctx.createGain(),at=ctx.currentTime+delay;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);
      envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(gain,at+.006);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
      oscillator.connect(envelope);envelope.connect(extraBus);activeTones.add(oscillator);
      oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();activeTones.delete(oscillator)};oscillator.start(at);oscillator.stop(at+duration+.01);
    }
    function buzz(pattern,priority=false){
      if(!supported||!options.haptics||document.hidden)return false;
      const now=performance.now();if(!priority&&now-lastBuzz<90)return false;lastBuzz=now;
      try{return navigator.vibrate(pattern)}catch{return false}
    }
    const settings=document.querySelector('[data-pane="settings"]');
    const group=document.createElement('section');group.className='mobile-feedback';
    group.innerHTML=`<h3>声音与触感</h3><div class="row mobile-audio-row"><label for="mobile-sound-toggle">游戏音效</label><div><button id="mobile-sound-toggle" class="btn small" type="button"></button> <button id="mobile-test-sound" class="btn small" type="button">测试声音</button></div></div><p id="mobile-sound-status" class="mobile-status" aria-live="polite"></p><div class="row mobile-audio-row"><label for="mobile-haptics-toggle">设备震动</label><div><button id="mobile-haptics-toggle" class="btn small" type="button"></button> <button id="mobile-test-haptics" class="btn small" type="button">测试震动</button></div></div><p id="mobile-haptics-status" class="mobile-status"></p>`;
    settings.appendChild(group);
    const soundButton=group.querySelector('#mobile-sound-toggle'),hapticsButton=group.querySelector('#mobile-haptics-toggle'),soundStatus=group.querySelector('#mobile-sound-status'),hapticStatus=group.querySelector('#mobile-haptics-status'),hapticsTest=group.querySelector('#mobile-test-haptics');
    function refresh(){
      soundButton.textContent=options.sound?'已开启':'已关闭';soundButton.setAttribute('aria-pressed',String(options.sound));
      hapticsButton.disabled=!supported;hapticsTest.disabled=!supported;hapticsButton.textContent=supported?(options.haptics?'已开启':'已关闭'):'不支持';hapticsButton.setAttribute('aria-pressed',String(supported&&options.haptics));
      hapticStatus.textContent=supported?'开火、受击、换弹完成与任务完成时提供短震动。实际效果取决于系统设置。':'此浏览器不支持设备震动。iPhone Safari 可使用音效、后坐力和受击画面反馈。';
      if(!ctx)soundStatus.textContent='当前浏览器无法启动声音。';
      else if(!options.sound)soundStatus.textContent='游戏音效已关闭。';
      else if(ctx.state!=='running')soundStatus.textContent='点“测试声音”或“开始任务”开启声音。';
      else soundStatus.textContent='声音已就绪。若听不到，请检查媒体音量、静音模式及耳机连接。';
    }
    soundButton.addEventListener('click',()=>{options.sound=!options.sound;applyVolume();save();if(options.sound)unlock();refresh()});
    group.querySelector('#mobile-test-sound').addEventListener('click',()=>{
      options.sound=true;
      if(requestedVolume===0){requestedVolume=.8;game.game.menus.settings.volume=.8;const slider=document.querySelector('#s-vol');slider.value='80';slider.dispatchEvent(new Event('input',{bubbles:true}))}
      applyVolume();save();unlock();
      if(ctx)ctx.resume().then(()=>{tone(660,.12,.16);tone(880,.15,.13,.16);refresh()}).catch(()=>{soundStatus.textContent='声音尚未解锁，请再次点击测试。'});
    });
    hapticsButton.addEventListener('click',()=>{options.haptics=!options.haptics;save();if(!options.haptics)navigator.vibrate(0);else buzz(20,true);refresh()});
    hapticsTest.addEventListener('click',()=>{if(!options.haptics){options.haptics=true;save();refresh()}const accepted=buzz([20,50,30],true);hapticStatus.textContent=accepted?'已发送测试震动；是否有触感请以手机体验为准。':'浏览器未接受震动请求。'});
    for(const event of ['touchstart','touchend','pointerdown','keydown'])document.addEventListener(event,unlock,{capture:true,passive:true});
    ctx?.addEventListener('statechange',refresh);
    game.events.on('weapon:fire',()=>buzz(12));
    game.events.on('player:hit',()=>buzz([30,25,40],true));
    game.events.on('weapon:reload',event=>{if(event.phase==='done')buzz([10,30,16])});
    game.events.on('objective:done',()=>{buzz([25,45,25,45,45],true);tone(740,.09,.08);tone(990,.12,.07,.1)});
    game.events.on('player:hitEnemy',event=>{tone(event.killed?1040:780,.045,event.killed?.07:.035)});
    game.events.on('game:state',event=>{if(event.state!=='playing'&&supported)navigator.vibrate(0)});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(supported)navigator.vibrate(0);for(const oscillator of activeTones){try{oscillator.stop()}catch{}}}refresh()});
    window.SaltlineMobile.feedback={get sound(){return options.sound},get haptics(){return options.haptics},supported,get volume(){return requestedVolume},get audioState(){return ctx?.state||'unavailable'}};
    refresh();
  }};
})();
