(() => {
  'use strict';

  const HERO_KEY = 'muscules_neo_stats_v01';
  const XP_PER_LEVEL = 1000;
  const DEFAULT_STATS = { hp: 28, maxHp: 28, atk: 35, xp: 9400 };
  const $ = id => document.getElementById(id);

  function readStats() {
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(HERO_KEY));
    } catch {
      stored = null;
    }

    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return { ...DEFAULT_STATS };
    }

    return Object.fromEntries(
      Object.entries(DEFAULT_STATS).map(([key, fallback]) => [
        key,
        Number.isFinite(stored[key]) ? stored[key] : fallback
      ])
    );
  }

  function render() {
    const stats = readStats();
    const hpMax = Math.max(0, stats.maxHp);
    const hpCurrent = Math.max(0, stats.hp);
    const hpProgress = hpMax > 0 ? Math.min(1, hpCurrent / hpMax) : 0;
    const totalXp = Math.max(0, stats.xp);
    const level = Math.floor(totalXp / XP_PER_LEVEL);
    const xpWithinLevel = totalXp % XP_PER_LEVEL;
    const xpProgress = xpWithinLevel / XP_PER_LEVEL;
    const hpMeter = $('hp-meter');
    const xpMeter = $('xp-meter');

    hpMeter.setAttribute('aria-valuemax', String(hpMax));
    hpMeter.setAttribute('aria-valuenow', String(Math.min(hpMax, hpCurrent)));
    $('hp-fill').style.width = `${hpProgress * 100}%`;
    $('hp-value').textContent = `${stats.hp}/${stats.maxHp}`;
    $('atk-value').textContent = stats.atk;

    xpMeter.setAttribute('aria-valuenow', String(xpWithinLevel));
    xpMeter.setAttribute('aria-valuetext', `${stats.xp} XP acumulados`);
    $('xp-fill').style.width = `${xpProgress * 100}%`;
    $('xp-value').textContent = `${new Intl.NumberFormat('es-MX').format(stats.xp)} XP`;
    $('level-number').textContent = String(level);
  }

  window.addEventListener('storage', event => {
    if (event.key === HERO_KEY || event.key === null) render();
  });
  window.addEventListener('pageshow', render);
  render();
})();
