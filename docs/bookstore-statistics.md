# Panel privado de estadísticas

El panel de `/librerias/` usa el acceso existente de Supabase. Muestra total acumulado, cuestionarios del periodo, apariciones de libros, títulos distintos, gráfico y ranking paginado. Incluye filtros de hoy, últimos siete días, mes actual, histórico y fechas personalizadas. El CSV incluye todos los libros y todos los días del intervalo, también los días con cero actividad; protege los campos de texto contra fórmulas de hojas de cálculo.

## Qué cuenta

Solo las respuestas finales del recomendador generan un registro. Las preguntas intermedias y la demo no se contabilizan. Un resultado sin libros cuenta como un cuestionario completado. Cada libro de la selección suma una aparición y su posición permite contar las primeras opciones. Son cuestionarios, no personas únicas ni compras.

El UUID del cuestionario vive en memoria; se renueva al pulsar «Empezar de nuevo» o recargar. Volver atrás, recalcular o reintentar conserva el mismo UUID y no altera la primera selección registrada. La fecha se guarda como `timestamptz`; los filtros y agrupaciones usan la zona horaria de la librería, inicialmente `Europe/Madrid`, incluidos los cambios de hora. Los títulos y autores se conservan aunque cambie el catálogo.

La finalización y sus libros se guardan en una única transacción en segundo plano, mediante `EdgeRuntime.waitUntil`. El registro no modifica la selección ni bloquea la entrega de resultados al lector. Un fallo temporal de escritura se reintenta una vez con el mismo UUID; si ambos intentos fallan, se deja constancia en el registro operativo de Supabase y ese cuestionario no se contabiliza. Los reintentos de un registro confirmado no duplican el recuento. Los clientes anteriores sin UUID siguen funcionando y no se contabilizan.

## Activación en producción

1. Aplicar `supabase/migrations/20261007010000_bookstore_statistics.sql` en el proyecto Supabase existente. La migración añade tablas y funciones; conserva el catálogo y las asignaciones de acceso actuales. Aplicarla una sola vez, dentro de una transacción, mediante las migraciones de Supabase o su editor SQL.
2. Desplegar `supabase/functions/carlin-recommend/index.ts` y sus módulos compartidos en `carlin-recommend`, manteniendo su configuración de autenticación. Para el editor web de una sola fuente, `node scripts/bundle-carlin-function.mjs` genera `work/carlin-recommend-index.ts`.
3. Publicar la web con `pnpm build:cloudflare`. La versión nueva del cliente solo debe publicarse cuando la migración y la función estén activas.
4. Iniciar sesión con la cuenta ya asignada a Carlin y comprobar los filtros y el CSV. Un resultado real con el cliente nuevo comienza el histórico. No insertar datos ficticios en producción para enseñar el panel.

Sin la migración, la nueva API no puede consultar la configuración y el panel no puede comprobar el acceso. Por eso la activación del servidor debe preceder a la publicación del cliente.

## Permisos

Las tablas de finalizaciones y recomendaciones no admiten lectura ni escritura de visitantes o cuentas autenticadas. Solo el servidor escribe mediante `record_bookstore_completion`; la base de datos valida los libros contra el catálogo activo. `bookstore_statistics` devuelve agregados y verifica `auth.uid()` y la asignación de librería en cada llamada. La configuración visible está limitada mediante RLS a las librerías asignadas. El navegador no recibe la clave de servicio, respuestas de lectores, UUID de cuestionarios ni filas del inventario.

Una cuenta con varias asignaciones ve un selector de librerías. Una cuenta de gestión puede consultar todas las librerías que tenga asignadas, usando el mismo mecanismo de autorización; no existe una excepción por correo escrito en JavaScript.

## Añadir otra librería

1. Crear su registro en `bookstores`: `slug`, nombre, ruta del cuestionario, ruta del QR y zona horaria. Registrar únicamente librerías activadas y mantener las rutas dentro del sitio.
2. Importar y preparar su catálogo y metadatos curados con el mismo `bookstore_slug`. El importador admite `--bookstore=identificador`; el script y los datos de curación también deben utilizar ese identificador. La función de recomendaciones valida la librería registrada y mantiene una caché separada por librería.
3. Añadir su nombre e identificador a `lib/bookstores.json`. La compilación de Cloudflare genera automáticamente su ruta `/<slug>/` y su QR `/librerias/<slug>/qr.svg`. El componente del cuestionario toma el nombre e identificador de esa configuración.
4. Asignar su cuenta existente de Supabase Auth mediante `bookstore_memberships`. El panel detecta las librerías autorizadas y sus enlaces automáticamente.

El alta de librerías sigue siendo una operación del responsable del proyecto; no hay registro público ni subida de catálogos desde el panel.

## Activación del 7 de octubre de 2026

La migración `bookstore_statistics` se aplicó al proyecto `aesmyvfjcfcjegytsacy` y la función `carlin-recommend` se desplegó con `verify_jwt` conservado. Una comprobación en una transacción verificó el registro, la deduplicación y los permisos; se revirtió íntegramente para mantener el historial sin datos de prueba. El cliente anterior también se comprobó contra la API real. El algoritmo de `supabase/functions/_shared/carlin.ts`, el de `lib/recommend.ts` y el cuestionario de la demo permanecen sin modificaciones.

El asesor de Supabase señala como intencionales las funciones `SECURITY DEFINER` accesibles a usuarios autenticados: sus consultas agregadas están protegidas por la asignación de librería comprobada en el servidor. Las tablas de eventos tienen RLS sin políticas de lectura de cliente para que sus filas no sean accesibles. Véanse las explicaciones del asesor sobre [funciones con privilegios del propietario](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [tablas con RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). La comprobación de permisos positiva y negativa forma parte de las pruebas de PostgreSQL.

## Comprobaciones

`pnpm check` incluye pruebas del PostgreSQL de PGlite para la migración, escritura atómica, duplicados, separación por librería, permisos de las cuentas, intervalos y cambio de hora. También comprueba fechas, CSV, agrupación del gráfico y validación de identificadores. `deno check --no-config --node-modules-dir=none supabase/functions/carlin-recommend/index.ts` verifica la función del servidor. Las dos compilaciones existentes comprueban enlaces y políticas de seguridad.
