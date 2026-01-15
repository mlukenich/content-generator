import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface CaptionsProps {
  text: string;
}

const captionStyle: React.CSSProperties = {
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontWeight: 'bold',
  fontSize: 100,
  textAlign: 'center',
  position: 'absolute',
  bottom: '20%',
  width: '90%',
  left: '5%',
  color: 'white',
  textShadow: '0 0 10px black, 0 0 10px black, 0 0 10px black', // Simple text stroke
};

/**
 * The Captions component displays text with a word-by-word reveal animation.
 * It's designed to be highly readable on mobile devices.
 */
export const Captions: React.FC<CaptionsProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div style={captionStyle}>
      {words.map((word, i) => {
        // Each word appears sequentially.
        // The animation is staggered based on word index.
        const opacity = interpolate(frame, [i * 10, i * 10 + 5], [0, 1], {
          extrapolateRight: 'clamp',
        });

        return (
          <span key={i} style={{ opacity, display: 'inline-block', marginRight: '15px' }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};
