# Pocket Studio / 音乐工坊

Step-matrix composition with 1–16 bars, 1–8 tracks, and 16 steps per bar.
All interface indices are **zero-based**: the fifth step is `stepIndex: 4`.
Pitch is frequency in Hz (20–10000), for example A4 = 440; duration is 1–32 steps.

## Read on demand

- `getSong({})` returns BPM, bar count, track keys/instruments, playback status and `storageVersion`; it does not return note matrices.
- `getSong({barIndices:[0,1], trackKeys:["t_lead"]})` returns only the selected patterns. Each returned bar includes its original `barIndex`.
- `getSong({includePatterns:true})` explicitly reads the full score.

Track keys and bar indices must exist; duplicate or empty selections reject.
`storageVersion` describes shared song data. The host's `expectedStateVersion`
for `widget_invoke` describes the widget page and is a separate version.

## Atomic edits and previews

`editSong` accepts 1–100 actions, validates them in order against the intermediate
song, and commits once. Any invalid action rejects the whole batch without a
partial write. Errors identify the action index. Use `setStep` with an explicit
`enabled` value for deterministic edits; `toggleStep` remains available for UI
and legacy callers and reverses its effect when repeated.

```json
{
  "actions": [
    {"action":"setStep","barIndex":0,"trackKey":"t_lead","stepIndex":4,"enabled":true,"pitch":440,"duration":2},
    {"action":"copyBar","fromBar":0,"toBar":1}
  ],
  "dryRun": true,
  "expectedStorageVersion": 7
}
```

`dryRun:true` uses the same validation and normalization without writing or
changing playback. It returns preview `changes` and the unchanged version.
Submit the same actions with `dryRun:false` and the preview's version to commit
if the song is still current. Validation checks data, not musical quality.

Every mutation returns only `changes`, `totalBars`, `trackCount`, `storageVersion`,
`dryRun`, `changed` and `committed`. `changed` describes the proposed result;
`committed` is true only if a write happened. No-op edits do not increment the
version. Receipts describe each action's result in sequence, so a later action
may overwrite an earlier one. New-track receipts include the generated track key.

The batch supports `setStep`, `setTrackPattern`, `setNotePitch`,
`setNoteDuration`, `copyBar`, `clearBar`, `clearSong`, `setBpm`, `addBar`,
`removeBar`, `addTrack`, `removeTrack`, `changeInstrument` and `loadPreset`.
Each corresponding single-action interface also supports `dryRun` and
`expectedStorageVersion`.

`copyBar` overwrites an existing destination with an independent copy of the
source's patterns, pitches and durations. `addBar({copyFrom})` appends a copy.
Validation errors identify fields and allowed ranges; repeated invalid array
entries are grouped by field and indices by the host SDK. Current bar bounds
and valid track keys are included in business errors.
Out-of-range indices and unknown track keys reject, rather than clamping or
creating hidden tracks. Pattern arrays contain exactly 16 entries; disabled
notes normalize pitch/duration to null. Omitting pattern durations resets enabled
notes to one step. Single-note pitch/duration edits require an enabled note.

## Playback

`play`, `pause` and `getPlaybackStatus` return actual controller status, step and
Web Audio state. Note edits do not reset the playhead or stop playback. Bar-count
edits update the running loop; tempo edits keep the next step while replacing
the timer. Explicit pause resets playback to the beginning, as in the UI.

## Verification

Run Hub tests with Node 24 and the prepared sibling desktop dependencies. Package
validation also runs the real installation compiler:

```sh
PUDDING_CORE_DIR=../pudding-core npm test
PUDDING_CORE_DIR=../pudding-core npm run package-widget -- pocket-studio
```

From the desktop repository, real-model acceptance uses a disposable home and
copies only the selected development profile. All test calls use DeepSeek Flash:

```sh
PUDDING_CORE_DIR=../pudding-core \
PUDDING_HUB_DIR=../pudding-hub \
PUDDING_MUSIC_PROFILES=/absolute/path/to/development/config/profiles.yaml \
PUDDING_MUSIC_PROFILE=your-profile-id \
PUDDING_SMOKE_SCENARIO=pocket-studio-live \
PUDDING_SMOKE_OUTPUT=/tmp/pocket-studio-live \
npm run smoke:electron-workspace
```

The test previews and commits a batch, reads selected patterns, edits during
actual Web Audio playback, samples playhead continuity and page navigation,
checks a human grid edit, verifies rejection without writes, and reloads the song.
Test audio is muted at the guest output; the Web Audio graph still runs.
