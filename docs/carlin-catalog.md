# Catálogo privado de Carlin La Reina

El cuestionario `?libreria=carlin-la-reina` obtiene las preguntas y las recomendaciones de la Edge Function `carlin-recommend`. El inventario completo, los precios de todas las fichas y el stock exacto no se envían al navegador ni se incluyen en el repositorio. La función solo devuelve opciones de respuesta y, al terminar, hasta tres libros con su precio. Por tanto, esos tres títulos y precios sí son públicos para quien use el cuestionario. El cuestionario permite elegir edades de 0 a 100, amplía los temas disponibles y adapta las preguntas de ritmo y dificultad al catálogo.

La base de datos usa `public.bookstore_catalog` con Row Level Security activado y sin permisos de lectura para `anon` ni `authenticated`. La función usa una clave secreta inyectada por Supabase únicamente en el servidor. El navegador envía la clave publicable de Supabase para invocar la función, sin acceso directo al catálogo. Cualquier cliente puede usar el cuestionario; las restricciones CORS evitan llamadas desde otras webs, pero no sustituyen una limitación de uso o una protección contra consultas automatizadas.

## Activación

1. Ejecutar `supabase/migrations/20261001000000_bookstore_catalog.sql` en el proyecto `aesmyvfjcfcjegytsacy`.
2. Desplegar `supabase/functions/carlin-recommend` con verificación JWT activada (definida en `supabase/config.toml`).
3. Cargar el JSONL local de la librería con `node scripts/import-carlin-catalog.mjs <ruta-al-jsonl>`. El comando requiere `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en el entorno del equipo que realiza la importación. La clave no debe escribirse en archivos versionados ni incluirse en comandos compartidos. `--dry-run` valida el archivo sin enviarlo.
4. Verificar que una llamada al endpoint devuelve la pregunta de tipo para un perfil con destinatario y edad, que una consulta directa a `bookstore_catalog` con la clave publicable no puede leer filas y que el cuestionario funciona desde GitHub Pages.

El JSONL y el Excel facilitados contienen las mismas 3.962 filas y columnas. Una fila carece de título, por lo que se importan 3.961 fichas. Diez precios son cero en el origen y se guardan como desconocidos; no entran en las recomendaciones. Los títulos sin stock tampoco se recomiendan. El proceso de importación actualiza los libros por identificador y desactiva los que hayan desaparecido del último archivo tras completar todos los lotes.

Se corrigieron seis ediciones de *Harry Potter y el misterio del príncipe* que el enriquecimiento había clasificado como thriller por la palabra «misterio». Otras seis fichas con indicios de público infantil figuran como adultas en el origen y se excluyen de la rama adulta hasta revisar su público. Las sinopsis generadas del archivo no se muestran como si fueran textos editoriales oficiales.

Edad, tipo, sección, tema y presupuesto restringen la selección; ritmo o nivel ordenan los resultados. Las etiquetas de género, público y temas provienen del enriquecimiento del inventario y pueden requerir revisión editorial. El stock es una fotografía del archivo importado, no una sincronización en tiempo real: la disponibilidad y el precio deben confirmarse con la librería.

Las fichas de resultados consultan portada y datos editoriales en Open Library cuando encuentra una coincidencia por ISBN o título. La cobertura de su catálogo varía; cuando no hay portada se muestra una cubierta gráfica de reserva. El enlace a la ficha externa aparece dentro del detalle del libro.

El QR del panel privado apunta a `https://ginesn.github.io/NextBook/?libreria=carlin-la-reina`. Si cambia la URL pública, hay que regenerar `public/librerias/carlin-la-reina/qr.svg`.
