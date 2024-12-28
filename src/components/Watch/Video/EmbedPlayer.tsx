import React, { useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div``;

const Iframe = styled.iframe`
    border-radius: var(--global-border-radius);
    border: none;
    min-height: 16.24rem;
`;

export const EmbedPlayer: React.FC<{ src: string }> = ({ src }) => {

  useEffect(() => {
    const frames = document.getElementsByTagName('iframe');
    for (const frame of frames) {
      frame.setAttribute("sandbox", "allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-scripts allow-top-navigation allow-forms");
    }
  }, []);

  return (
    <Container>
      <Iframe src={src} allowFullScreen />
    </Container>
  );
};
