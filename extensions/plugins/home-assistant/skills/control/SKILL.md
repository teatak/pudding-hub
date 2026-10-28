---
name: home-assistant-control
description: Control entities through a connected Home Assistant instance when the user explicitly asks to turn, set, trigger, open, close, lock, unlock, arm, disarm, or otherwise operate a home device or automation.
---

# Home Assistant Control

Use endpoint `home_assistant_rest` with `builtin_rest_request`.

## Required procedure

1. Resolve the target with `GET /api/states`; never guess an entity ID.
2. Verify the requested service exists with `GET /api/services`; never guess a domain, service name, target shape, or service data field.
3. Read the target's current state with `GET /api/states/{entity_id}` when it affects the action or confirmation.
4. Call only a verified service with `POST /api/services/{domain}/{service}`. Put `entity_id`, `device_id`, or `area_id` in the documented target/body shape returned by the service definition.
5. Report the service result. When the result does not make the final state clear, read the target state again.

## Confirmation rules

- A clear request such as "turn on the living room light" is sufficient for ordinary, reversible lighting, media, fan, and non-safety switch actions after the target is resolved unambiguously.
- Ask for explicit confirmation immediately before actions involving locks, doors, garage doors, covers that provide physical access, alarm control panels, sirens, security systems, valves, water controls, hazardous equipment, or opening access to the home.
- Ask for explicit confirmation before changing climate or water-heater settings to an unusual or potentially unsafe value.
- Ask for explicit confirmation before triggering scripts, scenes, automations, or broad area/device actions when their full effects are not already clear from the conversation.
- The confirmation must state the exact target and action. If the target, action, or parameters change after confirmation, confirm again.
- Never call multiple control services speculatively. Resolve ambiguity before acting.

## Boundaries

- Do not use `POST /api/states/{entity_id}` to control a device; it only changes Home Assistant's state representation.
- Do not fire arbitrary events, delete states, edit configuration, or invent undocumented endpoints.
- For creating or editing automations, dashboards, integrations, users, backups, or other complex administrative workflows, use the Home Assistant web UI in the browser instead of guessing API routes.
- Treat tokens, location data, alarm states, lock states, camera-related entities, and presence information as sensitive. Return only what is needed for the user's request.
