import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM ESTUAR",
  description: "CRM ESTUAR – CRM aplikacija",
  openGraph: {
    title: "CRM ESTUAR",
    description: "CRM ESTUAR – CRM aplikacija",
    siteName: "CRM ESTUAR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('crm-theme');var d=document.documentElement;function dark(){d.classList.add('dark');d.style.colorScheme='dark';d.style.setProperty('--background','#09090b');d.style.setProperty('--foreground','#fafafa');}function light(){d.classList.remove('dark');d.style.colorScheme='light';d.style.setProperty('--background','#fafafa');d.style.setProperty('--foreground','#18181b');}if(t==='dark')dark();else if(t==='light')light();else if(window.matchMedia('(prefers-color-scheme: dark)').matches)dark();else light();})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
