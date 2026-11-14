import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "خانه‌راه | رزرو اقامتگاه",
  description: "اقامتگاه دلخواهت را پیدا کن و با خیال راحت راهی سفر شو.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" className={cn("font-sans", geist.variable)}><body>{children}</body></html>;
}
