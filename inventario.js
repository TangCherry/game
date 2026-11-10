const INVENTORY_KEY = 'muscules_neo_inventory_v01';
const ITEM_BY_ID = new Map(ITEM_CATALOG.map(item => [item.id, item]));
const assetUrl = path => path.split('/').map(encodeURIComponent).join('/');
const grid = document.getElementById('inventory-grid');
const dialog = document.getElementById('item-dialog');
const closeButton = dialog.querySelector('.close');
const itemTitle = document.getElementById('item-title');
const itemCard = document.getElementById('item-card');
const deleteButton = document.getElementById('item-delete');
let selectedItemId = null;

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
  if (!selectedItemId) return;

  const selectedItem = ITEM_BY_ID.get(selectedItemId);
  if (!selectedItem || !window.confirm(`¿Borrar una unidad de ${selectedItem.name}?`)) return;

  let inventory;
  try {
    const stored = localStorage.getItem(INVENTORY_KEY);
    inventory = stored === null ? [] : JSON.parse(stored);
    if (!Array.isArray(inventory)) throw new TypeError('El inventario local no es una lista.');
  } catch (error) {
    console.error('No se pudo leer el inventario para borrar el objeto.', error);
    window.alert('No se pudo leer el inventario. Inténtalo de nuevo.');
    return;
  }

  const itemIndex = inventory.indexOf(selectedItemId);
  if (itemIndex === -1) {
    window.alert('Este objeto ya no está en el inventario.');
    const currentInventory = readInventory();
    renderInventory(currentInventory);
    updateDeleteButton(currentInventory);
    return;
  }

  inventory.splice(itemIndex, 1);
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (error) {
    console.error('No se pudo guardar el inventario después de borrar el objeto.', error);
    window.alert('No se pudo borrar el objeto. Inténtalo de nuevo.');
    return;
  }

  renderInventory(inventory.filter(id => ITEM_BY_ID.has(id)).slice(0, 15));
  dialog.close();
});
dialog.addEventListener('close', () => { selectedItemId = null; });
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('storage', event => {
  if (event.key !== INVENTORY_KEY && event.key !== null) return;
  const inventory = readInventory();
  renderInventory(inventory);
  updateDeleteButton(inventory);
});
