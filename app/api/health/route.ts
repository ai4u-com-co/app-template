import { withApiHandler } from "@ai4u/platform/http"
import { getHealthStatus } from "@/lib/health"

export const GET = withApiHandler(async () => {
  return Response.json(getHealthStatus())
}, { label: "health" })
