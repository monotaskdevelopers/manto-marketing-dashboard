/*
File description:
This reusable client component renders a compact custom multi-select filter dropdown. It uses checkbox-style
options, active filter chips, outside-click dismissal, keyboard Escape support, and small motion hooks so
analytics filter controls feel consistent without adding a heavy UI dependency.
*/

"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

export type MultiSelectDropdownOption = {
  value: string;
  label: string;
};

export function MultiSelectDropdown({
  label,
  ariaLabel,
  options,
  selectedValues,
  allValue = "all",
  allLabel = "All",
  wide = false,
  dotted = false,
  onChange,
}: {
  label: string;
  ariaLabel?: string;
  options: MultiSelectDropdownOption[];
  selectedValues: string[];
  allValue?: string;
  allLabel?: string;
  wide?: boolean;
  dotted?: boolean;
  onChange: (values: string[]) => void;
}) {
  const dropdownId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRenderPanel, setShouldRenderPanel] = useState(false);
  const allOption = useMemo(
    () => options.find((option) => option.value === allValue) || { value: allValue, label: allLabel },
    [allLabel, allValue, options],
  );
  const specificOptions = useMemo(
    () => options.filter((option) => option.value !== allValue),
    [allValue, options],
  );
  const activeOptions = useMemo(() => {
    const activeValues = new Set(selectedValues.filter((value) => value !== allValue));

    return specificOptions.filter((option) => activeValues.has(option.value));
  }, [allValue, selectedValues, specificOptions]);
  const isAllSelected = activeOptions.length === 0;
  const summaryLabel =
    isAllSelected ? allOption.label : activeOptions.length === 1 ? activeOptions[0].label : `${activeOptions.length} selected`;

  const closeDropdown = useCallback(() => {
    if (!shouldRenderPanel) {
      return;
    }

    setIsOpen(false);
    setIsClosing(true);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setShouldRenderPanel(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 140);
  }, [shouldRenderPanel]);

  const openDropdown = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setShouldRenderPanel(true);
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!shouldRenderPanel) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      closeDropdown();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, shouldRenderPanel]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  function setAllSelected() {
    onChange([allValue]);
  }

  function toggleSpecificOption(optionValue: string) {
    const currentValues = activeOptions.map((option) => option.value);
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((value) => value !== optionValue)
      : [...currentValues, optionValue];

    // Falling back to the all value keeps the filter contract explicit and prevents empty arrays from leaking.
    onChange(nextValues.length ? nextValues : [allValue]);
  }

  return (
    <div ref={rootRef} className={clsx("relative inline-flex", wide ? "min-w-[190px]" : "min-w-[142px]")}>
      <button
        type="button"
        aria-label={ariaLabel || label}
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
            return;
          }

          openDropdown();
        }}
        className={clsx(
          "inline-flex h-9 w-full items-center justify-between gap-2 rounded-[7px] border bg-white px-3 text-sm font-medium text-[#62666d] shadow-[0_1px_1px_rgba(16,24,40,0.03)] transition duration-150 hover:-translate-y-px hover:bg-[#fafafa] hover:shadow-[0_3px_8px_rgba(16,24,40,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]",
          dotted ? "border-dashed border-[#d5d9df]" : "border-[#d8dde3]",
          !isAllSelected && "border-[#b8c9ed] bg-[#f8fbff] text-[#2f5fba]",
        )}
      >
        <span className="min-w-0 truncate text-left">{label}</span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            className={clsx(
              "max-w-[104px] truncate rounded-full px-2 py-0.5 text-xs transition",
              isAllSelected ? "bg-[#f1f3f5] text-[#62666d]" : "bg-[#e7f0ff] text-[#245fbd]",
            )}
          >
            {summaryLabel}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={clsx("h-4 w-4 shrink-0 text-[#62666d] transition duration-150", isOpen && "rotate-180")}
          />
        </span>
      </button>

      {shouldRenderPanel ? (
        <div
          id={dropdownId}
          data-state={isClosing ? "closing" : "open"}
          className="filter-dropdown-panel absolute left-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-[#dfe4ea] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.16)]"
        >
          {!isAllSelected ? (
            <div className="border-b border-[#eef1f4] p-2">
              <div className="flex flex-wrap gap-1.5">
                {activeOptions.slice(0, 4).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`Remove ${option.label} filter`}
                    onClick={() => toggleSpecificOption(option.value)}
                    className="filter-active-chip inline-flex max-w-full items-center gap-1 rounded-full bg-[#eef5ff] px-2 py-1 text-xs font-semibold text-[#2f5fba] transition hover:bg-[#e0edff]"
                  >
                    <span className="truncate">{option.label}</span>
                    <X aria-hidden="true" className="h-3 w-3 shrink-0" />
                  </button>
                ))}
                {activeOptions.length > 4 ? (
                  <span className="filter-active-chip rounded-full bg-[#f1f3f5] px-2 py-1 text-xs font-semibold text-[#62666d]">
                    +{activeOptions.length - 4}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto p-1.5">
            <label
              data-selected={isAllSelected}
              className="group flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[#3d4148] transition hover:bg-[#f5f7fa] data-[selected=true]:bg-[#edf5ff] data-[selected=true]:text-[#245fbd]"
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={setAllSelected}
                className="peer sr-only"
              />
              <span className="filter-checkbox inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-[#c7cdd5] bg-white text-white transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1f5bd8] group-data-[selected=true]:border-[#2d6cff] group-data-[selected=true]:bg-[#2d6cff]">
                <Check aria-hidden="true" className="filter-checkmark h-3 w-3" />
              </span>
              <span className="min-w-0 truncate">{allOption.label}</span>
            </label>

            {specificOptions.map((option) => {
              const isSelected = activeOptions.some((activeOption) => activeOption.value === option.value);

              return (
                <label
                  key={option.value}
                  data-selected={isSelected}
                  className="group mt-0.5 flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm font-medium text-[#3d4148] transition hover:bg-[#f5f7fa] data-[selected=true]:bg-[#edf5ff] data-[selected=true]:text-[#245fbd]"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSpecificOption(option.value)}
                    className="peer sr-only"
                  />
                  <span className="filter-checkbox inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-[#c7cdd5] bg-white text-white transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1f5bd8] group-data-[selected=true]:border-[#2d6cff] group-data-[selected=true]:bg-[#2d6cff]">
                    <Check aria-hidden="true" className="filter-checkmark h-3 w-3" />
                  </span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
