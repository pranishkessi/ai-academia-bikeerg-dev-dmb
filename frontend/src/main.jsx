import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import './index.css';
import App from "./App";
// Add this in src/main.jsx (after imports) or in App.jsx inside useEffect(() => { ... }, [])
// Prevent two-finger pinch and double-tap zoom on touch devices
(function () {
  let lastTouchEnd = 0;

  const preventPinch = (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const preventZoomKeys = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '0'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const preventDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  window.addEventListener('touchstart', preventPinch, { passive: false });
  window.addEventListener('touchmove', preventPinch, { passive: false });
  window.addEventListener('touchend', preventDoubleTap, { passive: false });

  window.addEventListener('keydown', preventZoomKeys);

  // For WebKit browsers (no harm elsewhere):
  window.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('gesturechange', (e) => e.preventDefault());
  window.addEventListener('gestureend', (e) => e.preventDefault());
})();


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
