import type { Metadata } from "next";
import Providers from "@/components/layout/Providers";
import Sidebar, { DRAWER_WIDTH } from "@/components/layout/Sidebar";
import { Box, Toolbar } from "@mui/material";

export const metadata: Metadata = {
  title: "Dependency Blast Radius Simulator",
  description: "Model service dependencies, simulate failures, and analyze impact.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 0,
                width: `calc(100% - ${DRAWER_WIDTH}px)`,
                ml: `${DRAWER_WIDTH}px`,
                backgroundColor: "background.default",
                minHeight: "100vh",
                minWidth: 0,
                overflowX: "hidden",
              }}
            >
              <Toolbar />
              {children}
            </Box>
          </Box>
        </Providers>
      </body>
    </html>
  );
}