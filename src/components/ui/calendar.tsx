"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayButtonProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("relative p-0", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center items-center pt-1 px-9",
        caption_label: "text-sm font-medium text-foreground truncate",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 z-10",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-8 text-[0.75rem] font-medium",
        week: "flex w-full mt-1",
        day: "p-0 text-center text-sm relative [&:has([data-selected])]:bg-primary/10 first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start: "rounded-l-md bg-primary [&>button]:text-primary-foreground",
        range_end: "rounded-r-md bg-primary [&>button]:text-primary-foreground",
        range_middle: "bg-primary/10 [&>button]:text-foreground",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground",
        today: "[&>button]:border [&>button]:border-primary/60",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
        DayButton: (dayButtonProps: DayButtonProps) => {
          // `day` is part of DayButtonProps but isn't a valid DOM attribute —
          // destructured out so it isn't spread onto the native <button>.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { className: dayClassName, day, modifiers, ...rest } = dayButtonProps
          return (
            <button
              type="button"
              data-selected={modifiers.selected || undefined}
              className={dayClassName}
              {...rest}
            />
          )
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
