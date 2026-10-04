import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';

// The `icon` text stored on each category (from the ERD seed) -> MUI icon
const ICONS = {
  briefcase: WorkOutlinedIcon,
  folder: FolderOutlinedIcon,
  'credit-card': CreditCardOutlinedIcon,
  truck: LocalShippingOutlinedIcon,
  'shield-plus': HealthAndSafetyOutlinedIcon,
  'graduation-cap': SchoolOutlinedIcon,
  'id-card': BadgeOutlinedIcon,
  package: Inventory2OutlinedIcon,
  'file-text': ArticleOutlinedIcon,
  'plus-circle': AddCircleOutlinedIcon,
};

export const getCategoryIcon = (name) => ICONS[name] || AddCircleOutlinedIcon;