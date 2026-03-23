// ═══════════════════════════════════════════════════════════
//  HOOK MINER — Gold Miner mini-game for BOOM sub-tab
//  All vars prefixed with hk_ to avoid conflicts
// ═══════════════════════════════════════════════════════════

var HK = (function(){

var C,X,W,H,DPR=2;
var IMG={};
var SRC={
  ore:'currency-ore.png',
  gem:'assets-v8-new/currency-gem.png',
  rock:'icons-transparent/game-icons/vein-copper.png',
  bomb:'hook-tnt.png',
  bag:'mystery-bag.png',
  bg:'hook-bg.webp',
};
var imgLoaded=0,imgTotal=Object.keys(SRC).length;

var GROUND_Y=0.28;
var HOOK_Y;
var SWING_SPD=0.024,MAX_ANG=Math.PI*0.44;
var SHOOT_SPD=8,RETRACT_SPD=4.5;
var DURATION=30;

var DEFS=[
  {type:'ore_s',img:'ore',w:48,h:48,value:50,weight:1.0,reward:'ore',glow:'#e8a838'},   // 0
  {type:'ore_l',img:'ore',w:66,h:66,value:150,weight:0.55,reward:'ore',glow:'#e8a838'}, // 1
  {type:'gem',img:'gem',w:52,h:52,value:200,weight:0.85,reward:'gem',glow:'#6bb8d4'},    // 2
  {type:'rock',img:'rock',w:64,h:64,value:15,weight:0.25,reward:'ore',glow:'#8a6030'},   // 3
  {type:'bomb',img:'bomb',w:54,h:54,value:-150,weight:0.9,reward:'none',glow:'#ff4444'}, // 4
  {type:'bag',img:'bag',w:50,h:50,value:250,weight:0.7,reward:'bag',glow:'#cd7f32'},     // 5
];

var ang=0,angDir=1,state='swing',rope=0,hx=0,hy=0;
var caught=null,items=[],score=0,numCaught=0;
var oreG=0,gemG=0,starG=0,crateG=0,shakeT=0;
var timeLeft=DURATION,running=false,animId=null,timerInt=null;
var floats=[],particles=[];
var announce={text:'',sub:'',alpha:0,scale:0,color:'#e8a838'};
var combo=0,comboMult=1; // combo: consecutive catches, comboMult: score multiplier
var inited=false;

function init(){
  if(inited) return;
  inited=true;
  C=document.getElementById('hkCanvas');
  if(!C) return;
  X=C.getContext('2d');

  Object.keys(SRC).forEach(function(k){
    IMG[k]=new Image();
    IMG[k].onload=function(){imgLoaded++;if(imgLoaded>=imgTotal&&!running)drawIdle();};
    IMG[k].onerror=function(){imgLoaded++;};
    IMG[k].src=SRC[k];
  });

  C.addEventListener('click',fire);
  C.addEventListener('touchstart',function(e){e.preventDefault();fire();},{passive:false});

  resize();
  window.addEventListener('resize',function(){resize();if(!running)drawIdle();});
  updateStartButtons();
}

function updateStartButtons(){
  var startEl=document.getElementById('hkStart');
  if(!startEl)return;
  // Find or create button area
  var btnArea=startEl.querySelector('.hk-start-btns');
  if(!btnArea){
    btnArea=document.createElement('div');
    btnArea.className='hk-start-btns';
    btnArea.style.cssText='display:flex;flex-direction:column;align-items:center;gap:6px;';
    // Insert before the info tooltips
    var info=startEl.querySelector('div:last-child');
    startEl.insertBefore(btnArea,info);
  }
  btnArea.innerHTML='';
  if(canPlayFree()){
    btnArea.innerHTML='<button onclick="hkStartGame(\'free\')" style="padding:12px 36px;background:linear-gradient(135deg,#e8a838,#c87a20);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:16px;color:#1a0800;letter-spacing:2px;cursor:pointer;box-shadow:0 4px 20px rgba(232,168,56,.3);">PLAY FREE</button>';
  } else {
    var cd=formatCooldown(getFreeCooldown());
    btnArea.innerHTML='<div style="font-size:9px;color:rgba(232,168,56,.3);margin-bottom:2px;">Free play in '+cd+'</div>'
      +'<div style="display:flex;gap:8px;">'
      +'<button onclick="hkStartGame(\'star\')" style="padding:10px 22px;background:linear-gradient(135deg,#f0c040,#c8961c);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:14px;color:#1a0800;cursor:pointer;">2⭐ PLAY</button>'
      +'<button onclick="hkStartGame(\'gem\')" style="padding:10px 22px;background:linear-gradient(135deg,#6bb8d4,#4898b4);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:14px;color:#1a0800;cursor:pointer;">2💎 PLAY</button>'
      +'</div>';
  }
}

function resize(){
  if(!C)return;
  // Use viewport dimensions — hook-content is fullscreen within boom tab
  W=Math.min(window.innerWidth,430);
  // Height = viewport minus tab bar (56px) minus boom-tabs bar (~36px)
  H=window.innerHeight-56-36;
  if(W<10)W=430;if(H<100)H=600;
  C.width=W*DPR;C.height=H*DPR;
  C.style.width=W+'px';C.style.height=H+'px';
  X.setTransform(DPR,0,0,DPR,0,0);
  HOOK_Y=H*GROUND_Y;
}

function spawnItems(){
  items=[];
  var sY=H*GROUND_Y+30,eY=H*0.82,count=20;
  for(var i=0;i<count;i++){
    var roll=Math.random(),def;
    if(roll<0.08)def=DEFS[5];       // bag 8%
    else if(roll<0.22)def=DEFS[2];  // gem 14%
    else if(roll<0.36)def=DEFS[1];  // ore large 14%
    else if(roll<0.50)def=DEFS[3];  // rock 14%
    else if(roll<0.62)def=DEFS[4];  // bomb 12%
    else def=DEFS[0];                // ore small 38%
    var x=25+Math.random()*(W-50),y=sY+Math.random()*(eY-sY),ok=true;
    for(var j=0;j<items.length;j++){var dx=x-items[j].x,dy=y-items[j].y;if(Math.sqrt(dx*dx+dy*dy)<55){ok=false;break;}}
    if(!ok){i--;continue;}
    items.push({x:x,y:y,w:def.w,h:def.h,type:def.type,img:def.img,value:def.value,weight:def.weight,reward:def.reward,glow:def.glow,bob:Math.random()*Math.PI*2,rot:(Math.random()-.5)*0.7});
  }
}

function spawnParticles(px,py,color,n){
  for(var i=0;i<(n||12);i++){var a=Math.random()*Math.PI*2,s=1.5+Math.random()*3;
    particles.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:1,decay:.025+Math.random()*.02,size:2+Math.random()*3,color:color});
  }
}
function addFloat(fx,fy,val,text){floats.push({x:fx,y:fy,text:text||((val>0?'+':'')+val),color:val>0?'#e8a838':'#c4555a',alpha:1,vy:-2});}
function showAnn(text,sub,color){announce={text:text,sub:sub||'',alpha:1,scale:0.3,color:color||'#e8a838'};}

// ═══ DRAW ═══
function drawBg(){
  if(IMG.bg&&IMG.bg.complete){X.drawImage(IMG.bg,0,0,W,H);}
  else{var g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a1500');g.addColorStop(0.15,'#3d1e00');g.addColorStop(1,'#0d0500');X.fillStyle=g;X.fillRect(0,0,W,H);}
  var gy=H*GROUND_Y;
  var gg=X.createLinearGradient(0,0,0,gy+10);gg.addColorStop(0,'rgba(10,8,6,.95)');gg.addColorStop(0.7,'rgba(26,18,10,.9)');gg.addColorStop(1,'rgba(42,28,14,.4)');
  X.fillStyle=gg;X.fillRect(0,0,W,gy+10);
  X.strokeStyle='#5a3a18';X.lineWidth=2;X.beginPath();X.moveTo(0,gy);X.lineTo(W,gy);X.stroke();
  X.fillStyle='rgba(90,58,24,.3)';for(var i=0;i<20;i++){X.beginPath();X.arc(Math.random()*W,gy-3+Math.random()*6,1+Math.random()*2,0,Math.PI*2);X.fill();}
  var fog=X.createLinearGradient(0,H*0.75,0,H);fog.addColorStop(0,'transparent');fog.addColorStop(1,'rgba(10,8,6,.5)');X.fillStyle=fog;X.fillRect(0,H*0.75,W,H*0.25);
  X.globalAlpha=0.08;for(var i=0;i<3;i++){X.strokeStyle='#8a5020';X.lineWidth=1;X.setLineDash([15,20,5,20]);X.beginPath();X.moveTo(0,H*(0.35+i*0.2));X.lineTo(W,H*(0.35+i*0.2));X.stroke();}X.setLineDash([]);X.globalAlpha=1;
}

function drawDerrick(){
  var mx=W/2,gy=H*GROUND_Y,hudBot=48;
  var topY=hudBot+(gy-hudBot)*0.25;
  X.lineCap='round';X.lineJoin='round';
  X.strokeStyle='rgba(0,0,0,.25)';X.lineWidth=10;X.beginPath();X.moveTo(mx-55,gy+2);X.lineTo(mx,topY-2);X.lineTo(mx+55,gy+2);X.stroke();
  X.strokeStyle='#4a2810';X.lineWidth=10;X.beginPath();X.moveTo(mx-52,gy);X.lineTo(mx-7,topY);X.stroke();X.beginPath();X.moveTo(mx+52,gy);X.lineTo(mx+7,topY);X.stroke();
  X.strokeStyle='#6a3c1c';X.lineWidth=4;X.beginPath();X.moveTo(mx-50,gy-2);X.lineTo(mx-8,topY+2);X.stroke();X.beginPath();X.moveTo(mx+50,gy-2);X.lineTo(mx+8,topY+2);X.stroke();
  X.strokeStyle='#7a4c28';X.lineWidth=1.5;X.beginPath();X.moveTo(mx-48,gy-4);X.lineTo(mx-9,topY+1);X.stroke();X.beginPath();X.moveTo(mx+48,gy-4);X.lineTo(mx+9,topY+1);X.stroke();
  var midY=(gy+topY)/2;
  X.strokeStyle='#3a1c08';X.lineWidth=3.5;X.beginPath();X.moveTo(mx-40,gy-12);X.lineTo(mx+40,gy-12);X.stroke();X.beginPath();X.moveTo(mx-25,midY);X.lineTo(mx+25,midY);X.stroke();
  X.lineWidth=2.5;X.beginPath();X.moveTo(mx-42,gy-6);X.lineTo(mx+15,midY-8);X.stroke();X.beginPath();X.moveTo(mx+42,gy-6);X.lineTo(mx-15,midY-8);X.stroke();
  X.lineWidth=2;X.beginPath();X.moveTo(mx-28,midY+5);X.lineTo(mx+10,topY+12);X.stroke();X.beginPath();X.moveTo(mx+28,midY+5);X.lineTo(mx-10,topY+12);X.stroke();
  X.fillStyle='#4a2810';X.fillRect(mx-16,topY-5,32,10);X.fillStyle='#5a3418';X.fillRect(mx-14,topY-4,28,3);
  X.fillStyle='#8a6030';X.beginPath();X.arc(mx-10,topY,2.5,0,Math.PI*2);X.fill();X.beginPath();X.arc(mx+10,topY,2.5,0,Math.PI*2);X.fill();
  var py=topY+2;X.fillStyle='rgba(0,0,0,.2)';X.beginPath();X.arc(mx+1,py+2,16,0,Math.PI*2);X.fill();
  var rg=X.createRadialGradient(mx-3,py-3,2,mx,py,15);rg.addColorStop(0,'#a07040');rg.addColorStop(0.7,'#6a4020');rg.addColorStop(1,'#4a2810');X.fillStyle=rg;X.beginPath();X.arc(mx,py,15,0,Math.PI*2);X.fill();
  X.strokeStyle='#8a5830';X.lineWidth=2.5;X.beginPath();X.arc(mx,py,15,0,Math.PI*2);X.stroke();
  X.fillStyle='#8a5830';X.beginPath();X.arc(mx,py,10,0,Math.PI*2);X.fill();X.strokeStyle='#5a3418';X.lineWidth=2;X.beginPath();X.arc(mx,py,12,0,Math.PI*2);X.stroke();
  X.strokeStyle='#4a2810';X.lineWidth=2;var spR=Date.now()*0.0008;for(var s=0;s<6;s++){var sa=s*Math.PI/3+spR;X.beginPath();X.moveTo(mx+Math.cos(sa)*4,py+Math.sin(sa)*4);X.lineTo(mx+Math.cos(sa)*10,py+Math.sin(sa)*10);X.stroke();}
  X.fillStyle='#c87a00';X.beginPath();X.arc(mx,py,5,0,Math.PI*2);X.fill();X.strokeStyle='#e8a838';X.lineWidth=1;X.stroke();X.fillStyle='#f5d060';X.beginPath();X.arc(mx-1,py-1,2.5,0,Math.PI*2);X.fill();
  X.fillStyle='rgba(0,0,0,.15)';X.fillRect(mx-62,gy+3,124,4);X.fillStyle='#3a1c08';X.fillRect(mx-60,gy-4,120,8);X.fillStyle='#4a2810';X.fillRect(mx-58,gy-3,116,5);
  X.strokeStyle='#2a1204';X.lineWidth=1;for(var p=-54;p<=54;p+=14){X.beginPath();X.moveTo(mx+p,gy-4);X.lineTo(mx+p,gy+4);X.stroke();}
  X.fillStyle='#8a6030';[-54,-30,0,30,54].forEach(function(bx){X.beginPath();X.arc(mx+bx,gy,2,0,Math.PI*2);X.fill();});
  X.fillStyle='#5a3418';X.beginPath();X.arc(mx+42,gy-12,7,0,Math.PI*2);X.fill();X.strokeStyle='#8a6030';X.lineWidth=1;X.beginPath();X.arc(mx+42,gy-12,5,0,Math.PI*2);X.stroke();X.beginPath();X.arc(mx+42,gy-12,3,0,Math.PI*2);X.stroke();
  X.fillStyle='rgba(232,168,56,.08)';X.beginPath();X.arc(mx-42,gy-18,12,0,Math.PI*2);X.fill();X.fillStyle='#c87a00';X.fillRect(mx-44,gy-22,4,8);X.fillStyle='#e8a838';X.beginPath();X.arc(mx-42,gy-18,2,0,Math.PI*2);X.fill();
}

function drawClouds(){
  var t=Date.now()/4000;
  X.globalAlpha=0.04;X.fillStyle='#c89050';
  // 3 subtle cloud shapes drifting
  for(var i=0;i<3;i++){
    var cx=(W*0.3*i+t*30+i*80)%(W+100)-50;
    var cy=25+i*12;
    X.beginPath();
    X.ellipse(cx,cy,35+i*10,8+i*2,0,0,Math.PI*2);X.fill();
    X.beginPath();
    X.ellipse(cx+20,cy-3,20+i*5,6,0,0,Math.PI*2);X.fill();
  }
  X.globalAlpha=1;
}

function drawCombo(){
  if(comboMult<=1||!running)return;
  X.save();
  var pulse=0.7+Math.sin(Date.now()/200)*0.3;
  X.globalAlpha=pulse;
  X.fillStyle=comboMult>=3?'#f0c040':'#e8a838';
  X.font='bold 14px Fredoka One';
  X.textAlign='right';
  X.shadowColor=X.fillStyle;X.shadowBlur=10;
  X.fillText('🔥 x'+comboMult+' COMBO',W-12,HOOK_Y+20);
  // Streak counter
  X.font='bold 10px Manrope';
  X.fillStyle='rgba(232,168,56,.5)';X.shadowBlur=0;
  X.fillText(combo+' streak',W-12,HOOK_Y+34);
  X.restore();
}

function drawItems(){
  var t=Date.now()/1000;
  items.forEach(function(it){
    var img=IMG[it.img];if(!img||!img.complete)return;
    var bob=Math.sin(t*1.5+it.bob)*3,iw=it.w,ih=it.h;
    var curRot=it.rot+Math.sin(t*0.8+it.bob)*0.12;

    // Proximity glow — items glow brighter when hook is near
    var dx=hx-it.x,dy=hy-it.y,dist=Math.sqrt(dx*dx+dy*dy);
    var proxGlow=dist<120?Math.max(0,(120-dist)/120)*0.25:0;

    // Value glow + proximity glow
    var glowAlpha=(it.value>=200?(.12+Math.sin(t*3+it.bob)*.06):0)+proxGlow;
    if(glowAlpha>0.01){X.save();X.translate(it.x,it.y+bob);X.rotate(curRot);X.globalAlpha=glowAlpha;X.shadowColor=it.glow;X.shadowBlur=proxGlow>0.1?25:20;X.drawImage(img,-iw/2-4,-ih/2-4,iw+8,ih+8);X.restore();}

    // Shadow
    X.save();X.globalAlpha=0.12;X.fillStyle='#000';X.beginPath();X.ellipse(it.x,it.y+iw*0.28+8+bob,iw*0.28,3,0,0,Math.PI*2);X.fill();X.restore();
    // Item
    X.save();X.translate(it.x,it.y+bob);X.rotate(curRot);var cr=Math.min(iw,ih)*0.48;X.beginPath();X.arc(0,0,cr,0,Math.PI*2);X.clip();X.drawImage(img,-iw/2,-ih/2,iw,ih);X.restore();
  });
}

function drawRope(){
  var ox=W/2,oy=HOOK_Y;
  var dx=hx-ox,dy=hy-oy,dist=Math.sqrt(dx*dx+dy*dy),seg=Math.max(1,Math.floor(dist/8));
  X.strokeStyle='#5a4a38';X.lineWidth=2;X.beginPath();X.moveTo(ox,oy);X.lineTo(hx,hy);X.stroke();
  X.fillStyle='#6a6a78';for(var i=1;i<seg;i++){var t=i/seg;if(i%2===0){X.beginPath();X.arc(ox+dx*t,oy+dy*t,2,0,Math.PI*2);X.fill();}}
  var rA=Math.atan2(hy-oy,hx-ox);
  if(caught){var ci=IMG[caught.img];if(ci&&ci.complete){var cw=caught.w*0.65,ch=caught.h*0.65;X.save();X.translate(hx,hy);X.rotate(Math.sin(Date.now()/200)*0.08);X.drawImage(ci,-cw/2,-ch/2,cw,ch);X.restore();}}
  X.save();X.translate(hx,hy);X.rotate(rA+Math.PI/2);
  if(caught){
    var L=20;X.lineCap='round';
    X.strokeStyle='#3a3a44';X.lineWidth=4;X.beginPath();X.moveTo(-3,0);X.quadraticCurveTo(-L*0.4,L*0.5,-L*0.15,L*0.9);X.stroke();X.beginPath();X.moveTo(3,0);X.quadraticCurveTo(L*0.4,L*0.5,L*0.15,L*0.9);X.stroke();
    X.strokeStyle='#8a8a98';X.lineWidth=2.5;X.beginPath();X.moveTo(-3,0);X.quadraticCurveTo(-L*0.4,L*0.5,-L*0.15,L*0.9);X.stroke();X.beginPath();X.moveTo(3,0);X.quadraticCurveTo(L*0.4,L*0.5,L*0.15,L*0.9);X.stroke();
    X.strokeStyle='rgba(200,210,220,.3)';X.lineWidth=1;X.beginPath();X.moveTo(-2,1);X.quadraticCurveTo(-L*0.35,L*0.4,-L*0.1,L*0.8);X.stroke();
    X.fillStyle='#e8a838';X.beginPath();X.arc(-L*0.15,L*0.9,2.5,0,Math.PI*2);X.fill();X.beginPath();X.arc(L*0.15,L*0.9,2.5,0,Math.PI*2);X.fill();
  } else {
    var sz=22;
    X.fillStyle='#3a3a44';X.beginPath();X.moveTo(0,sz+1);X.lineTo(-8,1);X.lineTo(-5,-6);X.lineTo(0,-3);X.lineTo(5,-6);X.lineTo(8,1);X.closePath();X.fill();
    X.fillStyle='#7a7a88';X.beginPath();X.moveTo(0,sz);X.lineTo(-7,1);X.lineTo(-4,-5);X.lineTo(0,-2);X.lineTo(4,-5);X.lineTo(7,1);X.closePath();X.fill();
    X.fillStyle='rgba(200,210,220,.35)';X.beginPath();X.moveTo(0,sz-5);X.lineTo(-3,3);X.lineTo(0,1);X.closePath();X.fill();
    X.lineCap='round';X.strokeStyle='#3a3a44';X.lineWidth=4;X.beginPath();X.moveTo(-6,3);X.lineTo(-15,12);X.stroke();X.beginPath();X.moveTo(6,3);X.lineTo(15,12);X.stroke();
    X.strokeStyle='#8a8a98';X.lineWidth=2.5;X.beginPath();X.moveTo(-6,3);X.lineTo(-14,11);X.stroke();X.beginPath();X.moveTo(6,3);X.lineTo(14,11);X.stroke();
    X.fillStyle='#e8a838';X.beginPath();X.arc(-14,11,2.5,0,Math.PI*2);X.fill();X.beginPath();X.arc(14,11,2.5,0,Math.PI*2);X.fill();
    X.fillStyle='#e8a838';X.beginPath();X.moveTo(0,sz+1);X.lineTo(-2,sz-4);X.lineTo(2,sz-4);X.closePath();X.fill();
  }
  X.fillStyle='#3a3a44';X.beginPath();X.arc(0,-5,6,0,Math.PI*2);X.fill();
  X.fillStyle='#6a6a78';X.beginPath();X.arc(0,-5,4.5,0,Math.PI*2);X.fill();
  X.fillStyle='#e8a838';X.beginPath();X.arc(0,-5,2.5,0,Math.PI*2);X.fill();
  X.fillStyle='#f5d060';X.beginPath();X.arc(-0.5,-5.5,1,0,Math.PI*2);X.fill();
  X.restore();
}

function drawParticles(){
  particles=particles.filter(function(p){return p.life>0.01;});
  particles.forEach(function(p){
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.life-=p.decay;if(p.life<=0)return;
    var r1=Math.max(0.5,p.size*p.life),r2=Math.max(0.2,r1*0.4);
    X.save();X.globalAlpha=Math.max(0,p.life);X.fillStyle=p.color;X.beginPath();X.arc(p.x,p.y,r1,0,Math.PI*2);X.fill();
    X.fillStyle='#fff';X.beginPath();X.arc(p.x,p.y,r2,0,Math.PI*2);X.fill();X.restore();
  });
}

function drawAnn(){
  if(announce.alpha<=0)return;
  announce.scale+=(1-announce.scale)*0.15;announce.alpha-=0.012;
  X.save();X.globalAlpha=Math.max(0,announce.alpha);X.translate(W/2,H*0.4);X.scale(announce.scale,announce.scale);
  X.fillStyle='rgba(0,0,0,.4)';X.beginPath();X.arc(0,0,60,0,Math.PI*2);X.fill();
  X.fillStyle=announce.color;X.font='bold 28px Fredoka One';X.textAlign='center';X.shadowColor=announce.color;X.shadowBlur=20;X.fillText(announce.text,0,0);
  if(announce.sub){X.shadowBlur=0;X.font='bold 13px Manrope';X.fillStyle='rgba(255,255,255,.7)';X.fillText(announce.sub,0,22);}
  X.restore();
}

function drawFloats(){
  floats=floats.filter(function(f){return f.alpha>0;});
  floats.forEach(function(f){X.save();X.globalAlpha=f.alpha;X.fillStyle=f.color;X.font='bold 18px Fredoka One';X.textAlign='center';X.shadowColor=f.color;X.shadowBlur=8;X.fillText(f.text,f.x,f.y);X.restore();f.y+=f.vy;f.alpha-=0.022;});
}

function updPos(){hx=W/2+Math.sin(ang)*rope;hy=HOOK_Y+Math.cos(ang)*rope;}

function update(){
  if(state==='swing'){ang+=SWING_SPD*angDir;if(Math.abs(ang)>=MAX_ANG)angDir*=-1;rope=25;}
  else if(state==='shoot'){
    rope+=SHOOT_SPD;updPos();
    if(hx<-10||hx>W+10||hy>H+10){state='retract';return;}
    for(var i=items.length-1;i>=0;i--){var it=items[i],dx=hx-it.x,dy=hy-it.y;if(Math.sqrt(dx*dx+dy*dy)<it.w/2+12){caught=it;items.splice(i,1);state='retract';if(typeof SND!=='undefined')SND.hookGrab();break;}}
  }else if(state==='retract'){
    var spd=caught?Math.max(1.5,RETRACT_SPD*caught.weight):RETRACT_SPD*2.5;
    rope-=spd;
    if(rope<=25){
      rope=25;
      if(caught){
        numCaught++;if(typeof SND!=='undefined')SND.hookRetract();
        // Apply combo multiplier to score
        var pts=Math.round(caught.value*comboMult);
        score+=pts;

        if(caught.reward==='ore')oreG+=Math.round(caught.value*comboMult);
        else if(caught.reward==='gem')gemG++;
        else if(caught.reward==='bag'){
          var r=Math.random();
          if(r<0.05){var st=1+Math.floor(Math.random()*3);starG+=st;addFloat(W/2,HOOK_Y+40,300,'+'+st+' ⭐');showAnn('⭐ +'+st+' STARS!','from Mystery Bag','#f0c040');}
          else if(r<0.40){oreG+=500;addFloat(W/2,HOOK_Y+40,500,'+500 ORE');}
          else if(r<0.68){gemG+=2;addFloat(W/2,HOOK_Y+40,200,'+2 💎');}
          else if(r<0.88){score+=200;addFloat(W/2,HOOK_Y+40,200,'+2 🎫');}
          else{crateG++;addFloat(W/2,HOOK_Y+40,300,'📦 CRATE!');}
        }

        // Combo logic
        if(caught.reward==='none'){
          // BOMB — combo multiplier makes it worse!
          shakeT=10;
          var bombLoss=Math.round(150*comboMult);
          showAnn('💥 BOOM!','-'+bombLoss+' pts'+(comboMult>1?' (x'+comboMult+' COMBO!)':''),'#c4555a');
          if(typeof SND!=='undefined')SND.bomb();
          combo=0;comboMult=1; // reset combo
        } else {
          combo++;
          if(combo>=3&&comboMult<2){
            comboMult=2;
            if(typeof SND!=='undefined')SND.combo(2);
            showAnn('🔥 COMBO x2!','All points doubled!','#e8a838');
          } else if(combo>=6&&comboMult<3){
            comboMult=3;
            if(typeof SND!=='undefined')SND.combo(3);
            showAnn('🔥🔥 COMBO x3!','TRIPLE points!','#f0c040');
          }
        }

        // Float text with combo indicator
        var txt=pts>0?'+'+pts:''+pts;
        if(caught.reward==='bag')txt='???';
        if(comboMult>1&&caught.reward!=='none'&&caught.reward!=='bag')txt+=(' x'+comboMult);
        addFloat(W/2,HOOK_Y+40,pts,txt);
        spawnParticles(W/2,HOOK_Y+30,caught.glow,caught.value>=200?18:10);
        if(caught.reward==='bag')showAnn('🎒 MYSTERY!','What\'s inside?','#cd7f32');

        document.getElementById('hkScore').textContent=Math.max(0,score);
        document.getElementById('hkCaught').textContent=numCaught;
        caught=null;
      } else {
        // Missed — hook came back empty
        if(combo>0){combo=0;comboMult=1;addFloat(W/2,HOOK_Y+40,0,'MISS');}
      }
      state='swing';
    }
    updPos();
  }
  updPos();if(rope<0)rope=25;
}

function loop(){
  X.save();
  if(shakeT>0){X.translate((Math.random()-.5)*6,(Math.random()-.5)*4);shakeT--;}
  X.clearRect(-10,-10,W+20,H+20);
  drawBg();drawClouds();drawDerrick();drawItems();drawRope();drawParticles();drawFloats();drawAnn();drawCombo();
  if(running)update();
  X.restore();
  if(running)animId=requestAnimationFrame(loop);
}

function drawIdle(){
  if(!C||!X)return;
  try{X.clearRect(0,0,W,H);drawBg();spawnItems();drawDerrick();drawItems();hx=W/2;hy=HOOK_Y+25;drawRope();}catch(e){}
}

var HOOK_COOLDOWN=12*60*60*1000; // 12 hours in ms

function canPlayFree(){
  if(typeof G==='undefined')return true;
  var last=G.hookLastFree||0;
  return(Date.now()-last)>=HOOK_COOLDOWN;
}

function getFreeCooldown(){
  if(typeof G==='undefined')return 0;
  var last=G.hookLastFree||0;
  var remaining=HOOK_COOLDOWN-(Date.now()-last);
  return Math.max(0,remaining);
}

function formatCooldown(ms){
  var h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
  return h+'h '+m+'m';
}

var payMode='free';

function start(mode){
  payMode=mode||'free';
  if(payMode==='free'){
    if(canPlayFree()){
      if(typeof G!=='undefined'){G.hookLastFree=Date.now();if(!G.stats)G.stats={};G.stats.hookPlays=(G.stats.hookPlays||0)+1;if(typeof saveG==='function')saveG();}
    } else {
      // Free not available — show announce, don't start
      showAnn('⏳ Cooldown!','Use 2⭐ or 2💎','#e8a838');
      return;
    }
  } else if(payMode==='star'){
    if(typeof G!=='undefined'&&G.stars>=2){G.stars-=2;if(!G.stats)G.stats={};G.stats.hookPlays=(G.stats.hookPlays||0)+1;if(typeof updateHUD==='function')updateHUD();if(typeof saveG==='function')saveG();}
    else{showAnn('Need 2⭐!','','#c4555a');return;}
  } else if(payMode==='gem'){
    if(typeof G!=='undefined'&&G.gems>=2){G.gems-=2;if(!G.stats)G.stats={};G.stats.hookPlays=(G.stats.hookPlays||0)+1;if(typeof updateHUD==='function')updateHUD();if(typeof saveG==='function')saveG();}
    else{showAnn('Need 2💎!','','#c4555a');return;}
  }

  ended=false;
  document.getElementById('hkStart').style.display='none';
  try{document.getElementById('hkEnd').style.display='none';}catch(e){}
  var oldOv=document.getElementById('hkEndOverlay');if(oldOv)oldOv.remove();
  document.getElementById('hkHud').style.display='flex';
  document.getElementById('hkTap').style.display='block';
  score=0;numCaught=0;oreG=0;gemG=0;starG=0;crateG=0;combo=0;comboMult=1;
  timeLeft=DURATION;ang=0;angDir=1;state='swing';rope=25;caught=null;floats=[];particles=[];
  document.getElementById('hkScore').textContent='0';
  document.getElementById('hkCaught').textContent='0';
  document.getElementById('hkTimer').textContent=timeLeft;
  document.getElementById('hkTimerFill').style.width='100%';
  spawnItems();running=true;
  if(animId)cancelAnimationFrame(animId);loop();
  if(timerInt)clearInterval(timerInt);
  timerInt=setInterval(function(){
    timeLeft--;document.getElementById('hkTimer').textContent=timeLeft;
    document.getElementById('hkTimerFill').style.width=(timeLeft/DURATION*100)+'%';
    if(timeLeft<=0)end();
  },1000);
}

var ended=false;
function end(){
  if(ended)return;ended=true;
  running=false;if(animId){cancelAnimationFrame(animId);animId=null;}clearInterval(timerInt);
  try{document.getElementById('hkHud').style.display='none';}catch(e){}
  try{document.getElementById('hkTap').style.display='none';}catch(e){}
  var fs=Math.max(0,score),tickets=Math.floor(fs/100);

  // ═══ INTEGRATE REWARDS INTO MAIN GAME ═══
  try{
    if(typeof G!=='undefined'){
      G.ore=(G.ore||0)+oreG;
      G.gems=(G.gems||0)+gemG;
      G.stars=(G.stars||0)+starG;
      G.tickets=(G.tickets||0)+tickets;
      if(crateG>0&&typeof addCrateToQueue==='function') addCrateToQueue('bronze');
      if(score>=1500&&typeof addCrateToQueue==='function') addCrateToQueue('gold');
      else if(score>=700&&typeof addCrateToQueue==='function') addCrateToQueue('silver');
      else if(score>=300&&typeof addCrateToQueue==='function') addCrateToQueue('bronze');
      if(typeof updateHUD==='function')updateHUD();
      if(typeof saveG==='function')saveG();
    }
  }catch(e){console.error('HK reward integration error:',e);}

  // ═══ SHOW END SCREEN — build dynamically to avoid DOM issues ═══
  var title=score>=1500?'JACKPOT! 🏆':score>=700?'NICE HAUL!':"TIME'S UP!";
  var crateRow='';
  if(score>=1500)crateRow='<div style="display:flex;align-items:center;gap:8px;"><img src="sticker-pack/crate-epic-t.png" style="width:42px;height:42px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:16px;color:#a87cc4;">Gold Crate!</span></div>';
  else if(score>=700)crateRow='<div style="display:flex;align-items:center;gap:8px;"><img src="sticker-pack/crate-epic-t.png" style="width:42px;height:42px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:16px;color:#6bb8d4;">Silver Crate!</span></div>';
  else if(score>=300||crateG>0)crateRow='<div style="display:flex;align-items:center;gap:8px;"><img src="sticker-pack/crate-epic-t.png" style="width:42px;height:42px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:16px;color:#cd7f32;">Bronze Crate</span></div>';
  var starRow=starG>0?'<div style="display:flex;align-items:center;gap:8px;"><img src="hook-star.png" style="width:42px;height:42px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:16px;color:#f0c040;">+'+starG+' ⭐ Stars!</span></div>':'';

  var btns='';
  if(canPlayFree()){
    btns='<button onclick="hkStartGame(\'free\')" style="padding:12px 30px;background:linear-gradient(135deg,#e8a838,#c87a20);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:14px;color:#1a0800;letter-spacing:2px;cursor:pointer;">PLAY FREE</button>';
  } else {
    btns='<div style="display:flex;gap:8px;">'
      +'<button onclick="hkStartGame(\'star\')" style="padding:10px 22px;background:linear-gradient(135deg,#f0c040,#c8961c);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:14px;color:#1a0800;cursor:pointer;">2⭐ PLAY</button>'
      +'<button onclick="hkStartGame(\'gem\')" style="padding:10px 22px;background:linear-gradient(135deg,#6bb8d4,#4898b4);border:none;border-radius:10px;font-family:Fredoka One,cursive;font-size:14px;color:#1a0800;cursor:pointer;">2💎 PLAY</button>'
      +'</div>';
  }

  var endDiv=document.createElement('div');
  endDiv.id='hkEndOverlay';
  endDiv.style.cssText='position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(10,8,6,.94);backdrop-filter:blur(8px);';
  endDiv.innerHTML='<div style="font-family:Fredoka One,cursive;font-size:28px;color:#e8a838;text-shadow:0 3px 0 #4a2000;">'+title+'</div>'
    +'<div style="font-family:Fredoka One,cursive;font-size:44px;color:#fff;text-shadow:0 0 20px rgba(232,168,56,.5);">'+fs+'</div>'
    // Tickets — big with PNG
    +'<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">'
      +'<img src="hook-ticket.png" style="width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(232,168,56,.4));">'
      +'<span style="font-family:Fredoka One,cursive;font-size:22px;color:#f0c040;">+'+tickets+'</span>'
      +'<span style="font-size:8px;color:rgba(232,168,56,.3);cursor:pointer;" title="Every 100 points = 1 ticket. Use tickets in weekly lottery for prizes!">ⓘ</span>'
    +'</div>'
    // Loot
    +'<div style="font-size:9px;color:rgba(232,168,56,.4);letter-spacing:2px;margin-top:4px;">LOOT COLLECTED</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin:4px 0;">'
      +'<img src="currency-ore.png" style="width:44px;height:44px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:18px;color:#e8a838;">+'+oreG+'</span>'
      +'<img src="assets-v8-new/currency-gem.png" style="width:44px;height:44px;object-fit:contain;"><span style="font-family:Fredoka One,cursive;font-size:18px;color:#6bb8d4;">+'+gemG+'</span>'
      +'<span style="font-size:8px;color:rgba(232,168,56,.3);cursor:pointer;" title="Ore and Gems are added to your wallet instantly. Use Gems to play BOOM!">ⓘ</span>'
    +'</div>'
    +starRow+crateRow
    // Info tooltips
    +(score>=300?'<div style="font-size:8px;color:rgba(232,168,56,.25);cursor:pointer;" title="Score 300+ = Bronze Crate, 700+ = Silver, 1500+ = Gold. Crates contain equipment, ore, and rare items!">ⓘ Bonus crate for high score</div>':'')
    +'<div style="margin-top:10px;">'+btns+'</div>'
    +'<div style="font-size:8px;color:rgba(232,168,56,.2);margin-top:6px;cursor:pointer;" title="Catch ore nuggets and gems with the hook. Avoid TNT bombs! Mystery bags contain random rewards including rare Stars. Heavy rocks are slow but give some points.">ⓘ How to play</div>'
    +'<div style="font-size:8px;color:rgba(232,168,56,.2);margin-top:2px;cursor:pointer;" title="Catch 3 items in a row for x2 COMBO! Catch 6 for x3! But miss or hit TNT and combo resets. Bombs also deal double damage during combo!">ⓘ Combo tips</div>'
    +(comboMult>1?'<div style="font-size:9px;color:#e8a838;margin-top:2px;">🔥 Best combo: x'+comboMult+'</div>':'')
    +'<div onclick="hkBackToMenu()" style="margin-top:8px;font-size:10px;color:rgba(232,168,56,.4);cursor:pointer;text-decoration:underline;">← Back to menu</div>';

  // Remove old overlay if exists
  var old=document.getElementById('hkEndOverlay');
  if(old)old.remove();
  // Add to hook-content
  var hc=document.getElementById('hook-content');
  if(hc)hc.appendChild(endDiv);
}

function fire(){if(!running)return;if(state==='swing'){state='shoot';if(typeof SND!=='undefined')SND.hookShoot();document.getElementById('hkTap').style.display='none';}}

function stop(){running=false;if(animId)cancelAnimationFrame(animId);if(timerInt)clearInterval(timerInt);animId=null;}

return {init:init,start:start,stop:stop,resize:resize};
})();

// Global for onclick
function hkStartGame(mode){HK.start(mode);}
function hkBackToMenu(){
  HK.stop();
  var endOv=document.getElementById('hkEndOverlay');if(endOv)endOv.remove();
  try{document.getElementById('hkEnd').style.display='none';}catch(e){}
  try{document.getElementById('hkHud').style.display='none';}catch(e){}
  var startEl=document.getElementById('hkStart');
  if(startEl)startEl.style.display='flex';
}
