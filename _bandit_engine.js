/* ═══ BANDIT WHEEL ENGINE ═══ */
var BD_SEGS=[
  {v:1},{v:3},{v:1},{v:5},{v:1},{v:3},
  {v:1},{v:10},{v:1},{v:3},{v:1},{v:5},
  {v:1},{v:3},{v:1},{v:10},{v:1},{v:3},
  {v:1},{v:5},{v:20},{v:1},{v:3},{v:1},
];
var BD_COL={
  1:{bg:"#c8a820",dk:"#8a7e14",a:"#c8a820",b:"#907010"},
  3:{bg:"#4cb828",dk:"#2c7010",a:"#58a030",b:"#306018"},
  5:{bg:"#3480c8",dk:"#184880",a:"#3878b8",b:"#184068"},
  10:{bg:"#8848c0",dk:"#4c2080",a:"#8858b8",b:"#4a2878"},
  20:{bg:"#c02810",dk:"#780808",a:"#b02818",b:"#700808"},
};
var BD_N=BD_SEGS.length, BD_SD=360/BD_N, BD_CY=30;
var BD={balance:0, bets:{}, inp:"0", rot:0, spinning:false, cd:30, lt:null, history:[], fuseParticles:[], fuseLastSec:-1, flashT:0};

function bdGetRemaining(){var n=Date.now()/1000;return BD_CY-(n%BD_CY);}

function bdInit(){
  BD.cd=bdGetRemaining();
  BD.balance=G.stars||0;
  [1,3,5,10,20].forEach(function(v){
    var btn=document.createElement("button");
    btn.className="bd-pick bd-pc-"+v;btn.dataset.v=v;
    btn.innerHTML='<div class="badge"></div><div class="pmult">\u00D7'+v+'</div>';
    btn.onclick=function(){bdPlaceBet(v);};
    document.getElementById("bd-picks").appendChild(btn);
  });
  bdDraw(0);bdUpdateUI();
  var fc=document.getElementById("bd-fuseCanvas");
  if(fc){var wrap=document.getElementById("bd-fuse-wrap");fc.width=wrap.offsetWidth;fc.height=wrap.offsetHeight;}
  requestAnimationFrame(bdDrawFuse);
  requestAnimationFrame(bdTick);
}

/* ── Draw Wheel ── */
function bdDraw(r){
  var c=document.getElementById("bd-wheel");if(!c)return;
  var ctx=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2+20,R=Math.min(W,H)/2-38;
  ctx.clearRect(0,0,W,H);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R+8,0,Math.PI*2);ctx.clip();
  var vg=ctx.createRadialGradient(cx,cy,R*.35,cx,cy,R*1.05);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(0.7,"rgba(0,0,0,0.3)");vg.addColorStop(1,"rgba(0,0,0,0.7)");
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,R+7,0,Math.PI*2);
  var bg=ctx.createRadialGradient(cx,cy,R,cx,cy,R+9);
  bg.addColorStop(0,"#201608");bg.addColorStop(0.4,"#140e06");bg.addColorStop(1,"#0a0703");
  ctx.fillStyle=bg;ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,R+1,0,Math.PI*2);ctx.strokeStyle="#c8bea0";ctx.lineWidth=2.5;ctx.stroke();
  ctx.save();ctx.translate(cx,cy);ctx.rotate(r*Math.PI/180);
  for(var i=0;i<BD_N;i++){
    var a0=(i*BD_SD-90)*Math.PI/180,a1=((i+1)*BD_SD-90)*Math.PI/180,mid=(a0+a1)/2;
    var fc=BD_COL[BD_SEGS[i].v];
    var sg=ctx.createRadialGradient(0,0,R*.15,0,0,R);
    sg.addColorStop(0,fc.a+"dd");sg.addColorStop(0.55,fc.a);sg.addColorStop(1,fc.b);
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a0,a1);ctx.closePath();ctx.fillStyle=sg;ctx.fill();
    var fade=ctx.createRadialGradient(0,0,0,0,0,R);
    fade.addColorStop(0,"rgba(255,248,220,0.14)");fade.addColorStop(0.6,"rgba(255,248,220,0.04)");fade.addColorStop(1,"rgba(0,0,0,0.25)");
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a0,a1);ctx.closePath();ctx.fillStyle=fade;ctx.fill();
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,a0,a1);ctx.closePath();
    ctx.strokeStyle="rgba(6,4,2,0.8)";ctx.lineWidth=1.5;ctx.stroke();
    var tx=Math.cos(mid)*R*.86,ty=Math.sin(mid)*R*.86;
    ctx.save();ctx.translate(tx,ty);ctx.rotate(mid+Math.PI/2);
    ctx.font="700 "+Math.floor(R*.11)+"px 'JetBrains Mono',monospace";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=4;
    ctx.strokeStyle="rgba(0,0,0,0.85)";ctx.lineWidth=3;ctx.strokeText(BD_SEGS[i].v,0,0);
    ctx.fillStyle="rgba(240,220,160,0.95)";ctx.fillText(BD_SEGS[i].v,0,0);
    ctx.shadowBlur=0;ctx.restore();
  }
  /* center hub */
  var cr=R*.34;
  var cg2=ctx.createRadialGradient(-cr*.2,-cr*.2,0,0,0,cr);
  cg2.addColorStop(0,"#d8c898");cg2.addColorStop(0.4,"#b8a870");cg2.addColorStop(0.7,"#987848");cg2.addColorStop(1,"#483010");
  ctx.beginPath();ctx.arc(0,0,cr,0,Math.PI*2);ctx.fillStyle=cg2;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,cr,0,Math.PI*2);ctx.strokeStyle="rgba(12,8,3,0.9)";ctx.lineWidth=2.5;ctx.stroke();
  ctx.strokeStyle="rgba(10,6,2,0.8)";ctx.lineWidth=2.5;
  for(var s=0;s<6;s++){var sa=s*60*Math.PI/180;ctx.beginPath();ctx.moveTo(Math.cos(sa)*5,Math.sin(sa)*5);ctx.lineTo(Math.cos(sa)*cr*.88,Math.sin(sa)*cr*.88);ctx.stroke();}
  var bh=ctx.createRadialGradient(-2,-2,0,0,0,7);
  bh.addColorStop(0,"#b89848");bh.addColorStop(1,"#201006");
  ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fillStyle=bh;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fillStyle="#0c0804";ctx.fill();
  ctx.restore();
  /* rim bolts */
  for(var b=0;b<BD_N;b++){
    var ba=((b+0.5)*BD_SD-90)*Math.PI/180;
    var bx=cx+Math.cos(ba)*(R+5),by=cy+Math.sin(ba)*(R+5);
    var bg2=ctx.createRadialGradient(bx-1,by-1,0,bx,by,3.5);
    bg2.addColorStop(0,"#907050");bg2.addColorStop(1,"#1c1006");
    ctx.beginPath();ctx.arc(bx,by,3,0,Math.PI*2);ctx.fillStyle=bg2;ctx.fill();
  }
  /* pointer */
  ctx.save();ctx.translate(cx,cy);
  var pH=22,pBase=-R-pH/2-7,pTip=-R+pH/2-7,pW=10;
  ctx.beginPath();ctx.moveTo(0,pTip);ctx.lineTo(-pW,pBase);ctx.lineTo(pW,pBase);ctx.closePath();
  var arG=ctx.createLinearGradient(-pW,0,pW,0);
  arG.addColorStop(0,"#6a0808");arG.addColorStop(0.5,"#e02828");arG.addColorStop(1,"#6a0808");
  ctx.fillStyle=arG;ctx.fill();
  ctx.strokeStyle="rgba(6,2,2,0.9)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
  /* spotlight */
  ctx.save();ctx.translate(cx,cy);
  var numY=-R*.86,sR=R*.11;
  var nG=ctx.createRadialGradient(0,numY,0,0,numY,sR*1.4);
  nG.addColorStop(0,"rgba(255,255,245,0.60)");nG.addColorStop(0.45,"rgba(255,248,210,0.28)");nG.addColorStop(1,"transparent");
  ctx.fillStyle=nG;ctx.beginPath();ctx.arc(0,numY,sR*1.4,0,Math.PI*2);ctx.fill();
  /* win flash */
  var fe=performance.now()-BD.flashT;
  if(fe>0&&fe<700){
    var fp=fe/700;
    ctx.beginPath();ctx.arc(0,numY,sR*(1+fp*3),0,Math.PI*2);
    ctx.strokeStyle="rgba(255,252,200,"+(1-fp)*0.85+")";ctx.lineWidth=(1-fp)*3+0.5;ctx.stroke();
    requestAnimationFrame(function(){bdDraw(BD.rot);});
  }
  ctx.restore();
}

/* ── TNT Fuse ── */
function bdDrawFuse(){
  var canvas=document.getElementById("bd-fuseCanvas");if(!canvas||!canvas.offsetWidth)return;
  var ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  var DYN_W=26,ROPE_W=W-DYN_W-2;
  var progress=Math.max(0,Math.min(1,BD.cd/BD_CY));
  var sparkX=(1-progress)*ROPE_W,midY=H/2;
  ctx.fillStyle="rgba(0,0,0,0.88)";ctx.fillRect(0,0,W,H);
  if(sparkX>2){var charH=H*.14;ctx.fillStyle="#0d0805";ctx.fillRect(0,midY-charH/2,sparkX,charH);}
  if(sparkX<ROPE_W){
    var ry1=midY-H*.27,ry2=midY+H*.27;
    var rg=ctx.createLinearGradient(0,ry1,0,ry2);
    rg.addColorStop(0,"#b89458");rg.addColorStop(0.5,"#c09860");rg.addColorStop(1,"#5a3a18");
    ctx.fillStyle=rg;ctx.fillRect(sparkX,ry1,ROPE_W-sparkX,ry2-ry1);
  }
  if(BD.cd>0.3&&!BD.spinning){
    for(var i=0;i<2;i++){
      if(Math.random()<0.65){
        BD.fuseParticles.push({x:sparkX+(Math.random()-.7)*3,y:midY+(Math.random()-.5)*H*.55,vx:-(0.5+Math.random()*1.1),vy:(Math.random()-.5)*.9,life:1,decay:.055+Math.random()*.055,r:.9+Math.random()*1.6,hue:12+Math.random()*38});
      }
    }
  }
  BD.fuseParticles=BD.fuseParticles.filter(function(p){return p.life>0.04;});
  BD.fuseParticles.forEach(function(p){
    p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(0.1,p.life),0,Math.PI*2);
    ctx.fillStyle="hsla("+p.hue+",100%,"+(40+(p.life*35)|0)+"%,"+Math.max(0,p.life*.9)+")";ctx.fill();
  });
  if(BD.cd>0.05){
    var flk=.82+Math.random()*.18,gR=H*1.15*flk;
    var sg=ctx.createRadialGradient(sparkX,midY,0,sparkX,midY,gR);
    sg.addColorStop(0,"rgba(255,228,70,.97)");sg.addColorStop(0.08,"rgba(255,118,18,.85)");
    sg.addColorStop(0.28,"rgba(175,38,7,.42)");sg.addColorStop(1,"transparent");
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sparkX,midY,gR,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(sparkX,midY,H*.20*flk,0,Math.PI*2);ctx.fillStyle="rgba(255,252,205,.95)";ctx.fill();
    ctx.beginPath();ctx.arc(sparkX,midY,H*.11*flk,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
  }
  /* TNT stick */
  var dx=W-DYN_W,dy=1,dh=H-2;
  var dg=ctx.createLinearGradient(dx,0,dx+DYN_W,0);
  dg.addColorStop(0,"#5a0606");dg.addColorStop(0.42,"#e82020");dg.addColorStop(1,"#480404");
  ctx.fillStyle=dg;
  ctx.beginPath();ctx.roundRect(dx,dy,DYN_W,dh,3);ctx.fill();
  ctx.font="700 "+Math.floor(dh*.42)+"px 'JetBrains Mono',monospace";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#ffe8a0";
  ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=2;
  ctx.fillText("TNT",dx+DYN_W/2,dy+dh/2);ctx.shadowBlur=0;
  /* fuse counter */
  var s=Math.ceil(BD.cd);
  if(s!==BD.fuseLastSec){
    BD.fuseLastSec=s;
    var wrap=document.getElementById("bd-fuseCounter");
    var num=wrap.querySelector(".fc-num");
    num.textContent=s+"s";num.classList.remove("pulse");
    void num.offsetWidth;num.classList.add("pulse");
    wrap.className="bd-fuse-counter"+(s<=5?" urgent":"");
  }
  requestAnimationFrame(bdDrawFuse);
}

/* ── Countdown (UTC synced) ── */
function bdTick(){
  if(BD.spinning)return;
  BD.cd=bdGetRemaining();
  if(BD.cd<=0.5){
    document.getElementById("bd-fuse-wrap").classList.add("hidden");
    document.getElementById("bd-fuseCounter").classList.add("hidden");
    bdSetPhase("closed");setTimeout(bdSpin,500);return;
  }
  if(BD.cd<1)bdLock(true);
  requestAnimationFrame(bdTick);
}

function bdSetPhase(p){
  var el=document.getElementById("bd-phase");
  var tw=document.getElementById("bd-fuse-wrap");
  var fc=document.getElementById("bd-fuseCounter");
  el.className="bd-phase "+p;
  if(p==="open"){el.textContent="\u25CF BET!";tw.classList.remove("hidden");fc.classList.remove("hidden");}
  else if(p==="closed")el.textContent="\u2298 CLOSED";
  else el.textContent="\uD83C\uDFA1 SPINNING!";
}

function bdLock(on){
  document.querySelectorAll("#bandit-content .bd-pick,#bandit-content .bd-qc,#bandit-content .bd-input-wrap input").forEach(function(el){
    el.style.pointerEvents=on?"none":"auto";el.style.opacity=on?"0.25":"1";
  });
}

/* ── Easing ── */
function bdEase(t){return 1-Math.pow(1-t,5);}

/* ── Spin ── */
function bdSpin(){
  BD.spinning=true;bdSetPhase("spinning");bdLock(true);if(typeof SND!=='undefined')SND.spinStart();
  // Soft roulette ticking — gentle, slowing down
  try{navigator.vibrate&&navigator.vibrate([5,50,5,60,5,70,5,90,5,110,5,140,8,180,8,220,10])}catch(e){}
  BD.balance=G.stars||0;
  var hasBets=Object.keys(BD.bets).length>0,sb=Object.assign({},BD.bets);
  var tgt,totalWon=0,totalLost=0,lines=[];
  if(hasBets){
    var stake=0;for(var k in sb)stake+=sb[k];
    totalLost=stake;
    tgt=Math.floor(Math.random()*BD_N);
    var lv=BD_SEGS[tgt].v;
    for(var v in sb){
      var vi=parseInt(v),a=sb[v];
      if(vi===lv){var p=a*vi;totalWon+=p;lines.push({v:vi,won:true,payout:p,bet:a});}
      else lines.push({v:vi,won:false,payout:0,bet:a});
    }
    var net=totalWon-totalLost;
    G.stars=(G.stars||0)+net;updateHUD();saveG();
  } else {
    tgt=Math.floor(Math.random()*BD_N);
  }
  var ta=tgt*BD_SD+BD_SD/2,cm=((BD.rot%360)+360)%360;
  var dl=(ta-cm+360)%360;if(dl<30)dl+=360;
  var ts=8*360+dl,sr=BD.rot,dur=8200+Math.random()*900,t0=performance.now();
  var rs=false;
  function step(now){
    var t=Math.min((now-t0)/dur,1);
    BD.rot=sr+ts*bdEase(t);bdDraw(BD.rot);
    if(t>.82&&!rs&&hasBets){rs=true;bdShowRes(lines,totalWon,totalLost);}
    if(t<1)requestAnimationFrame(step);
    else{
      BD.rot=sr+ts;BD.spinning=false;BD.flashT=performance.now();if(typeof SND!=='undefined')SND.spinStop();try{navigator.vibrate&&navigator.vibrate(15)}catch(e){}
      BD.bets={};BD.inp="0";
      var inp=document.getElementById("bd-input");if(inp)inp.value="0";
      document.querySelectorAll("#bandit-content .bd-qc").forEach(function(c){c.classList.remove("sel");});
      bdSetHint(0);
      BD.cd=bdGetRemaining();BD.lt=null;BD.fuseLastSec=-1;
      bdSetPhase("open");bdLock(false);bdUpdateUI();
      requestAnimationFrame(bdTick);
    }
  }
  requestAnimationFrame(step);
}

/* ── Result ── */
function bdShowRes(lines,won,lost){
  var net=won-lost,popup=document.getElementById("bd-popup");
  document.getElementById("bd-popupBig").textContent=(net>=0?"+":"")+net+" \u2B50";
  document.getElementById("bd-popupBig").style.color=net>0?"#70c030":net===0?"#c09030":"#ce422b";
  document.getElementById("bd-popupSub").innerHTML=lines.map(function(l){
    var icon=l.won?'<span style="color:#70c030">\u2713</span>':'<span style="color:#ce422b">\u2717</span>';
    var out=l.won?'<b style="color:#88d040">+\u2B50'+l.payout+'</b>':'<span style="color:#ce422b">\u2212\u2B50'+l.bet+'</span>';
    return icon+" "+l.v+"\u00D7 \u2B50"+l.bet+" \u2192 "+out;
  }).join("<br>");
  popup.style.borderColor=net>0?"#4a8018":"#702010";
  popup.classList.add("show");
  if(typeof SND!=='undefined'){if(net>0){SND.win();SND.vib([10,15,10,15,20]);}else if(net<0)SND.bomb();}
  if(net>0&&typeof fireConfetti==="function")fireConfetti();
  BD.history.unshift({lines:lines,net:net,time:new Date().toLocaleTimeString().slice(0,5)});
  if(BD.history.length>10)BD.history.pop();
  bdRenderHistory();
  setTimeout(function(){popup.classList.remove("show");},3000);
}

/* ── Betting ── */
function bdFreeBalance(){var used=0;for(var k in BD.bets)used+=BD.bets[k];return(G.stars||0)-used;}

function bdPlaceBet(v){
  if(BD.spinning||BD.cd<1)return;
  var amt=parseInt(BD.inp)||parseInt(document.getElementById("bd-input").value)||0;
  if(amt<=0){document.getElementById("bd-input").focus();return;}
  var free=bdFreeBalance();
  if(free<=0){if(typeof buyStars==="function")buyStars();return;}
  var final=Math.min(amt,free);
  BD.bets[v]=(BD.bets[v]||0)+final;
  BD.inp="0";document.getElementById("bd-input").value="0";
  document.querySelectorAll("#bandit-content .bd-qc").forEach(function(c){c.classList.remove("sel");});
  bdSetHint(0);bdUpdateUI();
}

function bdPickChip(v,el){
  if(BD.spinning||BD.cd<1)return;
  var free=bdFreeBalance();
  if(free<v){if(typeof buyStars==="function")buyStars();return;}
  BD.inp=String(Math.min(v,free));
  document.getElementById("bd-input").value=BD.inp;
  document.querySelectorAll("#bandit-content .bd-qc").forEach(function(c){c.classList.remove("sel");});
  el.classList.add("sel");bdSetHint(parseInt(BD.inp));
}

function bdPickChipMax(el){
  if(BD.spinning||BD.cd<1)return;
  var free=bdFreeBalance();
  if(free<=0){if(typeof buyStars==="function")buyStars();return;}
  BD.inp=String(free);
  document.getElementById("bd-input").value=BD.inp;
  document.querySelectorAll("#bandit-content .bd-qc").forEach(function(c){c.classList.remove("sel");});
  el.classList.add("sel");bdSetHint(parseInt(BD.inp));
}

function bdOnInput(val){
  if(BD.spinning||BD.cd<1)return;
  var v=parseInt(val)||0;
  var free=bdFreeBalance();
  if(v>free&&free<=0){if(typeof buyStars==="function")buyStars();return;}
  BD.inp=String(Math.max(0,Math.min(v,free)));
  bdSetHint(parseInt(BD.inp));
}

function bdSetHint(v){
  var el=document.getElementById("bd-hint");
  if(!v){el.textContent="pick amount \u2014 then your color";el.classList.remove("active");}
  else{el.textContent="\u2B50"+v+" \u2014 pick your color";el.classList.add("active");}
}

/* ── UI Updates ── */
function bdUpdateUI(){
  BD.balance=G.stars||0;
  bdRenderBadges();
}

function bdRenderBadges(){
  document.querySelectorAll("#bd-picks .bd-pick").forEach(function(btn){
    var v=parseInt(btn.dataset.v),badge=btn.querySelector(".badge");
    if(BD.bets[v]){badge.textContent="\u2B50"+BD.bets[v];btn.classList.add("has-bet");}
    else{badge.textContent="";btn.classList.remove("has-bet");}
  });
}

function bdRenderHistory(){
  var container=document.getElementById("bd-history");
  container.innerHTML="";
  BD.history.forEach(function(round){
    var netCls=round.net>0?"color:#70c030":round.net<0?"color:#ce422b":"color:#c09030";
    var netTxt=(round.net>=0?"+":"")+round.net+"\u2B50";
    var dots=round.lines.map(function(l){return'<span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:'+BD_COL[l.v].bg+(l.won?"":"50")+';margin:0 1px;"></span>';}).join("");
    var row=document.createElement("div");
    row.style.cssText="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:rgba(0,0,0,0.3);font-size:10px;";
    row.innerHTML='<span style="font-family:var(--font-mono);color:var(--text-muted);min-width:36px;">'+round.time+'</span>'+dots+'<span style="flex:1"></span><span style="font-weight:700;font-family:var(--font-mono);'+netCls+'">'+netTxt+'</span>';
    container.appendChild(row);
  });
}
