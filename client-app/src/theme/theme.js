import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#667eea', contrastText: '#fff' },
    secondary: { main: '#764ba2', contrastText: '#fff' },
    success: { main: '#28a745' },
    error: { main: '#dc3545' },
    background: { default: '#f0f2f5', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        },
      },
    },
  },
});

export default theme;
