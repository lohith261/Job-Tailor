"use client";

import { useState, KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  datalistId?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Type and press Enter...",
  suggestions,
  datalistId,
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const listId = datalistId ?? (suggestions ? `taglist-${Math.random().toString(36).slice(2)}` : undefined);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900">
      {suggestions && listId && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-500 dark:hover:text-indigo-300"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        list={listId}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 bg-transparent p-1 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
      />
    </div>
  );
}
