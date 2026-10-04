# Catálogo privado de Carlin La Reina

El cuestionario `?libreria=carlin-la-reina` obtiene las preguntas y recomendaciones de la Edge Function `carlin-recommend`. Desde el 2 de octubre de 2026 recomienda únicamente una selección editorial de **500 obras del stock**, repartidas en 20 géneros. Todas tienen autor, sinopsis en español, portada comprobada, editorial y número de páginas. El precio y las unidades disponibles se conservan del inventario original. El resumen de cobertura está en `carlin-curation-report.json`; no es un ranking de ventas: no se dispone de ventas locales.

El inventario, el stock exacto, las fichas completas de trabajo y las copias previas permanecen privados en Supabase o en `work/`, fuera de Git. La función devuelve preguntas y hasta tres fichas públicas con título, autor, precio, sinopsis y datos editoriales. Cada nuevo intento rota entre libros compatibles y recuerda en el navegador los títulos recientes. «Ver otras recomendaciones» conserva las respuestas.

La base de datos usa `public.bookstore_catalog` con Row Level Security activado y sin permisos de lectura para `anon` ni `authenticated`. La función usa una clave secreta inyectada por Supabase únicamente en el servidor. El navegador envía la clave publicable de Supabase para invocar la función, sin acceso directo al catálogo. Cualquier cliente puede usar el cuestionario; las restricciones CORS evitan llamadas desde otras webs, pero no sustituyen una limitación de uso o una protección contra consultas automatizadas.

## Importación original y conservación

1. Ejecutar `supabase/migrations/20261001000000_bookstore_catalog.sql` en el proyecto `aesmyvfjcfcjegytsacy`.
2. Desplegar `supabase/functions/carlin-recommend` con verificación JWT activada (definida en `supabase/config.toml`).
3. Cargar el JSONL local de la librería con `node scripts/import-carlin-catalog.mjs <ruta-al-jsonl>`. El comando requiere `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en el entorno del equipo que realiza la importación. La clave no debe escribirse en archivos versionados ni incluirse en comandos compartidos. `--dry-run` valida el archivo sin enviarlo.
4. Verificar que una llamada al endpoint devuelve la pregunta de tipo para un perfil con destinatario y edad, que una consulta directa a `bookstore_catalog` con la clave publicable no puede leer filas y que el cuestionario funciona desde GitHub Pages.

El JSONL y el Excel facilitados contienen las mismas 3.962 filas. Una carece de título y se importaron 3.961 fichas. El catálogo anterior está desactivado salvo las 500 seleccionadas y conserva una instantánea privada en `bookstore_catalog_snapshots`, con identificador `before-curation-2026-10-02`. La autenticación y los demás datos de Supabase no se modifican. `supabase/restore-carlin-catalog.sql` permite recuperar las filas anteriores; la función sigue limitada a la selección curada hasta desplegar deliberadamente otra versión.

## Selección y activación del catálogo reducido

1. Ejecutar `supabase/migrations/20261002010000_bookstore_curated.sql`. `bookstore_curated` y `bookstore_catalog_snapshots` tienen RLS y ningún permiso para clientes públicos.
2. Ejecutar `node scripts/curate-carlin-catalog.mjs <inventario.jsonl> collect`. Preselecciona autores y obras reconocibles, intercala géneros, excluye material escolar y consulta fichas de Todos tus libros / CEGAL por ISBN exacto. Solo transmite ISBN públicos. Guarda respuestas y procedencia en `work/curation/cache.json`. El enriquecimiento anterior de Open Library es opcional y se reutiliza si existe.
3. Ejecutar `node scripts/verify-carlin-covers.mjs` y `node scripts/prepare-carlin-curation.mjs`. La selección deduplica obras y ediciones, evita cuadernos, guías de idiomas y fichas incompletas, y reparte las opciones por género. Revisar `work/curation/review.tsv` y el informe antes de activar.
4. Ejecutar `node --experimental-strip-types scripts/check-carlin-curation.mjs <inventario.jsonl>`. Exige exactamente 500 ISBN del stock original, precio y unidades conservados, sinopsis, autor, editorial, páginas, temas y portada válida; comprueba además perfiles de edades y géneros.
5. Importar `work/curation/curated.csv` en la tabla privada `bookstore_curated` y ejecutar `work/curation/activate.sql`. La activación es transaccional: valida las 500 fichas, guarda una instantánea y desactiva el resto.
6. Desplegar `carlin-recommend`. `node scripts/bundle-carlin-function.mjs` genera un archivo único para el editor del dashboard, sin incluir el catálogo ni claves secretas. La función cruza el catálogo activo con la tabla curada y no recurre al inventario completo como alternativa.

Las sinopsis y datos de edición proceden de fichas bibliográficas por ISBN. Las materias se usan para clasificar el género, con correcciones de obras concretas; los temas se extraen de la sinopsis y las materias. Edad, ritmo y dificultad son orientativos y requieren revisión editorial para afinar casos concretos. La selección por notoriedad de autor u obra es una decisión editorial, no una garantía de popularidad ni de ventas futuras.

Se corrigieron seis ediciones de *Harry Potter y el misterio del príncipe* que el enriquecimiento había clasificado como thriller por la palabra «misterio». Otras seis fichas con indicios de público infantil figuran como adultas en el origen y se excluyen de la rama adulta hasta revisar su público. Las sinopsis generadas del archivo no se muestran como si fueran textos editoriales oficiales.

Edad, stock positivo, precio conocido y presupuesto restringen la selección. Camino de lectura, género, tema, ritmo, nivel y extensión ordenan los resultados mediante coincidencias parciales; no descartan todas las alternativas al elegir un tema escaso. El porcentaje tiene regularización conservadora y no representa una probabilidad de satisfacción. La revisión y los pesos están en [carlin-affinity-review.md](./carlin-affinity-review.md). Las etiquetas de género, público y temas provienen del enriquecimiento del inventario y pueden requerir revisión editorial. El stock es una fotografía del archivo importado, no una sincronización en tiempo real: la disponibilidad y el precio deben confirmarse con la librería.

Las fichas reciben desde Supabase la sinopsis y la portada almacenadas; no necesitan una búsqueda externa para completar la selección activa. Toda la tarjeta abre la información ampliada, con ISBN, editorial, páginas, publicación y formato cuando consta. La cubierta alternativa sigue disponible si una imagen falla al cargar.

El QR del panel privado apunta a `https://ginesn.github.io/NextBook/?libreria=carlin-la-reina`. Si cambia la URL pública, hay que regenerar `public/librerias/carlin-la-reina/qr.svg`.
