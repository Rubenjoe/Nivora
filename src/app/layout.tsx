import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import "./transactions.css";
import "./theme.css";
import "./dark-theme.css";
import "./premium-palette.css";
import "./features.css";
import "./premium.css";
import "./vitrea-ui.css";
import "./auth.css";
import "./theme-system.css";
import "./reports.css";
import "./studio.css";
import "./nivora-motion.css";
import "./motion-polish.css";

export const metadata: Metadata = {
  title: "Nivora — Clarity for every financial decision",
  description: "A clear, private home for your financial decisions.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101216" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
  ],
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem("nivora-theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;if(sessionStorage.getItem("nivora-splash")==="seen"){document.documentElement.dataset.splash="seen";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/ranade-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
