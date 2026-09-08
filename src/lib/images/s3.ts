import {
	BucketLocationConstraint,
	CreateBucketCommand,
	GetObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { createServerOnlyFn } from '@tanstack/react-start'

import { serverEnv as env } from '@/env.server'

export interface Storage {
	put(key: string, body: Uint8Array, contentType: string): Promise<void>
	get(key: string): Promise<StoredImage | null>
}

export interface StoredImage {
	data: Uint8Array
	contentType: string | undefined
}

export interface StorageConfig {
	endpointUrl?: string
	region?: string
	bucketName?: string
	accessKeyId?: string
	secretAccessKey?: string
	// Production buckets are provisioned outside the app; creating one on
	// demand there would mask a misconfigured bucket name.
	autoCreateBucket?: boolean
}

export function createStorage(config: StorageConfig = {}): Storage {
	const bucketName = config.bucketName ?? env.AWS_S3_BUCKET_NAME
	if (!bucketName) {
		throw new Error('S3 storage is not configured (missing AWS_S3_BUCKET_NAME)')
	}
	const autoCreateBucket = config.autoCreateBucket ?? true
	const region = config.region ?? 'us-east-1'
	const accessKeyId = config.accessKeyId ?? env.AWS_ACCESS_KEY_ID
	const secretAccessKey = config.secretAccessKey ?? env.AWS_SECRET_ACCESS_KEY
	const endpoint = config.endpointUrl ?? env.AWS_ENDPOINT_URL
	const client = new S3Client({
		forcePathStyle: true,
		region,
		...(endpoint ? { endpoint } : {}),
		...(accessKeyId && secretAccessKey
			? { credentials: { accessKeyId, secretAccessKey } }
			: {}),
	})

	let bucketReady: Promise<void> | undefined
	const ensureBucket = () => {
		if (!autoCreateBucket) {
			return Promise.resolve()
		}
		bucketReady ??= createBucketIfNeeded(client, bucketName, region).catch(
			(error) => {
				bucketReady = undefined
				throw error
			},
		)
		return bucketReady
	}

	return {
		async put(key, body, contentType) {
			await ensureBucket()
			await client.send(
				new PutObjectCommand({
					Bucket: bucketName,
					Key: key,
					Body: body,
					ContentType: contentType,
				}),
			)
		},
		async get(key) {
			try {
				const output = await client.send(
					new GetObjectCommand({ Bucket: bucketName, Key: key }),
				)
				if (!output.Body) {
					return null
				}
				return {
					data: await output.Body.transformToByteArray(),
					contentType: output.ContentType,
				}
			} catch (error) {
				if (errorStatus(error) === 404 || errorName(error) === 'NoSuchKey') {
					return null
				}
				throw error
			}
		},
	}
}

let sharedStorage: Storage | undefined

/** Lazily-created server-side storage for the running app. */
export const getStorage = createServerOnlyFn(() => {
	// A client per request would rebuild TLS connections on every thumbnail.
	// Production buckets are pre-provisioned, so auto-create stays a dev
	// convenience.
	sharedStorage ??= createStorage({
		autoCreateBucket: process.env.NODE_ENV !== 'production',
	})
	return sharedStorage
})

async function createBucketIfNeeded(
	client: S3Client,
	bucketName: string,
	region: string,
): Promise<void> {
	try {
		await client.send(new HeadBucketCommand({ Bucket: bucketName }))
		return
	} catch (error) {
		if (errorStatus(error) !== 404) {
			throw error
		}
	}

	try {
		// us-east-1 rejects an explicit location constraint; every other
		// region requires one.
		const locationConstraint = Object.values(BucketLocationConstraint).find(
			(value) => value === region,
		)
		await client.send(
			new CreateBucketCommand({
				Bucket: bucketName,
				...(region !== 'us-east-1' &&
					locationConstraint && {
						CreateBucketConfiguration: {
							LocationConstraint: locationConstraint,
						},
					}),
			}),
		)
	} catch (error) {
		// Production buckets are pre-provisioned and concurrent views can race
		// on first use; both surface as an "already exists" error.
		const name = errorName(error)
		if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
			throw error
		}
	}
}

function errorStatus(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
		return undefined
	}
	const metadata: unknown = error.$metadata
	if (
		typeof metadata !== 'object' ||
		metadata === null ||
		!('httpStatusCode' in metadata)
	) {
		return undefined
	}
	const status: unknown = metadata.httpStatusCode
	return typeof status === 'number' ? status : undefined
}

function errorName(error: unknown): string {
	return error instanceof Error ? error.name : ''
}
