/**
 * music.js — Ambient Music Player for Gaurab's Poetry Site
 *
 * Features:
 *  - Autoplay after 15 seconds (respects browser autoplay policy)
 *  - User can toggle music on / off
 *  - Multiple tracks playlist
 *  - Progress bar scrubbing
 *  - Volume control
 *  - Animated visualizer
 *  - Persistent mute preference via localStorage
 */

(function MusicPlayer() {
    'use strict';

    /* ── Playlist ─────────────────────────────────────────── */
    const TRACKS = [
        {
            title: 'Cry',
            artist: 'Cigarettes After Sex',
            src: 'music/Cry - Cigarettes After Sex.mp3',
            emoji: '🌙'
        },
        // Add more tracks here in the future:
        // { title: 'Song Title', artist: 'Artist', src: 'music/filename.mp3', emoji: '🎵' },
    ];

    /* ── State ────────────────────────────────────────────── */
    let currentIndex = 0;
    let isPlaying = false;
    let autoplayTimer = null;
    let isMuted = false;
    let cardOpen = false;
    const AUTOPLAY_DELAY_MS = 15000; // 15 seconds

    /* ── Audio engine ─────────────────────────────────────── */
    const audio = new Audio();
    audio.loop = false;
    audio.volume = 0.55;
    audio.preload = 'metadata';

    function loadTrack(index) {
        currentIndex = index;
        const t = TRACKS[index];
        audio.src = t.src;
        updateTrackInfo();
        updateTrackList();
        resetProgress();
    }

    function playTrack() {
        const promise = audio.play();
        if (promise !== undefined) {
            promise.then(() => {
                isPlaying = true;
                updatePlayBtn();
                startVisualizer();
            }).catch(() => {
                isPlaying = false;
                updatePlayBtn();
            });
        }
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        updatePlayBtn();
        stopVisualizer();
    }

    function togglePlayPause() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function nextTrack() {
        const next = (currentIndex + 1) % TRACKS.length;
        loadTrack(next);
        if (isPlaying) playTrack();
    }

    function prevTrack() {
        // If more than 3 seconds in, restart; else go to prev
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            const prev = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
            loadTrack(prev);
            if (isPlaying) playTrack();
        }
    }

    /* ── DOM references ───────────────────────────────────── */
    let elCard, elToggleBtn, elPlayPause, elPrev, elNext;
    let elProgress, elCurrTime, elDuration;
    let elVolume, elVolIcon;
    let elTitle, elArtist, elArt, elNote;
    let elVisualizer, elTrackList;
    let elToast;

    /* ── Build HTML ───────────────────────────────────────── */
    function buildPlayer() {
        const container = document.createElement('div');
        container.id = 'music-player';
        container.innerHTML = `
            <!-- Expanded Card -->
            <div id="music-card">
                <div class="music-track-info">
                    <div class="music-art" id="music-art">
                        <span class="music-note-icon" id="music-note">🎵</span>
                    </div>
                    <div class="music-text">
                        <div class="music-title" id="music-title">Loading…</div>
                        <div class="music-artist" id="music-artist">—</div>
                    </div>
                    <div class="music-visualizer paused" id="music-visualizer">
                        <div class="vis-bar"></div>
                        <div class="vis-bar"></div>
                        <div class="vis-bar"></div>
                        <div class="vis-bar"></div>
                    </div>
                </div>

                <div class="music-progress-wrap">
                    <input type="range" class="music-progress-bar" id="music-progress"
                           min="0" max="100" value="0" step="0.1" aria-label="Seek">
                    <div class="music-time-row">
                        <span id="music-curr-time">0:00</span>
                        <span id="music-duration">0:00</span>
                    </div>
                </div>

                <div class="music-controls">
                    <button class="music-btn" id="music-prev" title="Previous" aria-label="Previous track">⏮</button>
                    <button class="music-btn play-pause-btn" id="music-play-pause" title="Play / Pause" aria-label="Play or pause">▶</button>
                    <button class="music-btn" id="music-next" title="Next" aria-label="Next track">⏭</button>
                </div>

                <div class="music-volume-row">
                    <span class="volume-icon" id="music-vol-icon" title="Toggle mute">🔊</span>
                    <input type="range" class="music-volume-bar" id="music-volume"
                           min="0" max="1" step="0.01" value="0.55" aria-label="Volume">
                </div>

                <div class="music-track-list" id="music-track-list"></div>
            </div>

            <!-- Toggle pill button -->
            <button id="music-toggle-btn" aria-label="Toggle music player" title="Music Player">
                <span class="btn-icon">🎵</span>
                <span class="btn-label" id="music-btn-label">Now Playing</span>
            </button>`;

        document.body.appendChild(container);

        // Autoplay toast
        const toast = document.createElement('div');
        toast.id = 'music-autoplay-toast';
        toast.innerHTML = `
            <span class="toast-icon">🎵</span>
            <span class="toast-text">Music is starting… click the player to control it.</span>`;
        document.body.appendChild(toast);

        // Cache refs
        elCard = document.getElementById('music-card');
        elToggleBtn = document.getElementById('music-toggle-btn');
        elPlayPause = document.getElementById('music-play-pause');
        elPrev = document.getElementById('music-prev');
        elNext = document.getElementById('music-next');
        elProgress = document.getElementById('music-progress');
        elCurrTime = document.getElementById('music-curr-time');
        elDuration = document.getElementById('music-duration');
        elVolume = document.getElementById('music-volume');
        elVolIcon = document.getElementById('music-vol-icon');
        elTitle = document.getElementById('music-title');
        elArtist = document.getElementById('music-artist');
        elArt = document.getElementById('music-art');
        elNote = document.getElementById('music-note');
        elVisualizer = document.getElementById('music-visualizer');
        elTrackList = document.getElementById('music-track-list');
        elToast = document.getElementById('music-autoplay-toast');

        bindEvents();
        loadTrack(0);
        scheduleAutoplay();
        restorePreferences();
    }

    /* ── Events ───────────────────────────────────────────── */
    function bindEvents() {
        // Toggle card open/close
        elToggleBtn.addEventListener('click', toggleCard);

        // Play/Pause
        elPlayPause.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlayPause();
        });

        // Prev / Next
        elPrev.addEventListener('click', (e) => { e.stopPropagation(); prevTrack(); });
        elNext.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });

        // Progress scrub
        elProgress.addEventListener('input', () => {
            if (!isNaN(audio.duration)) {
                audio.currentTime = (elProgress.value / 100) * audio.duration;
            }
        });

        // Volume
        elVolume.addEventListener('input', () => {
            audio.volume = parseFloat(elVolume.value);
            isMuted = audio.volume === 0;
            updateVolIcon();
            savePreferences();
        });

        // Mute toggle via icon
        elVolIcon.addEventListener('click', () => {
            isMuted = !isMuted;
            audio.muted = isMuted;
            updateVolIcon();
            savePreferences();
        });

        // Audio events
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onMetadataLoaded);
        audio.addEventListener('ended', onTrackEnded);
        audio.addEventListener('error', onAudioError);

        // Close card when clicking outside
        document.addEventListener('click', (e) => {
            if (cardOpen && !document.getElementById('music-player').contains(e.target)) {
                closeCard();
            }
        });
    }

    /* ── Card open/close ──────────────────────────────────── */
    function toggleCard() {
        cardOpen ? closeCard() : openCard();
    }

    function openCard() {
        cardOpen = true;
        elCard.classList.add('open');
    }

    function closeCard() {
        cardOpen = false;
        elCard.classList.remove('open');
    }

    /* ── UI updates ───────────────────────────────────────── */
    function updateTrackInfo() {
        const t = TRACKS[currentIndex];
        elTitle.textContent = t.title;
        elArtist.textContent = t.artist;
        elNote.textContent = t.emoji || '🎵';
        document.getElementById('music-btn-label').textContent = t.title;
    }

    function updatePlayBtn() {
        elPlayPause.textContent = isPlaying ? '⏸' : '▶';
        elPlayPause.title = isPlaying ? 'Pause' : 'Play';
    }

    function updateVolIcon() {
        if (isMuted || audio.volume === 0) {
            elVolIcon.textContent = '🔇';
        } else if (audio.volume < 0.4) {
            elVolIcon.textContent = '🔈';
        } else if (audio.volume < 0.75) {
            elVolIcon.textContent = '🔉';
        } else {
            elVolIcon.textContent = '🔊';
        }
    }

    function resetProgress() {
        elProgress.value = 0;
        elCurrTime.textContent = '0:00';
        elDuration.textContent = '0:00';
    }

    function onTimeUpdate() {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            const pct = (audio.currentTime / audio.duration) * 100;
            elProgress.value = pct;
            elCurrTime.textContent = formatTime(audio.currentTime);
        }
    }

    function onMetadataLoaded() {
        elDuration.textContent = formatTime(audio.duration);
    }

    function onTrackEnded() {
        nextTrack();
        if (TRACKS.length > 1) playTrack();
        else { isPlaying = false; updatePlayBtn(); stopVisualizer(); }
    }

    function onAudioError() {
        console.warn('MusicPlayer: could not load audio file.');
    }

    function formatTime(s) {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    /* ── Track list ───────────────────────────────────────── */
    function updateTrackList() {
        elTrackList.innerHTML = TRACKS.map((t, i) => `
            <div class="track-item ${i === currentIndex ? 'active' : ''}"
                 data-idx="${i}" role="button" tabindex="0" aria-label="Play ${t.title}">
                <span class="track-num">${i === currentIndex ? '▶' : (i + 1)}</span>
                <span class="track-name">${t.title} — ${t.artist}</span>
            </div>`).join('');

        elTrackList.querySelectorAll('.track-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(el.dataset.idx, 10);
                loadTrack(idx);
                playTrack();
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') el.click();
            });
        });
    }

    /* ── Visualizer ───────────────────────────────────────── */
    function startVisualizer() {
        elVisualizer.classList.remove('paused');
    }

    function stopVisualizer() {
        elVisualizer.classList.add('paused');
    }

    /* ── Autoplay after 15 s ──────────────────────────────── */
    function scheduleAutoplay() {
        // Only if the user hasn't explicitly turned music off
        const pref = localStorage.getItem('gaurab_music_off');
        if (pref === 'true') return;

        autoplayTimer = setTimeout(() => {
            playTrack();
            showToast();
            openCard();
        }, AUTOPLAY_DELAY_MS);
    }

    function showToast() {
        elToast.classList.add('show');
        setTimeout(() => elToast.classList.remove('show'), 4000);
    }

    /* ── Preferences ──────────────────────────────────────── */
    function savePreferences() {
        localStorage.setItem('gaurab_music_vol', audio.volume);
        localStorage.setItem('gaurab_music_muted', isMuted);
    }

    function restorePreferences() {
        const vol = parseFloat(localStorage.getItem('gaurab_music_vol'));
        if (!isNaN(vol)) {
            audio.volume = vol;
            elVolume.value = vol;
        }
        const muted = localStorage.getItem('gaurab_music_muted') === 'true';
        if (muted) {
            isMuted = true;
            audio.muted = true;
        }
        updateVolIcon();
    }

    /* ── Init ─────────────────────────────────────────────── */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', buildPlayer);
        } else {
            buildPlayer();
        }
    }

    init();
})();
