"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  className?: string
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  initialFocus,
}: CalendarProps): React.JSX.Element {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ? selected.getMonth() : today.getMonth()
  )
  const [currentYear, setCurrentYear] = React.useState(
    selected ? selected.getFullYear() : today.getFullYear()
  )

  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (initialFocus && containerRef.current) {
      containerRef.current.focus()
    }
  }, [initialFocus])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const handlePrevMonth = (): void => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((prev) => prev - 1)
    } else {
      setCurrentMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = (): void => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((prev) => prev + 1)
    } else {
      setCurrentMonth((prev) => prev + 1)
    }
  }

  const handleDayClick = (day: number): void => {
    const date = new Date(currentYear, currentMonth, day)
    if (disabled && disabled(date)) {
      return
    }
    if (onSelect) {
      if (selected && isSameDay(selected, date)) {
        onSelect(undefined)
      } else {
        onSelect(date)
      }
    }
  }

  // Build day cells
  const dayCells: React.ReactNode[] = []

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    dayCells.push(
      <div key={`empty-${i}`} className="h-9 w-9" />
    )
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const isSelected = selected ? isSameDay(selected, date) : false
    const isToday = isSameDay(today, date)
    const isDisabled = disabled ? disabled(date) : false

    dayCells.push(
      <button
        key={day}
        type="button"
        disabled={isDisabled}
        onClick={() => handleDayClick(day)}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal",
          isSelected &&
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          isToday && !isSelected && "bg-accent text-accent-foreground",
          isDisabled && "text-muted-foreground opacity-50"
        )}
      >
        {day}
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={cn("p-3", className)}
    >
      {/* Header: prev/next month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </button>
        <div className="text-sm font-medium">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </button>
      </div>

      {/* Day names */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="flex h-9 w-9 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">{dayCells}</div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
