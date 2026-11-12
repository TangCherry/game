(() => {
  'use strict';

  const CURRENT_ENCOUNTER_KEY = 'muscules_dynamic_current_encounter_v01';
  const BATTLE_PREFIX = 'muscules_dynamic_battle_v02_';
  const DURATION = 24 * 60 * 60 * 1000;
  const enemySelect = document.getElementById('dm-enemy');
  const enemyHp = document.getElementById('dm-enemy-hp');
  const enemyAtk = document.getElementById('dm-enemy-atk');
  const enemyAbility = document.getElementById('dm-enemy-ability');
  const messageInput = document.getElementById('dm-message');
  const saveButton = document.getElementById('dm-encounter-save');
  const status = document.getElementById('dm-encounter-status');
  const encounterUrl = document.getElementById('dm-encounter-url');
  const copyButton = document.getElementById('dm-encounter-copy');
  const enemies = window.MUSCULES_ENEMIES;
  let busy = false;

  if (!enemySelect || !enemyHp || !enemyAtk || !enemyAbility || !messageInput
    || !saveButton || !status || !encounterUrl || !copyButton) {
    throw new Error('No se encontraron los controles de administración de encuentros.');
  }
  if (!Array.isArray(enemies)) throw new Error('No se pudo cargar el catálogo de enemigos.');
  if (!window.MusculesNeoStats) throw new Error('No se pudo cargar el bloqueo compartido.');

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function readRaw(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      throw new Error('No se pudo leer el almacenamiento local de encuentros.', { cause: error });
    }
  }

  function parseObject(raw, key) {
    if (raw === null) return null;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Los datos guardados en ${key} tienen JSON inválido.`, { cause: error });
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Los datos guardados en ${key} tienen un formato inválido.`);
    }
    return value;
  }

  function readPointer(raw = readRaw(CURRENT_ENCOUNTER_KEY)) {
    const pointer = parseObject(raw, CURRENT_ENCOUNTER_KEY);
    if (pointer && (typeof pointer.enemyId !== 'string' || typeof pointer.encounterId !== 'string')) {
      throw new Error('El encuentro actual tiene datos inválidos; no se modificó.');
    }
    return pointer;
  }

  function makeLink(encounterId) {
    const url = new URL('combate.html', window.location.href);
    url.search = '';
    url.searchParams.set('encounter', encounterId);
    return url.href;
  }

  function setLink(pointer) {
    encounterUrl.value = pointer?.encounterId ? makeLink(pointer.encounterId) : '';
    copyButton.disabled = !pointer?.encounterId;
  }

  function renderCurrentEncounter() {
    try {
      const pointer = readPointer();
      if (!pointer) {
        setLink(null);
        showStatus('No hay un encuentro activo. Selecciona un enemigo para activarlo.');
        return;
      }
      const enemy = enemies.find(candidate => candidate.id === pointer.enemyId);
      setLink(pointer);
      if (!enemy) {
        showStatus('El encuentro actual apunta a un enemigo que ya no existe en el catálogo.', true);
        return;
      }
      const remaining = Math.max(0, (pointer.expiresAt || 0) - Date.now());
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor(remaining % 3600000 / 60000);
      showStatus(`Encuentro actual: ${enemy.name} · ${hours} h ${String(minutes).padStart(2, '0')} min restantes. Al reemplazarlo, se pierde su progreso y cualquier recompensa sin reclamar; se conservan HP, XP y objetos ya obtenidos.`);
    } catch (error) {
      setLink(null);
      showStatus(error.message, true);
    }
  }

  function updateSaveState() {
    const selected = enemies.find(enemy => enemy.id === enemySelect.value);
    saveButton.disabled = busy || !selected || selected.hp == null || selected.atk == null
      || messageInput.value.length > 100 || !window.MusculesNeoStats.supportsLock();
    saveButton.textContent = busy ? 'Activando…' : 'Activar / reemplazar encuentro';
  }

  function renderSelectedEnemy() {
    const enemy = enemies.find(candidate => candidate.id === enemySelect.value);
    if (!enemy) {
      enemyHp.textContent = '—';
      enemyAtk.textContent = '—';
      enemyAbility.textContent = 'Selecciona un enemigo para ver sus datos.';
      updateSaveState();
      return;
    }
    enemyHp.textContent = enemy.hp ?? 'No definido';
    enemyAtk.textContent = enemy.atk ?? 'No definido';
    enemyAbility.textContent = enemy.ability || 'Sin habilidad descrita.';
    updateSaveState();
  }

  function restoreRaw(key, raw) {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  }

  async function activateEncounter() {
    if (busy || saveButton.disabled) return;
    const enemy = enemies.find(candidate => candidate.id === enemySelect.value);
    if (!enemy || enemy.hp == null || enemy.atk == null) return;

    busy = true;
    showStatus('Activando encuentro…');
    updateSaveState();
    try {
      const statsStore = window.MusculesNeoStats;
      if (!statsStore.supportsLock()) throw new Error('Web Locks no está disponible; no se activó el encuentro.');
      await statsStore.withLock(() => {
        const pointerRaw = readRaw(CURRENT_ENCOUNTER_KEY);
        const previousPointer = readPointer(pointerRaw);
        let previousBattleRaw = null;
        let previousBattle = null;
        if (previousPointer?.enemyId && previousPointer.encounterId) {
          const previousBattleKey = BATTLE_PREFIX + previousPointer.enemyId;
          previousBattleRaw = readRaw(previousBattleKey);
          previousBattle = parseObject(previousBattleRaw, previousBattleKey);
          if (previousBattle && previousBattle.encounterId !== previousPointer.encounterId) {
            previousBattle = null;
          }
        }

        const now = Date.now();
        const nextPointer = {
          enemyId: enemy.id,
          encounterId: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2)}`,
          startedAt: now,
          expiresAt: now + DURATION,
          dmMessage: messageInput.value.trim()
        };
        const previousBattleKey = previousPointer?.enemyId
          ? BATTLE_PREFIX + previousPointer.enemyId
          : null;
        const discardPendingReward = previousBattle?.status === 'won'
          && !previousBattle.claimed && !previousBattle.rewardDiscarded;

        try {
          if (discardPendingReward) {
            previousBattle.rewardDiscarded = true;
            previousBattle.rewardMessage = 'Encuentro reemplazado; la recompensa pendiente se perdió.';
            localStorage.setItem(previousBattleKey, JSON.stringify(previousBattle));
          }
          localStorage.setItem(CURRENT_ENCOUNTER_KEY, JSON.stringify(nextPointer));
        } catch (error) {
          try {
            restoreRaw(CURRENT_ENCOUNTER_KEY, pointerRaw);
            if (discardPendingReward) restoreRaw(previousBattleKey, previousBattleRaw);
          } catch (rollbackError) {
            console.error('No se pudo revertir la activación del encuentro.', rollbackError);
            throw new Error('Falló la activación y no se confirmó la reversión. Revisa el encuentro antes de reintentar.', { cause: error });
          }
          throw new Error('No se pudo activar el encuentro; el estado anterior fue restaurado.', { cause: error });
        }
      });

      setLink(readPointer());
      showStatus(`${enemy.name} activado por 24 horas. El enlace ya está disponible.`);
    } catch (error) {
      console.error('No se pudo activar el encuentro de Neo.', error);
      showStatus(error.message || 'No se pudo activar el encuentro.', true);
    } finally {
      busy = false;
      updateSaveState();
      renderCurrentEncounter();
    }
  }

  for (const enemy of enemies) {
    const option = document.createElement('option');
    option.value = enemy.id;
    option.textContent = enemy.name;
    option.disabled = enemy.hp == null || enemy.atk == null;
    enemySelect.append(option);
  }

  enemySelect.addEventListener('change', renderSelectedEnemy);
  messageInput.addEventListener('input', updateSaveState);
  saveButton.addEventListener('click', activateEncounter);
  copyButton.addEventListener('click', async () => {
    if (!encounterUrl.value) return;
    try {
      await navigator.clipboard.writeText(encounterUrl.value);
      showStatus('Enlace copiado.');
    } catch (error) {
      console.error('No se pudo copiar el enlace del encuentro.', error);
      encounterUrl.focus();
      encounterUrl.select();
      showStatus('No se pudo copiar automáticamente. Selecciona y copia el enlace del campo.', true);
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === CURRENT_ENCOUNTER_KEY || event.key === null) renderCurrentEncounter();
  });

  if (!window.MusculesNeoStats.supportsLock()) {
    showStatus('Web Locks no está disponible; no se puede activar encuentros de forma segura.', true);
  } else {
    renderCurrentEncounter();
  }
  renderSelectedEnemy();
})();
