# Exported operation records

Create one `.json` file here for each completed Misfits operation. Copy only
the JSON object following `[MAUX_OPS_EXPORT_V1]` in the dedicated-server RPT;
do not include the marker, timestamps, or BEGIN/END lines.

Use a readable filename such as `2026-09-11_rolling-steel.json`. The filename
is organisational only: duplicate protection uses the operation `id` inside
the record. Saving a file runs the **Sync operation records** workflow, which
validates the export, replaces Steam IDs with stable public IDs, rebuilds the
Operations Hub data, and allows the normal Pages deployment to publish it.

If validation fails, correct this source file. Do not edit the generated
`data/operations.json` entry directly.

