(() => {
  const canvas = document.querySelector('#hero-animation');
  const pen = canvas.getContext('2d');
  const mushroom = document.querySelector('#mushroom-sprite');
  const turtle = document.querySelector('#turtle');
  const pause = document.querySelector('#hero-pause');
  const body = [
    '...rrrr.....','..rrrrrrr...','..ddssd.....','.dsdssssd...','.dsssdsss...','.ddsssss....',
    '...rbr......','..rrbrrw....','.wbbbbbw....','..bbbb......'
  ];
  const feet = [
    ['..bbb.bb....','.ddd..ddd...'],
    ['...bbbb.....','..ddd.dd....'],
    ['...bb.......','...ddd......']
  ];
  const normal = {r:'#ed453a',s:'#ffc28d',d:'#573043',b:'#4855ad',w:'#fff4de'};
  const fire = {...normal, r:'#fff4de', b:'#ee5544'};
  const impact = 2.05;
  const powerUp = 3.55;
  const shot = 4.95;
  const hit = 5.65;
  const duration = 7.7;
  let elapsed = 0;
  let lastFrame;
  let frame;
  let inView = false;
  let paused = false;

  const clamp = value => Math.min(1, Math.max(0, value));
  const mix = (from, to, fraction) => from + (to - from) * clamp(fraction);

  function square(x, y, size, color) {
    pen.fillStyle = color;
    pen.fillRect(Math.round(x), Math.round(y), size, size);
  }

  function draw(time) {
    pen.clearRect(0, 0, canvas.width, canvas.height);
    const jump = clamp((time - 1.45) / 1.2);
    const lift = 33 * Math.sin(jump * Math.PI);
    const powered = time >= powerUp;
    const x = time < impact ? mix(205, 247, time / impact)
      : time < powerUp ? mix(247, 276, (time - impact) / (powerUp - impact))
      : time < shot ? mix(276, 312, (time - powerUp) / (shot - powerUp))
      : mix(312, 365, (time - hit - .2) / 1.55);
    const scale = powered ? 2.15 : 1.75;
    const pose = lift > 2 ? 0 : Math.floor(time * 11) % feet.length;
    const flashing = time < powerUp + .45 && Math.floor((time - powerUp) * 18) % 2;
    pixelShape(Math.round(x), Math.round(184 - 12 * scale - lift), [...body, ...feet[pose]],
      powered && !flashing ? fire : normal, scale, pen);

    if (time < impact) {
      square(250, 119, 15, '#48253e');
      square(251, 120, 13, '#c47168');
      pen.fillStyle = '#5d3855';
      pen.fillRect(252, 126, 11, 1);
      pen.fillRect(256, 121, 1, 5);
    } else if (time < impact + .55) {
      const age = time - impact;
      for (const speed of [-23, -12, 10, 24]) {
        square(256 + speed * age, 125 - 53 * age + 104 * age ** 2, 3, '#f1a07f');
      }
    }
    if (time >= impact && time < powerUp) {
      const age = time - impact;
      const mushroomX = mix(253, 285, age / 1.5);
      const mushroomY = age < .35 ? mix(122, 107, age / .35) : mix(107, 174, ((age - .35) / 1.15) ** 2);
      pen.drawImage(mushroom, Math.round(mushroomX), Math.round(mushroomY));
    }

    if (time < hit) {
      const turtleX = mix(367, 357, (time - 3.6) / (hit - 3.6));
      pen.save();
      pen.translate(Math.round(turtleX) + 22, 169 + Math.round(Math.sin(time * 10) * 2));
      pen.scale(-1, 1);
      pen.drawImage(turtle, 0, 0, 22, 15);
      pen.restore();
    } else if (time < hit + .55) {
      const age = time - hit;
      pen.save();
      pen.globalAlpha = 1 - age / .55;
      pen.translate(369 + age * 26, 174 - age * 48 + age ** 2 * 124);
      pen.rotate(age * 10);
      pen.drawImage(turtle, -11, -7, 22, 15);
      pen.restore();
      for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
        square(360 + dx * age * 40, 174 + dy * age * 30, 3, '#ffd77e');
      }
    }
    if (time >= shot && time < hit) {
      const progress = (time - shot) / (hit - shot);
      const fireX = mix(333, 360, progress);
      const fireY = 170 + Math.abs(Math.sin(progress * Math.PI * 2)) * 8;
      square(fireX - 4, fireY + 1, 4, '#ed784a');
      square(fireX, fireY, 6, '#fa8b46');
      square(fireX + 1, fireY + 1, 4, '#ffeb9b');
    }
  }

  function tick(now) {
    if (lastFrame !== undefined) elapsed = (elapsed + Math.min(.1, (now - lastFrame) / 1000)) % duration;
    lastFrame = now;
    draw(elapsed);
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    lastFrame = undefined;
    const playing = inView && !document.hidden && !paused && !motion.matches;
    pause.hidden = motion.matches;
    pause.setAttribute('aria-label', paused ? '继续动画' : '暂停动画');
    pause.classList.toggle('is-paused', paused);
    draw(motion.matches ? 4.35 : elapsed);
    if (playing) frame = requestAnimationFrame(tick);
  }

  pause.addEventListener('click', () => { paused = !paused; sync(); });
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(canvas);
  sync();
})();
