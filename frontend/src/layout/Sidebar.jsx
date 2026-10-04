import { NavLink } from 'react-router-dom';
import {
  Avatar, Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { useAuth } from '../auth/AuthContext';
import { NAV_SECTIONS, isReviewer } from './navigation';

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const sections = NAV_SECTIONS.filter((s) => !s.reviewersOnly || isReviewer(user));

  return (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column', p: 2, overflowY: 'auto',
      borderRadius: 4, color: '#fff',
      background: (t) => `linear-gradient(180deg, ${t.palette.sidebar.main} 0%, ${t.palette.sidebar.dark} 100%)`,
    }}>
      {sections.map((section) => (
        <Box key={section.title} sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', px: 1.5, mt: 1, mb: 0.5 }}>
            {section.title}
          </Typography>
          <List disablePadding>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  sx={{
                    borderRadius: 2.5, mb: 0.5, color: 'rgba(255,255,255,0.85)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                    '&.active': {
                      color: '#fff',
                      background: 'linear-gradient(90deg, #2aa36b, #1f8a5b)',
                      boxShadow: '0 6px 16px rgba(31,138,91,0.35)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 600, fontSize: 15 } }} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ))}

      {/* User card + logout, pinned to the bottom */}
      <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 0.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#9575cd' }}>
            <PersonIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={700} fontSize={14}>
              {user.rank ? `${user.rank} / ${user.full_name}` : user.full_name}
            </Typography>
            <Typography noWrap fontSize={12} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {[user.unit_name, user.site_name].filter(Boolean).join(' — ')}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth onClick={logout} startIcon={<PowerSettingsNewIcon />}
          sx={{ bgcolor: 'rgba(255,138,101,0.12)', color: '#ff8a65', py: 1.2,
                '&:hover': { bgcolor: 'rgba(255,138,101,0.2)' } }}
        >
          تسجيل الخروج
        </Button>
      </Box>
    </Box>
  );
}