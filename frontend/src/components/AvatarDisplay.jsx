// src/components/AvatarDisplay.jsx
import React from "react";
import { Box } from "@chakra-ui/react";
import AvatarMessageBox from "./AvatarMessageBox";

const AvatarDisplay = ({ message }) => {
  return (
    <Box
      w="100%"
      h="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      overflow="hidden"
    >
      <Box
        w="100%"
        display="flex"
        justifyContent="center"
        alignItems="flex-start"
        pt={2}
      >
        <AvatarMessageBox
          text={message?.text}
          kind={message?.kind || "default"}
        />
      </Box>
    </Box>
  );
};

export default AvatarDisplay;