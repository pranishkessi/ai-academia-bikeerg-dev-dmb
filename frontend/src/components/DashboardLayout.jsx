// src/components/DashboardLayout.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  GridItem,
  VStack,
  HStack,
  Text,
  Heading,
  Image,
  Flex,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { FaInfoCircle } from "react-icons/fa";

import SpeedometerChart from "./SpeedometerChart";
import LineChartLive from "./LineChartLive";
import AITaskImageGrid from "./AITaskImageGrid";
import AvatarDisplay from "./AvatarDisplay";
import { useAvatarMessages } from "../hooks/useAvatarMessages";

import useIdleTimer from "../hooks/useIdleTimer";
import ScreensaverOverlay from "./ScreensaverOverlay";
import InstructionContent from "./InstructionContent";
import {
  AI_TASKS,
  LEVEL6_WARNING_DELAY_MS,
  LEVEL6_WARNING_TEXT,
} from "../constants/aiTasks";
import { THEME_COLORS } from "../constants/themeColors";

const ACTIVE_TASKS = AI_TASKS;

function DashboardLayout({ metrics, onStart, onStop, sessionActive }) {
  const energy = metrics?.energy_kwh ?? 0;
  const power = metrics?.power_watts ?? 0;
  const stroke = metrics?.stroke_rate ?? 0;
  const distance = metrics?.distance_meters ?? 0;
  const time = metrics?.elapsed_time ?? 0;
  const status = metrics?.connected ? "Verbunden" : "Nicht verbunden";

  const TASK_THRESHOLDS = ACTIVE_TASKS.map((task) => task.threshold);
  const FINAL_UNLOCK_DELAY_MS = 2500;
  const IDLE_LIMIT_SEC = 60;
  const WARNING_BEFORE_END_SEC = 10;
  const SESSION_START_GRACE_SEC = 5;
  const MIN_ACTIVE_POWER = 3;

  const level5Threshold = ACTIVE_TASKS[4]?.threshold ?? Infinity;
  const level6Threshold = ACTIVE_TASKS[5]?.threshold ?? Infinity;

  const unlockedTasks = ACTIVE_TASKS.map((task) => ({
    label: task.shortLabel,
    threshold: task.threshold,
  }));

  const { message } = useAvatarMessages({
    energy,
    elapsedTime: time,
    sessionActive,
    unlockedTasks,
  });

  const [overrideMessage, setOverrideMessage] = useState(null);

  const allUnlockedRef = useRef(false);
  const finalUnlockTimerRef = useRef(null);

  const level6WarningTimerRef = useRef(null);
  const hasScheduledLevel6WarningRef = useRef(false);
  const hasShownLevel6WarningRef = useRef(false);

  const lastActiveRef = useRef(Date.now());
  const idleTickerRef = useRef(null);
  const infoTimeoutRef = useRef(null);

  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const [, setIdleSeconds] = useState(0);
  const [idleCountdown, setIdleCountdown] = useState(null);

  useEffect(() => {
    if (sessionActive) {
      lastActiveRef.current = Date.now();
      setIdleSeconds(0);
      setIdleCountdown(null);
      setOverrideMessage(null);

      hasScheduledLevel6WarningRef.current = false;
      hasShownLevel6WarningRef.current = false;
      clearTimeout(level6WarningTimerRef.current);

      clearTimeout(infoTimeoutRef.current);
      setOverrideMessage({ kind: "info", text: "Sitzung gestartet — los geht’s 🚴" });
      infoTimeoutRef.current = setTimeout(() => setOverrideMessage(null), 1500);
    }
    return () => clearTimeout(infoTimeoutRef.current);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive) return;

    const isActiveNow = (power ?? 0) > MIN_ACTIVE_POWER || (stroke ?? 0) > 0;
    if (isActiveNow) {
      lastActiveRef.current = Date.now();

      if (
        idleCountdown !== null ||
        (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle")
      ) {
        setIdleCountdown(null);
        setOverrideMessage({
          kind: "info",
          text: "Toll! Countdown abgebrochen — weiter geht’s",
        });
        clearTimeout(infoTimeoutRef.current);
        infoTimeoutRef.current = setTimeout(() => setOverrideMessage(null), 2000);
      }
    }
  }, [power, stroke, sessionActive, idleCountdown, overrideMessage]);

  useEffect(() => {
    if (!sessionActive) return;

    clearInterval(idleTickerRef.current);
    idleTickerRef.current = setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      setIdleSeconds(idleSec);

      if (idleSec < SESSION_START_GRACE_SEC) {
        if (idleCountdown !== null) setIdleCountdown(null);
        if (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle") {
          setOverrideMessage(null);
        }
        return;
      }

      const warnAt = IDLE_LIMIT_SEC - WARNING_BEFORE_END_SEC;
      if (idleSec >= warnAt && idleSec < IDLE_LIMIT_SEC) {
        const remaining = IDLE_LIMIT_SEC - idleSec;
        if (idleCountdown !== remaining) setIdleCountdown(remaining);
        setOverrideMessage({
          kind: "warning",
          source: "idle",
          text: `Sind Sie da?\nTreten Sie weiter in die Pedale oder die Sitzung endet in ${remaining} Sekunde${remaining === 1 ? "" : "n"}…`,
        });
      } else if (idleSec >= IDLE_LIMIT_SEC) {
        setIdleCountdown(null);
        setOverrideMessage(null);
        onStopRef.current && onStopRef.current({ reason: "idle-timeout" });
      } else {
        if (idleCountdown !== null) setIdleCountdown(null);
        if (overrideMessage?.kind === "warning" && overrideMessage?.source === "idle") {
          setOverrideMessage(null);
        }
      }
    }, 1000);

    return () => clearInterval(idleTickerRef.current);
  }, [sessionActive, idleCountdown, overrideMessage]);

  useEffect(() => {
    if (!sessionActive) return;

    const level5Reached = energy >= level5Threshold;
    const level6Reached = energy >= level6Threshold;

    if (level6Reached) {
      clearTimeout(level6WarningTimerRef.current);
      return;
    }

    if (
      level5Reached &&
      !level6Reached &&
      !hasScheduledLevel6WarningRef.current &&
      !hasShownLevel6WarningRef.current
    ) {
      hasScheduledLevel6WarningRef.current = true;

      clearTimeout(level6WarningTimerRef.current);
      level6WarningTimerRef.current = setTimeout(() => {
        const stillInLevel5Window =
          sessionActive &&
          energy >= level5Threshold &&
          energy < level6Threshold &&
          !allUnlockedRef.current;

        if (stillInLevel5Window) {
          hasShownLevel6WarningRef.current = true;
          setOverrideMessage({
            kind: "warning",
            source: "level6",
            text: LEVEL6_WARNING_TEXT,
          });
        }
      }, LEVEL6_WARNING_DELAY_MS);
    }
  }, [energy, sessionActive, level5Threshold, level6Threshold]);

  useEffect(() => {
    if (!sessionActive) return;

    const unlocked = TASK_THRESHOLDS.filter((t) => energy >= t).length;
    if (unlocked === TASK_THRESHOLDS.length && !allUnlockedRef.current) {
      allUnlockedRef.current = true;

      clearTimeout(level6WarningTimerRef.current);

      setOverrideMessage({
        kind: "success",
        text: "Erstaunlich! Sie haben alle KI-Aufgaben freigeschaltet. Die Sitzung endet gleich automatisch.",
      });

      clearTimeout(finalUnlockTimerRef.current);
      finalUnlockTimerRef.current = setTimeout(() => {
        setOverrideMessage(null);
        onStopRef.current && onStopRef.current({ reason: "completed" });
      }, FINAL_UNLOCK_DELAY_MS);
    }
  }, [energy, sessionActive, TASK_THRESHOLDS]);

  useEffect(() => {
    if (!sessionActive) {
      allUnlockedRef.current = false;
      hasScheduledLevel6WarningRef.current = false;
      hasShownLevel6WarningRef.current = false;

      setOverrideMessage(null);
      setIdleCountdown(null);
      setIdleSeconds(0);

      clearInterval(idleTickerRef.current);
      clearTimeout(finalUnlockTimerRef.current);
      clearTimeout(infoTimeoutRef.current);
      clearTimeout(level6WarningTimerRef.current);
    }
    return () => {
      clearInterval(idleTickerRef.current);
      clearTimeout(finalUnlockTimerRef.current);
      clearTimeout(infoTimeoutRef.current);
      clearTimeout(level6WarningTimerRef.current);
    };
  }, [sessionActive]);

  const { isIdle: isUiIdle, reset: resetUiIdle } = useIdleTimer({
    timeoutMs: 10 * 60 * 1000,
    isPaused: sessionActive,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <VStack spacing={3} w="100vw" h="100vh" p={3} bg={THEME_COLORS.pageBg} overflow="hidden">
      <Grid templateColumns="220px repeat(6, 1fr) 40px" gap={3} w="100%">
        <GridItem>
          <VStack spacing={3} align="start">
            <HStack spacing={3}>
              <Button
                onClick={onStart}
                isDisabled={sessionActive}
                bg="#D97706"
                color="white"
                borderRadius="full"
                height="84px"
                width="84px"
                fontSize="sm"
                fontWeight="bold"
                _hover={{ bg: "#B45309" }}
              >
                START
              </Button>
              <Button
                onClick={() => onStop && onStop({ reason: "manual" })}
                bg="#EA580C"
                color="white"
                borderRadius="full"
                height="84px"
                width="84px"
                fontSize="sm"
                fontWeight="bold"
                _hover={{ bg: "#C2410C" }}
              >
                STOP
              </Button>
              <IconButton
                aria-label="Anleitung"
                title="Anleitung öffnen"
                icon={<FaInfoCircle />}
                onClick={onOpen}
                size="sm"
                bg={THEME_COLORS.cardBg}
                color={THEME_COLORS.text}
                borderWidth="1px"
                borderColor={THEME_COLORS.border}
                _hover={{ bg: THEME_COLORS.panelBgAlt }}
              />
            </HStack>
          </VStack>
        </GridItem>

        {[
          { label: "Leistung", value: `${power} W` },
          { label: "Schlagfrequenz", value: `${stroke} SPM` },
          { label: "Distanz", value: `${distance} m` },
          { label: "Zeit", value: formatTime(time) },
          { label: "Energie", value: `${energy.toFixed(4)} kWh` },
          {
            label: "Status",
            value: (
              <Text color={metrics?.connected ? "#B45309" : "#C2410C"}>
                {status}
              </Text>
            ),
          },
        ].map((item, idx) => (
          <GridItem
            key={idx}
            p={1}
            bg={THEME_COLORS.cardBg}
            borderRadius="md"
            textAlign="center"
            boxShadow={THEME_COLORS.shadow}
            borderWidth="1px"
            borderColor={THEME_COLORS.border}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            minH="84px"
          >
            <Heading size="xs" color={THEME_COLORS.textMuted}>
              {item.label}
            </Heading>
            <Box mt={1} fontWeight="bold" fontSize="md" color={THEME_COLORS.text}>
              {item.value}
            </Box>
          </GridItem>
        ))}

        <GridItem />
      </Grid>

      <Grid templateRows="2fr 3fr" gap={3} w="100%" flex={1} minH={0}>
        <GridItem minH={0}>
          <Grid templateColumns="1fr 1fr 1fr" gap={3} h="100%" minH={0}>
            <Flex
              p={3}
              bg={THEME_COLORS.panelBg}
              borderRadius="md"
              boxShadow={THEME_COLORS.shadow}
              borderWidth="1px"
              borderColor={THEME_COLORS.border}
              justify="center"
              align="center"
              minH={0}
              overflow="hidden"
            >
              <SpeedometerChart energy={energy} />
            </Flex>

            <Flex
              p={3}
              bg={THEME_COLORS.panelBg}
              borderRadius="md"
              boxShadow={THEME_COLORS.shadow}
              borderWidth="1px"
              borderColor={THEME_COLORS.border}
              justify="center"
              align="center"
              minH={0}
              overflow="hidden"
            >
              <LineChartLive power={power} stroke={stroke} />
            </Flex>

            <Box
              p={3}
              pr={4}
              bg={THEME_COLORS.panelBg}
              borderRadius="md"
              boxShadow={THEME_COLORS.shadow}
              borderWidth="1px"
              borderColor={THEME_COLORS.border}
              h="100%"
              minH={0}
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              overflow="hidden"
              boxSizing="border-box"
            >
              <AvatarDisplay message={overrideMessage || message} />
            </Box>
          </Grid>
        </GridItem>

        <GridItem minH={0}>
          <Flex
            p={2}
            pr={3}
            bg={THEME_COLORS.panelBgAlt}
            borderRadius="md"
            boxShadow={THEME_COLORS.shadow}
            borderWidth="1px"
            borderColor={THEME_COLORS.border}
            h="100%"
            minH={0}
            align="center"
            justify="center"
            overflow="hidden"
            boxSizing="border-box"
          >
            <AITaskImageGrid energy={energy} />
          </Flex>
        </GridItem>
      </Grid>

      <Grid
        templateColumns="repeat(4, 1fr)"
        gap={3}
        w="100%"
        bg="#FFF4E8"
        py={3}
        px={5}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="#E9B27A"
        boxShadow="0 4px 12px rgba(191, 102, 22, 0.10)"
>
        {[
          "/BMFTR_Logo2.png",
          "/INIT_Logo.png",
          "/KI_Akademie_OWL_Logo.jpg",
          "/visual.png",
        ].map((src, idx) => (
          <Box
            key={idx}
            display="flex"
            justifyContent="center"
            alignItems="center"
            minH="72px"
          >
            <Image src={src} alt={`Logo ${idx + 1}`} maxH="62px" objectFit="contain" />
          </Box>
        ))}
      </Grid>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent rounded="2xl" p={2} bg={THEME_COLORS.cardBg}>
          <ModalCloseButton />
          <ModalBody p={{ base: 4, md: 8 }}>
            <InstructionContent lang="de" />
          </ModalBody>
        </ModalContent>
      </Modal>

      <ScreensaverOverlay
        isOpen={isUiIdle}
        onDismiss={resetUiIdle}
        lang="de"
      />
    </VStack>
  );
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default DashboardLayout;