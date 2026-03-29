/**
 * Card components for grouping related content.
 *
 * Provides Card and CardContent components for organizing and styling content blocks
 * with consistent styling, borders, and shadows.
 *
 * @module components/ui/card
 */
import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * A card container for grouping related content with styling.
 *
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard HTML div attributes
 * @param {React.Ref<HTMLDivElement>} ref - The card ref
 * @returns {React.ReactElement} The rendered card element
 *
 * @example
 * <Card>
 *   <CardContent>Card content here</CardContent>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />
  )
)
Card.displayName = "Card"

/**
 * Card content wrapper with default padding.
 *
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard HTML div attributes
 * @param {React.Ref<HTMLDivElement>} ref - The card content ref
 * @returns {React.ReactElement} The rendered card content element
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export { Card, CardContent }
