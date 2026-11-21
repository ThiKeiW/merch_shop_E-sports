# Frontend — Merch//Shop

SPA en React 19 + TypeScript + Vite 8 + Tailwind CSS v4.

La documentación general del proyecto (arranque, base de datos, ramas y fases) está en el [README raíz](../README.md).

```bash
npm install
npm run dev        # http://localhost:5173, proxy /api -> :8080
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run test:run   # vitest
```

## Organización

```
src/
├─ features/
│  ├─ auth/       Fase 2: login, registro, Google OAuth, JWT
│  ├─ catalog/    Fase 3: home en rayo, listado y detalle con filtros
│  ├─ cart/       Fase 5: carrito persistente en localStorage
│  ├─ checkout/   Fase 5: confirmación del pedido
│  ├─ payment/    Fase 6: Payment Element, reconciliación e invalidación del catálogo
│  ├─ orders/     Fase 5: historial, detalle y cancelación
│  └─ admin/      Fase 4: productos y stock; pedidos en Fase 5
├─ shared/
│  └─ api/        Cliente HTTP tipado sobre /api
└─ test/          Configuración de Vitest y Testing Library
```
