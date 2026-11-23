# Pruebas de carga (Fase 8)

Suite de k6 con backend en perfil `loadtest`, Stripe simulado, Prometheus y
Grafana. El frontend queda fuera del stack de carga para no competir por CPU.

El informe de la corrida de referencia está en [INFORME.md](INFORME.md).

## Estructura

```
loadtest/
  compose.loadtest.yaml        # override de compose.yaml (backend + monitoreo + k6)
  k6/                          # escenarios y utilidades
  prometheus/prometheus.yml    # scrape de /actuator/prometheus
  grafana/                     # datasource y dashboard provisionados
  sql/                         # seed y reset de stock
  results/                     # salida JSON de k6 (ignorada por Git; solo .gitkeep se versiona)
```

## Preparación

1. Levanta MySQL, backend, Prometheus y Grafana (sin frontend):

   ```powershell
   docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml up -d --build mysql backend prometheus grafana
   ```

2. Espera a que el backend esté sano:

   ```powershell
   curl.exe -fsS http://localhost:8080/actuator/health
   ```

3. Carga el seed de stock (deja todo el catálogo con stock alto y la variante
   `5204` con 1 unidad para `stock-race`):

   ```powershell
   Get-Content loadtest/sql/seed-loadtest.sql | docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml exec -T mysql mysql -umerch -pmerchpass merch_shop
   ```

   En bash/Linux:

   ```bash
   docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml exec -T mysql mysql -umerch -pmerchpass merch_shop < loadtest/sql/seed-loadtest.sql
   ```

4. Abre Grafana en http://localhost:3000 (`admin` / `admin`) y Prometheus en
   http://localhost:9090. El dashboard **Merch Shop - Carga** se provisiona solo.

## Escenarios

| Script | Objetivo | VUs por defecto |
|---|---|---|
| `smoke.js` | Validar el flujo completo una vez | 1 |
| `browse.js` | Catálogo, detalle y facets | rampa hasta 500 |
| `shopper.js` | Catálogo + pedido + intent + webhook | rampa hasta 300 |
| `checkout.js` | Pedido + intent + webhook con variante fija | rampa hasta 100 |
| `journey.js` | Mezcla 70% browse / 20% shopper / 10% checkout | 70/20/10 |
| `soak.js` | Carga sostenida 30 min | 50 |
| `spike.js` | Pico de 0 a 500 VUs en 30 s | 500 |
| `stock-race.js` | 50 usuarios comprando la última unidad | 50 |

Los escenarios usan `BASE_URL` (por defecto `http://localhost:8080` fuera de
Docker y `http://backend:8080` dentro de la red de compose) y las credenciales
`LOADTEST_EMAIL` / `LOADTEST_PASSWORD`.

## Ejecución

Smoke:

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run --summary-export=/results/smoke.json /scripts/smoke.js
```

Catálogo con rampa completa:

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e MAX_VUS=500 --summary-export=/results/browse.json /scripts/browse.js
```

Mezcla 70/20/10:

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e DURATION=10m --summary-export=/results/journey.json /scripts/journey.js
```

Soak y spike:

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e VUS=50 -e DURATION=30m --summary-export=/results/soak.json /scripts/soak.js
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e MAX_VUS=500 --summary-export=/results/spike.json /scripts/spike.js
```

### Prueba de última unidad

`stock-race` necesita que la variante `5204` tenga stock 1 antes de cada corrida:

```powershell
Get-Content loadtest/sql/reset-stock-race.sql | docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml exec -T mysql mysql -umerch -pmerchpass merch_shop
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml --profile k6 run --rm k6 run -e VUS=50 --summary-export=/results/stock-race.json /scripts/stock-race.js
```

Resultado esperado: exactamente **1** pedido `201`, el resto `409`, y el umbral
`stock_race_success: count==1` en verde. La variante queda con stock 0.

## Umbrales

- 100 VUs: `p95 < 800 ms` y errores < 1%.
- 500 VUs: `p95 < 1500 ms` y errores < 2%.
- `stock-race`: 1 éxito, sin respuestas inesperadas.

Los umbrales exactos están en `options.thresholds` de cada script; k6 devuelve
código de salida distinto de cero si alguno falla.

## Stripe en carga

Con el perfil `loadtest` se usa `LoadtestStripeGateway`:

- No llama a la API real de Stripe.
- Genera `pi_loadtest_<orderCode>` y un `clientSecret` determinista.
- El estado del intent se controla con `LOADTEST_PAYMENT_STATUS`
  (`requires_payment_method` por defecto; `succeeded` para confirmar sin webhook).
- El webhook acepta payloads sin firma; los escenarios envían
  `payment_intent.succeeded` para cerrar el pedido.

## Recursos

El entorno local de referencia tiene Docker con 4 CPU y ~4 GB de RAM. Empieza
por `smoke`, luego `MAX_VUS=100` y sube de forma gradual. El override excluye el
frontend automáticamente; si ya estaba levantado, deténlo con
`docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml stop frontend`.

## Limpieza

```powershell
docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml down
```

Usa `down -v` solo si quieres borrar también los datos de MySQL y Grafana.
