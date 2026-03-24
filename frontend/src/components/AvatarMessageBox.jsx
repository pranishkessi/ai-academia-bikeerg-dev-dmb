// src/components/AvatarMessageBox.jsx
import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { SlideFade } from "@chakra-ui/react";

/**
 * Unified message box for ALL messages above the avatar.
 * Props:
 *  - text: string
 *  - kind?: "default" | "success" | "warning" | "info" | "unlock"
 *  - show?: boolean
 */
const kindStyles = {
  default: { bg: "white", color: "gray.800", borderColor: "gray.200" },
  success: { bg: "green.50", color: "green.800", borderColor: "green.200" },
  warning: { bg: "yellow.50", color: "yellow.900", borderColor: "yellow.200" },
  info:    { bg: "blue.50", color: "blue.900", borderColor: "blue.200" },
  unlock:  { bg: "purple.50", color: "purple.900", borderColor: "purple.200" },
};

export default function AvatarMessageBox({ text, kind = "default", show = true }) {
  const s = kindStyles[kind] || kindStyles.default;

  return (
    <SlideFade in={!!text && show} offsetY="-10px">
      <Box
        role="status"
        aria-live="polite"
        px={6}
        py={4}
        maxW="96%"
        borderRadius="xl"
        boxShadow="xl"
        borderWidth="1px"
        textAlign="center"
        mx="auto"
        bg={s.bg}
        color={s.color}
        borderColor={s.borderColor}
      >
        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" lineHeight="short" whiteSpace="pre-line">
          {text}
        </Text>
      </Box>
    </SlideFade>
  );
}
