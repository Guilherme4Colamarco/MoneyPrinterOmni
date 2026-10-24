import { Composition } from "remotion";
import { AgentSwarm, agentSwarmDefaults } from "./AgentSwarm";
import { ByteCompare, byteCompareDefaults } from "./ByteCompare";
import { ComentaBalao, comentaBalaoDefaults } from "./ComentaBalao";
import { FedoraVersoes, fedoraVersoesDefaults } from "./FedoraVersoes";
import { TrocariaCard, trocariaCardDefaults } from "./TrocariaCard";
import { HelloChart, helloChartDefaults } from "./HelloChart";
import { durationMetadata, FPS } from "./lib";
import { QuoteCard, quoteCardDefaults } from "./QuoteCard";
import { ReverseFlow, reverseFlowDefaults } from "./ReverseFlow";
import { TerminalAntigo, terminalAntigoDefaults } from "./TerminalAntigo";
import { TimelineAnos, timelineAnosDefaults } from "./TimelineAnos";
import { CourageScene, courageSceneDefaults } from "./CoragemCena";
import { KidsScene, kidsDefaults } from "./KidsScenes";

// Formato do brief (9:16). Para 16:9/1:1 passe --width/--height ao render; os layouts são 9:16.
const W = 1080;
const H = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloChart"
        component={HelloChart}
        durationInFrames={90}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={helloChartDefaults}
      />
      <Composition
        id="HelloChartWide"
        component={HelloChart}
        durationInFrames={90}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={helloChartDefaults}
      />
      <Composition
        id="CourageScene"
        component={CourageScene}
        durationInFrames={Math.round(courageSceneDefaults.durationSeconds * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={courageSceneDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, Math.round(props.durationSeconds * FPS)),
        })}
      />
      <Composition
        id="ReverseFlow"
        component={ReverseFlow}
        durationInFrames={reverseFlowDefaults.durationSeconds * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={reverseFlowDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="AgentSwarm"
        component={AgentSwarm}
        durationInFrames={agentSwarmDefaults.durationSeconds * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={agentSwarmDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="ByteCompare"
        component={ByteCompare}
        durationInFrames={byteCompareDefaults.durationSeconds * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={byteCompareDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="TimelineAnos"
        component={TimelineAnos}
        durationInFrames={timelineAnosDefaults.durationSeconds * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={timelineAnosDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="TerminalAntigo"
        component={TerminalAntigo}
        durationInFrames={Math.round(terminalAntigoDefaults.durationSeconds * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={terminalAntigoDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="FedoraVersoes"
        component={FedoraVersoes}
        durationInFrames={Math.round(fedoraVersoesDefaults.durationSeconds * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={fedoraVersoesDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="ComentaBalao"
        component={ComentaBalao}
        durationInFrames={Math.round(comentaBalaoDefaults.durationSeconds * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={comentaBalaoDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="TrocariaCard"
        component={TrocariaCard}
        durationInFrames={Math.round(trocariaCardDefaults.durationSeconds * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={trocariaCardDefaults}
        calculateMetadata={durationMetadata}
      />
      <Composition
        id="QuoteCard"
        component={QuoteCard}
        durationInFrames={1}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={quoteCardDefaults}
      />
      <Composition
        id="KidsScene"
        component={KidsScene}
        durationInFrames={90}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={kidsDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, Math.round(props.durationSeconds * FPS)),
        })}
      />
    </>
  );
};
