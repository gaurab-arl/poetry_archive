/**
 * music.js — Ambient Music Player for Gaurab's Poetry Site
 *
 * Cross-page continuity: saves playback position + state to localStorage
 * on page unload and restores it instantly on the next page load,
 * so music appears seamless across navigation.
 */

(function MusicPlayer() {
    'use strict';

    /* ── Storage keys ─────────────────────────────────────── */
    const KEY_TIME    = 'gaurab_music_time';
    const KEY_PLAYING = 'gaurab_music_playing';

    /* ── Resolve asset root (works from any subfolder depth) ─ */
    function resolveRoot() {
        const base = document.querySelector('base');
        if (base) return base.href;
        const depth = (window.location.pathname.match(/\//g) || []).length - 1;
        let root = './';
        for (let i = 0; i < depth; i++) root = '../' + root;
        return root;
    }

    const ROOT = resolveRoot();

    /* ── Single track ─────────────────────────────────────── */
    const TRACK = {
        title:  'Cry',
        artist: 'Cigarettes After Sex',
        src:    ROOT + 'music/Cry - Cigarettes After Sex.mp3',
        emoji:  '🌙'
    };

    /* ── State ────────────────────────────────────────────── */
    let isPlaying   = false;
    let cardOpen    = false;
    let autoTimer   = null;
    const AUTOPLAY_DELAY_MS = 15000;

    /* ── Audio engine ─────────────────────────────────────── */
    const audio     = new Audio();
    audio.loop      = true;
    audio.volume    = 0.55;
    audio.preload   = 'auto';
    audio.src       = TRACK.src;

    /* ── Read saved state before building UI ─────────────── */
    const savedTime    = parseFloat(localStorage.getItem(KEY_TIME)    || '0');
    const wasPlaying   = localStorage.getItem(KEY_PLAYING) === 'true';

    /* Seek immediately — browsers allow setting currentTime before canplay.
       If it fails (e.g. no buffered data yet), retry on canplay once. */
    if (savedTime > 0) {
        try {
            audio.currentTime = savedTime;
        } catch (_) {
            audio.addEventListener('canplay', () => {
                audio.currentTime = savedTime;
            }, { once: true });
        }
    }

    /* ── Save state right before any page unload ──────────── */
    window.addEventListener('beforeunload', () => {
        localStorage.setItem(KEY_TIME,    audio.currentTime);
        localStorage.setItem(KEY_PLAYING, isPlaying ? 'true' : 'false');
    });

    /* ── Also intercept <a> clicks for same-origin links ─── */
    // This fires slightly earlier than beforeunload and is more reliable
    // when the browser caches the referer page aggressively.
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        // Only save for same-site navigation, ignore anchors / external
        if (href && !href.startsWith('#') && !href.startsWith('http')) {
            localStorage.setItem(KEY_TIME,    audio.currentTime);
            localStorage.setItem(KEY_PLAYING, isPlaying ? 'true' : 'false');
        }
    }, true); // capture phase so it runs before any other handler

    /* ── Play / Stop ──────────────────────────────────────── */
    function playTrack() {
        audio.play().then(() => {
            isPlaying = true;
            updateUI();
        }).catch(() => {
            isPlaying = false;
            updateUI();
        });
    }

    function stopTrack() {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        localStorage.setItem(KEY_TIME,    '0');
        localStorage.setItem(KEY_PLAYING, 'false');
        updateUI();
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        updateUI();
    }

    function togglePlayPause() {
        isPlaying ? pauseTrack() : playTrack();
    }

    /* ── DOM refs ─────────────────────────────────────────── */
    let elCard, elToggleBtn, elPlayStop, elStopBtn;
    let elProgress, elCurrTime, elDuration, elToast;

    /* ── Build HTML ───────────────────────────────────────── */
    function buildPlayer() {
        const container = document.createElement('div');
        container.id = 'music-player';
        container.innerHTML = `
            <div id="music-card">
                <div class="music-track-info">
                    <div class="music-art" id="music-art">
                        <span class="music-note-icon">${TRACK.emoji}</span>
                    </div>
                    <div class="music-text">
                        <div class="music-title">${TRACK.title}</div>
                        <div class="music-artist">${TRACK.artist}</div>
                    </div>
                    <button class="music-stop-btn" id="music-stop-btn"
                            title="Stop music" aria-label="Stop music">⏹</button>
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
                    <button class="music-btn play-pause-btn" id="music-play-stop"
                            aria-label="Play">▶ Play</button>
                </div>
            </div>

            <button id="music-toggle-btn" aria-label="Toggle music player">
                <span class="btn-icon">🎵</span>
                <span class="btn-label">Ambient Music</span>
            </button>`;

        document.body.appendChild(container);

        const toast = document.createElement('div');
        toast.id = 'music-autoplay-toast';
        toast.innerHTML = `
            <span class="toast-icon">🎵</span>
            <span class="toast-text">Music started — click the player to control it.</span>`;
        document.body.appendChild(toast);

        elCard      = document.getElementById('music-card');
        elToggleBtn = document.getElementById('music-toggle-btn');
        elPlayStop  = document.getElementById('music-play-stop');
        elStopBtn   = document.getElementById('music-stop-btn');
        elProgress  = document.getElementById('music-progress');
        elCurrTime  = document.getElementById('music-curr-time');
        elDuration  = document.getElementById('music-duration');
        elToast     = document.getElementById('music-autoplay-toast');

        bindEvents();

        /* ── Resume or schedule ───────────────────────────── */
        if (wasPlaying) {
            // Was playing on the previous page — resume immediately
            playTrack();
            openCard();
        } else {
            // First visit or user had stopped — wait 15s then autoplay
            autoTimer = setTimeout(() => {
                playTrack();
                showToast();
                openCard();
            }, AUTOPLAY_DELAY_MS);
        }
    }

    /* ── Events ───────────────────────────────────────────── */
    function bindEvents() {
        elToggleBtn.addEventListener('click', toggleCard);

        elPlayStop.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlayPause();
        });

        elStopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stopTrack();
        });

        elProgress.addEventListener('input', () => {
            if (!isNaN(audio.duration)) {
                audio.currentTime = (elProgress.value / 100) * audio.duration;
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (!isNaN(audio.duration) && audio.duration > 0) {
                elProgress.value       = (audio.currentTime / audio.duration) * 100;
                elCurrTime.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            elDuration.textContent = formatTime(audio.duration);
        });

        audio.addEventListener('error', () => {
            console.warn('MusicPlayer: could not load', TRACK.src);
        });

        document.addEventListener('click', (e) => {
            const inPlayer = document.getElementById('music-player').contains(e.target);
            if (cardOpen && !inPlayer) closeCard();
        });
    }

    /* ── Card toggle ──────────────────────────────────────── */
    function toggleCard() { cardOpen ? closeCard() : openCard(); }
    function openCard()   { cardOpen = true;  elCard.classList.add('open'); }
    function closeCard()  { cardOpen = false; elCard.classList.remove('open'); }

    /* ── UI sync ──────────────────────────────────────────── */
    function updateUI() {
        const art = document.getElementById('music-art');
        if (isPlaying) {
            elPlayStop.textContent  = '⏸ Pause';
            elPlayStop.title        = 'Pause';
            elStopBtn.style.opacity = '1';
            art.classList.add('spinning');
        } else {
            elPlayStop.textContent  = '▶ Play';
            elPlayStop.title        = 'Play';
            elStopBtn.style.opacity = '0.45';
            art.classList.remove('spinning');
        }
    }

    /* ── Toast ────────────────────────────────────────────── */
    function showToast() {
        elToast.classList.add('show');
        setTimeout(() => elToast.classList.remove('show'), 4200);
    }

    /* ── Helpers ──────────────────────────────────────────── */
    function formatTime(s) {
        if (isNaN(s)) return '0:00';
        const m   = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    /* ── Init ─────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildPlayer);
    } else {
        buildPlayer();
    }

})();
