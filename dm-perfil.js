(() => {
  'use strict';

  function initialize() {
  const { key: statsKey, read, supportsLock, withLock } = window.MusculesNeoStats;
  const XP_PER_LEVEL = 1000;
  const $ = id => document.getElementById(id);
  const editButton = document.querySelector('.dm-profile-edit');
  const saveButton = $('dm-profile-save');
  const status = $('dm-profile-status');
  const fields = {
    hp: $('dm-hp'),
    maxHp: $('dm-max-hp'),
    atk: $('dm-atk'),
    xp: $('dm-xp'),
    weapon: $('dm-weapon'),
    sign: $('dm-sign'),
    levelName: $('dm-level-name')
  };
  let currentStats;
  let editSnapshot;
  let editing = false;

  const missingControls = [
    !editButton && 'lápiz',
    !saveButton && 'Guardar',
    !status && 'estado',
    ...Object.entries(fields).filter(([, field]) => !field).map(([name]) => name)
  ].filter(Boolean);
  if (missingControls.length) {
    throw new Error(`Faltan controles del perfil de Neo: ${missingControls.join(', ')}.`);
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function render(stats) {
    currentStats = stats;
    const hpMax = Math.max(0, stats.maxHp);
    const hp = Math.max(0, stats.hp);
    const xp = Math.max(0, stats.xp);
    const xpProgress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
    document.querySelector('.dm-meter-fill--hp').style.width = `${hpMax > 0 ? Math.min(1, hp / hpMax) * 100 : 0}%`;
    document.querySelector('.dm-meter-fill--xp').style.width = `${xpProgress * 100}%`;
    $('dm-hp-value').textContent = `${stats.hp}/${stats.maxHp}`;
    $('dm-xp-value').textContent = `${new Intl.NumberFormat('es-MX').format(xp)}/${new Intl.NumberFormat('es-MX').format((Math.floor(xp / XP_PER_LEVEL) + 1) * XP_PER_LEVEL)}`;
    $('dm-atk-value').textContent = String(stats.atk);
    $('dm-weapon-value').textContent = stats.weapon;
    $('dm-sign-value').textContent = stats.sign;
    $('dm-level-name-value').textContent = stats.levelName;
  }

  function setEditing(value) {
    editing = value;
    document.querySelectorAll('.dm-profile-edit-inputs, .dm-profile-edit-input').forEach(element => {
      element.hidden = !editing;
    });
    document.querySelectorAll('.dm-profile-meter, .dm-profile-atk > span:last-of-type, .dm-profile-field span[id]')
      .forEach(element => { element.hidden = editing; });
    document.querySelectorAll('.dm-profile-field input').forEach(element => { element.hidden = !editing; });
    for (const field of Object.values(fields)) field.disabled = !editing;
    editButton.setAttribute('aria-label', editing ? 'Cancelar edición' : 'Editar perfil de Neo');
    editButton.title = editing ? 'Cancelar edición' : 'Editar perfil';
    saveButton.disabled = true;
    saveButton.classList.remove('is-dirty');

    if (editing) {
      editSnapshot = { ...currentStats };
      for (const [name, field] of Object.entries(fields)) field.value = String(currentStats[name]);
      showStatus('Edita los datos y guarda los cambios.');
    }
  }

  function hasChanges() {
    return Object.entries(fields).some(([name, field]) => {
      const current = name in { hp: 1, maxHp: 1, atk: 1, xp: 1 }
        ? Number(field.value)
        : field.value.trim();
      return current !== editSnapshot[name];
    });
  }

  function updateSaveState() {
    const changed = hasChanges();
    saveButton.disabled = !changed;
    saveButton.classList.toggle('is-dirty', changed);
  }

  function readDraft() {
    const draft = {};
    for (const name of ['hp', 'maxHp', 'atk', 'xp']) {
      const raw = fields[name].value.trim();
      const value = Number(raw);
      if (!raw || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${name === 'maxHp' ? 'El HP máximo' : name.toUpperCase()} debe ser un entero no negativo.`);
      }
      draft[name] = value;
    }
    if (draft.maxHp < 1) throw new Error('El HP máximo debe ser al menos 1.');
    if (draft.hp > draft.maxHp) throw new Error('El HP actual no puede superar el HP máximo.');
    for (const name of ['weapon', 'sign', 'levelName']) {
      const value = fields[name].value.trim();
      if (!value) throw new Error('Arma, signo y nombre de nivel no pueden quedar vacíos.');
      draft[name] = value;
    }
    return draft;
  }

  function syncActiveBattle(stats) {
    let pointer;
    try {
      pointer = JSON.parse(localStorage.getItem('muscules_dynamic_current_encounter_v01'));
    } catch (error) {
      throw new Error('No se pudo interpretar el encuentro activo; las estadísticas no se guardaron.', { cause: error });
    }
    if (!pointer?.enemyId || !pointer.encounterId) return null;

    const battleKey = `muscules_dynamic_battle_v02_${pointer.enemyId}`;
    let rawBattle;
    try {
      rawBattle = localStorage.getItem(battleKey);
    } catch (error) {
      throw new Error('No se pudo leer el encuentro activo; las estadísticas no se guardaron.', { cause: error });
    }
    if (rawBattle === null) return null;

    let battle;
    try {
      battle = JSON.parse(rawBattle);
    } catch (error) {
      throw new Error('El estado del encuentro activo es inválido; las estadísticas no se guardaron.', { cause: error });
    }
    if (battle?.encounterId !== pointer.encounterId || battle.status !== 'active') return null;

    const updatedBattle = { ...battle, heroHp: stats.hp };
    try {
      localStorage.setItem(battleKey, JSON.stringify(updatedBattle));
    } catch (error) {
      throw new Error('No se pudo sincronizar el HP con el combate activo; las estadísticas no se guardaron.', { cause: error });
    }
    return { battleKey, rawBattle };
  }

  async function saveChanges() {
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    for (const field of Object.values(fields)) field.disabled = true;
    showStatus('Guardando…');
    try {
      const draft = readDraft();
      await withLock(({ read: readLatest, write }) => {
        const latest = readLatest();
        const next = { ...latest };
        for (const [name, field] of Object.entries(fields)) {
          const value = draft[name];
          if (value !== editSnapshot[name]) next[name] = value;
        }

        if (next.hp > next.maxHp) {
          throw new Error('El HP actual no puede superar el HP máximo más reciente.');
        }
        for (const name of ['hp', 'maxHp', 'atk', 'xp']) {
          if (!Number.isSafeInteger(next[name]) || next[name] < 0 || (name === 'maxHp' && next[name] < 1)) {
            throw new Error(`El valor más reciente de ${name} no permite guardar los cambios.`);
          }
        }
        const battleSnapshot = syncActiveBattle(next);
        try {
          write(next);
        } catch (error) {
          if (battleSnapshot) {
            try { localStorage.setItem(battleSnapshot.battleKey, battleSnapshot.rawBattle); }
            catch (rollbackError) { console.error('No se pudo revertir la sincronización del combate.', rollbackError); }
          }
          throw error;
        }
        render(next);
      });
      setEditing(false);
      showStatus('Cambios guardados correctamente.');
    } catch (error) {
      console.error('No se pudo guardar el perfil de Neo.', error);
      saveButton.disabled = false;
      if (editing) for (const field of Object.values(fields)) field.disabled = false;
      showStatus(error.message || 'No se pudieron guardar los cambios.', true);
    }
  }

  editButton.addEventListener('click', () => {
    if (editing) {
      setEditing(false);
      showStatus('Edición cancelada.');
      return;
    }
    setEditing(true);
  });
  for (const field of Object.values(fields)) field.addEventListener('input', updateSaveState);
  saveButton.addEventListener('click', saveChanges);

  window.addEventListener('storage', event => {
    if (event.key !== statsKey && event.key !== null) return;
    try {
      const latest = read();
      if (editing) {
        showStatus('Neo recibió cambios desde otra pestaña; tus cambios locales siguen pendientes.');
      } else {
        render(latest);
        showStatus('Perfil actualizado desde otra pestaña.');
      }
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  try {
    render(read());
    setEditing(false);
    if (!supportsLock()) {
      editButton.disabled = true;
      showStatus('Web Locks no está disponible en este navegador; no se pueden editar estadísticas.', true);
    }
  } catch (error) {
    editButton.disabled = true;
    saveButton.disabled = true;
    showStatus(error.message, true);
  }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
