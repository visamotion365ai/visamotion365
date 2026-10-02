"use client";

import { useState } from "react";
import { ExternalLink, Globe, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { getBrowserTaskStatus } from "@/lib/browserUse";

function statusStyle(status: string): string {
  const value = status.toLowerCase();
  if (["finished", "success", "completed", "done"].some((s) => value.includes(s)))
    return "bg-green-50 text-green-700";
  if (["failed", "error", "stopped"].some((s) => value.includes(s)))
    return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

/** Slide-over showing Browser Use Cloud tasks launched this session. */
export default function CloudTasksPanel() {
  const open = useStore((s) => s.tasksPanelOpen);
  const setOpen = useStore((s) => s.setTasksPanelOpen);
  const tasks = useStore((s) => s.cloudTasks);
  const updateCloudTask = useStore((s) => s.updateCloudTask);
  const clearCloudTasks = useStore((s) => s.clearCloudTasks);
  const apiKey = useStore((s) => s.config.browserUseKey);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  if (!open) return null;

  const refresh = async (id: string, remoteId: string) => {
    setRefreshing(id);
    try {
      const result = await getBrowserTaskStatus(remoteId, apiKey);
      updateCloudTask(id, { status: result.status, output: result.output });
    } catch (error) {
      updateCloudTask(id, { status: "error", output: (error as Error).message });
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex justify-end bg-black/10 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <aside className="flex h-full w-full max-w-[440px] flex-col border-l border-neutral-200/70 bg-white/75 shadow-2xl backdrop-blur-2xl">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
              <Globe size={18} className="text-neutral-700" />
            </span>
            <div>
              <h2 className="text-base font-medium text-neutral-900">Cloud Browser Tasks</h2>
              <p className="text-xs text-neutral-500">
                {tasks.length} task{tasks.length === 1 ? "" : "s"} this session
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tasks.length === 0 ? (
            <div className="mt-16 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Globe size={22} className="text-neutral-400" />
              </span>
              <p className="text-sm text-neutral-600">No cloud tasks yet.</p>
              <p className="mx-auto mt-1 max-w-[280px] text-xs text-neutral-400">
                Ask Agent 5 (Portal Agent) to check VFS, TLScontact or CGI slots and the task will
                appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => (
                <li key={task.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm text-neutral-800">{task.task}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  {task.output && (
                    <p className="mt-2 line-clamp-4 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
                      {task.output}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => refresh(task.id, task.remoteId)}
                      disabled={refreshing === task.id || !apiKey}
                      className="inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-neutral-900 disabled:opacity-40"
                    >
                      {refreshing === task.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      Refresh
                    </button>
                    {task.liveUrl && (
                      <a
                        href={task.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-neutral-600 transition-colors hover:text-neutral-900"
                      >
                        <ExternalLink size={13} /> Live view
                      </a>
                    )}
                    <span className="ml-auto text-neutral-300">#{task.remoteId.slice(0, 8)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {tasks.length > 0 && (
          <footer className="border-t border-neutral-100 px-5 py-3">
            <button
              type="button"
              onClick={clearCloudTasks}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-red-600"
            >
              <Trash2 size={13} /> Clear task list
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
