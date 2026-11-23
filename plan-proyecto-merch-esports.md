# Plan de proyecto: tienda de merch de e-sports

> **Estado actual:** fases 1 a 7 completadas. La Fase 7 cerró el rediseño visual de todas las vistas con el sistema de diseño en `frontend/src/index.css`, assets propios en `frontend/public/assets/` y la franja animada del catálogo retirada. Las fases 8 y 9 siguen pendientes.

## 0. Puntos a confirmar (se asume lo indicado)

- **Base de datos:** la especificación original indica MySQL y en la sección de Docker se menciona PostgreSQL. Se asume **MySQL 8**. Si se prefiere PostgreSQL, solo cambian el dialecto de JPA, la imagen de Docker y algunos tipos del script SQL.
- **Valorant y Dota 2:** ambos usan rojo. Se propone **Valorant `#FF4655`** (rojo-coral) y **Dota 2 `#9B1B30`** (carmesí profundo) para que se distingan bien. LoL `#0AC8B9` (celeste) y CS2 `#F5A623` (amarillo).

## 1. Alcance

**Clientes:** registro y login (JWT + Google OAuth), catálogo con filtros acumulativos, carrito en localStorage, checkout con Stripe Payment Element, historial de pedidos.

**Administración:** CRUD de productos, categorías, equipos y stock, gestión de pedidos y estados, y ejecución y revisión del scraper de productos e imágenes.

**Fuera de alcance:** envíos reales, cobros reales, múltiples monedas.

## 2. Arquitectura

```
React + Tailwind ──► Spring Boot (REST, JWT) ──► MySQL
                          │  ├─ @Async: correos, webhooks
                          │  └─ Micrometer ──► Prometheus ──► Grafana ◄── k6
                          └──► Stripe (PaymentIntent + Webhooks)
Scraper de productos e imágenes (job aparte) ──► MySQL + almacenamiento de imágenes
```

Backend en capas (controller → service → repository), DTOs, validación con Bean Validation y manejo global de errores. Frontend organizado por funcionalidades (`catalog`, `cart`, `checkout`, `admin`, `auth`).

## 3. Modelo de datos

Jerarquía de filtros: **Juego → Categoría → Subcategoría → Equipo**. Cada filtro se suma a los ya aplicados.

| Categoría | Subcategorías propuestas |
|---|---|
| **Vestimenta** | Jerseys, Polos, Polerones, Chaquetas, Gorras |
| **Accesorios** | Mousepads, Mochilas, Tazas y botellas, Llaveros y pines, Pósters y banderas |
| **Coleccionables** | Figuras, Peluches, Trading cards, Réplicas y trofeos, Ediciones limitadas |

Los **equipos** son una dimensión aparte (T1, G2, Fnatic, etc.), ligada a un juego. Se gestionan desde el panel admin (o se cargan con el seed); el scraper no está pensado específicamente para ellos.

**Tablas principales:** `users`, `games`, `teams`, `categories`, `subcategories`, `products`, `product_images`, `product_variants` (talla/color + stock), `orders`, `order_items`, `payments`, `webhook_events`, `scrape_sources` (URL de origen por producto) y `scrape_runs` (historial y estado de cada ejecución).

`product_images` guarda además `source_url`, `storage_path`, `checksum` y `scraped_at`.

**Reglas del script SQL:**

- `CREATE DATABASE/TABLE IF NOT EXISTS` y datos semilla con `INSERT IGNORE`, para poder ejecutarlo completo desde cero las veces que sea necesario.
- `ON DELETE CASCADE` desde `products` hacia `product_images`, `product_variants` y `scrape_sources`.
- **Cuidado con `order_items`:** si borrar un producto elimina en cascada sus líneas de pedido, se destruye el historial de ventas. Se recomienda que `order_items` guarde una copia (nombre, precio, imagen) y use `product_id ... ON DELETE SET NULL`. Para el admin, conviene un borrado lógico (`active = false`) como acción habitual y el borrado en cascada como acción explícita.
- Índices en `(game_id, category_id, subcategory_id, team_id)` para los filtros.

## 4. Decisiones técnicas clave

**Filtros acumulativos:** el estado vive en la URL (`?game=lol&category=vestimenta&team=t1`). Backend con `JpaSpecificationExecutor` y especificaciones componibles que se suman con AND, más paginación.

**Carrito (localStorage):** guarda `{variantId, qty}` con una clave por usuario (`cart:<userId>`) y una clave de invitado que se fusiona al iniciar sesión. Como vive solo en el cliente, el precio y el stock **siempre se revalidan en el servidor** al crear el pedido; nunca se confía en el precio enviado por el cliente.

**Stock bajo concurrencia (lo más delicado con 1000 usuarios):** descuento atómico `UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :qty` (0 filas afectadas = sin stock). Se reserva al crear el pedido `PENDING` con expiración (por ejemplo 15 min) y un job programado libera las reservas vencidas.

**Stripe:** el backend crea el `PaymentIntent` con el total calculado en el servidor, y el front monta el Payment Element junto al resumen del carrito. Los webhooks (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`) verifican la firma, son **idempotentes** (tabla `webhook_events` con el id del evento) y mueven el pedido entre `PENDING → PAID / FAILED / REFUNDED`. Como respaldo si el webhook no llega, el front reconcilia el `PaymentIntent` al volver del pago y el scheduler consulta Stripe antes de expirar una reserva.

**Multihilo con `@Async`:** `ThreadPoolTaskExecutor` configurado (core, max, cola acotada y política de rechazo controlada), con ejecutores separados para correos y webhooks. Se responde 200 a Stripe rápido y se procesa en segundo plano, con reintentos para los correos.

**Scraper de productos e imágenes:** módulo independiente (Jsoup o Python), ejecutado por el admin o programado. Para cada producto de la BD que tenga una URL de origen (`scrape_sources`) obtiene:

- **Información:** nombre, descripción, precio de referencia, variantes (tallas/colores) y atributos disponibles.
- **Imágenes:** descarga las referenciadas, las valida (tipo y tamaño), las convierte a WebP en tamaños estándar (miniatura, tarjeta, detalle) y las guarda en almacenamiento propio (volumen Docker en local, Azure Blob Storage en producción). `product_images.storage_path` apunta a la copia local; nunca se enlazan directamente las imágenes del sitio origen (hotlinking).

Reglas de funcionamiento:

- **Staging revisable:** lo scrapeado entra como borrador y el admin lo aprueba antes de publicarse; así un cambio en el HTML de origen no corrompe el catálogo.
- **Idempotente:** `checksum` para no re-descargar imágenes sin cambios, y `scrape_runs` registra qué se actualizó y qué falló.
- **Multihilo:** descargas en paralelo con un pool acotado (por ejemplo 4–8 hilos) y límite de tasa por dominio para no sobrecargar los sitios.
- **Resiliencia:** reintentos con backoff, timeouts, y selectores configurables por fuente (un adaptador por sitio) para absorber cambios de HTML.
- **Aspectos legales:** revisar `robots.txt` y los términos de cada sitio antes de scrapear; si existe una API o feed oficial, usarlo. Las imágenes y textos pueden tener derechos de autor, por lo que conviene usar fuentes oficiales o de prensa y mantener el proyecto como demostrativo. Alternativa de carga manual por CSV/ZIP si un sitio no lo permite.

**Home en rayo:** 4 paneles con `clip-path: polygon(...)` en desktop (los vértices desplazados crean la diagonal de la imagen de referencia, con solapamiento negativo entre paneles), apilados en columna en móvil. Hover: `transition` con overlay oscuro y botón "Seleccionar" del color del juego.

## 5. Fases

Sin plazo fijo; estimaciones para una sola persona (≈ 13–16 semanas a ritmo medio):

| Fase | Contenido | Entregable | Est. |
|---|---|---|---|
| **1. Base** | Repos, Docker Compose (front, back, MySQL), script SQL idempotente, CI básico | `docker compose up` levanta todo | 1 sem |
| **2. Auth** | Registro/login JWT, Google OAuth, roles cliente/admin | Autenticación con tests | 1–2 sem |
| **3. Catálogo** | Entidades, API con filtros acumulativos, home en rayo, listado y detalle | Catálogo navegable | 2–3 sem |
| **4. Admin + scraper** | CRUD productos/stock, módulo de scraping de productos e imágenes (descarga, optimización, almacenamiento, staging de revisión) | Panel funcional y catálogo poblable | 2–3 sem |
| **5. Carrito y pedidos** | Carrito localStorage, creación de pedido, reserva y descuento de stock | Flujo hasta pedido `PENDING` | 1–2 sem |
| **6. Pagos** | Payment Element, webhooks idempotentes, estados, correo con `@Async` | Compra completa en Test Mode | 2 sem |
| **7. Rediseño de interfaces** | Auditoría visual, sistema de diseño (tipografía, color, espaciado, componentes), rediseño de home, catálogo, detalle, carrito, checkout, admin y estados vacíos/error/carga; responsive y accesibilidad AA | UI renovada y coherente | 1–2 sem |
| **8. Calidad y rendimiento** | Cobertura de tests, métricas Micrometer/Prometheus/Grafana, escenarios k6 hasta 500 VUs, ajustes | [`loadtest/INFORME.md`](./loadtest/INFORME.md) | 1–2 sem |
| **9. Despliegue** | Pipeline completo en GitHub Actions, imágenes a Azure Container Registry, Azure Container Apps | Entorno público | 1 sem |

## 6. Pruebas

- **Backend (JUnit 5 + Mockito):** servicios de stock, cálculo de totales, especificaciones de filtros, webhook handler (firma inválida, evento duplicado), expiración de reservas. Para repositorios y script SQL, Testcontainers con MySQL.
- **Frontend (Vitest):** reducer/hook del carrito, fusión invitado→usuario, construcción de filtros desde la URL.
- **Meta de cobertura:** 70–80% en servicios y lógica de dominio.
- **CI:** cada push ejecuta tests → build → imagen Docker.

## 7. Carga y observabilidad

Implementado en `loadtest/` (override de Compose, scripts k6, Prometheus, Grafana y SQL de preparación); el detalle está en [`loadtest/README.md`](./loadtest/README.md) y las mediciones en [`loadtest/INFORME.md`](./loadtest/INFORME.md).

- **Métricas:** latencia (p50/p95/p99), requests por segundo, tasa de errores, hilos de Tomcat y pool de conexiones (HikariCP). CPU/memoria se observan en Docker.
- **Escenarios k6:** `smoke`, `browse`, `shopper`, `checkout`, `journey` (70/20/10), `stock-race`, `soak` y `spike`.
- **Ejecutado:** `journey` a 100 VUs y `spike` hasta 500 VUs, con umbrales en verde. La rampa sostenida 100 → 300 → 500 VUs (y el objetivo inicial de 1000 VUs) queda como extensión.
- **Prueba crítica:** 50 VUs compiten por la última unidad; resultado verificado: 1 pedido `201`, 49 conflictos `409` y stock final 0, sin sobreventa.
- Para Stripe en las pruebas de carga se usa un **mock del PaymentIntent** (perfil `loadtest`), para no saturar la API de Stripe.
- Los JSON de resultados y los logs se generan en `loadtest/results/` y se ignoran en Git; solo se conserva `.gitkeep`.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Scraping bloqueado, prohibido o roto por cambios de HTML | Revisar términos, adaptadores por fuente, staging revisable, límite de tasa, alternativa de carga manual por CSV/ZIP |
| Almacenamiento y peso de las imágenes | Conversión a WebP, tamaños estándar, deduplicación por checksum, Blob Storage en producción |
| Sobreventa de stock | Descuento atómico + reservas con expiración + test de concurrencia |
| Webhooks duplicados o fuera de orden | Idempotencia por id de evento y máquina de estados válida |
| Tiempo de la capa gratuita de Azure | Monitorear créditos; Compose local como respaldo |
| Derechos de imágenes/logos de equipos y juegos | Usar assets oficiales de prensa y marcarlo como proyecto académico/demostrativo |
