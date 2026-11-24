(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const W = 2300, GAP = 650, TOP = 430;
  const districts = [
    ['കാസർഗോഡ്','KASARAGOD','ബേക്കൽ കോട്ട','BEKAL FORT','cliffs'],
    ['കണ്ണൂർ','KANNUR','മുഴപ്പിലങ്ങാട് ബീച്ച്','MUZHAPPILANGAD BEACH','coast'],
    ['വയനാട്','WAYANAD','എടക്കൽ ഗുഹകൾ','EDAKKAL CAVES','hills'],
    ['കോഴിക്കോട്','KOZHIKODE','മാനാഞ്ചിറ','MANANCHIRA','city'],
    ['മലപ്പുറം','MALAPPURAM','കോട്ടക്കുന്ന്','KOTTAKKUNNU','hills'],
    ['പാലക്കാട്','PALAKKAD','മലമ്പുഴ അണക്കെട്ട്','MALAMPUZHA DAM','hills'],
    ['തൃശ്ശൂർ','THRISSUR','വടക്കുന്നാഥൻ ക്ഷേത്രം','VADAKKUNNATHAN TEMPLE','temple'],
    ['എറണാകുളം','ERNAKULAM','ഫോർട്ട് കൊച്ചി','FORT KOCHI','harbor'],
    ['ആലപ്പുഴ','ALAPPUZHA','ആലപ്പുഴ കായൽ','ALAPPUZHA BACKWATERS','water'],
    ['കോട്ടയം','KOTTAYAM','കുമരകം','KUMARAKOM','water'],
    ['ഇടുക്കി','IDUKKI','മുന്നാർ ടീ ഗാർഡൻ','MUNNAR TEA GARDENS','hills'],
    ['പത്തനംതിട്ട','PATHANAMTHITTA','ഗവി കാട്','GAVI FOREST','forest'],
    ['കൊല്ലം','KOLLAM','അഷ്ടമുടി കായൽ','ASHTAMUDI LAKE','water'],
    ['തിരുവനന്തപുരം','THIRUVANANTHAPURAM','കോവളം കടൽത്തീരം','KOVALAM BEACH','coast']
  ].map((d,i)=>({ml:d[0],en:d[1],spot:d[2],spotEn:d[3],type:d[4],x:1180+Math.sin(i*1.17)*330+Math.sin(i*.43)*125,y:TOP+i*GAP,visited:false,delivered:false}));
  const startIdx=7;
  districts[startIdx].visited=true;
  const car={x:districts[startIdx].x,y:districts[startIdx].y+54,angle:Math.PI/2,speed:0,steer:0};
  let dpr=1, vw=innerWidth, vh=innerHeight, last=performance.now(), elapsed=0, soundOn=true, toastTimer=0, mapOpen=false, started=false, totalDistance=0, deliveries=0, nearIdx=startIdx;
  let targetIdx=8;
  const keys=new Set(), touch={left:false,right:false,gas:false,brake:false};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(n)=>{let x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x)};
  function resize(){dpr=Math.min(devicePixelRatio||1,2);vw=innerWidth;vh=innerHeight;canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drawMini()}
  addEventListener('resize',resize,{passive:true});resize();
  function roadX(y){let n=clamp((y-TOP)/GAP,0,districts.length-1),i=Math.min(districts.length-2,Math.floor(n)),t=clamp(n-i,0,1);if(n>=districts.length-1)return districts.at(-1).x;let a=districts[i],b=districts[i+1];let p0=districts[Math.max(0,i-1)],p3=districts[Math.min(districts.length-1,i+2)];let t2=t*t,t3=t2*t;return .5*((2*a.x)+(-p0.x+b.x)*t+(2*p0.x-5*a.x+4*b.x-p3.x)*t2+(-p0.x+3*a.x-3*b.x+p3.x)*t3)}
  const camera=()=>({x:clamp(car.x-vw*.5,0,W-vw),y:clamp(car.y-vh*.53,0,TOP+(districts.length-1)*GAP-vh*.8)});
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
  function drawTerrain(cam){
    ctx.fillStyle='#73aa6d';ctx.fillRect(0,0,vw,vh);
    // broad, gently varied fields
    const tile=110;let ox=-cam.x%tile,oy=-cam.y%tile;
    for(let y=oy-tile;y<vh+tile;y+=tile)for(let x=ox-tile;x<vw+tile;x+=tile){let gx=Math.floor((x+cam.x)/tile),gy=Math.floor((y+cam.y)/tile),r=rand(gx*991+gy*31);ctx.fillStyle=r>.75?'#78ad72':r<.2?'#6da36b':'#73aa6d';ctx.fillRect(x,y,tile+1,tile+1);if(r>.82){ctx.globalAlpha=.12;ctx.fillStyle='#e2d58c';ctx.beginPath();ctx.ellipse(x+25,y+70,32,14,-.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}}
    // winding blue-green rivers, far from main road
    ctx.save();ctx.translate(-cam.x,-cam.y);ctx.lineCap='round';
    for(let i=0;i<districts.length-1;i+=2){let d=districts[i], yy=d.y+250, xx=d.x+(i%4<2?390:-450);ctx.beginPath();ctx.moveTo(xx-80,yy-250);ctx.bezierCurveTo(xx+150,yy-100,xx-150,yy+40,xx+40,yy+290);ctx.strokeStyle='#4b9e9a';ctx.lineWidth=70;ctx.stroke();ctx.strokeStyle='#80c3ac';ctx.lineWidth=4;ctx.stroke()}
    // small paddy channels
    for(let i=0;i<districts.length;i++){let d=districts[i], side=i%2?1:-1;ctx.beginPath();ctx.moveTo(d.x+side*230,d.y+170);ctx.quadraticCurveTo(d.x+side*360,d.y+270,d.x+side*260,d.y+410);ctx.strokeStyle='#559f8d';ctx.lineWidth=16;ctx.stroke()}
    ctx.restore();
    // palms and shade trees: deterministic, comfortably off-road
    const top=cam.y-100,bottom=cam.y+vh+100;
    for(let i=0;i<200;i++){let y=TOP-150+i*64;if(y<top||y>bottom)continue;for(let s of [-1,1]){let x=roadX(y)+s*(170+rand(i*7+s*5)*430);if(x<35||x>W-35)continue;drawTree(x-cam.x,y-cam.y,rand(i*17+s*11))}}
  }
  function drawTree(x,y,r){ctx.save();ctx.translate(x,y);let scale=.7+r*.75;ctx.fillStyle='#214d3d';ctx.beginPath();ctx.ellipse(3,8,11*scale,8*scale,0,0,7);ctx.fill();ctx.fillStyle=r>.5?'#32794f':'#3e8650';ctx.beginPath();ctx.ellipse(0,0,10*scale,8*scale,0,0,7);ctx.fill();ctx.fillStyle='#6ba05a';ctx.beginPath();ctx.ellipse(-3,-3,4*scale,3*scale,-.3,0,7);ctx.fill();ctx.restore()}
  function drawRoad(cam){ctx.save();ctx.translate(-cam.x,-cam.y);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();for(let y=TOP-500;y<=TOP+(districts.length-1)*GAP+500;y+=18){let x=roadX(y);if(y===TOP-500)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle='#507357';ctx.lineWidth=126;ctx.stroke();ctx.strokeStyle='#b9aa78';ctx.lineWidth=112;ctx.stroke();ctx.strokeStyle='#59665a';ctx.lineWidth=94;ctx.stroke();ctx.strokeStyle='#647065';ctx.lineWidth=83;ctx.stroke();ctx.setLineDash([17,22]);ctx.strokeStyle='#e3cf83';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
    // roadside village lanes, town huts, tea plots, and named landmarks
    for(let i=0;i<districts.length;i++){let d=districts[i], side=i%2?1:-1, lx=d.x+side*128,ly=d.y+10;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.quadraticCurveTo(d.x+side*65,d.y+20,lx,ly);ctx.strokeStyle='#7b7f66';ctx.lineWidth=22;ctx.stroke();ctx.strokeStyle='#cdc08a';ctx.lineWidth=17;ctx.stroke();ctx.strokeStyle='#676d60';ctx.lineWidth=13;ctx.stroke();
      // compact little town blocks
      for(let j=0;j<11;j++){let bx=d.x+(rand(i*29+j*3)-.5)*230,by=d.y+(rand(i*33+j*13)-.5)*150;if(Math.abs(bx-d.x)<62)continue;drawHouse(bx,by,i,j)}
      drawLandmark(d,side);
    }
    ctx.restore()}
  function drawHouse(x,y,i,j){let w=18+rand(i*13+j)*20,h=13+rand(j*17+i)*15;ctx.fillStyle='#49694c';ctx.fillRect(x-w/2+3,y-h/2+5,w,h);ctx.fillStyle=['#d7c79d','#c4d2a3','#e5b678','#d8ddd0'][Math.floor(rand(i+j*3)*4)];ctx.fillRect(x-w/2,y-h/2,w,h);ctx.fillStyle=['#9d5c43','#b7784b','#78574b'][Math.floor(rand(i*7+j)*3)];ctx.beginPath();ctx.moveTo(x-w/2-3,y-h/2);ctx.lineTo(x,y-h/2-8);ctx.lineTo(x+w/2+3,y-h/2);ctx.closePath();ctx.fill();ctx.fillStyle='#775843';ctx.fillRect(x-2,y+2,5,h/2)}
  function drawLandmark(d,side){let x=d.x+side*135,y=d.y-52;const colors={hills:'#a5b779',coast:'#7ec7bd',water:'#74bfc1',harbor:'#dfb06a',city:'#d2c68d',temple:'#dca970',forest:'#72a273',cliffs:'#bb9371'};ctx.save();ctx.translate(x,y);ctx.fillStyle='#173b35aa';ctx.beginPath();ctx.ellipse(0,29,69,13,0,0,7);ctx.fill();
    if(d.type==='temple'){ctx.fillStyle='#d9b979';ctx.fillRect(-28,-20,56,39);ctx.fillStyle='#884b3b';ctx.beginPath();ctx.moveTo(-34,-20);ctx.lineTo(0,-43);ctx.lineTo(34,-20);ctx.fill();for(let k=0;k<4;k++){ctx.fillStyle='#e6d3a0';ctx.fillRect(-19+k*10,-13,6,12)}}
    else if(d.type==='water'||d.type==='coast'||d.type==='harbor'){ctx.fillStyle=colors[d.type];ctx.beginPath();ctx.ellipse(0,0,37,18,0,0,7);ctx.fill();ctx.fillStyle='#f3dfaa';ctx.fillRect(-31,8,62,3);ctx.fillStyle='#6d4836';ctx.beginPath();ctx.moveTo(-9,2);ctx.lineTo(12,2);ctx.lineTo(5,9);ctx.lineTo(-14,9);ctx.fill();ctx.fillStyle='#f4dd99';ctx.beginPath();ctx.moveTo(-3,-2);ctx.lineTo(-3,-17);ctx.lineTo(7,-4);ctx.fill()}
    else{ctx.fillStyle=colors[d.type]||'#b7ae78';ctx.beginPath();ctx.ellipse(0,0,33,22,0,0,7);ctx.fill();if(d.type==='cliffs'||d.type==='hills'||d.type==='forest'){ctx.fillStyle='#577b4b';ctx.beginPath();ctx.moveTo(-32,4);ctx.lineTo(-12,-25);ctx.lineTo(1,-2);ctx.lineTo(19,-30);ctx.lineTo(35,5);ctx.fill();ctx.fillStyle='#e7d99b';ctx.beginPath();ctx.moveTo(-16,-19);ctx.lineTo(-12,-25);ctx.lineTo(-8,-20);ctx.fill()}}
    ctx.restore();ctx.beginPath();ctx.arc(x,y+21,4,0,7);ctx.fillStyle='#f4ce76';ctx.fill();ctx.strokeStyle='#244e41';ctx.lineWidth=2;ctx.stroke();
    rounded(x-78,y-75,156,22,7,'#153e37de','#f0dda04d');ctx.fillStyle='#fff4d8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 8px "DM Sans"';ctx.fillText(d.spotEn,x,y-64);ctx.fillStyle='#edcb77';ctx.beginPath();ctx.arc(x-67,y-64,2,0,7);ctx.fill();
    // district name plaque
    rounded(d.x-67,d.y+88,134,25,7,'#133b36e8','#e6ce8e44');ctx.fillStyle='#edd083';ctx.font='700 7px "DM Sans"';ctx.fillText(String(iDistrict(d)+1).padStart(2,'0')+'  ·  '+d.en,x,d.y+100);
  }
  function iDistrict(d){return districts.indexOf(d)}
  function drawCar(){ctx.save();ctx.translate(car.x-camera().x,car.y-camera().y);ctx.rotate(car.angle);ctx.shadowColor='#172e25';ctx.shadowBlur=14;ctx.shadowOffsetY=8;
    // rickshaw wheels, chassis and bright curved cabin
    ctx.fillStyle='#24342b';ctx.beginPath();ctx.roundRect(-14,-22,28,47,8);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='#d9aa4f';ctx.beginPath();ctx.roundRect(-12,-23,24,17,5);ctx.fill();ctx.fillStyle='#157457';ctx.beginPath();ctx.roundRect(-12,-7,24,27,6);ctx.fill();
    ctx.fillStyle='#a5d1b4';ctx.beginPath();ctx.roundRect(-8,-17,16,8,3);ctx.fill();ctx.fillStyle='#183d32';ctx.fillRect(-7,-5,14,10);ctx.fillStyle='#f6d675';ctx.fillRect(-12,15,5,4);ctx.fillRect(7,15,5,4);ctx.fillStyle='#f2e7b6';ctx.fillRect(-10,-24,5,3);ctx.fillRect(5,-24,5,3);
    ctx.fillStyle='#1e3028';for(let x of [-15,11]){ctx.fillRect(x,-15,4,10);ctx.fillRect(x,9,4,10)}ctx.restore()}
  function drawMini(){if(!mctx)return;let w=mini.width,h=mini.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#153f3a';mctx.fillRect(0,0,w,h);let xOf=x=>w*(.18+(x/W)*.64),yOf=y=>h*(.06+(y/(TOP+(districts.length-1)*GAP))*.88);mctx.lineCap='round';mctx.beginPath();districts.forEach((d,i)=>i?mctx.lineTo(xOf(d.x),yOf(d.y)):mctx.moveTo(xOf(d.x),yOf(d.y)));mctx.strokeStyle='#c8b87f';mctx.lineWidth=Math.max(3,w*.025);mctx.stroke();districts.forEach((d,i)=>{mctx.beginPath();mctx.arc(xOf(d.x),yOf(d.y),i===targetIdx?4:2.6,0,7);mctx.fillStyle=i===targetIdx?'#f4cb69':d.visited?'#c5df9d':'#83aa88';mctx.fill()});mctx.beginPath();mctx.arc(xOf(car.x),yOf(car.y),4.6,0,7);mctx.fillStyle='#fff0bb';mctx.fill();mctx.strokeStyle='#f2c65f';mctx.lineWidth=1.5;mctx.stroke()}
  function updateHud(){const nearest=nearestDistrict();nearIdx=nearest.i;const complete=deliveries>=14,target=complete?null:districts[targetIdx],distance=target?Math.hypot(car.x-target.x,car.y-target.y):0;document.getElementById('districtTitle').textContent=districts[nearIdx].ml;document.getElementById('districtEnglish').textContent=districts[nearIdx].en+' DISTRICT';document.getElementById('locationLabel').textContent=districts[nearIdx].spotEn+' · '+districts[nearIdx].en;document.getElementById('destinationText').textContent=complete?'JOURNEY COMPLETE':target.ml+' · '+target.en;document.getElementById('distanceText').textContent=complete?'14 / 14':(distance*4.3/1000).toFixed(1)+' km';document.getElementById('visitedCount').textContent=String(districts.filter(d=>d.visited).length).padStart(2,'0')+' / 14';document.getElementById('deliveries').innerHTML=deliveries+' <em>/ 14</em>';document.getElementById('miles').innerHTML=(totalDistance*4.3/1000).toFixed(1)+' <em>km</em>';document.getElementById('speedValue').textContent=Math.round(Math.abs(car.speed)*.53);document.getElementById('speedFill').style.width=Math.min(100,Math.abs(car.speed)/2.6)+'%';const nearTarget=!complete&&distance<115;const ib=document.getElementById('interactButton');ib.disabled=complete;ib.style.opacity=complete?'.55':nearTarget?'1':'.65';ib.querySelector('small').textContent=complete?'COMPLETE':nearTarget?'READY!':'NEAR A STOP';document.getElementById('missionText').textContent=complete?'എല്ലാ ജില്ലകളിലും നന്മയുടെ ഒരു കൈനീട്ടം! ഇനി ഇഷ്ടമുള്ള വഴിയിലൂടെ സഞ്ചരിക്കൂ.':`${target.spot} വഴി പോകുന്ന കൂട്ടുകാരന് ഒരു ഓണസദ്യ എത്തിക്കണം. അടുത്ത സ്റ്റോപ്പിൽ എത്തി DELIVER അമർത്തൂ.`;drawMini()}
  function nearestDistrict(){let best=Infinity,idx=0;for(let i=0;i<districts.length;i++){let d=districts[i],dist=Math.abs(car.y-d.y)+Math.abs(car.x-d.x)*.24;if(dist<best){best=dist;idx=i}}return{i:idx,d:best}}
  function showToast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)}
  function visitCheck(){for(let i=0;i<districts.length;i++){const d=districts[i];if(!d.visited&&Math.hypot(car.x-d.x,car.y-d.y)<115){d.visited=true;showToast('പുതിയ ജില്ല കണ്ടുപിടിച്ചു · '+d.ml+' ✨');drawMini()}}}
  function deliver(){if(deliveries>=14)return;const d=districts[targetIdx];if(Math.hypot(car.x-d.x,car.y-d.y)>145){showToast('അടുത്ത സ്റ്റോപ്പിലേക്ക് കുറച്ച് കൂടി പോകൂ!');return}if(d.delivered)return;deliveries++;d.delivered=true;d.visited=true;showToast('ഓണസദ്യ എത്തിച്ചു! നന്മയ്ക്ക് നന്ദി · +100 ✨');targetIdx=deliveries>=14?-1:(startIdx+1+deliveries)%districts.length;visitCheck();updateHud()}
  function inputState(){let gas=keys.has('w')||keys.has('arrowup')||touch.gas, brake=keys.has('s')||keys.has('arrowdown')||touch.brake,left=keys.has('a')||keys.has('arrowleft')||touch.left,right=keys.has('d')||keys.has('arrowright')||touch.right;return{gas,brake,left,right}}
  function frame(now){let dt=Math.min(.04,(now-last)/1000);last=now;elapsed+=dt;if(started&&!mapOpen){let inp=inputState();let steer=(inp.right?1:0)-(inp.left?1:0);if(inp.gas)car.speed=Math.min(285,car.speed+175*dt);else if(inp.brake)car.speed=Math.max(-90,car.speed-260*dt);else car.speed*=Math.pow(.985,dt*60);if(Math.abs(car.speed)<.5)car.speed=0;car.steer+=(steer-car.steer)*Math.min(1,dt*7);car.angle+=car.steer*dt*(.65+Math.min(1,Math.abs(car.speed)/95))*(car.speed<0?-1:1);let oldX=car.x,oldY=car.y;car.x=clamp(car.x+Math.cos(car.angle)*car.speed*dt,45,W-45);car.y=clamp(car.y+Math.sin(car.angle)*car.speed*dt,TOP-180,TOP+(districts.length-1)*GAP+180);totalDistance+=Math.hypot(car.x-oldX,car.y-oldY);visitCheck();if(Math.floor(elapsed*3)%3===0)updateHud()}
    let cam=camera();ctx.setTransform(dpr,0,0,dpr,0,0);drawTerrain(cam);drawRoad(cam);drawCar();drawMini();requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='e'||k===' ')deliver();if(k==='m')toggleMap()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  function toggleMap(){mapOpen=!mapOpen;document.getElementById('mapOverlay').classList.toggle('open',mapOpen);document.getElementById('mapOverlay').setAttribute('aria-hidden',String(!mapOpen));if(mapOpen)renderDistrictGrid()}
  function renderDistrictGrid(){let grid=document.getElementById('districtGrid');grid.innerHTML='';districts.forEach((d,i)=>{let el=document.createElement('div');el.className='district-card'+(d.visited?' visited':'')+(d.delivered?' delivered':'')+(i===nearIdx?' current':'');el.innerHTML=`<span class="district-num">${String(i+1).padStart(2,'0')}</span><div><strong>${d.ml}</strong><small>${d.en} · ${d.spotEn}${d.delivered?' · DELIVERED':''}</small></div>`;grid.appendChild(el)})}
  document.getElementById('mapButton').onclick=toggleMap;document.getElementById('openMap').onclick=toggleMap;document.getElementById('closeMap').onclick=toggleMap;
  document.getElementById('mapOverlay').addEventListener('click',e=>{if(e.target.id==='mapOverlay')toggleMap()});
  document.getElementById('interactButton').onclick=deliver;
  document.getElementById('soundButton').onclick=()=>{soundOn=!soundOn;document.getElementById('soundButton').style.opacity=soundOn?'1':'.45';showToast(soundOn?'ശബ്ദം ഓൺ':'ശബ്ദം ഓഫ്')};
  document.getElementById('startButton').onclick=()=>{started=true;document.getElementById('startScreen').classList.add('hidden');showToast('എറണാകുളത്ത് നിന്ന് യാത്ര തുടങ്ങി · ആലപ്പുഴയിലേക്ക് പോവൂ!')};
  document.querySelectorAll('[data-control]').forEach(btn=>{const key=btn.dataset.control;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);touch[key]=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();touch[key]=false}))});
  updateHud();
})();
