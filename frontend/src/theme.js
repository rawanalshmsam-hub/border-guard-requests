import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: { main: '#2e7d4f' },     // military green
    secondary: { main: '#c9a227' },   // gold accent
    background: { default: '#0b1a2e', paper: '#12263f' }, // navy
  },
  typography: { fontFamily: '"Cairo", "Tahoma", sans-serif' },
  shape: { borderRadius: 10 },
});

export default theme;