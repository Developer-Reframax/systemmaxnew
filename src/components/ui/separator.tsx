import * as React from "react"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => {
    const baseClasses = "shrink-0 bg-border"
    const orientationClasses = {
      horizontal: "w-full h-[1px]",
      vertical: "h-full w-[1px]",
    }

    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={orientation}
        className={`${baseClasses} ${orientationClasses[orientation]} ${className || ""}`}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"

export { Separator }