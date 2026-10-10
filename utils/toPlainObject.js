/**
 * Normalizes a Mongoose document to a plain object.
 * Plain objects (e.g. from in-memory DAOs) are returned unchanged.
 */
export function toPlainObject(doc) {
  if (!doc) return doc;
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}
