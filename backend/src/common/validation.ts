import { BadRequestException } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Parse `data` against a Zod schema, translating validation failures into a
 * NestJS 400 response instead of an unhandled 500.
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    throw err;
  }
}
