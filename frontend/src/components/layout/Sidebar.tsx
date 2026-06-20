"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorageIcon from "@mui/icons-material/Storage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BoltIcon from "@mui/icons-material/Bolt";
import HistoryIcon from "@mui/icons-material/History";
import HubIcon from "@mui/icons-material/Hub";

const DRAWER_WIDTH = 260;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/services", label: "Services", icon: <StorageIcon /> },
  { href: "/graph", label: "Graph", icon: <AccountTreeIcon /> },
  { href: "/simulation", label: "Simulate", icon: <BoltIcon /> },
  { href: "/history", label: "History", icon: <HistoryIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "#0d1320",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        },
      }}
    >
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        <HubIcon sx={{ color: "primary.main", fontSize: 32 }} />
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            Blast Radius
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Simulator
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  borderRadius: 2,
                  backgroundColor: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: active ? 600 : 400,
                        color: active ? "primary.main" : "text.primary",
                      },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ mt: "auto", p: 2.5, borderTop: "1px solid rgba(255,255,255,0.06)", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "success.main",
              boxShadow: "0 0 12px #10b981",
              animation: "pulse 2s infinite ease-in-out",
              "@keyframes pulse": {
                "0%": { opacity: 0.6, transform: "scale(0.95)" },
                "50%": { opacity: 1, transform: "scale(1.05)" },
                "100%": { opacity: 0.6, transform: "scale(0.95)" },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
            Updates active
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH };