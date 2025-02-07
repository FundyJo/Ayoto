import {useEffect, useRef, useState} from 'react';
import './PlayerStyles.css';
import {
    isHLSProvider,
    MediaFullscreenChangeEvent,
    MediaFullscreenErrorEvent,
    MediaPlayer,
    type MediaPlayerInstance,
    MediaProvider,
    type MediaProviderAdapter,
    type MediaProviderChangeEvent,
    Poster,
} from '@vidstack/react';
import {fetchEpisodeLink, useSettings,} from '../../../index.ts';
import {DefaultAudioLayout, defaultLayoutIcons, DefaultVideoLayout,} from '@vidstack/react/player/layouts/default';

//const Button = styled.button<{ $autoskip?: boolean }>`
//    padding: 0.25rem;
//    font-size: 0.8rem;
//    border: none;
//    margin-right: 0.25rem;
//    border-radius: var(--global-border-radius);
//    cursor: pointer;
//    background-color: var(--global-div);
//    color: var(--global-text);
//
//    svg {
//        margin-bottom: -0.1rem;
//        color: grey;
//    }
//
//    @media (max-width: 500px) {
//        font-size: 0.7rem;
//    }
//
//    &.active {
//        background-color: var(--primary-accent);
//    }
//
//    ${({$autoskip}) =>
//    $autoskip &&
//    `
//      color: #d69e00;
//      svg {
//        color: #d69e00;
//      }
//    `}
//`;

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

export function Player({
                           animeId,
                           season,
                           episode,
                           sourceType,
                           language,
                           banner,
                           updateDownloadLink,
                           onEpisodeEnd,
                           animeTitle,
                       }: PlayerProps) {
    const player = useRef<MediaPlayerInstance>(null);
    const [src, setSrc] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [totalDuration, setTotalDuration] = useState<number>(0);
    const episodeId = animeId + '-' + season + '-' + episode;
    const episodeNumber = getEpisodeNumber(episodeId);
    const animeVideoTitle = animeTitle;

    const {settings} = useSettings();
    const {autoPlay, autoNext} = settings;

    useEffect(() => {
        console.log('RERENDER FROM PLAYER');
    }, []);

    useEffect(() => {
        setCurrentTime(parseFloat(localStorage.getItem('currentTime') || '0'));

        fetchAndSetAnimeSource();
        console.log(totalDuration);
        return () => {
            if (player.current) {
                const currentTime = player.current.currentTime;
                localStorage.setItem('currentTime', currentTime.toString());
            }
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

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (player.current) {
                const currentTime = player.current.currentTime;
                localStorage.setItem('currentTime', currentTime.toString());
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

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
            localStorage.setItem('currentTime', currentTime.toString());
        }
    }

    async function fetchAndSetAnimeSource() {
        try {
            const response = await fetchEpisodeLink(animeId, season, episodeNumber, sourceType, language);
            console.log("TESTS")
            console.log(response);
            setSrc(response);
        } catch (error) {
            console.error('Failed to fetch anime streaming links', error);
        }
    }

    function getEpisodeNumber(id: string): string {
        const parts = id.split('-');
        return parts[parts.length - 1];
    }

    //const toggleAutoPlay = () =>
    //    setSettings({...settings, autoPlay: !autoPlay});
    //const toggleAutoNext = () =>
    //    setSettings({...settings, autoNext: !autoNext});
    //const toggleAutoSkip = () =>
    //    setSettings({...settings, autoSkip: !autoSkip});
    //const toggleFullscreen = () => {
    //    player.current?.enterFullscreen();
    //    player.current?.controls.show()
    //};

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

    function onFullscreenChange(isFullscreen: boolean, nativeEvent: MediaFullscreenChangeEvent) {
        console.log('Fullscreen state changed:', isFullscreen);
        console.log('Native event:', nativeEvent);

        const requestEvent = nativeEvent.request;
        console.log('Request event:', requestEvent);

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
            </>
        </div>
    );
}