// Environment files, stored in Bitwarden. One vault item (ITEM) holds one attachment per
// environment: `.env.local`, `.env.production`, ... Attachments, not fields, because some values
// (base64 of a provisioning profile) are larger than a Bitwarden field allows.
//
// Local file per environment: `local` is `.env`, anything else `.env.<env>`.
// Needs the Bitwarden CLI, logged in and unlocked: export BW_SESSION=$(bw unlock --raw)
//
//   pull <env>                          Bitwarden -> local file
//   push <env>                          local file -> Bitwarden
//   get <env> <key>                     print one value (from Bitwarden)
//   set <env> <key> <value>             change one value in Bitwarden and the local file
//   set <env> <key> --file <path>       same, with the file's contents as base64
//   unset <env> <key>                   remove one key
//   keys <env>                          list the keys
//   example                             write .env.example: all local env files without values
//   dokku <env>                         push the values to Dokku config (web app)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ITEM = 'tafelrush'
const DOKKU = { host: 'dokku@weteling.com', app: 'tafelrush' }
const root = join(import.meta.dirname, '..')

const fileFor = (env) => join(root, env === 'local' ? '.env' : `.env.${env}`)
const attachmentFor = (env) => `.env.${env}`

function fail(message) {
  console.error(message)
  process.exit(1)
}

// Parsing keeps comments and order, so a pull/push round trip leaves the file as it was.
export function parse(text) {
  return text.split('\n').map((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) return { line }
    let value = match[2].trim()
    if (/^'.*'$/.test(value)) value = value.slice(1, -1)
    else if (/^".*"$/.test(value))
      value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
    return { key: match[1], value }
  })
}

function quote(value) {
  if (/^[A-Za-z0-9_./:@+=,-]*$/.test(value)) return value
  if (!value.includes("'") && !value.includes('\n')) return `'${value}'`
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

export function serialize(entries) {
  return entries.map((e) => (e.key ? `${e.key}=${quote(e.value)}` : e.line)).join('\n')
}

function bw(args, options = {}) {
  if (!process.env.BW_SESSION)
    fail('Bitwarden is locked. Run: export BW_SESSION=$(bw unlock --raw)')
  try {
    return execFileSync('bw', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
  } catch (error) {
    fail(`bw ${args[0]} ${args[1] ?? ''} failed: ${error.stderr || error.message}`)
  }
}

let synced = false
function item() {
  if (!synced) bw(['sync'])
  synced = true
  const items = JSON.parse(bw(['list', 'items', '--search', ITEM])).filter((i) => i.name === ITEM)
  if (items.length > 1) fail(`More than one Bitwarden item named "${ITEM}".`)
  if (items.length === 0) {
    const template = {
      type: 2,
      name: ITEM,
      notes: 'Environment files for Tafel Rush, see scripts/env.mjs.',
      secureNote: { type: 0 },
    }
    const encoded = Buffer.from(JSON.stringify(template)).toString('base64')
    console.log(`Created Bitwarden item "${ITEM}".`)
    return JSON.parse(bw(['create', 'item', encoded]))
  }
  return items[0]
}

function download(env, { optional = false } = {}) {
  const it = item()
  const attachment = (it.attachments ?? []).find((a) => a.fileName === attachmentFor(env))
  if (!attachment && optional) return ''
  if (!attachment)
    fail(
      `No ${attachmentFor(env)} on Bitwarden item "${ITEM}". Create it with: make push-env ENV=${env}`,
    )
  return bw(['get', 'attachment', attachment.id, '--itemid', it.id, '--raw'])
}

function upload(env, text) {
  const it = item()
  const dir = mkdtempSync(join(tmpdir(), 'env-'))
  const file = join(dir, attachmentFor(env))
  try {
    writeFileSync(file, text, { mode: 0o600 })
    // Upload first, then remove the old one, so a failed upload never loses the environment.
    const old = (it.attachments ?? []).filter((a) => a.fileName === attachmentFor(env))
    bw(['create', 'attachment', '--file', file, '--itemid', it.id])
    for (const a of old) bw(['delete', 'attachment', a.id, '--itemid', it.id])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function write(env, text) {
  writeFileSync(fileFor(env), text.endsWith('\n') ? text : text + '\n', { mode: 0o600 })
}

function readLocal(env) {
  if (!existsSync(fileFor(env)))
    fail(`${fileFor(env)} does not exist. Pull it first: make env ENV=${env}`)
  return readFileSync(fileFor(env), 'utf8')
}

function main([command, env, key, ...rest]) {
  const needEnv = () => env || fail('Which environment? For example: local, production.')
  const needKey = () => key || fail('Which key?')

  switch (command) {
    case 'pull': {
      write(needEnv(), download(env))
      console.log(`${fileFor(env)} written from Bitwarden.`)
      break
    }
    case 'push': {
      upload(needEnv(), readLocal(env))
      console.log(`${fileFor(env)} stored in Bitwarden as ${attachmentFor(env)}.`)
      break
    }
    case 'get': {
      needEnv()
      const entry = parse(download(env)).find((e) => e.key === needKey())
      if (!entry) fail(`${key} is not set in ${env}.`)
      process.stdout.write(entry.value + '\n')
      break
    }
    case 'set':
    case 'unset': {
      needEnv()
      needKey()
      let value
      if (command === 'set') {
        if (rest[0] === '--file')
          value = readFileSync(rest[1] ?? fail('Which file?')).toString('base64')
        else if (rest.length) value = rest.join(' ')
        else fail('Which value? Or --file <path> for a file as base64.')
      }
      const current = download(env, { optional: true }).replace(/\n$/, '')
      let entries = current ? parse(current) : []
      const existing = entries.find((e) => e.key === key)
      if (command === 'unset') entries = entries.filter((e) => e.key !== key)
      else if (existing) existing.value = value
      else entries.push({ key, value })
      const text = serialize(entries)
      upload(env, text + '\n')
      write(env, text)
      console.log(
        `${key} ${command === 'set' ? (existing ? 'updated' : 'added') : 'removed'} in ${env} (Bitwarden and ${fileFor(env)}).`,
      )
      break
    }
    case 'keys': {
      for (const e of parse(download(needEnv()))) if (e.key) console.log(e.key)
      break
    }
    case 'example': {
      const envs = readdirSync(root)
        .filter((f) => f === '.env' || (/^\.env\.[a-z]+$/.test(f) && f !== '.env.example'))
        .map((f) => (f === '.env' ? 'local' : f.slice(5)))
      const out = [
        '# Generated by `make env-example`: every environment file with the values left out.',
        '# The values live in Bitwarden (item "tafelrush"). `make env ENV=<env>` pulls them.',
      ]
      for (const name of envs.sort()) {
        out.push('', `# ==== ${name}: ${name === 'local' ? '.env' : `.env.${name}`}`)
        const entries = parse(readFileSync(fileFor(name), 'utf8').replace(/\n$/, ''))
        out.push(...entries.map((e) => (e.key ? `${e.key}=` : e.line)))
      }
      writeFileSync(join(root, '.env.example'), out.join('\n') + '\n')
      console.log(`.env.example written for: ${envs.join(', ')}`)
      break
    }
    case 'dokku': {
      const pairs = parse(readLocal(needEnv()))
        .filter((e) => e.key)
        .map((e) => `${e.key}=${Buffer.from(e.value).toString('base64')}`)
      if (!pairs.length) fail(`No keys in ${fileFor(env)}.`)
      execFileSync('ssh', [DOKKU.host, 'config:set', '--encoded', DOKKU.app, ...pairs], {
        stdio: 'inherit',
      })
      break
    }
    default:
      fail(
        'Usage: node scripts/env.mjs pull|push|get|set|unset|keys|example|dokku <env> [key] [value]',
      )
  }
}

if (import.meta.main) main(process.argv.slice(2))
