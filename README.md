# RASA

Premium QR menu platform for modern cafes and restaurants.

## Local development

```bash
npm install
npm run dev
```

Then open the application in your browser using the local app URL provided by Next.js.

## Notes

- The app is designed to preserve the existing Supabase data flow and business logic.
- UI work focuses on premium visual polish, responsive layout, and improved empty/loading states.

## Server configuration

- Cafe and owner creation requires `SUPABASE_SERVICE_ROLE_KEY` in the server environment.
- Keep this key server-only; do not prefix it with `NEXT_PUBLIC_` or expose it to browser code.
- Apply `supabase/migrations/20261006000000_add_cafe_settings_fields.sql` to the existing Supabase project before using owner cafe settings.
