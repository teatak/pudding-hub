## Add a Hub source

Add one source to the root `index.json`. Include a stable `id`, localized `title`,
HTTPS `repository`, and one current catalog for each supported type (`widget`
and/or `plugin`). Catalog URLs must be directly readable JSON and declare their
`schemaVersion`. Do not add multiple formats of the same type.

Describe what the source provides and link to its catalog. Packages and releases
stay in your repository; this PR only adds source discovery. Users choose whether
to add the source and install its extensions.

Source ID:
Repository:
Catalog URL(s):
