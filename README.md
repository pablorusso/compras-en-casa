# 🛒 Compras en Casa

App familiar para armar la lista semanal de compras y compartirla por WhatsApp/mail con quien hace las compras. Pensada para usar 100% desde el celular o tablet.

## Features

- **Maestro de productos** con categorías (lugar de compra) y subcategorías (tipo). Emojis autogenerados con Gemini.
- **Listas semanales** que arrancan auto-pobladas desde el maestro.
- **Cantidades inteligentes**: cada item sugiere la moda de las últimas 3 listas publicadas (si difiere del default).
- **Productos por temporada**: las frutillas sólo aparecen en sus meses.
- **Publicación**: una sola lista pública estable en `/lista` + links de un solo uso con expiración 24 h (`/share/[token]`) para mandar por WhatsApp.
- **Checkboxes** en la vista compartida (persisten en `localStorage` del comprador, no vuelven al server).
- **Copiar al portapapeles**: texto plano agrupado por categoría, ideal para WhatsApp.
- **Histórico** acotado (default 10 listas).
- **Auth** simple: un password admin (bcrypt en DB) + cookie de sesión firmada.
- **Mobile-first** con bottom nav, modo claro/oscuro, animaciones suaves.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Neon Postgres · Drizzle ORM · iron-session · Gemini 2.5 Flash · framer-motion · vaul · sonner

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
- **GEMINI_API_KEY**: pedila en [Google AI Studio](https://aistudio.google.com/apikey). El free tier alcanza de sobra (los emojis se cachean en DB y sólo se piden al crear/editar).

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

Abrí http://localhost:3000. La primera vez vas a la pantalla de login donde definís el password admin inicial. Después, cargá categorías → productos → iniciá tu primera lista.

## Deploy en Vercel

1. Subí el repo a GitHub.
2. Importá el proyecto en [Vercel](https://vercel.com/new).
3. Conectá la integración Neon desde Vercel (Settings → Integrations → Neon) — autocompleta `DATABASE_URL`.
4. Agregá `SESSION_SECRET` y `GEMINI_API_KEY` en Settings → Environment Variables.
5. En el primer deploy, ejecutá las migraciones contra Neon prod desde tu máquina:
   ```bash
   DATABASE_URL="<la-de-prod>" npm run db:push
   ```
6. Listo. La URL pública queda en `https://<tu-proyecto>.vercel.app/lista`.

## Estructura

```
src/
├── app/
│   ├── admin/          # área autenticada (CRUD + lista + ajustes)
│   ├── lista/          # vista pública estable de la lista publicada
│   ├── share/[token]/  # vista temporal con checkboxes (24 h)
│   └── login/
├── actions/            # Server Actions (auth, categorías, productos, listas, ajustes)
├── components/         # UI (shadcn + componentes propios)
├── db/                 # schema Drizzle + cliente Neon + migraciones
├── lib/                # session, emoji (Gemini), quantities (moda), lists, share, format
└── middleware.ts       # protección de /admin
```

## Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | servidor local |
| `npm run build` | build de producción |
| `npm run db:push` | sincronizar schema con la DB |
| `npm run db:generate` | generar migración SQL desde el schema |
| `npm run db:studio` | UI web para inspeccionar la DB |

## Roadmap (v2)

- Precios sugeridos por producto vía API/scraping según ubicación (Belgrano, CABA por default).
- Foto opcional por producto.
- Métricas: cuánto sale la lista esta semana vs. promedio.

---

Hecho con cariño para usar en familia 🛒
