import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./transactions.css";
import "./theme.css";
import "./dark-theme.css";
import "./premium-palette.css";
import "./features.css";
import "./premium.css";
import "./vitrea-ui.css";
import "./theme-system.css";

export const metadata: Metadata = {
  title: "Nivora — Clarity for every financial decision",
  description: "A clear, private home for your financial decisions.",
};

export const viewport: Viewport = {
  themeColor: "#070709",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem("nivora-theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
