import React from 'react';
import {
  Search, MapPin, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown,
  Phone, MessageCircle, Flag, Camera, TrendingUp, Shield, Eye, Star,
  Heart, HelpCircle, User, Plus, Home, Briefcase, Send, Clock,
  CheckCircle, Cpu, Shirt, Car, Image, X, SlidersHorizontal, XCircle,
  History, Frown, Check, ArrowUp, AlertTriangle, Pencil, LogOut, Pause,
  Play, Crown, Store, ShieldCheck, Settings2, Coins, Globe, Bookmark,
  Share2, Sun, Moon, Monitor, Paperclip, WifiOff,
} from 'lucide-react';

// Icon set: lucide-react for the general outline set (swapped in from the
// original hand-drawn single-stroke set — same visual language, actively
// maintained library). Brand icons (tiktok/instagram/whatsapp) are kept as
// hand-drawn single-stroke SVG so they match this outline language instead
// of looking like dropped-in brand logos.
const COMPONENTS = {
  search: Search,
  mapPin: MapPin,
  grid: LayoutGrid,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  phone: Phone,
  chat: MessageCircle,
  flag: Flag,
  camera: Camera,
  trendingUp: TrendingUp,
  shield: Shield,
  eye: Eye,
  star: Star,
  heart: Heart,
  helpCircle: HelpCircle,
  user: User,
  plus: Plus,
  home: Home,
  briefcase: Briefcase,
  send: Send,
  clock: Clock,
  checkCircle: CheckCircle,
  cpu: Cpu,
  shirt: Shirt,
  car: Car,
  image: Image,
  x: X,
  sliders: SlidersHorizontal,
  xCircle: XCircle,
  history: History,
  frown: Frown,
  check: Check,
  arrowUp: ArrowUp,
  alertTriangle: AlertTriangle,
  edit: Pencil,
  logOut: LogOut,
  pause: Pause,
  play: Play,
  crown: Crown,
  store: Store,
  shieldLock: ShieldCheck,
  sliders2: Settings2,
  coin: Coins,
  globe: Globe,
  bookmark: Bookmark,
  share: Share2,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  paperclip: Paperclip,
  wifiOff: WifiOff,
};

// Brand icons — not in lucide (or lucide's version reads as a generic
// brand-logo style that clashes with the outline language here) — kept as
// the original hand-drawn single-stroke paths.
const BRAND_PATHS = {
  tiktok: '<path d="M15 3v10.5a3.5 3.5 0 11-3-3.46"/><path d="M15 3a5 5 0 005 5"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".6" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M6.5 17.5L4 20l2.6-2.4A8.5 8.5 0 1120 12a8.5 8.5 0 01-13.5 5.5z"/><path d="M8.5 8.8c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.5l-.5.6c-.1.2-.1.3 0 .5.4.8 1.4 1.8 2.2 2.2.2.1.3.1.5 0l.6-.5c.1-.1.3-.2.5-.1l1.7.7c.3.1.4.3.4.5v.5c0 .3 0 .6-.5.8-.6.3-1.4.4-2.4-.1-1.3-.6-2.9-2.2-3.5-3.5-.5-1-.4-1.8-.1-2.4z"/>',
};

export default function Icon({ name, size = 20, className = '', style, ...rest }) {
  const brandPath = BRAND_PATHS[name];
  if (brandPath) {
    return (
      <svg
        className={className}
        style={style}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: brandPath }}
        {...rest}
      />
    );
  }
  const Component = COMPONENTS[name];
  if (!Component) return null;
  return (
    <Component
      className={className}
      style={style}
      size={size}
      strokeWidth={1.8}
      {...rest}
    />
  );
}
