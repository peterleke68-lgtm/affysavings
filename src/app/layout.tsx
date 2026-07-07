import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: "AFFY SAVINGS - Digital Banking & Strict Savings Platform",
  description: "Modern premium secure digital wallets and financial services simulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

