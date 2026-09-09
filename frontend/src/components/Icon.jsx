import React from 'react';
import {
  MagnifyingGlass, MapPin, SquaresFour, CaretLeft, CaretRight, CaretDown,
  Phone, ChatCircle, Flag, Camera, TrendUp, Shield, Eye, Star, Heart,
  Question, User, Plus, House, Briefcase, PaperPlaneTilt, Clock,
  CheckCircle, Cpu, TShirt, Car, Image, X, SlidersHorizontal, XCircle,
  ClockCounterClockwise, SmileySad, Check, ArrowUp, Warning, PencilSimple,
  SignOut, Pause, Play, Crown, Storefront, SealCheck, GearSix, Coins,
  Globe, BookmarkSimple, ShareNetwork, Sun, Moon, Monitor, Paperclip,
  WifiSlash, TiktokLogo, InstagramLogo, WhatsappLogo, Lock,
  ChartBar, ListBullets, Vibrate, Wallet,
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
//
// Audit (per Taza, keep each concept its own icon — don't reuse one
// glyph across unrelated meanings just because it was already
// imported): shieldLock (SealCheck) is reserved for the seller
// "Verified" seal only — Privacy Policy got its own `lock` (Lock)
// instead of borrowing that seal. `gear` (GearSix, was named
// "sliders2") is the actual Settings entry point; `sliders`
// (SlidersHorizontal) stays for adjustable-value rows like Display.
// Vibration is the haptic-feedback toggle (was mislabeled "Vibrant"
// and left unwired — see lib/vibration.js) — got its own `vibrate`
// (Vibrate) rather than the Settings gear.
// `briefcase` (Briefcase) is reserved for the Job post type/category
// only — the Dashboard nav tab got its own `chartBar` (ChartBar,
// analytics) and Profile's "My Ads" got `listBullets` (ListBullets,
// a list of your own listings), instead of both borrowing Job's icon.
// `wallet` (Wallet) is the real spendable-balance Wallet feature —
// kept separate from `coin` (Coins), which stays reserved for the
// unrelated, not-yet-built "Holeta Coin" feature.
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
  gear: GearSix,
  lock: Lock,
  vibrate: Vibrate,
  chartBar: ChartBar,
  listBullets: ListBullets,
  coin: Coins,
  wallet: Wallet,
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

export default function Icon({ name, size = 20, weight = 'regular', className = '', style, ...rest }) {
  const Component = COMPONENTS[name];
  if (!Component) return null;
  return (
    <Component
      className={className}
      style={style}
      size={size}
      weight={weight}
      color="currentColor"
      {...rest}
    />
  );
}
