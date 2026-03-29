/**
 * Textarea component with consistent styling and accessibility.
 *
 * A styled textarea element for multi-line text input with focus and disabled states.
 *
 * @module components/ui/textarea
 */
import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * A styled textarea element for multi-line text input.
 *
 * @component
 * @param {React.ComponentProps<"textarea">} props - Standard HTML textarea attributes
 * @param {React.Ref<HTMLTextAreaElement>} ref - The textarea ref
 * @returns {React.ReactElement} The rendered textarea element
 *
 * @example
 * <Textarea placeholder="Enter text..." />
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
