import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./transactions.css";
import "./theme.css";
import "./dark-theme.css";
import "./premium-palette.css";
import "./features.css";
import "./premium.css";
import "./vitrea-ui.css";

export const metadata: Metadata = {
  title: "Nivora — Clarity for every financial decision",
  description: "A clear, private home for your financial decisions.",
};

export const viewport: Viewport = {
  themeColor: "#111315",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
