const reel = document.querySelector('#reel');
const reelPrevious = document.querySelector('#reel-prev');
const reelNext = document.querySelector('#reel-next');
const reelWorks = categories.slice(1).map(category =>
  works.find(work => work.category === category && work.cover)
).filter(Boolean);

for (const work of reelWorks) {
  const slide = document.createElement('button');
  slide.type = 'button';
  slide.className = 'reel-slide';
  slide.append(image(work.cover, work.title ? '' : work.alt));
  if (work.title) {
    const title = document.createElement('strong');
    title.textContent = work.title;
    slide.append(title);
  }
  slide.addEventListener('click', () => showWork(work));
  reel.append(slide);
}

function syncReelControls() {
  reelPrevious.disabled = reel.scrollLeft < 2;
  reelNext.disabled = reel.scrollLeft + reel.clientWidth >= reel.scrollWidth - 2;
}

function moveReel(direction) {
  const slide = reel.firstElementChild;
  if (!slide) return;
  const gap = parseFloat(getComputedStyle(reel).columnGap) || 0;
  reel.scrollBy({left: direction * (slide.offsetWidth + gap), behavior: motion.matches ? 'instant' : 'smooth'});
}

reelPrevious.addEventListener('click', () => moveReel(-1));
reelNext.addEventListener('click', () => moveReel(1));
reel.addEventListener('scroll', syncReelControls, {passive: true});
new ResizeObserver(syncReelControls).observe(reel);

function enableMouseDrag(track) {
  let drag;
  let dragged = false;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragged = false;
    drag = {id: event.pointerId, x: event.clientX, scroll: track.scrollLeft};
  });
  track.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    if (!dragged && Math.abs(distance) < 7) return;
    if (!dragged) {
      dragged = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    track.scrollLeft = drag.scroll - distance;
  });
  function stopDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    track.classList.remove('is-dragging');
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    window.addEventListener(type, stopDrag);
  }
  track.addEventListener('click', event => {
    if (dragged && event.detail) {
      event.preventDefault();
      event.stopPropagation();
    }
    dragged = false;
  }, true);
}
enableMouseDrag(reel);

function drawGalleryCloth(surface, bend, hover) {
  const {thumbnail, image, canvas, context} = surface;
  const width = thumbnail.clientWidth;
  const height = thumbnail.clientHeight;
  if (!context || !image.naturalWidth || !width || !height) return;
  const paint = [width, height, bend, hover];
  if (surface.paint?.every((value, index) => value === paint[index])) return;
  surface.paint = paint;

  const resolution = Math.min(1.5, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * resolution);
  const pixelHeight = Math.round(height * resolution);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  context.setTransform(resolution, 0, 0, resolution, 0, 0);
  context.clearRect(0, 0, width, height);
  const edge = Math.max(2, width * .007);
  const scale = Math.min((width * .976 - edge * 2) / image.naturalWidth,
    (height * .86 - edge * 2) / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  const clothWidth = imageWidth + edge * 2;
  const clothHeight = imageHeight + edge * 2;
  const inset = (width - clothWidth) / 2;
  const topEdge = (height - clothHeight) / 2 - height * .012;
  const imageLeft = (width - imageWidth) / 2;
  const imageRight = imageLeft + imageWidth;
  const strips = Math.ceil(clothWidth / 4);
  const seams = Array.from({length: strips + 1}, (_, index) => {
    const fraction = index / strips;
    const offset = fraction * 2 - 1;
    const sag = (1 - offset ** 2) * .026;
    const ripple = Math.sin(fraction * Math.PI * 2 - bend * .7) * bend * .031;
    const top = topEdge + height * (sag + ripple + offset * bend * .026);
    const bottom = top + clothHeight + height * (sag - ripple * .55);
    return {x: inset + fraction * clothWidth, top, bottom};
  });

  context.beginPath();
  context.moveTo(seams[0].x, seams[0].top);
  for (const seam of seams.slice(1)) context.lineTo(seam.x, seam.top);
  for (let index = strips; index >= 0; index--) {
    const {x, bottom} = seams[index];
    context.lineTo(x, bottom);
  }
  context.closePath();
  context.save();
  context.clip();
  context.fillStyle = '#392638';
  context.fillRect(0, 0, width, height);
  for (let index = 0; index < strips; index++) {
    const left = seams[index];
    const right = seams[index + 1];
    const x = Math.max(imageLeft, left.x);
    const sectionWidth = Math.min(imageRight, right.x) - x;
    if (sectionWidth <= 0) continue;
    const columnHeight = left.bottom - left.top;
    const drawHeight = imageHeight * columnHeight / clothHeight;
    // A small overlap keeps the fabric continuous at fractional pixel boundaries.
    context.drawImage(image, (x - imageLeft) / scale, 0, sectionWidth / scale, image.naturalHeight,
      x, left.top + (columnHeight - drawHeight) / 2, sectionWidth + .7, drawHeight);
  }

  const ridge = Math.max(.3, Math.min(.7, .5 + bend * .14 + hover * .08));
  const shading = context.createLinearGradient(inset, 0, width - inset, height * .22);
  shading.addColorStop(0, '#1d122130');
  shading.addColorStop(ridge - .22, '#23132920');
  shading.addColorStop(ridge, '#fff3df16');
  shading.addColorStop(ridge + .18, '#29162a24');
  shading.addColorStop(1, '#fff3df10');
  context.fillStyle = shading;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#fff6ef0b';
  for (let y = 0; y < height; y += 3) context.fillRect(0, y, width, .65);
  context.fillStyle = '#21132410';
  for (let x = 0; x < width; x += 4) context.fillRect(x, 0, .65, height);
  context.restore();
  context.lineWidth = 1;
  context.strokeStyle = '#ffe2c37d';
  context.stroke();
  thumbnail.classList.add('has-cloth');
}

for (const {section, grid: track} of groups.get('绘画与摄影').collections.values()) {
  const heading = section.querySelector('h4');
  const toolbar = document.createElement('div');
  toolbar.className = 'gallery-toolbar';
  const controls = document.createElement('div');
  controls.className = 'gallery-controls';
  const previous = galleryArrow('←', '上一张' + heading.textContent);
  const next = galleryArrow('→', '下一张' + heading.textContent);
  controls.append(previous, next);
  toolbar.append(heading, controls);
  const stage = document.createElement('div');
  stage.className = 'gallery-stage';
  const backdrop = document.createElement('canvas');
  backdrop.className = 'gallery-backdrop';
  backdrop.width = world.width;
  backdrop.height = world.height;
  backdrop.setAttribute('aria-hidden', 'true');
  drawLandscape(backdrop.getContext('2d'), 0);
  stage.append(backdrop, toolbar, track);
  section.append(stage);
  track.tabIndex = 0;
  track.setAttribute('role', 'region');
  track.setAttribute('aria-label', heading.textContent + '画廊');
  const cards = [...track.children];
  const surfaces = new Map();
  for (const card of cards) {
    const thumbnail = card.querySelector('.thumbnail');
    const image = thumbnail?.querySelector('img');
    if (!image) continue;
    const canvas = document.createElement('canvas');
    canvas.className = 'gallery-cloth';
    canvas.setAttribute('aria-hidden', 'true');
    thumbnail.append(canvas);
    surfaces.set(card, {thumbnail, image, canvas, context: canvas.getContext('2d'), bend: 0, speed: 0});
    image.addEventListener('load', scheduleGallery, {once: true});
  }
  let frame = 0;
  let wheelIdle;
  let active = 0;
  let pointerCard;
  let pointerOffset = 0;
  let lastScroll = track.scrollLeft;
  let lastFrame;
  let scrollMomentum = 0;

  function renderGallery(timestamp) {
    frame = 0;
    const trackWidth = track.clientWidth;
    if (!trackWidth) {
      lastFrame = undefined;
      return;
    }
    const visible = cards.filter(card => !card.hidden);
    const scroll = track.scrollLeft;
    const center = scroll + trackWidth / 2;
    const step = lastFrame ? Math.min(2, (timestamp - lastFrame) / 16.67) : 1;
    const travel = scroll - lastScroll;
    lastFrame = timestamp;
    lastScroll = scroll;
    scrollMomentum += (Math.max(-1, Math.min(1, travel / 22)) - scrollMomentum) * .24;
    const reduced = motion.matches;
    const dragging = track.matches('.is-dragging,.is-wheeling');
    let moving = !reduced && Math.abs(scrollMomentum) > .012;
    let closest = Infinity;

    visible.forEach((card, index) => {
      const width = card.offsetWidth;
      const distance = card.offsetLeft + width / 2 - center;
      if (Math.abs(distance) < closest) {
        closest = Math.abs(distance);
        active = index;
      }
      if (reduced || !width || Math.abs(distance) > (trackWidth + width) / 2 + 24) return;
      const position = Math.max(-1, Math.min(1, distance / width));
      card.style.setProperty('--gallery-yaw', position * 17 + 'deg');
      card.style.setProperty('--gallery-drop', Math.abs(position) * 12 + 'px');
      const surface = surfaces.get(card);
      if (!surface) return;
      const hover = card === pointerCard && !dragging ? pointerOffset : 0;
      const target = Math.max(-1, Math.min(1, position * .44 - scrollMomentum * .69 + hover * .34));
      surface.speed = (surface.speed + (target - surface.bend) * .125 * step) * .72 ** step;
      surface.bend += surface.speed * step;
      if (Math.abs(target - surface.bend) < .003 && Math.abs(surface.speed) < .002) {
        surface.bend = target;
        surface.speed = 0;
      } else {
        moving = true;
      }
      drawGalleryCloth(surface, surface.bend, hover);
    });

    visible.forEach((card, index) => card.classList.toggle('is-centered', index === active));
    previous.disabled = active === 0;
    next.disabled = active >= visible.length - 1;
    if (moving) scheduleGallery();
  }

  function scheduleGallery() {
    if (!frame) frame = requestAnimationFrame(renderGallery);
  }

  function moveGallery(direction) {
    const visible = cards.filter(card => !card.hidden);
    const card = visible[active + direction];
    if (!card) return;
    const left = card.offsetLeft + (card.offsetWidth - track.clientWidth) / 2;
    track.scrollTo({left, behavior: motion.matches ? 'instant' : 'smooth'});
  }

  previous.addEventListener('click', () => moveGallery(-1));
  next.addEventListener('click', () => moveGallery(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('scroll', scheduleGallery, {passive: true});
  track.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    pointerCard = event.target.closest('.card');
    if (pointerCard) {
      const {left, width} = pointerCard.getBoundingClientRect();
      pointerOffset = Math.max(-1, Math.min(1, (event.clientX - left) / width * 2 - 1));
    }
    scheduleGallery();
  }, {passive: true});
  track.addEventListener('pointerleave', () => {
    pointerCard = undefined;
    scheduleGallery();
  });
  track.addEventListener('wheel', event => {
    if (event.ctrlKey || !event.cancelable || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const edge = track.scrollWidth - track.clientWidth;
    if (event.deltaY > 0 ? track.scrollLeft >= edge - 1 : track.scrollLeft <= 1) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
    track.classList.add('is-wheeling');
    track.scrollLeft += event.deltaY * unit;
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => track.classList.remove('is-wheeling'), 150);
  }, {passive: false});
  new ResizeObserver(scheduleGallery).observe(track);
  new MutationObserver(scheduleGallery).observe(track, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  motion.addEventListener('change', scheduleGallery);
  enableMouseDrag(track);
  scheduleGallery();
}

function galleryArrow(symbol, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = symbol;
  button.setAttribute('aria-label', label);
  return button;
}

const finder = document.querySelector('#finder');
const finderCategory = document.querySelector('#finder-category');
const finderKeyword = document.querySelector('#finder-keyword');
for (const category of categories) finderCategory.add(new Option(category, category));

document.querySelector('#open-finder').addEventListener('click', () => {
  finderCategory.value = activeCategory;
  finderKeyword.value = search.value;
  finder.showModal();
});
document.querySelector('#close-finder').addEventListener('click', () => finder.close());
document.querySelector('#finder-form').addEventListener('submit', event => {
  event.preventDefault();
  search.value = finderKeyword.value;
  selectCategory(finderCategory.value);
  finder.close();
  search.focus({preventScroll: true});
  document.querySelector('#works').scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth'});
});
