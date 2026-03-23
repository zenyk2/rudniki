
/* ═══ MINES GAME ENGINE ═══ */
var MG={bet:1,mines:3,active:false,grid:[],revealed:[],safeRevealed:0,mult:1.0,histArr:[],_inited:false,pulseTimer:null};
function mgCalcMult(k,m){if(!k)return 1;var r=0.96;for(var i=1;i<=k;i++)r*=(26-i)/(26-m-i);return Math.max(1.05,+(r.toFixed(2)));}
function mgGenGrid(m){var a=Array(25).fill(false),ix=[];for(var i=0;i<25;i++)ix.push(i);for(var i=0;i<m;i++){var j=i+(Math.random()*(25-i)|0),t=ix[i];ix[i]=ix[j];ix[j]=t;a[ix[i]]=true;}return a;}
function mgBuildGrid(){var g=document.getElementById('mg-grid');if(!g)return;g.innerHTML='';var ro=document.getElementById('mg-result');if(ro)ro.className='mg-result';if(MG.pulseTimer){clearTimeout(MG.pulseTimer);MG.pulseTimer=null;}for(var i=0;i<25;i++){var c=document.createElement('div');c.className='mg-cell';c.id='mgc-'+i;(function(x){c.onclick=function(){mgReveal(x)};})(i);g.appendChild(c);}mgBuildRoad();}
function mgBuildRoad(){var rd=document.getElementById('mg-road');if(!rd)return;rd.innerHTML='';var s=25-MG.mines,n=Math.min(s,10);for(var i=1;i<=n;i++){var d=document.createElement('div');d.className='mr-step';d.id='mrs-'+i;d.textContent=(MG.mines===24&&i===s)?'\uD83C\uDF81':'\u00D7'+mgCalcMult(i,MG.mines).toFixed(1);rd.appendChild(d);}}
function mgUpdateRoad(){var s=25-MG.mines,n=Math.min(s,10);for(var i=1;i<=n;i++){var e=document.getElementById('mrs-'+i);if(!e)continue;e.className='mr-step'+(i<MG.safeRevealed?' reached':i===MG.safeRevealed?' current':'');}}
function mgReveal(idx){
  if(!MG.active||MG.revealed[idx])return;MG.revealed[idx]=true;
  if(MG.pulseTimer){clearTimeout(MG.pulseTimer);MG.pulseTimer=null;}
  document.querySelectorAll('.mg-cell.pulsing').forEach(function(c){c.classList.remove('pulsing');});
  var c=document.getElementById('mgc-'+idx);if(!c)return;
  if(MG.grid[idx]){
    c.className='mg-cell mine revealed';c.textContent='\uD83D\uDCA3';if(typeof SND!=='undefined')SND.bomb();
    for(var i=0;i<25;i++){if(MG.grid[i]&&i!==idx){var mc=document.getElementById('mgc-'+i);if(mc){mc.className='mg-cell mine-dim revealed';mc.textContent='\uD83D\uDCA3';}}}
    var gw=c.closest('.mg-game>div');if(gw){gw.classList.add('mg-shake');setTimeout(function(){gw.classList.remove('mg-shake')},400);}
    try{navigator.vibrate&&navigator.vibrate([10,15,15,15,25])}catch(e){}
    var ro=document.getElementById('mg-result');if(ro)ro.className='mg-result show';
    document.getElementById('mg-res-emoji').textContent='\uD83D\uDCA5';
    document.getElementById('mg-res-title').textContent='BOOM!';document.getElementById('mg-res-title').className='mg-res-title';
    document.getElementById('mg-res-val').textContent='\u2212'+MG.bet+' \u2B50';
    document.getElementById('mg-res-sub').textContent=MG.safeRevealed+' tiles \u00B7 \u00D7'+MG.mult.toFixed(2);
    MG.histArr.push('l');MG.active=false;mgUpdateHist();mgUnlock();
    setTimeout(function(){mgBuildGrid();mgUpdateTop();mgSetBtn('play')},2500);
  } else {
    MG.safeRevealed++;MG.mult=mgCalcMult(MG.safeRevealed,MG.mines);
    c.className='mg-cell safe revealed';c.textContent='\uD83D\uDC8E';if(typeof SND!=='undefined')SND.mineSafe();
    // Escalating vibration — tension builds with each safe reveal
    var vDur=5+MG.safeRevealed*3;try{navigator.vibrate&&navigator.vibrate(Math.min(vDur,30))}catch(e){}
    var p=Math.floor(MG.bet*MG.mult)-MG.bet;
    var btn=document.getElementById('mg-btn');
    if(btn){btn.textContent='\uD83D\uDCB0 CASHOUT +'+p+' \u2B50';btn.className='mg-btn cashout';btn.disabled=false;}
    mgUpdateTop();mgUpdateRoad();
    if(MG.pulseTimer)clearTimeout(MG.pulseTimer);
    MG.pulseTimer=setTimeout(function(){if(!MG.active)return;document.querySelectorAll('.mg-cell:not(.revealed)').forEach(function(c){c.classList.add('pulsing')});},3000);
    if(MG.safeRevealed>=(25-MG.mines))mgCashout(true);
  }
}
function mgStart(){
  if(MG.bet<1)return;if((G.stars||0)<MG.bet){if(typeof buyStars==="function")buyStars();else toast('Not enough Stars!');return;}
  G.stars-=MG.bet;updateHUD();saveG();
  MG.active=true;MG.grid=mgGenGrid(MG.mines);MG.revealed=Array(25).fill(false);MG.safeRevealed=0;MG.mult=1;
  mgBuildGrid();mgUpdateTop();
  // Soft shuffle vibration + deal sound
  if(typeof SND!=='undefined'){SND.vib([5,25,5,25,5,25,5]);SND._init();SND._resume();SND._osc(300,'square',0.06,0.04);setTimeout(function(){SND._osc(400,'square',0.06,0.04);},80);setTimeout(function(){SND._osc(500,'square',0.08,0.05);},160);}
  var btn=document.getElementById('mg-btn');if(btn){btn.textContent='\uD83D\uDCB0 CASHOUT';btn.className='mg-btn cashout';btn.disabled=true;}
  mgLock();
}
function mgCashout(auto){
  if(!MG.active&&!auto)return;MG.active=false;
  if(MG.pulseTimer){clearTimeout(MG.pulseTimer);MG.pulseTimer=null;}
  document.querySelectorAll('.mg-cell.pulsing').forEach(function(c){c.classList.remove('pulsing')});
  var pay=Math.floor(MG.bet*MG.mult),prof=pay-MG.bet,gift=MG.mines===24&&MG.safeRevealed>=(25-MG.mines);
  G.stars=(G.stars||0)+pay;updateHUD();saveG();MG.histArr.push('w');mgUpdateHist();if(typeof SND!=='undefined')SND.cashout();
  var ro=document.getElementById('mg-result');if(ro)ro.className='mg-result show';
  document.getElementById('mg-res-emoji').textContent=gift?'\uD83C\uDF81':'\uD83D\uDCB0';
  document.getElementById('mg-res-title').textContent=gift?'GIFT WIN!':'CASHOUT!';
  document.getElementById('mg-res-title').className='mg-res-title win';
  document.getElementById('mg-res-val').textContent='+'+prof+' \u2B50';
  document.getElementById('mg-res-sub').textContent=MG.safeRevealed+' tiles \u00B7 \u00D7'+MG.mult.toFixed(2);
  setTimeout(function(){showWinPopup([{icon:gift?'\uD83C\uDF81':'\uD83D\uDCB0',text:gift?'+'+prof+' Stars + NFT Gift!':'+'+prof+' Stars',type:gift?'gift':'stars',shardImg:'assets/shards/shard_003.webp',shardIdx:0}])},600);
  mgUnlock();setTimeout(function(){mgBuildGrid();mgUpdateTop();mgSetBtn('play')},2500);
}
function mgAction(){if(MG.active)mgCashout(false);else mgStart();}
function mgStartFree(){var d=new Date().toDateString();if(G.mgFreeUsed===d){toast('Free game already used today!');return;}G.mgFreeUsed=d;G.stars=(G.stars||0)+1;updateHUD();var o=MG.bet;MG.bet=1;mgStart();MG.bet=o;saveG();toast('\uD83C\uDF81 Free game started!');}
function mgUpdateTop(){var e=document.getElementById('mg-mult'),p=document.getElementById('mg-profit');if(e)e.textContent=MG.mult.toFixed(2)+'\u00D7';var v=MG.active?Math.floor(MG.bet*MG.mult)-MG.bet:0;if(p)p.textContent='+'+v+' \u2B50';}
function mgSetBtn(s){var b=document.getElementById('mg-btn');if(!b)return;if(s==='play'){b.textContent='\u26CF\uFE0F START GAME';b.className='mg-btn play';b.disabled=false;}}
function mgLock(){document.querySelectorAll('#mines-content .mg-chip,#mines-content .mg-mchip,#mines-content .mg-adj').forEach(function(c){c.style.pointerEvents='none';c.style.opacity='.4'});}
function mgUnlock(){document.querySelectorAll('#mines-content .mg-chip,#mines-content .mg-mchip,#mines-content .mg-adj').forEach(function(c){c.style.pointerEvents='';c.style.opacity=''});}
function mgAdjBet(d){if(MG.active)return;MG.bet=Math.max(1,MG.bet+d);document.getElementById('mg-bet-display').textContent=MG.bet+' \u2B50';document.querySelectorAll('#mines-content .mg-chip').forEach(function(c){c.classList.remove('on')});}
function mgSetBet(v,el){if(MG.active)return;MG.bet=v;document.getElementById('mg-bet-display').textContent=v+' \u2B50';document.querySelectorAll('#mines-content .mg-chip').forEach(function(c){c.classList.remove('on')});if(el)el.classList.add('on');}
function mgSetBetMax(el){if(MG.active)return;MG.bet=Math.max(1,G.stars||0);document.getElementById('mg-bet-display').textContent=MG.bet+' \u2B50';document.querySelectorAll('#mines-content .mg-chip').forEach(function(c){c.classList.remove('on')});if(el)el.classList.add('on');}
function mgSetMines(m,el){if(MG.active)return;MG.mines=m;document.querySelectorAll('#mines-content .mg-mchip').forEach(function(c){c.classList.remove('on')});if(el)el.classList.add('on');mgBuildGrid();}
function mgUpdateHist(){var h=document.getElementById('mg-hist');if(!h)return;h.innerHTML=MG.histArr.slice(-10).map(function(r){return'<div class="mg-dot '+r+'"></div>'}).join('');}
