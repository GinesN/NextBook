# Presentación de NextBook

Landing de presentación independiente del cuestionario: https://ginesn.github.io/NextBook/presentacion/

El recomendador sigue en https://ginesn.github.io/NextBook/.

## Contenido y edición

- `index.html`: propuesta de valor, recorrido, beneficios, hoja de ruta, preguntas frecuentes y metadatos sociales.
- `style.css`: diseño responsive en crema y verde, tipografía editorial y adaptación a movimiento reducido.
- `script.js`: recorrido interactivo, ejemplos ilustrativos y copia del enlace.
- `qr-demo.png`: QR que apunta a la demo, no a la presentación.
- La imagen de marca `../og.png` y el icono `../favicon.svg` reutilizan los recursos existentes de NextBook.

Los ejemplos interactivos son ilustrativos, no ejecutan el algoritmo del recomendador. No se afirma que exista una integración de stock, analítica o soporte multi-librería. No hay formulario de contacto ni recogida de datos personales. El botón de LinkedIn abre el diálogo de compartir, sin publicar automáticamente. La tipografía se sirve desde Google Fonts con alternativas locales.

## Publicación

La compilación existente `pnpm build:github-pages` copia esta carpeta de `public` a `github-pages-dist/presentacion`. El flujo de GitHub Pages publica la landing junto a la demo, cada una en su dirección. No requiere nuevas dependencias ni cambios en el recomendador.
