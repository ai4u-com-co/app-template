"use client"

import { ChangelogPill as ClientChangelogPill } from "@ai4u-labs/changelog-client"

export interface ChangelogPillProps {
  serviceUrl: string
  clientId: string
  appId: string
}

/**
 * Pill de versión + changelog (esquina inferior derecha), conectado al
 * changelog-service central vía @ai4u-labs/changelog-client.
 *
 * Recibe la config como props desde app/layout.tsx (servidor) vía
 * lib/changelog.ts: clientId/appId de .changelogrc.json (la misma fuente que el
 * hook pre-commit) y la URL de NEXT_PUBLIC_CHANGELOG_URL. No hay tenant ni
 * cliente hardcodeado acá.
 */
export function ChangelogPill({ serviceUrl, clientId, appId }: ChangelogPillProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)]">
      <ClientChangelogPill serviceUrl={serviceUrl} clientId={clientId} appId={appId} />
    </div>
  )
}
