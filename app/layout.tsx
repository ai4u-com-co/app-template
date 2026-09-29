import type { Metadata, Viewport } from "next"
import { ChangelogPill } from "@/components/ChangelogPill"
import { getChangelogConfig } from "@/lib/changelog"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI4U App Template",
  description: "Plantilla base del ecosistema superAI",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

// La config del pill se lee en el servidor con lib/env (canónico + alias). Como
// toda NEXT_PUBLIC_*, cambiarla requiere redeploy.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const changelog = getChangelogConfig()
  return (
    <html lang="es">
      <body>
        {children}
        {changelog && <ChangelogPill {...changelog} />}
      </body>
    </html>
  )
}
