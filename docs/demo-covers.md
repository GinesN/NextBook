# Portadas del catálogo de demostración

Los 250 títulos de `app/data/books.json` tienen una portada asociada por título y autor. El archivo conserva el identificador de la obra y los datos bibliográficos utilizados para comprobar la coincidencia. No cambia la puntuación ni los filtros del recomendador.

La búsqueda se hace por lotes mediante [Open Library Search API](https://openlibrary.org/dev/docs/api/search). `node scripts/enrich-demo-covers.mjs` permite repetir el proceso con caché local en `work/demo-covers/`; admite las variantes de nombre usadas por los autores rusos y japoneses y comprueba ambos autores de las obras compartidas.

Las imágenes se cargan directamente desde [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers), siguiendo sus recomendaciones. La política CSP permite las redirecciones de imágenes a `archive.org` y sus servidores `*.us.archive.org`, sin añadir permisos para scripts o conexiones a esos dominios.

Una portada representa una edición de la obra: el catálogo demo no identifica una edición de venta mediante ISBN. Si una imagen falla o resulta demasiado pequeña, la tarjeta muestra una alternativa tipográfica claramente indicada como «Portada no disponible».

Las tarjetas y las fichas ampliadas muestran la portada completa, sin recortarla. El cuestionario mantiene las respuestas inicialmente vacías; las barras de edad y presupuesto solo registran un valor al interactuar con ellas.
