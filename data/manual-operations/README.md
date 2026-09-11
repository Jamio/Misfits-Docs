# Historical operation records

Create one `.json` file per historical operation in this folder. On GitHub,
open `_template.json.example`, copy its contents, then use **Add file → Create
new file** and give the record a unique name ending in `.json`, such as
`2023-08-19-vietnam-pmc-13.json`.

Saving the file runs an automatic validation and rebuilds the Operations Hub.
Use Steam IDs to link attendance and authorship to service records. A Steam ID
does not need to be in the Personnel registry yet: until it is added, the site
displays that ID as the player's name. Adding the player later updates every
linked record automatically.

`recordQuality` may be:

- `attendance`: only attendance is known;
- `partial`: some statistics are known; or
- `full`: the record is believed to contain the complete export-equivalent data.

Unknown statistics should be omitted, not entered as zero. Only use zero when
you know the actual result was zero. `durationSeconds`, `summary`, `authors`,
and every individual player statistic are optional when the old information is
not available.

## Operation screenshots

Every operation page has a 16:9 placeholder. For a historical record, upload a
1920x1080 JPG, PNG, or WebP file to `assets/operations/`, then either add its
relative path to the record's optional `image` field or add it to
`data/operation-images.json`. The separate image map is the safest option for
automatically exported operations because statistics rebuilds do not touch it.
