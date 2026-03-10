import { test, expect, describe, mock } from 'bun:test';
import { Thumbnail } from '@remotion/player';
import { Main } from './Main';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Mock Remotion's Audio and Sequence to avoid environmental issues in Happy DOM
mock.module('remotion', () => {
  const actual = require('remotion');
  return {
    ...actual,
    Audio: (props: any) => React.createElement('audio', { ...props, 'data-testid': 'mock-audio' }),
    Video: (props: any) => React.createElement('video', { ...props, 'data-testid': 'mock-video' }),
    staticFile: (path: string) => path,
  };
});

describe('Remotion: NovaVideo Composition', () => {
  test('should render the correct content for a specific frame', async () => {
    // Arrange
    const defaultProps = {
      title: 'Default Title',
      scenes: [
        {
          text: 'This is a test scene.',
          assetUrl: 'https://placehold.co/1080x1920/000/fff/png?text=Test+Asset',
          audioUrl: 'https://placehold.co/audio.mp3', // AudioUrl is expected by the component
          durationInSeconds: 5,
        },
      ],
    };

    // Act
    const { container, getByText } = render(
      React.createElement(Thumbnail, {
        component: Main,
        inputProps: defaultProps,
        compositionWidth: 1080,
        compositionHeight: 1920,
        fps: 30,
        durationInFrames: 150,
        frame: 30, // Render a snapshot at the 1-second mark
      })
    );
    
    // Assert
    // Wait for Remotion to finish rendering the frame
    await waitFor(() => {
        // Check that the individual words are rendered
        // Since the text is split into spans, we check for segments
        expect(getByText(/This/)).toBeTruthy();
        expect(getByText(/scene./)).toBeTruthy();
    });

    // Perform a DOM snapshot test
    expect(container.innerHTML).toMatchSnapshot();
  });
});
