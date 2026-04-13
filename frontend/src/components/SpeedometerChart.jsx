import React, { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { AI_TASKS } from "../constants/aiTasks";
import { THEME_COLORS } from "../constants/themeColors";

ChartJS.register(ArcElement, Tooltip, Legend);

const ACTIVE_TASKS = AI_TASKS;

function SpeedometerChart({ energy }) {
  const safeEnergy = Number(energy) || 0;

  const thresholds = ACTIVE_TASKS.map((task) => task.threshold);
  const segmentCount = thresholds.length;
  const maxEnergy = thresholds[segmentCount - 1] || 1;

  const backgroundSlices = useMemo(() => {
    if (segmentCount === 0) return [100];
    return Array(segmentCount).fill(100 / segmentCount);
  }, [segmentCount]);

  const backgroundColors = useMemo(() => {
    return THEME_COLORS.speedometerSegments.slice(0, segmentCount);
  }, [segmentCount]);

  const progressValue = useMemo(() => {
    if (segmentCount === 0) return 0;
    if (safeEnergy <= 0) return 0;
    if (safeEnergy >= maxEnergy) return 100;

    const segmentWidth = 100 / segmentCount;
    let totalProgress = 0;

    for (let i = 0; i < segmentCount; i++) {
      const segmentStart = i === 0 ? 0 : thresholds[i - 1];
      const segmentEnd = thresholds[i];
      const segmentRange = segmentEnd - segmentStart;

      if (safeEnergy >= segmentEnd) {
        totalProgress += segmentWidth;
      } else if (safeEnergy > segmentStart) {
        const localFraction =
          segmentRange > 0 ? (safeEnergy - segmentStart) / segmentRange : 0;
        totalProgress += localFraction * segmentWidth;
        break;
      } else {
        break;
      }
    }

    return Math.min(totalProgress, 100);
  }, [safeEnergy, thresholds, segmentCount, maxEnergy]);

  const progressSlices = useMemo(() => {
    if (segmentCount === 0 || progressValue <= 0) return [];

    const segmentWidth = 100 / segmentCount;
    const result = [];
    let remaining = progressValue;

    for (let i = 0; i < segmentCount; i++) {
      if (remaining <= 0) break;

      const fill = Math.min(segmentWidth, remaining);
      result.push({
        size: fill,
        color: backgroundColors[i],
      });

      remaining -= fill;
    }

    return result;
  }, [progressValue, segmentCount, backgroundColors]);

  const progressData = useMemo(() => {
    const filled = progressSlices.map((slice) => slice.size);
    const totalFilled = filled.reduce((sum, value) => sum + value, 0);
    const leftover = Math.max(100 - totalFilled, 0);
    return leftover > 0 ? [...filled, leftover] : filled;
  }, [progressSlices]);

  const progressColors = useMemo(() => {
    const colors = progressSlices.map((slice) => slice.color);
    const totalFilled = progressSlices.reduce((sum, slice) => sum + slice.size, 0);

    if (totalFilled < 100) {
      colors.push("transparent");
    }

    return colors;
  }, [progressSlices]);

  const chartData = useMemo(() => {
    return {
      labels: ACTIVE_TASKS.map((task) => task.shortLabel),
      datasets: [
        {
          label: "Background Segments",
          data: backgroundSlices,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          circumference: 180,
          rotation: -90,
          cutout: "68%",
          order: 1,
        },
        {
          label: "Progress",
          data: progressData,
          backgroundColor: progressColors,
          borderWidth: 0,
          circumference: 180,
          rotation: -90,
          cutout: "71%",
          order: 2,
        },
      ],
    };
  }, [backgroundSlices, backgroundColors, progressData, progressColors]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        duration: 1200,
        easing: "easeOutCubic",
      },
      layout: {
        padding: {
          top: 8,
          bottom: 0,
          left: 8,
          right: 8,
        },
      },
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
      },
    };
  }, []);

  return (
    <Box
      position="relative"
      width="100%"
      height="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      <Box
        position="relative"
        width="100%"
        flex="1"
        minH="0"
      >
        <Doughnut data={chartData} options={chartOptions} />
      </Box>

      <Text
        textAlign="center"
        mt={1}
        mb={1}
        fontSize="md"
        fontWeight="bold"
        lineHeight="1.2"
        color={THEME_COLORS.text}
      >
        {safeEnergy.toFixed(4)} kWh
      </Text>
    </Box>
  );
}

export default SpeedometerChart;