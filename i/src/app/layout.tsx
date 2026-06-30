import type { Metadata } from "next";
import "./globals.css";
import { SignInButton } from "@/components/SignInButton";

export const metadata: Metadata = {
  title: "Normies Chess",
  description: "A Normies NFT chess battleground built for Vercel deployment."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <nav className="nav">
            <div className="brand">
              <div className="mark">NC</div>
              <div>
                <div>Normies Chess</div>
                <div className="tiny">NFT pieces. Server-validated moves. Vercel-ready.</div>
              </div>
            </div>
            <SignInButton />
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
