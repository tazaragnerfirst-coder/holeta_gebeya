import {
  MagnifyingGlass, MapPin, SquaresFour, CaretLeft, CaretRight, CaretDown,
  Phone, ChatCircle, Flag, Camera, TrendUp, Shield, Eye, Star, Heart,
  Question, User, Plus, House, Briefcase, PaperPlaneTilt, Clock,
  CheckCircle, Image, X, SlidersHorizontal, XCircle,
  ClockCounterClockwise, Check, ArrowUp, Warning, PencilSimple,
  SignOut, Pause, Play, Crown, Storefront, SealCheck, GearSix, Coins,
  Globe, BookmarkSimple, ShareNetwork, Lock,
  ChartBar, ListBullets, Vibrate, Wallet, ArrowDown, CopySimple, ArrowsLeftRight,
} from 'phosphor-react-native';
import { colors } from '../theme';

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
};

export default function Icon({ name, size = 20, color = colors.inkSoft, weight = 'regular', style }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph size={size} color={color} weight={weight} style={style} />;
}
