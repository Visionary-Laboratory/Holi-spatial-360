'use strict';

(() => {
  const root = document.querySelector('#spatial');
  const find = selector => root.querySelector(selector);
  const rgb = find('#spatial-rgb');
  const depth = find('#spatial-depth');
  const pair = [rgb, depth];
  const playButton = find('#spatial-play');
  const timeline = find('#spatial-timeline');
  const restart = find('#spatial-restart');
  const speed = find('#spatial-speed');
  const status = find('#spatial-status');
  const frameCounts = [449, 376, 350];
  let selected = 1;
  let duration = frameCounts[0] / 30;
  let ready = false;
  let playing = false;
  let loaded = false;
  let inView = false;
  let firstPlay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let resumeAfterLoad = false;
  let resumeAfterScrub = false;
  let scrubbing = false;
  let frameRequest;
  let controller;
  let generation = 0;
  let actionVersion = 0;

  function setStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }
  function updateTime() {
    if (!scrubbing) timeline.value = String(Math.min(1000, rgb.currentTime / duration * 1000));
    find('#spatial-time').textContent = timeLabel(rgb.currentTime);
    timeline.setAttribute('aria-valuetext', `${rgb.currentTime.toFixed(1)} of ${duration.toFixed(2)} seconds`);
  }
  function paintPlaying(value) {
    playing = value;
    find('#spatial-play-icon').textContent = value ? 'Ⅱ' : '▶';
    find('#spatial-play-label').textContent = value ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', value ? 'Pause spatial videos' : 'Play spatial videos');
  }
  function pausePair() {
    actionVersion += 1;
    pair.forEach(video => video.pause());
    paintPlaying(false);
    cancelAnimationFrame(frameRequest);
    updateTime();
  }
  function synchronize() {
    if (!playing) return;
    if (!rgb.seeking && !depth.seeking && Math.abs(rgb.currentTime - depth.currentTime) > 0.05) {
      depth.currentTime = Math.min(rgb.currentTime, duration - 0.001);
    }
    updateTime();
    frameRequest = requestAnimationFrame(synchronize);
  }
  async function playPair() {
    if (!ready) return;
    window.dispatchEvent(new CustomEvent('holi:playback', { detail: 'spatial' }));
    const version = ++actionVersion;
    firstPlay = false;
    if (rgb.currentTime >= duration - 0.04) pair.forEach(video => { video.currentTime = 0; });
    depth.currentTime = Math.min(rgb.currentTime, duration - 0.001);
    try {
      await Promise.all(pair.map(video => video.play()));
      if (version !== actionVersion) return;
      paintPlaying(true);
      setStatus('');
      cancelAnimationFrame(frameRequest);
      synchronize();
    } catch (error) {
      if (version !== actionVersion) return;
      pausePair();
      if (error.name !== 'AbortError') setStatus('Press Play to start both videos.');
    }
  }
  async function loadExample(autoPlay = false) {
    const thisGeneration = ++generation;
    loaded = true;
    resumeAfterLoad = autoPlay;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    pausePair();
    ready = false;
    scrubbing = false;
    resumeAfterScrub = false;
    [playButton, timeline, restart].forEach(control => { control.disabled = true; });
    duration = frameCounts[selected - 1] / 30;
    find('#spatial-duration').textContent = timeLabel(duration);
    setStatus('Loading paired views…');
    try {
      await Promise.all(pair.map((video, index) => {
        const path = `assets/spatial/example-${selected}/${index ? 'depth' : 'bbox'}`;
        video.poster = `${path}.jpg`;
        video.preload = 'auto';
        video.src = `${path}.mp4`;
        video.load();
        video.playbackRate = Number(speed.value);
        return waitForFrame(video, signal);
      }));
      if (thisGeneration !== generation) return;
      duration = Math.min(duration, rgb.duration, depth.duration);
      ready = true;
      [playButton, timeline, restart].forEach(control => { control.disabled = false; });
      setStatus('');
      updateTime();
      if (inView && (resumeAfterLoad || firstPlay)) await playPair();
    } catch (error) {
      if (thisGeneration !== generation || error.name === 'AbortError') return;
      setStatus('Video unavailable. Refresh this page to try again.');
    }
  }

  root.querySelectorAll('[data-spatial]').forEach(button => {
    button.addEventListener('click', () => {
      const next = Number(button.dataset.spatial);
      if (next === selected && loaded) return;
      const resume = playing || (!ready && resumeAfterLoad);
      selected = next;
      root.querySelectorAll('[data-spatial]').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-pressed', String(active));
      });
      loadExample(resume);
    });
  });
  playButton.addEventListener('click', () => playing ? pausePair() : playPair());
  restart.addEventListener('click', () => {
    pair.forEach(video => { video.currentTime = 0; });
    updateTime();
  });
  rgb.addEventListener('ended', () => {
    if (!playing) return;
    pair.forEach(video => { video.currentTime = 0; });
    playPair();
  });
  timeline.addEventListener('input', () => {
    if (!ready) return;
    if (!scrubbing) { resumeAfterScrub = playing; scrubbing = true; pausePair(); }
    const time = Math.min(Number(timeline.value) / 1000 * duration, duration - 0.04);
    pair.forEach(video => { video.currentTime = time; });
    updateTime();
  });
  timeline.addEventListener('change', () => {
    scrubbing = false;
    updateTime();
    if (resumeAfterScrub) playPair();
    resumeAfterScrub = false;
  });
  speed.addEventListener('change', () => pair.forEach(video => { video.playbackRate = Number(speed.value); }));
  find('#spatial-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (find('#spatial-player').requestFullscreen) await find('#spatial-player').requestFullscreen();
      else setStatus('Use your browser’s full-screen view to enlarge these videos.');
    } catch { setStatus('Full screen is unavailable in this browser.'); }
  });
  function leavePlayer() {
    resumeAfterLoad = false;
    resumeAfterScrub = false;
    pausePair();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) leavePlayer(); });
  window.addEventListener('holi:playback', event => {
    if (event.detail === 'spatial') return;
    leavePlayer();
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (!inView) leavePlayer();
    else if (!loaded) loadExample();
    else if (ready && firstPlay) playPair();
  }, { threshold: 0.15 }).observe(find('.spatial-pair'));
})();
