// Android App Links: lets tafelrush.nl/d/... open in the app directly.
// ANDROID_CERT_SHA256 holds the SHA-256 fingerprints of the signing certificates,
// comma separated (Play Console > App integrity > App signing key certificate).

import { ANDROID_PACKAGE } from '@tafelrush/shared'

export const dynamic = 'force-dynamic'

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return Response.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ])
}
