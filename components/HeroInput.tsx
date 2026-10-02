"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Paperclip, X } from "lucide-react";
import { CHAT_MODES, getAgent, type ChatMode } from "@/lib/agents";
import { useStore, type Attachment } from "@/lib/store";

interface HeroInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  files: Attachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const ACCEPT = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The floating prompt bar — the hero component.
 * All-white, rounded-[28px], shadow-sm that deepens on focus-within.
 */
export default function HeroInput({
  value,
  onChange,
  onSubmit,
  files,
  onAddFiles,
  onRemoveFile,
  mode,
  onModeChange,
  disabled,
  autoFocus,
}: HeroInputProps) {
  const activeAgentId = useStore((s) => s.activeAgentId);
  const agent = getAgent(activeAgentId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modeOpen, setModeOpen] = useState(false);

  // Auto-expand the textarea up to max-h-[160px].
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list?.length) return;
    onAddFiles(Array.from(list));
    event.target.value = "";
  };

  const currentMode = CHAT_MODES.find((m) => m.id === mode) ?? CHAT_MODES[0];

  return (
    <div className="vm-composer mx-auto w-full max-w-[720px] rounded-[28px] border border-white/70 bg-white/70 p-3 shadow-[0_16px_50px_-12px_rgba(15,32,24,0.3)] backdrop-blur-2xl transition-all duration-200 focus-within:shadow-[0_20px_60px_-12px_rgba(15,32,24,0.4)]">
      {/* Attachment chips live inside the composer, above the textarea */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {files.map((file) => (
            <span
              key={file.id}
              className="flex items-center gap-2 rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1 text-sm text-neutral-700 backdrop-blur"
            >
              <Paperclip size={13} className="text-neutral-400" />
              <span className="max-w-[220px] truncate">{file.name}</span>
              <span className="text-xs text-neutral-400">{formatSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemoveFile(file.id)}
                className="text-neutral-400 transition-colors hover:text-neutral-900"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={agent.placeholder}
        className="max-h-[160px] min-h-[48px] w-full resize-none bg-transparent px-3 py-2 text-[16px] leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        {/* Left: attachment */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Attach document"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/70 bg-white/70 text-neutral-500 backdrop-blur transition-colors hover:bg-white/90 hover:text-neutral-900"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={handleFiles}
          />
        </div>

        {/* Right: mode select + send */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeOpen((open) => !open)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1.5 text-sm text-neutral-600 backdrop-blur transition-colors hover:bg-white/90"
            >
              <span className="hidden sm:inline">{currentMode.label}</span>
              <span className="sm:hidden">{currentMode.short}</span>
              <ChevronDown size={14} className={`text-neutral-400 transition-transform ${modeOpen ? "rotate-180" : ""}`} />
            </button>
            {modeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setModeOpen(false)} />
                <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-neutral-200/70 bg-white/80 py-1 shadow-2xl backdrop-blur-2xl">
                  {CHAT_MODES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onModeChange(option.id);
                        setModeOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                        option.id === mode
                          ? "bg-white/90 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Send"
            disabled={!canSend}
            onClick={onSubmit}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              canSend
                ? "bg-black text-white hover:bg-neutral-800"
                : "cursor-not-allowed bg-neutral-200 text-neutral-400"
            }`}
          >
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
