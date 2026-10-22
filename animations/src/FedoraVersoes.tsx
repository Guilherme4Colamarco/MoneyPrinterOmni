import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FPS } from "./lib";
import { Base, K, useSpr, W, Y } from "./kit";

export type FedoraVersoesProps = {
  durationSeconds: number;
  title: string;
  note: string;
  versions: { name: string; date: string }[];
  line1: string;
  line2: string;
};

export const fedoraVersoesDefaults: FedoraVersoesProps = {
  durationSeconds: 4.02,
  title: "",
  note: "",
  versions: [
    { name: "Fedora 43", date: "" },
    { name: "Fedora 44", date: "28/04/2026" },
    { name: "Fedora 45", date: "" },
  ],
  line1: "2 versões por ano",
  line2: "~13 meses de suporte cada",
};

const TOP = 360;
const STEP = 270;

const Node: React.FC<{ i: number; name: string; date: string; hot: boolean }> = ({ i, name, date, hot }) => {
  const p = useSpr(0.15 + i * 0.4);
  const y = TOP + i * STEP;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1080, opacity: Math.min(1, p * 2) }}>
      <div
        style={{
          position: "absolute",
          left: 150 - 34,
          top: 0,
          width: 68,
          height: 68,
          borderRadius: 40,
          background: hot ? Y : K,
          border: `8px solid ${hot ? Y : W}`,
          transform: `scale(${p})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 250,
          top: -22,
          padding: "14px 34px",
          borderRadius: 24,
          background: hot ? Y : "#1c1c1c",
          color: hot ? K : W,
          fontSize: 76,
          transform: `translateX(${(1 - p) * 300}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {name}
        {date ? <div style={{ fontSize: 44, marginTop: 2 }}>{date}</div> : null}
      </div>
    </div>
  );
};

export const FedoraVersoes: React.FC<FedoraVersoesProps> = ({ versions, line1, line2 }) => {
  const frame = useCurrentFrame();
  const n = versions.length;
  const lineH = interpolate(frame, [0, (0.15 + (n - 1) * 0.4) * FPS + 6], [0, (n - 1) * STEP + 34], {
    extrapolateRight: "clamp",
  });
  const a = useSpr(0.15 + n * 0.4 + 0.05);
  const b = useSpr(0.15 + n * 0.4 + 0.35);
  const base = TOP + (n - 1) * STEP + 170;
  const pill = (p: number, big: boolean): React.CSSProperties => ({
    position: "absolute",
    left: 70,
    right: 70,
    textAlign: "center",
    color: big ? K : W,
    background: big ? Y : "transparent",
    border: big ? "none" : `6px solid ${Y}`,
    borderRadius: 28,
    padding: "14px 10px",
    fontSize: big ? 84 : 58,
    opacity: Math.min(1, p * 2),
    transform: `scale(${0.6 + 0.4 * p}) translateY(${(1 - p) * 60}px)`,
  });
  return (
    <Base>
      <div style={{ position: "absolute", left: 146, top: TOP + 34, width: 8, height: lineH, background: W }} />
      {versions.map((v, i) => (
        <Node key={i} i={i} name={v.name} date={v.date} hot={!!v.date} />
      ))}
      <div style={{ ...pill(a, true), top: base }}>{line1}</div>
      <div style={{ ...pill(b, false), top: base + 140 }}>{line2}</div>
    </Base>
  );
};
