import "./globals.css";

export const metadata = {
  title: "TimeTrack — Projectmanagement & Urenregistratie",
  description: "Beheer projecten, registreer uren en bekijk rapportages.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
