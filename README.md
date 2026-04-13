# TimeTrack — Projectmanagement & Urenregistratie

## Lokaal ontwikkelen

```bash
# 1. Installeer dependencies
npm install

# 2. Maak een .env bestand aan met je Postgres connection string
cp .env.example .env
# → Open .env en plak je eigen DATABASE_URL

# 3. Voer de database migraties uit
npx prisma migrate dev --name init

# 4. (Optioneel) seed met voorbeelddata
npm run db:seed

# 5. Start de development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

### Lokale database

Je kunt voor lokaal ontwikkelen dezelfde Neon-database gebruiken als in productie (Neon geeft gratis branches), of een lokale Postgres draaien via Docker:

```bash
docker run --name timetrack-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:dev@localhost:5432/postgres"
```

## Deployen

Zie **[DEPLOY.md](./DEPLOY.md)** voor een stap-voor-stap handleiding om gratis live te gaan op Vercel + Neon.

## Tech stack

- **Next.js 15** (App Router)
- **Prisma ORM** met Postgres (Neon in productie)
- **Tailwind CSS v4**
- **Recharts** voor grafieken

## Commands

```bash
npm run dev         # Development server
npm run build       # Productie build (incl. migraties)
npm run db:migrate  # Nieuwe migratie aanmaken
npm run db:seed     # Voorbeelddata laden
npm run db:studio   # Prisma Studio (visuele database editor)
```

## Projectstructuur

```
prisma/
  schema.prisma     # Datamodel
  seed.mjs          # Voorbeelddata
src/
  app/
    page.js              # Dashboard (projectoverzicht)
    project/[id]/page.js # Project detail + Planning & Realisatie tabellen
    team/page.js         # Teamleden beheer
    stats/page.js        # Statistieken & rapportage
    api/                  # REST API routes
  components/            # Herbruikbare UI componenten
  lib/
    prisma.js            # Prisma client singleton
    api.js               # Frontend API helpers
    utils.js             # Hulpfuncties
```
