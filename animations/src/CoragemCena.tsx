import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const INK = "#14243A";
const YELLOW = "#FFD400";
const ORANGE = "#FF9F1C";
const SKY = "#4FC3F7";
const CREAM = "#FFF7DF";
const STROKE = 15;

type ChildId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";
type OverlayProps = {
  text: string;
  text_pos: "top" | "center" | "bottom";
  triggerPhrase: number;
  startOffsetSeconds: number;
  recommendedDurationSeconds: number;
};

export type CourageSceneProps = {
  durationSeconds: number;
  beat: number;
  child: ChildId;
  sceneDescription: string;
  ensemble?: ChildId[];
  /** Forward-compatible with shotlist props. Timeline draws approved overlays separately. */
  overlay?: OverlayProps | null;
};

type PersonLook = {
  skin: string;
  hair: string;
  hairStyle: "afro" | "ponytail" | "braids" | "swoop" | "curls" | "twists" | "buns" | "longTwists";
  clothes: string;
  accent: string;
  glasses?: boolean;
  wheelchair?: boolean;
};

const CHILDREN: Record<ChildId, PersonLook> = {
  C1: { skin: "#6B3828", hair: "#18243A", hairStyle: "afro", clothes: SKY, accent: YELLOW },
  C2: { skin: "#F2CDAA", hair: "#70452F", hairStyle: "ponytail", clothes: YELLOW, accent: ORANGE },
  C3: { skin: "#A96C4A", hair: "#20243A", hairStyle: "braids", clothes: ORANGE, accent: YELLOW },
  C4: { skin: "#C29B70", hair: "#20243A", hairStyle: "swoop", clothes: "#64C6A5", accent: SKY, wheelchair: true },
  C5: { skin: "#F3D2B7", hair: "#B8492F", hairStyle: "curls", clothes: "#55C7BB", accent: YELLOW },
  C6: { skin: "#8B5136", hair: "#171F35", hairStyle: "twists", clothes: "#A98BE8", accent: YELLOW, glasses: true },
  C7: { skin: "#D49B70", hair: "#302238", hairStyle: "buns", clothes: "#438BD0", accent: ORANGE },
  C8: { skin: "#542F28", hair: "#19223A", hairStyle: "longTwists", clothes: "#F2B83A", accent: SKY },
};

const ADULTS: PersonLook[] = [
  { skin: "#BC8766", hair: "#32364C", hairStyle: "swoop", clothes: "#518B9F", accent: YELLOW },
  { skin: "#6D4435", hair: "#20243A", hairStyle: "curls", clothes: "#7568A7", accent: SKY },
  { skin: "#E7BB93", hair: "#754A37", hairStyle: "ponytail", clothes: "#D77D52", accent: YELLOW },
  { skin: "#A9785A", hair: "#29243A", hairStyle: "twists", clothes: "#568D6E", accent: ORANGE },
];

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const Hair: React.FC<{ style: PersonLook["hairStyle"]; fill: string }> = ({ style, fill }) => {
  const common = { fill, stroke: INK, strokeWidth: 13, strokeLinejoin: "round" as const };
  switch (style) {
    case "afro":
      return <g {...common}><path d="M-98-430 Q-126-492-80-520 Q-68-574-20-548 Q10-591 48-548 Q102-568 106-514 Q147-483 104-428Z" />{[-70, -32, 8, 48, 78].map((x) => <circle key={x} cx={x} cy={-520 + (x % 3) * 5} r="19" fill={fill} stroke={INK} strokeWidth="9" />)}</g>;
    case "ponytail":
      return <g {...common}><path d="M-99-429 Q-115-512-50-537 Q30-563 91-510 Q117-468 96-420 L68-444 Q46-493-18-486 Q-64-478-78-426Z" /><circle cx="95" cy="-495" r="31" /><path d="M91-468 Q131-430 112-374 Q102-351 85-376 Q90-420 72-449Z" /></g>;
    case "braids":
      return <g {...common}><path d="M-100-431 Q-112-516-46-540 Q37-559 94-502 L90-425 Q50-467 12-470 Q-47-475-77-426Z" />{[-67, -34, 0, 34, 66].map((x) => <g key={x} stroke={INK} strokeWidth="12" fill="none"><path d={`M${x}-475 Q${x - 8}-420 ${x + 1}-350`} /><path d={`M${x - 8}-420 l16 16 M${x - 8}-386 l16 15`} /></g>)}</g>;
    case "swoop":
      return <path {...common} d="M-100-423 Q-114-510-45-541 Q42-567 96-502 Q108-465 78-431 Q33-468-13-459 Q-57-451-77-412Z" />;
    case "curls":
      return <g {...common}><path d="M-100-428 Q-120-507-55-536 Q27-567 91-509 L92-427 Q49-469 4-465 Q-48-461-77-417Z" />{[-73, -43, -12, 21, 53, 78].map((x, i) => <circle key={x} cx={x} cy={-513 + (i % 2) * 8} r="22" fill={fill} stroke={INK} strokeWidth="9" />)}</g>;
    case "twists":
      return <g {...common}><path d="M-96-425 Q-107-510-43-538 Q35-559 93-503 L80-424 Q44-467 4-465 Q-48-462-76-417Z" />{[-67, -35, -3, 29, 61].map((x) => <g key={x}><path d={`M${x}-500 Q${x - 10}-464 ${x + 4}-431`} stroke={fill} strokeWidth="17" fill="none" /><circle cx={x + 4} cy="-431" r="9" fill={fill} stroke={INK} strokeWidth="6" /></g>)}</g>;
    case "buns":
      return <g {...common}><path d="M-98-425 Q-112-514-45-539 Q35-558 94-500 L87-426 Q44-466 5-464 Q-48-459-77-414Z" /><circle cx="-78" cy="-507" r="31" /><circle cx="77" cy="-507" r="31" /></g>;
    case "longTwists":
      return <g {...common}><path d="M-99-427 Q-110-513-45-539 Q34-561 94-501 L88-426 Q45-469 4-465 Q-45-461-77-417Z" />{[-77, -45, -13, 20, 52, 80].map((x) => <path key={x} d={`M${x}-493 Q${x - 9}-421 ${x + 4}-332 Q${x + 12}-303 ${x + 22}-332 L${x + 5}-436`} stroke={fill} strokeWidth="15" strokeLinecap="round" fill="none" />)}</g>;
  }
};

const Person: React.FC<{
  look: PersonLook;
  x: number;
  y: number;
  scale?: number;
  frame: number;
  variant?: "child" | "adult";
  gesture?: "open" | "listen" | "point" | "rest";
}> = ({ look, x, y, scale = 1, frame, variant = "child", gesture = "open" }) => {
  const bob = Math.sin(frame / 18 + x / 100) * (variant === "child" ? 4 : 2);
  const armPath = gesture === "listen"
    ? { left: "M-65-265 Q-152-244-128-184", right: "M65-265 Q153-246 128-184" }
    : gesture === "point"
      ? { left: "M-65-265 Q-153-237-128-190", right: "M65-265 Q142-302 163-337" }
      : gesture === "rest"
        ? { left: "M-65-265 Q-127-218-112-133", right: "M65-265 Q127-218 112-133" }
        : { left: "M-65-265 Q-147-230-145-164", right: "M65-265 Q147-230 145-164" };
  const wheel = look.wheelchair;
  const scaleValue = scale * (variant === "adult" ? 1.08 : 1);
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${scaleValue})`} stroke={INK} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {wheel && <g fill="none"><circle cx="0" cy="-100" r="119" strokeWidth="18" /><circle cx="0" cy="-100" r="22" fill={SKY} /><path d="M0-100 L70-58 L112-58 M70-58 L53-12 L-22-12 M70-58 L82-118" strokeWidth="16" /><path d="M-68-287 L18-287 L72-154 L-5-154" fill="#D9F1F6" strokeWidth="15" /></g>}
      {!wheel && <g fill={look.clothes}><path d="M-48-105 L-43-30 Q0-11 43-30 L48-105Z" /><path d="M-37-93 L-64-30 L-13-22 L0-67 L14-22 L64-30 L37-93Z" strokeWidth="11" /></g>}
      <path d={`M-65-267 Q-112-245 ${armPath.left.slice(armPath.left.indexOf("Q"))}`} fill="none" stroke={look.skin} strokeWidth="36" />
      <path d={`M65-267 Q112-245 ${armPath.right.slice(armPath.right.indexOf("Q"))}`} fill="none" stroke={look.skin} strokeWidth="36" />
      <path d={armPath.left} fill="none" stroke={look.clothes} strokeWidth="46" />
      <path d={armPath.right} fill="none" stroke={look.clothes} strokeWidth="46" />
      <circle cx={gesture === "point" ? 163 : -145} cy={gesture === "point" ? -337 : -164} r="19" fill={look.skin} strokeWidth="10" />
      {gesture !== "point" && <circle cx="145" cy="-164" r="19" fill={look.skin} strokeWidth="10" />}
      <path d="M-72-292 Q0-328 72-292 L91-113 Q0-79-91-113Z" fill={look.clothes} />
      <path d="M-38-115 L-40-21 M38-115 L40-21" fill="none" stroke={variant === "adult" ? "#30435B" : look.clothes} strokeWidth="44" />
      {!wheel && <g><path d="M-40-22 Q-77-5-74 10 L-18 10 L-11-3 M40-22 Q77-5 74 10 L18 10 L11-3" fill="#FFF8E9" strokeWidth="13" /></g>}
      <path d="M-27-313 L-22-282 M27-313 L22-282" fill="none" stroke={look.skin} strokeWidth="29" />
      <ellipse cx="0" cy="-416" rx="99" ry="119" fill={look.skin} />
      <Hair style={look.hairStyle} fill={look.hair} />
      <path d="M-48-420 Q-34-432-20-420 M20-420 Q34-432 48-420" fill="none" stroke={INK} strokeWidth="10" />
      <ellipse cx="-33" cy="-391" rx="9" ry="13" fill={INK} stroke="none" />
      <ellipse cx="33" cy="-391" rx="9" ry="13" fill={INK} stroke="none" />
      {look.glasses && <g fill="none" stroke={INK} strokeWidth="9"><circle cx="-34" cy="-393" r="24" /><circle cx="34" cy="-393" r="24" /><path d="M-10-393 H10" /></g>}
      <path d="M-22-351 Q0-333 24-351" fill="none" stroke={INK} strokeWidth="9" />
      <path d="M-70-322 Q0-292 70-322" fill="none" stroke={look.accent} strokeWidth="11" />
    </g>
  );
};

const Butterfly: React.FC<{ x: number; y: number; frame: number; phase: number }> = ({ x, y, frame, phase }) => {
  const lift = Math.sin(frame / 13 + phase) * 14;
  return <g transform={`translate(${x} ${y + lift}) scale(0.8)`} stroke={INK} strokeWidth="8" strokeLinejoin="round"><path d="M0 0 Q-43-55-59-24 Q-67 4-8 13 Q-47 42-22 56 Q-5 60 0 11 Q5 60 22 56 Q47 42 8 13 Q67 4 59-24 Q43-55 0 0Z" fill={phase % 2 ? YELLOW : ORANGE} /><path d="M0 0V30" strokeWidth="7" fill="none" /></g>;
};

const Adult = ({ beat, x, y, frame, gesture = "listen", scale = 0.92 }: { beat: number; x: number; y: number; frame: number; gesture?: "open" | "listen" | "point" | "rest"; scale?: number }) => <Person look={ADULTS[(beat - 1) % ADULTS.length]} x={x} y={y} scale={scale} frame={frame} variant="adult" gesture={gesture} />;

const Backdrop: React.FC<{ beat: number }> = ({ beat }) => {
  const tints = ["#FFF2D2", "#E9F7FC", "#FFF0DE", "#E6F7EF", "#FFF5DB", "#EDF1FF", "#E8F7F6", "#FFF3D4"];
  return <g>
    <rect width="1080" height="1920" fill={tints[(beat - 1) % tints.length]} />
    <circle cx="160" cy="560" r="250" fill={beat % 2 ? "#FFE39B" : "#BEEBFB"} opacity="0.34" />
    <circle cx="930" cy="680" r="300" fill={beat % 2 ? "#BEEBFB" : "#FFD09E"} opacity="0.3" />
    <path d="M0 1284 Q170 1250 340 1284 T680 1284 T1080 1272 V1480 H0Z" fill={beat === 4 || beat === 7 ? "#A9DFAE" : "#F7D998"} stroke="none" />
    <path d="M0 1330 Q170 1306 340 1330 T680 1330 T1080 1318" fill="none" stroke={INK} strokeWidth="8" opacity="0.5" />
    <circle cx="93" cy="464" r="9" fill={ORANGE} /><circle cx="986" cy="478" r="12" fill={YELLOW} />
    <path d="M67 730 Q98 706 129 730 M955 920 Q980 896 1005 920" fill="none" stroke={SKY} strokeWidth="13" strokeLinecap="round" />
  </g>;
};

const RoomWindow = () => <g stroke={INK} strokeWidth="14" strokeLinejoin="round"><rect x="95" y="400" width="300" height="275" rx="34" fill="#D7F3FC" /><path d="M245 400V675 M95 535H395" fill="none" /><circle cx="338" cy="458" r="34" fill={YELLOW} strokeWidth="8" /><path d="M120 620 Q168 550 214 617 Q258 538 300 620" fill="none" stroke="#69BD91" strokeWidth="17" /></g>;

const ButterflyScene = ({ frame }: { frame: number }) => <>
  <RoomWindow />
  <g stroke={INK} strokeWidth="15" strokeLinejoin="round"><rect x="667" y="520" width="235" height="178" rx="30" fill="#C4E9F7" /><path d="M704 520V449 H872V520" fill="#FFE49B" /><circle cx="787" cy="484" r="31" fill={YELLOW} /></g>
  <Butterfly x={490} y={1021} frame={frame} phase={0} /><Butterfly x={590} y={948} frame={frame} phase={1} /><Butterfly x={518} y={850} frame={frame} phase={2} />
  <Adult beat={1} x={825} y={1307} frame={frame} gesture="rest" scale={0.66} />
  <path d="M436 1092 Q470 1110 498 1094" fill="none" stroke={ORANGE} strokeWidth="11" strokeLinecap="round" />
</>;

const ChoiceScene = ({ frame }: { frame: number }) => {
  const drift = clamp(frame, 3, 24, 46, 0);
  return <>
    <RoomWindow />
    <g transform={`translate(0 ${drift})`} stroke={INK} strokeWidth="13" strokeLinejoin="round">
      <rect x="534" y="597" width="430" height="210" rx="38" fill="#FFFDF5" />
      <rect x="564" y="624" width="105" height="155" rx="25" fill="#D8F4FB" /><rect x="697" y="624" width="105" height="155" rx="25" fill="#FFF0B9" /><rect x="830" y="624" width="105" height="155" rx="25" fill="#E3F4DA" />
      <circle cx="616" cy="681" r="27" fill={SKY} /><path d="M584 741 Q616 697 648 741" fill="none" />
      <path d="M730 711 Q750 668 768 711 Q750 744 730 711Z" fill={ORANGE} /><circle cx="750" cy="665" r="20" fill={YELLOW} />
      <path d="M863 733 Q883 690 902 733 M882 699V656 M882 678 Q857 664 858 645 M882 678 Q905 660 910 642" fill="none" stroke="#4C9B68" strokeWidth="12" />
      <path d="M526 839 H972" stroke={ORANGE} strokeWidth="14" />
    </g>
    <Adult beat={2} x={827} y={1320} frame={frame} gesture="listen" scale={0.76} />
    <g transform={`translate(${Math.sin(frame / 15) * 6} 0)`}><path d="M414 1040 Q461 1004 511 1037" fill="none" stroke={YELLOW} strokeWidth="12" strokeLinecap="round" /></g>
  </>;
};

const ClassroomScene = ({ frame }: { frame: number }) => {
  const showClass = clamp(frame, 70, 105);
  return <>
    <RoomWindow />
    <g opacity={1 - showClass} stroke={INK} strokeWidth="14" strokeLinejoin="round"><rect x="650" y="755" width="285" height="158" rx="28" fill="#FFE59C" /><path d="M690 913V1033 M896 913V1033" strokeWidth="20" /><circle cx="792" cy="824" r="44" fill="#BFE8F4" /><path d="M735 889 Q792 844 850 889" fill="none" stroke="#568D6E" strokeWidth="21" /></g>
    <g opacity={1 - showClass}><Adult beat={3} x={833} y={1360} frame={frame} gesture="listen" scale={0.65} /></g>
    <g opacity={showClass} stroke={INK} strokeWidth="13" strokeLinejoin="round"><rect x="624" y="498" width="370" height="345" rx="22" fill="#C8EAF6" /><path d="M810 498V843 M624 663H994" fill="none" /><circle cx="704" cy="586" r="38" fill={YELLOW} /><path d="M662 631 Q704 594 746 631" fill={ORANGE} /><circle cx="903" cy="744" r="37" fill="#E8B995" /><path d="M864 791 Q903 755 943 791" fill="#7F6BB3" /><rect x="691" y="1049" width="267" height="46" rx="22" fill="#C68956" /><path d="M712 1094V1190 M934 1094V1190" strokeWidth="19" /></g>
    <g opacity={showClass}><Adult beat={3} x={912} y={1350} frame={frame} gesture="open" scale={0.62} /></g>
    <g transform={`translate(${showClass * -105} 0)`}><path d="M555 948 Q613 928 656 947" fill="none" stroke={YELLOW} strokeWidth="12" strokeLinecap="round" /></g>
  </>;
};

const PlayScene = ({ frame }: { frame: number }) => {
  const ballY = Math.sin(frame / 15) * 10;
  return <>
    <path d="M70 1152 Q190 1080 301 1152" fill="none" stroke="#62A875" strokeWidth="19" strokeLinecap="round" />
    <g stroke={INK} strokeWidth="15" strokeLinejoin="round"><path d="M665 830 V601 Q665 550 716 550 H892 Q936 550 936 602 V830" fill="#F7B76A" /><path d="M704 830V660Q704 626 742 626H863Q898 626 898 662V830" fill="#FDE7A9" /><path d="M665 830H936" /></g>
    <g transform={`translate(0 ${ballY})`} stroke={INK} strokeWidth="12"><circle cx="852" cy="1022" r="62" fill={SKY} /><path d="M852 960Q818 1023 852 1084 M790 1022H914" fill="none" /></g>
    <g stroke={INK} strokeWidth="13" strokeLinejoin="round"><circle cx="727" cy="1040" r="46" fill="#E8B995" /><path d="M672 1100 Q727 1061 782 1100 L794 1215 H658Z" fill="#EE9D70" /><path d="M686 1212L681 1283 M765 1212L770 1283" fill="none" strokeWidth="21" /></g>
    <path d="M624 941 Q572 916 540 937" fill="none" stroke="#4C9B68" strokeWidth="17" strokeLinecap="round" />
    <path d="M573 936 Q552 897 523 905 M554 929 Q530 969 500 960" fill="none" stroke="#4C9B68" strokeWidth="15" strokeLinecap="round" />
  </>;
};

const FoodScene = ({ frame }: { frame: number }) => {
  const sniff = Math.sin(frame / 16) * 5;
  return <>
    <g stroke={INK} strokeWidth="15" strokeLinejoin="round"><rect x="115" y="744" width="852" height="335" rx="46" fill="#F2D6B4" /><path d="M147 1080V1287 M934 1080V1287" strokeWidth="26" /><path d="M184 789H895" stroke="#D7A373" strokeWidth="9" /></g>
    <g transform={`translate(0 ${sniff})`} stroke={INK} strokeWidth="14" strokeLinejoin="round"><ellipse cx="562" cy="951" rx="129" ry="71" fill="#FFFDF5" /><path d="M473 953 Q532 883 604 934 Q643 964 668 940 Q649 1016 559 1019 Q497 1017 473 953Z" fill="#F5AF53" /><path d="M536 906 Q570 850 614 876 Q627 900 592 924" fill="#76B96B" /></g>
    <path d="M574 866 Q620 833 645 859 M583 833 Q603 807 624 820" fill="none" stroke={SKY} strokeWidth="10" strokeLinecap="round" />
    <Adult beat={5} x={791} y={1361} frame={frame} gesture="listen" scale={0.7} />
  </>;
};

const ListeningScene = ({ frame }: { frame: number }) => {
  const pulse = 1 + Math.sin(frame / 21) * 0.035;
  return <>
    <g stroke={INK} strokeWidth="14" strokeLinejoin="round"><rect x="117" y="558" width="846" height="586" rx="48" fill="#FFFCF2" /><path d="M145 1144V1297 M935 1144V1297" strokeWidth="25" /><rect x="154" y="601" width="172" height="150" rx="22" fill="#D7F3FC" /><circle cx="242" cy="670" r="42" fill={YELLOW} /></g>
    <g transform={`translate(542 653) scale(${pulse})`} stroke={INK} strokeWidth="12" strokeLinejoin="round"><path d="M0 0 C-108-87-185 30-83 107 L0 172 L82 107 C184 29 107-87 0 0Z" fill="#F49A77" /><path d="M-63 64 Q-23 92 14 63" fill="none" stroke="#FFF5DE" strokeWidth="11" /></g>
    <Adult beat={6} x={380} y={1361} frame={frame} gesture="listen" scale={0.7} />
    <g stroke={INK} strokeWidth="11" strokeLinejoin="round"><path d="M671 834 Q734 773 797 834 Q815 867 797 893 Q776 920 735 920 L705 950 L704 909 Q653 891 671 834Z" fill="#D8F4FB" /><circle cx="708" cy="850" r="7" fill={INK} stroke="none" /><circle cx="737" cy="850" r="7" fill={INK} stroke="none" /><circle cx="766" cy="850" r="7" fill={INK} stroke="none" /></g>
  </>;
};

const SeedScene = ({ frame }: { frame: number }) => {
  const growth = clamp(frame, 18, 145);
  return <>
    <g stroke={INK} strokeWidth="15" strokeLinejoin="round"><path d="M139 918H946" stroke="#A86E43" strokeWidth="24" /><path d="M181 947V1289 M904 947V1289" stroke="#A86E43" strokeWidth="24" /><path d="M181 1091H904" stroke="#A86E43" strokeWidth="20" /></g>
    <g stroke={INK} strokeWidth="13" strokeLinejoin="round"><ellipse cx="572" cy="1105" rx="163" ry="81" fill="#DAA86D" /><path d="M409 1105 Q431 1206 572 1215 Q714 1207 735 1105" fill="#BF8752" /><ellipse cx="572" cy="1083" rx="104" ry="34" fill="#603F32" /></g>
    <g transform={`translate(0 ${-growth * 1.1})`} stroke={INK} strokeWidth="12" strokeLinejoin="round"><path d={`M572 1071V${1020 - growth}`} stroke="#4D9B62" strokeWidth="20" fill="none" /><path d={`M572 ${1038 - growth} Q500 ${1025 - growth} 486 ${980 - growth} Q541 ${977 - growth} 572 ${1017 - growth}Z`} fill="#68B978" /><path d={`M572 ${1008 - growth} Q638 ${994 - growth} 660 ${949 - growth} Q603 ${945 - growth} 572 ${985 - growth}Z`} fill="#8ACB71" /></g>
    <Adult beat={7} x={800} y={1377} frame={frame} gesture="listen" scale={0.66} />
    <g stroke={INK} strokeWidth="12" strokeLinejoin="round"><rect x="180" y="707" width="175" height="131" rx="33" fill="#FFFDF4" /><circle cx="267" cy="772" r="38" fill={YELLOW} /><path d="M219 824 Q267 791 315 824" fill="none" stroke="#55AB6A" /></g>
  </>;
};

const ClosingScene: React.FC<{ frame: number; ensemble: ChildId[] }> = ({ frame, ensemble }) => {
  const widen = clamp(frame, 40, 130, 0.84, 1);
  return <>
    <g opacity="0.96">
      {ensemble.map((id, index) => <Person key={id} look={CHILDREN[id]} x={115 + index * 143} y={1290 + (index % 2) * 25} scale={0.36} frame={frame} gesture="rest" />)}
    </g>
    <g transform={`translate(0 ${(1 - widen) * 35})`} stroke={INK} strokeWidth="14" strokeLinejoin="round"><rect x="727" y="490" width="260" height="237" rx="33" fill="#FFFCF2" /><path d="M855 727V806" strokeWidth="17" /><path d="M800 552H913 M800 599H905 M800 646H882" stroke="#C2B8A4" strokeWidth="11" strokeLinecap="round" /><circle cx="953" cy="518" r="30" fill={YELLOW} /><path d="M953 504V520 M953 532V535" stroke={INK} strokeWidth="9" strokeLinecap="round" /></g>
    <Adult beat={8} x={760} y={1364} frame={frame} gesture="listen" scale={0.64} />
    <g stroke={INK} strokeWidth="11" strokeLinejoin="round"><path d="M157 615 Q257 554 357 615 Q391 653 357 689 Q321 725 257 725 L215 765 L215 711 Q143 684 157 615Z" fill="#DDF4FB" /><circle cx="214" cy="644" r="8" fill={INK} stroke="none" /><circle cx="257" cy="644" r="8" fill={INK} stroke="none" /><circle cx="300" cy="644" r="8" fill={INK} stroke="none" /></g>
  </>;
};

const Scenery: React.FC<{ beat: number; frame: number; ensemble: ChildId[] }> = ({ beat, frame, ensemble }) => {
  switch (beat) {
    case 1: return <ButterflyScene frame={frame} />;
    case 2: return <ChoiceScene frame={frame} />;
    case 3: return <ClassroomScene frame={frame} />;
    case 4: return <PlayScene frame={frame} />;
    case 5: return <FoodScene frame={frame} />;
    case 6: return <ListeningScene frame={frame} />;
    case 7: return <SeedScene frame={frame} />;
    default: return <ClosingScene frame={frame} ensemble={ensemble} />;
  }
};

export const courageSceneDefaults: CourageSceneProps = {
  durationSeconds: 6,
  beat: 1,
  child: "C1",
  sceneDescription: "",
  ensemble: ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
};

export const CourageScene: React.FC<CourageSceneProps> = ({ beat, child, ensemble = [], sceneDescription }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = clamp(frame, 0, 0.45 * fps, 48, 0);
  const safeBeat = Math.min(8, Math.max(1, Math.round(beat)));
  const focalChild = CHILDREN[child] ?? CHILDREN.C1;
  const selectedEnsemble = ensemble.length ? ensemble : courageSceneDefaults.ensemble!;
  const childX = safeBeat === 1 || safeBeat === 8 ? 440 : safeBeat === 3 ? 386 : safeBeat === 4 ? 397 : safeBeat === 5 ? 389 : safeBeat === 6 ? 631 : safeBeat === 7 ? 410 : 427;
  const childY = safeBeat === 3 ? 1370 : safeBeat === 4 ? 1338 : safeBeat === 5 ? 1376 : safeBeat === 6 ? 1374 : safeBeat === 7 ? 1379 : 1370;
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" role="img" aria-label={sceneDescription || `Cena ilustrada de coragem, momento ${safeBeat}`}>
        <Backdrop beat={safeBeat} />
        <g transform={`translate(0 ${entrance})`}>
          <Scenery beat={safeBeat} frame={frame} ensemble={selectedEnsemble} />
          <Person look={focalChild} x={childX} y={childY} frame={frame} gesture={safeBeat === 1 ? "rest" : safeBeat === 6 || safeBeat === 8 ? "listen" : "open"} />
        </g>
        {/* Keep the approved top-overlay zone (y < 350) and subtitle band (y > 1490) clear. */}
        <path d="M0 1482H1080" stroke={INK} strokeWidth="5" opacity="0.08" />
      </svg>
    </AbsoluteFill>
  );
};
