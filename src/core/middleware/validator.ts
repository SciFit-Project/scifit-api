import { zValidator } from '@hono/zod-validator'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) =>
    zValidator('json', schema, (result, c) => {
        if (!result.success) {
            return c.json(
                {
                    success: false,
                    message: 'Validation error',
                    errors: result.error.issues.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                400
            )
        }
    })