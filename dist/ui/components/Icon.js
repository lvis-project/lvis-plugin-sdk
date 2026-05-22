// src/ui/tokens/theme-bundles.ts
var BUNDLE_IDS = [
  "cherry-blossom",
  "tokyo-night",
  "midnight",
  "forest",
  "violet-light",
  "violet-dark",
  "high-contrast",
  "catppuccin-mocha",
  "catppuccin-latte",
  "nord",
  "gruvbox-dark-hard",
  "solarized-light",
  "rose-pine"
];

// src/ui/tokens/index.ts
var LVIS_TOKEN_NAMES = [
  "--lvis-bg",
  "--lvis-surface",
  "--lvis-surface-overlay",
  "--lvis-fg",
  "--lvis-fg-muted",
  "--lvis-fg-disabled",
  "--lvis-primary",
  "--lvis-primary-fg",
  "--lvis-secondary",
  "--lvis-secondary-fg",
  "--lvis-danger",
  "--lvis-danger-fg",
  "--lvis-warning",
  "--lvis-warning-fg",
  "--lvis-success",
  "--lvis-success-fg",
  "--lvis-border",
  "--lvis-ring",
  // Derived tinted-surface tokens — pre-computed color-mix values shipped by the host.
  // Plugins use these directly instead of reinventing color-mix derivations.
  "--lvis-danger-bg-subtle",
  "--lvis-focus-shadow",
  "--lvis-primary-bg-strong",
  "--lvis-primary-bg-subtle",
  "--lvis-success-bg-subtle",
  "--lvis-surface-hover",
  "--lvis-warning-bg-subtle",
  "--lvis-radius-xs",
  "--lvis-radius-sm",
  "--lvis-radius",
  "--lvis-radius-lg",
  "--lvis-radius-full",
  "--lvis-text-xs",
  "--lvis-text-sm",
  "--lvis-text-base",
  "--lvis-text-lg",
  "--lvis-weight-normal",
  "--lvis-weight-medium",
  "--lvis-weight-semibold",
  "--lvis-space-1",
  "--lvis-space-2",
  "--lvis-space-3",
  "--lvis-space-4",
  "--lvis-motion-fast",
  "--lvis-motion-normal"
];
var LVIS_THEME_BUNDLE_IDS = Object.freeze([...BUNDLE_IDS]);

// src/ui/tokens/inject.ts
var _ALLOWED_KEYS = new Set(LVIS_TOKEN_NAMES);
function injectTokenCss(id, css, targetDoc) {
  const doc = targetDoc ?? (typeof document === "undefined" ? null : document);
  if (!doc) return;
  const existing = doc.getElementById(id);
  if (existing) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const el = doc.createElement("style");
  el.id = id;
  el.textContent = css;
  doc.head.appendChild(el);
}

// src/ui/components/Icon.tsx
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
  Zap
} from "lucide-react";
import { jsx } from "react/jsx-runtime";
injectTokenCss(
  "lvis-icon",
  `.lvis-icon { color: var(--lvis-fg); flex-shrink: 0; }`
);
var ICONS = {
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
  tag: Tag
};
var ICON_NAMES = Object.keys(ICONS);
function Icon({
  name,
  size = 16,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
  ...rest
}) {
  const Component = ICONS[name];
  const hidden = ariaHidden ?? (ariaLabel === void 0 ? true : void 0);
  const mergedClassName = className ? `lvis-icon ${className}` : "lvis-icon";
  return /* @__PURE__ */ jsx(
    Component,
    {
      size,
      className: mergedClassName,
      "aria-hidden": hidden,
      "aria-label": ariaLabel,
      ...rest
    }
  );
}
export {
  ICON_NAMES,
  Icon
};
