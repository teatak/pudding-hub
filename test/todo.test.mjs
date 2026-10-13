import test from "node:test";
import assert from "node:assert/strict";
import {
  readTasks,
  editTasks,
  taskPage,
} from "../widgets/shared-todo/source/src/tasks.ts";
const legacy = [
  { id: "old-1", title: "原任务 $& {count}", done: false },
  { id: "old-2", title: "已完成任务", done: true },
];
test("existing Todo records retain IDs, titles, state and ordering without migration", () => {
  const saved = JSON.stringify(legacy);
  assert.deepEqual(readTasks(JSON.parse(saved)), legacy);
  const changed = editTasks(legacy, {
    action: "update",
    updates: [{ id: "old-1", title: " 新标题 " }],
  });
  assert.deepEqual(changed.changed, [{ ...legacy[0], title: "新标题" }]);
  assert.deepEqual(changed.tasks[1], legacy[1]);
  assert.equal(JSON.stringify(legacy), saved);
  assert.deepEqual(
    editTasks(legacy, {
      action: "update",
      updates: [{ id: "old-1", title: legacy[0].title }],
    }).changed,
    [],
  );
});
test("batches add, rename, complete, reopen and delete only the requested tasks", () => {
  let id = 0;
  const added = editTasks(
    legacy,
    { action: "add", titles: ["  One ", "Two"] },
    () => `new-${++id}`,
  );
  assert.deepEqual(
    added.changed.map((t) => t.title),
    ["One", "Two"],
  );
  assert.equal(added.tasks.length, 4);
  const changed = editTasks(added.tasks, {
    action: "update",
    updates: [
      { id: "new-1", title: "Renamed", done: true },
      { id: "old-2", done: false },
    ],
  });
  assert.deepEqual(changed.changed, [
    { id: "new-1", title: "Renamed", done: true },
    { ...legacy[1], done: false },
  ]);
  const removed = editTasks(changed.tasks, {
    action: "delete",
    ids: ["new-1", "new-2"],
  });
  assert.deepEqual(removed.deletedIDs, ["new-1", "new-2"]);
  assert.deepEqual(removed.tasks, [legacy[0], { ...legacy[1], done: false }]);
});
test("invalid batches are atomic and never mutate valid earlier entries", () => {
  const frozen = legacy.map((t) => Object.freeze({ ...t }));
  Object.freeze(frozen);
  for (const edit of [
    { action: "add", titles: ["Valid", " "] },
    { action: "add", titles: ["x".repeat(301)] },
    { action: "add", titles: [] },
    { action: "add", titles: Array(101).fill("x") },
    {
      action: "update",
      updates: [
        { id: "old-1", done: true },
        { id: "missing", done: true },
      ],
    },
    {
      action: "update",
      updates: [
        { id: "old-1", done: true },
        { id: "old-2", title: "" },
      ],
    },
    { action: "update", updates: [{ id: "old-1" }] },
    {
      action: "update",
      updates: [
        { id: "old-1", done: true },
        { id: "old-1", title: "Again" },
      ],
    },
    { action: "delete", ids: ["old-1", "missing"] },
    { action: "delete", ids: ["old-1", "old-1"] },
  ])
    assert.throws(() => editTasks(frozen, edit));
  assert.deepEqual(frozen, legacy);
});
test("filtered pagination returns only the requested window plus derived counts", () => {
  const tasks = Array.from({ length: 120 }, (_, i) => ({
    id: String(i),
    title: String(i),
    done: i % 2 === 0,
  }));
  const page = taskPage(tasks);
  assert.equal(page.tasks.length, 50);
  assert.ok(page.tasks.every((t) => !t.done));
  assert.equal(page.hasMore, true);
  assert.deepEqual(page.counts, { total: 120, active: 60, completed: 60 });
  assert.equal(taskPage(tasks, "active", 50).tasks.length, 10);
  assert.equal(taskPage(tasks, "active", 50).hasMore, false);
  assert.equal(taskPage(tasks, "completed", 0, 1).tasks[0].id, "0");
  assert.equal(taskPage(tasks, "all", 119).tasks[0].id, "119");
  assert.deepEqual(taskPage(tasks, "all", 130).tasks, []);
  for (const args of [
    ["bad"],
    ["all", -1],
    ["all", 0, 0],
    ["all", 0, 101],
    ["all", 0, 1.5],
  ])
    assert.throws(() => taskPage(tasks, ...args));
});
test("invalid saved data is reported instead of treated as an empty list", () => {
  for (const value of [
    null,
    {},
    [{}],
    [{ id: "a", title: "a", done: "false" }],
    [legacy[0], legacy[0]],
  ])
    assert.throws(() => readTasks(value), /saved data/);
});
