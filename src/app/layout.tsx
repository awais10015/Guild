import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ThemeProvider } from "@/components/layout/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Guild — Hire trusted local professionals worldwide",
    template: "%s · Guild",
  },
  description:
    "Guild connects customers with verified local professionals: electricians, plumbers, carpenters, AC technicians, cleaners, photographers and more. Compare profiles, request quotations and book with confidence.",
  keywords: ["Guild", "local services", "worldwide", "electrician", "plumber", "home services", "marketplace"],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Guild — Skilled professionals, on demand, worldwide",
    description: "Find, compare and book verified local professionals.",
    siteName: "Guild",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NavigationProgress />
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
