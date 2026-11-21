# Frontend — Merch//Shop

SPA en React 19 + TypeScript + Vite 8 + Tailwind CSS v4.

La documentación general del proyecto (arranque, base de datos, ramas y fases) está en el [README raíz](../README.md).

```bash
npm install
npm run dev        # http://localhost:5173, proxy /api -> :8080
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run test:run   # vitest
```

Estado actual: Fase 7 completada; 44 pruebas en verde.

## Organización

```
src/
├─ features/
│  ├─ auth/       Fase 2/7: login, registro, Google OAuth, JWT y AuthShell
│  ├─ catalog/    Fase 3/7: home con video y paneles en rayo, listado y detalle con filtros
│  ├─ cart/       Fase 5: carrito persistente en localStorage
│  ├─ checkout/   Fase 5: confirmación del pedido
│  ├─ payment/    Fase 6: Payment Element, reconciliación e invalidación del catálogo
│  ├─ orders/     Fase 5: historial, detalle y cancelación
│  └─ admin/      Fase 4: productos y stock; pedidos en Fase 5
├─ shared/
│  └─ api/        Cliente HTTP tipado sobre /api
├─ index.css      Sistema visual Fase 7 y estilos globales
└─ test/          Configuración de Vitest y Testing Library

public/assets/    Video del hero y portadas de los cuatro juegos
```

## Diseño (Fase 7)

`src/index.css` concentra la paleta, la tipografía Nunito y los componentes visuales reutilizables. No hay librería de componentes nueva: las pantallas existentes se adaptaron al mismo lenguaje visual conservando sus contratos y comportamiento.

- `public/assets/hero.mp4` y `public/assets/covers/*.jpg` alimentan la home y las pantallas de autenticación.
- La franja animada del catálogo fue eliminada; el encabezado mantiene solo el título, la búsqueda y los filtros.
- Las clases `.bevel`, `.field`, `.box`, `.panel` y `.card-img` definen botones, campos, contenedores y tarjetas.
- Se respetan `focus-visible` y `prefers-reduced-motion`; las rutas de auth ocultan navbar/footer.
