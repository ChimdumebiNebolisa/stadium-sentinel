import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

export const landingSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-landing-sans",
});

export const landingMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-landing-mono",
});

export const landingFontClassName = `${landingSans.variable} ${landingMono.variable}`;
