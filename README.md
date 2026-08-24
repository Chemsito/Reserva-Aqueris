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

Abre `admin.html`, crea/inicia sesión y utiliza el código privado de activación entregado al propietario. El código solo se puede consumir una vez.

El panel permite crear, editar y eliminar productos; activar u ocultar productos; cambiar precios; marcar destacados; subir imágenes; y modificar WhatsApp, ubicación, Instagram y textos principales.

## Publicación

El proyecto está preparado para GitHub Pages. En GitHub: **Settings → Pages → Deploy from a branch → `main` / root**.

## Seguridad

La clave incluida en `config.js` es una **publishable key** de Supabase y está diseñada para frontend público. Las operaciones sensibles están protegidas con RLS y requieren una cuenta administradora.
