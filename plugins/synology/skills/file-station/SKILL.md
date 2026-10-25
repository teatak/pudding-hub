---
name: synology-file-station
description: Browse shared folders, list directory contents, search files, inspect file metadata, or generate download links on a connected Synology NAS via File Station DSM Web API.
---

# Synology File Station

Use endpoint `synology_webapi`. Create a connection using Account sign-in in the plugin settings; enter any requested verification code there, never in chat. The active connection automatically injects the Synology DSM session token as `_sid` and, when present, the CSRF token as `SynoToken`. Never ask the user to repeat the session token or include it in chat output.

Session errors (106, 107, 119) require signing in again in connection settings. Do not retry login with passwords or OTPs in tool calls. This version does not store passwords or automatically re-login.

## 1. List Shared Folders

To discover accessible shared folders on the NAS (e.g. `/homes`, `/documents`, `/media`):

- **Request**: `GET /entry.cgi`
- **Query parameters**:
  - `api`: `SYNO.FileStation.List`
  - `version`: `2`
  - `method`: `list_share`
  - `additional`: `real_path,owner,time,perm`

The returned list is in `data.shares[]`, where each item contains `name`, `path`, and `isdir: true`.

## 2. List Directory Contents

To inspect files and subfolders within a specific directory:

- **Request**: `GET /entry.cgi`
- **Query parameters**:
  - `api`: `SYNO.FileStation.List`
  - `version`: `2`
  - `method`: `list`
  - `folder_path`: Target folder path (e.g. `/documents` or `/homes/username`)
  - `offset`: `0`
  - `limit`: Up to `50` (fetch further pages only on user request)
  - `sort_by`: `name` (or `mtime`, `size`)
  - `sort_direction`: `asc` or `desc`
  - `additional`: `real_path,size,owner,time,perm,type`

The returned list is in `data.files[]`, where each item contains `name`, `path`, `isdir`, and attributes in `additional` (such as `size` in bytes, `time.mtime`, and `type`).

## 3. Search Files

When the user asks to find files by name, extension, or keyword across folders:

### Fast Directory Pattern Matching
For simple listing filtered by filename:
- **Request**: `GET /entry.cgi`
- **Query parameters**:
  - `api`: `SYNO.FileStation.List`
  - `version`: `2`
  - `method`: `list`
  - `folder_path`: Target root path
  - `pattern`: `*keyword*`
  - `filetype`: `all` (or `file`, `dir`)
  - `additional`: `real_path,size,time,type`

### Deep Background Search (Universal Search Index)
For recursive deep search across subdirectories:
1. **Start search**:
   - `GET /entry.cgi?api=SYNO.FileStation.Search&version=2&method=start&folder_path=/documents&pattern=*keyword*`
   - Returns `data.taskid`.
2. **Poll results**:
   - `GET /entry.cgi?api=SYNO.FileStation.Search&version=2&method=list&taskid=<taskid>&offset=0&limit=50&additional=real_path,size,time,type`
   - Returns matching files in `data.files[]` and `data.finished`.
3. **Clean up**:
   - `GET /entry.cgi?api=SYNO.FileStation.Search&version=2&method=clean&taskid=<taskid>`

## 4. Get File Metadata

To retrieve detailed info about a specific file:

- **Request**: `GET /entry.cgi`
- **Query parameters**:
  - `api`: `SYNO.FileStation.List`
  - `version`: `2`
  - `method`: `get_info`
  - `path`: Target file path (e.g. `/documents/report.pdf`)
  - `additional`: `real_path,size,owner,time,perm,type`

## 5. Download or Share File

To generate a download URL or shareable link for a file:

- Direct download URL pattern:
  `{synology_webapi_url}/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path={encoded_file_path}&mode=download&_sid={sid}`
- Share link creation via API:
  - `GET /entry.cgi?api=SYNO.FileStation.Sharing&version=3&method=create&path={encoded_file_path}`

## Permissions and Safety

- This skill is designed for read-only navigation and inspection by default.
- Never call deletion (`SYNO.FileStation.Delete`), file move/overwrite (`SYNO.FileStation.CopyMove`), or permission alteration APIs unless the user has explicitly confirmed the exact target paths in the current turn.
- Format human-readable file sizes (e.g. KB, MB, GB) and readable local timestamps when reporting files to the user.
