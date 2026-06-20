"use client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { theme } from "@/lib/theme";
import GlobalToasts from "@/components/common/GlobalToasts";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalToasts />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}