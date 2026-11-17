(() => {
  const dialog = document.querySelector('#game');
  const canvas = document.querySelector('#level');
  const pen = canvas.getContext('2d');
  const status = document.querySelector('#game-status');
  const controls = dialog.querySelectorAll('[data-control]');
  const keys = new Set();
  const touches = new Map();
  const mushroomRows = ['...rrrrrr...','..rrwwrrrr..','.rrrwwrrrrr.','rrwwrrrrwwrr','rrwwrrrrwwrr','rrrrrrrrrrrr','..ssssssss..','..ssdsdsss..','...ssssss...','....dddd....'];
  const mushroomPalette = {r:'#eb635e',s:'#ffda9c',w:'#fff1d4',d:'#442738'};
  const mushroomSprite = document.querySelector('#mushroom-sprite').getContext('2d');
  pixelShape(0,0,mushroomRows,mushroomPalette,1,mushroomSprite);
  const floor = 164;
  const blocks = [
    {x:66,y:123,w:16,h:16,type:'brick'},
    {x:82,y:123,w:16,h:16,type:'coin'},
    {x:98,y:123,w:16,h:16,type:'brick'},
    {x:114,y:123,w:16,h:16,type:'mushroom'},
    {x:189,y:142,w:29,h:22,type:'pipe'},
    {x:261,y:147,w:16,h:17,type:'brick'},
    {x:277,y:132,w:16,h:32,type:'brick'},
    {x:293,y:116,w:16,h:48,type:'brick'}
  ];
  let player, enemy, mushroom, coins, used, stage, frame, lastTime;

  function reset() {
    player = {x:19,y:floor-15,w:12,h:15,vy:0,grounded:true,facing:1};
    enemy = {x:148,y:floor-13,w:14,h:13,direction:1};
    mushroom = null;
    coins = [{x:56,y:148},{x:152,y:145},{x:198,y:121},{x:282,y:112},{x:319,y:108}];
    used = new Set();
    stage = 'playing';
    keys.clear();
    touches.clear();
    status.textContent = '收集金币，跑到旗杆。';
    draw();
  }

  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const held = control => [...keys].some(key => bindings[key] === control) || [...touches.values()].includes(control);

  function hit(block) {
    if (used.has(block)) return;
    if (block.type === 'coin') {
      used.add(block);
      addCoins(1);
      status.textContent = '获得金币！';
    } else if (block.type === 'mushroom') {
      used.add(block);
      mushroom = {x:block.x+2,y:block.y-15,w:12,h:12};
      status.textContent = '蘑菇出现了。';
    }
  }

  function update(dt) {
    const dx = (Number(held('right')) - Number(held('left'))) * 2.3 * dt;
    if (dx) player.facing = Math.sign(dx);
    player.x = Math.max(0, Math.min(canvas.width-player.w, player.x+dx));
    for (const block of blocks) {
      if (overlap(player,block) && dx) player.x = dx > 0 ? block.x-player.w : block.x+block.w;
    }
    if (player.grounded && held('jump')) player.vy = -6.25;
    player.grounded = false;
    player.vy = Math.min(7,player.vy+.28*dt);
    const oldBottom = player.y+player.h;
    player.y += player.vy*dt;
    for (const block of blocks) {
      if (!overlap(player,block)) continue;
      if (player.vy > 0) {
        player.y = block.y-player.h;
        player.grounded = true;
      } else {
        player.y = block.y+block.h;
        hit(block);
      }
      player.vy = 0;
    }
    if (player.y+player.h >= floor) {
      player.y = floor-player.h;
      player.vy = 0;
      player.grounded = true;
    }
    for (const coin of coins) {
      if (coin.taken || !overlap(player,{...coin,w:7,h:10})) continue;
      coin.taken = true;
      addCoins(1);
    }
    if (mushroom && overlap(player,mushroom)) {
      mushroom = null;
      player.powered = true;
      status.textContent = '获得蘑菇，抵挡一次碰撞。';
    }
    if (enemy) {
      enemy.x += enemy.direction*.72*dt;
      if (enemy.x < 133 || enemy.x > 170) enemy.direction *= -1;
      if (overlap(player,enemy)) {
        if (player.vy >= 0 && oldBottom <= enemy.y+4) {
          enemy = null;
          player.vy = -3.8;
        } else if (player.powered) {
          player.powered = false;
          enemy = null;
          status.textContent = '蘑菇抵挡了一次碰撞。';
        } else {
          stage = 'lost';
          status.textContent = '碰到了栗宝宝。点「重玩」再来一次。';
        }
      }
    }
    if (stage === 'playing' && player.x >= 354) {
      stage = 'won';
      addCoins(3);
      status.textContent = '抵达旗杆！获得 3 枚通关金币。';
    }
  }

  function box(x,y,w,h,color) {
    pen.fillStyle = color;
    pen.fillRect(Math.round(x),Math.round(y),w,h);
  }

  function draw() {
    pen.drawImage(world,0,0,world.width,123,0,0,canvas.width,floor);
    box(0,floor,384,28,'#372c50');
    box(0,floor,384,4,'#c69ca1');
    for (let x=0;x<384;x+=16) {
      box(x,floor+5,14,8,'#75516b');
      box(x+6,floor+15,14,8,'#5c4160');
    }
    for (const b of blocks) {
      const question = b.type === 'coin' || b.type === 'mushroom';
      box(b.x,b.y,b.w,b.h,'#23182c');
      box(b.x+2,b.y+2,b.w-4,b.h-4,b.type === 'pipe' ? '#57c582' : question && !used.has(b) ? '#ffca65' : '#a56964');
      if (question && !used.has(b)) {
        pen.font = 'bold 11px monospace';
        pen.fillStyle = '#41273b';
        pen.fillText('?',b.x+5,b.y+12);
      }
    }
    for (const coin of coins) if (!coin.taken) {
      box(coin.x,coin.y,7,10,'#ca7a42');
      box(coin.x+1,coin.y+1,5,8,'#ffdb6d');
      box(coin.x+2,coin.y+2,1,6,'#fff2ba');
    }
    if (mushroom) pixelShape(mushroom.x,mushroom.y,mushroomRows,mushroomPalette,1,pen);
    if (enemy) pixelShape(enemy.x,enemy.y,[
      '..dddd..','.dbbbbd.','dbkbbkbd','dbwbbwbd','dssssssd','.dd..dd.'
    ],{d:'#312038',b:'#b37654',k:'#2d2236',w:'#fff1d4',s:'#ffd39b'},1.75,pen);
    box(363,69,2,95,'#f8d6aa');
    box(361,66,6,5,'#ffd17a');
    box(365,73,16,9,'#ff9f92');
    box(365,82,10,4,'#ff9f92');
    const rows = ['..rrrr..','.rrrrrr.','.ddssd..','dsssdds.','.ssssss.','..rbr...','.rbbbr..','.bbbbb..','..d.dd..'];
    pixelShape(player.x,player.y,player.facing === 1 ? rows : rows.map(row => [...row].reverse().join('')),{
      r:player.powered ? '#fff1d4' : '#f06565',d:'#452c38',s:'#ffc58b',b:'#6c78e4'
    },1.5,pen);
  }

  const bindings = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'};
  dialog.addEventListener('keydown', event => {
    if (!bindings[event.code] || (event.code === 'Space' && event.target.tagName === 'BUTTON')) return;
    event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener('keyup',event => keys.delete(event.code));
  window.addEventListener('blur',() => { keys.clear(); touches.clear(); });
  for (const button of controls) {
    button.addEventListener('pointerdown',event => {
      touches.set(event.pointerId,button.dataset.control);
      button.setPointerCapture(event.pointerId);
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(type,event => touches.delete(event.pointerId));
    }
  }
  function tick(time) {
    if (!dialog.open) return;
    if (stage === 'playing') update(Math.min(1.5,(time-lastTime)/16.67));
    lastTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function start() {
    reset();
    dialog.showModal();
    canvas.focus();
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
  document.querySelector('#start-game').addEventListener('click',start);
  document.querySelector('#hero-mushroom').addEventListener('click',start);
  document.querySelector('#restart-game').addEventListener('click',() => { reset(); canvas.focus(); });
  document.querySelector('#close-game').addEventListener('click',() => dialog.close());
  dialog.addEventListener('close',() => { cancelAnimationFrame(frame); keys.clear(); touches.clear(); });
})();
