import {useEffect, useRef, useState} from 'react';
import './PlayerStyles.css';
import {
  isHLSProvider, MediaFullscreenChangeEvent, MediaFullscreenErrorEvent,
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  type MediaProviderAdapter,
  type MediaProviderChangeEvent,
  Poster,
} from '@vidstack/react';
import styled from 'styled-components';
import {
    fetchEpisodeLink,
    useSettings,
} from '../../../index.ts';
import {
    DefaultAudioLayout,
    defaultLayoutIcons,
    DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import {TbPlayerTrackNext, TbPlayerTrackPrev} from 'react-icons/tb';
import {FaCheck} from 'react-icons/fa6';
import {RiCheckboxBlankFill} from 'react-icons/ri';
//import {platform} from '@tauri-apps/plugin-os';
import Hls from "hls.js";

//const currentPlatform = platform();

const Button = styled.button<{ $autoskip?: boolean }>`
    padding: 0.25rem;
    font-size: 0.8rem;
    border: none;
    margin-right: 0.25rem;
    border-radius: var(--global-border-radius);
    cursor: pointer;
    background-color: var(--global-div);
    color: var(--global-text);

    svg {
        margin-bottom: -0.1rem;
        color: grey;
    }

    @media (max-width: 500px) {
        font-size: 0.7rem;
    }

    &.active {
        background-color: var(--primary-accent);
    }

    ${({$autoskip}) =>
            $autoskip &&
            `
      color: #d69e00;
      svg {
        color: #d69e00;
      }
    `}
`;

type PlayerProps = {
    animeId: string;
    season: string;
    episode: string;
    sourceType: string;
    language: string;
    banner?: string;
    updateDownloadLink: (link: string) => void;
    onEpisodeEnd: () => Promise<void>;
    onPrevEpisode: () => void;
    onNextEpisode: () => void;
    animeTitle?: string;
};

//type StreamingSource = {
//  url: string;
//  quality: string;
//};

//type SkipTime = {
//  interval: {
//    startTime: number;
//    endTime: number;
//  };
//  skipType: string;
//};

//type FetchSkipTimesResponse = {
//  results: SkipTime[];
//};

export function Player({
                           animeId,
                           season,
                           episode,
                           sourceType,
                           language,
                           banner,
                           updateDownloadLink,
                           onEpisodeEnd,
                           onPrevEpisode,
                           onNextEpisode,
                           animeTitle,
                       }: PlayerProps) {
    const player = useRef<MediaPlayerInstance>(null);
    const [src, setSrc] = useState<string>('');
    //const [vttUrl, setVttUrl] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<number>(0);
    //const [skipTimes, setSkipTimes] = useState<SkipTime[]>([]);
    const [totalDuration, setTotalDuration] = useState<number>(0);
    //const [vttGenerated, setVttGenerated] = useState<boolean>(false);
    const episodeId = animeId + '-' + season + '-' + episode;
    const episodeNumber = getEpisodeNumber(episodeId);
    const animeVideoTitle = animeTitle;

    const {settings, setSettings} = useSettings();
    const {autoPlay, autoNext, autoSkip} = settings;

    //const isMobile = currentPlatform == "android" || currentPlatform == "ios";

    //const location = useLocation(); // Überwacht die aktuelle URL

    //useEffect(() => {
    //  const fetchData = async () => {
    //    try {
    //      let result: string = ''; // Hier wird das Resultat als string gespeichert
//
    //      if (
    //        location.pathname.startsWith('/watch/') &&
    //        location.pathname.split('/').length === 4
    //      ) {
    //        result = await fetchEpisodeLink(animeId, season, episode,"VOE",language); // Stelle sicher, dass es ein string ist
    //        setSrc(result);
    //      } else if (
    //        location.pathname.startsWith('/watch/') &&
    //        location.pathname.split('/').length === 3
    //      ) {
    //        result = await fetchEpisodeLink(animeId, '1', '1',"VOE",language); // Stelle sicher, dass es ein string ist
    //        setSrc(result);
    //      }
    //    } catch (error) {
    //      console.error('Fehler beim Abrufen der Episodenlinks:', error);
    //    }
    //  };
//
    //  fetchData();
    //}, [location.pathname, animeId, season, episode]);

    useEffect(() => {
        console.log('RERENDER FROM PLAYER');
    }, []);

    useEffect(() => {
        setCurrentTime(parseFloat(localStorage.getItem('currentTime') || '0'));

        fetchAndSetAnimeSource();
        //fetchAndProcessSkipTimes();
        console.log(totalDuration);
        return () => {
            //if (vttUrl) URL.revokeObjectURL(vttUrl);
        };
    }, [episodeId, updateDownloadLink]);

    useEffect(() => {
        if (autoPlay && player.current) {
            player.current
                .play()
                .catch((e) =>
                    console.log('Playback failed to start automatically:', e),
                );
        }
    }, [autoPlay, src]);

    useEffect(() => {
        if (player.current && currentTime) {
            player.current.currentTime = currentTime;
        }
    }, [currentTime]);

    function onProviderChange(
        provider: MediaProviderAdapter | null,
        _nativeEvent: MediaProviderChangeEvent,
    ) {
        if (isHLSProvider(provider)) {
            provider.config = {};
        }
    }

    function onLoadedMetadata() {
        if (player.current) {
            setTotalDuration(player.current.duration);
        }
    }

    function onTimeUpdate() {
        if (player.current) {
            const currentTime = player.current.currentTime;
            const duration = player.current.duration || 1;
            const playbackPercentage = (currentTime / duration) * 100;
            const playbackInfo = {
                currentTime,
                playbackPercentage,
            };
            const allPlaybackInfo = JSON.parse(
                localStorage.getItem('all_episode_times') || '{}',
            );
            allPlaybackInfo[episodeId] = playbackInfo;
            localStorage.setItem(
                'all_episode_times',
                JSON.stringify(allPlaybackInfo),
            );

            //if (autoSkip && skipTimes.length) {
            //  const skipInterval = skipTimes.find(
            //    ({ interval }) =>
            //      currentTime >= interval.startTime && currentTime < interval.endTime,
            //  );
            //  if (skipInterval) {
            //    player.current.currentTime = skipInterval.interval.endTime;
            //  }
            //}
        }
    }

    //function generateWebVTTFromSkipTimes(
    //  skipTimes: FetchSkipTimesResponse,
    //  totalDuration: number,
    //): string {
    //  let vttString = 'WEBVTT\n\n';
    //  let previousEndTime = 0;
//
    //  const sortedSkipTimes = skipTimes.results.sort(
    //    (a, b) => a.interval.startTime - b.interval.startTime,
    //  );
//
    //  sortedSkipTimes.forEach((skipTime, index) => {
    //    const { startTime, endTime } = skipTime.interval;
    //    const skipType =
    //      skipTime.skipType.toUpperCase() === 'OP' ? 'Opening' : 'Outro';
//
    //    // Insert default title chapter before this skip time if there's a gap
    //    if (previousEndTime < startTime) {
    //      vttString += `${formatTime(previousEndTime)} --> ${formatTime(startTime)}`;
    //      vttString += `${animeVideoTitle} - Episode ${episodeNumber}`;
    //    }
//
    //    // Insert this skip time
    //    vttString += `${formatTime(startTime)} --> ${formatTime(endTime)}`;
    //    vttString += `${skipType}`;
    //    previousEndTime = endTime;
//
    //    // Insert default title chapter after the last skip time
    //    if (index === sortedSkipTimes.length - 1 && endTime < totalDuration) {
    //      vttString += `${formatTime(endTime)} --> ${formatTime(totalDuration)}`;
    //      vttString += `${animeVideoTitle} - Episode ${episodeNumber}`;
    //    }
    //  });
//
    //  return vttString;
    //}

    //async function fetchAndProcessSkipTimes() {
    //  if (episodeId) {
    //    const episodeNumber = getEpisodeNumber(episodeId);
    //    try {
    //      const response: FetchSkipTimesResponse = await fetchSkipTimes({
    //        malId: malId.toString(),
    //        episodeNumber,
    //      });
    //      const filteredSkipTimes = response.results.filter(
    //        ({ skipType }) => skipType === 'op' || skipType === 'ed',
    //      );
    //      if (!vttGenerated) {
    //        const vttContent = generateWebVTTFromSkipTimes(
    //          { results: filteredSkipTimes },
    //          totalDuration,
    //        );
    //        const blob = new Blob([vttContent], { type: 'text/vtt' });
    //        const vttBlobUrl = URL.createObjectURL(blob);
    //        setVttUrl(vttBlobUrl);
    //        setSkipTimes(filteredSkipTimes);
    //        setVttGenerated(true);
    //      }
    //    } catch (error) {
    //      console.error('Failed to fetch skip times', error);
    //    }
    //  }
    //}

    async function fetchAndSetAnimeSource() {
        try {
            const response = await fetchEpisodeLink(animeId, season, episodeNumber, sourceType, language);
            console.log("TESTS")
            console.log(response);
            setSrc(response);

            // Sicherstellen, dass wir auf das erste verfügbare Quellen-URL zugreifen
            //const sources = response.data.sources;  // Korrektur: Zugriff auf data.sources
            //
            //// Finde den 'default'-Link, falls vorhanden
            //const backupSource = sources.find((source: StreamingSource) => source.quality === 'default');
            //
            //if (backupSource) {
            //  // Wenn der 'default'-Link existiert, setzen wir diesen als Quelle
            //  setSrc(backupSource.url);
            //  console.log(backupSource.url)
            //  updateDownloadLink(response.data.download); // Update des Download-Links
            //} else if (sources.length > 0) {
            //  // Wenn kein 'default'-Link vorhanden ist, setzen wir den ersten Link als Backup
            //  const firstSource = sources[0]; // Erstes Quellen-URL verwenden
            //  setSrc(firstSource.url);
            //  updateDownloadLink(response.data.download); // Update des Download-Links
            //} else {
            //  console.error('No valid streaming sources found');
            //}
        } catch (error) {
            console.error('Failed to fetch anime streaming links', error);
        }
    }

    //function formatTime(seconds: number): string {
    //  const minutes = Math.floor(seconds / 60);
    //  const remainingSeconds = Math.floor(seconds % 60);
    //  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    //}

    function getEpisodeNumber(id: string): string {
        const parts = id.split('-');
        return parts[parts.length - 1];
    }

    const toggleAutoPlay = () =>
        setSettings({...settings, autoPlay: !autoPlay});
    const toggleAutoNext = () =>
        setSettings({...settings, autoNext: !autoNext});
    const toggleAutoSkip = () =>
        setSettings({...settings, autoSkip: !autoSkip});
    const toggleFullscreen = () => {
        player.current?.enterFullscreen();
        player.current?.controls.show()
    };

    const handlePlaybackEnded = async () => {
        if (!autoNext) return;

        try {
            player.current?.pause();

            await new Promise((resolve) => setTimeout(resolve, 200)); // Delay for transition
            await onEpisodeEnd();
        } catch (error) {
            console.error('Error moving to the next episode:', error);
        }
    };

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;

        if (video) {
            if (Hls.isSupported() && src.includes('.m3u8')) {
                const hls = new Hls();
                hls.loadSource(src);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (autoPlay) {
                        video.play();
                    }
                });

                return () => {
                    hls.destroy();
                };
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native Unterstützung für Safari oder andere kompatible Browser
                video.src = src;
                if (autoPlay) {
                    video.play();
                }
            }
        }
    }, [src, autoPlay]);

    // UNDER BANNER
    //{vttUrl && (
    //    <Track kind='chapters' src={vttUrl} default label='Skip Times' />
    //)}

    function onFullscreenChange(isFullscreen: boolean, nativeEvent: MediaFullscreenChangeEvent) {
        console.log('Fullscreen state changed:', isFullscreen);
        console.log('Native event:', nativeEvent);

        const requestEvent = nativeEvent.request;
        console.log('Request event:', requestEvent);

        // Falls du die Eigenschaften von `requestEvent` untersuchen möchtest:
        if (requestEvent) {
            console.log('Request event type:', requestEvent.type);
            console.log('Request event details:', requestEvent);
        } else {
            console.warn('No request event associated with the fullscreen change.');
        }
    }


  function onFullscreenError(error: unknown, nativeEvent: MediaFullscreenErrorEvent) {
    console.error('Fullscreen error occurred:', error);
    console.log('Native event:', nativeEvent);

    const requestEvent = nativeEvent.request;
    console.log('Request event:', requestEvent);
  }

  return (
        <div style={{animation: 'popIn 0.25s ease-in-out'}} className="media-player">
            <>
                <MediaPlayer
                    onFullscreenChange={onFullscreenChange}
                    onFullscreenError={onFullscreenError}
                    className="player"
                    title={`${animeVideoTitle} - Episode ${episodeNumber}`}
                    src={src}
                    viewType="video"
                    crossorigin
                    autoplay={autoPlay}
                    playsInline
                    onLoadedMetadata={onLoadedMetadata}
                    onProviderChange={onProviderChange}
                    onTimeUpdate={onTimeUpdate}
                    ref={player}
                    aspectRatio="16/9"
                    load="eager"
                    posterLoad="eager"
                    streamType="on-demand"
                    storage="storage-key"
                    keyTarget="player"
                    onEnded={handlePlaybackEnded}
                >
                    <MediaProvider>
                        <Poster className="vds-poster" src={banner} alt=""/>
                    </MediaProvider>
                    <DefaultAudioLayout icons={defaultLayoutIcons}/>
                    <DefaultVideoLayout icons={defaultLayoutIcons}/>
                </MediaPlayer>
                <div
                    className="player-menu"
                    style={{
                        backgroundColor: 'var(--global-div-tr)',
                        borderRadius: 'var(--global-border-radius)',
                    }}
                >
                    <Button onClick={toggleAutoPlay}>
                        {autoPlay ? <FaCheck/> : <RiCheckboxBlankFill/>} Autoplay
                    </Button>
                    <Button $autoskip onClick={toggleAutoSkip}>
                        {autoSkip ? <FaCheck/> : <RiCheckboxBlankFill/>} Auto Skip
                    </Button>
                    <Button onClick={onPrevEpisode}>
                        <TbPlayerTrackPrev/> Prev
                    </Button>
                    <Button onClick={onNextEpisode}>
                        <TbPlayerTrackNext/> Next
                    </Button>
                    <Button onClick={toggleAutoNext}>
                        {autoNext ? <FaCheck/> : <RiCheckboxBlankFill/>} Auto Next
                    </Button>
                    <Button onClick={toggleFullscreen}>
                        <RiCheckboxBlankFill/> Fullscreen
                    </Button>
                </div>
            </>
        </div>
    );
}