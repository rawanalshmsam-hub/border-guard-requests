import BloodtypeOutlinedIcon from '@mui/icons-material/BloodtypeOutlined';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import FingerprintOutlinedIcon from '@mui/icons-material/FingerprintOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';

// Home ⑦ "خدمات إضافية" — pages planned for later; they open the "coming soon" page for now
export const EXTRA_SERVICES = [
  { slug: 'blood-donation', label: 'التبرع بالدم', icon: BloodtypeOutlinedIcon, tone: 'error' },
  { slug: 'emergency-contacts', label: 'جهات اتصال الطوارئ', icon: PhoneOutlinedIcon, tone: 'error' },
  { slug: 'ranks', label: 'الرتب والترقيات', icon: StarBorderOutlinedIcon },
  { slug: 'units', label: 'الفصائل', icon: HomeWorkOutlinedIcon },
  { slug: 'attendance', label: 'الحضور والانصراف', icon: FingerprintOutlinedIcon },
  { slug: 'achievements', label: 'الشهادات والتكريم', icon: WorkspacePremiumOutlinedIcon },
  { slug: 'help', label: 'مركز المساعدة', icon: HelpOutlineIcon, to: '/help' },
  { slug: 'unit-directory', label: 'دليل الوحدة', icon: ContactsOutlinedIcon },
];