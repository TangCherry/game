(() => {
  'use strict';

  const INVENTORY_KEY = 'muscules_neo_inventory_v01';
  const NOTIFICATIONS_KEY = 'muscules_neo_gift_notifications_v01';
  const itemSelect = document.getElementById('dm-item');
  const itemAbility = document.getElementById('dm-item-ability');
  const messageInput = document.getElementById('dm-message');
  const saveButton = document.getElementById('dm-inventory-save');
  const status = document.getElementById('dm-inventory-status');
  const itemById = new Map(ITEM_CATALOG.map(item => [item.id, item]));
  let inventoryCount = 0;
  let saving = false;
  let writeBlockedReason = window.MusculesNeoStats?.supportsLock()
    ? ''
    : 'Web Locks no está disponible; no se pueden entregar objetos de forma segura.';
  let writeBlocked = Boolean(writeBlockedReason);

  if (!itemSelect || !itemAbility || !messageInput || !saveButton || !status) {
    throw new Error('No se encontraron los controles del inventario DM.');
  }
  if (!window.MusculesNeoStats) {
    throw new Error('No se pudo cargar el bloqueo compartido para el inventario.');
  }

  function readRaw(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      throw new Error('No se pudo leer el almacenamiento local de Neo.', { cause: error });
    }
  }

  function parseArray(raw, key) {
    if (raw === null) return [];
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Los datos guardados en ${key} no tienen JSON válido.`, { cause: error });
    }
    if (!Array.isArray(value)) throw new Error(`Los datos guardados en ${key} tienen un formato inválido.`);
    return value;
  }

  function readInventory(raw = readRaw(INVENTORY_KEY)) {
    const inventory = parseArray(raw, INVENTORY_KEY);
    if (inventory.length > 15 || inventory.some(id => !itemById.has(id))) {
      throw new Error('El inventario guardado contiene datos inválidos; no se modificó.');
    }
    return inventory;
  }

  function readNotifications(raw = readRaw(NOTIFICATIONS_KEY)) {
    const notifications = parseArray(raw, NOTIFICATIONS_KEY);
    const ids = new Set();
    for (const notification of notifications) {
      if (!notification || typeof notification.id !== 'string' || ids.has(notification.id)
        || !itemById.has(notification.itemId) || typeof notification.message !== 'string'
        || notification.message.length > 100 || typeof notification.seen !== 'boolean') {
        throw new Error('La cola de regalos guardada es inválida; no se modificó.');
      }
      ids.add(notification.id);
    }
    return notifications;
  }

  function restoreRaw(key, raw) {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  }

  function updateSaveState() {
    const ready = Boolean(itemById.has(itemSelect.value)) && inventoryCount < 15 && !saving && !writeBlocked;
    saveButton.disabled = !ready;
    saveButton.classList.toggle('is-dirty', ready);
    saveButton.textContent = inventoryCount >= 15 ? 'Inventario lleno' : saving ? 'Entregando…' : 'Guardar';
  }

  function updateInventoryCount() {
    try {
      inventoryCount = readInventory().length;
      status.textContent = `Espacios ocupados: ${inventoryCount}/15`;
      status.classList.remove('is-error');
      if (writeBlocked) {
        status.textContent = writeBlockedReason;
        status.classList.add('is-error');
        saveButton.disabled = true;
        return;
      }
      updateSaveState();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
      saveButton.disabled = true;
    }
  }

  for (const item of ITEM_CATALOG) {
    if (typeof item.ability !== 'string' || !item.ability) {
      throw new Error(`Falta la habilidad del objeto "${item.name}".`);
    }
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    itemSelect.append(option);
  }

  itemSelect.addEventListener('change', () => {
    const selectedItem = itemById.get(itemSelect.value);
    itemAbility.textContent = selectedItem?.ability ?? 'Selecciona un objeto para ver su habilidad.';
    updateSaveState();
  });
  messageInput.addEventListener('input', updateSaveState);

  saveButton.addEventListener('click', async () => {
    if (saving || saveButton.disabled) return;
    const item = itemById.get(itemSelect.value);
    if (!item || messageInput.value.length > 100) return;
    saving = true;
    status.classList.remove('is-error');
    status.textContent = 'Entregando objeto…';
    updateSaveState();
    try {
      if (!window.MusculesNeoStats.supportsLock()) {
        throw new Error('Web Locks no está disponible; no se entregó el objeto.');
      }
      await window.MusculesNeoStats.withLock(() => {
        const inventoryRaw = readRaw(INVENTORY_KEY);
        const notificationsRaw = readRaw(NOTIFICATIONS_KEY);
        const inventory = readInventory(inventoryRaw);
        const notifications = readNotifications(notificationsRaw);
        if (inventory.length >= 15) throw new Error('El inventario está lleno; no se entregó el objeto.');

        const nextInventory = [...inventory, item.id];
        const nextNotifications = [...notifications, {
          id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          itemId: item.id,
          message: messageInput.value,
          seen: false
        }];
        try {
          localStorage.setItem(INVENTORY_KEY, JSON.stringify(nextInventory));
          localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(nextNotifications));
        } catch (error) {
          let rollbackError;
          for (const [key, raw] of [[INVENTORY_KEY, inventoryRaw], [NOTIFICATIONS_KEY, notificationsRaw]]) {
            try {
              restoreRaw(key, raw);
            } catch (failure) {
              rollbackError ??= failure;
            }
          }
          if (rollbackError) {
            console.error('Falló la reversión de una entrega de regalo.', rollbackError);
            writeBlockedReason = 'No se confirmó la reversión de una entrega; revisa el almacenamiento antes de intentar más cambios.';
            writeBlocked = true;
            throw new Error(writeBlockedReason, { cause: error });
          }
          throw new Error('No se pudo guardar el regalo; los datos anteriores fueron restaurados.', { cause: error });
        }
      });

      itemSelect.value = '';
      messageInput.value = '';
      itemAbility.textContent = 'Selecciona un objeto para ver su habilidad.';
      status.textContent = `${item.name} entregado a Neo.`;
      inventoryCount = readInventory().length;
    } catch (error) {
      console.error('No se pudo entregar el regalo.', error);
      status.textContent = error.message || 'No se pudo entregar el objeto.';
      status.classList.add('is-error');
      try {
        inventoryCount = readInventory().length;
      } catch (readError) {
        writeBlocked = true;
        status.textContent = `${status.textContent} ${readError.message}`;
      }
    } finally {
      saving = false;
      updateSaveState();
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === INVENTORY_KEY || event.key === null) updateInventoryCount();
  });
  updateInventoryCount();
  if (writeBlocked) {
    status.textContent = writeBlockedReason;
  }
})();
