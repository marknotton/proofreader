import * as React from "react"
import { cn } from "../../lib/utils"

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the switch is in the checked (on) state */
  checked: boolean
  /** Callback fired when the switch state changes */
  onCheckedChange: (checked: boolean) => void
}

/**
 * A accessible toggle switch component following the WAI-ARIA switch pattern.
 *
 * @param {SwitchProps} props - The component props
 * @param {boolean} props.checked - Whether the switch is currently checked
 * @param {(checked: boolean) => void} props.onCheckedChange - Callback when switch state changes
 * @param {string} [props.className] - Additional CSS classes to apply
 * @returns {React.ReactElement} The rendered switch element
 *
 * @example
 * const [checked, setChecked] = useState(false)
 * return <Switch checked={checked} onCheckedChange={setChecked} />
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  )
)
Switch.displayName = "Switch"

export { Switch }
