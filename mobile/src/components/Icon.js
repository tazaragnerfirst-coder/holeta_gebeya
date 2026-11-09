import {
  MagnifyingGlass, MapPin, SquaresFour, CaretLeft, CaretRight, CaretDown,
  Phone, ChatCircle, Flag, Camera, TrendUp, Shield, Eye, Star, Heart,
  Question, User, Plus, House, Briefcase, PaperPlaneTilt, Clock,
  CheckCircle, Image, X, SlidersHorizontal, XCircle,
  ClockCounterClockwise, Check, ArrowUp, Warning, PencilSimple,
  SignOut, Pause, Play, Crown, Storefront, SealCheck, GearSix, Coins,
  Globe, BookmarkSimple, ShareNetwork, Lock,
  ChartBar, ListBullets, Vibrate, Wallet, ArrowDown, CopySimple, ArrowsLeftRight,
  SmileySad, Sun, Moon, Monitor, Paperclip, WifiSlash, TiktokLogo, InstagramLogo, WhatsappLogo,
} from 'phosphor-react-native';
import Svg, { Path, Rect, Polygon } from 'react-native-svg';
import { colors } from '../theme';

// Custom icon (same drawing as VideoStack in frontend/src/components/Icon.jsx):
// a front card with a play triangle over a partly-visible back card.
function VideoStack({ size = 20, color = colors.inkSoft, style }) {
  return (
    <Svg width={size} height={size} viewBox="240 200 300 320" fill="none" style={style}>
      <Path d="M458 233 H488 A30 30 0 0 1 518 263 V461 A30 30 0 0 1 488 491 H458" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={265} y={221} width={190} height={278} rx={38} stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Polygon points="338,325 399,360 338,395" fill={color} />
    </Svg>
  );
}

// Same name -> glyph mapping as frontend/src/components/Icon.jsx
// (UI subset only — category glyphs aren't needed on mobile yet).
// Both sides use the Phosphor icon family, so names match 1:1.
const ICONS = {
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
  image: Image,
  x: X,
  sliders: SlidersHorizontal,
  xCircle: XCircle,
  history: ClockCounterClockwise,
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
  arrowDown: ArrowDown,
  copy: CopySimple,
  swap: ArrowsLeftRight,
  globe: Globe,
  bookmark: BookmarkSimple,
  share: ShareNetwork,
  frown: SmileySad,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  paperclip: Paperclip,
  wifiOff: WifiSlash,
  tiktok: TiktokLogo,
  instagram: InstagramLogo,
  whatsapp: WhatsappLogo,
  videoStack: VideoStack,
};

export default function Icon({ name, size = 20, color = colors.inkSoft, weight = 'regular', style }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph size={size} color={color} weight={weight} style={style} />;
}
