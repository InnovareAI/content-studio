import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const violations = []

/*
 * Check A: forbid privileged Supabase keys in the app surface.
 * The Next app must use the anon key and database RLS for tenant access.
 */
const serviceRolePattern = /service_role|SERVICE_ROLE|SUPABASE_SERVICE_ROLE/i

/*
 * Check B: keep URL slug to project resolution in one helper.
 * Every server path should call getSpace so RLS scoped lookup behavior is shared.
 */
const projectLookupPattern = ".from('projects')"
const slugLookupPattern = ".eq('slug'"

/*
 * Check C: require local SSR and browser wrappers for Supabase clients.
 * Value imports from supabase-js bypass the wrapper boundary. Type-only imports are allowed.
 */
const supabaseJsImportPattern =
  /^\s*import\s+(?!type\b)[\s\S]*?\sfrom\s+['"]@supabase\/supabase-js['"]/

function toRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/')
}

async function collectTypeScriptFiles(entryPath) {
  const stats = await stat(entryPath).catch(() => null)

  if (!stats) {
    return []
  }

  if (stats.isFile()) {
    return /\.(ts|tsx)$/.test(entryPath) ? [entryPath] : []
  }

  const entries = await readdir(entryPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => collectTypeScriptFiles(path.join(entryPath, entry.name))),
  )

  return files.flat()
}

function addViolation(file, check, message) {
  violations.push(`${file}: ${check}: ${message}`)
}

console.log('Tenant isolation guard')
console.log('Scanning app/, lib/, and middleware.ts')

const scanFiles = [
  ...(await collectTypeScriptFiles(path.join(root, 'app'))),
  ...(await collectTypeScriptFiles(path.join(root, 'lib'))),
  ...(await collectTypeScriptFiles(path.join(root, 'middleware.ts'))),
]

for (const filePath of scanFiles) {
  const file = toRelative(filePath)
  const content = await readFile(filePath, 'utf8')

  if (serviceRolePattern.test(content)) {
    addViolation(file, 'Check A', 'privileged Supabase key text is not allowed')
  }

  if (
    file !== 'lib/space.ts' &&
    content.includes(projectLookupPattern) &&
    content.includes(slugLookupPattern)
  ) {
    addViolation(file, 'Check B', 'project slug resolution must use getSpace')
  }

  if (file.startsWith('app/') || file.startsWith('lib/')) {
    const lines = content.split(/\r?\n/)

    lines.forEach((line, index) => {
      if (supabaseJsImportPattern.test(line)) {
        addViolation(
          file,
          'Check C',
          `value import from @supabase/supabase-js on line ${index + 1}`,
        )
      }
    })
  }
}

if (violations.length > 0) {
  console.error('Tenant isolation guard failed')
  violations.forEach((violation) => {
    console.error(`- ${violation}`)
  })
  process.exit(1)
}

console.log('Tenant isolation guard passed')
