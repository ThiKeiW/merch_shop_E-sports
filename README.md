# Merch//Shop — tienda de merch de e-sports

Tienda de demostración de merchandising de e-sports (League of Legends, Valorant, CS2 y Dota 2) con catálogo filtrable, carrito, checkout con Stripe y panel de administración.

Proyecto académico: **no** procesa envíos ni cobros reales.

La planeación completa está en [`plan-proyecto-merch-esports.md`](./plan-proyecto-merch-esports.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Zustand |
| Backend | Spring Boot 4.1 · Java 21 · Spring Security · JWT (HS256) · Spring Data JPA · Bean Validation · Micrometer |
| Base de datos | MySQL 8.4 (esquema y seed en SQL idempotente) |
| Infra | Docker Compose · GitHub Actions |
| Pagos | Stripe Payment Element + webhooks (Fase 6) |

## Requisitos

- Docker Desktop con Compose v2
- Node.js 22+ (solo para desarrollo local del frontend)
- JDK 21 (solo para desarrollo local del backend; el contenedor ya lo incluye)

## Arranque rápido

```bash
cp .env.example .env      # en Windows: Copy-Item .env.example .env
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| Health | http://localhost:8080/actuator/health |
| MySQL | `localhost:3307` (usuario `merch`) |

`docker compose down` detiene todo. `docker compose down -v` además borra el volumen de MySQL, de modo que en el siguiente arranque se vuelven a ejecutar `db/01-schema.sql` y `db/02-seed.sql`.

## Autenticación y roles

El backend emite un **JWT firmado con HS256** al registrarse o iniciar sesión; el frontend lo guarda en `localStorage` y lo envía como `Authorization: Bearer <token>`. La sesión es stateless: no hay cookies ni sesiones en servidor.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Público | Crea una cuenta (`email`, `password`, `displayName`) y devuelve token + usuario. |
| `POST` | `/api/auth/login` | Público | Valida credenciales y devuelve token + usuario. |
| `POST` | `/api/auth/google` | Público | Recibe `{ idToken }` de Google Identity Services, valida firma/emisor/audiencia y devuelve token + usuario. |
| `GET` | `/api/auth/me` | Autenticado | Devuelve el usuario del token. |
| `GET` | `/api/admin/users` | Solo `ADMIN` | Lista de usuarios registrados. |
| `GET` | `/api/catalog/products` | Público | Listado paginado con filtros acumulativos (`game`, `team`, `category`, `q`, `sort`, `page`, `size`). |
| `GET` | `/api/catalog/products/{slug}` | Público | Detalle por `slug` con juego, categoría, equipo, variantes (precio final y stock) e imágenes. `404` si no existe o está inactivo. |
| `GET` | `/api/catalog/facets` | Público | Juegos, categorías y equipos; los equipos se filtran por los `game` seleccionados. |

Roles: `CUSTOMER` (por defecto) y `ADMIN`. En el frontend, `/admin` está protegida por `RequireRole`; la API responde `401` sin token y `403` con rol insuficiente.

Cuentas demo del seed:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@merchshop.dev` | `Admin1234!` | `ADMIN` |
| `cliente@merchshop.dev` | `Cliente1234!` | `CUSTOMER` |

Variables relacionadas (ver `.env.example`): `JWT_SECRET` (mínimo 32 bytes) y `JWT_TTL` (ISO-8601, por defecto `PT24H`). En desarrollo, si no se define `JWT_SECRET` se usa un secreto de ejemplo; **en producción siempre hay que definirlo**.

### Google OAuth

El módulo está implementado y **deshabilitado por defecto**. Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea un **OAuth client ID** de tipo *Web application*.
2. Añade como *Authorized JavaScript origins* `http://localhost:5173` (y el dominio de producción cuando exista).
3. Copia el Client ID (no hace falta el secret) en `.env`:
   - `GOOGLE_CLIENT_ID`: lo usa el backend para validar `aud` del ID token.
   - `VITE_GOOGLE_CLIENT_ID`: lo usa el frontend para renderizar el botón (mismo valor).
4. `docker compose up -d --build` (el frontend hornea la variable al arrancar Vite).

El backend verifica el ID token contra el JWKS de Google (`https://www.googleapis.com/oauth2/v3/certs`), exige `email_verified` y crea la cuenta con `provider=GOOGLE`, `provider_id=<sub>` y sin contraseña; si el email ya existe se reutiliza la cuenta. Si `GOOGLE_CLIENT_ID` está vacío, el endpoint responde `503` y el botón no se muestra.

**Probar sin credenciales:** el flujo local (registro/login por email, roles) no depende de Google. Para una prueba real hay que crear el client ID; los ID tokens no se pueden falsificar sin la clave privada de Google.

## Catálogo

`/catalogo` es público y vive en la URL: `?game=valorant&team=sentinels&category=accesorios&q=pad&sort=price-asc&page=1`. Los parámetros `game`, `team` y `category` se pueden repetir (se combinan con OR); entre grupos distintos se combinan con AND. Cambiar cualquier filtro reinicia la página a la primera.

- **Backend:** `catalog/` con entidades de solo lectura y `JpaSpecificationExecutor`; la especificación compone predicados solo para los filtros presentes y `sort` acepta `relevance` (por defecto), `newest`, `price-asc`, `price-desc` y `name`. `size` se limita a 48.
- **Facets:** el panel de equipos se recalcula con los juegos seleccionados (`GET /api/catalog/facets?game=...`); si un equipo deja de estar disponible, el frontend lo quita de la URL.
- **Detalle:** cada tarjeta enlaza a `/producto/{slug}`, que muestra descripción, precio de la variante seleccionada (talla/color + `priceDelta`), stock y SKU. Las variantes agotadas quedan deshabilitadas y el producto inexistente responde con un estado 404 propio. El botón de compra queda deshabilitado hasta la Fase 5.
- **Frontend:** `features/catalog` contiene `CatalogPage`, `ProductDetailPage`, `ProductCard`, `filters.ts` (parseo/serialización de la URL), `format.ts` y `api.ts`. Los productos aún no tienen imágenes: tarjeta y detalle muestran un placeholder con el color del juego y un monograma, y se reemplazará con las imágenes del scraper (Fase 4).
- **Seed:** 12 productos de ejemplo repartidos entre los 4 juegos y las 3 categorías, con 15 variantes para probar stock y selección.


## Estructura

```
backend/    Spring Boot: config, common (errores, health), auth, security (JWT), catalog, user, admin
db/         01-schema.sql (DDL) y 02-seed.sql (datos), ambos idempotentes
frontend/   SPA por funcionalidades: auth, catalog, cart, checkout, admin, shared
.github/    CI: backend, frontend y validación de Compose
```

## Base de datos

- MySQL 8.4, `utf8mb4`, timestamps en UTC.
- `db/*.sql` se monta en `/docker-entrypoint-initdb.d` y solo se ejecuta al inicializar un volumen vacío; también se puede aplicar a mano.
- Idempotencia: `CREATE DATABASE/TABLE IF NOT EXISTS` + `INSERT IGNORE` con ids fijos.
- Reglas clave del modelo:
  - `products` → `product_images`, `product_variants`, `scrape_sources`: `ON DELETE CASCADE`.
  - `order_items` guarda copia de nombre, variante, precio e imagen y usa `product_id ... ON DELETE SET NULL` para no destruir el historial de ventas.
  - `webhook_events.event_id` es único (idempotencia de webhooks).
  - Índice compuesto `(game_id, category_id, subcategory_id, team_id)` para filtros acumulativos.

Para inspeccionar la base:

```bash
docker compose exec mysql mysql -umerch -pmerchpass merch_shop -e "SHOW TABLES;"
```

## Desarrollo local sin Docker

Backend:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.10"
cd backend
.\mvnw.cmd spring-boot:run
```

Por defecto espera MySQL en `localhost:3307` con usuario `merch`; se puede apuntar a otro host con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

El proxy de Vite envía `/api` a `http://localhost:8080` (configurable con `VITE_API_PROXY_TARGET`).

## Problemas comunes

- **Vite no encuentra un import o un alias (`@/...`)** después del primer arranque: el dev server quedó con estado viejo al inicializarse el volumen de `node_modules`. Se resuelve con `docker compose restart frontend`.
- **Se agregaron/quitaron dependencias en `frontend/package.json`**: reconstruir la imagen y el volumen de dependencias:

  ```bash
  docker compose down
  docker volume rm merch-shop_frontend-node-modules
  docker compose up -d --build
  ```

- **El backend no conecta a MySQL**: revisar que `merch-mysql` esté `healthy` (`docker compose ps`) y que el puerto `DB_PORT` del `.env` no choque con un MySQL local.
- **No puedes iniciar sesión con las cuentas demo**: el seed solo se aplica al crear el volumen. Aplícalo a mano o recrea la base:

  ```bash
  docker compose exec -T mysql mysql -uroot -prootpass merch_shop < db/02-seed.sql
  # o: docker compose down -v && docker compose up -d --build
  ```

## Pruebas

```bash
cd frontend && npm run test:run && npm run lint && npm run typecheck
cd backend && ./mvnw verify
```

- El test de contexto del backend levanta MySQL 8.4 con **Testcontainers**, así que requiere Docker en ejecución.
- Vitest + Testing Library cubren el frontend; la cobertura se genera con `npm run test:coverage`.

## Flujo de ramas

- `main`: versiones estables.
- `develop`: integración continua de las fases.
- `feature/backend`, `feature/frontend` (y futuras `feature/<tema>`): trabajo por área; se integran en `develop` y luego `develop` pasa a `main`.

Cada push a `main`, `develop` o `feature/**` ejecuta el CI.

## Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base: repos, Compose, SQL, CI, esqueletos | Hecha |
| 2 | Auth JWT + Google OAuth + roles | Hecha |
| 3 | Catálogo: API y vista con filtros acumulativos, detalle de producto, home en rayo y 12 productos de seed | Hecha |
| 4 | Admin (productos, stock, pedidos) + scraper | Pendiente |
| 5 | Carrito localStorage y pedidos con reserva de stock | Pendiente |
| 6 | Stripe Payment Element y webhooks idempotentes | Pendiente |
| 7 | Rediseño de interfaces (sistema de diseño, responsive, accesibilidad) | Pendiente |
| 8 | Calidad, métricas y pruebas de carga con k6 | Pendiente |
| 9 | Despliegue en Azure | Pendiente |

## Notas de decisiones

- **MySQL 8.4** fue confirmado como base de datos; se descarta PostgreSQL.
- Se usa **Spring Boot 4.1** (Java 21): es la rama estable actual de Spring Boot; los ejemplos de la versión 3.x pueden diferir en nombres de starters (`spring-boot-starter-webmvc`) y en la API de Spring Security.
- **Spring Boot 4 usa Jackson 3** (`tools.jackson.databind`); las importaciones clásicas de `com.fasterxml.jackson` no están en el classpath.
- La autenticación usa **JWT propio** (sin servidor de identidad externo) para mantener el proyecto autocontenido; el contrato está en `/api/auth/*`.
- Los productos del seed aún no tienen imágenes: se generan con el scraper en la Fase 4; mientras tanto el catálogo usa placeholders.
