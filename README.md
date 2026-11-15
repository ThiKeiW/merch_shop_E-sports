# Merch//Shop — tienda de merch de e-sports

Tienda de demostración de merchandising de e-sports (League of Legends, Valorant, CS2 y Dota 2) con catálogo filtrable, carrito, checkout con Stripe y panel de administración.

Proyecto académico: **no** procesa envíos ni cobros reales.

La planeación completa está en [`plan-proyecto-merch-esports.md`](./plan-proyecto-merch-esports.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · TanStack Query · Zustand |
| Backend | Spring Boot 4.1 · Java 21 · Spring Security · Spring Data JPA · Bean Validation · Micrometer |
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

## Estructura

```
backend/    Spring Boot: config (security, CORS, async), common (errores, health)
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
| 2 | Auth JWT + Google OAuth + roles | Pendiente |
| 3 | Catálogo con filtros acumulativos y home en rayo | Pendiente |
| 4 | Admin (productos, stock, pedidos) + scraper | Pendiente |
| 5 | Carrito localStorage y pedidos con reserva de stock | Pendiente |
| 6 | Stripe Payment Element y webhooks idempotentes | Pendiente |
| 7 | Calidad, métricas y pruebas de carga con k6 | Pendiente |
| 8 | Despliegue en Azure | Pendiente |

## Notas de decisiones

- **MySQL 8.4** fue confirmado como base de datos; se descarta PostgreSQL.
- Se usa **Spring Boot 4.1** (Java 21): es la rama estable actual de Spring Boot; los ejemplos de la versión 3.x pueden diferir en nombres de starters (`spring-boot-starter-webmvc`) y en la API de Spring Security.
- Los productos del seed aún no tienen imágenes: se generan con el scraper en la Fase 4.
