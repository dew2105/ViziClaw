import { useState, useRef, useCallback, KeyboardEvent } from "react";

interface InputBarProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, []);

  return (
    <div className="border-t border-border bg-surface-alt p-4">
      <div className="max-w-3xl mx-auto flex gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Waiting for response..." : "Send a message..."}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-text-tertiary resize-none focus:outline-none focus:border-border-focus transition-colors duration-300 ease-out disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-4 py-3 bg-charcoal hover:bg-accent-hover disabled:bg-surface-active disabled:text-text-tertiary text-text-on-dark rounded-xl font-medium transition-colors duration-300 ease-out"
        >
          Send
        </button>
      </div>
    </div>
  );
}
