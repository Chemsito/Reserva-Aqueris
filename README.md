# Reserva Aqueris

Sitio informativo oficial de **Reserva Aqueris** (Arequipa), concebido como una **carta digital premium**: catálogo dinámico, fichas detalladas, enlaces compartibles y contacto directo por WhatsApp. No es un ecommerce y no implementa carrito, checkout, pagos ni analítica de usuarios.

## Arquitectura

- Frontend estático: HTML + CSS + JavaScript.
- Backend: Supabase (Postgres, Auth, Row Level Security y Storage).
- Catálogo: tabla `products`.
- Categorías administrables: tabla `categories`.
- Datos comerciales y contenido editable: tabla `site_settings`.
- Administración: Supabase Auth + tabla `site_admins`.
- Imágenes nuevas: bucket público `product-images`, con escritura exclusiva para administradores.

## Carta digital

La página pública incluye:

- filtros por categorías administrables;
- búsqueda tolerante a tildes;
- estados de disponibilidad informativos;
- distintivos opcionales como “Edición especial”;
- fichas con marca, temperatura de servicio, origen, presentación, grado alcohólico, notas de cata y maridaje cuando esos datos estén disponibles;
- enlace directo a cada producto mediante `?vino=<slug>`;
- compartir, copiar enlace y generar QR directamente en el navegador;
- SEO general orientado a Reserva Aqueris en Arequipa y datos estructurados;
- diseño adaptado a móvil y soporte de `prefers-reduced-motion`.

Los precios mostrados son informativos/referenciales y la disponibilidad se confirma por WhatsApp.

## Administración

Abre `admin.html` e inicia sesión con una cuenta que ya esté autorizada en `site_admins`.

El alta pública de cuentas administradoras está deshabilitada. El mecanismo de activación inicial fue de un solo uso y, una vez consumido, su RPC quedó revocado para reducir la superficie de ataque.

El panel permite:

- crear, editar, ocultar y eliminar productos;
- ordenar productos y marcar destacados;
- editar disponibilidad, distintivos y contenido editorial de cada ficha;
- crear, renombrar, ordenar y ocultar categorías;
- subir o reemplazar imágenes;
- modificar WhatsApp, ubicación, Instagram, textos principales, sección “Nuestra carta” y metadatos SEO.

## Publicación

El proyecto está preparado para GitHub Pages. En GitHub: **Settings → Pages → Deploy from a branch → `main` / root**.

## Seguridad

- La clave incluida en `config.js` es una **publishable key** de Supabase y está diseñada para frontend público.
- Las operaciones sensibles están protegidas con RLS y requieren una cuenta administradora.
- El panel valida la autorización consultando `site_admins` con RLS, sin exponer un RPC público de comprobación de administrador.
- `anon` solo tiene permiso `SELECT` sobre `categories`; las escrituras requieren rol autenticado y además una política RLS de administrador.
- Los campos renderizados en el panel se escapan antes de insertarse en HTML para evitar XSS persistente.
- Las imágenes administrativas se restringen a JPG, PNG y WebP, con máximo de 5 MB, y se limpian archivos huérfanos cuando una operación falla o reemplaza una imagen.
- El SDK de Supabase y el generador QR usado en navegador están fijados a versiones concretas en CDN.
