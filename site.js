const motion = matchMedia('(prefers-reduced-motion: reduce)');
const world = document.querySelector('#world');
const context = world.getContext('2d');

function rect(x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}

function pixelShape(x, y, rows, palette, scale = 2, target = context) {
  rows.forEach((row, rowIndex) => {
    [...row].forEach((pixel, column) => {
      if (!palette[pixel]) return;
      target.fillStyle = palette[pixel];
      target.fillRect(x + column * scale, y + rowIndex * scale, scale, scale);
    });
  });
}

function cloud(x, y, rect) {
  rect(x, y + 8, 44, 3, '#e787a0');
  rect(x + 4, y + 5, 34, 4, '#ef9bac');
  rect(x + 12, y + 3, 18, 4, '#ef9bac');
}

function palm(x, y, scale, target) {
  pixelShape(x, y, [
    '...pp...pp.....','....pp.pp..pp..','.....ppppppppp.',
    '..pppppppp.....','.ppppp.ptpp....','ppp....tt.ppp..',
    '......ttt...pp.','......tt.......','......tt.......',
    '.....ttt.......','.....tt........','.....tt........',
    '....ttt........','....tt.........','...ttt.........',
    '...tt..........','..ttt..........','..tt...........'
  ], {p:'#362042',t:'#512944'}, scale, target);
}

function pipe(x, y) {
  rect(x + 4, y + 8, 32, 70, '#203238');
  rect(x + 7, y + 8, 26, 70, '#37bd64');
  rect(x + 10, y + 8, 6, 70, '#8ae66f');
  rect(x + 28, y + 8, 5, 70, '#23814f');
  rect(x, y, 40, 13, '#203238');
  rect(x + 3, y + 3, 34, 7, '#62da6d');
}

function drawLandscape(target, drift) {
  function rect(x, y, width, height, color) {
    target.fillStyle = color;
    target.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }
  const sky = target.createLinearGradient(0, 0, 0, 132);
  sky.addColorStop(0, '#482966');
  sky.addColorStop(.32, '#a14d86');
  sky.addColorStop(.67, '#ed818e');
  sky.addColorStop(1, '#ffbd82');
  rect(0, 0, 400, 200, sky);
  const sunY = 78 + Math.round(drift * .18);
  for (let y = -38; y < 38; y += 2) {
    const halfWidth = Math.floor(Math.sqrt(38 * 38 - y * y) / 2) * 2;
    rect(306 - halfWidth, sunY + y, halfWidth * 2, 2, y < -10 ? '#ffe1a8' : y < 15 ? '#ffca91' : '#ffa781');
  }
  for (const [x, y] of [[91,45],[224,55],[265,91],[350,77]]) cloud(x, Math.round(y + drift * .28), rect);
  rect(0, 126, 400, 58, '#8f5381');
  for (let row = 0; row < 22; row++) {
    const x = (row * 57 + 23) % 378;
    rect(x, 128 + row * 2, 13 + row % 12, 1, row % 3 ? '#ba6e91' : '#f4a58e');
  }
  for (let x = 255; x < 358; x += 8) {
    const width = 7;
    const height = 8 + (x * 7 % 23);
    rect(x, 126-height, width, height, '#874567');
    rect(x+2, 129-height, 1, 2, '#ffd496');
    rect(x, 128, width, height / 3, '#a75e86');
  }
  palm(226, 129, 3, target);
  palm(359, 112, 4, target);
  palm(175, 148, 2, target);
}

function drawWorld(scroll) {
  drawLandscape(context, Math.min(34, scroll * .065));
  for (const [x, y] of [[270,133],[336,129],[365,114]]) {
    rect(x+2,y,2,6,'#fff0c3');
    rect(x,y+2,6,2,'#fff0c3');
  }
  pipe(382, 165);
  for (let x = 270; x < 318; x += 16) {
    rect(x, 150, 16, 12, '#30263e');
    rect(x + 1, 151, 14, 4, '#ce7f79');
    rect(x + 1, 156, 14, 4, '#a35676');
    rect(x + 8, 156, 1, 4, '#30263e');
  }
  rect(0, 184, 400, 16, '#4a2849');
  rect(0, 184, 400, 2, '#ec9d85');
  for (let x = 0; x < 400; x += 16) {
    rect(x, 187, 14, 5, '#80506c');
    rect(x + 5, 194, 11, 4, '#643958');
  }
}

const list = document.querySelector('#work-list');
const dialog = document.querySelector('#detail');
const media = document.querySelector('#detail-media');
const works = window.portfolioWorks || [];
const categories = ['全部', '虚拟现实 / 增强现实', '交互设计', '游戏开发', '三维动画', '视频剪辑', '绘画与摄影'];
const filters = document.querySelector('#work-filters');
const count = document.querySelector('#work-count');
const search = document.querySelector('#work-search');
const filterButtons = new Map();
const groups = new Map();
for (const category of categories.slice(1)) {
  const section = document.createElement('section');
  section.className = 'work-group';
  if (category === '绘画与摄影') section.id = 'visual-works';
  const heading = document.createElement('h3');
  heading.className = 'reveal from-left';
  heading.textContent = category;
  const grid = document.createElement('div');
  grid.className = 'grid';
  section.append(heading, grid);
  list.append(section);
  groups.set(category, {section, grid, cards: [], collections: new Map()});
}
let activeCategory = '全部';

function selectCategory(category) {
  activeCategory = category;
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const [name, group] of groups) {
    let matches = 0;
    for (const {button, terms} of group.cards) {
      button.hidden = !terms.includes(query);
      if (!button.hidden) matches++;
    }
    for (const collection of group.collections.values()) {
      collection.section.hidden = !collection.grid.querySelector('.card:not([hidden])');
    }
    group.section.hidden = (category !== '全部' && name !== category) || matches === 0;
    if (!group.section.hidden) visible += matches;
  }
  for (const [name, button] of filterButtons) button.setAttribute('aria-pressed', String(name === category));
  count.textContent = visible ? visible + ' 件作品' : '没有找到匹配的作品';
}
search.addEventListener('input', () => selectCategory(activeCategory));

for (const category of categories) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = category;
  button.addEventListener('click', () => selectCategory(category));
  filterButtons.set(category, button);
  filters.append(button);
}

const coinCount = document.querySelector('#coin-count');
const blockSprite = document.querySelector('#side-block').getContext('2d');
pixelShape(0, 0, [
  '.dddddddddddddd.','dhhhhhhhhhhhhhgd','dhggggggggggggsd','dhgglllllgggggsd',
  'dhgglggglgggggsd','dhgggggglgggggsd','dhggggllggggggsd','dhgggglgggggggsd',
  'dhgggglgggggggsd','dhggggggggggggsd','dhgggglgggggggsd','dhggggggggggggsd',
  'dhggggggggggggsd','dhsssssssssssssd','dssssssssssssssd','.dddddddddddddd.'
], {d:'#31243a',h:'#ffe2a0',g:'#e8af60',s:'#9e6654',l:'#fff1c9'}, 1, blockSprite);
let collected = 0;
function addCoins(amount) {
  collected += amount;
  coinCount.textContent = String(collected).padStart(2, '0');
}
const rocket = document.querySelector('#coin-rocket');
const rocketSprite = document.querySelector('#rocket-sprite');
const fireworkEffects = document.querySelector('#firework-effects');
pixelShape(0, 0, [
  '.......d.......','......drd......','.....drrrd.....','....drhhrrd....',
  '...drrhrrrrd...','...dwwwwwwwd...','...dwddgwwwd...','...dwdggwwwd...',
  '...dwgggwwwd...','...dwwwwwwwd...','..ddrrrrrrrdd..','.drdrrrrrrrdrd.',
  '.drdrhrrrrrdrd.','.dddrhrrrrrddd.','....dgggggd....','.....ddddd.....',
  '.......p.......','.......p.......','.......p.......','.......p.......',
  '.......p.......','.......p.......','.......p.......','......ddd......'
], {d:'#372236',r:'#ed6157',h:'#ff9d81',w:'#fff0cf',g:'#ffc75e',p:'#ae745e'}, 1, rocketSprite.getContext('2d'));

function burstCoins(originX) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const flash = document.createElement('span');
  flash.className = 'firework-flash';
  flash.style.setProperty('--burst-x', originX + 'px');
  fireworkEffects.append(flash);
  flash.animate([{opacity: .9}, {opacity: 0}], 420);
  const particles = [];
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 8; column++) {
      const coin = document.createElement('span');
      coin.className = 'coin firework-coin';
      coin.style.left = originX + 'px';
      const x = width * (column + .25 + Math.random() * .5) / 8 - originX;
      const y = height * (row + .3 + Math.random() * .4) / 6;
      fireworkEffects.append(coin);
      const animation = coin.animate([
        {transform:'translate(-50%,-25px) scale(.35)',opacity:0},
        {transform:`translate(${x * .23}px,${y * .24}px) rotate(80deg)`,opacity:1,offset:.18},
        {transform:`translate(${x}px,${y}px) rotate(310deg)`,opacity:1,offset:.69},
        {transform:`translate(${x * 1.04}px,${y + height * .19}px) rotate(480deg) scale(.7)`,opacity:0}
      ], {duration:1250 + Math.random() * 400,delay:Math.random() * 120,easing:'cubic-bezier(.15,.66,.3,1)',fill:'both'});
      particles.push(animation.finished);
    }
  }
  return Promise.allSettled(particles);
}

rocket.addEventListener('click', async () => {
  if (rocket.getAttribute('aria-disabled') === 'true') return;
  if (motion.matches) { addCoins(48); return; }
  const bounds = rocketSprite.getBoundingClientRect();
  const flight = document.createElement('span');
  flight.className = 'firework-flight';
  Object.assign(flight.style, {
    left: bounds.left + 'px', top: bounds.top + 'px',
    width: bounds.width + 'px', height: bounds.height + 'px'
  });
  const copy = document.createElement('canvas');
  copy.width = rocketSprite.width;
  copy.height = rocketSprite.height;
  copy.getContext('2d').drawImage(rocketSprite, 0, 0);
  flight.append(copy);
  rocket.setAttribute('aria-disabled', 'true');
  fireworkEffects.append(flight);
  try {
    await flight.animate([
      {transform:'translateY(0)'},
      {transform:`translateY(-${bounds.bottom + 32}px)`}
    ], {duration:760,easing:'cubic-bezier(.58,.04,.89,.55)',fill:'forwards'}).finished;
    flight.remove();
    addCoins(48);
    if (!motion.matches) await burstCoins(bounds.left + bounds.width / 2);
  } finally {
    fireworkEffects.replaceChildren();
    rocket.removeAttribute('aria-disabled');
  }
});

const turtle = document.querySelector('#turtle').getContext('2d');
pixelShape(0, 0, [
  '.....dd..................','....dwwd.................','...dwwwd.................',
  '...dwbwd..........ddd....','....dwwd.........dyyd....','.....dwddddd....dyykd....',
  '......ddggggdd..dyyyyd...','....ddggggggggdddyyddd...',
  '...dgggGGggGGggdyyyyyd...','...dggGGGggGGggdyyyyd....',
  '..dyddggggggggddyyyyd....','...dyddddddddddyyyyyd....',
  '....dyyyyyyyyyyyyydd.....','.....ddddddyyyydyd......',
  '..........dyydddyyd.....','...........dd...dd.......'
], {d:'#2b2632',w:'#fffdf5',b:'#bedfff',g:'#50bc55',G:'#278950',y:'#ffd461',k:'#241b26'}, 1, turtle);

function image(source, alt) {
  const img = document.createElement('img');
  img.src = source;
  img.alt = alt;
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  return img;
}

const star = document.querySelector('#float-star').getContext('2d');
pixelShape(0, 0, [
  '......d......','.....dgd.....','.....dgd.....','....dgggd....',
  'ddddgggggdddd','.dgggggggggd.','..dghghgggd..','...dgggggd...',
  '...dgggggd...','..dggdddggd..','..dgd...dgd..','..dd.....dd..'
], {d:'#673748',g:'#ffcf6a',h:'#66344a'}, 1, star);

const boo = document.querySelector('#float-boo').getContext('2d');
pixelShape(0, 0, [
  '.....dddd......','...ddwwwwdd....','..dwwwwwwwwd...','.dwwwwwwwwwwd..',
  '.dwwdwwdwwwwd..','dwwwwwwwwwwwwd.','dwwwrrrrrwwwwdd',
  'dwwwrrttwwwllld','.dwwwwwlllllld.','..ddllllllllld.',
  '....ddddllldd..','........ddd....'
], {d:'#68405b',w:'#fff1e8',l:'#e9afc9',r:'#a64f70',t:'#ff8eaa'}, 1, boo);

document.querySelector('#side-star').getContext('2d').drawImage(star.canvas, 0, 0);
document.querySelector('#side-boo').getContext('2d').drawImage(boo.canvas, 0, 0);

const hero = document.querySelector('.hero');
const floatLayer = document.querySelector('.scene-floats');
function resetFloats() {
  floatLayer.style.setProperty('--float-x', '0px');
  floatLayer.style.setProperty('--float-y', '0px');
}
hero.addEventListener('pointermove', event => {
  if (motion.matches || event.pointerType === 'touch') return;
  const bounds = hero.getBoundingClientRect();
  floatLayer.style.setProperty('--float-x', ((event.clientX-bounds.left)/bounds.width-.5)*20+'px');
  floatLayer.style.setProperty('--float-y', ((event.clientY-bounds.top)/bounds.height-.5)*14+'px');
}, {passive:true});
hero.addEventListener('pointerleave', resetFloats);
motion.addEventListener('change', resetFloats);

function showWork(work) {
  const isGalleryImage = Boolean(work.collection && !work.video && work.images?.length === 1);
  dialog.classList.toggle('image-preview', isGalleryImage);
  const detailTitle = document.querySelector('#detail-title');
  detailTitle.textContent = work.title || work.alt;
  detailTitle.classList.toggle('visually-hidden', !work.title);
  const detailText = document.querySelector('#detail-text');
  detailText.textContent = work.description || '';
  detailText.hidden = !work.description;
  let video;
  if (work.video) {
    video = document.createElement('video');
    video.src = work.video;
    video.poster = work.cover || '';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    media.append(video);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'button';
    retry.hidden = true;
    retry.textContent = '重新加载视频';
    video.addEventListener('error', () => { retry.hidden = false; });
    retry.addEventListener('click', () => {
      retry.hidden = true;
      video.load();
      video.play().catch(() => {});
    });
    media.append(retry);
  }
  for (const source of work.images || []) media.append(image(source, work.alt || work.description || work.title));
  dialog.showModal();
  if (video) video.play().catch(() => {});
}

for (const work of works) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  if (work.cover) {
    const thumbnail = document.createElement('span');
    thumbnail.className = 'thumbnail';
    thumbnail.append(image(work.cover, work.title ? '' : work.alt));
    if (work.video) {
      const play = document.createElement('span');
      play.className = 'play';
      play.textContent = '▶';
      play.setAttribute('aria-hidden', 'true');
      thumbnail.append(play);
    }
    button.append(thumbnail);
  }
  if (work.title) {
    const title = document.createElement('strong');
    title.textContent = work.title;
    button.append(title);
  }
  if (work.category && !work.collection) {
    const category = document.createElement('span');
    category.className = 'card-category';
    category.textContent = work.category;
    button.append(category);
  }
  button.addEventListener('click', () => showWork(work));
  const group = groups.get(work.category);
  if (work.collection && !group.collections.has(work.collection)) {
    const section = document.createElement('section');
    section.className = 'visual-collection';
    const heading = document.createElement('h4');
    heading.textContent = work.collection;
    const grid = document.createElement('div');
    grid.className = 'visual-grid';
    section.append(heading, grid);
    group.section.append(section);
    group.collections.set(work.collection, {section, grid});
  }
  const grid = group.collections.get(work.collection)?.grid || group.grid;
  grid.append(button);
  const terms = [work.title, work.alt, work.category, work.collection, work.description].join(' ').toLowerCase();
  group.cards.push({button, terms});
}
selectCategory('全部');
const featured = works.find(work => work.bvid === 'BV1jf4y1U7Xi');
if (featured) {
  const button = document.querySelector('#featured-work');
  button.querySelector('img').src = featured.cover;
  button.addEventListener('click', () => showWork(featured));
  button.hidden = false;
}
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => media.replaceChildren());

let previous = window.scrollY;
let direction = 'enter-up';
let scheduled = false;
const featuredArt = document.querySelector('.featured-art');
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const classes = entry.target.classList;
    classes.remove('enter-up', 'enter-down');
    if (entry.isIntersecting) classes.add(direction);
  }
}, {threshold: .12});
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

function updateScroll() {
  const scroll = window.scrollY;
  const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(1, scroll / range));
  const art = featuredArt.getBoundingClientRect();
  const artOffset = Math.max(-1, Math.min(1, (art.top + art.height / 2) / window.innerHeight * 2 - 1));
  const style = document.documentElement.style;
  style.setProperty('--progress', progress);
  style.setProperty('--side-drift', motion.matches ? '0px' : (progress * 52 - 26) + 'px');
  style.setProperty('--side-tilt', motion.matches || scroll === 0 ? '0deg' : direction === 'enter-up' ? '5deg' : '-5deg');
  style.setProperty('--featured-drift', motion.matches ? '0%' : artOffset * 2.5 + '%');
  drawWorld(motion.matches ? 0 : scroll);
  scheduled = false;
}

addEventListener('scroll', () => {
  const scroll = window.scrollY;
  if (scroll !== previous) direction = scroll > previous ? 'enter-up' : 'enter-down';
  previous = scroll;
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(updateScroll);
  }
}, {passive: true});
addEventListener('resize', updateScroll);
motion.addEventListener('change', updateScroll);
new ResizeObserver(updateScroll).observe(document.body);
updateScroll();
