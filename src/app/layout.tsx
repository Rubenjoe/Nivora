import type { Metadata, Viewport } from "next";
import "./dither.css";
import { AmbientDither } from "@/components/ambient-dither";
import { ShootingStars } from "@/components/ui/shooting-stars";
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
      <body>
        <div className="nivora-ambient-background" aria-hidden="true">
          <AmbientDither />
          <ShootingStars
            className="nivora-shooting-stars"
            minDelay={2600}
            maxDelay={7600}
            minSpeed={6}
            maxSpeed={12}
            starColor="#b8a8ff"
            trailColor="#73c9e7"
          />
        </div>
        {children}
      </body>
    </html>
  );
}
