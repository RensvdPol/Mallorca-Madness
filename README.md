# Mallorca Madness

Een mobiele React/Vite-webapp gekoppeld aan Supabase.

## Lokaal starten

1. Kopieer `.env.example` naar `.env.local`.
2. Installeer packages: `npm install`
3. Start: `npm run dev`

## GitHub

Maak een nieuwe lege repository en upload alle bestanden uit deze map. Commit daarna naar `main`.

## Netlify

1. Kies **Add new project → Import an existing project**.
2. Koppel GitHub en selecteer de repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Voeg bij **Environment variables** toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Deploy.

`netlify.toml` bevat de buildinstellingen en SPA-redirect al.
