"use client";

import { FileText, Image as ImageIcon, FolderOpen, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** In-browser document vault: every file attached during the session. */
export default function DocumentVault() {
  const open = useStore((s) => s.vaultOpen);
  const setOpen = useStore((s) => s.setVaultOpen);
  const files = useStore((s) => s.attachments);
  const removeAttachment = useStore((s) => s.removeAttachment);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/20 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document vault"
        className="max-h-[85vh] w-full max-w-[560px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
              <FolderOpen size={18} className="text-neutral-700" />
            </span>
            <div>
              <h2 className="text-base font-medium text-neutral-900">Document Vault</h2>
              <p className="text-xs text-neutral-500">
                Held in memory for this session only — nothing is uploaded to a server.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close vault"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={17} />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {files.length === 0 ? (
            <div className="py-14 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <FolderOpen size={22} className="text-neutral-400" />
              </span>
              <p className="text-sm text-neutral-600">No documents attached yet.</p>
              <p className="mx-auto mt-1 max-w-[300px] text-xs text-neutral-400">
                Use the paperclip in the composer to attach PDFs, Word files or images before asking
                an agent to audit them.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {files.map((file) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <li key={file.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                      {isImage ? <ImageIcon size={17} /> : <FileText size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-800">{file.name}</p>
                      <p className="text-xs text-neutral-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeAttachment(file.id)}
                      className="text-neutral-400 transition-colors hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
