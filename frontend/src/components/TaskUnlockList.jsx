// -------------------------------- TaskUnlockList.jsx --------------------------
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  Text,
  Icon,
  Tooltip,
  ScaleFade,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaLock, FaUnlock } from "react-icons/fa";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

// ──────────────────────────────────────────────────────────────────────────────
// 1.  Animated icon (framer-motion wrapper)
// ──────────────────────────────────────────────────────────────────────────────
const MotionBox = motion(Box);

// ──────────────────────────────────────────────────────────────────────────────
// 2.  Static task definition
// ──────────────────────────────────────────────────────────────────────────────
const tasks = [
  {
    label: "Simple Google search query",
    threshold: 0.002,
    description:
      "You can now power a Google search query using the generated energy!",
  },
  {
    label: "Sound recognition",
    threshold: 0.004,
    description:
      "Your energy is enough to power local AI for object or sound recognition!",
  },
  {
    label: "Speech-to-text transcription",
    threshold: 0.006,
    description:
      "You can now convert speech into text using AI-powered transcription!",
  },
  {
    label: "LLM (ChatGPT response)",
    threshold: 0.008,
    description:
      "Your energy can now power an entire language model like ChatGPT!",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 3.  Icon animation variants
// ──────────────────────────────────────────────────────────────────────────────
const iconVariants = {
  initial: { scale: 1, rotate: 0 },
  unlocked: {
    scale: [1, 1.35, 1],
    rotate: [0, -10, 10, 0],
    transition: { duration: 0.5 },
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// 4.  Main component
// ──────────────────────────────────────────────────────────────────────────────
function TaskUnlockList({ energy }) {
  const energyValue = parseFloat(energy) || 0;

  const [activeTooltipIndex, setActiveTooltipIndex] = useState(null);
  const hasFiredRefs = useRef(new Array(tasks.length).fill(false));
  const prevEnergyRef = useRef(0);

  // Reset state when session restarts
  useEffect(() => {
    if (energyValue < 0.001 && prevEnergyRef.current >= 0.001) {
      setActiveTooltipIndex(null);
      hasFiredRefs.current = new Array(tasks.length).fill(false);
    }
    prevEnergyRef.current = energyValue;
  }, [energyValue]);

  // Unlock side-effects (confetti + tooltip)
  useEffect(() => {
    tasks.forEach((task, idx) => {
      if (energyValue >= task.threshold && !hasFiredRefs.current[idx]) {
        hasFiredRefs.current[idx] = true;

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          scalar: 0.9,
        });

        setActiveTooltipIndex(idx);
      }
    });
  }, [energyValue]);

  // Colors that work in both light & dark mode
  const bgLocked   = useColorModeValue("gray.100", "gray.700");
  const bgUnlocked = useColorModeValue("green.50", "green.600");
  const textLocked = useColorModeValue("gray.600", "gray.300");
  const textUnlocked = useColorModeValue("green.700", "green.100");

  return (
    <Box
      bg="transparent"
      p={4}
      borderRadius="md"
      minH="320px"
      maxH="320px"
      overflowY="auto"
      border="1px dashed red"   /* ← REMOVE once you see this box */
    >
      <Heading size="sm" mb={3}>
        AI Tasks
      </Heading>

      <VStack
        align="stretch"        /* stretch children to full width */
        spacing={4}
        maxH="250px"
        overflowY="auto"
      >
        {tasks.map((task, idx) => {
          const unlocked = energyValue >= task.threshold;
          const showTooltip = idx === activeTooltipIndex;

          return (
            <ScaleFade in key={idx}>
              <Tooltip
                hasArrow
                placement="right"
                label={showTooltip ? task.description : ""}
                isOpen={showTooltip}
                shouldWrapChildren
              >
                <Card
                  w="full"
                  bg={unlocked ? bgUnlocked : bgLocked}
                  borderWidth="1px"
                  borderColor={unlocked ? "green.400" : "gray.300"}
                  borderRadius="md"
                  _hover={{ boxShadow: "md", transform: "translateY(-3px)" }}
                  transition="all 0.18s"
                >
                  <CardBody p={3}>
                    <HStack spacing={3}>
                      {/* Animated icon */}
                      <MotionBox
                        variants={iconVariants}
                        initial="initial"
                        animate={unlocked ? "unlocked" : "initial"}
                        display="flex"
                      >
                        <Icon
                          as={unlocked ? FaUnlock : FaLock}
                          w={5}
                          h={5}
                          color={unlocked ? "green.500" : "gray.400"}
                        />
                      </MotionBox>

                      <Text
                        fontWeight="medium"
                        color={unlocked ? textUnlocked : textLocked}
                        whiteSpace="normal"
                      >
                        {task.label}
                      </Text>

                      <Text
                        ml="auto"
                        fontWeight="bold"
                        color={unlocked ? "green.500" : "gray.500"}
                      >
                        {unlocked ? "UNLOCKED" : "LOCKED"}
                      </Text>
                    </HStack>
                  </CardBody>
                </Card>
              </Tooltip>
            </ScaleFade>
          );
        })}
      </VStack>
    </Box>
  );
}

export default TaskUnlockList;
