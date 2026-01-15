import { Composition, calculateMetadata } from 'remotion';
import { Main } from './Main';
import { ZodRenderManifest } from './zod';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="NovaVideo"
        component={Main}
        calculateMetadata={async ({ props }) => {
          const totalDurationInSeconds = props.scenes.reduce(
            (acc, scene) => acc + scene.durationInSeconds,
            0
          );
          return {
            durationInFrames: Math.ceil(totalDurationInSeconds * 30),
            props,
          };
        }}
        schema={ZodRenderManifest}
        defaultProps={{
          title: 'Default Title',
          scenes: [
            {
              text: 'This is the default text for the first scene.',
              assetUrl: 'https://placehold.co/1080x1920/222/fff/png?text=Scene+1',
              audioUrl: '',
              durationInSeconds: 5,
            },
            {
                text: 'This is the default text for the second scene.',
                assetUrl: 'https://placehold.co/1080x1920/333/fff/png?text=Scene+2',
                audioUrl: '',
                durationInSeconds: 5,
            }
          ],
        }}
        width={1080}
        height={1920}
        fps={30}
      />
    </>
  );
};
