import React from "react";
import { HStack, Box } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AI_TASKS } from "../constants/aiTasks";
import { THEME_COLORS } from "../constants/themeColors";

// const segmentColors = ["#A0AEC0", "#63B3ED", "#F6AD55", "#48BB78", "#805AD5", "#E53E3E"];
const segmentColors = THEME_COLORS.taskBorders;

// Phase 6: use all 6 tasks
const TASKS = AI_TASKS;

function AITaskImageGrid({ energy }) {
  const hasCelebrated = React.useRef(Array(TASKS.length).fill(false));

  React.useEffect(() => {
    TASKS.forEach((task, idx) => {
      if (energy >= task.threshold && !hasCelebrated.current[idx]) {
        hasCelebrated.current[idx] = true;
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          scalar: 0.85,
        });
      }
    });
  }, [energy]);

  return (
    <HStack
      spacing={4}
      w="100%"
      h="100%"
      align="center"
      justify="space-evenly"
    >
      {TASKS.map((task, idx) => {
        const unlocked = Number(energy) >= task.threshold;
        const borderColor = segmentColors[idx % segmentColors.length];

        return (
          <Box
            key={task.id}
            flex="1"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minW="0"
            h="100%"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={`${task.id}-${unlocked ? "unlocked" : "locked"}`}
                src={unlocked ? task.unlockedImg : task.lockedImg}
                alt={unlocked ? "Unlocked" : "Locked"}
                style={{
                  width: "92%",
                  maxWidth: "210px",
                  maxHeight: "2900px",
                  objectFit: "contain",
                  border: `10px solid ${borderColor}`,
                  borderRadius: "1.25rem",
                  boxShadow: "0 6px 24px 0 rgba(30,30,30,0.10)",
                  transition: "border-color 0.2s",
                  background: "#cae8eb",
                }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.06 }}
                transition={{ duration: 0.45 }}
              />
            </AnimatePresence>
          </Box>
        );
      })}
    </HStack>
  );
}

export default AITaskImageGrid;