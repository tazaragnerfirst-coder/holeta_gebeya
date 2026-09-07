import React from 'react';
import {
  MagnifyingGlass, MapPin, SquaresFour, CaretLeft, CaretRight, CaretDown,
  Phone, ChatCircle, Flag, Camera, TrendUp, Shield, Eye, Star, Heart,
  Question, User, Plus, House, Briefcase, PaperPlaneTilt, Clock,
  CheckCircle, Cpu, TShirt, Car, Image, X, SlidersHorizontal, XCircle,
  ClockCounterClockwise, SmileySad, Check, ArrowUp, Warning, PencilSimple,
  SignOut, Pause, Play, Crown, Storefront, SealCheck, GearSix, Coins,
  Globe, BookmarkSimple, ShareNetwork, Sun, Moon, Monitor, Paperclip,
  WifiSlash, TiktokLogo, InstagramLogo, WhatsappLogo,
} from '@phosphor-icons/react';

// Icon set: Phosphor (regular/outline weight) — swapped in from
// lucide-react per Taza's request after two repeat gaps: the
// verification badge (shieldLock) read as a generic padlock rather
// than a "verified" mark, and the coin icon (coin) looked flat/
// abstract. Phosphor's SealCheck and Coins read correctly for both,
// and Phosphor also ships real brand marks for tiktok/instagram/
// whatsapp in the same outline weight — so unlike the lucide swap,
// the brand icons no longer need to be hand-drawn separately; they
// come from the same family and stay visually consistent.
const COMPONENTS = {
  search: MagnifyingGlass,
  mapPin: MapPin,
  grid: SquaresFour,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronDown: CaretDown,
  phone: Phone,
  chat: ChatCircle,
  flag: Flag,
  camera: Camera,
  trendingUp: TrendUp,
  shield: Shield,
  eye: Eye,
  star: Star,
  heart: Heart,
  helpCircle: Question,
  user: User,
  plus: Plus,
  home: House,
  briefcase: Briefcase,
  send: PaperPlaneTilt,
  clock: Clock,
  checkCircle: CheckCircle,
  cpu: Cpu,
  shirt: TShirt,
  car: Car,
  image: Image,
  x: X,
  sliders: SlidersHorizontal,
  xCircle: XCircle,
  history: ClockCounterClockwise,
  frown: SmileySad,
  check: Check,
  arrowUp: ArrowUp,
  alertTriangle: Warning,
  edit: PencilSimple,
  logOut: SignOut,
  pause: Pause,
  play: Play,
  crown: Crown,
  store: Storefront,
  shieldLock: SealCheck,
  sliders2: GearSix,
  coin: Coins,
  globe: Globe,
  bookmark: BookmarkSimple,
  share: ShareNetwork,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  paperclip: Paperclip,
  wifiOff: WifiSlash,
  tiktok: TiktokLogo,
  instagram: InstagramLogo,
  whatsapp: WhatsappLogo,
};

export default function Icon({ name, size = 20, className = '', style, ...rest }) {
  const Component = COMPONENTS[name];
  if (!Component) return null;
  return (
    <Component
      className={className}
      style={style}
      size={size}
      weight="regular"
      color="currentColor"
      {...rest}
    />
  );
}
