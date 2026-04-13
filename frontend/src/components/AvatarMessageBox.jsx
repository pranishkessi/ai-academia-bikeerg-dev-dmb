// src/components/AvatarMessageBox.jsx
import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { SlideFade } from "@chakra-ui/react";
import { THEME_COLORS } from "../constants/themeColors";

const kindStyles = {
  default: THEME_COLORS.message.default,
  success: THEME_COLORS.message.success,
  warning: THEME_COLORS.message.warning,
  info: THEME_COLORS.message.info,
  unlock: THEME_COLORS.message.unlock,
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
        maxW="92%"
        borderRadius="xl"
        boxShadow="lg"
        borderWidth="2px"
        textAlign="center"
        mx="auto"
        bg={s.bg}
        color={s.color}
        borderColor={s.borderColor}
      >
        <Text
          fontSize={{ base: "xl", md: "2xl" }}
          fontWeight="bold"
          lineHeight="short"
          whiteSpace="pre-line"
        >
          {text}
        </Text>
      </Box>
    </SlideFade>
  );
}