/*
File description:
This client component renders the reusable dashboard date-range picker. It shows preset ranges, a calendar
range preview, custom date selection, and Apply/Cancel controls, then writes the chosen date contract back
to the URL or an optional caller-provided handler so report pages can reuse the same picker safely.
*/

"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";

import { getDashboardPresetDateRange } from "@/lib/filters";
import { formatDateOnlyLabel } from "@/lib/marketing-performance";

export type DateRangeSelection = {
  preset: string;
  startDate: string;
  endDate: string;
};

type DateRangePresetOption = {
  value: string;
  label: string;
};

const defaultPresetOptions: DateRangePresetOption[] = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "yearToDate", label: "Year-to-date" },
  { value: "lastYear", label: "Last year" },
  { value: "allTime", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function sameUtcMonth(left: Date, right: Date) {
  return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth();
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRangeLabel(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "UTC",
  });

  if (sameMonth) {
    return `${monthDayFormatter.format(start)} - ${dayFormatter.format(end)}, ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${monthDayFormatter.format(start)} - ${monthDayFormatter.format(end)}, ${end.getUTCFullYear()}`;
  }

  return `${formatDateOnlyLabel(toDateOnly(start))} - ${formatDateOnlyLabel(toDateOnly(end))}`;
}

function resolvePresetSelection(option: DateRangePresetOption, referenceDate: Date, currentValue: DateRangeSelection) {
  if (option.value === "custom") {
    return {
      preset: "custom",
      startDate: currentValue.startDate,
      endDate: currentValue.endDate,
    };
  }

  const range = getDashboardPresetDateRange(option.value, referenceDate);

  return {
    preset: option.value,
    ...range,
  };
}

function visibleMonthForSelection(selection: DateRangeSelection) {
  if (selection.preset === "allTime") {
    return startOfMonth(parseDateOnly(selection.endDate));
  }

  return startOfMonth(parseDateOnly(selection.startDate));
}

function buildCalendarDays(visibleMonth: Date) {
  const monthStart = startOfMonth(visibleMonth);
  const gridStart = addDays(monthStart, -monthStart.getUTCDay());

  return Array.from({ length: 42 }, (_, dayIndex) => addDays(gridStart, dayIndex));
}

function isInsideRange(dateOnly: string, startDate: string, endDate: string) {
  return dateOnly >= startDate && dateOnly <= endDate;
}

function orderRangeDates(leftDate: string, rightDate: string) {
  return leftDate <= rightDate ? [leftDate, rightDate] : [rightDate, leftDate];
}

export function DateRangePicker({
  value,
  currentDate,
  presetOptions = defaultPresetOptions,
  className,
  onApply,
}: {
  value: DateRangeSelection;
  currentDate: string;
  presetOptions?: DateRangePresetOption[];
  className?: string;
  onApply?: (selection: DateRangeSelection) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const referenceDate = useMemo(() => parseDateOnly(currentDate), [currentDate]);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [draftSelection, setDraftSelection] = useState<DateRangeSelection>(value);
  const [visibleMonth, setVisibleMonth] = useState(() => visibleMonthForSelection(value));
  const [customAnchorDate, setCustomAnchorDate] = useState<string | null>(null);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const currentPreset = presetOptions.find((option) => option.value === value.preset);
  const selectedLabel = currentPreset?.label || "Custom range";
  const draftRangeLabel =
    draftSelection.preset === "allTime"
      ? "All time"
      : formatRangeLabel(draftSelection.startDate, draftSelection.endDate);

  useEffect(() => {
    if (!isOpen) {
      setDraftSelection(value);
      setVisibleMonth(visibleMonthForSelection(value));
      setCustomAnchorDate(null);
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen]);

  function updateDraftFromPreset(option: DateRangePresetOption) {
    const nextSelection = resolvePresetSelection(option, referenceDate, draftSelection);

    setDraftSelection(nextSelection);
    setVisibleMonth(visibleMonthForSelection(nextSelection));
    setCustomAnchorDate(null);
  }

  function updateDraftFromDay(day: Date) {
    const nextDate = toDateOnly(day);

    // Custom selection uses a two-click range: first click anchors, second click completes the range.
    if (!customAnchorDate || draftSelection.preset !== "custom") {
      setDraftSelection({
        preset: "custom",
        startDate: nextDate,
        endDate: nextDate,
      });
      setCustomAnchorDate(nextDate);
      return;
    }

    const [startDate, endDate] = orderRangeDates(customAnchorDate, nextDate);

    setDraftSelection({
      preset: "custom",
      startDate,
      endDate,
    });
    setCustomAnchorDate(null);
  }

  function applySelection() {
    if (onApply) {
      onApply(draftSelection);
      setIsOpen(false);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    params.set("preset", draftSelection.preset);
    params.set("start", draftSelection.startDate);
    params.set("end", draftSelection.endDate);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      setIsOpen(false);
    });
  }

  return (
    <div ref={containerRef} className={clsx("relative inline-flex min-w-[210px]", className)}>
      <button
        type="button"
        className="inline-flex h-9 w-full items-center justify-between gap-3 rounded-[7px] border border-[#d8dde3] bg-white px-3 text-sm font-medium text-[#4f5359] transition hover:bg-[#fafafa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#62666d]" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[#62666d]" />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Choose date range"
          className="absolute left-0 top-11 z-50 w-[min(calc(100vw-2rem),880px)] overflow-hidden rounded-[10px] border border-[#ccd2da] bg-white text-[#24272c] shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
        >
          <div className="grid min-h-[470px] md:grid-cols-[minmax(230px,0.95fr)_minmax(360px,1.2fr)]">
            <div className="space-y-1 border-b border-[#d6dbe2] p-4 md:border-b-0 md:border-r">
              {presetOptions.map((option) => {
                const optionSelection = resolvePresetSelection(option, referenceDate, draftSelection);
                const isSelected = draftSelection.preset === option.value;
                const optionRangeLabel =
                  option.value === "allTime" ? "" : formatRangeLabel(optionSelection.startDate, optionSelection.endDate);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="grid w-full grid-cols-[28px_1fr] gap-2 rounded-[8px] px-1 py-1.5 text-left transition hover:bg-[#f6f8fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]"
                    aria-pressed={isSelected}
                    onClick={() => updateDraftFromPreset(option)}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2",
                        isSelected ? "border-[#1f5bd8]" : "border-[#9298a0]",
                      )}
                    >
                      {isSelected ? <span className="h-3.5 w-3.5 rounded-full bg-[#1f5bd8]" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[18px] font-medium leading-tight tracking-normal text-[#2b2e34] md:text-[19px]">
                        {option.label}
                      </span>
                      {optionRangeLabel ? (
                        <span className="mt-1 block text-[15px] leading-tight tracking-normal text-[#555a61] md:text-[16px]">
                          {optionRangeLabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex min-h-[360px] flex-col p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#202328] transition hover:bg-[#f2f4f7]"
                  aria-label="Show previous month"
                  onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <h3 className="text-[24px] font-semibold leading-none tracking-normal text-[#202328]">
                  {formatMonthLabel(visibleMonth)}
                </h3>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#202328] transition hover:bg-[#f2f4f7]"
                  aria-label="Show next month"
                  onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-[15px] font-medium text-[#31343a]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {calendarDays.map((day) => {
                  const dateOnly = toDateOnly(day);
                  const inVisibleMonth = sameUtcMonth(day, visibleMonth);
                  const isRangeDay = isInsideRange(dateOnly, draftSelection.startDate, draftSelection.endDate);
                  const isEndpoint = dateOnly === draftSelection.startDate || dateOnly === draftSelection.endDate;

                  return (
                    <button
                      key={dateOnly}
                      type="button"
                      className={clsx(
                        "h-[46px] rounded-[8px] text-[20px] font-medium tracking-normal transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5bd8]",
                        isEndpoint && "bg-[#1857d7] text-white hover:bg-[#154ec1]",
                        isRangeDay && !isEndpoint && "bg-[#e1f2fd] text-[#003a8c] hover:bg-[#d3ebfb]",
                        !isRangeDay && inVisibleMonth && "text-[#23262c] hover:bg-[#f1f4f8]",
                        !isRangeDay && !inVisibleMonth && "text-[#747982] hover:bg-[#f7f8fa]",
                      )}
                      aria-label={`Choose ${formatDateOnlyLabel(dateOnly)}`}
                      onClick={() => updateDraftFromDay(day)}
                    >
                      {day.getUTCDate()}
                    </button>
                  );
                })}
              </div>

              <p className="mt-auto pt-4 text-sm font-medium text-[#62666d]">{draftRangeLabel}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#d6dbe2] px-4 py-3">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-[#cbd1d9] bg-white px-4 text-base font-semibold text-[#2a2d33] transition hover:bg-[#f8f9fb]"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-[9px] bg-[#202226] px-5 text-base font-semibold text-white transition hover:bg-black disabled:cursor-wait disabled:bg-[#5a5e66]"
              disabled={isPending}
              onClick={applySelection}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
