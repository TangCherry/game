(() => {
  'use strict';

  const KEY = 'muscules_neo_stats_v01';
  const LOCK_NAMES = {
    production: 'muscules_neo_stats_write_v01',
    qa: 'muscules_neo_stats_write_qa_v01'
  };
  const requestedMode = document.body?.dataset.musculesStorage || 'production';
  const mode = Object.prototype.hasOwnProperty.call(LOCK_NAMES, requestedMode) ? requestedMode : null;
  const storageType = mode === 'qa' ? 'sessionStorage' : mode === 'production' ? 'localStorage' : null;
  let storage = null;
  if (storageType) {
    try {
      storage = window[storageType];
    } catch (error) {
      console.error(`No se pudo acceder a ${storageType}.`, error);
    }
  }
  const lockName = mode ? LOCK_NAMES[mode] : null;
  const DEFAULTS = {
    hp: 28,
    maxHp: 28,
    atk: 35,
    xp: 9400,
    weapon: 'Gancho',
    sign: 'Sagitario',
    levelName: 'Neogon'
  };
  const REQUIRED_NUMBERS = ['hp', 'maxHp', 'atk', 'xp'];

  function requireStorage() {
    if (!storage) {
      throw new Error(mode
        ? `No se pudo acceder a ${storageType}; no se leyeron ni guardaron datos.`
        : 'La configuración de almacenamiento de Muscules no es válida; no se leyeron ni guardaron datos.');
    }
    return storage;
  }

  function read() {
    let raw;
    try {
      raw = requireStorage().getItem(KEY);
    } catch (error) {
      throw new Error('No se pudieron leer las estadísticas locales de Neo.', { cause: error });
    }
    if (raw === null) return { ...DEFAULTS };

    let stored;
    try {
      stored = JSON.parse(raw);
    } catch (error) {
      throw new Error('Las estadísticas guardadas de Neo tienen JSON inválido.', { cause: error });
    }
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      throw new Error('Las estadísticas guardadas de Neo tienen un formato inválido.');
    }

    const stats = { ...DEFAULTS, ...stored };
    for (const key of REQUIRED_NUMBERS) {
      if (!Number.isFinite(stats[key])) {
        throw new Error(`El valor guardado de ${key} no es un número válido.`);
      }
    }
    for (const key of ['weapon', 'sign', 'levelName']) {
      if (typeof stats[key] !== 'string') {
        throw new Error(`El valor guardado de ${key} no es texto válido.`);
      }
    }
    return stats;
  }

  function write(stats) {
    try {
      requireStorage().setItem(KEY, JSON.stringify(stats));
    } catch (error) {
      throw new Error('No se pudieron guardar las estadísticas locales de Neo.', { cause: error });
    }
  }

  function withLock(callback) {
    if (!mode || !storage) {
      return Promise.reject(new Error('La configuración de almacenamiento no es válida; no se guardaron los cambios.'));
    }
    if (!navigator.locks?.request) {
      return Promise.reject(new Error('Este navegador no permite Web Locks; no se guardaron los cambios.'));
    }
    return navigator.locks.request(lockName, { mode: 'exclusive' }, () => callback({ read, write }));
  }

  window.MusculesNeoStats = Object.freeze({
    key: KEY,
    mode,
    storageType,
    storage,
    lockName,
    defaults: Object.freeze({ ...DEFAULTS }),
    supportsLock: () => Boolean(mode && storage && navigator.locks?.request),
    read,
    withLock
  });
})();
