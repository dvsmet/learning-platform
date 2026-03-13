import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 250;

export default function DashboardLayout({ menuItems, title, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2.5, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.7)', mt: 0.5 }}>
          {user?.name}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.15)' }} />
      <List sx={{ flex: 1, pt: 1 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                color: '#fff',
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,.18)' },
                '&:hover': { bgcolor: 'rgba(255,255,255,.1)' },
              }}
            >
              <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {drawerContent}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{ bgcolor: '#fff', color: 'text.primary', borderBottom: '1px solid #e0e0e0' }}
        >
          <Toolbar>
            <IconButton sx={{ mr: 2, display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1 }}>
              {menuItems.find((i) => i.path === location.pathname)?.label || title}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
