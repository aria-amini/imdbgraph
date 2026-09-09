import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { createDb } from '@/db/connection'
import { feedback } from '@/db/tables'

const feedbackInput = z.object({
	message: z.string().trim().min(1).max(4000),
	email: z
		.union([z.literal(''), z.string().trim().email().max(254)])
		.optional(),
})

export const Route = createFileRoute('/api/feedback')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const body = await request.json().catch(() => null)
				const parsed = feedbackInput.safeParse(body)
				if (!parsed.success) {
					return new Response(JSON.stringify({ error: 'Invalid input' }), {
						status: 400,
					})
				}

				await createDb()
					.insert(feedback)
					.values({
						message: parsed.data.message,
						email: parsed.data.email || null,
					})

				return new Response(null, { status: 201 })
			},
		},
	},
})
