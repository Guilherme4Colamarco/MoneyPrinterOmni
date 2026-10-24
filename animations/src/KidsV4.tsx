import React from "react";
import { Easing, interpolate, spring } from "remotion";

// v4 (quadro-a-quadro-01): cenas sem template balão+monitor, mascote único, zona da legenda (y > 1300) livre.
export type Pal = { amarelo: string; rosa: string; ciano: string; roxo: string; contorno: string };
type Ctx = { lf: number; ln: number; fps: number; C: Pal; FONTF: string; words: string[]; phase?: string; alt: number };

const K = "#000";
const SW = 10;

// arte.json v3.3 "profundidade": gradientes por cor, sombra dura, contato, extrusão.
export const GR: Record<string, { topo: string; base: string; fundo: string; id: string }> = {
  "#FFD400": { topo: "#FFE866", base: "#FFD400", fundo: "#E6A800", id: "gAm" },
  "#FF3D8B": { topo: "#FF7AB0", base: "#FF3D8B", fundo: "#D81B6A", id: "gRo" },
  "#00D1FF": { topo: "#66E5FF", base: "#00D1FF", fundo: "#009FD1", id: "gCi" },
  "#2B0A5C": { topo: "#4A1F8A", base: "#2B0A5C", fundo: "#1A0338", id: "gRx" },
  "#fff": { topo: "#FFFFFF", base: "#FFFFFF", fundo: "#E6F7FF", id: "gBr" },
  "#FFFFFF": { topo: "#FFFFFF", base: "#FFFFFF", fundo: "#E6F7FF", id: "gBr" },
};
const G = (c: string) => (GR[c] ? `url(#${GR[c].id})` : c);
const SH = (c: string) => (GR[c] ? GR[c].fundo : "#1A0338");
export const DepthDefs: React.FC = () => (
  <defs>
    {Object.values(GR).filter((v, i, a) => a.findIndex((w) => w.id === v.id) === i).map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={g.topo} /><stop offset="100%" stopColor={g.fundo} />
      </linearGradient>
    ))}
    <filter id="hard" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx={12} dy={14} stdDeviation={0} floodColor="#2B0A5C" floodOpacity={0.9} /></filter>
    <filter id="blur3"><feGaussianBlur stdDeviation={3} /></filter>
    <filter id="blur18" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation={18} /></filter>
  </defs>
);
/** Sombra de contato no chão: elipse 80% da largura, altura 14% da largura, +24 px, #2B0A5C 35%, blur 18. lift 0..1 encolhe p/ 70% e 0.2. */
export const Contact: React.FC<{ x: number; y: number; w: number; lift?: number }> = ({ x, y, w, lift = 0 }) => {
  const k = 1 - 0.3 * lift;
  return <ellipse cx={x} cy={y + 24} rx={(w * 0.8 * k) / 2} ry={(w * 0.8 * 0.14 * k) / 2} fill="#2B0A5C" opacity={0.35 - 0.15 * lift} filter="url(#blur18)" />;
};
/** Extrusão: N camadas deslocadas +2/+2 px na cor shade; a última com contorno preto. */
const Ex: React.FC<{ n: number; shade: string; render: (fill: string, stroke: string) => React.ReactNode }> = ({ n, shade, render }) => (
  <>{Array.from({ length: Math.min(10, n) }, (_, k) => n - k).map((i) => (
    <g key={i} transform={`translate(${i * 2},${i * 2})`}>{render(i === n ? "#000" : shade, i === n ? "#000" : shade)}</g>
  ))}</>
);
const Gloss: React.FC<{ w: number; h: number; r: number }> = ({ w, h, r }) => (
  <path d={`M ${-w / 2 + 10} ${h * 0.15} V ${-h / 2 + r} Q ${-w / 2 + 10} ${-h / 2 + 10} ${-w / 2 + r} ${-h / 2 + 10} H ${w * 0.1}`} stroke="#fff" strokeOpacity={0.3} strokeWidth={6} fill="none" strokeLinecap="round" />
);

export const Mascot: React.FC<{ x: number; y: number; w: number; mood?: "smile" | "smug"; squash?: number; screenText?: string; textColor?: string; FONTF: string; tilt?: number }> = ({ x, y, w, mood = "smile", squash = 1, screenText, textColor = "#FFD400", FONTF, tilt = -3 }) => {
  const h = w * 0.68;
  return (
    <g transform={`translate(${x},${y}) scale(1,${squash})`}>
      <Contact x={0} y={h / 2 + w * 0.23} w={w * 0.8} lift={1 - squash > 0 ? 0 : 0} />
      <rect x={-w * 0.09} y={h / 2 - 4} width={w * 0.18} height={w * 0.16} fill={G("#FFD400")} stroke={K} strokeWidth={SW} />
      <rect x={-w * 0.32} y={h / 2 + w * 0.14} width={w * 0.64} height={w * 0.09} rx={w * 0.04} fill={G("#FFD400")} stroke={K} strokeWidth={SW} />
      <g transform={`skewY(${tilt})`}>
      <Ex n={10} shade="#009FD1" render={(fl, st) => <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.08} fill={fl} stroke={st} strokeWidth={SW} />} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.08} fill={G("#00D1FF")} stroke={K} strokeWidth={SW} />
      <Gloss w={w} h={h} r={w * 0.08} />
      {screenText ? (
        <text x={0} y={h * 0.2} textAnchor="middle" fontFamily={FONTF} fontSize={h * 0.62} fill={textColor} stroke={K} strokeWidth={12} paintOrder="stroke">{screenText}</text>
      ) : (
        <>
          {mood === "smug" && <path d={`M ${-w * 0.27} ${-h * 0.2} L ${-w * 0.08} ${-h * 0.13} M ${w * 0.27} ${-h * 0.2} L ${w * 0.08} ${-h * 0.13}`} stroke={K} strokeWidth={10} strokeLinecap="round" />}
          <circle cx={-w * 0.17} cy={-h * 0.04} r={w * 0.05} fill={K} />
          <circle cx={w * 0.17} cy={-h * 0.04} r={w * 0.05} fill={K} />
          {mood === "smug"
            ? <path d={`M ${-w * 0.18} ${h * 0.14} Q 0 ${h * 0.34} ${w * 0.2} ${h * 0.1}`} stroke={K} strokeWidth={10} fill="none" strokeLinecap="round" />
            : <path d={`M ${-w * 0.16} ${h * 0.12} Q 0 ${h * 0.3} ${w * 0.16} ${h * 0.12}`} stroke={K} strokeWidth={10} fill="none" strokeLinecap="round" />}
        </>
      )}
      </g>
    </g>
  );
};

const T: React.FC<{ x: number; y: number; text: string; size: number; fill: string; sc?: string; sw?: number; s?: number; rot?: number; F: string; op?: number; ex?: number }> = ({ x, y, text, size, fill, sc = "#2B0A5C", sw, s = 1, rot = 0, F, op = 1, ex = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`} opacity={op}>
    {ex > 0 && <Ex n={ex} shade={fill === "#fff" || fill === "#FFFFFF" ? "#2B0A5C" : fill === "#FFD400" ? "#E6A800" : SH(fill)} render={(fl) => <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={F} fontSize={size} fill={fl} stroke={fl} strokeWidth={sw ?? Math.max(8, size / 8)} paintOrder="stroke" strokeLinejoin="round">{text}</text>} />}
    <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={F} fontSize={size} fill={fill} stroke={sc} strokeWidth={sw ?? Math.max(8, size / 8)} paintOrder="stroke" strokeLinejoin="round">{text}</text>
  </g>
);

const Kid: React.FC<{ x: number; y: number; h: number; shirt: string; skin?: string; cup?: number; point?: boolean; hair?: boolean }> = ({ x, y, h, shirt, skin = "#E0AC69", cup = 0, point = false, hair = true }) => {
  const s = h / 520;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <Contact x={0} y={250} w={260} />
      <rect x={-110} y={0} width={220} height={260} rx={80} fill={G(shirt)} stroke={K} strokeWidth={SW} />
      <circle cx={0} cy={-110} r={120} fill={skin} stroke={K} strokeWidth={SW} />
      {hair && <path d="M -120 -130 Q -110 -250 0 -235 Q 110 -250 120 -130 Q 60 -175 0 -150 Q -60 -175 -120 -130 Z" fill={K} />}
      <circle cx={-40} cy={-110} r={13} fill={K} /><circle cx={40} cy={-110} r={13} fill={K} />
      <path d="M -38 -55 Q 0 -25 38 -55" stroke={K} strokeWidth={9} fill="none" strokeLinecap="round" />
      {[-1, 1].map((d) => (
        <g key={d} transform={`translate(${d * 125},${-110 - cup * 10})`} opacity={cup > 0 ? 1 : 0}>
          <path d={`M 0 -45 Q ${d * 55} 0 0 45`} stroke={K} strokeWidth={10} fill={skin} />
        </g>
      ))}
      {point && <path d="M 100 60 L 230 -40" stroke={K} strokeWidth={34} strokeLinecap="round" />}
      {point && <path d="M 100 60 L 230 -40" stroke={skin} strokeWidth={20} strokeLinecap="round" />}
    </g>
  );
};

const Bubble: React.FC<{ x: number; y: number; w: number; h: number; fill: string; tail?: "left" | "right" | "none"; shape?: "rect" | "oval" | "cloud"; ex?: number }> = ({ x, y, w, h, fill: fill0, tail = "left", shape = "rect", ex = 6 }) => {
  const fill = G(fill0);
  return (
  <g transform={`translate(${x},${y})`}>
    {shape === "rect" && ex > 0 && <Ex n={ex} shade={SH(fill0)} render={(fl, st) => <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.22} fill={fl} stroke={st} strokeWidth={SW} />} />}
    {shape === "oval" && ex > 0 && <Ex n={ex} shade={SH(fill0)} render={(fl, st) => <ellipse rx={w / 2} ry={h / 2} fill={fl} stroke={st} strokeWidth={SW} />} />}
    {tail !== "none" && <polygon points={tail === "left" ? `${-w * 0.3},${h / 2 - 10} ${-w * 0.38},${h / 2 + 70} ${-w * 0.1},${h / 2 - 10}` : `${w * 0.3},${h / 2 - 10} ${w * 0.38},${h / 2 + 70} ${w * 0.1},${h / 2 - 10}`} fill={fill0} stroke={K} strokeWidth={SW} strokeLinejoin="round" />}
    {shape === "oval" ? <ellipse rx={w / 2} ry={h / 2} fill={fill} stroke={K} strokeWidth={SW} />
      : shape === "cloud" ? <g>{[-0.3, 0, 0.3].map((o, i) => <circle key={i} cx={o * w} cy={i === 1 ? -h * 0.12 : h * 0.05} r={h * 0.48} fill={fill} stroke={K} strokeWidth={SW} />)}<rect x={-w * 0.32} y={-h * 0.05} width={w * 0.64} height={h * 0.5} fill={fill} /></g>
      : <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.22} fill={fill} stroke={K} strokeWidth={SW} />}
    {tail !== "none" && shape === "rect" && <rect x={tail === "left" ? -w * 0.37 : w * 0.1} y={h / 2 - 18} width={w * 0.27} height={14} fill={fill0 === "#fff" ? "#fff" : fill} />}
    {shape === "rect" && <Gloss w={w} h={h} r={h * 0.22} />}
  </g>
  );
};

const Star: React.FC<{ x: number; y: number; r: number; c: string; rot: number }> = ({ x, y, r, c, rot }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(" ");
  return <polygon points={pts} transform={`translate(${x},${y}) rotate(${rot})`} fill={c} stroke={K} strokeWidth={8} strokeLinejoin="round" />;
};

// pulso suave (decisão do diretor de arte): escala 1→1,06→1 em 0,8 s, nunca vazio, opacidade ≥ 0,85
const DashBox: React.FC<{ x: number; y: number; w: number; h: number; fill: string; t?: number }> = ({ x, y, w, h, fill, t = 0 }) => {
  const k = (1 - Math.cos((2 * Math.PI * t) / 0.8)) / 2;
  const sc = 1 + 0.06 * k;
  return <g transform={`translate(${x},${y}) scale(${sc})`} opacity={0.85 + 0.15 * k}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={24} fill={fill} stroke="#2B0A5C" strokeWidth={10} strokeDasharray="34 20" />
  </g>;
};

export const v4Bg: Record<string, string> = {
  chat4: "#00D1FF", ia4: "#FF3D8B", stamp: "#00D1FF", listen4: "#FFD400", books4: "#FF3D8B", site: "#00D1FF",
  dados4: "#00D1FF", treino4: "#00D1FF", game: "#00D1FF", bar4: "#00D1FF", notlike4: "#00D1FF", wrong4: "#00D1FF",
  adult4: "#FFD400", desafio: "#FF3D8B", completar4: "#FF3D8B", tutorial4: "#FF3D8B",
};

/** Fundo (parallax camada "fundo_padrao"): letras A-Z e balõezinhos brancos 18%, 60-140 px, ±20°, 12 px/s, blur 3 px. */
export const LetterBg: React.FC<{ lf: number; fps: number; F: string; speed?: number }> = ({ lf, fps, F, speed = 12 }) => {
  const off = ((lf / fps) * speed) % 260;
  const items: React.ReactNode[] = [];
  let k = 0;
  for (let r = -1; r < 10; r++) for (let c = 0; c < 6; c++) {
    k++;
    const rnd = (Math.sin(k * 12.9898) * 43758.5453) % 1;
    const sz = 60 + Math.abs(rnd) * 80;
    const x = c * 200 + (r % 2) * 100 + 20;
    const y = r * 220 + 120 - off;
    const rot = rnd * 20;
    items.push(k % 5 === 0
      ? <g key={k} transform={`translate(${x},${y}) rotate(${rot})`}><ellipse rx={sz * 0.5} ry={sz * 0.34} fill="#fff" /><polygon points={`${-sz * 0.1},${sz * 0.28} ${-sz * 0.3},${sz * 0.55} ${sz * 0.12},${sz * 0.3}`} fill="#fff" /></g>
      : <text key={k} x={x} y={y} transform={`rotate(${rot} ${x} ${y})`} fontFamily={F} fontSize={sz} fill="#fff" textAnchor="middle">{String.fromCharCode(65 + (k * 7) % 26)}</text>);
  }
  return <g opacity={0.18} filter="url(#blur3)">{items}</g>;
};

/** Chão xadrez em perspectiva (túnel) com ponto de fuga em (540,760), casas #FFD400/#FFE866, linhas #2B0A5C 4 px, 40 px/s para o espectador. */
export const Floor: React.FC<{ lf: number; fps: number; top?: number }> = ({ lf, fps, top = 900 }) => {
  const vx = 540, vy = 760, H = 1980;
  const ph = ((lf / fps) * 40) / 160; // 40 px/s em casas de 160 px
  const polys: React.ReactNode[] = [];
  const Y = (z: number) => vy + (H - vy) / z;
  const X = (u: number, z: number) => vx + (u * 160) / z;
  const z0 = 1 - (ph % 1) * 0.5;
  for (let r = 0; r < 30; r++) {
    const za = z0 + r * 0.5, zb = za + 0.5;
    if (Y(zb) < top - 2) break;
    for (let c = -12; c < 12; c++) {
      const pts = `${X(c, za)},${Y(za)} ${X(c + 1, za)},${Y(za)} ${X(c + 1, zb)},${Y(zb)} ${X(c, zb)},${Y(zb)}`;
      polys.push(<polygon key={`${r}_${c}`} points={pts} fill={(r + c + Math.floor(ph) + 100) % 2 ? "#FFD400" : "#FFE866"} stroke="#2B0A5C" strokeWidth={4} strokeOpacity={0.55} />);
    }
  }
  return <g><clipPath id="floorclip"><rect x={0} y={top} width={1080} height={1920 - top} /></clipPath><g clipPath="url(#floorclip)">{polys}</g>
    {/* faixa #2B0A5C 55% atrás das legendas (y≈1280–1500), blur 40, bordas com fade a 0, margem 120 px */}
    <defs><linearGradient id="subband" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2B0A5C" stopOpacity={0} /><stop offset="0.26" stopColor="#2B0A5C" stopOpacity={0.55} />
      <stop offset="0.74" stopColor="#2B0A5C" stopOpacity={0.55} /><stop offset="1" stopColor="#2B0A5C" stopOpacity={0} /></linearGradient>
      <filter id="blur40" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation={40} /></filter></defs>
    <rect x={-100} y={1160} width={1280} height={460} fill="url(#subband)" filter="url(#blur40)" />
  </g>;
};

export const renderV4 = (scene: string, x: Ctx): React.ReactNode | null => {
  const { lf, fps, C, FONTF: F } = x;
  const sp = (d: number, damping = 10) => spring({ frame: lf - d, fps, config: { damping, stiffness: 170 } });
  const lin = (a: number, b: number) => interpolate(lf, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const stamp = (d: number) => (lf < d ? 0 : interpolate(lf, [d, d + 6], [1.4, 1], { extrapolateRight: "clamp" }));
  const sec = (s: number) => s * fps;

  if (scene === "chat4") {
    const reply = x.phase === "reply";
    const ws = x.words.length ? x.words : ["OLÁ!", "EU SEI", "AJUDAR"];
    const blocks = [C.amarelo, C.rosa, C.ciano];
    const qy = reply ? 700 : 620;
    return <>
      <g transform={`translate(${interpolate(sp(0), [0, 1], [-500, 0])},0)`}>
        <Bubble x={300} y={qy} w={reply ? 300 : 420} h={reply ? 170 : 220} fill={C.rosa} tail="left" />
        <T x={300} y={qy - 10} text="?" size={reply ? 120 : 160} fill="#fff" F={F} />
      </g>
      <g opacity={sp(6)} transform={`translate(740,900) skewY(${interpolate(spring({ frame: lf, fps, config: { damping: 12 } }), [0, 1], [-6, -2.5])}) translate(-740,-900)`}>
        {reply ? <Bubble x={720} y={980} w={540} h={420} fill="#fff" tail="right" /> : <Bubble x={740} y={900} w={520} h={260} fill="#fff" tail="right" />}
        {reply ? ws.map((w, i) => {
          const d = sec(0.25 + i * 0.35);
          const s = sp(d, 9);
          return lf >= d ? <g key={i} transform={`translate(720,${850 + i * 125}) scale(${s})`}>
            <Ex n={4} shade={SH(blocks[i % 3])} render={(fl, st) => <rect x={-230} y={-56} width={460} height={110} rx={22} fill={fl} stroke={st} strokeWidth={6} />} />
            <rect x={-230} y={-56} width={460} height={110} rx={22} fill={G(blocks[i % 3])} stroke={K} strokeWidth={6} />
            <T x={0} y={0} text={w} size={96} fill={i % 3 === 0 ? "#2B0A5C" : "#fff"} sc={i % 3 === 0 ? "#fff" : "#2B0A5C"} sw={10} F={F} />
          </g> : null;
        }) : [0, 1, 2].map((i) => <circle key={i} cx={640 + i * 100} cy={890 - Math.max(0, Math.sin(((lf - i * sec(0.15)) / fps) * Math.PI * 2.5)) * 30} r={20} fill="#2B0A5C" />)}
      </g>
      <Mascot x={reply ? 240 : 280} y={reply ? 1030 : 1000} w={300} FONTF={F} />
    </>;
  }
  if (scene === "ia4") {
    const ang = (lf / fps / 2.2) * Math.PI * 2;
    return <>
      <g transform={`translate(540,760) scale(${sp(0)})`}><Mascot x={0} y={0} w={640} screenText="IA" FONTF={F} /></g>
      {["A", "B", "C"].map((l, i) => {
        const a = ang + (i * Math.PI * 2) / 3;
        const dz = Math.sin(a); const behind = dz < -0.2;
        return <g key={l} filter={behind ? "url(#blur3)" : undefined}><T x={540 + Math.cos(a) * 320} y={760 + Math.sin(a) * 120} text={l} size={120} fill="#fff" sw={12} F={F} s={sp(4 + i * 4) * (1 + 0.15 * dz)} ex={behind ? 0 : 4} /></g>;
      })}
      <T x={170} y={400} text="?" size={140} fill={C.amarelo} sc={K} sw={12} F={F} s={sp(10)} />
      <T x={900} y={1180} text="…" size={140} fill="#fff" sw={12} F={F} s={sp(14)} />
    </>;
  }
  if (scene === "stamp") {
    return <>
      <T x={540} y={560} text="PROGRAMA" size={110} fill="#fff" sw={14} ex={4} F={F} s={stamp(2)} op={lf >= 2 ? 1 : 0} />
      <T x={540} y={740} text="QUE USA" size={96} fill="#fff" sw={12} ex={4} F={F} s={stamp(sec(0.8))} op={lf >= sec(0.8) ? 1 : 0} />
      <T x={540} y={960} text="PALAVRAS" size={124} fill="#FFD400" sc={K} sw={16} ex={8} F={F} s={stamp(sec(1.45))} op={lf >= sec(1.45) ? 1 : 0} rot={-3} />
    </>;
  }
  if (scene === "listen4") {
    const shapes: ("oval" | "cloud" | "rect")[] = ["oval", "cloud", "rect", "cloud", "oval"];
    const pos = [[210, 430], [540, 330], [870, 430], [210, 820], [870, 820]];
    const cols = [C.rosa, "#fff", C.ciano, C.ciano, C.rosa];
    return <>
      {pos.map(([bx, by], i) => {
        const s = sp(sec(0.1 + i * 0.35));
        return <g key={i} transform={`translate(${bx},${by}) scale(${s})`}>
          <Bubble x={0} y={0} w={240} h={150} fill={cols[i]} tail={bx < 540 ? "right" : bx > 540 ? "left" : "none"} shape={shapes[i]} />
          {[0, 1, 2].map((l) => <path key={l} d={`M -70 ${-30 + l * 30} q 23 -14 46 0 t 46 0 t 46 0`} stroke={K} strokeWidth={8} fill="none" strokeLinecap="round" />)}
        </g>;
      })}
      <Kid x={540} y={880} h={520} shirt={C.ciano} cup={0.5 + 0.5 * Math.sin((lf / fps) * Math.PI * 2 * 2)} />
    </>;
  }
  if (scene === "books4") {
    const wsr = x.words.slice(0, 3); // v6: shot 05 sem rótulos
    const ws = wsr.map((w) => w.split("@")[0]);
    const at = wsr.map((w, i) => (w.includes("@") ? parseFloat(w.split("@")[1]) : 0.35 + i * 0.4));
    const spines = [C.amarelo, C.rosa, C.ciano, "#fff", C.roxo, C.amarelo];
    return <>
      <Contact x={555} y={1240} w={760} />
      {spines.map((c, i) => <g key={i} transform={`translate(0,${(1 - sp(i * 2)) * -500})`}>
        <Ex n={6} shade={SH(c)} render={(fl, st) => <rect x={190 + (i % 2) * 30} y={1210 - i * 62} width={700} height={56} rx={12} fill={fl} stroke={st} strokeWidth={SW} />} />
        <rect x={190 + (i % 2) * 30} y={1210 - i * 62} width={700} height={56} rx={12} fill={G(c)} stroke={K} strokeWidth={SW} />
      </g>)}
      {ws.map((w, i) => {
        const d = Math.round(sec(at[i] - 0.3));
        const t = lin(d, d + sec(0.3));
        const tx = [300, 780, 540][i]; const ty = [560, 680, 820][i];
        if (lf < d) return null;
        if (t < 1) return <g key={i} transform={`translate(${interpolate(t, [0, 1], [540, tx])},${interpolate(t, [0, 1], [880, ty])}) rotate(${(1 - t) * 30}) scale(${1 - t * 0.4})`}>
          <rect x={-80} y={-100} width={160} height={200} fill="#fff" stroke={K} strokeWidth={8} />{[0, 1, 2, 3].map((l) => <line key={l} x1={-55} x2={55} y1={-60 + l * 40} y2={-60 + l * 40} stroke="#2B0A5C" strokeWidth={10} />)}
        </g>;
        return <T key={i} x={tx} y={ty} text={w} size={96} fill="#fff" sw={12} F={F} s={stamp(d + sec(0.3))} />;
      })}
    </>;
  }
  if (scene === "site") {
    // v6 / arte.json v3.4-sincronia: cartões LIVRO, ARTIGO, SITE entram no quadro em que a palavra é falada
    // (quadros do shot via edge-tts WordBoundary: livros 16,111 s, artigos 16,701 s, sites 17,257 s; início do shot = quadro 450)
    const wsr = x.words.length ? x.words : ["LIVRO@33", "ARTIGO@51", "SITE@68"];
    const ws = wsr.map((w) => w.split("@")[0]);
    const at = wsr.map((w, i) => (w.includes("@") ? parseInt(w.split("@")[1], 10) : 33 + i * 18));
    const pop = (d: number) => lf < d ? 0 : interpolate(lf, [d, d + 6, d + 10], [0.3, 1.15, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
    const fade = 1 - lin(at[0] - 6, at[0] + 4);
    const icon = (i: number) => i === 0 ? <g>
        <Ex n={5} shade={SH(C.rosa)} render={(fl, st) => <rect x={-70} y={-55} width={140} height={110} rx={10} fill={fl} stroke={st} strokeWidth={8} />} />
        <rect x={-70} y={-55} width={140} height={110} rx={10} fill={G(C.rosa)} stroke={K} strokeWidth={8} />
        <rect x={-58} y={-55} width={20} height={110} fill={G(C.amarelo)} stroke={K} strokeWidth={6} />
      </g> : i === 1 ? <g>
        <rect x={-60} y={-70} width={120} height={140} rx={8} fill="#fff" stroke={K} strokeWidth={8} />
        <rect x={-42} y={-52} width={84} height={22} rx={4} fill={C.ciano} stroke={K} strokeWidth={4} />
        {[0, 1, 2].map((l) => <line key={l} x1={-42} x2={l === 2 ? 10 : 42} y1={-5 + l * 26} y2={-5 + l * 26} stroke="#2B0A5C" strokeWidth={9} strokeLinecap="round" />)}
      </g> : <g>
        <rect x={-75} y={-55} width={150} height={110} rx={12} fill="#fff" stroke={K} strokeWidth={8} />
        <path d="M -75 -20 V -43 Q -75 -55 -63 -55 H 63 Q 75 -55 75 -43 V -20 Z" fill={G(C.rosa)} stroke={K} strokeWidth={6} />
        {[0, 1, 2].map((k) => <circle key={k} cx={-55 + k * 18} cy={-37} r={5} fill="#fff" stroke={K} strokeWidth={2} />)}
        {[0, 1].map((l) => <line key={l} x1={-55} x2={l ? 20 : 55} y1={5 + l * 26} y2={5 + l * 26} stroke={C.ciano} strokeWidth={10} strokeLinecap="round" />)}
      </g>;
    return <>
      {fade > 0 && [0, 1, 2, 3].map((i) => {
        const yy = 1100 - ((lf * (6 + i) + i * 160) % 700);
        return <g key={i} opacity={fade} transform={`translate(${220 + i * 210},${yy}) rotate(${(i - 1.5) * 14 + Math.sin(lf / 8 + i) * 6})`}>
          <rect x={-80} y={-100} width={160} height={200} rx={10} fill={G("#fff")} stroke={K} strokeWidth={8} />
          {[0, 1, 2, 3].map((l) => <line key={l} x1={-55} x2={55} y1={-60 + l * 40} y2={-60 + l * 40} stroke={[C.ciano, C.rosa, C.amarelo][(l + i) % 3]} strokeWidth={10} strokeLinecap="round" />)}
        </g>;
      })}
      {/* v6b: pilha centrada em y≈820 (espaço livre 260–1380), cartões +10%, vão 40 px, posições fixas desde o quadro 0 */}
      {lf >= at[0] && <ellipse cx={540} cy={1250} rx={400 * Math.min(1, pop(at[0]))} ry={44} fill="#2B0A5C" opacity={0.35} filter="url(#blur18)" />}
      {ws.slice(0, 3).map((w, i) => {
        const s = pop(at[i]);
        if (s <= 0) return null;
        const cy = 820 + (i - 1) * 261; // 209 px de altura + 40 px de vão visível + ~12 px de extrusão
        const rot = [-3, 2, -2][i];
        return <g key={i} transform={`translate(540,${cy}) rotate(${rot}) scale(${1.1 * s})`}>
          <Ex n={6} shade={SH("#fff")} render={(fl, st) => <rect x={-320} y={-95} width={640} height={190} rx={34} fill={fl} stroke={st} strokeWidth={SW} />} />
          <rect x={-320} y={-95} width={640} height={190} rx={34} fill={G("#fff")} stroke={K} strokeWidth={SW} />
          <g transform="translate(-195,0)">{icon(i)}</g>
          <T x={85} y={0} text={w} size={100} fill="#FFFFFF" sc="#2B0A5C" sw={12} ex={4} F={F} />
        </g>;
      })}
    </>;
  }
  if (scene === "dados4") {
    return <>{[0, 1, 2, 3, 4].map((i) => {
      const d = sec(i * 0.15);
      const s = sp(d);
      return <g key={i} transform={`translate(540,760) rotate(${(i - 2) * 11 * s}) translate(0,${(1 - s) * 400})`} opacity={lf >= d ? 1 : 0}>
        <rect x={-210 + [6, 10, 14, 10, 6][i]} y={-300 + [6, 10, 14, 10, 6][i]} width={420} height={560} rx={18} fill="#2B0A5C" opacity={0.9} />
        <rect x={-210} y={-300} width={420} height={560} rx={18} fill={G("#fff")} stroke={K} strokeWidth={SW} />
        {[0, 1, 2, 3, 4, 5, 6].map((l) => <line key={l} x1={-160} x2={l % 3 === 2 ? 60 : 160} y1={-220 + l * 68} y2={-220 + l * 68} stroke={[C.ciano, C.rosa, C.amarelo][(l + i) % 3]} strokeWidth={14} strokeLinecap="round" />)}
      </g>;
    })}</>;
  }
  if (scene === "treino4") {
    const ws = (x.words.length ? x.words : ["AZUL", "LUA", "CÉU"]).slice(0, 3);
    let squash = 1;
    const items = ws.map((w, i) => {
      const d = sec(i * 0.7);
      const t = interpolate(lf, [d, d + sec(0.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
      const land = d + sec(0.6);
      if (lf >= land && lf < land + 5) squash = 0.9;
      if (lf < d || lf >= land + 4) return null;
      const post = lf >= land ? interpolate(lf, [land, land + 4], [1, 0], { extrapolateRight: "clamp" }) : 1;
      const sx = [250, 830, 540][i];
      return <T key={i} x={interpolate(t, [0, 1], [sx, 540])} y={interpolate(t, [0, 1], [330, 1000])} text={w} size={110} fill="#fff" sw={14} ex={4} F={F} s={t < 0.15 ? interpolate(t, [0, 0.08, 0.15], [0.6, 1.15, 1]) : 1 - 0.5 * (1 - post)} op={post} />;
    });
    return <>
      <Mascot x={540} y={1060} w={380} squash={squash} FONTF={F} />
      {items}
    </>;
  }
  if (scene === "game") {
    const fill = x.phase === "fill";
    const ft = lin(sec(1.1), sec(1.4));
    const az = lf < sec(1.1) ? 0 : interpolate(lf, [sec(1.1), sec(1.1) + 6, sec(1.1) + 10], [0.3, 1.15, 1], { extrapolateRight: "clamp" });
    return <>
      <Floor lf={lf} fps={fps} />
      <Contact x={540} y={900} w={860} />
      <g transform={`scale(${Math.min(sp(0, 18), 1.03)})`} style={{ transformOrigin: "540px 760px" }}>
        <Bubble x={540} y={740} w={860} h={260} fill="#fff" tail="left" ex={6} />
        <T x={fill ? 300 : 340} y={740} text="O CÉU É" size={fill ? 96 : 104} fill="#2B0A5C" sc="#fff" sw={8} ex={6} F={F} />
        <DashBox x={fill ? 770 : 780} y={740} w={fill ? 330 : 280} h={150} fill={fill && ft > 0 ? C.ciano : "#FFD400"} t={lf / fps} />
        {fill && ft > 0 && <T x={770} y={740} text="AZUL" size={96} fill="#fff" sw={12} ex={8} F={F} s={az} />}
      </g>
      {fill && Array.from({ length: 6 }, (_, i) => {
        const ag = (i / 6) * Math.PI * 2; const t = lin(sec(1.35), sec(1.9));
        return t > 0 ? <Star key={i} x={770 + Math.cos(ag) * 180 * t} y={740 + Math.sin(ag) * 200 * t} r={50} c={C.amarelo} rot={lf * 4} /> : null;
      })}
    </>;
  }
  if (scene === "bar4") {
    const second = x.phase === "b";
    const lit = second ? (lf > sec(0.9) ? 3 : 2) : (lf > sec(0.6) ? 1 : 0);
    const shake = !second && lf > sec(1.0) && lf < sec(1.2) ? Math.sin(lf * 3) * 4 : 0;
    return <>
      <T x={540} y={430} text="AZUL" size={110} fill="#fff" sw={14} F={F} s={sp(-8)} />
      {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${160 + i * 190},760) scale(${sp(i * 2 - 8)})`}>
        <ellipse rx={76} ry={62} fill={i < lit ? C.amarelo : "#fff"} stroke={K} strokeWidth={SW} />
        <polygon points="-20,58 -40,105 15,62" fill={i < lit ? C.amarelo : "#fff"} stroke={K} strokeWidth={8} strokeLinejoin="round" />
      </g>)}
      {!second && lf > sec(1.0) && <g transform={`translate(${540 + shake},960) scale(${sp(sec(1.0))})`}>
        <circle r={70} fill={C.rosa} stroke={K} strokeWidth={10} />
        <path d="M -30 -30 L 30 30 M 30 -30 L -30 30" stroke={K} strokeWidth={18} strokeLinecap="round" />
      </g>}
      {second && lf > sec(0.9) && <T x={540} y={1060 - lin(sec(0.9), sec(1.3)) * 80} text="+1" size={120} fill={C.amarelo} sc={K} sw={14} F={F} />}
    </>;
  }
  if (scene === "notlike4") {
    const s = sp(sec(0.2));
    return <>
      <Kid x={290} y={900} h={460} shirt={C.rosa} />
      <Mascot x={800} y={960} w={320} FONTF={F} />
      <T x={540} y={930} text="≠" size={200} fill={K} sc="#fff" sw={12} F={F} s={sp(4)} />
      <g transform={`translate(290,470) scale(${s})`}><Bubble x={0} y={0} w={260} h={170} fill="#fff" tail="none" shape="cloud" />
        <path d="M 0 40 C -70 -10 -40 -60 0 -25 C 40 -60 70 -10 0 40 Z" fill={C.rosa} stroke={K} strokeWidth={7} /></g>
      <g transform={`translate(800,520) scale(${s})`}><Bubble x={0} y={0} w={260} h={170} fill="#fff" tail="none" shape="cloud" />
        <T x={0} y={0} text="A B C" size={64} fill="#2B0A5C" sc="#fff" sw={8} F={F} /></g>
    </>;
  }
  if (scene === "wrong4") {
    const zoomIn = x.phase === "b";
    const z = zoomIn ? interpolate(lf, [0, sec(2)], [1, 1.25], { extrapolateRight: "clamp" }) : 1;
    const blink = zoomIn ? (Math.floor(lf / (fps / 8)) % 2 ? 1.08 : 1) : (Math.floor(lf / 7) % 2 ? 1.08 : 1);
    return <>
      <g opacity={sp(zoomIn ? 0 : 4)}>
        <Bubble x={540} y={690} w={820} h={300} fill="#fff" tail="left" />
        <T x={540} y={625} text="O CÉU É" size={88} fill="#2B0A5C" sc="#fff" sw={8} F={F} />
        <T x={540} y={750} text="VERDE" size={110} fill="#2B0A5C" sc={C.amarelo} sw={14} F={F} s={(zoomIn ? 1 : sp(10)) * blink} />
      </g>
      <g transform={`translate(360,1070) scale(${z})`}><Mascot x={0} y={0} w={340} mood="smug" FONTF={F} /></g>
      <T x={850} y={1040} text="!" size={300} fill={C.rosa} sc={K} sw={14} F={F} s={sp(zoomIn ? 0 : 14)} />
    </>;
  }
  if (scene === "adult4") {
    const st = stamp(sec(1.5));
    return <>
      <Bubble x={540} y={470} w={860} h={200} fill="#fff" tail="left" />
      <T x={540} y={470} text="O CÉU É VERDE" size={76} fill="#2B0A5C" sc="#fff" sw={8} F={F} />
      <Kid x={280} y={940} h={560} shirt={C.ciano} skin="#C68642" />
      <Kid x={800} y={1070} h={360} shirt={C.rosa} skin="#F1C27D" point />
      <g transform={`translate(${interpolate(lin(0, sec(1.2)), [0, 1], [420, 760])},352) rotate(210)`}>
        <line x1={0} y1={78} x2={0} y2={190} stroke={K} strokeWidth={28} strokeLinecap="round" />
        <circle r={72} fill="rgba(0,209,255,0.35)" stroke={K} strokeWidth={12} />
      </g>
      {lf >= sec(1.5) && <T x={940} y={760} text="!" size={200} fill={C.rosa} sc={K} sw={14} F={F} s={st} rot={8} />}
    </>;
  }
  if (scene === "desafio") {
    const shake = (d: number) => (lf >= d && lf < d + 8 ? Math.sin(lf * 2.5) * 6 : 0);
    return <>
      {Array.from({ length: 30 }, (_, i) => {
        const layer = i % 3; // 0 fundo (blur 3), 1 meio, 2 frente maior
        const sz = (20 + (i * 7) % 21) * [0.8, 1, 1.4][layer];
        const y = ((lf * (4 + (i % 4)) + i * 97) % 1500) + 150;
        const xx = (i * 137) % 1000 + 40;
        return <rect key={i} x={xx} y={y > 1280 ? -100 : y} width={sz} height={sz * 0.6} fill={[C.amarelo, C.ciano, "#fff", C.roxo][i % 4]} stroke={K} strokeWidth={3} filter={layer === 0 ? "url(#blur3)" : undefined} transform={`rotate(${(lf * 5 + i * 40) % 360} ${xx} ${y})`} />;
      })}
      <g transform={`translate(${shake(0)},0)`}><T x={540} y={640} text="DESAFIO" size={170} fill={C.amarelo} sc={K} sw={16} rot={-4} ex={10} F={F} s={stamp(0)} op={1} /></g>
      <g transform={`translate(${shake(sec(0.6))},0)`}><T x={540} y={900} text="DE HOJE!" size={120} fill="#fff" sw={14} ex={6} F={F} s={stamp(sec(0.6))} op={lf >= sec(0.6) ? 1 : 0} /></g>
    </>;
  }
  if (scene === "completar4") {
    return <>
      <Bubble x={540} y={650} w={880} h={240} fill="#fff" tail="left" />
      <Kid x={300} y={1060} h={420} shirt={C.ciano} skin="#C68642" />
      <Kid x={790} y={1110} h={360} shirt={C.amarelo} skin="#F1C27D" />
      <T x={930} y={840 - Math.abs(Math.sin((lf / fps) * Math.PI * 2)) * 30} text="?" size={120} fill={C.amarelo} sc={K} sw={12} F={F} />
    </>;
  }
  if (scene === "tutorial4") {
    return <>
      <Floor lf={lf} fps={fps} top={1000} />
      {[0, 1, 2, 3].map((i) => <Star key={i} x={[150, 930, 160, 920][i]} y={[420, 400, 1180, 1200][i]} r={55 * sp(i * 3)} c={i % 2 ? C.amarelo : "#fff"} rot={lf * 3} />)}
      <g transform="translate(540,780) scale(1,0.97) translate(-540,-780)" opacity={sp(0)}>
        <Bubble x={540} y={780} w={800} h={400} fill="#fff" tail="left" />
        <T x={540} y={700} text="E VOCÊ?" size={130} fill="#2B0A5C" sc="#fff" sw={10} F={F} s={sp(0)} />
        <DashBox x={540} y={860} w={300} h={110} fill="#FFD400" t={lf / fps} />
      </g>
    </>;
  }
  return null;
};
