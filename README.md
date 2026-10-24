# Archiversal

A casual architecture guessing game. Study a building's drawings and photographs on a drafting board, open
the hints if you want them, then guess the building, its architect, its country and its era. No scores, no timers.

280 buildings, from the Great Pyramid to the Elbphilharmonie, with a deep Portuguese and Brazilian selection.

## Run locally

```
./gradlew bootRun            # Spring Boot API on :8090
cd frontend && npm install && npm run dev   # Vite on :5173, proxies /api to :8090
```

Checks: `./gradlew test`, and in `frontend/`: `npx vitest run`, `npm run lint`, `npm run build`.

## Deploy (Vercel)

The deployed site is fully static; there is no Java server in production. `vercel.json` runs
`npm run build:static`, which turns `src/main/resources/data/buildings.json` into static JSON files
(`frontend/scripts/build-static-api.mjs`) and builds the app so the browser picks the random building itself.

1. Push to GitHub, then import the repository at vercel.com/new. Leave the framework preset alone; `vercel.json`
   sets the install and build commands and the output directory.
2. Every push to `main` redeploys.

Before shipping a data change, run `./gradlew test`: the Java `BuildingValidator` is what checks the catalogue
(unique ids, an exterior and an interior photo on every building, valid Wikimedia URLs, crops in range).

## Images, facts and licences

- Every image is hotlinked from [Wikimedia Commons](https://commons.wikimedia.org/) under a Creative Commons or
  public-domain licence. Each one carries its author, licence and source page in `buildings.json`, shown at the reveal.
- Building facts, hints and summaries are adapted from [Wikipedia](https://www.wikipedia.org/) and are shared under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Photographs of recent buildings and of interiors may be covered by the architect's or owner's rights in some
  countries (freedom of panorama rarely covers interiors). If you are the rights holder and want an image removed,
  open an issue.

## Licence

The code is released under the [MIT licence](LICENSE). The catalogue text and images keep the licences described above.

## Layout

`src/` Spring Boot API and the catalogue (`src/main/resources/data/buildings.json`) · `frontend/` React + Vite app ·
`CLAUDE.md` project notes for AI-assisted sessions · `DESIGN.md` / `PRODUCT.md` design and product context.
