(() => {
  'use strict';

  const KEY = 'muscules_neo_stats_v01';
  const LOCK_NAME = 'muscules_neo_stats_write_v01';
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

  function read() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
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
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch (error) {
      throw new Error('No se pudieron guardar las estadísticas locales de Neo.', { cause: error });
    }
  }

  function withLock(callback) {
    if (!navigator.locks?.request) {
      return Promise.reject(new Error('Este navegador no permite Web Locks; no se guardaron los cambios.'));
    }
    return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, () => callback({ read, write }));
  }

  window.MusculesNeoStats = Object.freeze({
    key: KEY,
    lockName: LOCK_NAME,
    defaults: Object.freeze({ ...DEFAULTS }),
    supportsLock: () => Boolean(navigator.locks?.request),
    read,
    withLock
  });
})();
