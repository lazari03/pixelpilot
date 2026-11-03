import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Creator Lab · PixelPilot",
  description: "A week of coding, creativity and thoughtful AI practice.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
