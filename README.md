# Pudding Hub

[中文](README.zh-CN.md)

Pudding Hub is Pudding's official extension repository. It contains source and installable packages for plugins and widgets.

- **Plugins** connect external services for models and widgets.
- **Widgets** provide interactive interfaces. They may use plugins or run independently.

## Developer documentation

Start at the [developer index](docs/README.md):

| Guide | Contents |
| --- | --- |
| [Plugin development](docs/plugin-development.md) | Services, authentication, connections, Skills, verification and publishing |
| [Widget development](docs/widget-development.md) | Complete example, model authoring workflow, data integration, testing and publishing |
| [Widget SDK](docs/widget-sdk.md) | Persistence, model interfaces, collaboration, clipboard, system notifications and export |

The [Chinese guides](docs/README.zh-CN.md) cover the same content.

## Install in Pudding

Pudding reads registries to discover installable resources and versions. Official addresses:

| Type | Registry |
| --- | --- |
| Plugins | https://teatak.github.io/pudding-hub/plugins/registry.json |
| Widgets | https://teatak.github.io/pudding-hub/widgets/registry.json |

Use these URLs in the corresponding source settings. Install widgets through Studio's widget library. Preview releases require their respective switches in Settings → Advanced.

## Source and release files

```text
plugins/<name>/
  plugin.yaml             # Service, auth, connection and Skill paths
  manifest.json           # Hub metadata and file inventory
  skills/                 # Model-facing usage instructions
  releases/<version>/     # Packaged installation files
widgets/<name>/
  manifest.json           # Hub metadata and host requirements
  source/widget.json      # Entry point and data operations
  source/src/             # React, TypeScript and styles
  releases/<version>/     # Packaged source revision
scripts/                  # Packaging tools
```

Editing source or a Skill does not update installed copies. Follow the relevant guide to package and publish a release. Plugins use pudding.plugin.package; widgets use pudding.widget.source-package. Their fields and packaging workflows differ.

Use `pnpm package-widget <name> --dev` for a development widget package in the ignored dev directory. Formal packaging commands change releases and registries; consult the corresponding guide first. Update versions for new content and do not overwrite published widget packages.

## Registries and hosting

plugins/registry.json and widgets/registry.json are the install catalogs read by Pudding. A widget registry has this basic structure:

```json
{
  "kind": "pudding.widget.registry",
  "schemaVersion": 2,
  "name": "pudding-widgets",
  "title": {"zh-CN":"Pudding 小组件","zh-TW":"Pudding 小組件","en":"Pudding Widgets"},
  "items": []
}
```

name is a stable identifier; title maps languages to display names. items records resources, releases and package hashes. The empty array illustrates the structure; packaging maintains the actual catalog.

GitHub Pages hosts the repository from the root of the main branch. Pudding verifies package SHA-256 hashes, so publishing must update both package files and the registry.

## Legacy compatibility

Plugins replaced Apps, which are no longer a separate development type. The apps directory and [historical registry](https://teatak.github.io/pudding-hub/apps/registry.json) remain for older clients. New integrations use plugin.yaml.
