import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6a1fcf' },
    secondary: { main: '#e1129a' },
    background: { default: '#f5f6fa' },
  },
  shape: { borderRadius: 16 },
});

export default theme;
