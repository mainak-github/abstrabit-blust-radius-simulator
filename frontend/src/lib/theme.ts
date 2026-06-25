"use client";
import { createTheme, alpha } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5" },
    secondary: { main: "#10b981", light: "#34d399", dark: "#059669" },
    error: { main: "#ef4444", light: "#f87171" },
    warning: { main: "#f59e0b", light: "#fbbf24" },
    info: { main: "#3b82f6", light: "#60a5fa" },
    success: { main: "#10b981", light: "#34d399" },
    background: { default: "#080c18", paper: "#0f1525" },
    divider: "rgba(255,255,255,0.06)",
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: "0.01em" },
    caption: { letterSpacing: "0.02em" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.6; transform: scale(0.95); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#0f1525",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:hover": {
            borderColor: "rgba(99,102,241,0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          transition: "all 0.2s",
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(99,102,241,0.45)",
            transform: "translateY(-1px)",
          },
        },
        containedError: {
          background: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
          boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(239,68,68,0.45)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: "rgba(255,255,255,0.12)",
          "&:hover": { borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.75rem",
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: "rgba(255,255,255,0.06)",
          backgroundColor: "#0f1525",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&.Mui-focused fieldset": { borderColor: "#6366f1" },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "rgba(255,255,255,0.06)" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#0f1525",
          border: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1e2a45",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: "0.75rem",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: "rgba(99,102,241,0.1)" },
          "&.Mui-selected": { backgroundColor: "rgba(99,102,241,0.15)" },
          "&.Mui-selected:hover": { backgroundColor: "rgba(99,102,241,0.2)" },
        },
      },
    },
  },
});

export const CRITICALITY_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  CRITICAL: "#ef4444",
};

export const CRITICALITY_GLOW: Record<string, string> = {
  LOW: "0 0 12px rgba(16,185,129,0.4)",
  MEDIUM: "0 0 12px rgba(59,130,246,0.4)",
  HIGH: "0 0 12px rgba(245,158,11,0.4)",
  CRITICAL: "0 0 12px rgba(239,68,68,0.4)",
};

export const STATUS_COLOR: Record<string, string> = {
  HEALTHY: "#10b981",
  DEGRADED: "#f59e0b",
  FAILED: "#ef4444",
  AT_RISK: "#fb923c",
};

export const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  CRITICAL: "#ef4444",
};
