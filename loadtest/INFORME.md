# Informe de pruebas de carga — Fase 8

**Fecha:** 2026-11-22  
**Rama:** `feature/loadtest`  
**Perfil backend:** `docker,loadtest` (Stripe simulado, sin llamadas externas)  
**Frontend:** detenido durante las pruebas para no competir por CPU.

## 1. Entorno

| Componente | Configuración |
|---|---|
| Docker Desktop | 4 CPU, ~3.9 GB de RAM |
| MySQL | `mysql:8.4`, stock sembrado a 100000 por variante (5204 = 1) |
| Backend | Spring Boot 4.1.2 / Java 21, `DB_POOL_SIZE=20`, `TOMCAT_MAX_THREADS=200` |
| Observabilidad | Prometheus + Grafana (dashboard `Merch Shop - Carga`, uid `merch-loadtest`) |
| k6 | `grafana/k6:latest`, `BASE_URL=http://backend:8080` |
| Usuario de carga | `cliente@merchshop.dev` |

Se habilitó `SERVER_TOMCAT_MBEANREGISTRY_ENABLED=true` en el override de carga para exponer los gauges `tomcat_threads_*`, que no aparecen con el valor por defecto.

## 2. Corridas ejecutadas

| Escenario | VUs | Duración | Requests | Tasa | avg | p95 | p99 | Checks | Errores |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `smoke.js` | 1 | 1 iteración | 12 | 1.75/s | 119.5 ms | 382.3 ms | — | 23/23 | 0% |
| `stock-race.js` | 50 | <1 s | 51 | 70.1/s | 438.1 ms | 604.2 ms | — | 52/52 | 0 inesperados |
| `journey.js` (70/20/10) | 100 | 2 min | 34,757 | 283.3/s | 18.0 ms | 62.6 ms | 162.6 ms | 61,379/61,379 | 0% |
| `spike.js` | 500 | 3 min | 75,726 | 418.7/s | 663.2 ms | 1.68 s | 2.18 s | 126,210/126,210 | 0% |

Umbrales de k6 verificados en las cuatro corridas: todos en verde. Los JSON completos se generan en `loadtest/results/` y no se versionan; solo se conserva `.gitkeep`.

### Stock-race

- Pedidos `201`: **1**
- Pedidos `409` por stock insuficiente: **49**
- Respuestas inesperadas: **0**
- Stock final de la variante `5204`: **0**

k6 marca los `409` como `http_req_failed`; es esperado en este escenario y por eso no se aplica el umbral genérico de errores HTTP.

## 3. Métricas de negocio observadas

Al finalizar la sesión, `/actuator/prometheus` exponía:

```
merch_orders_total                 2302
merch_orders_stock_conflict_total    49
merch_payments_intents_total       2301
merch_payments_confirmed_total     2301
merch_orders_cancelled_total          0
```

Estos contadores son acumulados de todas las corridas, no de un único escenario.

## 4. Conclusión

- El flujo mixto a **100 VUs** cumple holgadamente el objetivo (p95 62.6 ms vs. 800 ms).
- El **pico a 500 VUs** se mantiene sin errores con p95 1.68 s y p99 2.18 s, dentro de los umbrales del escenario `spike` (2 s / 3 s).
- El p95 del spike supera el objetivo de 1.5 s previsto para una rampa **sostenida** a 500 VUs; como el spike incluye 30 s de subida desde 0, no es comparable directamente. Falta ejecutar `browse.js` completo (14 min) para certificar ese SLO.
- La concurrencia sobre la última unidad no generó sobreventa: exactamente un pedido ganador y 49 conflictos.

## 5. Recomendaciones

1. Ejecutar `browse.js` con `MAX_VUS=500` y `soak.js` con `DURATION=30m` antes de avalar el SLO sostenido.
2. Fijar versiones de `prom/prometheus`, `grafana/grafana` y `grafana/k6` en lugar de `latest` para reproducibilidad.
3. Añadir alertas en Grafana sobre tasa de errores 5xx, p95 y conflictos de stock.
4. Ajustar `DB_POOL_SIZE` y `TOMCAT_MAX_THREADS` según el tamaño real del entorno de producción.

## 6. Reproducción

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml up -d --build mysql backend prometheus grafana
Get-Content -Raw loadtest/sql/seed-loadtest.sql | docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml exec -T mysql mysql -umerch -pmerchpass merch_shop

docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run --summary-export=/results/smoke.json /scripts/smoke.js
Get-Content -Raw loadtest/sql/reset-stock-race.sql | docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml exec -T mysql mysql -umerch -pmerchpass merch_shop
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e VUS=50 --summary-export=/results/stock-race.json /scripts/stock-race.js
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e DURATION=2m --summary-export=/results/journey.json /scripts/journey.js
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e MAX_VUS=500 --summary-export=/results/spike.json /scripts/spike.js
```
