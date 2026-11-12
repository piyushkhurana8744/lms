export function assertMaintenanceSafety(uri: string, purpose: string) {
  if (process.env.MAINTENANCE_CONFIRM !== purpose) throw new Error(`MAINTENANCE_CONFIRM=${purpose} is required`);
  const database = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).pathname.replace(/^\//, '').split('?')[0];
  const allowed = (process.env.MAINTENANCE_ALLOWED_DATABASES || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!database || !allowed.includes(database)) throw new Error(`Database ${database || '<missing>'} is not maintenance-allowlisted`);
  return { dryRun: process.env.MAINTENANCE_DRY_RUN !== '0', database };
}
