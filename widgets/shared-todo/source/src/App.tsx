import { useState } from "react";
import { pudding, useStorage } from "@pudding/widget";
import { z } from "zod";
import { text } from "./text";
import "./style.css";
const task = z
  .object({ id: z.string(), title: z.string(), done: z.boolean() })
  .strict();
const list = z.array(task);
const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("add"),
      title: z.string().trim().min(1).max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal("complete"),
      id: z.string(),
      done: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("delete"), id: z.string() }).strict(),
]);
// One CAS write: a conflict is surfaced, never retried against unseen changes.
async function edit(value: z.infer<typeof input>, signal?: AbortSignal) {
  const old = await pudding.storage.read({ signal });
  const tasks = list.parse(old.data.tasks ?? []);
  if (value.action === "add")
    tasks.push({ id: crypto.randomUUID(), title: value.title, done: false });
  else {
    const i = tasks.findIndex((task) => task.id === value.id);
    if (i < 0) throw new Error("Task no longer exists");
    if (value.action === "delete") tasks.splice(i, 1);
    else tasks[i] = { ...tasks[i], done: value.done };
  }
  if (signal?.aborted) throw new Error("Cancelled");
  await pudding.storage.write({
    expectedVersion: old.version,
    data: { ...old.data, tasks },
  });
  return { tasks };
}
pudding.defineInterface({
  name: "addTask",
  description: "Add a task to the persistent shared list",
  input: z.object({ title: z.string().trim().min(1).max(300) }).strict(),
  run: (v, c) => edit({ action: "add", ...v }, c.signal),
});
pudding.defineInterface({
  name: "completeTask",
  description: "Set a shared task completion state",
  input: z.object({ id: z.string(), done: z.boolean() }).strict(),
  run: (v, c) => edit({ action: "complete", ...v }, c.signal),
});
pudding.defineInterface({
  name: "deleteTask",
  description: "Remove a task from the shared list",
  input: z.object({ id: z.string() }).strict(),
  run: (v, c) => edit({ action: "delete", ...v }, c.signal),
});
pudding.defineInterface({
  name: "listTasks",
  description: "Read the complete persistent task list",
  input: z.object({}).strict(),
  run: async (_, c) => (await pudding.storage.read({ signal: c.signal })).data,
});
export default function App() {
  const storage = useStorage(),
    [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const parsed = list.safeParse(storage.data?.data.tasks ?? []);
  const tasks = parsed.success ? parsed.data : [];
  async function submit(v: z.infer<typeof input>) {
    setBusy(true);
    setError("");
    try {
      await edit(input.parse(v));
      if (v.action === "add") setTitle("");
    } catch (e) {
      setError(String(e));
      await storage.refetch();
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <h1>{text("Shared Todo", "共享待办")}</h1>
      <p className="hint">
        {text(
          "Saved for this widget. All openings use the same list; copies have their own data.",
          "此组件的所有打开位置共享待办。副本使用独立数据。",
        )}
      </p>
      <form>
        <input
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!busy && title.trim()) void submit({ action: "add", title });
            }
          }}
          aria-label="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={text("What needs doing?", "添加一项待办")}
          maxLength={300}
        />
        <button
          type="button"
          onClick={() => void submit({ action: "add", title })}
          className="primary"
          disabled={
            busy || !title.trim() || storage.isPending || !parsed.success
          }
        >
          {text("Add", "添加")}
        </button>
      </form>
      {storage.isPending ? <p>{text("Loading…", "正在读取…")}</p> : null}
      {storage.error || error || !parsed.success ? (
        <p role="alert" className="error">
          {error || storage.error?.message || "Unrecognized saved data"}
        </p>
      ) : null}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              aria-label={`Complete ${task.title}`}
              aria-pressed={task.done}
              disabled={busy}
              onClick={() =>
                void submit({
                  action: "complete",
                  id: task.id,
                  done: !task.done,
                })
              }
            >
              {task.done ? "✓" : "○"}
            </button>
            <span
              style={{ textDecoration: task.done ? "line-through" : undefined }}
            >
              {task.title}
            </span>
            <button
              aria-label={`Delete ${task.title}`}
              disabled={busy}
              onClick={() => void submit({ action: "delete", id: task.id })}
            >
              {text("Delete", "删除")}
            </button>
          </li>
        ))}
      </ul>
      {!tasks.length && !storage.isPending ? (
        <p className="hint">{text("Your list is clear.", "暂无待办。")}</p>
      ) : null}
    </main>
  );
}
