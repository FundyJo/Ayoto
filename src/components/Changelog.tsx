import { useState } from 'react';
import MarkdownIt from 'markdown-it';
import styled, { keyframes } from 'styled-components';
import confetti from 'canvas-confetti';

// Fix TypeScript module resolution
declare module 'canvas-confetti';

// Markdown Parser
const mdParser = new MarkdownIt();

// Animations für FadeIn und FadeOut
const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const fadeOut = keyframes`
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
`;

// Hintergrund-Blur Animation
const AnimatedBlurBackground = styled.div<{ fadeOut?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.7);
  z-index: 1000;
  animation: ${(props) => (props.fadeOut ? fadeOut : fadeIn)} 2s ease-in-out;
`;

// Modal Container Animation
const ModalContainer = styled.div<{ fadeOut?: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff;
  color: #333333;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  width: 90%;
  max-width: 500px;
  height: 80%;
  max-height: 700px;

  @media (max-width: 768px) {
    width: 90%;
    height: 70%;
  }

  @media (max-height: 600px) {
    height: 90%;
    max-height: none;
  }

  animation: ${(props) => (props.fadeOut ? fadeOut : fadeIn)} 2s ease-in-out;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Markdown Container
const MarkdownContainer = styled.div`
    flex-grow: 1;
    overflow-y: auto;
    padding: 15px;
    font-size: 1rem;
    line-height: 1.7;
    color: #212121;
    border-bottom: 1px solid #e0e0e0;

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

// Buttons Container
const ButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    padding: 15px 0;
    gap: 10px;

    @media (max-width: 768px) {
        flex-direction: column;
    }
`;

const Button = styled.button<{ primary?: boolean }>`
    cursor: pointer;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    color: white;
    background-color: ${(props) => (props.primary ? '#212121' : '#555555')};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    transition: background-color 0.2s ease, transform 0.2s ease;

    &:hover {
        background-color: ${(props) => (props.primary ? '#353535' : '#777')};
        transform: scale(1.1);
    }

    &:active {
        transform: scale(0.95);
    }

    @media (max-width: 768px) {
        width: 100%;
    }
`;

// Markdown Inhalt
const markdownContent = `
# 📄 Changelog v1.0.0
---

## Markdown-Inhalte
Hier wird eine Markdown-Datei angezeigt.

---

### Technologien
- ReactJS
- Styled Components
- Markdown-It Parser
`;

// Konfetti über das Fenster rendern
const createConfettiCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '2000';
  document.body.appendChild(canvas);
  return canvas;
};

const launchConfetti = () => {
  let confettiCanvas = document.getElementById('confetti-canvas');
  if (!confettiCanvas) {
    confettiCanvas = createConfettiCanvas();
  }

  const confettiInstance = confetti.create(confettiCanvas as HTMLCanvasElement, {
    resize: true,
  });

  confettiInstance({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5 },
  });

  // Entfernen nach 2 Sekunden
  setTimeout(() => {
    confettiCanvas?.remove();
  }, 2000);
};

const Changelog = () => {
  const [showBlur, setShowBlur] = useState(true);
  const [showModal, setShowModal] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleAccept = () => {
    setIsFadingOut(true);
    launchConfetti();
    setTimeout(() => {
      setShowBlur(false);
      setShowModal(false);
    }, 2000);
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <>
      {showBlur && <AnimatedBlurBackground fadeOut={isFadingOut} />}
      {showModal && (
        <ModalContainer fadeOut={isFadingOut}>
          <MarkdownContainer
            dangerouslySetInnerHTML={{
              __html: mdParser.render(markdownContent),
            }}
          />
          <ButtonContainer>
            <Button onClick={handleAccept} primary>
              ✅ Accept
            </Button>
            <Button onClick={handleUpdate}>
              🔄 Update Now
            </Button>
          </ButtonContainer>
        </ModalContainer>
      )}
    </>
  );
};

export default Changelog;
