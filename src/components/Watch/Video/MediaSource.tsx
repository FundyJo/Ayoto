import React, { useState } from 'react';
import styled from 'styled-components';
import {
  FaMicrophone,
  FaClosedCaptioning,
  FaBell,
  FaDownload,
  FaShare,
} from 'react-icons/fa';

// Props interface
interface MediaSourceProps {
  sourceType: string;
  setSourceType: (sourceType: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  downloadLink: string;
  episodeId?: string;
  airingTime?: string;
  nextEpisodenumber?: string;
}

// Adjust the Container for responsive layout
const UpdatedContainer = styled.div`
  justify-content: center;
  margin-top: 1rem;
  gap: 1rem;
  display: flex;
  @media (max-width: 1000px) {
    flex-direction: column;
  }
`;

const Table = styled.table`
  font-size: 0.9rem;
  border-collapse: collapse;
  font-weight: bold;
  margin-left: auto;
  margin-right: auto;
`;

const TableRow = styled.tr``;

const TableCell = styled.td`
  padding: 0.35rem;
  @media (max-width: 500px) {
    text-align: center;
    font-size: 0.8rem;
  }

  svg {
    margin-bottom: -0.1rem;
    @media (max-width: 500px) {
      margin-bottom: 0rem;
    }
  }
`;

const ButtonWrapper = styled.div`
  display: flex; // Flexbox für die Buttons
  border: 1px solid var(--global-border); // Rahmen um den gesamten Wrapper
  border-radius: var(
    --global-border-radius
  ); // Abgerundete Ecken für den Wrapper
  overflow: hidden; // Verhindert, dass die Ecken der Buttons sichtbar sind
`;

const ButtonBase = styled.button`
  flex: 1; // Make the button expand to fill the wrapper
  padding: 0.5rem;
  border: none;
  font-weight: bold;
  border-radius: var(--global-border-radius);
  cursor: pointer;
  background-color: var(--global-div);
  color: var(--global-text);
  transition:
    background-color 0.2s ease,
    transform 0.2s ease-in-out;
  text-align: center;

  &:hover {
    background-color: var(--primary-accent);
    transform: scale(1.025);
  }

  &:active {
    transform: scale(0.975);
  }
`;

const Button = styled.button`
    flex: 1; // Alle Buttons gleich groß
    padding: 0.5rem 1rem; // Innenabstand
    font-size: 0.85rem; // Schriftgröße
    font-weight: bold; // Fettdruck
    color: white; // Schriftfarbe
    background-color: #333; // Dunkler Hintergrund
    border: none; // Kein Rahmen
    cursor: pointer; // Zeiger beim Hover
    transition: background-color 0.3s ease; // Übergangseffekt
    display: flex; // Flexbox für die Ausrichtung des Inhalts
    align-items: center; // Vertikale Zentrierung
    justify-content: center; // Horizontale Zentrierung
    min-width: 100px; // Verhindert, dass der Button in einer Zeile überläuft

    // Aktiver Zustand
    &.active {
        background-color: #8080cf; // Spezifische Farbe für aktiven Button
    }

    // SVG-Styling
    svg {
        margin-right: 0.5rem; // Abstand zwischen dem Symbol und dem Text
        width: 1em; // Breite des SVG
        height: 1em; // Höhe des SVG
    }
    
    // Responsives Design
    @media (max-width: 500px) {
        font-size: 0.75rem; // Kleinere Schriftgröße auf kleinen Bildschirmen
        padding: 0.4rem 0.8rem; // Anpassung des Innenabstands
    }
`;

const DownloadLink = styled.a`
  display: inline-flex; // Use inline-flex to easily center the icon
  align-items: center; // Align the icon vertically center
  margin-left: 0.5rem;
  padding: 0.5rem;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: bold;
  border: none;
  border-radius: var(--global-border-radius);
  cursor: pointer;
  background-color: var(--global-div);
  color: var(--global-text);
  text-align: center;
  text-decoration: none;
  transition:
    background-color 0.3s ease,
    transform 0.2s ease-in-out;

  svg {
    font-size: 0.85rem; // Adjust icon size
  }

  &:hover {
    background-color: var(--primary-accent);
    transform: scale(1.025);
  }

  &:active {
    transform: scale(0.975);
  }
`;

const ShareButton = styled(ButtonBase)`
  display: inline-flex; // Align items in a row
  align-items: center; // Center items vertically
  margin-left: 0.5rem;
  padding: 0.5rem;
  gap: 0.25rem;
  font-size: 0.9rem;
  border: none;
  border-radius: var(--global-border-radius);
  cursor: pointer;
  background-color: var(--global-div);
  color: var(--global-text);
  text-decoration: none;

  svg {
    font-size: 0.85rem; // Adjust icon size
  }
`;

const ResponsiveTableContainer = styled.div`
  background-color: var(--global-div-tr);
  padding: 0.75rem;
  border-radius: var(--global-border-radius);
  @media (max-width: 500px) {
    display: block;
  }
`;

const EpisodeInfoColumn = styled.div`
  flex-grow: 1;
  display: block;
  background-color: var(--global-div-tr);
  border-radius: var(--global-border-radius);
  padding: 0.75rem;
  @media (max-width: 1000px) {
    display: block;
    margin-right: 0rem;
  }

  p {
    font-size: 0.9rem;
    margin: 0;
  }

  h4 {
    margin: 0rem;
    font-size: 1.15rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 500px) {
    p {
      font-size: 0.8rem;
      margin: 0rem;
    }

    h4 {
      font-size: 1rem;
      margin-bottom: 0rem;
    }
  }
`;

export const MediaSource: React.FC<MediaSourceProps> = ({
  sourceType,
  setSourceType,
  language,
  setLanguage,
  downloadLink,
  episodeId,
  airingTime,
  nextEpisodenumber,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  console.log(episodeId)

  const episode = episodeId?.replace("episode-","") ?? "";

  return (
    <UpdatedContainer>
      <EpisodeInfoColumn>
        {episodeId ? (
          <>
            Du siehst grade <strong>Episode {episode}</strong>
            <DownloadLink
              href={downloadLink}
              target='_blank'
              rel='noopener noreferrer'
            >
              <FaDownload />
            </DownloadLink>
            <ShareButton onClick={handleShareClick}>
              <FaShare />
            </ShareButton>
            {isCopied && <p>Copied to clipboard!</p>}
            <br />
            <br />
            <p>Falls der aktuelle Server nicht funktioniert nutze bitte einen anderen.</p>
          </>
        ) : (
          'Loading episode information...'
        )}
        {airingTime && (
          <>
            <p>
              Episode <strong>{nextEpisodenumber}</strong> will air in{' '}
              <FaBell />
              <strong> {airingTime}</strong>.
            </p>
          </>
        )}
      </EpisodeInfoColumn>
      <ResponsiveTableContainer>
        <Table>
          <tbody>
            <TableRow>
              <TableCell>
                <FaClosedCaptioning /> Sub
              </TableCell>
              <TableCell colSpan={3}>
                <ButtonWrapper>
                  <Button
                    className={
                      sourceType === 'default' && language === 'ger-sub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('default');
                      setLanguage('ger-sub');
                    }}
                  >
                    {sourceType === 'default' && language === 'ger-sub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Default
                  </Button>
                  <Button
                    className={
                      sourceType === 'Doodstream' && language === 'ger-sub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('Doodstream');
                      setLanguage('ger-sub');
                    }}
                  >
                    {sourceType === 'Doodstream' && language === 'ger-sub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Dood
                  </Button>
                  <Button
                    className={
                      sourceType === 'Vidoza' && language === 'ger-sub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('Vidoza');
                      setLanguage('ger-sub');
                    }}
                  >
                    {sourceType === 'Vidoza' && language === 'ger-sub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Vid
                  </Button>
                </ButtonWrapper>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell>
                <FaMicrophone /> Dub
              </TableCell>
              <TableCell colSpan={3}>
                <ButtonWrapper>
                  <Button
                    className={
                      sourceType === 'default' && language === 'ger-dub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('default');
                      setLanguage('ger-dub');
                    }}
                  >
                    {sourceType === 'default' && language === 'ger-dub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Default
                  </Button>
                  <Button
                    className={
                      sourceType === 'Doodstream' && language === 'ger-dub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('Doodstream');
                      setLanguage('ger-dub');
                    }}
                  >
                    {sourceType === 'Doodstream' && language === 'ger-dub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Dood
                  </Button>
                  <Button
                    className={
                      sourceType === 'Vidoza' && language === 'ger-dub'
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSourceType('Vidoza');
                      setLanguage('ger-dub');
                    }}
                  >
                    {sourceType === 'Vidoza' && language === 'ger-dub' && (
                      <svg
                        stroke='currentColor'
                        fill='currentColor'
                        strokeWidth='0'
                        viewBox='0 0 512 512'
                        height='1em'
                        width='1em'
                        style={{ marginBottom: '-0.05rem' }}
                      >
                        <path d='M194.82 496a18.36 18.36 0 0 1-18.1-21.53v-.11L204.83 320H96a16 16 0 0 1-12.44-26.06L302.73 23a18.45 18.45 0 0 1 32.8 13.71c0 .3-.08.59-.13.89L307.19 192H416a16 16 0 0 1 12.44 26.06L209.24 489a18.45 18.45 0 0 1-14.42 7z'></path>
                      </svg>
                    )}
                    Vid
                  </Button>
                </ButtonWrapper>
              </TableCell>
            </TableRow>
          </tbody>
        </Table>
      </ResponsiveTableContainer>
    </UpdatedContainer>
  );
};
