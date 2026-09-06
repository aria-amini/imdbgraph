import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'
import { createGunzip } from 'node:zlib'

import { z } from 'zod'

const nodeWebStreamSchema = z.custom<NodeWebReadableStream<Uint8Array>>(
	(value) => value instanceof ReadableStream,
)

// https://www.imdb.com/interfaces
const baseUri = 'https://datasets.imdbws.com'
export type ImdbFile =
	| 'title.basics.tsv.gz'
	| 'title.episode.tsv.gz'
	| 'title.ratings.tsv.gz'

/** Downloads and decompresses an IMDb dataset as a readable stream. */
export async function downloadStream(file: ImdbFile): Promise<Readable> {
	const uri = `${baseUri}/${file}`
	const { body, ok, status } = await fetch(uri)
	if (!ok) {
		throw new Error(`HTTP error! status: ${status.toString()}`)
	}
	if (!body) {
		throw new Error('Response body is null')
	}

	return Readable.fromWeb(nodeWebStreamSchema.parse(body)).pipe(createGunzip())
}

/** Downloads and decompresses an IMDb dataset to a local file. */
export async function download(file: ImdbFile, output: string): Promise<void> {
	const uri = `${baseUri}/${file}`
	try {
		const source = await downloadStream(file)
		await pipeline(source, createWriteStream(output))
		console.log(`Download completed: ${output.toString()}`)
	} catch (error) {
		throw new Error(`Failed to download ${uri}`, { cause: error })
	}
}
