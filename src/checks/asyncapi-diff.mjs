/**
 * Classifies the change list printed by `asyncapi diff --type all --format json`.
 *
 * The AsyncAPI CLI finds changes but leaves payload schema changes "unclassified"
 * and marks every info.version edit as breaking (measured with @asyncapi/cli 6.3.1),
 * so its own breaking filter cannot be used. The rules here are conservative and
 * do not know message direction: a change that could break either side is breaking.
 */
const DOC_ONLY = /\/(description|summary|title|examples?|tags|externalDocs|deprecated)(\/|$)/;
const ARRAY_ITEM = (name) => new RegExp(`/${name}/\\d+$`);

export function isBreakingChange(change) {
  const { action, path } = change;
  if (path.startsWith('/info/') || DOC_ONLY.test(path)) return false;
  // A longer `required` list rejects messages that were valid; a longer `enum` list
  // sends values that a strict receiver does not know.
  if (action === 'add') return ARRAY_ITEM('required').test(path) || ARRAY_ITEM('enum').test(path);
  // Dropping a `required` entry only relaxes the schema. Any other removal takes away
  // a channel, message, field or allowed value that the other side may rely on.
  if (action === 'remove') return !ARRAY_ITEM('required').test(path);
  // Any edited value outside documentation: type, format, address, bindings, limits.
  return action === 'edit';
}

/** Returns the breaking changes, or null when the tool output is not the expected JSON. */
export function breakingAsyncapiChanges(stdout) {
  const start = stdout.indexOf('{');
  if (start < 0) return null;
  let parsed;
  try {
    parsed = JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.changes)) return null;
  return parsed.changes.filter(isBreakingChange);
}
