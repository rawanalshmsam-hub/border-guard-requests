import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: { main: '#1f8a5b', dark: '#156b45', light: '#e6f4ec', contrastText: '#ffffff' },
    secondary: { main: '#c9a227' },
    error: { main: '#d64545' },
    warning: { main: '#d68a1f' },
    success: { main: '#1f8a5b' },
    background: { default: '#e9efec', paper: '#ffffff' },
    text: { primary: '#14261d', secondary: '#5f6f67' },
    divider: '#e3e9e6',
    sidebar: { main: '#0f3b2c', dark: '#0b2e22' },   // custom colour for the side menu
  },
  typography: {
    fontFamily: '"Cairo", "Tahoma", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, border: '1px solid #e3e9e6', boxShadow: 'none' },
      },
    },
  },
});

export default theme;