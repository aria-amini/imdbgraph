#!/usr/bin/env -S vp exec tsx
//MISE description="Generate per-workspace ports and .env.development.local"
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const MASK_64 = (1n << 64n) - 1n

function rotateLeft(value: bigint, bits: bigint): bigint {
	return ((value << bits) | (value >> (64n - bits))) & MASK_64
}

type SipState = [bigint, bigint, bigint, bigint]

function sipRound(state: SipState): void {
	state[0] = (state[0] + state[1]) & MASK_64
	state[1] = rotateLeft(state[1], 13n) ^ state[0]
	state[0] = rotateLeft(state[0], 32n)
	state[2] = (state[2] + state[3]) & MASK_64
	state[3] = rotateLeft(state[3], 16n) ^ state[2]
	state[0] = (state[0] + state[3]) & MASK_64
	state[3] = rotateLeft(state[3], 21n) ^ state[0]
	state[2] = (state[2] + state[1]) & MASK_64
	state[1] = rotateLeft(state[1], 17n) ^ state[2]
	state[2] = rotateLeft(state[2], 32n)
}

// Worktrunk uses Rust's DefaultHasher (SipHash 1-3 with zero keys).
function worktrunkHash(value: string): bigint {
	const bytes = Buffer.concat([Buffer.from(value), Buffer.from([0xff])])
	const state: SipState = [
		0x736f6d6570736575n,
		0x646f72616e646f6dn,
		0x6c7967656e657261n,
		0x7465646279746573n,
	]

	let offset = 0
	while (offset + 8 <= bytes.length) {
		const message = bytes.readBigUInt64LE(offset)
		state[3] ^= message
		sipRound(state)
		state[0] ^= message
		offset += 8
	}

	let tail = (BigInt(bytes.length) << 56n) & MASK_64
	for (let index = offset; index < bytes.length; index++) {
		tail |= BigInt(bytes.readUInt8(index)) << BigInt((index - offset) * 8)
	}

	state[3] ^= tail
	sipRound(state)
	state[0] ^= tail
	state[2] ^= 0xffn
	for (let round = 0; round < 3; round++) sipRound(state)

	return state[0] ^ state[1] ^ state[2] ^ state[3]
}

function hashPort(value: string): number {
	return 10_000 + Number(worktrunkHash(value) % 10_000n)
}

function shortHash(value: string): string {
	const characters = '0123456789abcdefghijklmnopqrstuvwxyz'
	const hash = worktrunkHash(value)
	return [hash % 36n, (hash / 36n) % 36n, (hash / 1296n) % 36n]
		.map((index) => characters[Number(index)])
		.join('')
}

function sanitizeDatabaseName(value: string): string {
	let result = value
		.replace(/[A-Z]/g, (character) => character.toLowerCase())
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+/, '')
	if (!result) result = 'workspace'
	if (!/^[a-z]/.test(result)) result = `w_${result}`
	result = result.slice(0, 44)
	if (!result.endsWith('_')) result += '_'
	return `${result}${shortHash(value)}`
}

function run(command: string, args: string[]): string {
	return execFileSync(command, args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	}).trim()
}

function detectWorkspace(): { branch: string; worktree: string } {
	try {
		const root = realpathSync(run('jj', ['workspace', 'root']))
		const names = run('jj', [
			'workspace',
			'list',
			'-T',
			'self.name() ++ "\\n"',
		]).split('\n')
		const branch = names.find((name) => {
			try {
				return (
					realpathSync(run('jj', ['workspace', 'root', '--name', name])) ===
					root
				)
			} catch {
				return false
			}
		})

		if (!branch) throw new Error('Could not identify the current jj workspace')
		return { branch, worktree: basename(root) }
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Could not')) {
			throw error
		}
	}

	try {
		const root = realpathSync(run('git', ['rev-parse', '--show-toplevel']))
		const branch = run('git', ['branch', '--show-current']) || basename(root)
		return { branch, worktree: basename(root) }
	} catch {
		throw new Error('Run setup from inside a jj workspace or Git worktree')
	}
}

const POSTGRES_USER = 'app_user'
const POSTGRES_PASSWORD = 'app_dev'
const AWS_ACCESS_KEY_ID = 'app_minio'
const AWS_SECRET_ACCESS_KEY = 'app_minio_secret'

const ENV_SPEC_HEADER = ['# ---', '# @defaultSensitive=false', '# ---', '']

function updateEnvFile(
	path: string,
	groups: Record<string, string>[],
	replace = false,
): void {
	const updates: Record<string, string> = Object.assign({}, ...groups)
	const lines =
		!replace && existsSync(path)
			? readFileSync(path, 'utf8').split(/\r?\n/)
			: []
	const specIndex = lines.findIndex((line) =>
		line.includes('@defaultSensitive'),
	)
	if (specIndex === -1) {
		lines.unshift(...ENV_SPEC_HEADER)
	} else {
		if (lines[specIndex + 1]?.trim() !== '# ---') {
			lines.splice(specIndex + 1, 0, '# ---', '')
		}
		if (specIndex === 0 || lines[specIndex - 1]?.trim() !== '# ---') {
			lines.splice(specIndex, 0, '# ---')
		}
	}
	const remaining = new Set(Object.keys(updates))

	for (let index = 0; index < lines.length; index++) {
		const key = lines[index]?.match(/^\s*([^#=\s]+)\s*=/)?.[1]
		if (!key || !(key in updates)) continue

		lines[index] = `${key}="${updates[key]!}"`
		remaining.delete(key)
	}

	while (lines.at(-1) === '') lines.pop()
	for (const group of groups) {
		const pending = Object.keys(group).filter((key) => remaining.has(key))
		if (pending.length === 0) continue
		if (lines.length > 0) lines.push('')
		for (const key of pending) lines.push(`${key}="${updates[key]!}"`)
	}

	writeFileSync(path, `${lines.join('\n')}\n`)
}

// Pins the daemon port in pitchfork.local.toml (gitignored) so the pitchfork
// proxy never has to guess which listening socket is the app (vite+/nitro
// opens more than one). The port lives in the untracked file because it
// differs per workspace — a tracked port line conflicts on every rebase.
// pitchfork treats the local file as the project config, so it must carry
// the full daemon definition, not just the override.
function setDaemonPort(appPort: number): void {
	const base = 'pitchfork.toml'
	if (!existsSync(base)) return
	const contents = readFileSync(base, 'utf8').replace(/^port = \d+\n/m, '')
	writeFileSync(
		'pitchfork.local.toml',
		`${contents.trimEnd()}\nport = ${appPort}\n`,
	)
}

function readEnvFile(path: string): Record<string, string> {
	if (!existsSync(path)) return {}
	return Object.fromEntries(
		readFileSync(path, 'utf8')
			.split(/\r?\n/)
			.flatMap((line) => {
				const match = line.match(/^\s*([^#=\s]+)\s*=\s*"?([^"]*)"?$/)
				return match ? [[match[1]!, match[2]!]] : []
			}),
	)
}

function defaultWorkspaceRoot(): string {
	try {
		return realpathSync(run('jj', ['workspace', 'root', '--name', 'default']))
	} catch {
		// not a jj repo — the current directory is the root
		return realpathSync('.')
	}
}

function pitchfork(args: string[]): string {
	return execFileSync('pitchfork', args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
		timeout: 10_000,
	}).trim()
}

// The proxy TLD (settings proxy.tld) decides where slugs live. A custom TLD
// with a public suffix (e.g. lvh.example.com) makes slug URLs registrable as
// OAuth redirect URIs; the default 'localhost' TLD is not registrable.
function proxyTld(): string {
	try {
		return pitchfork(['settings', 'get', 'proxy.tld']) || 'localhost'
	} catch {
		return 'localhost'
	}
}

// Registers a stable https://<slug>.<tld> URL for the project. Only the
// default workspace registers; other jj workspaces are reached via
// https://<workspace>.<slug>.<tld> through `proxy.worktree` auto-discovery.
// Best effort: pitchfork is a local convenience, never a bootstrap blocker.
// `proxy trust` needs sudo, so it stays a one-time manual step.
function registerProxySlug(mainRoot: string): string {
	const slug = basename(mainRoot)
		.toLowerCase()
		.replaceAll(/[^a-z0-9-]/g, '-')
	if (realpathSync('.') === mainRoot) {
		try {
			pitchfork(['settings', 'set', 'proxy.enable', 'true', '--global'])
			pitchfork(['proxy', 'add', slug, '--daemon', 'dev', '--dir', mainRoot])
		} catch {
			// pitchfork unavailable — skip registration
		}
	}
	return slug
}

// Ports are stable once assigned: only regenerate when the env file is
// absent or belongs to another worktree (wt copy-ignored clones the default
// workspace's file into new workspaces, which must not keep its ports —
// and re-running setup here must not move this workspace's existing
// database or registered OAuth redirect URIs out from under it).
// A foreign file is fully rewritten so the canonical key order is restored.
function existingPorts(worktree: string): Record<string, string> {
	const entries = readEnvFile('.env.development.local')
	if (entries['WORKTREE_NAME'] !== worktree) return {}
	return entries
}

function main(): void {
	// Never honor WORKTREE_NAME/WORKTREE_BRANCH from the environment:
	// nothing legitimate sets them (wt passes template vars, not env), and
	// inherited stale values from another workspace must not steer setup.
	const { branch, worktree } = detectWorkspace()
	const compose = sanitizeDatabaseName(worktree)
	const existing = existingPorts(worktree)
	const isForeign =
		existsSync('.env.development.local') &&
		readEnvFile('.env.development.local')['WORKTREE_NAME'] !== worktree
	const database = existing['POSTGRES_DB'] ?? sanitizeDatabaseName(branch)
	const appPort = Number(existing['APP_PORT']) || hashPort(branch)
	const postgresPort =
		Number(existing['POSTGRES_PORT']) || hashPort(`db-${branch}`)
	const minioPort =
		Number(existing['MINIO_PORT']) || hashPort(`minio-${branch}`)
	const minioConsolePort =
		Number(existing['MINIO_CONSOLE_PORT']) ||
		hashPort(`minio-console-${branch}`)

	const mainRoot = defaultWorkspaceRoot()
	const tld = proxyTld()
	const proxySlug = registerProxySlug(mainRoot)
	const proxyHost =
		worktree === proxySlug
			? `${proxySlug}.${tld}`
			: `${worktree}.${proxySlug}.${tld}`

	updateEnvFile(
		'.env.development.local',
		[
			{
				APP_PORT: String(appPort),
				BASE_URL: `https://${proxyHost}`,
			},
			{
				POSTGRES_PORT: String(postgresPort),
				POSTGRES_DB: database,
				POSTGRES_USER,
				POSTGRES_PASSWORD,
				DATABASE_URL:
					'postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}',
			},
			{
				MINIO_PORT: String(minioPort),
				MINIO_CONSOLE_PORT: String(minioConsolePort),
			},
			{
				AWS_ENDPOINT_URL: 'http://localhost:${MINIO_PORT}',
				AWS_ACCESS_KEY_ID,
				AWS_SECRET_ACCESS_KEY,
				AWS_S3_BUCKET_NAME: 'app',
			},
			{
				WORKTREE_NAME: worktree,
				COMPOSE_PROJECT_NAME: compose,
			},
		],
		isForeign,
	)

	setDaemonPort(appPort)

	console.log(`Generated .env.development.local for ${branch}:`)
	console.log(`  app:      http://localhost:${appPort}`)
	console.log(`  postgres: localhost:${postgresPort}/${database}`)
	console.log(`  minio:    http://localhost:${minioPort}`)
	console.log(`  proxy:    https://${proxyHost}`)
}

main()
