"use client";
import { Box, Button, Typography, keyframes } from "@mui/material";
import Link from "next/link";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
  100% { transform: translateY(0px); }
`;

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  actionHref,
  onActionClick,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        py: 8,
        px: 3,
        borderRadius: 3,
        backgroundColor: "rgba(19, 24, 38, 0.4)",
        border: "1px dashed rgba(255, 255, 255, 0.12)",
        maxWidth: 500,
        margin: "0 auto",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.0) 70%)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: `${float} 4s ease-in-out infinite`,
          boxShadow: "0 0 20px rgba(99, 102, 241, 0.08)",
          "& svg": {
            fontSize: 48,
            color: "primary.main",
            filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))",
          },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, maxWidth: 360, lineHeight: 1.5 }}>
        {description}
      </Typography>
      {actionText && (
        actionHref ? (
          <Button
            component={Link}
            href={actionHref}
            variant="outlined"
            color="primary"
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              borderWidth: 1.5,
              borderColor: "primary.main",
              backgroundColor: "rgba(99, 102, 241, 0.04)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderWidth: 1.5,
                transform: "scale(1.02)",
                boxShadow: "0 0 16px rgba(99, 102, 241, 0.3)",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
              },
            }}
          >
            {actionText}
          </Button>
        ) : (
          <Button
            onClick={onActionClick}
            variant="outlined"
            color="primary"
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              borderWidth: 1.5,
              borderColor: "primary.main",
              backgroundColor: "rgba(99, 102, 241, 0.04)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderWidth: 1.5,
                transform: "scale(1.02)",
                boxShadow: "0 0 16px rgba(99, 102, 241, 0.3)",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
              },
            }}
          >
            {actionText}
          </Button>
        )
      )}
    </Box>
  );
}
