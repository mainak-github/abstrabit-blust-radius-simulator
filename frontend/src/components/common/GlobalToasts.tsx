"use client";
import React, { useEffect, useState } from "react";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useNotificationStore, ToastMessage } from "@/store/notificationStore";

const toastStyles = {
  success: { color: "#34d399", background: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.35)" },
  error: { color: "#f87171", background: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.35)" },
  warning: { color: "#fbbf24", background: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.35)" },
  info: { color: "#60a5fa", background: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.35)" },
} as const;

const toastIcons = {
  success: CheckCircleOutlineIcon,
  error: ErrorOutlineIcon,
  warning: WarningAmberOutlinedIcon,
  info: InfoOutlinedIcon,
};

export default function GlobalToasts() {
  const { toasts, removeToast } = useNotificationStore();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toasts.length > 0 && !current) {
      setCurrent(toasts[0]);
      removeToast(toasts[0].id);
      requestAnimationFrame(() => setVisible(true));
    }
  }, [toasts, current, removeToast]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => dismiss(), 5000);
    return () => window.clearTimeout(timer);
  }, [current]);

  function dismiss() {
    setVisible(false);
    window.setTimeout(() => setCurrent(null), 220);
  }

  if (!current) return null;

  const style = toastStyles[current.severity];
  const StatusIcon = toastIcons[current.severity];

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "fixed",
        top: 76,
        right: 24,
        zIndex: 9999,
        width: { xs: "calc(100% - 32px)", sm: 390 },
        transform: visible ? "translateX(0)" : "translateX(calc(100% + 40px))",
        opacity: visible ? 1 : 0,
        transition: "transform 220ms ease, opacity 220ms ease",
      }}
    >
      <Paper
        elevation={12}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          p: 1.5,
          color: "text.primary",
          background: `linear-gradient(135deg, ${style.background}, rgba(15,21,37,0.98) 55%)`,
          border: `1px solid ${style.border}`,
          boxShadow: `0 16px 45px rgba(0,0,0,0.45), 0 0 24px ${style.background}`,
          backdropFilter: "blur(16px)",
        }}
      >
        <StatusIcon sx={{ color: style.color, mt: 0.15 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ color: style.color, textTransform: "capitalize", mb: 0.25 }}>
            {current.severity}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
            {current.message}
          </Typography>
        </Box>
        <IconButton aria-label="Dismiss notification" size="small" onClick={dismiss} sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Box>
  );
}
