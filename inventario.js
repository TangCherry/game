const INVENTORY_KEY = 'muscules_neo_inventory_v01';
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
let selectedItemId = null;
let deleteInProgress = false;

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
confirmDeleteButton.addEventListener('click', () => {
  if (!selectedItemId || deleteInProgress || deleteConfirm.hidden) return;

  deleteInProgress = true;
  confirmDeleteButton.disabled = true;
  cancelDeleteButton.disabled = true;

  let inventory;
  try {
    const stored = localStorage.getItem(INVENTORY_KEY);
    inventory = stored === null ? [] : JSON.parse(stored);
    if (!Array.isArray(inventory)) throw new TypeError('El inventario local no es una lista.');
  } catch (error) {
    console.error('No se pudo leer el inventario para borrar el objeto.', error);
    confirmError.textContent = 'No se pudo leer el inventario. Inténtalo de nuevo.';
    confirmError.hidden = false;
    deleteInProgress = false;
    confirmDeleteButton.disabled = false;
    cancelDeleteButton.disabled = false;
    return;
  }

  const itemIndex = inventory.indexOf(selectedItemId);
  if (itemIndex === -1) {
    const currentInventory = readInventory();
    renderInventory(currentInventory);
    updateDeleteButton(currentInventory);
    deleteInProgress = false;
    confirmDeleteButton.disabled = false;
    cancelDeleteButton.disabled = false;
    closeDeleteConfirmation();
    return;
  }

  inventory.splice(itemIndex, 1);
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (error) {
    console.error('No se pudo guardar el inventario después de borrar el objeto.', error);
    confirmError.textContent = 'No se pudo borrar el objeto. Inténtalo de nuevo.';
    confirmError.hidden = false;
    deleteInProgress = false;
    confirmDeleteButton.disabled = false;
    cancelDeleteButton.disabled = false;
    return;
  }

  renderInventory(inventory.filter(id => ITEM_BY_ID.has(id)).slice(0, 15));
  deleteInProgress = false;
  dialog.close();
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
  if (event.key !== INVENTORY_KEY && event.key !== null) return;
  const inventory = readInventory();
  renderInventory(inventory);
  updateDeleteButton(inventory);
});
