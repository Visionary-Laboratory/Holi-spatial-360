'use strict';

const CASES = [
  { id: 'case01_realsee_12s', duration: 9, fps: 15,
    panoramas: ['pano16', 'pano00'], referenceContext: 'Opening clip · Scene 00028',
    caption: 'Three indoor scenes. Cuts between the 3-second clips are intentional.',
    note: '<strong>Realsee collection.</strong> Three independent 3-second clips, 15 fps. These scenes are in the adapted DiFix training split; this collection is not a held-out evaluation.' },
  { id: 'case02_ziroom_microwave', duration: 134 / 30, fps: 30,
    panoramas: ['pano02', 'pano01'], referenceContext: 'Apartment route',
    caption: 'A 134-frame apartment route, from pano03 through pano02 toward pano01.',
    note: '<strong>Apartment walkthrough.</strong> A matched 134-frame camera route at 30 fps. GSFixer uses overlapping windows, so window transitions may remain visible.' },
  { id: 'case03_realsee_scene00506_6s', duration: 6, fps: 15,
    panoramas: ['pano10', 'pano11'], referenceContext: 'Opening clip · Scene 00506',
    caption: 'Two views of a living space. The cut at 3 seconds is intentional.',
    note: '<strong>Realsee living space.</strong> Scene 00506, two 45-frame clips at 15 fps. This scene is in the adapted DiFix training split. The clips are separate generations, not a single continuous 6-second generation.' },
  { id: 'case04_ziroom_20te_6s', duration: 6, fps: 15,
    panoramas: ['pano10', 'pano11'], referenceContext: 'Opening clip · Bedroom',
    caption: 'Bedroom to passage. Two 3-second clips with an intentional cut.',
    note: '<strong>Ziroom bedroom &amp; passage.</strong> Two 45-frame clips at 15 fps. The scene is in the adapted restorers’ validation split, while the Gaussian reconstruction is fitted to this scene. Reference banks stay fixed within each clip and differ between clips.' }
];
const METHODS = {
  '3dgs': { label: '3DGS', type: 'Baseline' },
  difix: { label: 'DiFix', type: 'Baseline' },
  panoworld: { label: 'PanoWorld', type: 'Baseline' },
  artifixer: { label: 'ArtiFixer', type: 'Baseline' },
  'gsfixer-repair': { label: 'GSFixer', type: 'Baseline' }
};
const $ = (selector) => document.querySelector(selector);
const comparison = $('#comparison');
const ours = $('#ours-video');
const baseline = $('#baseline-video');
const videos = [ours, baseline];
const playButton = $('#play-toggle');
const timeline = $('#timeline');
const status = $('#video-status');
let caseIndex = 0;
let method = '3dgs';
let playing = false;
let ready = false;
let generation = 0;
let loadController;
let duration = 9;
let frameRequest;
let scrubbing = false;
let resumeAfterScrub = false;
let resumeAfterLoad = false;
let automaticStartPending = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let inView = false;
let actionVersion = 0;

function videoPath(id, key) { return `assets/videos/${id}/${key}.mp4`; }
function posterPath(id, key) { return `assets/posters/${id}/${key}.jpg`; }
function updatePanoramas(selectedCase) {
  $('#reference-context').textContent = selectedCase.referenceContext;
  selectedCase.panoramas.forEach((panorama, index) => {
    const number = panorama.replace('pano', '');
    const path = `assets/panoramas/${selectedCase.id}/${panorama}.jpg`;
    const image = $(`#panorama-image-${index + 1}`);
    const link = $(`#panorama-link-${index + 1}`);
    // A baseline change leaves the representative observations unchanged.
    if (image.getAttribute('src') !== path) image.src = path;
    image.alt = `Input panorama ${number} · ${selectedCase.referenceContext}`;
    link.href = path;
    link.setAttribute('aria-label', `Open full panorama ${number}`);
    $(`#panorama-label-${index + 1}`).textContent = `Panorama ${number}`;
  });
}
function timeLabel(value) {
  const n = Math.max(0, Number.isFinite(value) ? value : 0);
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
}
function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}
function paintPlaying(value) {
  playing = value;
  $('#play-icon').textContent = value ? 'Ⅱ' : '▶';
  $('#play-label').textContent = value ? 'Pause' : 'Play';
  playButton.setAttribute('aria-label', value ? 'Pause both videos' : 'Play both videos');
}
function updateTime() {
  if (!scrubbing) timeline.value = String(Math.min(1000, ours.currentTime / duration * 1000));
  $('#current-time').textContent = timeLabel(ours.currentTime);
  timeline.setAttribute('aria-valuetext', `${ours.currentTime.toFixed(1)} of ${duration.toFixed(2)} seconds`);
}
function synchronize() {
  if (!playing) return;
  // The same camera frame is shown in both players; correct any decoder drift.
  if (!ours.seeking && !baseline.seeking && Math.abs(baseline.currentTime - ours.currentTime) > 0.075) {
    baseline.currentTime = Math.min(ours.currentTime, baseline.duration - 0.005);
  }
  updateTime();
  frameRequest = requestAnimationFrame(synchronize);
}
function pause() {
  actionVersion += 1;
  videos.forEach(video => video.pause());
  paintPlaying(false);
  cancelAnimationFrame(frameRequest);
  updateTime();
}
async function play() {
  if (!ready) return;
  window.dispatchEvent(new CustomEvent('holi:playback', { detail: 'comparison' }));
  const version = ++actionVersion;
  automaticStartPending = false;
  if (ours.currentTime >= duration - 0.04) videos.forEach(video => { video.currentTime = 0; });
  baseline.currentTime = Math.min(ours.currentTime, baseline.duration - 0.005);
  try {
    await Promise.all(videos.map(video => video.play()));
    if (version !== actionVersion) return;
    paintPlaying(true);
    setStatus('');
    cancelAnimationFrame(frameRequest);
    synchronize();
  } catch (error) {
    if (version !== actionVersion) return;
    pause();
    if (error.name !== 'AbortError') setStatus('Press Play to start both videos.');
  }
}
function waitForFrame(video, signal) {
  return new Promise((resolve, reject) => {
    function cleanup() { video.removeEventListener('loadeddata', onReady); video.removeEventListener('error', onError); signal.removeEventListener('abort', onAbort); }
    function onReady() { cleanup(); resolve(); }
    function onError() { cleanup(); reject(new Error('Video could not be loaded.')); }
    function onAbort() { cleanup(); reject(new DOMException('Loading cancelled', 'AbortError')); }
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    else if (video.readyState >= 2) onReady();
  });
}
async function loadComparison({ keepTime = false, autoPlay = false } = {}) {
  const thisGeneration = ++generation;
  const time = keepTime ? ours.currentTime : 0;
  resumeAfterLoad = autoPlay;
  loadController?.abort();
  loadController = new AbortController();
  const signal = loadController.signal;
  pause();
  ready = false;
  playButton.disabled = true;
  timeline.disabled = true;
  $('#restart').disabled = true;
  setStatus('Loading videos…');
  const selectedCase = CASES[caseIndex];
  const selectedMethod = METHODS[method];
  updatePanoramas(selectedCase);
  $('#case-caption').textContent = selectedCase.caption;
  $('#case-note').innerHTML = selectedCase.note;
  $('#baseline-label').textContent = selectedMethod.label;
  $('#baseline-tag').textContent = selectedMethod.type;
  baseline.setAttribute('aria-label', `${selectedMethod.label} result`);
  $('#open-video').href = videoPath(selectedCase.id, 'ours');
  duration = selectedCase.duration;
  $('#duration').textContent = timeLabel(duration);
  try {
    await Promise.all(videos.map((video, i) => {
      video.pause();
      video.poster = posterPath(selectedCase.id, i ? method : 'ours');
      video.src = videoPath(selectedCase.id, i ? method : 'ours');
      video.load();
      video.playbackRate = Number($('#speed').value);
      return waitForFrame(video, signal);
    }));
    if (thisGeneration !== generation) return;
    duration = Math.min(selectedCase.duration, ours.duration, baseline.duration);
    const seekTime = Math.max(0, Math.min(time, duration - 0.04));
    videos.forEach(video => { video.currentTime = seekTime; });
    ready = true;
    playButton.disabled = false;
    timeline.disabled = false;
    $('#restart').disabled = false;
    setStatus('');
    updateTime();
    if (resumeAfterLoad || (automaticStartPending && inView)) await play();
  } catch (error) {
    if (thisGeneration !== generation || error.name === 'AbortError') return;
    setStatus('Video unavailable. Refresh this page to try again.');
  }
}

playButton.addEventListener('click', () => playing ? pause() : play());
$('#restart').addEventListener('click', () => {
  videos.forEach(video => { video.currentTime = 0; });
  updateTime();
});
ours.addEventListener('ended', () => {
  if (!playing) return;
  videos.forEach(video => { video.currentTime = 0; });
  play();
});
$('#baseline').addEventListener('change', event => {
  const resume = playing || (!ready && resumeAfterLoad);
  method = event.target.value;
  loadComparison({ keepTime: true, autoPlay: resume });
});
document.querySelectorAll('[data-case]').forEach(button => {
  button.addEventListener('click', () => {
    const next = Number(button.dataset.case);
    if (next === caseIndex) return;
    const resume = playing || (!ready && resumeAfterLoad);
    caseIndex = next;
    document.querySelectorAll('[data-case]').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    loadComparison({ autoPlay: resume });
  });
});
document.querySelectorAll('button[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    comparison.dataset.mode = button.dataset.mode;
    $('.wipe-control').hidden = button.dataset.mode !== 'wipe';
    document.querySelectorAll('button[data-mode]').forEach(control => {
      if (control.tagName !== 'BUTTON') return;
      const selected = control === button;
      control.classList.toggle('selected', selected);
      control.setAttribute('aria-pressed', String(selected));
    });
  });
});
$('#wipe-range').addEventListener('input', event => {
  comparison.style.setProperty('--wipe', `${event.target.value}%`);
  event.target.setAttribute('aria-valuetext', `${event.target.value}% Holi-Spatial 360`);
});
timeline.addEventListener('input', () => {
  if (!ready) return;
  if (!scrubbing) { resumeAfterScrub = playing; scrubbing = true; pause(); }
  const target = Math.min(Number(timeline.value) / 1000 * duration, duration - 0.04);
  videos.forEach(video => { video.currentTime = target; });
  updateTime();
});
timeline.addEventListener('change', () => {
  scrubbing = false;
  updateTime();
  if (resumeAfterScrub) play();
  resumeAfterScrub = false;
});
$('#speed').addEventListener('change', event => {
  videos.forEach(video => { video.playbackRate = Number(event.target.value); });
});
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (comparison.requestFullscreen) await comparison.requestFullscreen();
    else setStatus('Use your browser’s full-screen view to enlarge the comparison.');
  } catch { setStatus('Full screen is unavailable in this browser.'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('holi:playback', event => {
  if (event.detail === 'comparison') return;
  automaticStartPending = false;
  resumeAfterLoad = false;
  pause();
});
const observer = new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  if (!inView && playing) pause();
  else if (inView && ready && automaticStartPending) play();
}, { threshold: 0.15 });
observer.observe(comparison);
loadComparison();
