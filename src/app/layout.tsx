import type { Metadata } from "next";
import "./styles/fonts.css";
import "./styles/globals.css";
import "./styles/transactions.css";
import "./styles/theme.css";
import "./styles/dark-theme.css";
import "./styles/premium-palette.css";
import "./styles/features.css";
import "./styles/premium.css";
import "./styles/vitrea-ui.css";
import "./styles/theme-system.css";
import "./styles/reports.css";
import "./styles/studio.css";
import "./styles/nivora-motion.css";
import "./styles/motion-polish.css";
import "./styles/toast.css";
import "./styles/mobile.css";

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

const themeBootstrap = `(function(){try{var t=localStorage.getItem("nivora-theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",t==="dark"?"#070709":"#f7f7f4");});if(sessionStorage.getItem("nivora-splash")==="seen"){document.documentElement.dataset.splash="seen";}}catch(e){}})();`;

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
