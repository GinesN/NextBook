# Publicación en Cloudflare Pages

La web conserva Supabase y el repositorio existente. La publicación de GitHub Pages sigue funcionando mientras se verifica la migración.

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

## Antes de dar por terminada la migración

1. Verificar que el hostname pertenece al proyecto creado en la cuenta del responsable.
2. Autorizar exclusivamente ese origen exacto en la función `carlin-recommend`; conservar el origen anterior durante la transición.
3. Configurar la URL principal de Supabase Auth y las redirecciones necesarias para el nuevo sitio.
4. Comprobar en la publicación real la presentación, la demo, Carlin, el acceso, la privacidad y los QR.
5. Actualizar el cartel A6 y las redirecciones desde GitHub Pages después de esas comprobaciones.

No permitir indiscriminadamente `*.pages.dev` en CORS: los subdominios de otras cuentas no son de confianza.
