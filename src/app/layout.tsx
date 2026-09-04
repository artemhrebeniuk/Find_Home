import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b1120",
};

export const metadata: Metadata = {
  title: "FindHome — Пошук приватних будинків в Україні",
  description: "Інтерактивна карта для пошуку приватних будинків, котеджів та дач по всій Україні. Купівля та оренда з персональною CRM-системою.",
  keywords: "будинок, купити будинок, оренда будинку, Україна, нерухомість, котедж, дача",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
