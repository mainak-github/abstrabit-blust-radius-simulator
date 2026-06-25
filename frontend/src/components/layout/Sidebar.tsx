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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorageIcon from "@mui/icons-material/Storage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BoltIcon from "@mui/icons-material/Bolt";
import HistoryIcon from "@mui/icons-material/History";
import HubIcon from "@mui/icons-material/Hub";

const DRAWER_WIDTH = 260;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon fontSize="small" /> },
  { href: "/services", label: "Services", icon: <StorageIcon fontSize="small" /> },
  { href: "/graph", label: "Graph", icon: <AccountTreeIcon fontSize="small" /> },
  { href: "/simulation", label: "Simulate", icon: <BoltIcon fontSize="small" /> },
  { href: "/history", label: "History", icon: <HistoryIcon fontSize="small" /> },
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
          backgroundColor: "#080c18",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backgroundImage:
            "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 40%)",
        },
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)",
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99,102,241,0.45)",
            flexShrink: 0,
          }}
        >
          <HubIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              background: "linear-gradient(135deg, #f1f5f9 0%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.01em",
            }}
          >
            Blast Radius
          </Typography>
          <Typography variant="caption" sx={{ color: "#475569", fontWeight: 500 }}>
            Simulator
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  borderRadius: 2,
                  py: 1.1,
                  backgroundColor: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  border: active ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                  boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                  "&:hover": {
                    backgroundColor: active
                      ? "rgba(99, 102, 241, 0.2)"
                      : "rgba(255,255,255,0.04)",
                  },
                  transition: "all 0.18s ease",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: active ? "#818cf8" : "#475569",
                    transition: "color 0.18s",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: "0.875rem",
                        fontWeight: active ? 600 : 500,
                        color: active ? "#c7d2fe" : "#94a3b8",
                        transition: "color 0.18s",
                      },
                    },
                  }}
                />
                {active && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      backgroundColor: "#818cf8",
                      boxShadow: "0 0 8px #818cf8",
                      flexShrink: 0,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer status */}
      <Box
        sx={{
          p: 2.5,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(0deg, rgba(99,102,241,0.04) 0%, transparent 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              boxShadow: "0 0 12px #10b981",
              animation: "pulse 2s infinite ease-in-out",
            }}
          />
          <Typography variant="caption" sx={{ color: "#475569", fontWeight: 500 }}>
            Live updates active
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: "#1e293b", display: "block", mt: 1.5, fontSize: "0.65rem" }}
        >
          v1.0.0 · Blast Radius Simulator
        </Typography>
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH };