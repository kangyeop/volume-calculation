'use client';

import { useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

interface EditableTitleProps {
  value: string;
  placeholder?: string;
  onSave: (next: string) => Promise<void> | void;
}

export function EditableTitle({ value, placeholder, onSave }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setDraft(value);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (isSaving) return;
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      // 호출 측에서 toast 알림 책임. 편집 모드 유지.
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') cancelEditing();
          }}
          disabled={isSaving}
          className="text-2xl font-bold tracking-tight bg-transparent border-b-2 border-indigo-500 outline-none flex-1"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSaving}
          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const displayText = value || placeholder || '';

  return (
    <h1
      className="text-2xl font-bold tracking-tight group/name cursor-pointer flex items-center gap-2"
      onClick={startEditing}
    >
      {displayText}
      <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover/name:opacity-100 transition-opacity" />
    </h1>
  );
}
