import { test, expect, describe } from 'bun:test';
import { Thumbnail } from '@remotion/player';
import { RemotionRoot } from './Root';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

describe('Remotion: NovaVideo Composition', () => {
  test('should render the correct content for a specific frame', async () => {
    // Arrange
    const defaultProps = {
      title: 'Default Title',
      scenes: [
        {
          text: 'This is a test scene.',
          assetUrl: 'https://placehold.co/1080x1920/000/fff/png?text=Test+Asset',
          audioUrl: '',
          durationInSeconds: 5,
        },
      ],
    };

    // Act
    const { container, getByText } = render(
      React.createElement(Thumbnail, {
        component: RemotionRoot,
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
        // Check that the caption text is rendered
        expect(getByText(/This is a test scene./)).toBeTruthy();
    });

    // Perform a DOM snapshot test
    expect(container.innerHTML).toMatchSnapshot();
  });
});
