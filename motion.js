const journey = document.querySelector('.journey');
const canvas = document.querySelector('#waves');
const pen = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const objects = [...document.querySelectorAll('[data-lane]')].map(element => ({
  element,
  lane: Number(element.dataset.lane),
  anchor: Number(element.dataset.x),
  phase: Number(element.dataset.phase)
}));
const lanes = [.29, .49, .66, .83];
const stageControls = [...document.querySelectorAll('[data-progress]')];
let frame = 0;

function wave(lane, x, progress) {
  return lanes[lane] + Math.sin(x * (7 + lane) + progress * 7 + lane * 1.5) * (.036 + lane * .009);
}

function render() {
  frame = 0;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const bitmapWidth = Math.round(width * ratio);
  const bitmapHeight = Math.round(height * ratio);
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  const distance = Math.max(1, journey.offsetHeight - height);
  const progress = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / distance));
  pen.setTransform(ratio, 0, 0, ratio, 0, 0);
  pen.clearRect(0, 0, width, height);
  lanes.forEach((_, lane) => {
    pen.beginPath();
    for (let step = 0; step <= 96; step++) {
      const x = step / 96;
      const y = wave(lane, x, progress) * height;
      if (step === 0) pen.moveTo(0, y);
      else pen.lineTo(x * width, y);
    }
    pen.strokeStyle = lane === 0 || lane === 3 ? '#e6f4ef99' : '#25f1a688';
    pen.lineWidth = 1.3;
    pen.stroke();
  });
  for (const {element, lane, anchor, phase} of objects) {
    const travel = Math.sin(progress * Math.PI * 2 + lane) - Math.sin(lane);
    const x = anchor + travel * (width < 600 ? .044 : .11);
    const angle = progress * 740 + phase;
    const pitch = reducedMotion.matches ? 0 : Math.sin(angle * Math.PI / 180) * 74;
    element.style.setProperty('--x', x * 100 + '%');
    element.style.setProperty('--y', wave(lane, x, progress) * 100 + '%');
    element.style.setProperty('--pitch', pitch + 'deg');
    element.style.setProperty('--yaw', (reducedMotion.matches ? 0 : Math.sin(angle * .011) * 15) + 'deg');
    element.style.setProperty('--roll', (reducedMotion.matches ? 0 : Math.cos(angle * .019) * 10) + 'deg');
  }
  journey.style.setProperty('--progress', progress);
  for (const button of stageControls) {
    button.setAttribute('aria-pressed', String(Math.round(progress * 2) / 2 === Number(button.dataset.progress)));
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(render);
}

addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule);
reducedMotion.addEventListener('change', schedule);
for (const button of stageControls) {
  button.addEventListener('click', () => {
    const top = Math.max(0, journey.offsetHeight - canvas.clientHeight) * Number(button.dataset.progress);
    window.scrollTo({top, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
}
render();
