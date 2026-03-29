import {
  Pencil, FileText, Type, BookOpen, Quote, PenLine,
  MessageSquare, Mail, Send, AtSign,
  Sparkles, Wand2, Crown, Shield, Heart, Star, Flame,
  Code, Terminal, Braces,
  Globe, Briefcase, GraduationCap, Lightbulb, Eye, Palette,
  // additional icons
  Feather, Notebook, ScrollText, Megaphone, Hash,
  Rocket, Gem, Leaf, Bolt, Target,
  Music, Camera, Compass, Anchor, Coffee,
  Bug, CircleCheck, ListChecks, Bookmark, Tags,
  Handshake, Scale, Mic, Glasses, Sigma,
  type LucideIcon,
} from "lucide-react"

// ── Icon library ──

/**
 * Mapping of icon name to Lucide React component.
 */
export interface IconOption {
  name: string
  icon: LucideIcon
}

/**
 * Curated library of available icons for style selection.
 */
export const STYLE_ICONS: IconOption[] = [
  // Writing & text
  { name: "pencil", icon: Pencil },
  { name: "pen", icon: PenLine },
  { name: "feather", icon: Feather },
  { name: "type", icon: Type },
  { name: "file-text", icon: FileText },
  { name: "book-open", icon: BookOpen },
  { name: "notebook", icon: Notebook },
  { name: "scroll", icon: ScrollText },
  { name: "quote", icon: Quote },
  { name: "bookmark", icon: Bookmark },
  // Communication
  { name: "message", icon: MessageSquare },
  { name: "mail", icon: Mail },
  { name: "send", icon: Send },
  { name: "at-sign", icon: AtSign },
  { name: "megaphone", icon: Megaphone },
  { name: "mic", icon: Mic },
  // Flair & tone
  { name: "sparkles", icon: Sparkles },
  { name: "wand", icon: Wand2 },
  { name: "crown", icon: Crown },
  { name: "gem", icon: Gem },
  { name: "shield", icon: Shield },
  { name: "heart", icon: Heart },
  { name: "star", icon: Star },
  { name: "flame", icon: Flame },
  { name: "rocket", icon: Rocket },
  { name: "bolt", icon: Bolt },
  // Technical
  { name: "code", icon: Code },
  { name: "terminal", icon: Terminal },
  { name: "braces", icon: Braces },
  { name: "hash", icon: Hash },
  { name: "bug", icon: Bug },
  { name: "sigma", icon: Sigma },
  // General
  { name: "globe", icon: Globe },
  { name: "briefcase", icon: Briefcase },
  { name: "graduation", icon: GraduationCap },
  { name: "lightbulb", icon: Lightbulb },
  { name: "eye", icon: Eye },
  { name: "glasses", icon: Glasses },
  { name: "palette", icon: Palette },
  { name: "target", icon: Target },
  { name: "compass", icon: Compass },
  { name: "anchor", icon: Anchor },
  { name: "leaf", icon: Leaf },
  { name: "music", icon: Music },
  { name: "camera", icon: Camera },
  { name: "coffee", icon: Coffee },
  { name: "handshake", icon: Handshake },
  { name: "scale", icon: Scale },
  { name: "check", icon: CircleCheck },
  { name: "checklist", icon: ListChecks },
  { name: "tags", icon: Tags },
]

const iconMap = new Map(STYLE_ICONS.map((o) => [o.name, o.icon]))

/**
 * Look up a LucideIcon component by name.
 * @param name - The icon name to look up
 * @returns The LucideIcon component, or undefined if not found
 */
export function getIconComponent(name?: string): LucideIcon | undefined {
  if (!name) return undefined
  return iconMap.get(name)
}

// ── Color palette ──

/**
 * A color option for style customization.
 */
export interface ColorOption {
  key: string
  label: string
  /** The "main" colour — used for active bg, dots, accents */
  value: string
}

/**
 * Curated palette of available colors for style selection.
 */
export const STYLE_COLORS: ColorOption[] = [
  { key: "red", label: "Red", value: "#ef4444" },
  { key: "rose", label: "Rose", value: "#f43f5e" },
  { key: "pink", label: "Pink", value: "#ec4899" },
  { key: "fuchsia", label: "Fuchsia", value: "#d946ef" },
  { key: "violet", label: "Violet", value: "#8b5cf6" },
  { key: "indigo", label: "Indigo", value: "#6366f1" },
  { key: "blue", label: "Blue", value: "#3b82f6" },
  { key: "sky", label: "Sky", value: "#0ea5e9" },
  { key: "cyan", label: "Cyan", value: "#06b6d4" },
  { key: "teal", label: "Teal", value: "#14b8a6" },
  { key: "emerald", label: "Emerald", value: "#10b981" },
  { key: "green", label: "Green", value: "#22c55e" },
  { key: "lime", label: "Lime", value: "#84cc16" },
  { key: "amber", label: "Amber", value: "#f59e0b" },
  { key: "orange", label: "Orange", value: "#f97316" },
  { key: "stone", label: "Stone", value: "#78716c" },
  { key: "slate", label: "Slate", value: "#64748b" },
]

const colorMap = new Map(STYLE_COLORS.map((c) => [c.key, c.value]))

/**
 * Get the hex value for a colour key.
 * @param key - The color key to look up
 * @returns The hex color value, or undefined if not found or no key provided
 */
export function getColorValue(key?: string): string | undefined {
  if (!key) return undefined
  return colorMap.get(key)
}

/**
 * Returns inline style objects for a style button.
 * Active (selected): solid colour bg with white text
 * Inactive: 12% colour bg tint with full colour text + border
 * No colour: returns undefined (use default shadcn styling)
 * @param colorKey - The color key for the button style
 * @param isActive - Whether the button is selected/active
 * @returns React CSSProperties for the button, or undefined if no color specified
 */
export function getStyleButtonStyles(
  colorKey?: string,
  isActive?: boolean
): React.CSSProperties | undefined {
  const hex = getColorValue(colorKey)
  if (!hex) return undefined

  if (isActive) {
    return {
      backgroundColor: hex,
      color: "#fff",
      borderColor: hex,
    }
  }

  return {
    backgroundColor: `${hex}1a`, // ~10% opacity
    color: hex,
    borderColor: `${hex}40`, // ~25% opacity
  }
}
