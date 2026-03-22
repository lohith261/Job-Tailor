"use client";

import { useState, useEffect } from "react";
import type { ApplicationData } from "@/types";
import { KANBAN_COLUMNS } from "@/types";
import KanbanColumn from "./KanbanColumn";

const STORAGE_KEY = "kanban_collapsed_columns";

function loadCollapsedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

interface Props {
  applications: ApplicationData[];
  onMove: (appId: string, newStatus: string) => void;
  onCardClick: (id: string) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

export default function KanbanBoard({ applications, onMove, onCardClick, selectMode = false, selectedIds = new Set(), onSelect }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Load persisted collapsed state after mount (avoid SSR mismatch)
  useEffect(() => {
    setCollapsedColumns(loadCollapsedFromStorage());
  }, []);

  function toggleCollapse(status: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("applicationId", id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("applicationId") || draggingId;
    if (!id) return;

    const app = applications.find((a) => a.id === id);
    if (!app || app.status === newStatus) {
      setDraggingId(null);
      setDragTargetStatus(null);
      return;
    }

    onMove(id, newStatus);
    setDraggingId(null);
    setDragTargetStatus(null);
  }

  function handleDragEnter(status: string) {
    setDragTargetStatus(status);
  }

  function handleDragLeave() {
    setDragTargetStatus(null);
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]"
      onDragEnd={() => {
        setDraggingId(null);
        setDragTargetStatus(null);
      }}
    >
      {KANBAN_COLUMNS.map(({ status, label, color }) => {
        const colApps = applications.filter((a) => a.status === status);
        const collapsed = collapsedColumns.has(status);
        return (
          <div
            key={status}
            onDragEnter={() => !collapsed && handleDragEnter(status)}
            onDragLeave={handleDragLeave}
          >
            <KanbanColumn
              status={status}
              label={label}
              color={color}
              applications={colApps}
              onCardClick={onCardClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragTarget={dragTargetStatus === status && draggingId !== null}
              isCollapsed={collapsed}
              onToggleCollapse={() => toggleCollapse(status)}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}
