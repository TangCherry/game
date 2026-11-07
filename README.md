# Muscules

Prototipo web del juego Muscules, con pantalla de inicio, perfil, inventario y un combate de prueba.

## Publicar en GitHub Pages

El workflow de GitHub Actions publica automáticamente el sitio cuando hay un `push` a `main` o `master`.

1. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como método de publicación.
2. Cada `push` a `main` inicia el workflow **Deploy static site to GitHub Pages**.
3. La URL del sitio aparece en **Settings → Pages** o en el resultado del workflow.

También puedes iniciar una publicación manual desde **Actions → Deploy static site to GitHub Pages → Run workflow**.

Para probarlo localmente, abre `index.html` en un navegador.

Perfil e Inventario están conectados desde el menú principal. Encuentro sigue siendo provisional. `combate.html` contiene un combate local de demostración; su progreso se guarda en el navegador y aún no se sincroniza con Supabase.

## Estructura
- `index.html`: pantalla y navegación
- `styles.css`: estilos responsive
- `script.js`: interacciones provisionales
- `perfil.html` y `perfil.css`: pantalla de perfil
- `inventario.html`, `inventario.css`, `inventario.js` y `inventory-data.js`: inventario
- `combate.html`, `combate.css` y `combate.js`: combate de demostración
- `assets/`: imágenes originales seleccionadas del paquete de diseño
