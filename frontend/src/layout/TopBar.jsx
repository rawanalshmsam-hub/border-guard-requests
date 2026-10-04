import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';

export default function TopBar({ title, subtitle, unreadCount, showMenu, onMenuClick }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      {showMenu && (
        <IconButton onClick={onMenuClick} aria-label="القائمة">
          <MenuIcon />
        </IconButton>
      )}

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} noWrap>{title}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{subtitle}</Typography>
      </Box>

      {/* Global search — wired to an API later */}
      <TextField
        size="small"
        placeholder="ابحث عن طلب، خدمة، أو موظف..."
        sx={{ flex: 1, maxWidth: 440, mx: 'auto', display: { xs: 'none', sm: 'flex' },
              '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
        <IconButton
          onClick={() => navigate('/notifications')} aria-label="الإشعارات"
          sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}
        >
          <Badge color="error" variant="dot" invisible={!unreadCount}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
        <Avatar
          onClick={() => navigate('/profile')}
          sx={{ width: 48, height: 48, cursor: 'pointer', bgcolor: 'background.paper',
                color: '#5e35b1', border: 2, borderColor: 'primary.main' }}
        >
          <PersonIcon />
        </Avatar>
      </Box>
    </Box>
  );
}