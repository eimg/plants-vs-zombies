import { PLANT_ORDER, PLANT_TYPES } from './config.js';
import { PvZGame } from './game.js';
import { soundFX } from './audio.js';

// Crisp inline SVG portraits for each seed packet
const PLANT_ICONS = {
  sunflower: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <g fill="#facc15" stroke="#d97706" stroke-width="2">
      <ellipse cx="32" cy="10" rx="6" ry="9"/>
      <ellipse cx="32" cy="54" rx="6" ry="9"/>
      <ellipse cx="10" cy="32" rx="9" ry="6"/>
      <ellipse cx="54" cy="32" rx="9" ry="6"/>
      <ellipse cx="17" cy="17" rx="6" ry="8" transform="rotate(-45 17 17)"/>
      <ellipse cx="47" cy="47" rx="6" ry="8" transform="rotate(-45 47 47)"/>
      <ellipse cx="47" cy="17" rx="6" ry="8" transform="rotate(45 47 17)"/>
      <ellipse cx="17" cy="47" rx="6" ry="8" transform="rotate(45 17 47)"/>
    </g>
    <circle cx="32" cy="32" r="15" fill="#78350f" stroke="#451a03" stroke-width="2.5"/>
    <circle cx="26.5" cy="29.5" r="2.6" fill="#111827"/>
    <circle cx="37.5" cy="29.5" r="2.6" fill="#111827"/>
    <circle cx="27.3" cy="28.5" r="1" fill="#fff"/>
    <circle cx="38.3" cy="28.5" r="1" fill="#fff"/>
    <path d="M25 36 Q32 42 39 36" fill="none" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  peashooter: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M26 42 Q26 56 32 58 Q38 56 38 42" fill="#16a34a"/>
    <ellipse cx="22" cy="54" rx="10" ry="4.5" fill="#22c55e"/>
    <ellipse cx="42" cy="54" rx="10" ry="4.5" fill="#22c55e"/>
    <circle cx="28" cy="27" r="15" fill="#4ade80" stroke="#15803d" stroke-width="2.5"/>
    <rect x="37" y="19" width="16" height="14" rx="6" fill="#4ade80" stroke="#15803d" stroke-width="2.5"/>
    <ellipse cx="52" cy="26" rx="4" ry="7" fill="#14532d" stroke="#86efac" stroke-width="2"/>
    <circle cx="31" cy="23" r="3.2" fill="#0f172a"/>
    <circle cx="32.2" cy="21.8" r="1.2" fill="#fff"/>
    <path d="M13 24 Q7 17 16 17 Z" fill="#16a34a"/>
  </svg>`,
  wallnut: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 10 C47 10 53 26 51 42 C49 53 41 57 32 57 C23 57 15 53 13 42 C11 26 17 10 32 10 Z" fill="#c68642" stroke="#78350f" stroke-width="3"/>
    <path d="M32 11 Q28 33 32 56" fill="none" stroke="#9a5b25" stroke-width="2" opacity="0.6"/>
    <circle cx="24" cy="30" r="5" fill="#fff" stroke="#451a03" stroke-width="1.5"/>
    <circle cx="40" cy="30" r="5" fill="#fff" stroke="#451a03" stroke-width="1.5"/>
    <circle cx="24.5" cy="30.5" r="2.2" fill="#111827"/>
    <circle cx="39.5" cy="30.5" r="2.2" fill="#111827"/>
    <path d="M26 42 Q32 45 38 42" fill="none" stroke="#451a03" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  snowpea: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M26 42 Q26 56 32 58 Q38 56 38 42" fill="#0284c7"/>
    <ellipse cx="22" cy="54" rx="10" ry="4.5" fill="#38bdf8"/>
    <ellipse cx="42" cy="54" rx="10" ry="4.5" fill="#38bdf8"/>
    <polygon points="15,18 6,11 18,24" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>
    <polygon points="14,27 4,26 16,32" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/>
    <circle cx="28" cy="27" r="15" fill="#38bdf8" stroke="#0369a1" stroke-width="2.5"/>
    <rect x="37" y="19" width="16" height="14" rx="6" fill="#38bdf8" stroke="#0369a1" stroke-width="2.5"/>
    <ellipse cx="52" cy="26" rx="4" ry="7" fill="#0c4a6e" stroke="#bae6fd" stroke-width="2"/>
    <circle cx="31" cy="23" r="3.2" fill="#0f172a"/>
    <circle cx="32.2" cy="21.8" r="1.2" fill="#fff"/>
  </svg>`,
  cherrybomb: `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M21 34 Q28 12 36 10 Q42 18 44 36" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="43" cy="12" rx="8" ry="4" transform="rotate(-20 43 12)" fill="#22c55e"/>
    <circle cx="21" cy="42" r="14" fill="#dc2626" stroke="#7f1d1d" stroke-width="2.5"/>
    <circle cx="43" cy="45" r="13.5" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.5"/>
    <path d="M14 37 L21 40 M28 37 L21 40" stroke="#450a0a" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="17" cy="42" r="2.2" fill="#fef08a"/>
    <circle cx="25" cy="42" r="2.2" fill="#fef08a"/>
    <path d="M36 40 L43 43 M50 40 L43 43" stroke="#450a0a" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="39" cy="45" r="2.2" fill="#fef08a"/>
    <circle cx="47" cy="45" r="2.2" fill="#fef08a"/>
  </svg>`,
};

// DOM references
const stageEl = document.getElementById('stage');
const sunValueEl = document.getElementById('sun-value');
const sunPillEl = document.getElementById('sun-pill');
const progressFillEl = document.getElementById('progress-fill');
const progressHeadEl = document.getElementById('progress-head');
const waveCountEl = document.getElementById('wave-count');
const seedBarEl = document.getElementById('seed-bar');
const shovelBtn = document.getElementById('btn-shovel');
const muteBtn = document.getElementById('btn-mute');
const pauseBtn = document.getElementById('btn-pause');
const tipPillEl = document.getElementById('tip-pill');
const bannerEl = document.getElementById('banner');
const bannerTitleEl = document.getElementById('banner-title');
const bannerSubEl = document.getElementById('banner-sub');
const toastLayerEl = document.getElementById('toast-layer');

const menuModal = document.getElementById('modal-menu');
const pauseModal = document.getElementById('modal-pause');
const victoryModal = document.getElementById('modal-victory');
const gameoverModal = document.getElementById('modal-gameover');
const hudEl = document.getElementById('hud');

const victoryStatsEl = document.getElementById('victory-stats');
const gameoverStatsEl = document.getElementById('gameover-stats');

// Build Seed Cards in the mobile bottom dock
const cardElements = {};
PLANT_ORDER.forEach((id, idx) => {
  const def = PLANT_TYPES[id];
  const btn = document.createElement('button');
  btn.className = 'seed-card';
  btn.dataset.plant = id;
  btn.type = 'button';
  btn.setAttribute('aria-label', `${def.name} (နေရောင် ${def.cost})`);
  btn.innerHTML = `
    <span class="seed-hotkey">${idx + 1}</span>
    <div class="seed-icon">${PLANT_ICONS[id]}</div>
    <div class="seed-name">${def.name}</div>
    <div class="seed-cost">${def.cost}</div>
    <div class="seed-cooldown"></div>
  `;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    game.selectPlant(id);
  });
  seedBarEl.appendChild(btn);
  cardElements[id] = {
    btn,
    cooldownEl: btn.querySelector('.seed-cooldown'),
  };
});

let bannerTimeout = null;
function showBanner(title, sub = '', style = 'info') {
  bannerTitleEl.textContent = title;
  bannerSubEl.textContent = sub;
  bannerSubEl.style.display = sub ? 'block' : 'none';
  bannerEl.className = `banner visible ${style}`;
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    bannerEl.classList.remove('visible');
  }, 2700);
}

function spawnSunToast(amount, x, y) {
  const toast = document.createElement('div');
  toast.className = 'sun-toast';
  toast.textContent = `+${amount}`;
  toast.style.left = `${x}px`;
  toast.style.top = `${y}px`;
  toastLayerEl.appendChild(toast);
  setTimeout(() => toast.remove(), 750);

  sunPillEl.classList.remove('pop');
  void sunPillEl.offsetWidth;
  sunPillEl.classList.add('pop');
}

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function updateModals(state) {
  menuModal.classList.toggle('hidden', state !== 'menu');
  pauseModal.classList.toggle('hidden', state !== 'paused');
  victoryModal.classList.toggle('hidden', state !== 'victory');
  gameoverModal.classList.toggle('hidden', state !== 'gameover');
  hudEl.classList.toggle('hud-hidden', state === 'menu');
}

const game = new PvZGame(stageEl, {
  onHUDUpdate(data) {
    sunValueEl.textContent = data.sun;
    const pct = Math.round(data.progress * 100);
    progressFillEl.style.width = `${pct}%`;
    progressHeadEl.style.left = `${pct}%`;
    waveCountEl.textContent = `${data.zombiesDefeated}/${data.totalZombies}`;

    PLANT_ORDER.forEach((id) => {
      const def = PLANT_TYPES[id];
      const { btn, cooldownEl } = cardElements[id];
      const cd = data.cooldowns[id] || 0;
      const affordable = data.sun >= def.cost;
      const ready = cd <= 0;

      btn.classList.toggle('selected', data.selectedPlant === id);
      btn.classList.toggle('disabled', !affordable || !ready);
      const cdPct = ready ? 0 : Math.min(100, (cd / def.cooldown) * 100);
      cooldownEl.style.height = `${cdPct}%`;
    });

    shovelBtn.classList.toggle('active', data.shovelMode);

    if (data.shovelMode) {
      tipPillEl.textContent = 'ဖယ်ရှားလိုသော အပင်ကို နှိပ်ပါ';
      tipPillEl.classList.add('visible');
    } else if (data.selectedPlant) {
      const def = PLANT_TYPES[data.selectedPlant];
      tipPillEl.textContent = `${def.name} — ${def.tip} (မြက်ခင်းလွတ်ကို နှိပ်ပါ)`;
      tipPillEl.classList.add('visible');
    } else {
      tipPillEl.classList.remove('visible');
    }
  },
  onSunCollected(amount, x, y) {
    spawnSunToast(amount, x, y);
  },
  onInsufficientSun(plantId) {
    const el = cardElements[plantId]?.btn;
    if (el) {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    }
  },
  onBanner(title, sub, style) {
    showBanner(title, sub, style);
  },
  onStateChange(state) {
    updateModals(state);
  },
  onVictory(stats) {
    victoryStatsEl.innerHTML = `
      <div class="stat"><span>ကြာချိန်</span><strong>${formatTime(stats.time)}</strong></div>
      <div class="stat"><span>နှိမ်နင်းမှု</span><strong>${stats.zombiesDefeated}</strong></div>
      <div class="stat"><span>စိုက်ပင်</span><strong>${stats.plantsPlaced}</strong></div>
      <div class="stat"><span>မြက်ရိတ်စက်</span><strong>${stats.mowersLeft}/5</strong></div>
    `;
  },
  onGameOver(stats) {
    gameoverStatsEl.innerHTML = `
      <div class="stat"><span>ခံနိုင်ချိန်</span><strong>${formatTime(stats.time)}</strong></div>
      <div class="stat"><span>နှိမ်နင်းမှု</span><strong>${stats.zombiesDefeated}</strong></div>
      <div class="stat"><span>စိုက်ပင်</span><strong>${stats.plantsPlaced}</strong></div>
    `;
  },
});

// Wire HUD & Modal Buttons
document.getElementById('btn-start').addEventListener('click', () => game.startGame());
document.getElementById('btn-resume').addEventListener('click', () => game.togglePause());
document.getElementById('btn-restart-pause').addEventListener('click', () => game.restartGame());
document.getElementById('btn-play-again-win').addEventListener('click', () => game.restartGame());
document.getElementById('btn-play-again-lose').addEventListener('click', () => game.restartGame());

pauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  game.togglePause();
});

shovelBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  game.toggleShovel();
});

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  soundFX.unlock();
  const muted = soundFX.toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-label', muted ? 'အသံဖွင့်ရန်' : 'အသံပိတ်ရန်');
});

// Desktop keyboard convenience shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '5') {
    const idx = parseInt(e.key, 10) - 1;
    if (PLANT_ORDER[idx]) game.selectPlant(PLANT_ORDER[idx]);
  } else if (e.key === 's' || e.key === 'S' || e.key === 'x' || e.key === 'X') {
    game.toggleShovel();
  } else if (e.key === 'Escape') {
    if (game.selectedPlant || game.shovelMode) {
      game.cancelSelection();
    } else if (game.state === 'playing' || game.state === 'paused') {
      game.togglePause();
    }
  } else if (e.key === 'p' || e.key === 'P') {
    if (game.state === 'playing' || game.state === 'paused') {
      game.togglePause();
    }
  }
});

// Initial state
updateModals('menu');
