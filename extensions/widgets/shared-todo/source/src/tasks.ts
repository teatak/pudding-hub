export type Task = { id: string; title: string; done: boolean };
export type Status = "all" | "active" | "completed";
export type Edit =
  | { action: "add"; titles: string[] }
  | {
      action: "update";
      updates: { id: string; title?: string; done?: boolean }[];
    }
  | { action: "delete"; ids: string[] };

// The original {id,title,done} records remain the only persisted task format.
export function readTasks(value: unknown): Task[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (t) =>
        !t ||
        typeof t !== "object" ||
        typeof t.id !== "string" ||
        typeof t.title !== "string" ||
        typeof t.done !== "boolean",
    ) ||
    new Set(value.map((t) => t.id)).size !== value.length
  )
    throw new Error("Unrecognized saved data");
  return value;
}
export function counts(tasks: Task[]) {
  const completed = tasks.filter((t) => t.done).length;
  return { total: tasks.length, active: tasks.length - completed, completed };
}
export function selectTasks(tasks: Task[], status: Status) {
  return tasks.filter(
    (t) => status === "all" || t.done === (status === "completed"),
  );
}
export function taskPage(
  tasks: Task[],
  status: Status = "active",
  offset = 0,
  limit = 50,
) {
  if (
    !["all", "active", "completed"].includes(status) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error("Invalid task query");
  const matched = selectTasks(tasks, status);
  return {
    tasks: matched.slice(offset, offset + limit),
    counts: counts(tasks),
    status,
    offset,
    totalMatched: matched.length,
    hasMore: offset + limit < matched.length,
  };
}
function title(value: string) {
  if (!value.trim() || value.trim().length > 300)
    throw new Error("Use 1–300 characters for the title");
  return value.trim();
}
export function editTasks(
  tasks: Task[],
  edit: Edit,
  newID: () => string = () => crypto.randomUUID(),
) {
  const size =
    edit.action === "add"
      ? edit.titles.length
      : edit.action === "update"
        ? edit.updates.length
        : edit.ids.length;
  if (size < 1 || size > 100) throw new Error("Choose 1–100 tasks");
  if (edit.action === "add") {
    const titles = edit.titles.map(title);
    const changed = titles.map((title) => ({
      id: newID(),
      title,
      done: false,
    }));
    return {
      tasks: [...tasks, ...changed],
      changed,
      deletedIDs: [] as string[],
    };
  }
  const ids =
    edit.action === "update" ? edit.updates.map((t) => t.id) : edit.ids;
  if (new Set(ids).size !== ids.length)
    throw new Error("Each task may appear only once");
  const existing = new Map(tasks.map((t) => [t.id, t]));
  if (ids.some((id) => !existing.has(id)))
    throw new Error("Task no longer exists");
  if (edit.action === "delete")
    return {
      tasks: tasks.filter((t) => !ids.includes(t.id)),
      changed: [] as Task[],
      deletedIDs: [...ids],
    };
  const changed = edit.updates.flatMap((update) => {
    if (update.title === undefined && update.done === undefined)
      throw new Error("Provide a title or completion state");
    const old = existing.get(update.id)!;
    const next = {
      ...old,
      ...(update.title !== undefined ? { title: title(update.title) } : {}),
      ...(update.done !== undefined ? { done: update.done } : {}),
    };
    return old.title === next.title && old.done === next.done ? [] : [next];
  });
  const updates = new Map(changed.map((t) => [t.id, t]));
  return {
    tasks: tasks.map((t) => updates.get(t.id) ?? t),
    changed,
    deletedIDs: [] as string[],
  };
}
