const grid = document.getElementById('inventory-grid');
const dialog = document.getElementById('item-dialog');
const closeButton = dialog.querySelector('.close');
const itemTitle = document.getElementById('item-title');
const itemCard = document.getElementById('item-card');
const itemCount = document.getElementById('item-count');

// 15 espacios; solo se muestran los ítems que Neo tiene.
const owned = ITEM_CATALOG.filter(item => (NEO_INVENTORY[item.id] ?? 0) > 0);
for (let i = 0; i < 15; i++) {
  const item = owned[i];
  const slot = document.createElement('button');
  slot.className = 'slot';
  slot.type = 'button';
  if (item) {
    const img = document.createElement('img');
    img.src = item.icon;
    img.alt = '';
    slot.append(img);
    slot.setAttribute('aria-label', `${item.name}, cantidad ${NEO_INVENTORY[item.id]}`);
    const quantity = document.createElement('span');
    quantity.className = 'qty';
    quantity.textContent = `×${NEO_INVENTORY[item.id]}`;
    slot.append(quantity);
    slot.addEventListener('click', () => {
      itemTitle.textContent = item.name;
      itemCard.src = item.card;
      itemCard.alt = `Tarjeta de ${item.name} con su habilidad`;
      itemCount.textContent = `En inventario: ${NEO_INVENTORY[item.id]}`;
      dialog.showModal();
    });
  } else {
    slot.disabled = true;
    slot.setAttribute('aria-label', 'Espacio vacío');
  }
  grid.append(slot);
}
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
