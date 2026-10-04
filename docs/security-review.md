# Revisión de seguridad y código de NextBook

Fecha: 4 de octubre de 2026. Alcance: landing, demo de 250 títulos, cuestionario de Carlin, acceso de librerías, API, permisos de Supabase y publicación en GitHub Pages.

## Correcciones

- Dependencias: la auditoría inicial detectaba 18 avisos altos, 18 moderados y 6 bajos. React se actualizó a 19.2.8 y Vite a 8.0.16; se retiraron Vinext, React Server Components, Cloudflare y el CLI de shadcn, que no intervienen en la web estática publicada. Se conservaron las utilidades CSS de shadcn bajo su licencia MIT. La auditoría final de todas las dependencias instaladas indica cero vulnerabilidades conocidas. La compilación utiliza ahora 272 dependencias frente a 700 en la auditoría inicial.
- Acceso: se valida la sesión con `auth.getUser()` y la asignación de librería mediante una tabla con RLS en Supabase. El correo autorizado deja de estar escrito en el cliente. Cada cuenta solo puede leer el nombre y el identificador de su librería. Esta autorización no concede acceso al inventario ni permisos de administración. Los errores de conexión liberan los botones y las contraseñas se limpian tras el intento.
- SDK de autenticación: se compila desde el lockfile y se sirve desde NextBook, sin ejecutar una importación no fijada desde esm.sh.
- API de Carlin: límite de 8192 bytes aplicado al leer el flujo, cancelación de cuerpos incompletos a los 5 segundos, JSON y estructura de perfil comprobados, errores 400/408/413/415 para solicitudes incorrectas, consultas con plazo de 20 segundos y caché compartida entre peticiones concurrentes. Los errores internos no se devuelven al visitante. Las respuestas tienen `no-store` y `nosniff`.
- Cliente de Carlin: plazo de 25 segundos, comprobación de la forma de las respuestas y restricciones sobre las URL de portadas. La ficha se abre como diálogo modal nativo, mantiene el foco dentro y devuelve el foco al libro al cerrarse.
- Páginas: política CSP con scripts del propio sitio, bloqueo de objetos incrustados, restricción de conexiones y portadas, y `Referrer-Policy` mediante meta. Se conserva el CSS en línea necesario para los componentes. El build comprueba las políticas y todos los enlaces internos de las cinco páginas.
- Rendimiento: Carlin y la demo se cargan por separado. Carlin no descarga los 250 títulos de la demo. El archivo inicial baja de aproximadamente 514 kB a 193 kB sin comprimir.
- Código: se conserva la configuración de análisis estricta, se corrigen errores y suscripciones, y Deno comprueba por separado la función de Supabase. Las excepciones de accesibilidad de los componentes reutilizables se limitan a roles explícitos de esos componentes y al foco auxiliar de un campo; no desactivan la comprobación de las pantallas de NextBook.
- Publicación: pruebas, TypeScript, lint, auditoría de dependencias y comprobación de Deno antes de publicar. Las acciones de GitHub están fijadas a commits verificados; solo el trabajo de publicación recibe permisos de Pages y OIDC.
- Textos: la landing describe las fichas y la conexión al catálogo ya existente, sin prometer explicaciones de afinidad. También se retiró una explicación que aún permanecía en las tarjetas de Carlin, conservando únicamente el porcentaje como se había solicitado.

## Verificaciones

- 39 pruebas automatizadas: clasificación, variedad, afinidad, edad, presupuesto, stock, reinicio sin respuestas, forma de la API, límites de bytes, peticiones incompletas y orígenes.
- TypeScript, lint con comprobación de tipos, `deno check` de la API y build estático sin errores.
- Cero vulnerabilidades conocidas en `pnpm audit`, incluyendo las dependencias de desarrollo.
- Consultas reales con la clave publicable rechazadas sobre catálogo, enriquecimiento, selección curada e instantáneas (401, permiso 42501).
- RLS verificada en las cinco tablas. Prueba bajo el rol `authenticated`: la cuenta asignada lee su librería; otra identidad no lee ninguna asignación. Ninguna tiene permisos de lectura del inventario.
- Registro de nuevas cuentas y usuarios anónimos desactivados en Supabase.
- Security Advisor de Supabase: cero errores y un aviso por la detección de contraseñas filtradas desactivada. El ajuste indica que solo está disponible en Pro y planes superiores.
- Peticiones reales al recomendador: 200 y tres libros para un perfil completo; 400 para JSON/perfil incorrectos; 413 para exceso de tamaño; 403 para un origen no permitido.
- Revisión de archivos e historial Git con patrones de claves secretas de Supabase, tokens de GitHub y claves privadas: sin coincidencias. La clave publicable del cliente es pública por diseño y no concede privilegios de administración.
- Navegación de la landing, demo completa, fichas, alternativas, vuelta a la landing y rechazo de credenciales inválidas comprobados en navegador. Carlin se completó en móvil: tres recomendaciones, tres portadas cargadas, diálogo modal real, foco contenido y restaurado, sin desbordamiento horizontal.

## Límites que conviene conocer

El QR, el cuestionario y las fichas recomendadas son públicos. Una persona puede recopilar las fichas que la API ofrece mediante sucesivas consultas; no se devuelven cantidades de stock, datos de cuentas, instantáneas ni el inventario completo. El área visual de acceso contiene enlaces públicos y un QR. Un futuro panel que modifique datos deberá aplicar la autorización en cada operación del servidor, además de comprobar la sesión en la interfaz.

La API pública todavía no tiene un límite persistente de peticiones por IP o una protección contra tráfico distribuido. El límite de cuerpo, los plazos y la caché contienen el trabajo de una petición; no impiden un bot que envíe muchas peticiones válidas. Añadir ese control es recomendable antes de una difusión con mucho tráfico.

La protección de Supabase contra contraseñas filtradas no está disponible en el plan actual. No se ha contratado un plan de pago. El registro público permanece cerrado; las cuentas autorizadas deben utilizar contraseñas únicas y fuertes. [Documentación de seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

GitHub Pages no permite configurar aquí cabeceras HTTP propias como `frame-ancestors` o `Permissions-Policy`. La CSP por meta protege scripts, conexiones y objetos, pero no aporta protección contra enmarcado. Antes de incorporar operaciones privadas sensibles, conviene utilizar un alojamiento que permita esas cabeceras.

La afinidad sigue siendo una puntuación editorial de coincidencia, no una probabilidad validada de satisfacción. Los precios y el stock de la demo son simulados; Carlin utiliza el inventario de Supabase con una caché de dos minutos. La validez comercial del inventario debe mantenerse con nuevas importaciones.

Fuentes primarias consultadas: [seguridad de datos de Supabase](https://supabase.com/docs/guides/database/secure-data), [autenticación de funciones](https://supabase.com/docs/guides/functions/auth), [aviso de seguridad de React](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g), [aviso de Vite](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff). La retirada de herramientas no utilizadas también elimina la dependencia de [braces sin parche publicado](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
