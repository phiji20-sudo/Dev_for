const revealBtn = document.querySelector('.reveal-btn');
const hiddenMessage = document.getElementById('hiddenMessage');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const imageModalClose = imageModal.querySelector('.modal-close');
const galleryGrid = document.querySelector('.gallery-grid');
const heroUploadBtn = document.getElementById('heroUploadBtn');
const heroUploadInput = document.getElementById('heroUploadInput');
const heroPhoto = document.getElementById('heroPhoto');
const viewGalleryBtn = document.getElementById('viewGalleryBtn');
const galleryAddInput = document.getElementById('galleryAddInput');
const galleryPopup = document.getElementById('galleryPopup');
const galleryPopupClose = galleryPopup.querySelector('.modal-close');
const popupGrid = document.getElementById('popupGrid');
const popupDetail = document.getElementById('popupDetail');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevTrackBtn = document.getElementById('prevTrackBtn');
const nextTrackBtn = document.getElementById('nextTrackBtn');
const musicTitle = document.getElementById('musicTitle');
const galleryStateKey = 'savedGalleryImages';
const deletedGalleryKey = 'deletedGalleryUrls';
let galleryState = { 0: [], 1: [], 2: [] };
const galleryContainerLabels = ['🌷A Glimpse of Her', '🎀 Matcha Girl', '🦋 Moments to Keep'];
const galleryContainerDefaultImages = [
  'images/tulips.jpg',
  'images/matcha.jpg',
  'images/cats.jpg',
];
let currentGalleryTarget = 0;
let activePopupContainer = 0;
let serverAvailable = false;
const deletedGalleryUrls = new Set();
const loveSong = document.getElementById('loveSong');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const audioSource = document.getElementById('audioSource');
const trackList = [
  { title: 'Your Love 🎵', src: 'music/Yourlove.mp3' },
  { title: 'Play to hear it', src: 'music/ikawparin.mp3' },
];
let currentTrackIndex = 0;
const savedHeroImageKey = 'savedHeroImage';
const topbar = document.querySelector('.topbar');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

function toggleMenu() {
  navLinks.classList.toggle('active');
}

function openHiddenMessage() {
  hiddenMessage.classList.add('active');
  document.body.style.overflow = 'hidden';
  createConfetti(18);
}

function closeHiddenMessage() {
  hiddenMessage.classList.remove('active');
  document.body.style.overflow = '';
}

function openModal(imageUrl) {
  modalImage.src = imageUrl;
  imageModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  imageModal.classList.remove('active');
  document.body.style.overflow = '';
}

function openGalleryPopup(containerIndex = 0) {
  if (typeof containerIndex !== 'number' || Number.isNaN(containerIndex)) {
    containerIndex = 0;
  }

  activePopupContainer = containerIndex;
  currentGalleryTarget = containerIndex;
  galleryPopup.classList.add('active');
  document.body.style.overflow = 'hidden';
  refreshPopupGrid();
  refreshPopupDetail();
}

function closeGalleryPopup() {
  galleryPopup.classList.remove('active');
  document.body.style.overflow = '';
}

function saveGalleryImages() {
  localStorage.setItem(galleryStateKey, JSON.stringify(galleryState));
}

function saveDeletedGalleryUrls() {
  localStorage.setItem(deletedGalleryKey, JSON.stringify(Array.from(deletedGalleryUrls)));
}

function loadDeletedGalleryUrls() {
  const saved = localStorage.getItem(deletedGalleryKey);
  if (!saved) return;
  try {
    const items = JSON.parse(saved);
    if (Array.isArray(items)) {
      items.forEach((url) => {
        if (typeof url === 'string') {
          deletedGalleryUrls.add(url);
        }
      });
    }
  } catch {
    // ignore invalid data
  }
}

function saveHeroImage(imageUrl) {
  localStorage.setItem(savedHeroImageKey, imageUrl);
}

function loadSavedHeroImage() {
  const saved = localStorage.getItem(savedHeroImageKey);
  if (saved) {
    heroPhoto.src = saved;
  }
}

function getLocalGalleryState() {
  const saved = localStorage.getItem(galleryStateKey);
  if (!saved) {
    return { 0: [], 1: [], 2: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    return sanitizeGalleryState({
      0: Array.isArray(parsed[0]) ? parsed[0] : Array.isArray(parsed['0']) ? parsed['0'] : [],
      1: Array.isArray(parsed[1]) ? parsed[1] : Array.isArray(parsed['1']) ? parsed['1'] : [],
      2: Array.isArray(parsed[2]) ? parsed[2] : Array.isArray(parsed['2']) ? parsed['2'] : [],
    });
  } catch {
    return { 0: [], 1: [], 2: [] };
  }
}

function sanitizeGalleryState(state) {
  const clean = { 0: [], 1: [], 2: [] };
  for (let index = 0; index < 3; index += 1) {
    if (!Array.isArray(state[index])) continue;
    clean[index] = state[index]
      .filter((url) => typeof url === 'string' && url.trim() !== '')
      .map((url) => url.trim());
  }
  return clean;
}

function applyDeletionFilter(state) {
  const filtered = { 0: [], 1: [], 2: [] };
  for (let index = 0; index < 3; index += 1) {
    filtered[index] = (Array.isArray(state[index]) ? state[index] : []).filter((url) => typeof url === 'string' && !deletedGalleryUrls.has(url));
  }
  return filtered;
}

async function syncDeletedGalleryUrlsToServer() {
  if (!serverAvailable || deletedGalleryUrls.size === 0) return false;
  const urlsToSync = Array.from(deletedGalleryUrls);
  let changed = false;

  for (const url of urlsToSync) {
    if (typeof url !== 'string' || url.trim() === '' || isDataUrl(url)) {
      deletedGalleryUrls.delete(url);
      changed = true;
      continue;
    }

    try {
      const response = await fetch('/api/remove-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        deletedGalleryUrls.delete(url);
        changed = true;
      } else {
        const text = await response.text();
        console.warn('Failed to sync deleted gallery URL to server:', url, response.status, text);
        if (response.status >= 500) {
          break;
        }
        deletedGalleryUrls.delete(url);
        changed = true;
      }
    } catch (error) {
      console.warn('Failed to sync deleted gallery URL to server:', url, error);
      break;
    }
  }

  if (changed) saveDeletedGalleryUrls();
  return changed;
}

async function fetchServerGalleryState() {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const normalized = { 0: [], 1: [], 2: [] };
    if (json && json.galleryState) {
      for (const k in json.galleryState) {
        const idx = Number(k);
        if (!Number.isNaN(idx) && Array.isArray(json.galleryState[k])) {
          normalized[idx] = json.galleryState[k];
        }
      }
    }
    return normalized;
  } catch {
    return null;
  }
}

async function refreshGalleryStateFromServer() {
  await syncDeletedGalleryUrlsToServer();
  const serverState = await fetchServerGalleryState();
  if (!serverState) return false;
  const merged = mergeGalleryState(serverState, getLocalGalleryState());
  const filtered = applyDeletionFilter(merged);
  galleryState = filtered;
  saveGalleryImages();
  refreshGalleryGrid();
  if (galleryPopup.classList.contains('active')) refreshPopupGrid();
  if (popupDetail.innerHTML.trim() !== '') refreshPopupDetail();
  return true;
}

function loadSavedGalleryImages() {
  galleryState = applyDeletionFilter(getLocalGalleryState());
  refreshGalleryGrid();
  refreshPopupGrid();
}

function mergeGalleryState(serverState, localState) {
  const merged = { 0: [], 1: [], 2: [] };
  for (let index = 0; index < 3; index += 1) {
    const serverImages = Array.isArray(serverState[index]) ? serverState[index].slice() : [];
    const localImages = Array.isArray(localState[index]) ? localState[index] : [];
    const unsyncedLocal = localImages.filter((imageUrl) => imageUrl.startsWith('data:'));
    const filteredLocal = unsyncedLocal.filter((imageUrl) => !serverImages.includes(imageUrl));
    merged[index] = serverImages.concat(filteredLocal);
  }
  return merged;
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

async function syncLocalGalleryToServer(localState) {
  for (let index = 0; index < 3; index += 1) {
    const images = Array.isArray(localState[index]) ? localState[index] : [];
    for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
      const imageUrl = images[imageIndex];
      if (!isDataUrl(imageUrl)) continue;
      try {
        const file = await dataUrlToFile(imageUrl, `local-upload-${index}-${Date.now()}.jpg`);
        const form = new FormData();
        form.append('file', file);
        form.append('index', String(index));
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        if (!res.ok) throw new Error('Upload failed');
        const j = await res.json();
        if (j && j.url) {
          images[imageIndex] = j.url;
        }
      } catch (error) {
        console.warn('Failed to sync local gallery image to server:', error);
      }
    }
    localState[index] = images;
  }
  saveGalleryImages();
  return localState;
}

async function syncLocalHeroToServer(localHeroSrc) {
  if (!isDataUrl(localHeroSrc)) return null;
  try {
    const file = await dataUrlToFile(localHeroSrc, `hero-upload-${Date.now()}.jpg`);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload/hero', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Hero upload failed');
    const j = await res.json();
    if (j && j.url) {
      saveHeroImage(j.url);
      return j.url;
    }
  } catch (error) {
    console.warn('Failed to sync local hero image to server:', error);
  }
  return null;
}

function addGalleryImages(index, imageUrls) {
  galleryState[index] = galleryState[index] || [];
  galleryState[index] = galleryState[index].concat(imageUrls);
  saveGalleryImages();
  refreshGalleryGrid();
  refreshPopupGrid();
  refreshPopupDetail();
}

async function removeGalleryImage(containerIndex, imageIndex) {
  if (!Array.isArray(galleryState[containerIndex])) return;
  const imageUrl = galleryState[containerIndex][imageIndex];
  if (!imageUrl) return;

  const removeLocally = () => {
    deletedGalleryUrls.add(imageUrl);
    saveDeletedGalleryUrls();
    galleryState[containerIndex].splice(imageIndex, 1);
    saveGalleryImages();
    refreshGalleryGrid();
    refreshPopupGrid();
    refreshPopupDetail();
  };

  if (serverAvailable && !imageUrl.startsWith('data:')) {
    try {
      const response = await fetch('/api/remove-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index: containerIndex, url: imageUrl }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn('Server delete failed:', response.status, text);
        removeLocally();
        await refreshGalleryStateFromServer();
        return;
      }

      removeLocally();
      await refreshGalleryStateFromServer();
      return;
    } catch (error) {
      console.warn('Failed to remove image from server:', error);
      removeLocally();
      return;
    }
  }

  removeLocally();
}


function refreshGalleryGrid() {
  galleryGrid.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    galleryGrid.appendChild(createGalleryCard(index));
  }
}

function createGalleryCard(index) {
  const card = document.createElement('article');
  card.className = 'gallery-card gallery-container-card';
  card.dataset.index = index;

  const images = Array.isArray(galleryState[index]) ? galleryState[index] : [];

  const header = document.createElement('div');
  header.className = 'gallery-container-header';
  const title = document.createElement('h3');
  title.textContent = galleryContainerLabels[index] || `Container ${index + 1}`;
  const badge = document.createElement('span');
  badge.className = 'gallery-count-badge';
  badge.textContent = `${images.length} photo${images.length === 1 ? '' : 's'}`;
  header.appendChild(title);
  header.appendChild(badge);

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'gallery-card-image';

  const previewUrl = galleryContainerDefaultImages[index] || null;
  if (previewUrl) {
    const preview = document.createElement('img');
    preview.src = previewUrl;
    preview.alt = `${galleryContainerLabels[index] || `Container ${index + 1}`} preview`;
    preview.className = 'gallery-preview-image';
    imageWrapper.appendChild(preview);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'gallery-image-placeholder';
    placeholder.innerHTML = '<span>Select this container to add photos</span>';
    imageWrapper.appendChild(placeholder);
  }

  card.appendChild(header);
  card.appendChild(imageWrapper);

  card.tabIndex = 0;
  card.addEventListener('click', () => openGalleryPopup(index));
  card.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') openGalleryPopup(index);
  });

  return card;
}

function refreshPopupGrid() {
  popupGrid.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    popupGrid.appendChild(createPopupTabCard(index));
  }
}

function createPopupTabCard(index) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'gallery-card popup-tab-card';
  card.dataset.index = index;
  if (activePopupContainer === index) {
    card.classList.add('selected-popup-tab');
  }

  const images = Array.isArray(galleryState[index]) ? galleryState[index] : [];
  const previewUrl = images.length > 0 ? images[0] : galleryContainerDefaultImages[index];
  if (previewUrl) {
    const preview = document.createElement('div');
    preview.className = 'popup-tab-preview';
    preview.style.backgroundImage = `url(${previewUrl})`;
    card.appendChild(preview);
  }

  const title = document.createElement('h4');
  title.textContent = galleryContainerLabels[index] || `Container ${index + 1}`;
  const count = document.createElement('span');
  count.className = 'gallery-count-badge';
  count.textContent = `${galleryState[index].length} photo${galleryState[index].length === 1 ? '' : 's'}`;

  card.appendChild(title);
  card.appendChild(count);
  card.addEventListener('click', () => {
    activePopupContainer = index;
    currentGalleryTarget = index;
    refreshPopupGrid();
    refreshPopupDetail();
  });

  return card;
}

function refreshPopupDetail() {
  const images = Array.isArray(galleryState[activePopupContainer]) ? galleryState[activePopupContainer] : [];
  popupDetail.innerHTML = '';

  const detailHeader = document.createElement('div');
  detailHeader.className = 'popup-detail-header';

  const detailTitle = document.createElement('h3');
  detailTitle.textContent = `${galleryContainerLabels[activePopupContainer] || `Container ${activePopupContainer + 1}`} Gallery`;
  const detailCount = document.createElement('span');
  detailCount.className = 'gallery-count-badge';
  detailCount.textContent = `${images.length} photo${images.length === 1 ? '' : 's'}`;

  detailHeader.appendChild(detailTitle);
  detailHeader.appendChild(detailCount);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'secondary-btn gallery-card-action';
  addButton.textContent = 'Add Photo';
  addButton.addEventListener('click', () => {
    currentGalleryTarget = activePopupContainer;
    galleryAddInput.click();
  });

  const detailContent = document.createElement('div');
  detailContent.className = 'popup-detail-content';

  if (images.length > 0) {
    const thumbList = document.createElement('div');
    thumbList.className = 'gallery-thumb-list popup-thumb-list';

    images.forEach((imageUrl, imageIndex) => {
      const thumbItem = document.createElement('div');
      thumbItem.className = 'gallery-thumb-item';

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Container ${activePopupContainer + 1} photo ${imageIndex + 1}`;
      img.addEventListener('click', () => openModal(imageUrl));

      const removeThumb = document.createElement('button');
      removeThumb.type = 'button';
      removeThumb.className = 'gallery-thumb-remove';
      removeThumb.setAttribute('aria-label', `Remove photo ${imageIndex + 1}`);
      removeThumb.textContent = '×';
      removeThumb.addEventListener('click', (event) => {
        event.stopPropagation();
        removeGalleryImage(activePopupContainer, imageIndex);
      });

      thumbItem.appendChild(img);
      thumbItem.appendChild(removeThumb);
      thumbList.appendChild(thumbItem);
    });

    detailContent.appendChild(thumbList);
  } else {
    const emptyState = document.createElement('div');
    emptyState.className = 'gallery-image-placeholder popup-empty-state';
    emptyState.innerHTML = '<span>No photos yet. Add one to this container.</span>';
    detailContent.appendChild(emptyState);
  }

  popupDetail.appendChild(detailHeader);
  popupDetail.appendChild(addButton);
  popupDetail.appendChild(detailContent);
}

function formatTime(seconds) {
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
  const currentTime = formatTime(loveSong.currentTime || 0);
  const durationTime = formatTime(loveSong.duration || 0);
  timeDisplay.textContent = `${currentTime} / ${durationTime}`;
}

function syncProgressBar() {
  if (!loveSong.duration || !progressBar) return;
  const percent = (loveSong.currentTime / loveSong.duration) * 100;
  progressBar.value = percent.toFixed(1);
}

function getAudioType(path) {
  if (/\.mp3$/i.test(path)) return 'audio/mpeg';
  if (/\.wav$/i.test(path)) return 'audio/wav';
  return '';
}

function loadTrack(index) {
  const shouldContinue = !loveSong.paused && loveSong.currentTime > 0 && !loveSong.ended;
  currentTrackIndex = (index + trackList.length) % trackList.length;
  const track = trackList[currentTrackIndex];

  if (audioSource) {
    audioSource.src = track.src;
    audioSource.type = getAudioType(track.src);
  }

  loveSong.load();
  musicTitle.textContent = 'Play to hear it';
  updateTrackButtons();

  if (shouldContinue) {
    loveSong.play().catch((error) => {
      console.error('Audio playback failed after track change:', error);
      playPauseBtn.textContent = 'Play';
      alert(`Unable to start audio playback for ${track.src}. Please make sure the file exists and your browser supports the format.`);
    });
  }
}

function updateTrackButtons() {
  const disabled = trackList.length <= 1;
  prevTrackBtn.disabled = disabled;
  nextTrackBtn.disabled = disabled;
}

function toggleAudio() {
  if (loveSong.paused) {
    loveSong.play()
      .then(() => {
        playPauseBtn.textContent = 'Pause';
      })
      .catch((error) => {
        console.error('Audio playback failed:', error);
        playPauseBtn.textContent = 'Play';
        alert('Unable to start audio playback. Please make sure the file is available and your browser supports MP3.');
      });
  } else {
    loveSong.pause();
  }
}

prevTrackBtn.addEventListener('click', () => {
  loadTrack(currentTrackIndex - 1);
});

nextTrackBtn.addEventListener('click', () => {
  loadTrack(currentTrackIndex + 1);
});

playPauseBtn.addEventListener('click', toggleAudio);
loveSong.volume = 0.9;
loveSong.preload = 'metadata';
loadTrack(currentTrackIndex);

loveSong.addEventListener('loadedmetadata', () => {
  updateTimeDisplay();
});

loveSong.addEventListener('timeupdate', () => {
  syncProgressBar();
  updateTimeDisplay();
});

loveSong.addEventListener('play', () => {
  playPauseBtn.textContent = 'Pause';
});

loveSong.addEventListener('pause', () => {
  playPauseBtn.textContent = 'Play';
});

loveSong.addEventListener('ended', () => {
  playPauseBtn.textContent = 'Play';
  syncProgressBar();
  updateTimeDisplay();
});

prevTrackBtn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    loadTrack(currentTrackIndex - 1);
  }
});

nextTrackBtn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    loadTrack(currentTrackIndex + 1);
  }
});

progressBar.addEventListener('input', () => {
  if (!loveSong.duration) return;
  const seekTime = (progressBar.value / 100) * loveSong.duration;
  loveSong.currentTime = seekTime;
  updateTimeDisplay();
});

loveSong.addEventListener('canplay', () => {
  console.log('Audio is ready to play:', loveSong.currentSrc);
});

loveSong.addEventListener('error', () => {
  const err = loveSong.error;
  console.warn('Failed to load audio. Error code:', err ? err.code : 'none', 'Source:', loveSong.currentSrc);
  alert(`Audio could not be loaded: ${loveSong.currentSrc}. Please verify the music file is in the music folder and the path is correct.`);
});

function createConfetti(amount) {
  for (let i = 0; i < amount; i++) {
    const heart = document.createElement('div');
    heart.className = 'confetti-heart';
    heart.style.left = `${Math.random() * 80 + 10}%`;
    heart.style.animationDuration = `${Math.random() * 1 + 1.2}s`;
    heart.style.transform = `scale(${Math.random() * 0.8 + 0.7})`;
    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 2600);
  }
}

revealBtn.addEventListener('click', openHiddenMessage);
hiddenMessage.addEventListener('click', (event) => {
  if (event.target === hiddenMessage) {
    closeHiddenMessage();
  }
});

imageModalClose.addEventListener('click', closeModal);
imageModal.addEventListener('click', (event) => {
  const backdrop = imageModal.querySelector('.modal-backdrop');
  if (event.target === imageModal || event.target === backdrop) {
    closeModal();
  }
});

heroUploadBtn.addEventListener('click', () => heroUploadInput.click());
heroPhoto.addEventListener('click', () => heroUploadInput.click());

heroUploadInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (serverAvailable) {
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/upload/hero', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error('Hero upload failed');
      const j = await res.json();
      if (j && j.url) {
        heroPhoto.src = j.url;
        saveHeroImage(j.url);
      }
    } catch (err) {
      console.error('Hero upload failed; image not saved to shared storage.', err);
      alert('Upload failed. Your hero photo was not saved to the shared server. Please try again.');
      return;
    }
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      heroPhoto.src = reader.result;
      saveHeroImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  event.target.value = '';
});

viewGalleryBtn.addEventListener('click', () => openGalleryPopup(0));
galleryAddInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
  if (!files.length) {
    event.target.value = '';
    return;
  }

  if (serverAvailable) {
    // upload each file to server with the target container index
    for (const file of files) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('index', String(currentGalleryTarget));

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) throw new Error('Upload failed');
        const j = await res.json();
        if (j && j.url) {
          addGalleryImages(currentGalleryTarget, [j.url]);
        }
      } catch (err) {
        console.error('Server upload failed; image not saved to shared storage.', err);
        alert('Upload failed. The image was not saved to the shared server. Please try again.');
        return;
      }
    }
    await refreshGalleryStateFromServer();
  } else {
    // fallback to client-side localStorage DataURLs when the API server is unavailable
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        addGalleryImages(currentGalleryTarget, [reader.result]);
      };
      reader.readAsDataURL(file);
    }
  }

  event.target.value = '';
});

galleryPopup.addEventListener('click', (event) => {
  const backdrop = galleryPopup.querySelector('.modal-backdrop');
  if (event.target === galleryPopup || event.target === galleryPopupClose || event.target === backdrop) {
    closeGalleryPopup();
  }
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

(function () {
  (async function initSync() {
    loadDeletedGalleryUrls();
    let localSaved = getLocalGalleryState();

    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        serverAvailable = true;
        const json = await res.json();
        const norm = { 0: [], 1: [], 2: [] };
        if (json && json.galleryState) {
          // normalize keys (server may return string keys)
          for (const k in json.galleryState) {
            const idx = Number(k);
            if (!Number.isNaN(idx) && Array.isArray(json.galleryState[k])) {
              norm[idx] = json.galleryState[k];
            }
          }
        }

        await syncDeletedGalleryUrlsToServer();
        localSaved = await syncLocalGalleryToServer(localSaved);
        const latestServerState = (await fetchServerGalleryState()) || norm;
        galleryState = applyDeletionFilter(mergeGalleryState(latestServerState, localSaved));

        if (json && json.heroImage) {
          heroPhoto.src = json.heroImage;
          saveHeroImage(json.heroImage);
        } else {
          const localHero = localStorage.getItem(savedHeroImageKey);
          if (localHero) {
            const syncedHero = await syncLocalHeroToServer(localHero);
            if (syncedHero) {
              heroPhoto.src = syncedHero;
            }
          }
        }
      } else {
        serverAvailable = false;
      }
    } catch (e) {
      serverAvailable = false;
    }

    if (!serverAvailable) {
      loadSavedHeroImage();
      loadSavedGalleryImages();
    } else {
      saveGalleryImages();
      refreshGalleryGrid();
      // start polling so other devices' uploads appear without refresh
      setInterval(async () => {
        try {
          await syncDeletedGalleryUrlsToServer();
          const r = await fetch('/api/state', { cache: 'no-store' });
          if (!r.ok) return;
          const s = await r.json();
          if (s && s.galleryState) {
            const norm2 = { 0: [], 1: [], 2: [] };
            for (const k in s.galleryState) {
              const idx = Number(k);
              if (!Number.isNaN(idx) && Array.isArray(s.galleryState[k])) {
                norm2[idx] = s.galleryState[k];
              }
            }
            const merged = mergeGalleryState(norm2, getLocalGalleryState());
            const filtered = applyDeletionFilter(merged);
            const before = JSON.stringify(galleryState);
            const after = JSON.stringify(filtered);
            if (before !== after) {
              galleryState = filtered;
              saveGalleryImages();
              saveDeletedGalleryUrls();
              refreshGalleryGrid();
              if (galleryPopup.classList.contains('active')) refreshPopupGrid();
              if (popupDetail.innerHTML.trim() !== '') refreshPopupDetail();
            }
          }
        } catch (e) {
          /* ignore polling errors */
        }
      }, 5000);
    }
  })();
})();

window.addEventListener('load', () => {
  history.replaceState(null, '', '#home');
  window.setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, 0);
});

menuToggle.addEventListener('click', toggleMenu);

document.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    topbar.classList.add('scrolled');
  } else {
    topbar.classList.remove('scrolled');
  }
});

const heartCursor = document.createElement('div');
heartCursor.className = 'heart-cursor';
document.body.appendChild(heartCursor);

window.addEventListener('mousemove', (event) => {
  heartCursor.style.left = `${event.clientX - 12}px`;
  heartCursor.style.top = `${event.clientY - 12}px`;
});

window.addEventListener('click', (event) => {
  const sparkle = document.createElement('span');
  sparkle.className = 'sparkle';
  sparkle.style.left = `${event.clientX}px`;
  sparkle.style.top = `${event.clientY}px`;
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 900);
});
