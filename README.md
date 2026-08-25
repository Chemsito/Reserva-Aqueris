# Reserva Aqueris

Sitio informativo oficial de **Reserva Aqueris** (Arequipa), con catálogo dinámico, contacto directo por WhatsApp y panel privado de administración.

## Arquitectura

- Frontend estático: HTML + CSS + JavaScript.
- Backend: Supabase (Postgres, Auth, Row Level Security y Storage).
- Catálogo: tabla `products`.
- Datos comerciales: tabla `site_settings`.
- Administración: Supabase Auth + tabla `site_admins`.
- Imágenes nuevas: bucket público `product-images`, con escritura exclusiva para administradores.

## Administración

Abre `admin.html` e inicia sesión con una cuenta que ya esté autorizada en `site_admins`.

El alta pública de cuentas administradoras está deshabilitada. El mecanismo de activación inicial fue de un solo uso y, una vez consumido, su RPC quedó revocado para reducir la superficie de ataque.

El panel permite crear, editar y eliminar productos; activar u ocultar productos; cambiar precios; marcar destacados; subir imágenes; y modificar WhatsApp, ubicación, Instagram y textos principales.

## Publicación

El proyecto está preparado para GitHub Pages. En GitHub: **Settings → Pages → Deploy from a branch → `main` / root**.

## Seguridad

- La clave incluida en `config.js` es una **publishable key** de Supabase y está diseñada para frontend público.
- Las operaciones sensibles están protegidas con RLS y requieren una cuenta administradora.
- El panel valida la autorización consultando `site_admins` con RLS, sin exponer un RPC público de comprobación de administrador.
- Los campos renderizados en el panel se escapan antes de insertarse en HTML para evitar XSS persistente.
- Las imágenes administrativas se restringen a JPG, PNG y WebP, con máximo de 5 MB, y se limpian archivos huérfanos cuando una operación falla o reemplaza una imagen.
- El SDK de Supabase usado en navegador está fijado a una versión concreta para evitar actualizaciones mayores o menores inesperadas desde el CDN.
