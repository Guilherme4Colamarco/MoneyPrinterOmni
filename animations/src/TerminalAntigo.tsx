import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, MONO } from "./lib";

export type TerminalAntigoProps = {
  durationSeconds: number;
  title: string;
  note: string;
  lines: { kind: "cmd" | "out" | "err"; text: string }[];
};

export const terminalAntigoDefaults: TerminalAntigoProps = {
  durationSeconds: 4.13,
  title: "",
  note: "",
  lines: [
    { kind: "cmd", text: "sudo apt-get install driver-placa" },
    { kind: "out", text: "Reading package lists... Done" },
    { kind: "err", text: "E: Unable to locate package driver-placa" },
    { kind: "cmd", text: "sudo dpkg -i driver-placa.deb" },
    { kind: "err", text: "dpkg: dependency problems prevent" },
    { kind: "err", text: "      configuration of driver-placa:" },
    { kind: "err", text: " driver-placa depends on libgl1-old;" },
    { kind: "err", text: "  however it is not installed." },
    { kind: "cmd", text: "./configure && make" },
    { kind: "out", text: "checking for gcc... gcc" },
    { kind: "err", text: "error: missing library libxyz" },
    { kind: "err", text: "make: *** [Makefile:42] Error 1" },
    { kind: "cmd", text: "" },
  ],
};

const GREEN = "#33ff66";
const GREY = "#9aa39c";
const RED = "#ff6b5e";
const LH = 50;

export const TerminalAntigo: React.FC<TerminalAntigoProps> = ({ lines, durationSeconds }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = frame / FPS;
  // Agenda: comandos digitados a ~70 car/s; saídas aparecem rápido.
  let cursor = 0.1;
  const sched = lines.map((l) => {
    const start = cursor;
    const dur = l.kind === "cmd" ? Math.max(0.1, l.text.length / 70) : 0.07;
    cursor += dur + (l.kind === "cmd" ? 0.12 : 0.03);
    return { ...l, start, dur };
  });
  const shown = sched.filter((l) => s >= l.start);
  const rows = shown.map((l) => {
    const p = Math.min(1, (s - l.start) / l.dur);
    const text = l.kind === "cmd" ? l.text.slice(0, Math.round(l.text.length * p)) : l.text;
    return { ...l, text, p };
  });
  const last = rows[rows.length - 1];
  const blink = Math.floor(s * 4) % 2 === 0;
  const tEnd = durationInFrames / FPS;
  const g = Math.max(0, (s - (tEnd - 0.7)) / 0.7); // intensidade do glitch no fim
  const gf = g > 0 ? frame : 0;
  const jx = g > 0 ? (random(`x${gf}`) - 0.5) * 50 * g : 0;
  const jy = g > 0 ? (random(`y${gf}`) - 0.5) * 24 * g : 0;
  const split = 2 + g * 10;
  const bandY = 300 + random(`b${gf}`) * 1100;
  const shadow = g > 0 ? `${split}px 0 rgba(255,0,60,.7), ${-split}px 0 rgba(0,220,255,.7)` : `0 0 8px ${GREEN}55`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050805", fontFamily: MONO }}>
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 300,
          width: 980,
          height: 1260,
          background: "#0a120c",
          border: "3px solid #2c3a2f",
          borderRadius: 10,
          overflow: "hidden",
          transform: `translate(${jx}px, ${jy}px)`,
        }}
      >
        <div style={{ height: 56, background: "#1c241e", display: "flex", alignItems: "center", paddingLeft: 20, gap: 12 }}>
          {["#555", "#555", "#555"].map((c, i) => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
          ))}
          <div style={{ color: GREY, fontSize: 26, marginLeft: 20 }}>root@pc: ~</div>
        </div>
        <div style={{ padding: "24px 24px", fontSize: 34, lineHeight: `${LH}px`, textShadow: shadow, whiteSpace: "pre" }}>
          {rows.map((r, i) => {
            const color = r.kind === "err" ? RED : r.kind === "out" ? GREY : GREEN;
            const isLast = r === last;
            return (
              <div key={i} style={{ color }}>
                {r.kind === "cmd" ? "$ " : ""}
                {r.text}
                {isLast && r.kind === "cmd" ? null : null}
                {isLast && (blink || r.p < 1) ? <span style={{ background: GREEN, color: GREEN }}>{"█"}</span> : null}
              </div>
            );
          })}
        </div>
        {/* scanlines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 2px, transparent 2px 5px)",
          }}
        />
        {g > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: bandY - 300,
              height: 40 + g * 60,
              background: "rgba(51,255,102,.18)",
              transform: `translateX(${(random(`h${gf}`) - 0.5) * 120 * g}px)`,
            }}
          />
        )}
      </div>
      <span style={{ display: "none" }}>{durationSeconds}</span>
    </AbsoluteFill>
  );
};
