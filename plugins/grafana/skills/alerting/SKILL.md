---
name: grafana-alerting
description: Find and summarize Grafana-managed alert rules when the user asks about alert definitions, conditions, labels, folders, evaluation behavior, or linked dashboards.
---

# Grafana Alerting

Use endpoint `grafana_rest` with `builtin_rest_request`.

## Supported reads

- All Grafana-managed alert rules: `GET /api/v1/provisioning/alert-rules`
- One alert rule: `GET /api/v1/provisioning/alert-rules/{uid}`

Preserve rule UIDs, titles, folder UIDs, rule groups, conditions, labels, annotations, evaluation duration, `noDataState`, and `execErrState` exactly as returned. When annotations link a rule to a dashboard or panel, use the dashboard Skill to resolve and inspect that context.

## Runtime state

Provisioning responses describe configured alert rules and do not necessarily prove that a rule is currently firing. Never infer live alert state from thresholds, expressions, or rule configuration alone. If the response does not contain a current runtime state, say so and open Grafana's Alerting page in the browser when the user needs live firing or pending alerts.

## Boundaries

- This Skill is strictly read-only. Do not use POST, PUT, PATCH, or DELETE.
- Do not guess undocumented alerting routes or query the underlying data source speculatively.
- Do not create, edit, pause, mute, delete, or provision alert rules, contact points, notification policies, mute timings, or templates.
- Use the Grafana web UI for any alerting change. Ask for confirmation before the user performs a change that could suppress, reroute, or delete notifications.
- Contact destinations, labels, annotations, and alert expressions can contain sensitive operational information. Return only what is needed.
