# Publicación en Cloudflare Pages

La web está publicada en https://nextbookesp.pages.dev desde el 5 de octubre de 2026. Conserva Supabase y el repositorio existente. GitHub Pages redirige las cinco direcciones anteriores a sus nuevas páginas, incluidos los QR que apuntaban al cuestionario de Carlin.

## Configuración del proyecto

- Método: importar el repositorio GitHub `GinesN/NextBook`.
- Rama de producción: `main`.
- Comando: `pnpm build:cloudflare`.
- Directorio de salida: `cloudflare-pages-dist`.
- Node: 22 o posterior (variable `NODE_VERSION=22`).
- `NEXTBOOK_SITE_ORIGIN`: origen HTTPS exacto del proyecto publicado, por ejemplo `https://nextbookesp.pages.dev`.
- Utilizar el plan gratuito; no activar analítica, productos o complementos de pago.

## Direcciones

- `/`: presentación.
- `/demo/`: cuestionario de demostración.
- `/carlin-la-reina/`: cuestionario de la librería.
- `/librerias/`: acceso privado con Supabase.
- `/informacion/`: privacidad y cookies.
- `/presentacion/`: redirección a la presentación principal.

El proceso de compilación genera los QR y los metadatos para el origen configurado. También añade cabeceras CSP, HTTPS, protección contra incrustación, restricciones de permisos y `nosniff`.

## Configuración y comprobaciones de la migración

1. Proyecto `nextbookesp` conectado a `GinesN/NextBook`, rama `main`, en la cuenta del responsable. Los nuevos commits publican automáticamente.
2. CORS de `carlin-recommend`: permite exclusivamente `https://nextbookesp.pages.dev` y el origen anterior `https://ginesn.github.io`, además de desarrollo local. La función está desplegada; se verificó que otro proyecto `pages.dev` recibe 403.
3. Supabase Auth: URL principal y única URL de redirección `https://nextbookesp.pages.dev/librerias/`.
4. Las cinco páginas públicas responden 200 con las cabeceras de seguridad. La API real completa el cuestionario y devuelve tres libros distintos con portada y descripción. El código conserva las comprobaciones de acceso y las políticas existentes de Supabase.
5. El proceso de publicación genera los QR de la demo y Carlin para el nuevo dominio. El cartel A6 se actualiza con el QR de `/carlin-la-reina/`.

`pnpm build:github-pages` sigue creando la web anterior como alternativa local. Solo el flujo de publicación de GitHub sustituye sus páginas por redirecciones, después de comprobar la compilación.

No permitir indiscriminadamente `*.pages.dev` en CORS: los subdominios de otras cuentas no son de confianza.
