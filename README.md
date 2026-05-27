# 🛒 Compras en Casa

App familiar para armar la lista semanal de compras y compartirla por WhatsApp/mail con quien hace las compras. Pensada para usar 100% desde el celular o tablet.

## Features

### Maestro de datos
- **Comercios → Categorías → Productos**: cada producto vive en un comercio (verdulería, súper, etc.) y, opcionalmente, en una categoría dentro de ese comercio. Los productos sin categoría se listan directo bajo el comercio.
- **Emojis autogenerados con IA** para comercios, categorías y productos (con fallback si la IA no está disponible).
- **Clasificación con IA**: al cargar productos, la IA sugiere a qué categoría del comercio pertenecen.
- **Organizador de categorías con IA**: por comercio, sugiere mantener/borrar/agregar categorías según los productos reales (`/admin/stores/[id]/organize`).
- **Orden persistente**: comercios y categorías se reordenan a mano (drag); el orden queda congelado en el snapshot de cada lista.
- **Exclusión del auto-add**: marcá comercios, categorías o productos para que no se sumen automáticamente a las listas nuevas.

### Listas
- **Listas semanales** auto-pobladas desde el maestro.
- **Días de compra configurables**: la lista nueva se nombra con la fecha del próximo día de compra.
- **Cantidades inteligentes**: cada item sugiere la moda de las últimas 3 listas publicadas; los pasos de cantidad se ajustan por unidad (kg, gr, litro, unidad, docenas de huevos, etc.).
- **Productos por temporada**: las frutillas sólo aparecen en sus meses.
- **Filtros** por comercio y categoría, con **búsqueda sin acentos** ni distinción de ñ.
- **Tres estados en compra**: pendiente / comprado / no hay, con barra de progreso.
- **Swipe móvil**: deslizá para ajustar cantidad o borrar; drawer para buscar y agregar productos.
- **Histórico** acotado (default 10 listas) y opción de **borrar todas las listas** (zona peligrosa en ajustes).

### Compartir e imprimir
- **Publicación**: una sola lista pública estable en `/lista` + links de un solo uso con expiración configurable (`/share/[token]`) para mandar por WhatsApp.
- **Checkboxes** en la vista compartida (persisten en `localStorage` del comprador, no vuelven al server).
- **Endpoint JSON** (`/share/[token]/json`) pensado para agentes/automatizaciones.
- **Copiar al portapapeles**: texto plano agrupado por comercio/categoría, ideal para WhatsApp.
- **Impresión en papel**: PDF A4 generado en el servidor (`@react-pdf/renderer`), con paginación automática y casillas para tildar a mano. Se abre en el visor nativo, así sale igual en cualquier dispositivo (desktop, iOS Safari, PWA instalada) sin depender del motor de impresión del navegador.

### Otros
- **Onboarding checklist** en el inicio que guía la configuración cuando no hay lista vigente.
- **Auth** simple: un password admin (bcrypt en DB) + cookie de sesión firmada.
- **Mobile-first** con bottom nav, modo claro/oscuro, animaciones suaves.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Neon Postgres · Drizzle ORM · iron-session · Groq (gpt-oss-120b) vía SDK de OpenAI · framer-motion · vaul · sonner

## Setup local

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

```bash
cp .env.example .env.local
```

- **DATABASE_URL**: creá una base en [Neon](https://console.neon.tech) (free tier) y pegá el connection string.
- **SESSION_SECRET**: cualquier string random de ≥32 caracteres. Generalo con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **GROQ_API_KEY**: pedila en [Groq Console](https://console.groq.com/keys). Las features de IA degradan con gracia si falta (los emojis se cachean en DB y sólo se piden al crear/editar).
- **DEV_SKIP_LOGIN** (opcional): poné `"true"` para saltear el login en desarrollo. Se ignora cuando `NODE_ENV=production`.

### 3. Aplicar el schema

```bash
npm run db:push
```

Esto crea las tablas en Neon. Para inspeccionarlas:

```bash
npm run db:studio
```

### 4. Levantar la app

```bash
npm run dev
```

Abrí http://localhost:3000. La primera vez vas a la pantalla de login donde definís el password admin inicial. Después, seguí el checklist de inicio: días de compra → comercios → productos → organizá categorías → iniciá tu primera lista.

## Deploy en Vercel

1. Subí el repo a GitHub.
2. Importá el proyecto en [Vercel](https://vercel.com/new).
3. Conectá la integración Neon desde Vercel (Settings → Integrations → Neon) — autocompleta `DATABASE_URL`.
4. Agregá `SESSION_SECRET` y `GROQ_API_KEY` en Settings → Environment Variables.
5. En el primer deploy, ejecutá las migraciones contra Neon prod desde tu máquina:
   ```bash
   DATABASE_URL="<la-de-prod>" npm run db:push
   ```
6. Listo. La URL pública queda en `https://<tu-proyecto>.vercel.app/lista`.

## Estructura

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx              # inicio: lista vigente u onboarding checklist
│   │   ├── list/                 # editor de la lista de compra
│   │   ├── products/             # catálogo maestro de productos
│   │   ├── stores/               # comercios y categorías
│   │   │   └── [id]/organize/    # organizador de categorías con IA
│   │   ├── history/              # histórico de listas archivadas
│   │   ├── settings/             # ajustes (días de compra, límites, zona peligrosa)
│   │   └── import/               # importación de datos
│   ├── lista/                    # vista pública estable de la lista publicada
│   ├── share/[token]/            # vista temporal con checkboxes
│   │   └── json/                 # endpoint JSON de la lista compartida
│   └── login/
├── actions/   # Server Actions (auth, stores, products, lists, classification, settings, danger, import/export)
├── components/# UI (shadcn + componentes propios)
├── db/        # schema Drizzle + cliente Neon + migraciones
└── lib/       # ai (Groq), emoji, classify, categorize, quantities (moda), units, lists, share, format, text
```

La protección de `/admin` se resuelve en el layout autenticado vía la sesión firmada (iron-session), no en un middleware.

## Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | servidor local |
| `npm run build` | build de producción |
| `npm run lint` | linter (ESLint) |
| `npm run db:push` | sincronizar schema con la DB |
| `npm run db:generate` | generar migración SQL desde el schema |
| `npm run db:studio` | UI web para inspeccionar la DB |
| `npm run db:seed` | poblar la DB con datos de ejemplo |

---

Hecho con cariño para usar en familia 🛒
