# Maintenance isolation

Added maintenanceSafety requiring an exact purpose confirmation and database allowlist. Dry-run is the default. Phase 18 no longer writes through Model.collection. Phase 22 index creation is skipped in dry-run while duplicate checks remain visible. Demo seed has no default URI and requires explicit non-dry-run confirmation. No scripts were executed against production.
