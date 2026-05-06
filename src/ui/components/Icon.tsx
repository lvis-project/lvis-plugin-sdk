// Side-effect: ensure the `:root` token fallback is present so plugins
// that import only `Icon` and use `var(--lvis-*)` in their own CSS still
// get sensible token values during the brief mount → host-broadcast
// window. SDK 4.0.1 ensures `injectTokenCss` lazily emits the fallback,
// so any component file that *doesn't* call `injectTokenCss` (Icon
// renders lucide SVGs directly, no CSS injection) breaks the invariant
// unless we route through the fallback shim explicitly.
import "../tokens/fallback.js";
import * as React from "react";
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
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  ...rest
}: IconProps): React.ReactElement {
  const Component = ICONS[name];
  // Default to aria-hidden=true for decorative icons; consumer overrides
  // with `aria-label` for meaningful icons (which also implicitly removes
  // the hidden state).
  const hidden = ariaHidden ?? (ariaLabel === undefined ? true : undefined);
  return (
    <Component
      size={size}
      aria-hidden={hidden}
      aria-label={ariaLabel}
      {...rest}
    />
  );
}
