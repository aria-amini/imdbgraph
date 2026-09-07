import {
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
}

export function createStorage(config: StorageConfig = {}): Storage {
	const bucketName = config.bucketName ?? env.AWS_S3_BUCKET_NAME
	if (!bucketName) {
		throw new Error('S3 storage is not configured (missing AWS_S3_BUCKET_NAME)')
	}
	const accessKeyId = config.accessKeyId ?? env.AWS_ACCESS_KEY_ID
	const secretAccessKey = config.secretAccessKey ?? env.AWS_SECRET_ACCESS_KEY
	const endpoint = config.endpointUrl ?? env.AWS_ENDPOINT_URL
	const client = new S3Client({
		forcePathStyle: true,
		region: config.region ?? 'us-east-1',
		...(endpoint ? { endpoint } : {}),
		...(accessKeyId && secretAccessKey
			? { credentials: { accessKeyId, secretAccessKey } }
			: {}),
	})

	let bucketReady: Promise<void> | undefined
	const ensureBucket = () => {
		bucketReady ??= createBucketIfNeeded(client, bucketName).catch((error) => {
			bucketReady = undefined
			throw error
		})
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

/** Lazily-created server-side storage for the running app. */
export const getStorage = createServerOnlyFn(() => createStorage())

async function createBucketIfNeeded(
	client: S3Client,
	bucketName: string,
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
		await client.send(new CreateBucketCommand({ Bucket: bucketName }))
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
