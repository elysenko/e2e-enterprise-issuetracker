import { BadRequestException } from '@nestjs/common';
import { ZodError, ZodTypeAny, infer as ZodInfer } from 'zod';

/**
 * Parse `data` against a Zod schema, translating validation failures into a
 * NestJS 400 response instead of an unhandled 500. Accepts any Zod schema,
 * including `ZodEffects` produced by `.refine()`/`.transform()`.
 */
export function parseOrThrow<S extends ZodTypeAny>(
  schema: S,
  data: unknown,
): ZodInfer<S> {
  try {
    return schema.parse(data) as ZodInfer<S>;
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
