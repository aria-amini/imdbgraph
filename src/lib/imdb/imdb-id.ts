import { z } from 'zod'

export const imdbIdSchema = z.string().regex(/^tt\d+$/)
