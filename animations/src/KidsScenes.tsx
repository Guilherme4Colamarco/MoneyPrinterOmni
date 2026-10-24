import { loadFont } from "@remotion/fonts";
import React, { useEffect, useState } from "react";
import { DepthDefs, GR, LetterBg, renderV4, v4Bg } from "./KidsV4";
import {
  AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";

// Cenas cartoon do projeto ia-por-tras-infantil (arte.json: formas chapadas, contorno preto grosso).
export type KidsProps = {
  scene: string;
  durationSeconds: number;
  colors: { amarelo: string; rosa: string; ciano: string; roxo: string; contorno: string };
  words?: string[];
  reply?: boolean; // chat: resposta montando palavra por palavra
  from?: number; // segundos já decorridos da cena-mãe (sub-plano com corte seco)
  total?: number; // duração total da cena-mãe em segundos
  alt?: number; // troca de cor de fundo/enquadramento no sub-plano
  overlay?: string; // texto na tela (arte.json texto_na_tela), entra com pop
  overlayPos?: "top" | "center" | "bottom";
  overlayVariant?: "default" | "bubble"; // bubble: roxo dentro de balão branco, sombra amarela deslocada
  replyDy?: number; // chat: desloca o balão de resposta (px)
  phase?: string; // v4: variação da cena (reply, fill, b...)
};

export const kidsDefaults: KidsProps = {
  scene: "question",
  durationSeconds: 3,
  colors: { amarelo: "#FFD400", rosa: "#FF3D8B", ciano: "#00D1FF", roxo: "#2B0A5C", contorno: "#000000" },
  words: [],
};

const K = "#000";
const SW = 10;
const FONTF = "BeVietnamProBlack, sans-serif"; // arte.json v3.2 (SIL OFL 1.1)

const useP = (from = 0, total?: number) => {
  const { fps, durationInFrames: local } = useVideoConfig();
  const f = useCurrentFrame() + Math.round(from * fps);
  const durationInFrames = total ? Math.round(total * fps) : local;
  const pop = (delay: number) => spring({ frame: f - delay, fps, config: { damping: 9, stiffness: 160 } });
  const lin = (a: number, b: number) =>
    interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return { f, fps, n: durationInFrames, pop, lin };
};

const Cat: React.FC<{ x: number; y: number; s: number; c: string; hl?: string; hlOn?: number }> = ({ x, y, s, c, hl, hlOn = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <polygon points="-90,-40 -70,-150 -20,-80" fill={hl && hlOn > 0 ? hl : c} stroke={K} strokeWidth={SW} strokeLinejoin="round" />
    <polygon points="90,-40 70,-150 20,-80" fill={hl && hlOn > 0 ? hl : c} stroke={K} strokeWidth={SW} strokeLinejoin="round" />
    <ellipse cx={0} cy={0} rx={115} ry={100} fill={c} stroke={K} strokeWidth={SW} />
    <circle cx={-40} cy={-15} r={14} fill={K} /><circle cx={40} cy={-15} r={14} fill={K} />
    <polygon points="-12,15 12,15 0,30" fill="#FF3D8B" stroke={K} strokeWidth={5} />
    {[-1, 1].map((d) => [0, 22].map((o) => (
      <line key={`${d}${o}`} x1={d * 30} y1={30 + o / 2} x2={d * (150 + hlOn * 20)} y2={15 + o} stroke={hl && hlOn > 0 ? hl : K}
        strokeWidth={hl && hlOn > 0 ? 12 : 7} strokeLinecap="round" />
    )))}
  </g>
);

const Dog: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={-105} cy={-10} rx={35} ry={75} fill="#8B5A2B" stroke={K} strokeWidth={SW} />
    <ellipse cx={105} cy={-10} rx={35} ry={75} fill="#8B5A2B" stroke={K} strokeWidth={SW} />
    <circle cx={0} cy={0} r={105} fill={c} stroke={K} strokeWidth={SW} />
    <circle cx={-38} cy={-20} r={14} fill={K} /><circle cx={38} cy={-20} r={14} fill={K} />
    <ellipse cx={0} cy={25} rx={28} ry={20} fill={K} />
    <path d="M -25 55 Q 0 80 25 55" stroke={K} strokeWidth={7} fill="none" strokeLinecap="round" />
  </g>
);

const Frame: React.FC<{ x: number; y: number; w: number; h: number; bg: string; children?: React.ReactNode; rot?: number }> = ({ x, y, w, h, bg, children, rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={24} fill="#fff" stroke={K} strokeWidth={SW} />
    <rect x={-w / 2 + 22} y={-h / 2 + 22} width={w - 44} height={h - 44} rx={12} fill={bg} stroke={K} strokeWidth={6} />
    {children}
  </g>
);

const Check: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <circle r={60} fill={c} stroke={K} strokeWidth={SW} />
    <path d="M -28 2 L -6 26 L 30 -22" stroke={K} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
const Cross: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <circle r={60} fill={c} stroke={K} strokeWidth={SW} />
    <path d="M -24 -24 L 24 24 M 24 -24 L -24 24" stroke={K} strokeWidth={14} strokeLinecap="round" />
  </g>
);

const Label: React.FC<{ x: number; y: number; text: string; size: number; fill: string; s?: number; sc?: string; sw?: number }> = ({ x, y, text, size, fill, s = 1, sc = K, sw }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONTF} fontSize={size} fill={fill} stroke={sc} strokeWidth={sw ?? size / 12}
    paintOrder="stroke" transform={`translate(${x},${y}) scale(${s}) translate(${-x},${-y})`}>{text}</text>
);

const Screen: React.FC<{ x: number; y: number; s: number; c: string; face?: boolean; children?: React.ReactNode }> = ({ x, y, s, c, face = true, children }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-220} y={-160} width={440} height={300} rx={30} fill={c} stroke={K} strokeWidth={SW} />
    <rect x={-40} y={140} width={80} height={50} fill="#888" stroke={K} strokeWidth={SW} />
    <rect x={-130} y={185} width={260} height={30} rx={12} fill="#888" stroke={K} strokeWidth={SW} />
    {face && <>
      <circle cx={-70} cy={-30} r={22} fill={K} /><circle cx={70} cy={-30} r={22} fill={K} />
      <path d="M -70 40 Q 0 100 70 40" stroke={K} strokeWidth={12} fill="none" strokeLinecap="round" />
    </>}
    {children}
  </g>
);

const Person: React.FC<{ x: number; y: number; s: number; skin: string; shirt: string }> = ({ x, y, s, skin, shirt }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-90} y={60} width={180} height={260} rx={70} fill={shirt} stroke={K} strokeWidth={SW} />
    <circle cx={0} cy={-20} r={90} fill={skin} stroke={K} strokeWidth={SW} />
    <circle cx={-30} cy={-30} r={11} fill={K} /><circle cx={30} cy={-30} r={11} fill={K} />
    <path d="M -30 15 Q 0 40 30 15" stroke={K} strokeWidth={8} fill="none" strokeLinecap="round" />
  </g>
);

const Star: React.FC<{ x: number; y: number; r: number; c: string; rot: number }> = ({ x, y, r, c, rot }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(" ");
  return <polygon points={pts} transform={`translate(${x},${y}) rotate(${rot})`} fill={c} stroke={K} strokeWidth={8} strokeLinejoin="round" />;
};

const Overlay: React.FC<{ text: string; pos: string; variant?: string }> = ({ text, pos, variant }) => {
  const lf = useCurrentFrame();
  const { fps } = useVideoConfig();
  // pop: escala 0 -> 110% -> 100% em ~0,3 s
  // v6: sem quadro minúsculo no corte — começa em 85% já no frame 0
  const sc = interpolate(lf, [0, 0.12 * fps, 0.22 * fps], [0.85, 1.08, 1], { extrapolateRight: "clamp" });
  const y = variant === "bubble" ? 585 : pos === "center" ? 860 : pos === "bottom" ? 1350 : 230;
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y, textAlign: "center", fontFamily: FONTF,
      fontSize: 120, lineHeight: 1.05, whiteSpace: "pre-line", ...(variant === "bubble"
        ? { color: "#2B0A5C", textShadow: "8px 8px 0 #FFD400" }
        : { color: "#FFD400", WebkitTextStroke: "12px #000", paintOrder: "stroke fill",
            textShadow: Array.from({ length: 8 }, (_, i) => `${(i + 1) * 2}px ${(i + 1) * 2}px 0 ${i === 7 ? "#000" : "#E6A800"}`).join(", ") }),
      transform: `scale(${sc})` }}>{text}</div>
  );
};

const Scene: React.FC<KidsProps> = ({ scene, colors: C, words = [], from = 0, total, alt = 0, reply = false, durationSeconds, replyDy = 0, phase }) => {
  const { f, n, pop, lin } = useP(from, total);
  const zoom = (alt % 2 ? 1.12 : 1) + 0.04 * (f / Math.max(1, n));
  const bgByScene: Record<string, string> = {
    question: C.ciano, learned: C.amarelo, ia: C.rosa, examples: C.ciano, many: C.rosa, dados: C.ciano, treino: C.amarelo, bar: C.ciano, features: C.rosa, counter: C.ciano, words: C.amarelo, chat: C.ciano, listen: C.amarelo, books: C.rosa, dados_txt: C.ciano, treino_txt: C.ciano, wrongsure: C.ciano, completar: C.rosa, notlike: C.ciano, adult: C.amarelo, tutorial: C.rosa,
  };
  const cyc = [C.ciano, C.amarelo, C.rosa];
  const base = bgByScene[scene] ?? C.ciano;
  const bg = alt ? cyc[(cyc.indexOf(base) + alt) % 3] : base;
  let body: React.ReactNode = null;
  const lf4 = f - Math.round(from * 30);
  const v4 = renderV4(scene, { lf: lf4, ln: Math.round(durationSeconds * 30), fps: 30, C, FONTF, words, phase, alt });
  const isV4 = v4 !== null;
  const wob = (k: number) => Math.sin((f + k * 7) / 6) * 6;

  if (scene === "question") {
    body = <>
      <Frame x={540} y={760} w={640} h={640} bg={C.amarelo} rot={-4 + pop(0) * 4}>
        <Cat x={0} y={40} s={1.7 * pop(3)} c="#F5A623" />
      </Frame>
      <Label x={880} y={500} text="?" size={300} fill={C.rosa} s={pop(12)} />
      <Label x={190} y={1220} text="?" size={200} fill="#fff" s={pop(18)} />
    </>;
  } else if (scene === "learned") {
    body = <>
      <Screen x={540} y={820} s={1.6 * pop(0)} c={C.ciano} />
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} x={160 + i * 190} y={350 + (i % 2) * 120} r={55 * pop(6 + i * 4)} c="#fff" rot={f * 3} />)}
    </>;
  } else if (scene === "examples" || scene === "many") {
    const count = scene === "examples" ? 9 : 30;
    const cols = scene === "examples" ? 3 : 5;
    const size = scene === "examples" ? 280 : 180;
    body = <>{Array.from({ length: count }, (_, i) => {
      const r = Math.floor(i / cols); const c = i % cols;
      const x = 540 + (c - (cols - 1) / 2) * (size + 20);
      const y = 300 + r * (size + 20) + size / 2;
      const p = pop(i * (scene === "examples" ? 4 : 1.5));
      const kind = i % 3;
      return <g key={i} transform={`translate(${x},${y}) scale(${p})`}>
        <Frame x={0} y={0} w={size} h={size} bg={[C.amarelo, C.ciano, "#fff"][kind]}>
          {kind === 1 ? <Dog x={0} y={10} s={size / 400} c="#F5D6A0" /> : <Cat x={0} y={15} s={size / 420} c={kind ? "#F5A623" : "#999"} />}
        </Frame>
      </g>;
    })}</>;
  } else if (scene === "dados") {
    body = <>
      {[0, 1, 2, 3, 4].map((i) => <Frame key={i} x={540 + (i - 2) * 30} y={820 - i * 40 * pop(i * 3)} w={460} h={460} bg={[C.ciano, C.rosa, C.amarelo, C.ciano, "#fff"][i]} rot={(i - 2) * 6}>
        {i === 4 && <Cat x={0} y={20} s={0.9} c="#F5A623" />}
      </Frame>)}
      <Label x={540} y={1320} text="DADOS" size={170} fill={C.amarelo} s={pop(16)} />
    </>;
  } else if (scene === "treino") {
    body = <>
      <Screen x={540} y={1000} s={1.3} c={C.ciano} />
      {[0, 1, 2, 3].map((i) => {
        const t = ((f / n) * 2 + i * 0.25) % 1;
        return <Frame key={i} x={540 + Math.sin(i * 2) * 300 * (1 - t)} y={250 + t * 650} w={200 * (1 - t * 0.6)} h={200 * (1 - t * 0.6)} bg={[C.amarelo, C.rosa][i % 2]}>
          <Cat x={0} y={10} s={0.4 * (1 - t * 0.6)} c="#F5A623" />
        </Frame>;
      })}
      <Label x={540} y={1450} text="TREINO" size={150} fill={C.rosa} s={pop(10)} />
    </>;
  } else if (scene === "features") {
    const on = lin(0.25 * n, 0.45 * n);
    body = <>
      <Cat x={540} y={900} s={3.2} c="#F5A623" hl={C.amarelo} hlOn={on} />
      <circle cx={540 - 230 * 1} cy={900 - 360} r={140 * pop(0.3 * n)} fill="none" stroke={C.amarelo} strokeWidth={14} strokeDasharray="30 18" />
      <circle cx={540 + 230} cy={900 - 360} r={140 * pop(0.3 * n)} fill="none" stroke={C.amarelo} strokeWidth={14} strokeDasharray="30 18" />
    </>;
  } else if (scene === "counter") {
    const end = 14197122;
    const t = lin(0, 0.6 * n);
    const val = Math.round(end * t);
    const done = f > 0.65 * n;
    body = <>
      {Array.from({ length: 24 }, (_, i) => (
        <Frame key={i} x={(i % 6) * 190 + 65} y={Math.floor(i / 6) * 190 + 300 + ((f * 4 + i * 30) % 60)} w={150} h={150} bg={[C.amarelo, "#fff", C.rosa][i % 3]} rot={(i % 5) * 4 - 8} />
      ))}
      <rect x={60} y={1060} width={960} height={240} rx={40} fill={C.roxo} stroke={K} strokeWidth={SW} />
      {!done ? <Label x={540} y={1185} text={val.toLocaleString("pt-BR")} size={140} fill={C.amarelo} />
        : <Label x={540} y={1185} text="+14 MILHÕES" size={130} fill={C.amarelo} s={pop(0.65 * n)} />}
    </>;
  } else if (scene === "ia") {
    body = <>
      <Screen x={540} y={820} s={1.5} c={C.ciano} face={false}>
        <Label x={0} y={40} text="IA" size={220} fill={C.amarelo} s={pop(4)} />
      </Screen>
      {[0, 1, 2, 3].map((i) => <Star key={i} x={150 + i * 260} y={1300} r={50 * pop(10 + i * 3)} c={C.amarelo} rot={-f * 3} />)}
    </>;
  } else if (scene === "bar") {
    const steps = [0.1, 0.05, 0.3, 0.2, 0.5, 0.45, 0.75, 0.95];
    const k = Math.min(steps.length - 1, Math.floor((f / n) * steps.length));
    const v = steps[k];
    const wrong = k % 2 === 1;
    body = <>
      <rect x={340} y={420} width={400} height={900} rx={30} fill="#fff" stroke={K} strokeWidth={SW} />
      <rect x={360} y={420 + 880 * (1 - v) + 20 - 20} width={360} height={880 * v} rx={20} fill={wrong ? C.rosa : C.amarelo} stroke={K} strokeWidth={6} />
      <Label x={540} y={1400} text="ACERTOS" size={110} fill="#fff" />
      {wrong ? <Cross x={880} y={600} s={1.4} c={C.rosa} /> : <Check x={880} y={600} s={1.4} c={C.ciano} />}
    </>;
  } else if (scene === "words") {
    const ws = words;
    const k = Math.floor(lin(0.05 * n, 0.75 * n) * (ws.length - 1));
    body = <g transform="translate(0,140)">
      <path d="M 120 400 H 960 Q 1000 400 1000 440 V 960 Q 1000 1000 960 1000 H 400 L 260 1140 L 300 1000 H 120 Q 80 1000 80 960 V 440 Q 80 400 120 400 Z" fill="#fff" stroke={K} strokeWidth={SW} />
      {ws.map((w, i) => {
        const last = i === ws.length - 1;
        const show = i <= k || (last && k >= ws.length - 2);
        return show ? <Label key={i} x={540} y={510 + i * (440 / Math.max(1, ws.length - 1))} text={w} size={last ? 112 : Math.max(96, Math.min(110, Math.floor(1400 / Math.max(...ws.map((x) => x.length)))))}
          fill={C.roxo} sc={last ? C.amarelo : "#fff"} sw={last ? 14 : 12}
          s={pop(0.05 * n + i * ((0.7 * n) / ws.length)) * (last ? 1 + 0.1 * (Math.floor(f / 8) % 2) : 1)} /> : null;
      })}
      <Screen x={760} y={1200} s={0.6} c={C.ciano} />
    </g>;
  } else if (scene === "chat") {
    // v3.1: linhas com palavras inteiras (máx. 2 palavras/linha, 4 no balão)
    const ws = words.length ? words : ["OLÁ!", "EU SEI", "AJUDAR"];
    const shown = reply ? Math.min(ws.length, Math.floor(lin(0.1 * n, 0.8 * n) * ws.length + 1)) : 0;
    body = <g transform="translate(0,130)">
      <Screen x={200} y={1070} s={0.42 * pop(0)} c={C.amarelo} />
      <g transform={`translate(0,${(1 - pop(4)) * 200})`} opacity={pop(4)}>
        <path d="M 80 480 H 520 Q 560 480 560 520 V 640 Q 560 680 520 680 H 200 L 130 750 L 150 680 H 80 Q 40 680 40 640 V 520 Q 40 480 80 480 Z" fill={C.rosa} stroke={K} strokeWidth={SW} />
        <Label x={300} y={630} text="?" size={140} fill="#fff" sc={C.roxo} sw={10} s={pop(8)} />
      </g>
      <g opacity={pop(10)} transform={`translate(0,${replyDy})`}>
        <path d="M 440 740 H 1000 Q 1040 740 1040 780 V 1150 Q 1040 1190 1000 1190 H 900 L 940 1270 L 800 1190 H 440 Q 400 1190 400 1150 V 780 Q 400 740 440 740 Z" fill="#fff" stroke={K} strokeWidth={SW} />
        {reply ? ws.slice(0, shown).map((w, i) => {
          const last = i === shown - 1;
          const y = 860 + i * 125;
          return <g key={i}>
            {last && <rect x={450} y={y - 92} width={540} height={118} rx={20} fill={C.amarelo} />}
            <Label x={720} y={y} text={w} size={100} fill={last ? K : C.roxo} sc="#fff" sw={10} s={pop(0.1 * n + i * ((0.7 * n) / ws.length))} />
          </g>;
        }) : [0, 1, 2].map((i) => <circle key={i} cx={620 + i * 100} cy={960 - Math.max(0, Math.sin((f - i * 5) / 4)) * 25} r={28} fill={C.roxo} />)}
      </g>
    </g>;
  } else if (scene === "listen") {
    const cols = [C.rosa, C.ciano, "#fff", C.rosa, C.ciano, "#fff"];
    const pos = [[180, 520], [540, 420], [900, 520], [150, 1000], [930, 1000], [540, 1350]];
    body = <>
      {pos.map(([x, y], i) => <g key={i} transform={`translate(${x},${y + wob(i)}) scale(${pop(4 + i * 5)})`}>
        <ellipse rx={130} ry={85} fill={cols[i]} stroke={K} strokeWidth={SW} />
        <polygon points={`${x < 540 ? 40 : -40},70 ${x < 540 ? 90 : -90},130 ${x < 540 ? 90 : -90},60`} fill={cols[i]} stroke={K} strokeWidth={8} strokeLinejoin="round" />
      </g>)}
      <Person x={540} y={760} s={1.2 * pop(0)} skin="#E0AC69" shirt={C.ciano} />
      {[-1, 1].map((d) => <path key={d} d={`M ${540 + d * 120} 700 q ${d * 40} 40 0 80`} stroke={K} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.5 + 0.5 * Math.sin(f / 4)} />)}
    </>;
  } else if (scene === "books") {
    // v3.1: no máximo 3 palavras, >= 96 px, brancas com contorno roxo 8+ px, paradas depois de formadas
    const { fps: FPSL, durationInFrames: ln } = { fps: 30, durationInFrames: Math.round(durationSeconds * 30) };
    const lf = f - Math.round(from * FPSL);
    const trio = (words.length ? words : alt % 2 ? ["MAR", "AMIGO", "AZUL"] : ["LIVRO", "SOL", "CASA"]).slice(0, 3);
    const lt = (a0: number, b0: number) => interpolate(lf, [a0, b0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    body = <>
      {[0, 1, 2, 3].map((i) => <rect key={i} x={300 + (i % 2) * 30} y={1290 - i * 90} width={480} height={80} rx={12} fill={[C.amarelo, C.ciano, "#fff", C.roxo][i]} stroke={K} strokeWidth={SW} transform={`translate(0,${(1 - pop(i * 3)) * -400})`} />)}
      {trio.map((w, i) => {
        const d = i * 0.17 * ln;
        const t = lt(d, d + 0.22 * ln);
        const x = [270, 810, 540][i];
        const yEnd = [620, 620, 860][i];
        const y = interpolate(t, [0, 1], [380, yEnd]);
        const asWord = t >= 1;
        return <g key={i} opacity={lf >= d ? 1 : 0}>
          {asWord ? <Label x={x} y={yEnd} text={w} size={100} fill="#fff" sc={C.roxo} sw={14} s={1 + 0.1 * (1 - lt(d + 0.22 * ln, d + 0.3 * ln))} /> : (
            <g transform={`translate(${x},${y - 40}) rotate(${(1 - t) * (i % 2 ? 20 : -20)})`}>
              {i % 2 ? <g><rect x={-80} y={-100} width={160} height={200} fill="#fff" stroke={K} strokeWidth={8} />{[0, 1, 2, 3].map((l) => <line key={l} x1={-55} x2={55} y1={-60 + l * 40} y2={-60 + l * 40} stroke="#999" strokeWidth={8} />)}</g>
                : <g><rect x={-110} y={-80} width={220} height={160} rx={14} fill={C.ciano} stroke={K} strokeWidth={8} /><rect x={-110} y={-80} width={220} height={36} rx={10} fill={C.amarelo} stroke={K} strokeWidth={8} /></g>}
            </g>
          )}
        </g>;
      })}
    </>;
  } else if (scene === "dados_txt") {
    body = <>
      {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${540 + (i - 2) * 40},${520 - i * 25 * pop(i * 3)}) rotate(${(i - 2) * 5})`}>
        <rect x={-210} y={-260} width={420} height={520} rx={16} fill="#fff" stroke={K} strokeWidth={SW} />
        {i === 4 && [0, 1, 2, 3, 4, 5, 6].map((l) => <line key={l} x1={-160} x2={l % 3 === 2 ? 60 : 160} y1={-190 + l * 65} y2={-190 + l * 65} stroke={[C.ciano, C.rosa, C.amarelo][l % 3]} strokeWidth={22} strokeLinecap="round" opacity={lin(l * 3, l * 3 + 8)} />)}
      </g>)}
      {[0, 1, 2].map((i) => <rect key={i} x={180 + i * 260} y={1100} width={200} height={260} rx={14} fill="#fff" stroke={K} strokeWidth={8} transform={`translate(0,${(1 - pop(10 + i * 4)) * 300})`} />)}
    </>;
  } else if (scene === "treino_txt") {
    // v3.1: CÉU / AZUL / LUA, 110 px fixos, uma a cada ~0,8 s, colunas separadas (sem sobreposição)
    const fw = (words.length ? words : ["CÉU", "AZUL", "LUA"]).slice(0, 3);
    body = <>
      <Screen x={540} y={1230} s={0.95} c={C.amarelo} />
      {fw.map((w, i) => {
        const d = i * 0.8 * 30;
        const t = interpolate(f, [d, d + 1.3 * 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = [250, 830, 540][i];
        const y = 330 + t * ([560, 560, 420][i]);
        return <g key={i} opacity={f >= d ? 1 : 0}><Label x={x} y={y} text={w} size={110} fill="#fff" sc={C.roxo} sw={14} /></g>;
      })}
    </>;
  } else if (scene === "wrongsure") {
    const blink = Math.floor(f / 7) % 2 ? 1.1 : 1; // v3.1: piscar por escala, sem transparência
    body = <>
      <g transform={`translate(330,1170) rotate(${Math.sin(f / 8) * 3})`}>
        <Screen x={0} y={0} s={0.85 * pop(0)} c={C.amarelo} face={false}>
          <path d="M -110 -70 L -30 -55 M 110 -70 L 30 -55" stroke={K} strokeWidth={12} strokeLinecap="round" />
          <circle cx={-70} cy={-20} r={20} fill={K} /><circle cx={70} cy={-20} r={20} fill={K} />
          <path d="M -80 40 Q 0 110 80 40 Z" fill="#fff" stroke={K} strokeWidth={10} />
        </Screen>
      </g>
      <g opacity={pop(6)}>
        <path d="M 120 540 H 960 Q 1000 540 1000 580 V 840 Q 1000 880 960 880 H 460 L 360 980 L 380 880 H 120 Q 80 880 80 840 V 580 Q 80 540 120 540 Z" fill="#fff" stroke={K} strokeWidth={SW} />
        <Label x={540} y={680} text="O CÉU É" size={100} fill={C.roxo} />
        <Label x={540} y={810} text="VERDE" size={110} fill={C.roxo} sc={C.amarelo} sw={14} s={pop(14) * blink} />
      </g>
      <Label x={860} y={1330} text="!" size={420} fill={C.rosa} s={pop(16) * (1 + Math.sin(f / 4) * 0.06)} />
    </>;
  } else if (scene === "completar") {
    body = <>
      <rect x={70} y={720} width={940} height={300} rx={60} fill="#fff" stroke={K} strokeWidth={SW} opacity={pop(2)} />
      <polygon points="300,1010 260,1110 400,1010" fill="#fff" stroke={K} strokeWidth={SW} strokeLinejoin="round" opacity={pop(2)} />
      <Person x={250} y={1170} s={0.85 * pop(0)} skin="#C68642" shirt={C.ciano} />
      <Person x={800} y={1260} s={0.6 * pop(4)} skin="#F1C27D" shirt={C.amarelo} />
      <Label x={940} y={1250 - Math.abs(Math.sin(f / 6)) * 90} text="?" size={180} fill={C.amarelo} s={pop(10)} />
      {[0, 1, 2].map((i) => <Star key={i} x={200 + i * 340} y={480 + (i % 2) * 80} r={55 * pop(8 + i * 4)} c={[C.amarelo, C.ciano, "#fff"][i]} rot={f * 3} />)}
    </>;
  } else if (scene === "notlike") {
    body = <>
      <Person x={270} y={800} s={1.3 * pop(0)} skin="#E0AC69" shirt={C.rosa} />
      <Screen x={810} y={850} s={0.9 * pop(6)} c={C.ciano} />
      <Label x={540} y={900} text="≠" size={220} fill="#fff" s={pop(12)} />
      <path d="M 200 470 q 70 -90 140 0" stroke={C.amarelo} strokeWidth={14} fill="none" opacity={pop(18)} />
      <Label x={810} y={520} text="?" size={200} fill={C.amarelo} s={pop(18)} />
    </>;
  } else if (scene === "adult") {
    body = <>
      <Person x={330} y={760} s={1.6 * pop(0)} skin="#C68642" shirt={C.ciano} />
      <Person x={760} y={960} s={1.05 * pop(5)} skin="#F1C27D" shirt={C.rosa} />
      <circle cx={830} cy={430} r={120 * pop(10)} fill="#fff" stroke={K} strokeWidth={SW} />
      <Label x={830} y={490} text="?" size={170} fill={C.roxo} s={pop(12)} />
    </>;
  } else if (scene === "tutorial") {
    body = <>
      {[0, 1, 2, 3, 4, 5].map((i) => <Star key={i} x={540 + Math.cos(i) * 380} y={800 + Math.sin(i * 1.3) * 420} r={70 * pop(i * 2)} c={i % 2 ? C.amarelo : "#fff"} rot={f * 4} />)}
      <Label x={540} y={950} text="?" size={520} fill={C.amarelo} s={pop(0) * (1 + Math.sin(f / 5) * 0.05)} />
    </>;
  }

  return (
    <AbsoluteFill style={isV4 ? (() => {
      const c = phase === "b" ? (scene === "bar4" ? C.rosa : C.amarelo) : v4Bg[scene];
      const g = GR[c];
      return { background: `radial-gradient(ellipse at 50% 45%, rgba(43,10,92,0) 60%, rgba(43,10,92,0.35) 100%), radial-gradient(ellipse 120% 90% at 50% 40%, ${g.topo} 0%, ${g.base} 55%, ${g.fundo} 100%)` };
    })() : { backgroundColor: bg }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ transform: `scale(${isV4 ? 1 + 0.02 * (f / Math.max(1, n)) : zoom})` }}>
        {isV4 && <DepthDefs />}
        {isV4 ? <LetterBg lf={lf4} fps={30} F={FONTF} speed={scene === "wrong4" && phase === "b" ? 24 : 12} /> : Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i * 211) % 1080} cy={(i * 367) % 1920} r={26} fill="#fff" opacity={0.25} />)}
        {isV4 ? (() => {
          // drift de câmera: 14/10 px, período 6 s, rotação máx. 0,6°; frente recebe sombra dura 12/14 #2B0A5C 0.9
          const tt = (f / 30) * (Math.PI * 2 / 6);
          return <g transform={`translate(${Math.sin(tt) * 14},${Math.cos(tt) * 10}) rotate(${Math.sin(tt * 0.7) * 0.6} 540 900)`} filter="url(#hard)">{v4}</g>;
        })() : body}
      </svg>
    </AbsoluteFill>
  );
};

export const KidsScene: React.FC<KidsProps> = (props) => {
  const [handle] = useState(() => delayRender("font"));
  useEffect(() => {
    loadFont({ family: "BeVietnamProBlack", url: staticFile("BeVietnamPro-Black.ttf"), weight: "900" }).catch(() => undefined).then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill>
      <Scene {...props} />
      {props.overlay ? <Overlay text={props.overlay} pos={props.overlayPos ?? "top"} variant={props.overlayVariant} /> : null}
    </AbsoluteFill>
  );
};
