import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The deploy config is a protection too: these fail if a header that keeps the site safe is weakened.
const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
const everywhere = config.headers.find((h) => h.source === '/(.*)').headers
const header = (name) => everywhere.find((h) => h.key === name)?.value
const policy = Object.fromEntries(
  header('Content-Security-Policy')
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .filter(([name]) => name)
    .map(([name, ...sources]) => [name, sources]),
)

describe('deploy headers', () => {
  it('only runs scripts from the site itself', () => {
    expect(policy['script-src']).toEqual(["'self'"])
    expect(policy['default-src']).toEqual(["'self'"])
  })

  it('loads images only from the site and Wikimedia, and talks only to itself and the accounts service', () => {
    // Avatars are drawings in the page, so accounts add no image source (no Google or Supabase pictures).
    expect(policy['img-src']).toEqual(["'self'", 'data:', 'https://upload.wikimedia.org'])
    expect(policy['connect-src']).toEqual(["'self'", 'https://ysncbyofopifexkwejdc.supabase.co'])
    // Signing in is a full-page visit to Google and back: no frame, no form post and no foreign script is needed.
    expect(policy['frame-src']).toBeUndefined()
    expect(policy['form-action']).toEqual(["'self'"])
  })

  it('blocks plugins, framing and base-tag tricks, and allows only its own manifest', () => {
    expect(policy['object-src']).toEqual(["'none'"])
    expect(policy['frame-ancestors']).toEqual(["'none'"])
    expect(policy['base-uri']).toEqual(["'self'"])
    expect(policy['manifest-src']).toEqual(["'self'"])
  })

  it('stops content sniffing and trims the referrer', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('serves the manifest with its own content type', () => {
    const manifest = config.headers.find((h) => h.source === '/manifest.webmanifest')
    expect(manifest.headers[0]).toEqual({ key: 'Content-Type', value: 'application/manifest+json' })
  })
})

describe('transport and isolation headers', () => {
  it('forces https for a long time and upgrades stray http requests', () => {
    expect(Number(/max-age=(\d+)/.exec(header('Strict-Transport-Security'))?.[1])).toBeGreaterThanOrEqual(31_536_000)
    expect(policy['upgrade-insecure-requests']).toEqual([])
  })

  it('refuses framing, and isolates the page from other origins', () => {
    expect(header('X-Frame-Options')).toBe('DENY')
    expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(header('Cross-Origin-Resource-Policy')).toBe('same-origin')
  })

  it('switches off the browser features the site never uses', () => {
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(header('Permissions-Policy')).toContain(`${feature}=()`)
    }
  })
})

describe('repository hygiene', () => {
  const root = new URL('../../', import.meta.url)
  const read = (file) => readFileSync(new URL(file, root), 'utf8')

  it('pins the Gradle download to a checksum', () => {
    expect(read('gradle/wrapper/gradle-wrapper.properties')).toMatch(/^distributionSha256Sum=[0-9a-f]{64}$/m)
  })

  it('keeps secrets and local data out of git', () => {
    const rules = read('.gitignore').split('\n').map((line) => line.trim())
    for (const rule of ['.env', '.env.*', '*.pem', '*.key', '*.db', '*.log']) expect(rules).toContain(rule)
  })

  it('ships no Supabase secret: only the public key is read, and only from the environment', () => {
    let files
    try {
      files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
    } catch {
      return // not a git checkout
    }
    const text = files.filter((f) => /\.(js|jsx|mjs|json|md|sql|html|example|properties|toml|ya?ml)$/.test(f) && !f.includes('package-lock'))
    const leaks = text.filter((f) => {
      let body
      try {
        body = read(f)
      } catch {
        return false // listed but deleted in the working tree
      }
      // A JWT (the old anon and service-role keys are JWTs) or a new-style secret key, written out anywhere.
      return /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_]{8,}|SERVICE_ROLE_KEY\s*=\s*\S/.test(body)
    })
    expect(leaks).toEqual([])
    expect(read('frontend/.env.example')).toMatch(/^VITE_SUPABASE_URL=$/m)
    expect(read('frontend/.env.example')).toMatch(/^VITE_SUPABASE_ANON_KEY=$/m)
  })

  it('never renders text as markup', () => {
    const sources = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'frontend/src'], { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => /\.jsx?$/.test(f) && !f.endsWith('.test.js'))
    const risky = sources.filter((f) => {
      try {
        return /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|document\.write/.test(read(f))
      } catch {
        return false
      }
    })
    expect(risky).toEqual([])
  })

  it('has no secret-looking file under version control', () => {
    let files
    try {
      files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n')
    } catch {
      return // not a git checkout (a source archive): nothing to inspect
    }
    const risky = files.filter((f) => /(^|\/)\.env(\.|$)|\.(pem|key|p12|jks|keystore|db|sqlite)$|id_rsa/i.test(f) && !f.endsWith('.env.example'))
    expect(risky).toEqual([])
  })
})
