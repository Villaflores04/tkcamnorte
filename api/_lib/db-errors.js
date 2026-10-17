// Turns raw Supabase/PostgREST errors into messages a person can act on.
// A missing column or table means the SQL migration was never run on the live database.
const OUT_OF_DATE = /schema cache|could not find the .* column|column .* does not exist|relation .* does not exist|could not find the table/i;

export function isOutOfDateDatabase(error) {
  if (!error) return false;
  return ['PGRST204', 'PGRST205', '42703', '42P01'].includes(error.code) || OUT_OF_DATE.test(String(error.message || ''));
}

export function databaseErrorMessage(error, fallback = 'Unable to save. Please try again.') {
  if (isOutOfDateDatabase(error)) {
    return 'The database is missing a recent update. The site owner must run migrations/004_catch_up.sql in the Supabase SQL editor, then try again.';
  }
  return fallback;
}
