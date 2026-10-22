import React from "react";
import { useCurrentFrame } from "remotion";
import { Base, K, useSpr, W, Y } from "./kit";

export type TrocariaCardProps = {
  durationSeconds: number;
  title: string;
  note: string;
  names: string[];
  question: string;
};

export const trocariaCardDefaults: TrocariaCardProps = {
  durationSeconds: 2.49,
  title: "",
  note: "",
  names: ["Zorin OS", "Pop OS", "Linux Mint", "Fedora", "BigLinux"],
  question: "E você, trocaria?",
};

const spots = [
  { x: 70, y: 380, from: [-500, 0] },
  { x: 560, y: 420, from: [500, 0] },
  { x: 60, y: 1150, from: [-500, 0] },
  { x: 620, y: 1120, from: [500, 0] },
  { x: 320, y: 1290, from: [0, 400] },
];

const Chip: React.FC<{ i: number; name: string }> = ({ i, name }) => {
  const sp = spots[i % spots.length];
  const p = useSpr(0.05 + i * 0.12, 10, 200);
  const frame = useCurrentFrame();
  const bob = Math.sin((frame + i * 9) / 7) * 7;
  return (
    <div
      style={{
        position: "absolute",
        left: sp.x,
        top: sp.y + bob,
        padding: "20px 38px",
        borderRadius: 30,
        background: i % 2 ? W : "#1e1e1e",
        color: i % 2 ? K : W,
        border: `6px solid ${i % 2 ? W : Y}`,
        fontSize: 64,
        whiteSpace: "nowrap",
        transform: `translate(${(1 - p) * sp.from[0]}px, ${(1 - p) * sp.from[1]}px) rotate(${(i % 2 ? 3 : -3) * p}deg)`,
        opacity: Math.min(1, p * 3),
      }}
    >
      {name}
    </div>
  );
};

export const TrocariaCard: React.FC<TrocariaCardProps> = ({ names, question }) => {
  const q = useSpr(0.5, 9, 160);
  const words = question.split(" ");
  return (
    <Base>
      {names.map((n, i) => (
        <Chip key={i} i={i} name={n} />
      ))}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 640,
          textAlign: "center",
          color: Y,
          fontSize: 130,
          lineHeight: 1.1,
          transform: `scale(${0.3 + 0.7 * q})`,
          opacity: Math.min(1, q * 2),
          textShadow: "0 8px 0 #000",
        }}
      >
        {words.join(" ")}
      </div>
    </Base>
  );
};
