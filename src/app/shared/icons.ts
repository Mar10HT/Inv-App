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
  ShoppingCart,

  // Charts & Analytics
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,

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
  FileText,
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
  type LucideIconData
} from 'lucide-angular';

// All icons used in the app
export const APP_ICONS: Record<string, LucideIconData> = {
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
  ShoppingCart,

  // Charts & Analytics
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,

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
  FileText,
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

// Material Icon to Lucide mapping for easy migration
export const ICON_MAP: Record<string, string> = {
  // Navigation
  'arrow_back': 'ArrowLeft',
  'arrow_forward': 'ArrowRight',
  'arrow_upward': 'ArrowUp',
  'arrow_downward': 'ArrowDown',
  'swap_horiz': 'ArrowLeftRight',
  'chevron_left': 'ChevronLeft',
  'chevron_right': 'ChevronRight',
  'expand_less': 'ChevronUp',
  'expand_more': 'ChevronDown',
  'close': 'X',
  'clear': 'X',
  'menu': 'Menu',
  'more_horiz': 'MoreHorizontal',
  'more_vert': 'MoreVertical',
  'open_in_new': 'ExternalLink',
  'keyboard_return': 'CornerDownLeft',

  // Actions
  'add': 'Plus',
  'add_circle': 'PlusCircle',
  'edit': 'Pencil',
  'delete': 'Trash2',
  'delete_forever': 'Trash2',
  'save': 'Save',
  'download': 'Download',
  'upload': 'Upload',
  'cloud_upload': 'CloudUpload',
  'cloud_sync': 'RefreshCw',
  'refresh': 'RefreshCw',
  'sync': 'RefreshCw',
  'search': 'Search',
  'search_off': 'SearchX',
  'filter_list': 'Filter',
  'content_copy': 'Copy',
  'check': 'Check',
  'check_circle': 'CheckCircle2',
  'block': 'Ban',
  'lock': 'Lock',
  'lock_open': 'Unlock',

  // User & Auth
  'person': 'User',
  'people': 'Users',
  'group': 'Users',
  'person_add': 'UserPlus',
  'person_remove': 'UserMinus',
  'person_off': 'UserX',
  'how_to_reg': 'UserCheck',
  'account_circle': 'CircleUser',
  'login': 'LogIn',
  'logout': 'LogOut',
  'admin_panel_settings': 'ShieldCheck',
  'verified_user': 'ShieldCheck',
  'badge': 'BadgeCheck',

  // Business & Inventory
  'inventory': 'Package',
  'inventory_2': 'Package',
  'add_shopping_cart': 'PackagePlus',
  'remove_shopping_cart': 'PackageX',
  'warehouse': 'Warehouse',
  'local_shipping': 'Truck',
  'category': 'Tag',
  'label': 'Tag',
  'sell': 'Tags',
  'qr_code': 'QrCode',
  'qr_code_scanner': 'QrCode',
  'receipt': 'Receipt',
  'receipt_long': 'Receipt',
  'payment': 'CreditCard',
  'payments': 'CreditCard',
  'credit_card': 'CreditCard',
  'attach_money': 'DollarSign',
  'shopping_cart': 'ShoppingCart',

  // Charts & Analytics
  'bar_chart': 'BarChart2',
  'assessment': 'BarChart3',
  'add_chart': 'BarChart3',
  'show_chart': 'LineChart',
  'donut_large': 'PieChart',
  'pie_chart': 'PieChart',
  'trending_up': 'TrendingUp',
  'trending_down': 'TrendingDown',
  'insights': 'Activity',

  // Layout & Dashboard
  'dashboard': 'LayoutDashboard',
  'grid_view': 'LayoutGrid',
  'list': 'List',
  'table_chart': 'Table',
  'view_column': 'Columns',
  'table_rows': 'Rows',

  // Time & Calendar
  'schedule': 'Clock',
  'access_time': 'Clock',
  'pending': 'Clock',
  'calendar_today': 'Calendar',
  'event': 'CalendarDays',
  'history': 'History',
  'timer': 'Timer',

  // Communication
  'email': 'Mail',
  'mail': 'Mail',
  'phone': 'Phone',
  'call': 'Phone',
  'notifications': 'Bell',
  'notifications_active': 'BellRing',
  'chat': 'MessageSquare',
  'message': 'MessageSquare',

  // Status & Alerts
  'error': 'AlertCircle',
  'warning': 'AlertTriangle',
  'info': 'Info',
  'help': 'HelpCircle',
  'report_problem': 'CircleAlert',

  // Files & Documents
  'description': 'File',
  'insert_drive_file': 'File',
  'article': 'FileText',
  'picture_as_pdf': 'FileText',
  'folder_open': 'FolderOpen',
  'content_paste': 'Clipboard',
  'assignment': 'ClipboardList',

  // Settings & Config
  'settings': 'Settings',
  'tune': 'Settings2',
  'sliders': 'Sliders',
  'palette': 'Palette',
  'language': 'Globe',
  'light_mode': 'Sun',
  'dark_mode': 'Moon',
  'brightness_high': 'Sun',
  'brightness_2': 'Moon',

  // Hardware & Tech
  'computer': 'Monitor',
  'devices': 'Monitor',
  'storage': 'HardDrive',
  'memory': 'Cpu',
  'dns': 'Database',

  // Location
  'place': 'MapPin',
  'location_on': 'MapPin',
  'person_pin': 'MapPin',
  'near_me': 'Navigation',

  // Misc
  'home': 'Home',
  'business': 'Building2',
  'visibility': 'Eye',
  'visibility_off': 'EyeOff',
  'hourglass_empty': 'Loader2',
  'autorenew': 'RotateCw'
};

// Helper function to get Lucide icon name from Material icon name
export function getLucideIcon(materialIcon: string): string {
  return ICON_MAP[materialIcon] || materialIcon;
}

// Export the module configuration
export const LucideIconsModule = LucideAngularModule.pick(APP_ICONS);
