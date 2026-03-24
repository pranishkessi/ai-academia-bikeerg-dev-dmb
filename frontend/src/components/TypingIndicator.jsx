// src/components/TypingIndicator.jsx
import React from "react";
import Lottie from "lottie-react";
import typingAnimation from "../animations/bubble_typing.json";

const TypingIndicator = () => (
  <Lottie
    animationData={typingAnimation}
    loop
    style={{ width: 60, height: 40 }}
  />
);

export default TypingIndicator;
