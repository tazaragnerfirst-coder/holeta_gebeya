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
  // Marketplace category-icon set (#hog054) — broad but curated, not
  // exhaustive: picked to cover Holeta Gebeya's common category
  // concepts (electronics, vehicles, fashion, home, food, pets,
  // sports, tools, music, books, health, real estate) so new
  // categories usually find a fit here without a code change. Every
  // name below is verified against the installed @phosphor-icons/react
  // package's actual exports before being added — don't add a name
  // here without checking it exists in node_modules first, an
  // unverified import breaks the whole build.
  Laptop, DeviceMobile, DeviceTablet, Headphones, Television, GameController,
  Printer, HardDrive, Keyboard, Mouse, Watch, VideoCamera, Microphone,
  SpeakerHigh, BatteryFull, Drone, Gauge,
  Motorcycle, Bicycle, Truck, Bus, Airplane, Boat, Van, SteeringWheel, GasPump,
  Backpack, Handbag, Sneaker, Sunglasses, Diamond, Umbrella,
  Armchair, Bed, Lamp, Couch, Door, Toilet, Bathtub, CookingPot, ForkKnife,
  Oven, Broom, WashingMachine, PaintRoller, Fan,
  Coffee, CoffeeBean, Wine, BeerBottle, Bread, Pizza, Hamburger, Fish,
  Baby, Dog, Cat, PawPrint, Bird, Rabbit, Horse, Cow,
  Barbell, Basketball, Football, SoccerBall, TennisBall, Tent, Campfire, Wheelchair,
  Wrench, Hammer, Toolbox, PaintBrush, PaintBucket,
  Guitar, PianoKeys, MusicNote,
  Book, Books, Notebook, Pencil, Ruler, GraduationCap, PuzzlePiece,
  Stethoscope, FirstAid, Pill, Syringe, Scissors,
  Building, Buildings, Warehouse, Factory, Barn, Tree, Flower,
  Gift, Ticket, Tag, Money,
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

  // Marketplace category-icon set (#hog054) — see import comment above.
  // Keys here are what admin's category Icon field / picker use.
  laptop: Laptop,
  mobile: DeviceMobile,
  tablet: DeviceTablet,
  headphones: Headphones,
  tv: Television,
  gameController: GameController,
  printer: Printer,
  hardDrive: HardDrive,
  keyboard: Keyboard,
  mouse: Mouse,
  watch: Watch,
  videoCamera: VideoCamera,
  microphone: Microphone,
  speaker: SpeakerHigh,
  battery: BatteryFull,
  drone: Drone,
  gauge: Gauge,
  motorcycle: Motorcycle,
  bicycle: Bicycle,
  truck: Truck,
  bus: Bus,
  airplane: Airplane,
  boat: Boat,
  van: Van,
  steeringWheel: SteeringWheel,
  gasPump: GasPump,
  backpack: Backpack,
  handbag: Handbag,
  sneaker: Sneaker,
  sunglasses: Sunglasses,
  diamond: Diamond,
  umbrella: Umbrella,
  armchair: Armchair,
  bed: Bed,
  lamp: Lamp,
  couch: Couch,
  door: Door,
  toilet: Toilet,
  bathtub: Bathtub,
  cookingPot: CookingPot,
  forkKnife: ForkKnife,
  oven: Oven,
  broom: Broom,
  washingMachine: WashingMachine,
  paintRoller: PaintRoller,
  fan: Fan,
  coffee: Coffee,
  coffeeBean: CoffeeBean,
  wine: Wine,
  beer: BeerBottle,
  bread: Bread,
  pizza: Pizza,
  hamburger: Hamburger,
  fish: Fish,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  pawPrint: PawPrint,
  bird: Bird,
  rabbit: Rabbit,
  horse: Horse,
  cow: Cow,
  barbell: Barbell,
  basketball: Basketball,
  football: Football,
  soccerBall: SoccerBall,
  tennisBall: TennisBall,
  tent: Tent,
  campfire: Campfire,
  wheelchair: Wheelchair,
  wrench: Wrench,
  hammer: Hammer,
  toolbox: Toolbox,
  paintBrush: PaintBrush,
  paintBucket: PaintBucket,
  guitar: Guitar,
  piano: PianoKeys,
  musicNote: MusicNote,
  book: Book,
  books: Books,
  notebook: Notebook,
  pencil: Pencil,
  ruler: Ruler,
  graduationCap: GraduationCap,
  puzzlePiece: PuzzlePiece,
  stethoscope: Stethoscope,
  firstAid: FirstAid,
  pill: Pill,
  syringe: Syringe,
  scissors: Scissors,
  building: Building,
  buildings: Buildings,
  warehouse: Warehouse,
  factory: Factory,
  barn: Barn,
  tree: Tree,
  flower: Flower,
  gift: Gift,
  ticket: Ticket,
  tag: Tag,
  money: Money,
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
