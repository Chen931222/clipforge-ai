import React from "react";
import { Composition } from "remotion";
import { FPS, SceneComposition, totalFrames, type SceneCompositionProps } from "./scenes";

const defaultProps: SceneCompositionProps = {
  scenes: [
    {
      id: "placeholder",
      durationSec: 3,
      narration: "",
      title: "ClipForge AI",
      subtitle: "",
      assetId: null,
      assetMode: "center",
      animation: "fade",
      transition: "fade",
      needsConfirmation: false,
    },
  ],
  brand: {
    name: "ClipForge",
    primaryColor: "#1C1A15",
    secondaryColor: "#F7F5F0",
    textColor: "#FFFFFF",
    logoUrl: null,
  },
  subtitleStyle: "classic",
  assetMap: {},
  voiceoverUrl: null,
  musicUrl: null,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Master"
        component={SceneComposition}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={totalFrames(defaultProps.scenes)}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: totalFrames(props.scenes),
        })}
      />
      <Composition
        id="Short"
        component={SceneComposition}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={totalFrames(defaultProps.scenes)}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: totalFrames(props.scenes),
        })}
      />
    </>
  );
};
