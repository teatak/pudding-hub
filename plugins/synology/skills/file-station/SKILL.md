---
name: synology-file-station
description: Browse shared folders, list directory contents, search files, inspect file metadata, or generate download links on a connected Synology NAS via File Station DSM Web API.
---

# Synology File Station

Use endpoint `synology_webapi`. Configure the account through Account sign-in in the plugin's connection settings. Enter passwords and verification codes there, not in chat.

Reuse the conversation's selected connection. If several accounts are available and none is selected, choose the intended account with `builtin_plugin_load(plugin_id="synology", connection_id=...)`. Ask the user only when the intended account is unclear. The host injects `_sid` and, when present, `SynoToken`; do not request or repeat these credentials.

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

## 5. Download or Share a File

For a requested download, call the authenticated `synology_webapi` endpoint with `GET /entry.cgi` and query parameters `api=SYNO.FileStation.Download`, `version=2`, `method=download`, `path=<file path>` and `mode=download`. Let the host inject credentials. Never construct or display a download URL containing `_sid` or `SynoToken`.

Check that the returned file is complete before offering it to the user. A truncated response is not a usable download. If the host cannot deliver the complete file, direct the user to download it in File Station.

Creating a share link changes access even though this API uses GET. Only do it when the user asks to share: call `GET /entry.cgi` with `api=SYNO.FileStation.Sharing`, `version=3`, `method=create` and the requested path. Report success only after checking the response, and display only the returned share URL without account credentials.

## Permissions and Safety

- This skill is designed for read-only navigation and inspection by default.
- Delete, move, overwrite or change permissions only when the user has authorized that operation and the target paths are clear. Ask for missing details rather than repeating an already satisfied confirmation.
- Format human-readable file sizes (e.g. KB, MB, GB) and readable local timestamps when reporting files to the user.
