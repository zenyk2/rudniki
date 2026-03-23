/* ═══ CRATE PARTICLE SYSTEM v2 ═══
   CR-inspired: shimmer rays, floating sparks, glow halos.
   One canvas overlays the crate-bar on Mine screen.
*/
var CP={particles:[],glows:[],canvas:null,ctx:null,w:0,h:0,running:false,frame:0};

var CP_RARITY={
  silver:{r:160,g:168,b:184,rate:0.06,sparkRate:0.02,glowSize:30,glowAlpha:0.06},
  gold:  {r:232,g:168,b:56, rate:0.12,sparkRate:0.04,glowSize:40,glowAlpha:0.1},
  epic:  {r:176,g:96, b:224,rate:0.18,sparkRate:0.06,glowSize:50,glowAlpha:0.14},
  legend:{r:255,g:68, b:85, rate:0.25,sparkRate:0.08,glowSize:60,glowAlpha:0.18}
};

function cpInit(){
  CP.canvas=document.getElementById('crate-particles');
  if(!CP.canvas)return;
  CP.ctx=CP.canvas.getContext('2d');
  CP.running=true;
  function tryStart(){
    cpResize();
    if(CP.h>10){requestAnimationFrame(cpLoop);}
    else{setTimeout(tryStart,500);}
  }
  tryStart();
  window.addEventListener('resize',cpResize);
}

function cpResize(){
  if(!CP.canvas)return;
  var bar=document.getElementById('crate-bar-v8');
  var parent=CP.canvas.parentElement;
  var w=parent.offsetWidth||400;
  var h=(bar?bar.offsetHeight:0)+40;
  if(h<30)h=parent.offsetHeight||120;
  CP.canvas.width=w*2; // retina
  CP.canvas.height=h*2;
  CP.canvas.style.width=w+'px';
  CP.canvas.style.height=h+'px';
  CP.w=w*2;CP.h=h*2;
  CP.ctx.scale(2,2); // retina scaling — draw in CSS pixels
  CP.w=w;CP.h=h;
  // Re-set scale each resize
  CP.canvas.width=w*2;CP.canvas.height=h*2;
  CP.ctx=CP.canvas.getContext('2d');
  CP.ctx.scale(2,2);
}

function cpLoop(){
  if(!CP.running)return;
  CP.frame++;
  // Resize check every 2 sec
  if(CP.frame%120===0)cpResize();
  cpSpawn();
  cpUpdate();
  cpDraw();
  requestAnimationFrame(cpLoop);
}

function cpGetSlots(){
  var slots=document.querySelectorAll('#crate-bar-v8 .cv2-slot.silver,#crate-bar-v8 .cv2-slot.gold,#crate-bar-v8 .cv2-slot.epic,#crate-bar-v8 .cv2-slot.legend,#crate-bar-v8 .cv2-slot.ready,#crate-bar-v8 .cv2-slot.opening');
  if(!slots.length||!CP.canvas)return[];
  var cr=CP.canvas.getBoundingClientRect();
  var result=[];
  slots.forEach(function(s){
    var r='silver';
    if(s.classList.contains('legend'))r='legend';
    else if(s.classList.contains('epic'))r='epic';
    else if(s.classList.contains('gold'))r='gold';
    else if(s.classList.contains('ready'))r='gold';
    else if(s.classList.contains('opening'))r='silver';
    var sr=s.getBoundingClientRect();
    result.push({
      x:sr.left-cr.left+sr.width/2,
      y:sr.top-cr.top+sr.height/2,
      w:sr.width,h:sr.height,
      rarity:r
    });
  });
  return result;
}

function cpSpawn(){
  var slots=cpGetSlots();
  slots.forEach(function(slot){
    var cfg=CP_RARITY[slot.rarity];
    // Floating sparks — rise slowly
    if(Math.random()<cfg.rate){
      CP.particles.push({
        x:slot.x+(Math.random()-0.5)*slot.w*0.6,
        y:slot.y+(Math.random()-0.3)*slot.h*0.3,
        vx:(Math.random()-0.5)*0.15,
        vy:-(0.1+Math.random()*0.25),
        size:1+Math.random()*2,
        life:200+Math.random()*150,
        maxLife:200+Math.random()*150,
        r:cfg.r+((Math.random()-0.5)*25|0),
        g:cfg.g+((Math.random()-0.5)*20|0),
        b:cfg.b+((Math.random()-0.5)*20|0),
        type:'spark'
      });
    }
    // Shimmer rays — short bright flashes
    if(Math.random()<cfg.sparkRate){
      var angle=Math.random()*Math.PI*2;
      CP.particles.push({
        x:slot.x+Math.cos(angle)*slot.w*0.2,
        y:slot.y+Math.sin(angle)*slot.h*0.2,
        angle:angle,
        len:8+Math.random()*14,
        life:30+Math.random()*40,
        maxLife:30+Math.random()*40,
        r:Math.min(255,cfg.r+60),
        g:Math.min(255,cfg.g+40),
        b:Math.min(255,cfg.b+30),
        type:'ray'
      });
    }
  });
}

function cpUpdate(){
  for(var i=CP.particles.length-1;i>=0;i--){
    var p=CP.particles[i];
    p.life--;
    if(p.life<=0){CP.particles.splice(i,1);continue;}
    if(p.type==='spark'){
      p.x+=p.vx;
      p.y+=p.vy;
      p.vx*=0.99;
    }
  }
  if(CP.particles.length>300)CP.particles.splice(0,CP.particles.length-300);
}

function cpDraw(){
  var ctx=CP.ctx;
  if(!ctx)return;
  ctx.clearRect(0,0,CP.w,CP.h);

  // Draw glow halos behind each slot
  var slots=cpGetSlots();
  var t=CP.frame*0.008; // very slow oscillation
  slots.forEach(function(slot){
    var cfg=CP_RARITY[slot.rarity];
    // Breathing glow halo
    var breathe=0.7+Math.sin(t+slot.x*0.01)*0.3;
    var grd=ctx.createRadialGradient(slot.x,slot.y,0,slot.x,slot.y,cfg.glowSize*breathe);
    grd.addColorStop(0,'rgba('+cfg.r+','+cfg.g+','+cfg.b+','+(cfg.glowAlpha*breathe)+')');
    grd.addColorStop(0.5,'rgba('+cfg.r+','+cfg.g+','+cfg.b+','+(cfg.glowAlpha*0.3*breathe)+')');
    grd.addColorStop(1,'rgba('+cfg.r+','+cfg.g+','+cfg.b+',0)');
    ctx.fillStyle=grd;
    ctx.beginPath();
    ctx.arc(slot.x,slot.y,cfg.glowSize*breathe,0,Math.PI*2);
    ctx.fill();
  });

  // Draw particles
  for(var i=0;i<CP.particles.length;i++){
    var p=CP.particles[i];
    var alpha=p.life/p.maxLife;
    // Fade in/out
    var fadeIn=Math.min(1,(p.maxLife-p.life)/(p.maxLife*0.15));
    var fadeOut=Math.min(1,p.life/(p.maxLife*0.3));
    var a=alpha*fadeIn*fadeOut;

    if(p.type==='spark'){
      // Soft glow around spark
      var sg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*4*a);
      sg.addColorStop(0,'rgba('+p.r+','+p.g+','+p.b+','+(a*0.12)+')');
      sg.addColorStop(1,'rgba('+p.r+','+p.g+','+p.b+',0)');
      ctx.fillStyle=sg;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*4*a,0,Math.PI*2);ctx.fill();
      // Core dot
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2);
      ctx.fillStyle='rgba('+p.r+','+p.g+','+p.b+','+(a*0.6)+')';ctx.fill();
      // White center for bigger sparks
      if(p.size>1.8){
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*a*0.3,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,240,'+(a*0.4)+')';ctx.fill();
      }
    } else if(p.type==='ray'){
      // Shimmer ray — short glowing line
      var cos=Math.cos(p.angle),sin=Math.sin(p.angle);
      var rayLen=p.len*a;
      ctx.beginPath();
      ctx.moveTo(p.x-cos*rayLen*0.5,p.y-sin*rayLen*0.5);
      ctx.lineTo(p.x+cos*rayLen*0.5,p.y+sin*rayLen*0.5);
      ctx.strokeStyle='rgba('+p.r+','+p.g+','+p.b+','+(a*0.35)+')';
      ctx.lineWidth=1.5*a;
      ctx.lineCap='round';
      ctx.stroke();
    }
  }
}

// Auto-init
(function(){
  function boot(){setTimeout(cpInit,800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
