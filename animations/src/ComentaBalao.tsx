import React from "react";
import { useCurrentFrame } from "remotion";
import { FPS } from "./lib";
import { Base, K, useSpr, W, Y } from "./kit";

export type ComentaBalaoProps = {
  durationSeconds: number;
  title: string;
  note: string;
  typed: string;
  bubbles: string[];
};

export const comentaBalaoDefaults: ComentaBalaoProps = {
  durationSeconds: 2.74,
  title: "",
  note: "",
  typed: "?",
  bubbles: ["?", "Qual distro?", "Funciona no meu PC?"],
};

const Bubble: React.FC<{ at: number; x: number; y: number; w: number; text: string; fill: string; ink: string; tilt: number }> = ({
  at, x, y, w, text, fill, ink, tilt,
}) => {
  const p = useSpr(at, 8, 200);
  const frame = useCurrentFrame();
  const bob = Math.sin((frame + x) / 6) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + bob,
        width: w,
        padding: "26px 20px",
        borderRadius: 48,
        background: fill,
        color: ink,
        fontSize: 64,
        textAlign: "center",
        transform: `scale(${p}) rotate(${tilt}deg)`,
        transformOrigin: "20% 100%",
        opacity: Math.min(1, p * 3),
      }}
    >
      {text}
      <div
        style={{
          position: "absolute",
          left: 50,
          bottom: -30,
          width: 0,
          height: 0,
          borderLeft: "20px solid transparent",
          borderRight: "40px solid transparent",
          borderTop: `40px solid ${fill}`,
        }}
      />
    </div>
  );
};

export const ComentaBalao: React.FC<ComentaBalaoProps> = ({ typed, bubbles }) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const box = useSpr(0.1, 12, 170);
  const shown = typed.slice(0, Math.max(0, Math.floor((s - 0.6) * 5)));
  const blink = Math.floor(s * 5) % 2 === 0;
  const press = shown.length > 0 && s - 0.6 - (shown.length - 1) / 5 < 0.12 ? 1 : 0;
  const pos = [
    { x: 90, y: 400, w: 260, fill: Y, ink: K, tilt: -5, at: 0.3 },
    { x: 520, y: 600, w: 470, fill: W, ink: K, tilt: 4, at: 0.55 },
    { x: 130, y: 860, w: 700, fill: "#222", ink: W, tilt: -3, at: 0.8 },
  ];
  return (
    <Base>
      {bubbles.slice(0, 3).map((t, i) => (
        <Bubble key={i} text={t} {...pos[i]} />
      ))}
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 1180,
          width: 900,
          height: 150,
          borderRadius: 40,
          background: "#111",
          border: `8px solid ${Y}`,
          transform: `scale(${box})`,
          opacity: Math.min(1, box * 2),
          display: "flex",
          alignItems: "center",
          padding: "0 44px",
          color: W,
          fontSize: 86,
        }}
      >
        <span style={{ transform: `translateY(${press * 6}px)` }}>{shown}</span>
        <span style={{ width: 8, height: 90, marginLeft: 8, background: blink ? Y : "transparent" }} />
        <span style={{ marginLeft: "auto", width: 100, height: 100, borderRadius: 50, background: Y, position: "relative" }}>
          <span
            style={{
              position: "absolute", left: 28, top: 30, width: 0, height: 0,
              borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderLeft: `40px solid ${K}`,
            }}
          />
        </span>
      </div>
    </Base>
  );
};
