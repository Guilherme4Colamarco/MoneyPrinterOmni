import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONT, FPS } from "./lib";

export const Y = "#FFD400";
export const W = "#FFFFFF";
export const K = "#000000";

/** Fundo preto com fonte carregada; topo (~300 px) e base (~400 px) ficam livres. */
export const Base: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("font"));
  useEffect(() => {
    loadFont({ family: "BeVietnamPro", url: staticFile("BeVietnamPro-Bold.ttf"), weight: "700" })
      .catch(() => undefined)
      .then(() => continueRender(h));
  }, [h]);
  const frame = useCurrentFrame();
  const drift = (frame * 3) % 120;
  return (
    <AbsoluteFill style={{ backgroundColor: K, fontFamily: FONT }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(#ffffff0d 2px, transparent 2px), linear-gradient(90deg, #ffffff0d 2px, transparent 2px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `0 ${drift}px`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** Spring rápido (entrada a partir de `at` segundos). */
export const useSpr = (at: number, damping = 11, stiffness = 180): number => {
  const frame = useCurrentFrame();
  return spring({ frame: frame - Math.round(at * FPS), fps: FPS, config: { damping, stiffness, mass: 0.7 } });
};
export { useVideoConfig };
