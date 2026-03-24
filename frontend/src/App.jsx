// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Box,
  ChakraProvider,
  VStack,
  Text,
  Spinner,
  useToast,
  ScaleFade,
  CloseButton,
} from "@chakra-ui/react";
import DashboardLayout from "./components/DashboardLayout";

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Inactive");
  const [history, setHistory] = useState([]);
  const [lastSession, setLastSession] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const closedManuallyRef = useRef(false);
  const timeoutRef = useRef(null);
  const toast = useToast();

  const dispatchAvatarTempMessage = (text, durationMs = 30000) => {
    // Broadcast a temporary message for the avatar.
    // useAvatarMessages.js listens for this event and will revert to Welcome after duration.
    window.dispatchEvent(
      new CustomEvent("avatar:tempMessage", {
        detail: { text, duration: durationMs },
      })
    );
  };

  const fetchData = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8080/data");
      const d = res.data;
      setData(d);

      if (d.session_active) {
        setStatus("Active");
        setIsRunning(true);
        setHistory((prev) => [
          ...prev.slice(-29),
          {
            time: new Date().toLocaleTimeString(),
            power: d.power_watts,
            stroke: d.stroke_rate,
          },
        ]);
        closedManuallyRef.current = false;
        if (showSummary) setShowSummary(false);
      } else {
        setStatus("Inactive");
        setIsRunning(false);
        if (closedManuallyRef.current) return;

        if (d.last_session_snapshot && d.last_session_snapshot.elapsed_time > 0) {
          setLastSession(d.last_session_snapshot);
          setShowSummary(true);

          // Build the same message you show above the avatar
          const unlocked =
            [0.002, 0.004, 0.006, 0.008].filter(
              (t) => d.last_session_snapshot.energy_kwh >= t
            ).length;

          const msg = `Session beendet. Energie: ${d.last_session_snapshot.energy_kwh.toFixed(
            3
          )} kWh • Aufgaben: ${unlocked} / 4`;

          // Trigger avatar temp message for 30s, then it will auto-revert to Welcome
          dispatchAvatarTempMessage(msg, 30000);

          // Auto-hide the summary after 30s
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setShowSummary(false);
            setLastSession(null);
          }, 30000);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleStart = async () => {
    if (isRunning) {
      toast({
        title: "Session already running.",
        description: "You must stop the current session before starting a new one.",
        status: "info",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    try {
      await axios.post("http://127.0.0.1:8080/start");
      setIsRunning(true);
      setStatus("Active");
      setShowSummary(false);
      setLastSession(null);
      closedManuallyRef.current = false;
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post("http://127.0.0.1:8080/stop");
      setIsRunning(false);
      setStatus("Inactive");
      // The avatar temp message + summary timing will be handled in fetchData
    } catch (error) {
      console.error("Error stopping session:", error);
    }
  };

  if (!data) {
    return (
      <ChakraProvider>
        <Box p={8} textAlign="center">
          <Text mb={4}>Loading session data...</Text>
          <Spinner size="xl" />
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <VStack p={4} spacing={6} align="stretch" h="100vh" overflow="hidden">
        <DashboardLayout
          metrics={data}
          history={history}
          sessionActive={data.session_active}
          showSummary={showSummary}
          lastSession={lastSession}
          onStart={handleStart}
          onStop={handleStop}
        />

        {showSummary && lastSession && (
          <ScaleFade in={showSummary}>
            <Box
              position="fixed"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="white"
              borderRadius="lg"
              boxShadow="xl"
              p={6}
              maxW="500px"
              zIndex="9999"
              border="2px solid #CBD5E0"
            >
              <Box position="absolute" top="10px" right="10px">
                <CloseButton
                  onClick={() => {
                    setShowSummary(false);
                    setLastSession(null);
                    closedManuallyRef.current = true;
                  }}
                />
              </Box>

              <Text fontSize="xl" fontWeight="bold" mb={4} color="blue.700">
                Sitzungszusammenfassung
              </Text>

              <VStack align="start" spacing={2}>
                <Text>
                  <Box as="span" fontWeight="bold">Verstrichene Zeit:</Box>{" "}
                  {formatTime(lastSession.elapsed_time)}
                </Text>
                <Text>
                  <Box as="span" fontWeight="bold">Distanz:</Box>{" "}
                  {Math.round(lastSession.distance_meters)} m
                </Text>
                <Text>
                  <Box as="span" fontWeight="bold">Energie:</Box>{" "}
                  {lastSession.energy_kwh.toFixed(4)} kWh
                </Text>
                <Text>
                  <Box as="span" fontWeight="bold">KI-Aufgabe Freigeschaltet:</Box>{" "}
                  {[0.002, 0.004, 0.006, 0.008].filter(
                    (t) => lastSession.energy_kwh >= t
                  ).length} / 4
                </Text>
              </VStack>
            </Box>
          </ScaleFade>
        )}
      </VStack>
    </ChakraProvider>
  );
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default App;
