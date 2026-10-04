import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Drawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useUnreadCount from '../hooks/useUnreadCount';
import { getPageMeta } from './navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const SIDEBAR_WIDTH = 260;

// Light diagonal stripes behind the top of the content card (as in the design)
const STRIPES = 'repeating-linear-gradient(135deg, rgba(20,38,29,0.035) 0 2px, transparent 2px 16px)';

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const unreadCount = useUnreadCount(pathname);
  const page = getPageMeta(pathname);

  return (
    <Box sx={{ display: 'flex', gap: 2, p: { xs: 1, md: 2 }, minHeight: '100vh', bgcolor: 'background.default' }}>
      {isDesktop ? (
        <Box component="aside" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, position: 'sticky', top: 16,
                                     height: 'calc(100vh - 32px)' }}>
          <Sidebar />
        </Box>
      ) : (
        // In RTL, MUI flips anchor "left" to the right side of the screen
        <Drawer
          anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, p: 1, bgcolor: 'transparent', boxShadow: 'none' } } }}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box component="main" sx={{
        flex: 1, minWidth: 0, bgcolor: 'background.paper', borderRadius: 4, p: { xs: 2, md: 3 },
        backgroundImage: STRIPES, backgroundRepeat: 'no-repeat', backgroundSize: '100% 220px',
      }}>
        <TopBar
          title={page.title} subtitle={page.subtitle} unreadCount={unreadCount}
          showMenu={!isDesktop} onMenuClick={() => setMobileOpen(true)}
        />
        <Outlet />
      </Box>
    </Box>
  );
}