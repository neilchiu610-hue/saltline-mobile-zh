"""Rebuild the mobile edition from the pinned, unmodified upstream commit."""
from pathlib import Path
import json,re,subprocess
root=Path(__file__).resolve().parents[1]
base='09c51774cd77aad750bd2d6c42af2b1020cb668d'
p=subprocess.check_output(['git','show',base+':index.html'],cwd=root,text=True)
def change(old,new,count=None):
 global p
 found=p.count(old)
 if not found or (count is not None and found!=count):raise RuntimeError(f'Expected {count or "at least one"} of {old[:90]!r}, found {found}')
 p=p.replace(old,new)
# Replace only the touch-input implementation, preserving keyboard and gamepad paths.
a=p.index('let M=null,E=0,w=-1',p.index('function v_('));b=p.index('let X={0:"jump"',a)
p=p[:a]+(root/'mobile/touch-input.fragment.js').read_text()+p[b:]
change('M&&(M.btn.ads.classList.remove("active"),ie(),q=-1,D=-1)','resetTouch()',1)
change('w>=0&&(V+=H,Y+=O', 'w!==null&&(V+=H,Y+=O',1)
change('function B(){s.clear(),f.look.dx=0,f.look.dy=0}return f}', 'function B(){s.clear(),f.look.dx=0,f.look.dy=0}if(navigator.maxTouchPoints>0||matchMedia("(pointer:coarse)").matches)K();return f}',1)
a=p.index('var $C=`');b=p.index('function pM(',a)
p=p[:a]+(root/'mobile/controls-zh.html').read_text()+p[b:]
# Exact visible-text substitutions. Internal game enums and identifiers stay unchanged.
html={
'Port Authority Breach Unit':'港务局突击队',r'Saltline Terminal \xB7 05:42':'盐线码头 · 05:42',
'SALTLINE':'盐线行动',r'The port\u2019s security net has gone feral. Cut its three uplinks. Reach the boat.':'港口安防系统已经失控。切断三座中继站，然后赶往接应船。',
'Deploy':'开始任务','Settings':'设置','Controls':'操作说明',
'Every surface, machine and sound is generated in your browser. Nothing is downloaded.':'手机横屏适配 v4 · 左摇杆移动 · 右侧滑动瞄准 · 按住开火',
'Operation on hold':'行动暂停','Paused':'已暂停','Resume':'继续游戏','Restart mission':'重新开始',
'Breacher down':'突击队员倒下','Signal lost':'行动失败','Time survived':'坚持时间','Relays cut':'已切断中继站','Retry':'再试一次',
'Berth 4 \\xB7 Debrief':'4 号泊位 · 任务报告','Saltline is dark':'任务完成','Rating':'行动评价','Clean':'干净利落',
'Time':'用时','Accuracy':'命中率','Machines destroyed':'击毁目标','Retries':'重试次数','Redeploy':'再玩一局','Close':'关闭',
'Graphics quality':'画面质量','Mouse sensitivity':'视角灵敏度','Invert Y':'反转上下视角','Off':'关闭','Master volume':'总音量','Field of view':'视野范围',
'Display':'显示模式','Enter fullscreen':'进入全屏',r'Keyboard \xB7 Mouse':'键盘与鼠标','Touch':'触屏操作','Gamepad':'手柄',
'Objective':'当前任务','Relays':'中继站','Vitals':'生命','Control':'指挥中心','Weak point':'弱点命中',
r'Saltline Terminal \xB7 Berth 4 \xB7 05:42':'盐线码头 · 4 号泊位 · 05:42',r'Port Authority Breach Unit \u2014 one breacher, no backup':'港务局突击队 · 单人渗透，无人支援',
'Raising the terminal':'正在载入码头',
}
for old,new in html.items():
 pattern='>'+old+'<'
 if pattern in p:p=p.replace(pattern,'>'+new+'<')
 else:print('HTML text not present:',old)
# Remove the unused desktop-at-a-glance legend; full desktop controls remain in the panel.
a=p.index('      <aside class="m-legend"');b=p.index('      </aside>',a)+len('      </aside>');p=p[:a]+p[b:]
change('<p class="m-note">手机横屏适配 v4 · 左摇杆移动 · 右侧滑动瞄准 · 按住开火</p>','<p class="m-note">手机横屏适配 v4 · 左摇杆移动 · 右侧滑动瞄准 · 按住开火</p><p class="rotate-note">请横屏，获得更宽的视野与操作空间。</p>',1)
change('${U}</button>','${({low:"低",medium:"中",high:"高",ultra:"极高"})[U]}</button>',1)
phrases={
'Touch controls active':'左摇杆移动 · 右侧滑动转向 · 按住开火',
r'Mouse capture unavailable \u2014 move the mouse to look, rest it at a screen edge to keep turning \xB7 click fires \xB7 arrows or IJKL also turn':'鼠标未锁定：移动鼠标转向，点击开火，也可用方向键转向',
r'Mouse captured \u2014 Esc releases it':'鼠标已锁定，按 Esc 释放','Click the view to capture the mouse':'点击画面锁定鼠标','Resume recaptures the mouse.':'继续后将重新锁定鼠标。',
'Fullscreen is not available here':'当前浏览器不支持全屏','Exit fullscreen':'退出全屏','Enter fullscreen':'进入全屏',
'Stacking containers':'正在布置集装箱','Raising the cranes':'正在架设吊机','Flooding the apron':'正在生成码头地面','Waking the renderer':'正在启动画面','Mixing paint, rust and rain':'正在生成材质与雨景','Loading tracers and smoke':'正在加载弹道与烟雾','Checking the rifle':'正在检查武器','Waking the Harbormaster':'正在启动敌方安防','Waiting for first light':'正在准备第一帧','Ready':'准备就绪',
'PAC-9 Longshore':'PAC-9 港岸步枪',
r'Breacher, this is Control. The Harbormaster holds the berth. Cut its three uplinks \u2014 yard, shed, quay.':'突击队员，这里是指挥中心。泊位已被接管。切断堆场、仓库和码头的三座中继站。',
'It has seen you. Gulls fly, Hounds walk. Put them down.':'你已被发现。空中有无人机，地面有机械犬。消灭它们。',
r'One relay dark. It felt that \u2014 machines inbound.':'第一座已切断。敌方发现了异常，增援正在赶来。',
'Two dark. It is throwing everything it has left at you.':'第二座已切断。敌方正全力围攻你。',
'All three dark. The boat is holding at the quay ladder, south end. Run.':'三座全部切断。接应船在南端码头的梯子旁，快撤！',
'You are hit hard. Get behind steel and breathe.':'你受伤了。躲到掩体后，稍作恢复。',
'Breacher is aboard. Saltline is dark. Good work.':'队员已登船。盐线安防已经瘫痪，任务完成。',
'Get to the boat':'前往接应船撤离','Cut the three uplink relays':'切断三座中继站','Cut the last relay':'切断最后一座中继站','Cut the remaining ${P} relays':'切断剩余 ${P} 座中继站',
'Hauled out of the water':'已脱离水域',r'Relays still live \u2014 the boat will not wait under fire':'中继站仍在运行，请先切断全部中继站',
'Reloading':'换弹中','Low ammo':'弹药不足',r'R \u2014 Reload':'R · 换弹','Empty':'弹药耗尽',
'Quality was picked for this device (${U||"default"}). Lower it if the frame rate struggles.':'已为此设备自动选择画质。若画面卡顿，请调低画质。',
'Quality changes apply at once; shadows and reflections may take a moment to rebuild.':'画质立即生效；阴影与反射可能需要片刻更新。',
}
for old,new in phrases.items():
 if old in p:p=p.replace(old,new)
 else:print('Phrase not present:',old)
for old,new in [('"On"','"开启"'),('"Off"','"关闭"'),('"Reload"','"换弹"'),('"USE"','"交互"'),('"Messy"','"惊险脱身"'),('"Loud"','"火力全开"'),('"Steady"','"稳扎稳打"'),('"Clean"','"干净利落"'),('"Sharp"','"精准高效"'),('"Surgical"','"完美行动"')]:
 if old in p:p=p.replace(old,new)
change('GC={0:"N",45:"NE",90:"E",135:"SE",180:"S",225:"SW",270:"W",315:"NW"}','GC={0:"北",45:"东北",90:"东",135:"东南",180:"南",225:"西南",270:"西",315:"西北"}',1)
change('jC=["NORTH","NORTH-EAST","EAST","SOUTH-EAST","SOUTH","SOUTH-WEST","WEST","NORTH-WEST"]','jC=["北方","东北","东方","东南","南方","西南","西方","西北"]',1)
change('`Hold ${_e} \\u2014 ${k}`','`按住${_e} · ${k}`',1)
change('"Cut relay "+V.short','"切断中继站 "+V.short',1)
change('"Contact \\u2014 "+jC','"敌情 · "+jC',1)
change('`<b>${ce}</b> destroyed`','`<b>${({GULL:"无人机",HOUND:"机械犬",MACHINE:"敌方机械"})[ce]||ce}</b> 已击毁`',1)
# Replace the long help paragraphs without touching keyboard event semantics.
p=re.sub(r'<p class="panel-note">If the browser will not capture the mouse,.*?</p>','<p class="panel-note">若浏览器无法锁定鼠标，可用方向键转向，Enter 开火。</p>',p)
p=re.sub(r'<p class="panel-note">Sticks move and look.*?</p>','<p class="panel-note">左摇杆移动，右摇杆转向；RT 开火，LT 瞄准，A 跳跃，B 蹲伏，X 换弹，Y 交互，L3 冲刺，Start 暂停。</p>',p)
for old,new in [('Saltline','盐线行动'),('Paused','已暂停'),('Signal lost','行动失败'),('Debrief','任务报告'),('Settings and controls','设置与操作说明')]:
 p=p.replace('aria-label="'+old+'"','aria-label="'+new+'"')
# Local Chinese system fonts remove a network dependency from startup.
p=re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>\n?','',p)
change('<html lang="en">','<html lang="zh-CN">',1)
change('<title>Saltline</title>','<title>盐线行动 · 手机中文版</title>',1)
change('<style>','<link rel="stylesheet" href="mobile/mobile.css?v=4.1">\n<style>',1)
# Override CSS must come after the upstream stylesheet.
change('<link rel="stylesheet" href="mobile/mobile.css?v=4.1">\n','',1)
change('</style>','</style>\n<link rel="stylesheet" href="mobile/mobile.css?v=4.1">',1)
change('<script>','<script src="mobile/feedback.js?v=4"></script>\n<script>',1)
change('t.game=mM(t)}await Nr','t.game=mM(t);window.SaltlineMobile.attach(t)}await Nr',1)
# Load messages outside the UI code.
(root/'index.html').write_text(p)
print('Built',len(p.encode()),'bytes')
