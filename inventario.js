const INVENTORY_KEY = 'muscules_neo_inventory_v01';
const GIFT_NOTIFICATIONS_KEY = 'muscules_neo_gift_notifications_v01';
const ITEM_BY_ID = new Map(ITEM_CATALOG.map(item => [item.id, item]));
const assetUrl = path => path.split('/').map(encodeURIComponent).join('/');
const grid = document.getElementById('inventory-grid');
const dialog = document.getElementById('item-dialog');
const closeButton = dialog.querySelector('.close');
const itemTitle = document.getElementById('item-title');
const itemCard = document.getElementById('item-card');
const deleteButton = document.getElementById('item-delete');
const dialogInner = dialog.querySelector('.dialog-inner');
const deleteConfirm = document.getElementById('delete-confirm-overlay');
const confirmDeleteButton = document.getElementById('delete-confirm-yes');
const cancelDeleteButton = document.getElementById('delete-confirm-no');
const confirmError = document.getElementById('delete-confirm-error');
const giftOverlay = document.getElementById('gift-overlay');
const giftImage = document.getElementById('gift-image');
const giftItemName = document.getElementById('gift-item-name');
const giftMessage = document.getElementById('gift-message');
const giftError = document.getElementById('gift-error');
const giftAcceptButton = document.getElementById('gift-accept');
const giftStatus = document.getElementById('gift-status');
let selectedItemId = null;
let deleteInProgress = false;
let giftInProgress = false;
let shownGiftId = null;

function readInventory() {
  let stored;
  try {
    stored = localStorage.getItem(INVENTORY_KEY);
  } catch (error) {
    console.error('No se pudo leer el inventario local.', error);
    return [];
  }
  if (stored === null) return [];

  try {
    const inventory = JSON.parse(stored);
    if (!Array.isArray(inventory)) {
      console.error('El inventario local no tiene el formato esperado.');
      return [];
    }
    return inventory.filter(id => ITEM_BY_ID.has(id)).slice(0, 15);
  } catch (error) {
    console.error('No se pudo interpretar el inventario local.', error);
    return [];
  }
}

function updateDeleteButton(inventory) {
  if (!selectedItemId) return;
  deleteButton.disabled = !inventory.includes(selectedItemId);
}

function renderInventory(inventory) {
  grid.replaceChildren();

  for (let i = 0; i < 15; i++) {
    const id = inventory[i];
    const item = ITEM_BY_ID.get(id);
    const slot = document.createElement('button');
    slot.className = 'slot';
    slot.type = 'button';

    if (item) {
      const img = document.createElement('img');
      img.src = assetUrl(item.icon);
      img.alt = '';
      slot.append(img);
      slot.setAttribute('aria-label', `${item.name}, espacio ${i + 1}`);
      slot.addEventListener('click', () => {
        selectedItemId = item.id;
        itemTitle.textContent = item.name;
        itemCard.src = assetUrl(item.card);
        itemCard.alt = `Tarjeta de ${item.name} con su habilidad`;
        updateDeleteButton(inventory);
        dialog.showModal();
      });
    } else {
      slot.disabled = true;
      slot.setAttribute('aria-label', 'Espacio vacío');
    }
    grid.append(slot);
  }
}

function readGiftNotifications() {
  let stored;
  try {
    stored = localStorage.getItem(GIFT_NOTIFICATIONS_KEY);
  } catch (error) {
    throw new Error('No se pudieron leer las notificaciones de regalos.', { cause: error });
  }
  if (stored === null) return [];

  let notifications;
  try {
    notifications = JSON.parse(stored);
  } catch (error) {
    throw new Error('Las notificaciones de regalos tienen JSON inválido.', { cause: error });
  }
  if (!Array.isArray(notifications)) throw new Error('Las notificaciones de regalos tienen un formato inválido.');
  const ids = new Set();
  for (const notification of notifications) {
    if (!notification || typeof notification.id !== 'string' || ids.has(notification.id)
      || !ITEM_BY_ID.has(notification.itemId) || typeof notification.message !== 'string'
      || notification.message.length > 100 || typeof notification.seen !== 'boolean') {
      throw new Error('Una notificación de regalo tiene datos inválidos.');
    }
    ids.add(notification.id);
  }
  return notifications;
}

function showGiftError(message) {
  giftError.textContent = message;
  giftError.hidden = false;
  giftAcceptButton.disabled = false;
}

function showGiftStatus(message) {
  giftStatus.textContent = message;
  giftStatus.hidden = !message;
}

function hideGiftNotification() {
  giftOverlay.hidden = true;
  document.querySelector('.inventory-screen').inert = false;
  shownGiftId = null;
}

function showNextGift() {
  if (shownGiftId || dialog.open || giftInProgress) return;
  let pending;
  try {
    pending = readGiftNotifications().find(notification => !notification.seen);
  } catch (error) {
    console.error('No se pudieron mostrar las notificaciones de regalos.', error);
    showGiftStatus(error.message);
    return;
  }
  showGiftStatus('');
  if (!pending) return;

  const item = ITEM_BY_ID.get(pending.itemId);
  shownGiftId = pending.id;
  giftImage.src = assetUrl(item.icon);
  giftImage.alt = item.name;
  giftItemName.textContent = item.name;
  giftMessage.textContent = pending.message;
  giftMessage.hidden = pending.message.length === 0;
  giftError.hidden = true;
  giftOverlay.hidden = false;
  document.querySelector('.inventory-screen').inert = true;
  giftAcceptButton.disabled = false;
  giftAcceptButton.focus();
}

async function acceptGiftNotification() {
  if (giftInProgress || !shownGiftId) return;
  giftInProgress = true;
  giftAcceptButton.disabled = true;
  giftError.hidden = true;
  try {
    const statsStore = window.MusculesNeoStats;
    if (!statsStore?.supportsLock()) {
      throw new Error('Web Locks no está disponible; no se marcó la notificación como vista.');
    }
    await statsStore.withLock(() => {
      const notifications = readGiftNotifications();
      const current = notifications.find(notification => notification.id === shownGiftId);
      if (!current || current.seen) return;
      current.seen = true;
      localStorage.setItem(GIFT_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    });
    hideGiftNotification();
  } catch (error) {
    console.error('No se pudo marcar el regalo como visto.', error);
    showGiftError(error.message || 'No se pudo actualizar la notificación.');
  } finally {
    giftInProgress = false;
    if (!giftOverlay.hidden) giftAcceptButton.disabled = false;
    else showNextGift();
  }
}

renderInventory(readInventory());
closeButton.addEventListener('click', () => dialog.close());
deleteButton.addEventListener('click', () => {
  if (!selectedItemId || deleteInProgress || !deleteConfirm.hidden) return;
  confirmError.hidden = true;
  confirmError.textContent = '';
  dialogInner.inert = true;
  deleteConfirm.hidden = false;
  cancelDeleteButton.focus();
});
function closeDeleteConfirmation() {
  if (deleteInProgress) return;
  deleteConfirm.hidden = true;
  dialogInner.inert = false;
  if (dialog.open) deleteButton.focus();
}

cancelDeleteButton.addEventListener('click', closeDeleteConfirmation);
confirmDeleteButton.addEventListener('click', async () => {
  if (!selectedItemId || deleteInProgress || deleteConfirm.hidden) return;

  deleteInProgress = true;
  confirmDeleteButton.disabled = true;
  cancelDeleteButton.disabled = true;
  try {
    const statsStore = window.MusculesNeoStats;
    if (!statsStore?.supportsLock()) throw new Error('Web Locks no está disponible; no se borró el objeto.');
    const result = await statsStore.withLock(() => {
      let stored;
      try {
        stored = localStorage.getItem(INVENTORY_KEY);
      } catch (error) {
        throw new Error('No se pudo leer el inventario para borrar el objeto.', { cause: error });
      }
      let inventory;
      try {
        inventory = stored === null ? [] : JSON.parse(stored);
      } catch (error) {
        throw new Error('El inventario guardado tiene JSON inválido.', { cause: error });
      }
      if (!Array.isArray(inventory) || inventory.length > 15
        || inventory.some(id => !ITEM_BY_ID.has(id))) {
        throw new Error('El inventario guardado tiene un formato inválido.');
      }
      const itemIndex = inventory.indexOf(selectedItemId);
      if (itemIndex === -1) return inventory;
      const updatedInventory = [...inventory];
      updatedInventory.splice(itemIndex, 1);
      try {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(updatedInventory));
      } catch (error) {
        throw new Error('No se pudo guardar el inventario después de borrar el objeto.', { cause: error });
      }
      return updatedInventory;
    });
    renderInventory(result);
    updateDeleteButton(result);
    closeDeleteConfirmation();
    dialog.close();
  } catch (error) {
    console.error('No se pudo borrar el objeto del inventario.', error);
    confirmError.textContent = error.message || 'No se pudo borrar el objeto. Inténtalo de nuevo.';
    confirmError.hidden = false;
    deleteInProgress = false;
    confirmDeleteButton.disabled = false;
    cancelDeleteButton.disabled = false;
  }
});
dialog.addEventListener('cancel', event => {
  if (!deleteConfirm.hidden) {
    event.preventDefault();
    closeDeleteConfirmation();
  }
});
dialog.addEventListener('close', () => {
  deleteConfirm.hidden = true;
  dialogInner.inert = false;
  deleteInProgress = false;
  confirmDeleteButton.disabled = false;
  cancelDeleteButton.disabled = false;
  selectedItemId = null;
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('storage', event => {
  if (event.key === INVENTORY_KEY || event.key === null) {
    const inventory = readInventory();
    renderInventory(inventory);
    updateDeleteButton(inventory);
  }
  if (event.key === GIFT_NOTIFICATIONS_KEY || event.key === null) {
    if (shownGiftId) {
      try {
        const latest = readGiftNotifications();
        const current = latest.find(notification => notification.id === shownGiftId);
        if (!current || current.seen) hideGiftNotification();
      } catch (error) {
        console.error('No se pudo sincronizar la notificación de regalo.', error);
        showGiftStatus(error.message);
      }
    }
    showNextGift();
  }
});
giftAcceptButton.addEventListener('click', acceptGiftNotification);
dialog.addEventListener('close', showNextGift);
showNextGift();
