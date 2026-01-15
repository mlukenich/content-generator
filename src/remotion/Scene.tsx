import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, Audio, staticFile } from 'remotion';
import { Captions } from './Captions';

interface SceneProps {
  text: string;
  assetUrl: string;
  audioUrl: string;
  durationInFrames: number;
}

/**
 * The Scene component renders a single segment of the video.
 * It plays the voice-over audio, displays a background image with a
 * subtle zoom-in effect (Ken Burns), and overlays the scene's text
 * using the <Captions> component.
 */
export const Scene: React.FC<SceneProps> = ({ text, assetUrl, audioUrl, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.1]);

  const backgroundStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Audio src={staticFile(audioUrl)} />
      <AbsoluteFill>
        <Img src={assetUrl} style={backgroundStyle} />
      </AbsoluteFill>
      <AbsoluteFill>
        <Captions text={text} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
