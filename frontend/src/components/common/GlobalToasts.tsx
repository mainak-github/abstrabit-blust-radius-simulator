"use client";
import React, { useEffect, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { useNotificationStore, ToastMessage } from "@/store/notificationStore";

export default function GlobalToasts() {
  const { toasts, removeToast } = useNotificationStore();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (toasts.length > 0 && !current) {
      // Set the next toast in the queue
      setCurrent(toasts[0]);
      removeToast(toasts[0].id);
      setOpen(true);
    } else if (toasts.length > 0 && current && open) {
      // If a new toast arrives while one is open, close current first to trigger transition
      setOpen(false);
    }
  }, [toasts, current, open, removeToast]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
    setTimeout(() => {
      setCurrent(null);
    }, 300);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      sx={{ mt: 7 }} // avoid overlapping TopBar
    >
      {current ? (
        <Alert onClose={handleClose} severity={current.severity} variant="filled" sx={{ width: "100%" }}>
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
