const dialog = document.querySelector('#coming-soon');
const title = document.querySelector('#dialog-title');
document.querySelectorAll('[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.page === "Perfil") {
      window.location.href = "perfil.html";
      return;
    }
    if (button.dataset.page === "Inventario") {
      window.location.href = "inventario.html";
      return;
    }
    if (button.dataset.page === "Encuentro") {
      window.location.href = "combate.html";
      return;
    }
    title.textContent = button.dataset.page;
    dialog.showModal();
  });
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
