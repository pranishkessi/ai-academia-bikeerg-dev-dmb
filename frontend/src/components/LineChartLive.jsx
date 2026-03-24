// src/components/LineChartLive.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

/**
 * Live line chart with smoothing + clean reset on session end.
 *
 * Props:
 * - power: number (instant power W)
 * - stroke: number (instant stroke rate SPM)
 * - isActive: boolean (true while session runs; false when ended)
 * - maxPoints?: number (default 30)
 * - alpha?: number (EMA smoothing factor 0..1, default 0.35)
 * - tickMs?: number (render/update interval in ms, default 400)
 */
function LineChartLive({
  power,
  stroke,
  isActive,
  maxPoints = 30,
  alpha = 0.35,
  tickMs = 400,
}) {
  // Visible series + labels
  const [labels, setLabels] = useState([]);
  const [pSeries, setPSeries] = useState([]);
  const [sSeries, setSSeries] = useState([]);

  // Internal smoothed values
  const smoothP = useRef(0);
  const smoothS = useRef(0);

  // Keep last targets from props
  const targetP = useRef(power || 0);
  const targetS = useRef(stroke || 0);

  // Update targets whenever props change
  useEffect(() => {
    targetP.current = Number.isFinite(power) ? power : 0;
    targetS.current = Number.isFinite(stroke) ? stroke : 0;
  }, [power, stroke]);

  // Main ticker to advance the chart at a steady cadence
  useEffect(() => {
    let timer;

    const tick = () => {
      // EMA smoothing toward current targets
      smoothP.current = smoothP.current + alpha * (targetP.current - smoothP.current);
      smoothS.current = smoothS.current + alpha * (targetS.current - smoothS.current);

      const now = new Date();
      const tLabel = now.toLocaleTimeString();

      setLabels((prev) => [...prev.slice(-maxPoints + 1), tLabel]);
      setPSeries((prev) => [...prev.slice(-maxPoints + 1), Math.max(0, smoothP.current)]);
      setSSeries((prev) => [...prev.slice(-maxPoints + 1), Math.max(0, smoothS.current)]);
    };

    // Only run the ticker while the dashboard is mounted
    timer = setInterval(tick, tickMs);
    return () => clearInterval(timer);
  }, [alpha, maxPoints, tickMs]);

  // Handle session lifecycle: when session ends, clear and show “ready” state
  const prevActive = useRef(isActive);
  useEffect(() => {
    // Transition from active -> inactive: hard reset to clean baseline
    if (prevActive.current && !isActive) {
      smoothP.current = 0;
      smoothS.current = 0;
      targetP.current = 0;
      targetS.current = 0;

      const t = new Date().toLocaleTimeString();
      setLabels([t]);
      setPSeries([0]);
      setSSeries([0]);
    }

    // Transition from inactive -> active: start fresh history
    if (!prevActive.current && isActive) {
      smoothP.current = 0;
      smoothS.current = 0;
      // empty arrays so we draw only new session data
      setLabels([]);
      setPSeries([]);
      setSSeries([]);
    }

    prevActive.current = isActive;
  }, [isActive]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Power (W)",
        data: pSeries,
        borderColor: "#3182ce",
        backgroundColor: "rgba(49, 130, 206, 0.2)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: "Stroke Rate",
        data: sSeries,
        borderColor: "#38a169",
        backgroundColor: "rgba(56, 161, 105, 0.2)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 350,
      easing: "easeOutQuart",
    },
    scales: {
      x: {
        title: { display: true, text: "Time" },
        ticks: { maxTicksLimit: 6 },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 200, // adjust if you need a different ceiling
        title: { display: true, text: "Value" },
      },
    },
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 12 }, boxWidth: 12 },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    interaction: { mode: "index", intersect: false },
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

export default LineChartLive;
