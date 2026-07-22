import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI4U App Template",
  description: "Plantilla base del ecosistema superAI",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
