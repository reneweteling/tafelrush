// Writes the files that local builds and store submits need from the values in .env (repo root),
// and removes them again with --clean. So nothing secret lives on disk outside .env.
//
//   APPLE_DIST_CERT_P12, APPLE_DIST_CERT_PASSWORD   iOS distribution certificate (base64) + password
//   IOS_PROVISIONING_PROFILE                         App Store provisioning profile (base64)
//   ASC_API_KEY_P8                                   App Store Connect API key (base64)
//   PLAY_SERVICE_ACCOUNT_JSON                        Google Play service account (base64)
//
// Values come from the environment, or else from .env. `make env` pulls .env from Bitwarden.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from '../../../scripts/env.mjs'

const app = join(import.meta.dirname, '..')
const dir = join(app, 'build', 'secrets')
const credentials = join(app, 'credentials.json')

// Paths are relative to apps/mobile, the same ones eas.json and credentials.json point at.
const FILES = {
  APPLE_DIST_CERT_P12: 'build/secrets/ios-dist.p12',
  IOS_PROVISIONING_PROFILE: 'build/secrets/ios.mobileprovision',
  ASC_API_KEY_P8: 'build/secrets/asc-api-key.p8',
  PLAY_SERVICE_ACCOUNT_JSON: 'build/secrets/play-service-account.json',
}

if (process.argv.includes('--clean')) {
  rmSync(dir, { recursive: true, force: true })
  rmSync(credentials, { force: true })
  process.exit(0)
}

const dotenv = join(app, '..', '..', '.env')
const fromFile = existsSync(dotenv) ? parse(readFileSync(dotenv, 'utf8')) : []
const read = (name) => process.env[name] ?? fromFile.find((e) => e.key === name)?.value

const missing = [...Object.keys(FILES), 'APPLE_DIST_CERT_PASSWORD'].filter(
  (name) => read(name) === undefined,
)
if (missing.length) {
  console.error(
    `Missing in the environment and .env: ${missing.join(', ')}. Pull it with: make env`,
  )
  process.exit(1)
}

mkdirSync(dir, { recursive: true })
for (const [name, path] of Object.entries(FILES)) {
  writeFileSync(join(app, path), Buffer.from(read(name), 'base64'), { mode: 0o600 })
}
writeFileSync(
  credentials,
  JSON.stringify(
    {
      ios: {
        provisioningProfilePath: FILES.IOS_PROVISIONING_PROFILE,
        distributionCertificate: {
          path: FILES.APPLE_DIST_CERT_P12,
          password: read('APPLE_DIST_CERT_PASSWORD'),
        },
      },
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
)
console.log('Secret files written to build/secrets from .env')
