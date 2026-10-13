// Creates credentials.json for a local iOS build from env variables, so the certificate and the
// password do not have to be on disk separately. After the build `--clean` cleans everything up again.
//
//   APPLE_DIST_CERT_P12        distribution certificate (.p12), base64
//   APPLE_DIST_CERT_PASSWORD   password of that certificate
//
// If they are not in the environment, we read them from the .envrc in the root of the repo.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const credentials = join(app, 'credentials.json')
const p12 = join(app, 'build', 'ios-dist.p12')

if (process.argv.includes('--clean')) {
  rmSync(credentials, { force: true })
  rmSync(p12, { force: true })
  process.exit(0)
}

function fromFile(file, name) {
  if (!existsSync(file)) return undefined
  const match = readFileSync(file, 'utf8').match(new RegExp(`^\\s*(?:export\\s+)?${name}=(.*)$`, 'm'))
  return match?.[1].trim().replace(/^(['"])(.*)\1$/, '$2')
}

const envrc = join(app, '..', '..', '.envrc')
const read = (name) => process.env[name] ?? fromFile(envrc, name)
const certBase64 = read('APPLE_DIST_CERT_P12')
const password = read('APPLE_DIST_CERT_PASSWORD')

if (!certBase64 || password === undefined) {
  console.error('APPLE_DIST_CERT_P12 and APPLE_DIST_CERT_PASSWORD are missing (environment or .envrc).')
  process.exit(1)
}

mkdirSync(dirname(p12), { recursive: true })
writeFileSync(p12, Buffer.from(certBase64, 'base64'), { mode: 0o600 })
writeFileSync(
  credentials,
  JSON.stringify(
    {
      ios: {
        provisioningProfilePath: '../../secrets/Tafel_Rush_AppStore.mobileprovision',
        distributionCertificate: { path: 'build/ios-dist.p12', password },
      },
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
)
console.log('credentials.json created from env')
