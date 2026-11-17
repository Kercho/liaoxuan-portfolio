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
  let frame = 0;
  let wheelIdle;
  let active = 0;

  function renderGallery() {
    frame = 0;
    if (!track.clientWidth) return;
    const visible = cards.filter(card => !card.hidden);
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = Infinity;
    visible.forEach((card, index) => {
      const distance = card.offsetLeft + card.offsetWidth / 2 - center;
      const angle = Math.max(-1.22, Math.min(1.22, distance / card.offsetWidth * .66));
      const depth = 1 - Math.cos(angle);
      card.style.setProperty('--gallery-yaw', angle * 180 / Math.PI + 'deg');
      card.style.setProperty('--gallery-depth', -depth * 170 + 'px');
      card.style.setProperty('--gallery-drop', depth * 28 + 'px');
      if (Math.abs(distance) < closest) {
        closest = Math.abs(distance);
        active = index;
      }
    });
    visible.forEach((card, index) => card.classList.toggle('is-centered', index === active));
    previous.disabled = active === 0;
    next.disabled = active >= visible.length - 1;
  }

  function scheduleGallery() {
    if (!frame) frame = requestAnimationFrame(renderGallery);
  }

  function moveGallery(direction) {
    renderGallery();
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
