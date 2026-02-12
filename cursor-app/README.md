# Cursor demo (Pixel trail)

React + TypeScript + Tailwind app with the **PixelCursorTrail** component in `src/components/ui/pixel-trail.tsx`.

## Run

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173). Move the cursor to see the pixel trail.

## Structure

- **`src/components/ui/`** — UI components (shadcn-style path). `pixel-trail.tsx` lives here.
- **`src/index.css`** — Tailwind + theme variables (`--background`, `--foreground`) for `bg-background` / `text-foreground`.
- **`@/`** — Path alias to `src/` (see `vite.config.ts` and `tsconfig.app.json`).

## Adding shadcn/ui

To use the full shadcn component library:

```bash
npx shadcn@latest init
```

Pick the default style and use **`src/components`** as the component path so that `src/components/ui` stays the default. Then add components with:

```bash
npx shadcn@latest add button
```

## Dependencies

- **React 19** + **TypeScript**
- **Vite** + **@vitejs/plugin-react**
- **Tailwind CSS v4** via **@tailwindcss/vite**

No extra deps for the pixel trail (no icons or images).
