/* Muscules v0.7: bestiario dinámico, demo local. No sincroniza con Supabase. */
(() => {
  'use strict';
  const HERO_KEY = 'muscules_neo_stats_v01';
  const INVENTORY_KEY = 'muscules_neo_inventory_v01';
  const CURRENT_ENCOUNTER_KEY = 'muscules_dynamic_current_encounter_v01';
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } };
  const ITEM_POOL = ['bola', 'llave', 'totem', 'encendedor', 'ojo', 'maaaake', 'fuego', 'gatito', 'stirfry', 'miau', 'morision', 'cumbia', 'galleta', 'sherma', 'gusanito'];
  const ITEMS = {
    bola: ['Bola de cristal', 'bola-de-cristal.png', 'bola de cristal.png', 'roll_bonus', 1],
    llave: ['Llave de fuga', 'llave-de-fuga.png', 'llave de fuga.png', 'escape'],
    totem: ['Tótem maldito', 'totem-maldito.png', 'totem maldito.png', 'atk_battle', 2],
    encendedor: ['Encendedor arcoíris', 'encendedor-de-arcoiris.png', 'encendedor de arcoiris.png', 'damage', 3],
    ojo: ['Ojo cósmico', 'ojo-cosmico.png', 'ojo cosmico.png', 'hp_bonus', 5],
    maaaake: ['Maaaake-up', 'maaaake-up.png', 'maaaake up.png', 'atk_override', 50],
    fuego: ['Fuego en la espada', 'fuego-en-la-espada.png', 'fuego en la espada.png', 'damage_bonus', 2],
    gatito: ['Gatito fantasma', 'gatito-fantasma.png', 'gatito fantasma.png', 'revive', 10],
    stirfry: ['Stirfry', 'stirfry.png', 'stirfry.png', 'heal', 15],
    miau: ['¿Miau?', '¿miau?.png', '¿miau?.png', 'revive_half', 0.5],
    morision: ['Pócima de la morisión', 'pocima-de-la-morision.png', 'pocima de la morision.png', 'instant_kill'],
    cumbia: ['Poción de la cumbia', 'pocion-de-la-cumbia.png', 'pocion-de-la-cumbia.png', 'heal_full'],
    galleta: ['Galleta de conejito', 'galleta-de-conejo-moreno.png', 'galleta de conejo moreno.png', 'heal_full'],
    sherma: ['Sherma', 'sherma.png', 'sherma.png', 'atk_first', 5],
    gusanito: ['Gusanito', 'gusanito.png', 'gusanito.png', 'atk_battle', 3],
    vida_extra: ['Vida extra', 'vida-extra.png', null, 'revive_full']
  };
  const ITEM_CARDS = {
    bola: 'bola-de-cristal.png',
    llave: 'llave-de-fuga.png',
    totem: 'totem-maldito.png',
    encendedor: 'encendedor-arcoiris.png',
    ojo: 'ojo-cosmico.png',
    maaaake: 'maaake-up.png',
    fuego: 'fuego-en-la-espada.png',
    gatito: 'gatito-fantasma.png',
    stirfry: 'stirfry.png',
    miau: '¿miau?.png',
    morision: 'pocion-de-la-morision.png',
    cumbia: 'pocima-de-la-cumbia.png',
    galleta: 'galleta-de-conejo-moreno.png',
    sherma: 'sherma.png',
    gusanito: 'gusanito.png',
    vida_extra: 'vida-extra.png'
  };
  const itemIcon = id => ITEMS[id]?.[1] ? `assets/items/${encodeURIComponent(ITEMS[id][1])}` : 'assets/items/inventory-button.png';
  const itemCard = id => ITEM_CARDS[id] ? `assets/cards/${encodeURIComponent(ITEM_CARDS[id])}` : null;
  const normalizeInventory = value => Array.isArray(value) ? value.filter(id => ITEMS[id]).slice(0, 15) : [];
  let inventory = normalizeInventory(read(INVENTORY_KEY));
  let chosenSlot = -1;
  let inventoryView = 'closed';
  const BATTLE_PREFIX = 'muscules_dynamic_battle_v02_';
  const DURATION = 24 * 60 * 60 * 1000;
  const CATALOG = window.MUSCULES_ENEMIES || [];
  const $ = id => document.getElementById(id);
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const roll = () => Math.floor(Math.random() * 20) + 1;
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
  const demoStats = enemy => ({ ...enemy, hp: enemy.hp ?? 45, atk: enemy.atk ?? 8, xp: enemy.xp ?? 0 });
  const initialHero = () => ({ hp: 28, maxHp: 28, atk: 35, xp: 9400 });
  let hero = read(HERO_KEY) || initialHero();
  let selectedId = 'carrotnero';
  const currentEncounter = read(CURRENT_ENCOUNTER_KEY);
  if (CATALOG.some(e => e.id === currentEncounter?.enemyId)) selectedId = currentEncounter.enemyId;
  let enemy, battle, battleKey;
  function createEncounterId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function freshBattle() { return { id: `demo-${enemy.id}`, encounterId: createEncounterId(), enemyId: enemy.id, startedAt: Date.now(), expiresAt: Date.now() + DURATION, enemyHp: enemy.hp, heroHp: hero.hp, status: hero.hp > 0 ? 'active' : 'lost', reason: hero.hp > 0 ? null : 'hp', round: 0, claimed: false, openingApplied: false, xpStolen: 0, rooted: false, slothAttacks: 0, owlPenalty: false, itemUsed: false, itemBuff: null, lapidaMaxHp: null, lapidaHp: null, poisonTurns: 0, message: `¡${enemy.name} te desafía! Neo ataca primero.` }; }
  // La Lápida limita la vida DISPONIBLE, sin borrar la mitad protegida.
  // hero.hp siempre guarda la vida real restante de Neo.
  function isLapida() { return enemy?.effect?.type === 'half_hp'; }
  function takeDamage(amount) {
    const incoming = Math.max(0, Number(amount) || 0);
    const applied = isLapida() ? Math.min(incoming, Math.max(0, battle.lapidaHp ?? 0)) : incoming;
    hero.hp = Math.max(0, hero.hp - applied);
    if (isLapida()) battle.lapidaHp = Math.max(0, battle.lapidaHp - applied);
    battle.heroHp = hero.hp;
    return applied;
  }
  function heroDefeated() { return hero.hp <= 0 || (isLapida() && battle.lapidaHp <= 0); }
  function markHeroDefeat() {
    battle.status = 'lost'; battle.reason = isLapida() && hero.hp > 0 ? 'lapida' : 'hp';
  }
  function persist() {
    if (battle.status !== 'active' && battle.itemBuff?.kind === 'atk_override') battle.itemBuff = null;
    if (battle.status !== 'active' && battle.itemBuff?.kind === 'damage_bonus') battle.itemBuff = null;
    save(battleKey, battle); save(HERO_KEY, hero); save(INVENTORY_KEY, inventory);
  }
  function discardPendingReward(pointer) {
    if (!pointer?.enemyId || !pointer.encounterId) return;
    const previousKey = BATTLE_PREFIX + pointer.enemyId;
    const previousBattle = read(previousKey);
    if (previousBattle?.encounterId !== pointer.encounterId
      || previousBattle.status !== 'won' || previousBattle.claimed) return;
    previousBattle.rewardDiscarded = true;
    previousBattle.rewardMessage = 'Encuentro reemplazado; la recompensa pendiente se perdió.';
    save(previousKey, previousBattle);
  }
  function loadEnemy(id, startNewEncounter = false) {
    const source = CATALOG.find(e => e.id === id); if (!source) return;
    if (source.hp == null || source.atk == null) { alert(`${source.name} tiene una mecánica especial pendiente; no se puede combatir todavía.`); $('enemy-select').value = selectedId; return; }
    selectedId = id; enemy = demoStats(source); battleKey = BATTLE_PREFIX + id;
    closeInventory();
    const pointer = read(CURRENT_ENCOUNTER_KEY);
    if (startNewEncounter) discardPendingReward(pointer);
    const storedBattle = read(battleKey);
    const pointerMatchesEnemy = pointer?.enemyId === id;
    const battleMatchesPointer = pointerMatchesEnemy && storedBattle?.encounterId
      && storedBattle.encounterId === pointer.encounterId;
    const canAdoptLegacyBattle = storedBattle && !storedBattle.encounterId
      && (!pointer || pointerMatchesEnemy);
    if (startNewEncounter || (!battleMatchesPointer && !canAdoptLegacyBattle)) {
      battle = freshBattle();
    } else {
      battle = storedBattle || freshBattle();
      if (!battle.encounterId) battle.encounterId = createEncounterId();
    }
    if (!pointerMatchesEnemy || pointer?.encounterId !== battle.encounterId) {
      save(battleKey, battle);
      save(CURRENT_ENCOUNTER_KEY, { enemyId: id, encounterId: battle.encounterId });
    } else if (storedBattle && !storedBattle.encounterId) {
      save(battleKey, battle);
      save(CURRENT_ENCOUNTER_KEY, { enemyId: id, encounterId: battle.encounterId });
    }
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
      if (enemy.effect?.type === 'opening_sloth' && Math.random() < enemy.effect.chance) {
        battle.slothAttacks = enemy.effect.attacks;
        battle.message = `¡${enemy.name} contagia su pereza! Tus próximos ${battle.slothAttacks} ataques hacen ${enemy.effect.amount} puntos menos de daño.`;
      }
      if (isLapida()) {
        battle.lapidaMaxHp = Math.floor(hero.hp / 2);
        battle.lapidaHp = battle.lapidaMaxHp;
        battle.message = `¡Lápida Llorona sella tu energía! Peleas con ${battle.lapidaHp} HP disponibles; el resto queda protegido.`;
        if (battle.lapidaHp === 0) markHeroDefeat();
      }
      battle.openingApplied = true;
    }
    // No restaurar HP desde una batalla anterior si el HP global ya cambió.
    // Encuentros anteriores al parche: reiniciar Lápida desde cero para evitar
    // inventar una reserva de HP después de que ya hubo daño.
    if (isLapida() && battle.status === 'active' && battle.lapidaHp == null) {
      if (battle.round === 0) {
        battle.lapidaMaxHp = Math.floor(hero.hp / 2);
        battle.lapidaHp = battle.lapidaMaxHp;
        battle.message = `¡Lápida Llorona sella tu energía! Peleas con ${battle.lapidaHp} HP disponibles; el resto queda protegido.`;
      } else {
        battle.status = 'lost'; battle.reason = 'legacy';
        battle.message = 'Encuentro anterior a v0.5.1: usa Reiniciar prueba para probar la Lápida sin datos inconsistentes.';
      }
    }
    if (battle.status === 'active' && heroDefeated()) markHeroDefeat();
    $('enemy-select').value = id;
    $('enemy-name').textContent = enemy.name;
    $('enemy-image').src = enemy.image; $('enemy-image').alt = enemy.name;
    $('win-image').src = enemy.image; $('lose-image').src = enemy.image;
    $('enemy-atk').textContent = enemy.atk;
    $('enemy-ability').textContent = enemy.ability;
    $('reward-xp').textContent = enemy.reward?.type === 'extra_life'
      ? '❤️ Vida extra'
      : enemy.reward?.type === 'item' ? ITEMS.cumbia[0] : enemy.reward?.description || `${enemy.xp ?? 0} XP`;
    $('demo-note').textContent = source.hp === null ? '⚠️ Estadísticas provisionales: revisa enemies.js' : 'Modo local: sin sincronización';
    history.replaceState(null, '', `?enemy=${encodeURIComponent(id)}`);
    persist(); render();
  }
  function expire() { if (battle.status === 'active' && Date.now() >= battle.expiresAt) { battle.status = 'lost'; battle.reason = 'time'; battle.message = `¡Se acabaron las 24 horas! ${enemy.name} escapó.`; persist() } }
  function rewardItemId(reward) {
    if (reward?.type === 'extra_life') return 'vida_extra';
    if (reward?.type === 'item') return 'cumbia';
    if (reward?.type === 'random_item') return ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
    return null;
  }
  function rewardNeedsInventorySpace() {
    return battle.status === 'won' && !battle.claimed
      && ['extra_life', 'item', 'random_item'].includes(enemy.reward?.type);
  }
  function render() {
    if (!battle) return;
    $('waiting').hidden = true;
    expire();
    const pickerContainer = battle.status === 'active' ? $('battle-picker-container')
      : battle.status === 'won' ? $('win-picker-container') : $('lose-picker-container');
    const picker = document.querySelector('.dev-picker');
    if (picker.parentElement !== pickerContainer) pickerContainer.append(picker);
    const remaining = Math.max(0, battle.expiresAt - Date.now());
    const hh = Math.floor(remaining / 3600000), mm = Math.floor(remaining % 3600000 / 60000), ss = Math.floor(remaining % 60000 / 1000);
    $('timer').textContent = [hh, mm, ss].map(x => String(x).padStart(2, '0')).join(':');
    document.querySelector('.timer').classList.toggle('danger', remaining < 3600000);
    $('battle').hidden = battle.status !== 'active'; $('win').hidden = battle.status !== 'won'; $('lose').hidden = battle.status !== 'lost';
    $('enemy-hp').textContent = `${battle.enemyHp}/${enemy.hp}`; $('enemy-bar').style.width = `${100 * clamp(battle.enemyHp / enemy.hp, 0, 1)}%`;
    const visibleHp = isLapida() ? (battle.lapidaHp ?? 0) : hero.hp;
    const visibleMaxHp = isLapida() ? (battle.lapidaMaxHp ?? 1) : hero.maxHp;
    $('hero-hp').textContent = isLapida()
      ? `${visibleHp}/${visibleMaxHp} HP · ${hero.hp}/${hero.maxHp} reales`
      : `${hero.hp}/${hero.maxHp} HP`;
    $('hero-bar').style.width = `${100 * clamp(visibleHp / Math.max(1, visibleMaxHp), 0, 1)}%`;
    $('log').textContent = battle.message; $('roll').disabled = battle.status !== 'active' || hero.hp <= 0;
    const inventoryFull = rewardNeedsInventorySpace() && inventory.length >= 15;
    $('claim').disabled = battle.claimed || battle.rewardDiscarded || inventoryFull; $('claim').textContent = battle.claimed ? 'Reclamado ✓' : 'Reclamar';
    $('claim-status').textContent = battle.claimed
      ? (battle.rewardMessage || `XP total: ${hero.xp}`)
      : inventoryFull ? 'Inventario lleno: libera un espacio para reclamar esta recompensa.' : (battle.rewardMessage || '');
    $('revive-button').hidden = !(battle.status === 'lost' && battle.reason === 'hp' && inventory.some(id => isRevive(id)));
    renderInventoryButton();
    $('lose').querySelector('h1').textContent = battle.reason === 'escape' ? 'Huida' : 'Derrota';
    $('lose-reason').textContent = battle.reason === 'escape' ? 'Escapó' : battle.reason === 'time' ? 'Tiempo agotado' : battle.reason === 'lapida' ? 'Derrotado por Lápida' : battle.reason === 'legacy' ? 'Reinicia esta prueba' : 'Fallecido';
    $('lose-detail').textContent = battle.reason === 'escape' ? 'Neo utilizó la Llave de fuga' : battle.reason === 'time' ? `${enemy.name} escapó · Sin penalización de XP` : battle.reason === 'lapida' ? `Se agotó tu HP disponible · Conservas ${hero.hp}/${hero.maxHp} HP reales` : battle.reason === 'legacy' ? 'Prueba anterior incompatible; reinicia el encuentro' : '0 HP · Esperando a la sexy dm para revivir';
  }
  function isRevive(id) { return ['revive', 'revive_full', 'revive_half'].includes(ITEMS[id]?.[3]); }
  function canUse(id) {
    if (!ITEMS[id]) return false;
    const kind = ITEMS[id][3];
    if (kind === 'special') return false; // Sin mecánica aprobada: no consumir.
    if (isRevive(id)) return battle.status === 'lost' && battle.reason === 'hp';
    if (battle.status !== 'active' || battle.itemUsed) return false;
    if (kind === 'atk_first' && battle.round !== 0) return false;
    if (kind === 'heal' || kind === 'heal_full') return hero.hp > 0 && hero.hp < hero.maxHp;
    if (kind === 'hp_bonus') return hero.hp > 0 && hero.hp < hero.maxHp;
    return hero.hp > 0;
  }
  function usableInventory() { return inventory.some(canUse); }
  function renderInventoryButton() {
    const button = $('inventory-toggle');
    if (!button) return;
    button.disabled = !usableInventory();
    button.classList.toggle('is-unavailable', !usableInventory());
  }
  function closeInventory() {
    inventoryView = 'closed'; chosenSlot = -1;
    if ($('inventory-overlay')) $('inventory-overlay').hidden = true;
    if ($('inventory-detail')) $('inventory-detail').hidden = true;
    if ($('inventory-grid-view')) $('inventory-grid-view').hidden = false;
  }
  function showNoEncounter() {
    closeInventory();
    enemy = null; battle = null; battleKey = null;
    $('battle').hidden = true;
    $('win').hidden = true;
    $('lose').hidden = true;
    $('waiting').hidden = false;
    const picker = document.querySelector('.dev-picker');
    if (picker.parentElement !== $('waiting-picker-container')) $('waiting-picker-container').append(picker);
    $('enemy-select').value = '';
    history.replaceState(null, '', location.pathname);
  }
  function deactivateEncounter() {
    discardPendingReward(read(CURRENT_ENCOUNTER_KEY));
    localStorage.removeItem(CURRENT_ENCOUNTER_KEY);
    showNoEncounter();
  }
  function showGrid() {
    inventoryView = 'grid'; chosenSlot = -1;
    $('inventory-overlay').hidden = false;
    $('inventory-grid-view').hidden = false;
    $('inventory-detail').hidden = true;
    const grid = $('inventory-grid'); grid.replaceChildren();
    for (let i = 0; i < 15; i++) {
      const slot = document.createElement('button'); slot.type = 'button'; slot.className = 'inventory-slot';
      const id = inventory[i];
      slot.setAttribute('aria-label', id ? ITEMS[id][0] : 'Espacio vacío');
      if (id) {
        const img = document.createElement('img'); img.src = itemIcon(id); img.alt = ''; slot.append(img);
        if (!canUse(id)) slot.classList.add('slot-unusable');
        slot.addEventListener('click', () => showDetail(i));
      } else slot.disabled = true;
      grid.append(slot);
    }
  }
  function showDetail(index) {
    const id = inventory[index]; if (!id) return;
    chosenSlot = index; inventoryView = 'detail';
    $('inventory-grid-view').hidden = true; $('inventory-detail').hidden = false;
    const card = $('inventory-card'); card.replaceChildren();
    const image = itemCard(id);
    if (image) { const img = document.createElement('img'); img.src = image; img.alt = `Tarjeta: ${ITEMS[id][0]}`; card.append(img); }
    else { const text = document.createElement('p'); text.textContent = `❤️ ${ITEMS[id][0]} — Revive con HP completo`; card.append(text); }
    $('inventory-apply').disabled = !canUse(id);
    $('inventory-hint').textContent = canUse(id) ? '' : (ITEMS[id][3] === 'special' ? 'Efecto pendiente de definir' : 'No se puede utilizar en este momento');
  }
  function restartWithLife(amount) {
    const encounterId = battle.encounterId;
    hero.hp = Math.min(hero.maxHp, amount);
    battle = freshBattle();
    battle.encounterId = encounterId;
    battle.message = `❤️ ¡Neo ha revivido con ${hero.hp} HP! ${enemy.name} vuelve con toda su vida.`;
    // El efecto de apertura se procesa al recargar este encuentro.
    persist(); loadEnemy(selectedId);
  }
  function applyItem() {
    const id = inventory[chosenSlot]; if (!id || !canUse(id)) return;
    const name = ITEMS[id][0]; const value = ITEMS[id][4]; const kind = ITEMS[id][3];
    if (isRevive(id)) {
      inventory.splice(chosenSlot, 1); closeInventory();
      const reviveHp = kind === 'revive_full'
        ? hero.maxHp
        : kind === 'revive_half' ? Math.floor(hero.maxHp * value) : value;
      restartWithLife(reviveHp);
      return;
    }
    // Solo se consume tras validar el efecto.
    let note = `🎒 Neo utiliza ${name}. `;
    if (kind === 'heal' || kind === 'heal_full') {
      const old = hero.hp; hero.hp = Math.min(hero.maxHp, hero.hp + (kind === 'heal_full' ? hero.maxHp : value));
      note += `Recupera ${hero.hp - old} HP.`;
    } else if (kind === 'hp_bonus') {
      const old = hero.hp; hero.hp = Math.min(hero.maxHp, hero.hp + value); note += `Recupera ${hero.hp - old} HP (sin superar el máximo).`;
    } else if (kind === 'atk_override') {
      battle.itemBuff = { kind, amount: value }; note = '💖 Neo utiliza Maaaake up! ¡Espada mágica equipada! ATK 50 durante este combate';
    } else if (kind === 'atk_battle' || kind === 'atk_first') {
      battle.itemBuff = { kind, amount: value }; note += `+${value} ATK ${kind === 'atk_first' ? 'en el primer ataque' : 'durante este combate'}.`;
    } else if (kind === 'damage_bonus') {
      battle.itemBuff = { kind, amount: value }; note += `+${value} de daño final en cada ataque durante este combate.`;
    } else if (kind === 'roll_bonus') {
      battle.itemBuff = { kind, amount: value }; note += `+${value} al dado en tu próximo lanzamiento.`;
    } else if (kind === 'damage' || kind === 'instant_kill') {
      const damage = kind === 'instant_kill' ? battle.enemyHp : value;
      battle.enemyHp = Math.max(0, battle.enemyHp - damage); note += kind === 'instant_kill' ? '¡El enemigo cae instantáneamente!' : `Inflige ${damage} de daño directo.`;
    } else if (kind === 'escape') {
      battle.status = 'lost'; battle.reason = 'escape'; note += 'Neo escapó del combate.';
    } else return;
    battle.itemUsed = true; battle.heroHp = hero.hp;
    inventory.splice(chosenSlot, 1);
    if (battle.enemyHp === 0) { battle.status = 'won'; note += ' ¡Victoria!'; }
    battle.message = note;
    closeInventory(); persist(); render();
  }
  $('revive-button').addEventListener('click', showGrid);
  $('inventory-toggle').addEventListener('click', () => { if (usableInventory()) showGrid(); });
  $('inventory-close').addEventListener('click', closeInventory);
  $('inventory-detail-close').addEventListener('click', showGrid);
  $('inventory-apply').addEventListener('click', applyItem);
  $('inventory-overlay').addEventListener('click', e => { if (e.target === $('inventory-overlay')) closeInventory(); });
  $('inventory-detail').addEventListener('click', e => { if (e.target === $('inventory-detail')) closeInventory(); });
  $('roll').addEventListener('click', () => {
    expire(); if (battle.status !== 'active') { render(); return; }
    if (heroDefeated()) { markHeroDefeat(); persist(); render(); return; }
    // Veneno: al comenzar los dos turnos siguientes, antes del ataque de Neo.
    let poisonText = '';
    if (enemy.effect?.type === 'poison' && (battle.poisonTurns || 0) > 0) {
      const actualPoison = takeDamage(enemy.effect.amount);
      battle.poisonTurns--;
      poisonText = `☠️ El veneno causa ${actualPoison} HP de daño (${battle.poisonTurns} turnos restantes). `;
      if (heroDefeated()) {
        markHeroDefeat();
        battle.message = `${poisonText}Neo ha caído antes de atacar.`;
        persist(); render(); return;
      }
    }
    // Raíces: se consume el turno atrapado sin tirada de Neo.
    const wasRooted = battle.rooted === true;
    battle.rooted = false;
    // Triangulón: solo el primer turno de Neo queda bloqueado.
    const triangleBlocked = enemy.effect?.type === 'first_turn_block' && battle.round === 0;
    const cannotAttack = wasRooted || triangleBlocked;
    const rollBonus = !cannotAttack && battle.itemBuff?.kind === 'roll_bonus' ? battle.itemBuff.amount : 0;
    const baseNeoRoll = cannotAttack ? null : roll();
    const neoRoll = cannotAttack ? null : Math.min(20, baseNeoRoll + rollBonus);
    if (rollBonus) battle.itemBuff = null;
    const blocked = !cannotAttack && enemy.effect?.type === 'roll_immunity' && neoRoll <= enemy.effect.threshold;
    const confused = !cannotAttack && !blocked && enemy.effect?.type === 'confusion'
      && Math.random() < enemy.effect.chance;
    // Pescado: -5 ATK solo para este encuentro; hero.atk no se modifica.
    const itemBonus = battle.itemBuff && (battle.itemBuff.kind === 'atk_battle' || (battle.itemBuff.kind === 'atk_first' && battle.round === 0)) ? battle.itemBuff.amount : 0;
    const baseAtk = battle.itemBuff?.kind === 'atk_override' ? battle.itemBuff.amount : hero.atk;
    const effectiveAtk = enemy.effect?.type === 'fists_only' ? enemy.effect.atk : Math.max(0, baseAtk + itemBonus - (enemy.effect?.type === 'underwater_atk' ? enemy.effect.amount : 0));
    const baseDamage = cannotAttack || blocked ? 0 : Math.max(1, Math.floor(neoRoll / 2) + Math.floor(effectiveAtk / 5) - enemy.armor);
    // Solo se consumen los debuffs cuando Neo efectivamente intenta atacar.
    const slothPenalty = !cannotAttack && (battle.slothAttacks || 0) > 0 ? (enemy.effect?.type === 'opening_sloth' ? enemy.effect.amount : 0) : 0;
    if (slothPenalty) battle.slothAttacks--;
    const owlPenalty = !cannotAttack && battle.owlPenalty ? (enemy.effect?.type === 'owl_foresight' ? enemy.effect.amount : 0) : 0;
    if (!cannotAttack) battle.owlPenalty = false;
    const confusedDamage = confused ? Math.max(1, Math.floor(baseDamage / 2)) : baseDamage;
    const damageBonus = battle.itemBuff?.kind === 'damage_bonus' ? battle.itemBuff.amount : 0;
    const neoDamage = blocked || cannotAttack ? 0 : Math.max(0, confusedDamage - slothPenalty - owlPenalty) + damageBonus;
    battle.enemyHp = Math.max(0, battle.enemyHp - neoDamage); battle.round++;
    const penalties = [confused ? 'esporas' : '', slothPenalty ? `pereza −${slothPenalty}` : '', owlPenalty ? `anticipación −${owlPenalty}` : ''].filter(Boolean);
    const rollText = rollBonus ? `Neo 🎲${baseNeoRoll} (+${rollBonus} → ${neoRoll})` : `Neo 🎲${neoRoll}`;
    const attackText = wasRooted ? 'Neo está atrapado y pierde su ataque (0 daño)'
      : triangleBlocked ? 'Triangulón bloquea el primer ataque de Neo (0 daño)'
        : `${rollText} → ${blocked ? 'ataque bloqueado (0 daño)' : `${neoDamage} daño${penalties.length ? ` (${penalties.join(', ')})` : ''}`}`;
    // Espinas: se activan cuando Rama-miro recibe daño, incluso si el golpe lo derrota.
    const thornDamage = neoDamage > 0 && enemy.effect?.type === 'thorns' && Math.random() < enemy.effect.chance
      ? Math.max(0, Number(enemy.effect.amount) || 0) : 0;
    if (thornDamage) takeDamage(thornDamage);
    // Nega Neo: reflejo incluso en el golpe final; sin contraataque si muere.
    const reflectDamage = neoDamage > 0 && enemy.effect?.type === 'damage_reflect' && Math.random() < enemy.effect.chance
      ? Math.ceil(neoDamage * enemy.effect.ratio) : 0;
    if (reflectDamage) takeDamage(reflectDamage);
    const reflectText = reflectDamage ? ` 🖤 ¡Reflejo oscuro! Nega Neo devuelve ${reflectDamage} HP de daño.` : '';
    const thornText = thornDamage ? ` ¡Las espinas devuelven ${thornDamage} HP de daño!` : '';
    if (heroDefeated()) {
      markHeroDefeat();
      battle.message = `${poisonText}Ronda ${battle.round}: ${attackText}.${thornText}${reflectText} Neo ha caído.`;
    } else if (battle.enemyHp === 0) {
      battle.status = 'won';
      battle.message = `${poisonText}Ronda ${battle.round}: ${attackText}.${thornText}${reflectText} ¡Victoria!`;
    } else {
      const enemyRoll = roll();
      const monsterDamage = Math.max(1, Math.floor(enemyRoll / 4) + Math.max(1, Math.floor(enemy.atk * 3 / 8)));
      takeDamage(monsterDamage);
      // Diablillos y Mimic: un golpe adicional solo si el contraataque se realiza.
      const bonusDamage = enemy.effect?.type === 'extra_hit' && Math.random() < enemy.effect.chance
        ? Math.max(0, Number(enemy.effect.amount) || 0) : 0;
      if (bonusDamage) takeDamage(bonusDamage);
      // Apóstol: juicio divino es daño extra, no modifica el ATK permanente.
      const judgmentDamage = enemy.effect?.type === 'divine_judgment' && Math.random() < enemy.effect.chance
        ? Math.max(0, Number(enemy.effect.amount) || 0) : 0;
      if (judgmentDamage) takeDamage(judgmentDamage);
      // Mini demonio: no se acumula, solo renueva dos turnos futuros.
      const poisoned = !heroDefeated() && enemy.effect?.type === 'poison' && Math.random() < enemy.effect.chance;
      if (poisoned) battle.poisonTurns = enemy.effect.turns;
      // Fantasma: drena hasta 2 HP reales y se cura la misma cantidad.
      const drain = enemy.effect?.type === 'life_drain'
        ? Math.min(hero.hp, Math.max(0, Number(enemy.effect.amount) || 0)) : 0;
      if (drain) {
        takeDamage(drain);
        battle.enemyHp = Math.min(enemy.hp, battle.enemyHp + drain);
      }
      battle.heroHp = hero.hp;
      const xpTheft = enemy.effect?.type === 'steal_xp'
        ? Math.min(Math.max(0, hero.xp), Math.max(0, Number(enemy.effect.amount) || 0)) : 0;
      if (xpTheft > 0) { hero.xp -= xpTheft; battle.xpStolen = (battle.xpStolen || 0) + xpTheft; }
      // No encadenar raíces durante un turno que Neo ya perdió.
      const newlyRooted = hero.hp > 0 && !wasRooted && enemy.effect?.type === 'root_trap'
        && Math.random() < enemy.effect.chance;
      if (newlyRooted) battle.rooted = true;
      const owlTriggered = hero.hp > 0 && enemy.effect?.type === 'owl_foresight'
        && Math.random() < enemy.effect.chance;
      if (owlTriggered) battle.owlPenalty = true;
      const extraHitText = bonusDamage
        ? enemy.id === 'diablillos'
          ? ' 😈 ¡Ataque coordinado! Los Diablillos infligen 2 HP adicionales.'
          : ` ¡Golpe adicional! ${bonusDamage} HP extra de daño.`
        : '';
      battle.message = `${poisonText}Ronda ${battle.round}: ${attackText}. ${enemy.name} 🎲${enemyRoll} → ${monsterDamage} daño.`
        + thornText
        + extraHitText
        + reflectText
        + (judgmentDamage ? ` ⚡ ¡Juicio divino! El Apóstol inflige ${judgmentDamage} HP adicionales.` : '')
        + (poisoned ? ` ☠️ ¡Envenenado! Perderás ${enemy.effect.amount} HP al inicio de los próximos ${enemy.effect.turns} turnos.` : '')
        + (drain ? ` ¡El Fantasma drena ${drain} HP y recupera ${drain} HP!` : '')
        + (enemy.effect?.type === 'steal_xp' ? ` Roba ${xpTheft} XP (XP actual: ${hero.xp}).` : '')
        + (newlyRooted ? ' ¡Petunia te atrapa con sus raíces! Perderás tu próximo ataque.' : '')
        + (owlTriggered ? ` ¡El Búho anticipa tu próximo ataque! Harás ${enemy.effect.amount} puntos menos de daño.` : '');
      if (heroDefeated()) { markHeroDefeat(); battle.message += isLapida() && hero.hp > 0 ? ' ¡Se agotó tu HP disponible! La mitad protegida permanece intacta.' : ' Neo ha caído.'; }
    }
    persist(); render();
  });
  $('claim').addEventListener('click', () => {
    if (!battle || !enemy) { showNoEncounter(); return; }
    const pointer = read(CURRENT_ENCOUNTER_KEY);
    if (pointer?.enemyId !== enemy.id || pointer?.encounterId !== battle.encounterId) {
      if (CATALOG.some(e => e.id === pointer?.enemyId)) loadEnemy(pointer.enemyId);
      else render();
      return;
    }
    if (battle.rewardDiscarded) { render(); return; }
    const latestBattle = read(battleKey);
    if (!latestBattle || latestBattle.encounterId !== battle.encounterId || latestBattle.claimed || latestBattle.rewardDiscarded) {
      loadEnemy(pointer.enemyId);
      return;
    }
    expire(); if (battle.status !== 'won' || battle.claimed) { render(); return; }
    const reward = enemy.reward;
    if (!reward || reward.type === 'xp') { hero.xp += enemy.xp || 0; battle.rewardMessage = `XP total: ${hero.xp}`; }
    else {
      inventory = normalizeInventory(read(INVENTORY_KEY));
      if (inventory.length >= 15 && rewardNeedsInventorySpace()) { render(); return; }
      const id = rewardItemId(reward);
      if (!id) { alert('Esta recompensa especial todavía no está implementada.'); return; }
      const updatedInventory = [...inventory, id];
      try {
        save(INVENTORY_KEY, updatedInventory);
      } catch (error) {
        console.error('No se pudo guardar la recompensa en el inventario local.', error);
        battle.rewardMessage = 'No se pudo guardar la recompensa. Inténtalo de nuevo.';
        render();
        return;
      }
      inventory = updatedInventory;
      battle.rewardMessage = `🎒 Obtuviste: ${ITEMS[id][0]}`;
    }
    battle.claimed = true; persist(); render();
  });
  $('reset').addEventListener('click', () => { if (!confirm(`¿Reiniciar este encuentro de prueba? Restaurará HP a ${hero.maxHp} y no restará XP ya reclamado.`)) return; hero.hp = hero.maxHp; loadEnemy(selectedId, true) });
  $('enemy-select').addEventListener('change', e => {
    if (e.target.value === '') deactivateEncounter();
    else loadEnemy(e.target.value, true);
  });
  window.addEventListener('storage', event => {
    if (event.key === INVENTORY_KEY) {
      inventory = normalizeInventory(read(INVENTORY_KEY));
      if (inventoryView !== 'closed') showGrid();
      render();
    }
    if (event.key === CURRENT_ENCOUNTER_KEY) {
      const pointer = read(CURRENT_ENCOUNTER_KEY);
      let previousPointer = null;
      if (event.oldValue) {
        try { previousPointer = JSON.parse(event.oldValue); }
        catch (error) { console.error('No se pudo interpretar el encuentro anterior.', error); }
      }
      if (CATALOG.some(e => e.id === pointer?.enemyId) && pointer.encounterId) {
        if (previousPointer && (previousPointer.enemyId !== pointer.enemyId
          || previousPointer.encounterId !== pointer.encounterId)) discardPendingReward(previousPointer);
        if (!battle || pointer.enemyId !== enemy?.id || pointer.encounterId !== battle.encounterId) {
          loadEnemy(pointer.enemyId);
        }
      } else {
        const previousBattle = previousPointer?.enemyId
          ? read(BATTLE_PREFIX + previousPointer.enemyId) : null;
        if (previousBattle?.encounterId === previousPointer?.encounterId
          && previousBattle.status === 'won' && !previousBattle.claimed && !previousBattle.rewardDiscarded) {
          save(CURRENT_ENCOUNTER_KEY, previousPointer);
          loadEnemy(previousPointer.enemyId);
        } else {
          showNoEncounter();
        }
      }
    }
  });
  const encounterPlaceholder = document.createElement('option');
  encounterPlaceholder.value = '';
  encounterPlaceholder.textContent = 'Sin encuentro';
  $('enemy-select').append(encounterPlaceholder);
  for (const e of CATALOG) { const opt = document.createElement('option'); opt.value = e.id; opt.textContent = `Nivel ${e.level} · ${e.name}`; $('enemy-select').append(opt) }
  window.MusculesDemo = {
    inventory: () => [...inventory],
    grantItem: id => {
      if (!ITEMS[id] || inventory.length >= 15) return false;
      inventory.push(id);
      save(INVENTORY_KEY, inventory);
      if (battle) persist();
      render();
      return true;
    },
    state: () => structuredClone({ hero, battle, enemy, inventory }),
    reset: () => { if (battle) $('reset').click(); },
    expire: () => { if (battle) { battle.expiresAt = Date.now() - 1; persist(); render(); } },
    win: () => { if (!battle || battle.status !== 'active') return; battle.enemyHp = 0; battle.status = 'won'; battle.message = 'Victoria forzada para probar la pantalla'; persist(); render(); },
    select: id => loadEnemy(id, true)
  };
  if (CATALOG.some(e => e.id === currentEncounter?.enemyId) && currentEncounter.encounterId) {
    loadEnemy(currentEncounter.enemyId);
  } else {
    showNoEncounter();
  }
  setInterval(render, 1000);
})();
