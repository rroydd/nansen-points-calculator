import type { Metadata } from "next";
import "./globals.css";
import { config } from "./config";
export const metadata: Metadata = { title: `${config.title} | Alpha Tools`, description: config.description };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
