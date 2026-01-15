import React from 'react';
import { Sequence, Audio, staticFile } from 'remotion';
import { z } from 'zod';
import { Scene } from './Scene';
import { ZodRenderManifest } from './zod';

export const Main: React.FC<z.infer<typeof ZodRenderManifest>> = ({ scenes }) => {
  let fromFrame = 0;

  return (
    <div style={{ flex: 1, backgroundColor: 'black' }}>
      <Audio
        src={staticFile('assets/music/background-track.mp3')}
        volume={0.2}
        loop
      />
      {scenes.map((scene, index) => {
        const durationInFrames = Math.ceil(scene.durationInSeconds * 30);
        const sequence = (
          <Sequence
            key={index}
            from={fromFrame}
            durationInFrames={durationInFrames}
          >
            <Scene
              text={scene.text}
              assetUrl={scene.assetUrl}
              audioUrl={scene.audioUrl}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
        fromFrame += durationInFrames;
        return sequence;
      })}
    </div>
  );
};
