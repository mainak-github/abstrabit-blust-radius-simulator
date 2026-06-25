"use client";
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip, Chip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import { DRAWER_WIDTH } from "./Sidebar";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulationStore";

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const isRunning = useSimulationStore((s) => s.isRunning);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: "rgba(8, 12, 24, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backgroundImage: "none",
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.01em",
              background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: "#475569", display: "block", lineHeight: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {isRunning && (
          <Chip
            icon={<BoltIcon sx={{ fontSize: "14px !important" }} />}
            label="Simulation running"
            size="small"
            sx={{
              backgroundColor: "rgba(245,158,11,0.15)",
              color: "#fbbf24",
              border: "1px solid rgba(245,158,11,0.3)",
              fontWeight: 600,
              animation: "pulse 1.5s infinite ease-in-out",
              "& .MuiChip-icon": { color: "#fbbf24" },
            }}
          />
        )}

        <Tooltip title="Refresh page data">
          <IconButton
            onClick={() => router.refresh()}
            size="small"
            sx={{
              color: "#475569",
              "&:hover": { color: "#f1f5f9", backgroundColor: "rgba(255,255,255,0.06)" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}