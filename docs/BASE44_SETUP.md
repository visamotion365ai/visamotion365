# Base44 AI slots

Each of the 10 agents owns one Base44 slot and one Browser Use slot (where needed).

| Agent | Base44 slot | Browser slot |
|-------|-------------|--------------|
| 01 Lead Hunter | BASE44_SLOT_01 | BROWSER_USE_SLOT_01 |
| 02 Passport OCR | BASE44_SLOT_02 | BROWSER_USE_SLOT_02 |
| 03 Dossier & Checklist | BASE44_SLOT_03 | BROWSER_USE_SLOT_03 |
| 04 Consistency | BASE44_SLOT_04 | BROWSER_USE_SLOT_04 |
| 05 SOP & Itinerary | BASE44_SLOT_05 | BROWSER_USE_SLOT_05 |
| 06 Official Forms | BASE44_SLOT_06 | BROWSER_USE_SLOT_06 |
| 07 Appointment Monitor | BASE44_SLOT_07 | BROWSER_USE_SLOT_07 |
| 08 Status Tracker | BASE44_SLOT_08 | BROWSER_USE_SLOT_08 |
| 09 Interview Coach | BASE44_SLOT_09 | — (Base44 only) |
| 10 Billing & Commission | BASE44_SLOT_10 | — (Base44 only) |

## Setup
1. Set `BASE44_API_KEY_SLOT_01 … _10` in the **server** environment only.
2. The vault (`/credentials`) shows SET/MISSING status live from the environment and never the key value.
3. Each agent's `system_prompt`, `allowed_tools`, `blocked_actions`, `daily_limit`, `max_retries` are stored in `ai_agents` (config, not secrets).

## Orchestration
The orchestrator (`src/lib/agents.ts → startAgentRun`) validates, in order:
1. requester authenticated → 2. tenant scope resolved → 3. role/permission (`run.execute`) → 4. applicant ownership → 5. request classified → 6. one agent selected → 7. one allowed slot selected → 8. `agent_run` created (idempotency key) → 9. minimal data passed → 10. Base44 processing → 11. Browser Use only if needed → 12. result validated → 13. approval request if sensitive → 14. STOP before irreversible action → 15. save result → 16. audit log → 17. approved feedback to the correct agency.

## Dry-run
All agents run in dry-run by default. Dry-run output always contains: `proposed_action`, `target_system`, `tenant_id`, `applicant_id`, `data_to_change`, `risk_flags`, `required_approval`, `estimated_cost`, `browser_time`, `next_step`. Only the Super Admin can flip per-agent production gates (Settings → per-agent toggles), and only with global dry-run OFF.
