import * as React from "react";
import { injectTokenCss } from "../tokens/inject.js";

// Default `color` on the SVG so lucide's stroke `currentColor` resolves
// to the host theme's foreground. Without this, plugin webviews that
// haven't set body/root `color: var(--lvis-fg)` render icons in the
// browser default (black) — invisible against dark themes' near-black
// background. Plugins can still override via own className, inline
// `style.color`, or a wrapping element that sets `color`.
//
// Calling `injectTokenCss` also triggers the v4.0.1 fallback ensure on
// first call, so Icon imports preserve the SDK's "any UI component
// import injects the :root fallback" invariant without a separate
// fallback-shim side-effect import.
injectTokenCss(
  "lvis-icon",
  `.lvis-icon { color: var(--lvis-fg); flex-shrink: 0; }`,
);
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  AtSign,
  BarChart3,
  Bell,
  BellOff,
  Bookmark,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Filter,
  Folder,
  Forward,
  HelpCircle,
  Home,
  Inbox,
  Info,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Pin,
  Play,
  Plus,
  Power,
  RefreshCcw,
  Reply,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Tag,
  Terminal,
  ThumbsUp,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Upload,
  User,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  // 10 names migrated 1:1 from lvis-plugin-local-indexer ICONS dict
  search: Search,
  folder: Folder,
  document: FileText,
  refresh: RefreshCcw,
  play: Play,
  stop: Square,
  plus: Plus,
  trash: Trash2,
  empty: Inbox,
  spark: Sparkles,
  // 77 forward-compat additions covering the most common UI affordances
  // across LVIS plugins (settings dialogs, action menus, status badges,
  // schedule/calendar widgets, people lists, kebab overflow menus,
  // visibility toggles, meeting/call mute states, KPI/data viz).
  // Convention: binary on/off pairs use `<base>-off` (e.g. mic/mic-off,
  // bell/bell-off, eye/eye-off). Volume mute is aliased two ways —
  // `volume-x` (lucide name) and `volume-off` (LVIS convention).
  check: Check,
  x: X,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  edit: Pencil,
  copy: Copy,
  download: Download,
  upload: Upload,
  save: Save,
  loader: Loader2,
  warning: AlertTriangle,
  info: Info,
  error: AlertCircle,
  "external-link": ExternalLink,
  // Time / schedule
  calendar: Calendar,
  clock: Clock,
  bell: Bell,
  // People
  user: User,
  users: Users,
  // Communication
  mail: Mail,
  send: Send,
  // Settings + overflow + help
  settings: Settings,
  "more-horizontal": MoreHorizontal,
  "help-circle": HelpCircle,
  // Visibility / security (incl. off-variants)
  eye: Eye,
  "eye-off": EyeOff,
  lock: Lock,
  unlock: Unlock,
  "shield-check": ShieldCheck,
  // Meeting / call (incl. off-variants for mute/camera-off)
  video: Video,
  "video-off": VideoOff,
  mic: Mic,
  "mic-off": MicOff,
  phone: Phone,
  "volume-2": Volume2,
  "volume-x": VolumeX,
  "volume-off": VolumeX,
  // Notifications (incl. off-variant)
  "bell-off": BellOff,
  // Media controls
  pause: Pause,
  // Tables / KPI / data
  filter: Filter,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "bar-chart": BarChart3,
  activity: Activity,
  // Favorites / saved
  star: Star,
  pin: Pin,
  bookmark: Bookmark,
  // Agent-hub / dashboard
  bot: Bot,
  briefcase: Briefcase,
  home: Home,
  building: Building2,
  // Navigation extras
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  // Share / link / messaging
  share: Share2,
  link: LinkIcon,
  "message-square": MessageSquare,
  "at-sign": AtSign,
  paperclip: Paperclip,
  reply: Reply,
  forward: Forward,
  // State variants (filled)
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  circle: Circle,
  "circle-dot": CircleDot,
  // Layout views
  list: List,
  "layout-grid": LayoutGrid,
  // Time / location
  timer: Timer,
  "map-pin": MapPin,
  // System
  power: Power,
  zap: Zap,
  terminal: Terminal,
  archive: Archive,
  // Feedback
  "thumbs-up": ThumbsUp,
  // General-purpose
  minus: Minus,
  file: File,
  tag: Tag,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * All registered icon names — derived from `ICONS` so adding a new
 * entry to the map automatically exposes it here. Useful for tests
 * (assert every name resolves to a renderable component) and for
 * Storybook controls without hand-duplicating the list.
 */
export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];

export interface IconProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  name: IconName;
  /** Icon side length in pixels. Default 16. */
  size?: number;
}

export function Icon({
  name,
  size = 16,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  ...rest
}: IconProps): React.ReactElement {
  const Component = ICONS[name];
  // Default to aria-hidden=true for decorative icons; consumer overrides
  // with `aria-label` for meaningful icons (which also implicitly removes
  // the hidden state).
  const hidden = ariaHidden ?? (ariaLabel === undefined ? true : undefined);
  // Merge consumer's className with `lvis-icon` so the default
  // `color: var(--lvis-fg)` rule applies; consumer's selectors (and
  // inline `style.color`) still win on specificity / cascade.
  const mergedClassName = className ? `lvis-icon ${className}` : "lvis-icon";
  return (
    <Component
      size={size}
      className={mergedClassName}
      aria-hidden={hidden}
      aria-label={ariaLabel}
      {...rest}
    />
  );
}
