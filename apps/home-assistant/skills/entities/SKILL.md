---
name: home-assistant-entities
description: Inspect a connected Home Assistant instance when the user asks about entities, device states, available services, configuration, history, or recent activity.
---

# Home Assistant Entities

Use endpoint `home_assistant_rest` with `builtin_rest_request`. The connection's custom API address is the Home Assistant instance root URL, so every request path below starts with `/api`.

## Supported reads

- API health: `GET /api/`
- Instance configuration: `GET /api/config`
- All current states: `GET /api/states`
- One state: `GET /api/states/{entity_id}`
- Available service definitions: `GET /api/services`
- State history: `GET /api/history/period/{timestamp}` with documented query parameters such as `filter_entity_id`, `end_time`, `minimal_response`, `no_attributes`, and `significant_changes_only`
- Logbook activity: `GET /api/logbook/{timestamp}` with documented query parameters such as `entity` and `end_time`

## Entity resolution

- Never invent an entity ID. Use `GET /api/states` and match both `entity_id` and `attributes.friendly_name`.
- If more than one entity could match the user's wording, show the candidates and ask which one they mean.
- Preserve exact entity IDs, domain names, service names, timestamps, and attribute values from API responses.
- Prefer `GET /api/states/{entity_id}` after the entity is known instead of repeatedly loading every state.

## Boundaries

- These routes are read-only. Do not use POST, DELETE, or a service call from this Skill.
- Do not guess undocumented REST routes. If the requested operation is not covered here, inspect the official Home Assistant UI in the browser or explain that this App does not expose that workflow yet.
- `POST /api/states/{entity_id}` does not control a physical device; never use it as a substitute for a service call.
