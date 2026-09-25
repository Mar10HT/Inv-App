import { LucideAngularModule } from 'lucide-angular';
import {
  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Menu,
  MoreHorizontal,
  MoreVertical,
  ExternalLink,
  Link,
  CornerDownLeft,

  // Actions
  Plus,
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  Download,
  Upload,
  CloudUpload,
  RefreshCw,
  Search,
  SearchX,
  Filter,
  Copy,
  Check,
  CheckCircle,
  CheckCircle2,
  Ban,
  Lock,
  Unlock,
  Send,
  SendHorizontal,
  Printer,

  // User & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  CircleUser,
  LogIn,
  LogOut,
  ShieldCheck,
  BadgeCheck,

  // Business & Inventory
  Package,
  PackagePlus,
  PackageX,
  PackageCheck,
  PackageMinus,
  Warehouse,
  Truck,
  Tag,
  Tags,
  Barcode,
  QrCode,
  ScanLine,
  Receipt,
  CreditCard,
  DollarSign,
  Banknote,
  ShoppingCart,

  // Charts & Analytics
  BarChart2,
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  CircleDot,

  // Layout & Dashboard
  LayoutDashboard,
  LayoutGrid,
  List,
  Table,
  Columns,
  Rows,

  // Time & Calendar
  Clock,
  Calendar,
  CalendarDays,
  History,
  Timer,

  // Communication
  Mail,
  Phone,
  Bell,
  BellRing,
  MessageSquare,

  // Status & Alerts
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  CircleAlert,
  XCircle,

  // Files & Documents
  File,
  FileQuestion,
  FileText,
  FileDown,
  FolderOpen,
  Clipboard,
  ClipboardList,

  // Settings & Config
  Settings,
  Settings2,
  Sliders,
  Palette,
  Globe,
  Sun,
  Moon,

  // Hardware & Tech
  Monitor,
  HardDrive,
  Cpu,
  Database,

  // Inventory Form icons
  Hash,
  Type,
  Layers,
  Scan,

  // Location
  MapPin,
  Navigation,

  // Misc
  Home,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  RotateCw,
  type LucideIconData,
  HandCoins,
  Shield,
  KeyRound,
  ClipboardCheck,
} from 'lucide-angular';

// All icons used in the app
export const APP_ICONS: Record<string, LucideIconData> = {
  // Sidebar icons
  HandCoins,
  Shield,
  KeyRound,

  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Menu,
  MoreHorizontal,
  MoreVertical,
  ExternalLink,
  Link,
  CornerDownLeft,

  // Actions
  Plus,
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  Download,
  Upload,
  CloudUpload,
  RefreshCw,
  Search,
  SearchX,
  Filter,
  Copy,
  Check,
  CheckCircle,
  CheckCircle2,
  Ban,
  Lock,
  Unlock,
  Send,
  SendHorizontal,
  Printer,

  // User & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  CircleUser,
  LogIn,
  LogOut,
  ShieldCheck,
  BadgeCheck,

  // Business & Inventory
  Package,
  PackagePlus,
  PackageX,
  PackageCheck,
  PackageMinus,
  Warehouse,
  Truck,
  Tag,
  Tags,
  Barcode,
  QrCode,
  ScanLine,
  Receipt,
  CreditCard,
  DollarSign,
  Banknote,
  ShoppingCart,

  // Charts & Analytics
  BarChart2,
  BarChart3,
  LineChart,
  AreaChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  CircleDot,

  // Layout & Dashboard
  LayoutDashboard,
  LayoutGrid,
  List,
  Table,
  Columns,
  Rows,

  // Time & Calendar
  Clock,
  Calendar,
  CalendarDays,
  History,
  Timer,

  // Communication
  Mail,
  Phone,
  Bell,
  BellRing,
  MessageSquare,

  // Status & Alerts
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  CircleAlert,
  XCircle,

  // Files & Documents
  File,
  FileQuestion,
  FileText,
  FileDown,
  FolderOpen,
  Clipboard,
  ClipboardCheck,
  ClipboardList,

  // Settings & Config
  Settings,
  Settings2,
  Sliders,
  Palette,
  Globe,
  Sun,
  Moon,

  // Hardware & Tech
  Monitor,
  HardDrive,
  Cpu,
  Database,

  // Inventory Form icons
  Hash,
  Type,
  Layers,
  Scan,

  // Location
  MapPin,
  Navigation,

  // Misc
  Home,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  RotateCw
};

// Export the module configuration
export const LucideIconsModule = LucideAngularModule.pick(APP_ICONS);
