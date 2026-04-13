# Deploy naar Vercel + Neon Postgres

Stap-voor-stap handleiding om TimeTrack gratis live te zetten.

---

## Stap 1 — Code naar GitHub pushen

Vanuit de `timetrack` map:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<jouw-username>/timetrack.git
git push -u origin main
```

---

## Stap 2 — Neon database aanmaken

1. Ga naar [neon.tech](https://neon.tech) en log in (of registreer) met GitHub.
2. Klik **"New Project"**.
3. Vul in:
   - **Name:** `timetrack`
   - **Postgres version:** 16 (default)
   - **Region:** Europe (Frankfurt) — dichtbij voor snelheid
4. Klik **"Create project"**.
5. Je krijgt meteen een **Connection string** te zien, iets als:
   ```
   postgresql://neondb_owner:xxx@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
6. **Kopieer deze string** — je hebt hem zo nodig.

---

## Stap 3 — Lokale database migratie uitvoeren

Voor de **allereerste keer** moet je de tabelstructuur naar Neon pushen vanaf je lokale machine:

```bash
# Maak een .env bestand aan
echo 'DATABASE_URL="<jouw-neon-connection-string>"' > .env

# Creëer de migration en push naar Neon
npx prisma migrate dev --name init

# (Optioneel) seed met voorbeelddata
npm run db:seed
```

Je ziet nu de tabellen in Neon (via hun web-UI onder **Tables**).

---

## Stap 4 — Deployen op Vercel

1. Ga naar [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → kies je `timetrack` repo.
3. Bij **Environment Variables**, voeg toe:
   - **Name:** `DATABASE_URL`
   - **Value:** je Neon connection string (dezelfde als in stap 2)
4. Klik **"Deploy"**.

Vercel voert automatisch `npm run build` uit, wat `prisma migrate deploy` meeneemt. Na ~1 minuut is je app live op een URL als `https://timetrack-xxx.vercel.app`.

---

## Schema wijzigen na deploy

Als je later iets wijzigt in `prisma/schema.prisma`:

```bash
# Lokaal: maak nieuwe migration
npx prisma migrate dev --name <beschrijving-wijziging>

# Push naar GitHub — Vercel deploy triggert migrate deploy
git add prisma/migrations
git commit -m "Add new schema change"
git push
```

Vercel past de migraties automatisch toe op Neon bij de volgende deploy.

---

## Handige links

- **Neon dashboard:** [console.neon.tech](https://console.neon.tech)
- **Vercel dashboard:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Prisma Studio** (lokaal data bekijken): `npm run db:studio`

---

## Gratis tier limieten

- **Neon Free:** 0.5 GB opslag, 1 project met meerdere branches, automatische backup. Ruim voldoende voor een urenregistratie-app.
- **Vercel Hobby:** 100 GB bandbreedte/maand, onbeperkt aantal deployments, custom domain support.
