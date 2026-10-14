# Crawler Sheet

The World Dungeon crawler character sheet, a phone-first web app that saves
crawlers as Tabletop Forge creatures (in the `crawler_state` column). They are
hidden from the normal creature library.

It is served at `/crawler/` by the frontend container. The Dockerfile builds it
after the main app:

    npx vite build --config crawler-sheet/vite.config.js

The source of truth lives in the World Dungeon setting repo (`app/`). Copy
changes here with its `tools/sync_sheet_to_ttf.sh`. `src/generated/setting.json`
is generated there from the setting's markdown.
