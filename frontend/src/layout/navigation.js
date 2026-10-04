import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
// Same roles the backend allows on the review APIs
export const REVIEWER_ROLES = ['OFFICER', 'FINANCE', 'ADMIN'];
export const isReviewer = (user) => Boolean(user && REVIEWER_ROLES.includes(user.role));

export const NAV_SECTIONS = [
  {
    title: 'عام',
    items: [
      { to: '/', label: 'الرئيسية', icon: HomeOutlinedIcon, end: true },
      { to: '/calendar', label: 'التقويم', icon: CalendarMonthOutlinedIcon },
      { to: '/requests/new', label: 'طلب جديد', icon: AddIcon },
      { to: '/requests', label: 'طلباتي', icon: DescriptionOutlinedIcon, end: true },
      { to: '/notifications', label: 'الإشعارات', icon: NotificationsNoneOutlinedIcon },
    ],
  },
  {
    title: 'صلاحيات القيادة',
    reviewersOnly: true,
    items: [
      { to: '/review', label: 'مراجعة الطلبات', icon: AssignmentOutlinedIcon },
    ],
  },
  {
    title: 'الحساب',
    items: [
      { to: '/profile', label: 'الملف الشخصي', icon: PersonOutlineIcon },
      { to: '/settings', label: 'الإعدادات', icon: LanguageIcon },
      { to: '/help', label: 'الدعم الفني', icon: HelpOutlineIcon },
    ],
  },
];

// Title + subtitle shown in the top bar for each page (most specific first)
const PAGE_META = [
  { path: '/', exact: true, title: 'الرئيسية', subtitle: 'نظرة عامة على حالتك وطلباتك' },
  { path: '/requests/new', title: 'طلب جديد', subtitle: 'اختر نوع الطلب ثم أكمل البيانات' },
  { path: '/requests', title: 'طلباتي', subtitle: 'متابعة طلباتك وحالتها' },
  { path: '/review', title: 'مراجعة الطلبات', subtitle: 'الطلبات الجديدة والمراجعة' },
  { path: '/notifications', title: 'الإشعارات', subtitle: 'آخر التحديثات على طلباتك' },
  { path: '/calendar', title: 'التقويم', subtitle: 'الإجازات ومواعيد العودة' },
  { path: '/profile', title: 'الملف الشخصي', subtitle: 'بياناتك الأساسية' },
  { path: '/settings', title: 'الإعدادات', subtitle: 'تفضيلات الحساب' },
  { path: '/help', title: 'الدعم الفني', subtitle: 'المساعدة والأسئلة الشائعة' },
];

export function getPageMeta(pathname) {
  return PAGE_META.find((p) =>
    p.exact ? pathname === p.path : pathname === p.path || pathname.startsWith(`${p.path}/`),
  ) || PAGE_META[0];
}