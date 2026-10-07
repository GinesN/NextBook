import { RequestInputError } from './http.ts';

export function parseBookstoreSlug(value: unknown): string {
  if (value === undefined) return 'carlin-la-reina';
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) {
    throw new RequestInputError(400, 'La librería no es válida.');
  }
  return value;
}

export function parseQuizRunId(value: unknown): string | null {
  // Older clients have no run ID and cannot be reliably counted.
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new RequestInputError(400, 'El cuestionario no es válido. Vuelve a empezar.');
  }
  return value.toLowerCase();
}
