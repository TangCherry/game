/* Muscules v0.2: bestiario dinámico, demo local. No sincroniza con Supabase. */
(() => {
  'use strict';
  const HERO_KEY = 'muscules_neo_stats_v01';
  const BATTLE_PREFIX = 'muscules_dynamic_battle_v02_';
  const DURATION = 24 * 60 * 60 * 1000;
  const CATALOG = window.MUSCULES_ENEMIES || [];
  const $ = id => document.getElementById(id);
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const roll = () => Math.floor(Math.random() * 20) + 1;
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
  const demoStats = enemy => ({ ...enemy, hp: enemy.hp ?? 45, atk: enemy.atk ?? 8, xp: enemy.xp ?? 0 });
  const initialHero = () => ({ hp: 28, maxHp: 28, atk: 35, xp: 9400 });
  let hero = read(HERO_KEY) || initialHero();
  let selectedId = new URLSearchParams(location.search).get('enemy') || 'carrotnero';
  if (!CATALOG.some(e => e.id === selectedId)) selectedId = 'carrotnero';
  let enemy, battle, battleKey;
  function freshBattle() { return { id: `demo-${enemy.id}`, enemyId: enemy.id, startedAt: Date.now(), expiresAt: Date.now() + DURATION, enemyHp: enemy.hp, heroHp: hero.hp, status: hero.hp > 0 ? 'active' : 'lost', reason: hero.hp > 0 ? null : 'hp', round: 0, claimed: false, openingApplied: false, xpStolen: 0, message: `¡${enemy.name} te desafía! Neo ataca primero.` }; }
  function persist() { save(battleKey, battle); save(HERO_KEY, hero) }
  function loadEnemy(id) {
    const source = CATALOG.find(e => e.id === id); if (!source) return;
    if (source.hp == null || source.atk == null) { alert(`${source.name} tiene una mecánica especial pendiente; no se puede combatir todavía.`); $('enemy-select').value = selectedId; return; }
    selectedId = id; enemy = demoStats(source); battleKey = BATTLE_PREFIX + id;
    const storedBattle = read(battleKey);
    battle = storedBattle || freshBattle();
    // Compatibilidad con encuentros creados antes de introducir openingApplied:
    // si ya hubo rondas, nunca volver a aplicar un efecto inicial.
    if (storedBattle && battle.openingApplied === undefined && battle.round > 0) {
      battle.openingApplied = true;
    }
    // Comprobar el vencimiento ANTES de aplicar cualquier efecto inicial.
    if (battle.status === 'active' && Date.now() >= battle.expiresAt) {
      battle.status = 'lost';
      battle.reason = 'time';
      battle.message = `¡Se acabaron las 24 horas! ${enemy.name} escapó.`;
    }
    // El efecto inicial solo modifica la salud del héroe, jamás enemyHp.
    // Se guarda junto al encuentro para no repetirse al recargar.
    if (battle.status === 'active' && !battle.openingApplied) {
      if (enemy.effect?.type === 'opening_damage') {
        const openingDamage = Math.max(0, Number(enemy.effect.amount) || 0);
        hero.hp = Math.max(0, hero.hp - openingDamage);
        battle.heroHp = hero.hp;
        battle.message = `${enemy.name} te quita ${openingDamage} HP al comenzar. ¡Neo ataca primero!`;
        if (hero.hp === 0) { battle.status = 'lost'; battle.reason = 'hp'; }
      }
      battle.openingApplied = true;
    }
    // No restaurar HP desde una batalla anterior si el HP global ya cambió.
    if (battle.status === 'active' && hero.hp <= 0) { battle.status = 'lost'; battle.reason = 'hp'; battle.heroHp = 0; }
    $('enemy-select').value = id;
    $('enemy-name').textContent = enemy.name;
    $('enemy-image').src = enemy.image; $('enemy-image').alt = enemy.name;
    $('win-image').src = enemy.image; $('lose-image').src = enemy.image;
    $('enemy-atk').textContent = enemy.atk;
    $('enemy-ability').textContent = enemy.ability;
    $('reward-xp').textContent = enemy.reward?.description || `${enemy.xp ?? 0} XP`;
    $('demo-note').textContent = source.hp === null ? '⚠️ Estadísticas provisionales: revisa enemies.js' : 'Modo local: sin sincronización';
    history.replaceState(null, '', `?enemy=${encodeURIComponent(id)}`);
    persist(); render();
  }
  function expire() { if (battle.status === 'active' && Date.now() >= battle.expiresAt) { battle.status = 'lost'; battle.reason = 'time'; battle.message = `¡Se acabaron las 24 horas! ${enemy.name} escapó.`; persist() } }
  function render() {
    if (!battle) return; expire();
    const remaining = Math.max(0, battle.expiresAt - Date.now());
    const hh = Math.floor(remaining / 3600000), mm = Math.floor(remaining % 3600000 / 60000), ss = Math.floor(remaining % 60000 / 1000);
    $('timer').textContent = [hh, mm, ss].map(x => String(x).padStart(2, '0')).join(':');
    document.querySelector('.timer').classList.toggle('danger', remaining < 3600000);
    $('battle').hidden = battle.status !== 'active'; $('win').hidden = battle.status !== 'won'; $('lose').hidden = battle.status !== 'lost';
    $('enemy-hp').textContent = `${battle.enemyHp}/${enemy.hp}`; $('enemy-bar').style.width = `${100 * clamp(battle.enemyHp / enemy.hp, 0, 1)}%`;
    $('hero-hp').textContent = `${hero.hp}/${hero.maxHp} HP`; $('hero-bar').style.width = `${100 * clamp(hero.hp / hero.maxHp, 0, 1)}%`;
    $('log').textContent = battle.message; $('roll').disabled = battle.status !== 'active' || hero.hp <= 0;
    $('claim').disabled = battle.claimed; $('claim').textContent = battle.claimed ? 'Reclamado ✓' : 'Reclamar';
    $('claim-status').textContent = battle.claimed ? `XP total: ${hero.xp}` : '';
    $('lose-reason').textContent = battle.reason === 'time' ? 'Tiempo agotado' : 'Fallecido';
    $('lose-detail').textContent = battle.reason === 'time' ? `${enemy.name} escapó · Sin penalización de XP` : '0 HP · Esperando a la sexy dm para revivir';
  }
  $('roll').addEventListener('click', () => {
    expire(); if (battle.status !== 'active') { render(); return; }
    if (hero.hp <= 0) { battle.status = 'lost'; battle.reason = 'hp'; persist(); render(); return; }
    const neoRoll = roll();
    const blocked = enemy.effect?.type === 'roll_immunity' && neoRoll <= enemy.effect.threshold;
    const neoDamage = blocked ? 0 : Math.max(1, Math.floor(neoRoll / 2) + Math.floor(hero.atk / 5) - enemy.armor);
    battle.enemyHp = Math.max(0, battle.enemyHp - neoDamage); battle.round++;
    if (battle.enemyHp === 0) { battle.status = 'won'; battle.message = `Ronda ${battle.round}: Neo 🎲${neoRoll} → ${neoDamage} daño. ¡Victoria!`; }
    else {
      const enemyRoll = roll(); const monsterDamage = Math.max(1, Math.floor(enemyRoll / 4) + Math.max(1, Math.floor(enemy.atk * 3 / 8)));
      hero.hp = Math.max(0, hero.hp - monsterDamage); battle.heroHp = hero.hp;
      // La habilidad se aplica únicamente cuando el enemigo alcanza a contraatacar.
      const xpTheft = enemy.effect?.type === 'steal_xp'
        ? Math.min(Math.max(0, hero.xp), Math.max(0, Number(enemy.effect.amount) || 0)) : 0;
      if (xpTheft > 0) { hero.xp -= xpTheft; battle.xpStolen = (battle.xpStolen || 0) + xpTheft; }
      battle.message = `Ronda ${battle.round}: Neo 🎲${neoRoll} → ${blocked ? 'ataque bloqueado (0 daño)' : `${neoDamage} daño`}. ${enemy.name} 🎲${enemyRoll} → ${monsterDamage} daño.${enemy.effect?.type === 'steal_xp' ? ` Roba ${xpTheft} XP (XP actual: ${hero.xp}).` : ''}`;
      if (hero.hp === 0) { battle.status = 'lost'; battle.reason = 'hp'; battle.message += ' Neo ha caído.'; }
    }
    persist(); render();
  });
  $('claim').addEventListener('click', () => { expire(); if (battle.status !== 'won' || battle.claimed) { render(); return; } if (enemy.reward && enemy.reward.type !== 'xp') { alert('Recompensa especial pendiente de implementar; no se añadirá XP ficticio.'); return; } battle.claimed = true; hero.xp += (enemy.xp ?? 0); persist(); render() });
  $('reset').addEventListener('click', () => { if (!confirm('¿Reiniciar este encuentro de prueba? Restaurará HP a 28 y no restará XP ya reclamado.')) return; hero.hp = hero.maxHp; battle = freshBattle(); persist(); render() });
  $('enemy-select').addEventListener('change', e => loadEnemy(e.target.value));
  for (const e of CATALOG) { const opt = document.createElement('option'); opt.value = e.id; opt.textContent = `Nivel ${e.level} · ${e.name}`; $('enemy-select').append(opt) }
  window.MusculesDemo = { state: () => structuredClone({ hero, battle, enemy }), reset: () => $('reset').click(), expire: () => { battle.expiresAt = Date.now() - 1; persist(); render() }, win: () => { if (battle.status !== 'active') return; battle.enemyHp = 0; battle.status = 'won'; battle.message = 'Victoria forzada para probar la pantalla'; persist(); render() }, select: loadEnemy };
  loadEnemy(selectedId); setInterval(render, 1000);
})();
