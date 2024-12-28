import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef, useReducer,
} from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faThList,
  faTh,
  faSearch,
  faImage,
} from '@fortawesome/free-solid-svg-icons';
import { Episode, Season } from '../../index.ts';
import { useNavigate } from 'react-router-dom';

interface Props {
  animeId: string | undefined;
  seasons: Season[];
  selectedEpisodeId: string;
  onEpisodeSelect: (id: string) => void;
  maxListHeight: string;
}

// Styled components for the episode list
const ListContainer = styled.div<{ $maxHeight: string }>`
  background-color: var(--global-secondary-bg);
  color: var(--global-text);
  border-radius: var(--global-border-radius);
  overflow: hidden;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  max-height: ${({ $maxHeight }) => $maxHeight};
  @media (max-width: 1000px) {
    max-height: 18rem;
  }
  @media (max-width: 500px) {
    max-height: ${({ $maxHeight }) => $maxHeight};
  }
`;

const EpisodeGrid = styled.div<{ $isRowLayout: boolean }>`
  display: grid;
  grid-template-columns: ${({ $isRowLayout }) =>
    $isRowLayout ? '1fr' : 'repeat(auto-fill, minmax(4rem, 1fr))'};
  gap: 0.29rem;
  padding: 0.4rem;
  overflow-y: auto;
  flex-grow: 1;
`;

const EpisodeImage = styled.img`
  max-width: 250px;
  max-height: 150px;
  height: auto;
  margin-top: 0.5rem;
  border-radius: var(--global-border-radius);
  @media (max-width: 500px) {
    max-width: 125px;
    max-height: 80px;
  }
`;

const ListItem = styled.button<{
  $isSelected: boolean;
  $isRowLayout: boolean;
  $isWatched: boolean;
}>`
  transition:
    padding 0.3s ease-in-out,
    transform 0.3s ease-in-out;
  animation: popIn 0.3s ease-in-out;
  background-color: ${({ $isSelected, $isWatched }) =>
    $isSelected
      ? $isWatched
        ? 'var(--primary-accent)' // Selected and watched
        : 'var(--primary-accent-bg)' // Selected but not watched
      : $isWatched
        ? 'var(--primary-accent-bg); filter: brightness(0.8);' // Not selected but watched
        : 'var(--global-tertiary-bg)'};

  border: none;
  border-radius: var(--global-border-radius);
  color: ${({ $isSelected, $isWatched }) =>
    $isSelected
      ? $isWatched
        ? 'var(--global-text)' // Selected and watched
        : 'var(--global-text)' // Selected but not watched
      : $isWatched
        ? 'var(--primary-accent); filter: brightness(0.8);' // Not selected but watched
        : 'grey'}; // Not selected and not watched

  padding: ${({ $isRowLayout }) =>
    $isRowLayout ? '0.6rem 0.5rem' : '0.4rem 0'};
  text-align: ${({ $isRowLayout }) => ($isRowLayout ? 'left' : 'center')};
  cursor: pointer;
  justify-content: ${({ $isRowLayout }) =>
    $isRowLayout ? 'space-between' : 'center'};
  align-items: center;

  &:hover,
  &:active,
  &:focus {
    ${({ $isSelected, $isWatched }) =>
      $isSelected
        ? $isWatched
          ? 'filter: brightness(1.1)' // Selected and watched
          : 'filter: brightness(1.1)' // Selected but not watched
        : $isWatched
          ? 'filter: brightness(1.1)' // Not selected but watched
          : 'background-color: var(--global-button-hover-bg); filter: brightness(1.05); color: #FFFFFF'};
    padding-left: ${({ $isRowLayout }) => ($isRowLayout ? '1rem' : '')};
  }
`;



const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--global-secondary-bg);
  border-bottom: 1px solid var(--global-shadow);
  padding: 0.25rem 0;
`;

const SelectInterval = styled.select`
  padding: 0.5rem;
  background-color: var(--global-secondary-bg);
  color: var(--global-text);
  border: none;
  border-radius: var(--global-border-radius);
`;

const LayoutToggle = styled.button`
  background-color: var(--global-secondary-bg);
  border: 1px solid var(--global-shadow);
  padding: 0.5rem;
  margin-right: 0.5rem;
  cursor: pointer;
  color: var(--global-text);
  border-radius: var(--global-border-radius);
  transition:
    background-color 0.15s,
    color 0.15s;

  &:hover,
  &:active,
  &:focus {
    background-color: var(--global-button-hover-bg);
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--global-secondary-bg);
  border: 1px solid var(--global-shadow);
  padding: 0.5rem;
  gap: 0.25rem;
  margin: 0 0.5rem;
  border-radius: var(--global-border-radius);
  transition:
    background-color 0.15s,
    color 0.15s;

  &:hover,
  &:active,
  &:focus {
    background-color: var(--global-button-hover-bg);
  }
`;

const SearchInput = styled.input`
  border: none;
  background-color: transparent;
  color: var(--global-text);
  outline: none;
  width: 100%;

  &::placeholder {
    color: var(--global-placeholder);
  }
`;

const Icon = styled.div`
  color: var(--global-text);
  opacity: 0.5;
  font-size: 0.8rem;
  transition: opacity 0.2s;

  @media (max-width: 768px) {
    display: none; /* Hide on mobile */
  }
`;

const EpisodeNumber = styled.span``;
const EpisodeTitle = styled.span`
  padding: 0.5rem;
`;



// The updated EpisodeList component
export const EpisodeList: React.FC<Props> = ({
  animeId,
  seasons,
  maxListHeight,
}) => {
  const episodeGridRef = useRef<HTMLDivElement>(null);
  const episodeRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  //const [interval, setInterval] = useState<[number, number]>([0, 99]);
  const [isRowLayout, setIsRowLayout] = useState(true);
  const [userLayoutPreference, setUserLayoutPreference] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [watchedEpisodes, setWatchedEpisodes] = useState<Episode[]>([]);
  const defaultLayoutMode = seasons
    .flatMap((season) => season.episodes) // Alle Episoden aus allen Seasons extrahieren
    .every((episode) => episode.title) // Überprüfen, ob jede Episode einen Titel hat
    ? 'list'
    : 'grid';
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [_, forceUpdate] = useReducer(x => x + 1, 0);

// Laden der gespeicherten Staffel aus localStorage
  useEffect(() => {
    if (animeId) {
      const savedSeason = localStorage.getItem(`selectedSeason-${animeId}`);
      if (savedSeason) {
        setSelectedSeason(savedSeason);
      }
    }
  }, [animeId]);

// Speichern der Staffel bei Auswahländerung
  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSeasonId = event.target.value;
    setSelectedSeason(selectedSeasonId);
    if (animeId) {
      localStorage.setItem(`selectedSeason-${animeId}`, selectedSeasonId);
    }
  };

    // Hier sicherstellen, dass der Wert nicht null ist:
  const handleEpisodeSelect = (episodeId: string) => {
    if (setSelectedEpisodeId !== null) {

      setSelectedEpisodeId(episodeId);
    }
  };

  // Initialize display mode based on localStorage or defaultLayoutMode
  const [displayMode, setDisplayMode] = useState<'list' | 'grid' | 'imageList'>(
    () => {
      const savedMode = animeId ? localStorage.getItem(`listLayout-[${animeId}]`) : null;
      return (savedMode as 'list' | 'grid' | 'imageList') || defaultLayoutMode;
    },
  );

  const [selectionInitiatedByUser, setSelectionInitiatedByUser] = useState(false);
  const navigate = useNavigate();
  // Update local storage when watched episodes change
  useEffect(() => {
    if (animeId && watchedEpisodes.length > 0) {
      localStorage.setItem(
        `watched-episodes-${animeId}`,
        JSON.stringify(watchedEpisodes),
      );
    }
  }, [animeId, watchedEpisodes]);
  // Load watched episodes from local storage when animeId changes
  useEffect(() => {
    if (animeId) {
      localStorage.setItem(`listLayout-[${animeId}]`, displayMode);
      const watched = localStorage.getItem('watched-episodes');
      if (watched) {
        const watchedEpisodesObject = JSON.parse(watched);
        const watchedEpisodesForAnime = watchedEpisodesObject[animeId];
        if (watchedEpisodesForAnime) {
          setWatchedEpisodes(watchedEpisodesForAnime);
        }
      }
    }
  }, [animeId]);

  // Function to mark an episode as watched
  const markEpisodeAsWatched = useCallback(
    (id: string) => {
      if (animeId) {
        setWatchedEpisodes((prevWatchedEpisodes) => {
          const updatedWatchedEpisodes = [...prevWatchedEpisodes];
          const selectedEpisode = seasons.flatMap((season) => season.episodes).find(
            (episode) => episode.id === id
          );

          if (selectedEpisode && !updatedWatchedEpisodes.find((episode) => episode.id === id)) {
            updatedWatchedEpisodes.push(selectedEpisode);

            // Update the watched episodes object in local storage
            localStorage.setItem(
              'watched-episodes',
              JSON.stringify({
                ...JSON.parse(localStorage.getItem('watched-episodes') || '{}'),
                [animeId]: updatedWatchedEpisodes,
              }),
            );

            return updatedWatchedEpisodes;
          }

          return prevWatchedEpisodes;
        });
      }
    },
    [seasons, animeId]
  );

  // Update watched episodes when a new episode is selected or visited
  useEffect(() => {
    if (selectedEpisodeId && !selectionInitiatedByUser) {
      markEpisodeAsWatched(selectedEpisodeId);
    }
  }, [selectedEpisodeId, selectionInitiatedByUser, markEpisodeAsWatched]);

  // Generate interval options
  const intervalOptions = useMemo(() => {
    return seasons.reduce<{ start: number; end: number }[]>(
      (options, _, index) => {
        if (index % 100 === 0) {
          const start = index;
          const end = Math.min(index + 99, seasons.length - 1);
          options.push({ start, end });
        }
        return options;
      },
      [],
    );
  }, [seasons]);

  // Handle interval change
  //const handleIntervalChange = useCallback(
  //  (e: React.ChangeEvent<HTMLSelectElement>) => {
  //    const [start, end] = e.target.value.split('-').map(Number);
  //    setInterval([start, end]);
  //  },
  //  [],
  //);

  // Toggle layout preference
  const toggleLayoutPreference = useCallback(() => {
    setDisplayMode((prevMode) => {
      const nextMode =
        prevMode === 'list'
          ? 'grid'
          : prevMode === 'grid'
            ? 'imageList'
            : 'list';
      if (animeId) {
        localStorage.setItem(`listLayout-[${animeId}]`, nextMode);
      }
      return nextMode;
    });
  }, [animeId]);


  const filteredEpisodes = useMemo(() => {
    let episodes = [] as Episode[];
    if (selectedSeason) {
      const season = seasons.find((season) => season.season_id === selectedSeason);
      if (season) {
        episodes = season.episodes;
      }
    }
    if (searchTerm) {
      episodes = episodes.filter(
        (episode) =>
          episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          episode.number.toString().includes(searchTerm)
      );
    }
    return episodes;
  }, [selectedSeason, searchTerm]);

  // Apply the interval to the filtered episodes
  //const displayedEpisodes = useMemo(() => {
  //  if (!searchTerm) {
  //    // If there's no search term, apply interval to all episodes
  //    return episodes.slice(interval[0], interval[1] + 1);
  //  }
  //  // If there is a search term, display filtered episodes without applying interval
  //  return filteredEpisodes;
  //}, [episodes, filteredEpisodes, interval, searchTerm]);

  // Determine layout based on episodes and user preference
  useEffect(() => {
    const allEpisodes = seasons.flatMap(season => season.episodes);
    const allTitlesNull = allEpisodes.every((episode) => episode.title === null);
    const defaultLayout = allEpisodes.length <= 26 && !allTitlesNull;

    setUserLayoutPreference(null);

    setIsRowLayout(userLayoutPreference !== null ? userLayoutPreference : defaultLayout);

    console.log(isRowLayout)

    //if (!selectionInitiatedByUser) {
    //  const selectedEpisode = allEpisodes.find(
    //    (episode) => episode.id === selectedEpisodeId
    //  );
//
    //  if (selectedEpisode) {
    //    for (let i = 0; i < intervalOptions.length; i++) {
    //      const { start, end } = intervalOptions[i];
    //      if (selectedEpisode.number >= start + 1 && selectedEpisode.number <= end + 1) {
    //        setInterval([start, end]);
    //        break;
    //      }
    //    }
    //  }
    //}
  }, [
    seasons,
    userLayoutPreference,
    selectedEpisodeId,
    intervalOptions,
    selectionInitiatedByUser,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        selectedEpisodeId &&
        episodeRefs.current[selectedEpisodeId] &&
        episodeGridRef.current &&
        !selectionInitiatedByUser
      ) {
        const episodeElement = episodeRefs.current[selectedEpisodeId];
        const container = episodeGridRef.current;

        // Ensure episodeElement is not null before proceeding
        if (episodeElement && container) {
          // Calculate episode's top position relative to the container
          const episodeTop =
            episodeElement.getBoundingClientRect().top -
            container.getBoundingClientRect().top;

          // Calculate the desired scroll position to center the episode in the container
          const episodeHeight = episodeElement.offsetHeight;
          const containerHeight = container.offsetHeight;
          const desiredScrollPosition =
            episodeTop + episodeHeight / 2 - containerHeight / 2;

          container.scrollTo({
            top: desiredScrollPosition,
            behavior: 'smooth',
          });

          setSelectionInitiatedByUser(false);
        }
      }
    }, 100); // A delay ensures the layout has stabilized, especially after dynamic content loading.

    return () => clearTimeout(timer);
  }, [selectedEpisodeId, seasons, displayMode, selectionInitiatedByUser]);

  // Render the EpisodeList component
  return (
    <ListContainer $maxHeight={maxListHeight}>
      <ControlsContainer className="episode-list-header">
        <SelectInterval onChange={handleSeasonChange} value={selectedSeason || ''}>
          <option value="">Staffel auswählen</option>
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </SelectInterval>

        <SearchContainer>
          <Icon>
            <FontAwesomeIcon icon={faSearch} />
          </Icon>
          <SearchInput
            type='text'
            placeholder='Episode Suchen...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        <LayoutToggle onClick={toggleLayoutPreference}>
          {displayMode === 'list' && <FontAwesomeIcon icon={faThList} />}
          {displayMode === 'grid' && <FontAwesomeIcon icon={faTh} />}
          {displayMode === 'imageList' && <FontAwesomeIcon icon={faImage} />}
        </LayoutToggle>
      </ControlsContainer>
      <EpisodeGrid
        className="episode-list-footer"
        key={`episode-grid-${displayMode}`}
        $isRowLayout={displayMode === 'list' || displayMode === 'imageList'}
        ref={episodeGridRef}
      >
        {filteredEpisodes.map((episode) => {
          const $isSelected = episode.id === selectedEpisodeId;
          const $isWatched = watchedEpisodes.some((e) => e.id === episode.id);

          return (
            <ListItem
              key={episode.id}
              $isSelected={$isSelected}
              $isRowLayout={displayMode === 'list' || displayMode === 'imageList'}
              $isWatched={$isWatched}
              onClick={() => {
                handleEpisodeSelect(episode.id)
                console.log(`Staffel ${episode.season} Episode ${episode.number}`)

                const path = `/watch/${animeId}/season-${episode.season}/episode-${episode.number}`
                navigate(path)
                forceUpdate();
              }}
              aria-selected={$isSelected}
            >
              {displayMode === 'imageList' ? (
                <>
                  <div>
                    <EpisodeNumber>{episode.number}. </EpisodeNumber>
                    <EpisodeTitle>{episode.title}</EpisodeTitle>
                  </div>
                  <EpisodeImage
                    src={episode.image}
                    alt={`Episode ${episode.number} - ${episode.title}`}
                  />
                </>
              ) : displayMode === 'grid' ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    {$isSelected ? (
                      <FontAwesomeIcon icon={faPlay} />
                    ) : (
                      <EpisodeNumber>{episode.number}</EpisodeNumber>
                    )}
                  </div>
                </>
              ) : (
                // Render für 'list' Layout
                <>
                  <EpisodeNumber>{episode.number}. </EpisodeNumber>
                  <EpisodeTitle>{episode.title}</EpisodeTitle>
                  {$isSelected && <FontAwesomeIcon icon={faPlay} />}
                </>
              )}
            </ListItem>
          );
        })}
      </EpisodeGrid>
    </ListContainer>
  );
};
