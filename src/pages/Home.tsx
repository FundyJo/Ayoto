import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  HomeCarousel,
  CardGrid,
  StyledCardGrid,
  SkeletonSlide,
  SkeletonCard,
  HomeSideBar,
  EpisodeCard,
  getNextSeason,
  time,
  Anime,
  Episode,
  fetchPopularAnime,
} from '../index.ts';
import { load } from "@tauri-apps/plugin-store";

const CACHE_KEYS = {
  TRENDING: "trendingAnime",
  POPULAR: "popularAnime",
  TOP_RATED: "topAnime",
  TOP_AIRING: "topAiring",
  UPCOMING: "Upcoming",
};

const SimpleLayout = styled.div`
  gap: 1rem;
  margin: 0 auto;
  max-width: 125rem;
  border-radius: var(--global-border-radius);
  display: flex;
  flex-direction: column;
`;

const ContentSidebarLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;

  @media (min-width: 1000px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

const TabContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--global-border-radius);
  width: 100%;
`;

const Tab = styled.div<{ $isActive: boolean }>`
  background: ${({ $isActive }) =>
    $isActive ? 'var(--primary-accent)' : 'transparent'};
  border-radius: var(--global-border-radius);
  border: none;
  cursor: pointer;
  font-weight: bold;
  color: var(--global-text);
  position: relative;
  overflow: hidden;
  margin: 0;
  font-size: 0.8rem;
  padding: 1rem;

  transition: background-color 0.3s ease;

  &:hover,
  &:active,
  &:focus {
    background: var(--primary-accent);
  }

  @media (max-width: 500px) {
    padding: 0.5rem;
  }
`;

const Section = styled.section`
  padding: 0rem;
  border-radius: var(--global-border-radius);
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  margin: 1rem 0;
  background-color: #ffdddd;
  border-left: 4px solid #f44336;
  color: #f44336;
  border-radius: var(--global-border-radius);

  p {
    margin: 0;
    font-weight: bold;
  }
`;

const Home = () => {
  const [itemsCount, setItemsCount] = useState(
    window.innerWidth > 500 ? 24 : 15,
  );

  // Reduced active time to 5mins
  const [activeTab, setActiveTab] = useState(() => {
    const time = Date.now();
    const savedData = localStorage.getItem('home tab');
    if (savedData) {
      const { tab, timestamp } = JSON.parse(savedData);
      if (time - timestamp < 300000) {
        return tab;
      } else {
        localStorage.removeItem('home tab');
      }
    }
    return 'trending';
  });

  const [state, setState] = useState({
    watchedEpisodes: [] as Episode[],
    trendingAnime: [] as Anime[],
    popularAnime: [] as Anime[],
    topAnime: [] as Anime[],
    topAiring: [] as Anime[],
    Upcoming: [] as Anime[],
    error: null as string | null,
    loading: {
      trending: true,
      popular: true,
      topRated: true,
      topAiring: true,
      Upcoming: true,
    },
  });

  useEffect(() => {
    const handleResize = () => {
      setItemsCount(window.innerWidth > 500 ? 24 : 15);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchWatchedEpisodes = () => {
      const watchedEpisodesData = localStorage.getItem('watched-episodes');
      if (watchedEpisodesData) {
        const allEpisodes = JSON.parse(watchedEpisodesData);
        const latestEpisodes: Episode[] = [];
        Object.keys(allEpisodes).forEach((animeId) => {
          const episodes = allEpisodes[animeId];
          const latestEpisode = episodes[episodes.length - 1];
          latestEpisodes.push(latestEpisode);
        });
        setState((prevState) => ({
          ...prevState,
          watchedEpisodes: latestEpisodes,
        }));
      }
    };

    fetchWatchedEpisodes();
  }, []);

  useEffect(() => {
    const fetchCount = Math.ceil(itemsCount * 1.4);
    const fetchData = async () => {
      const store = await load("store.json", { autoSave: false });

      try {
        setState((prevState) => ({ ...prevState, error: null }));

        // Gecachte Daten laden und sicherstellen, dass sie Arrays sind
        const cachedData = {
          trending: ((await store.get(CACHE_KEYS.TRENDING)) as Anime[]) || [],
          popular: ((await store.get(CACHE_KEYS.POPULAR)) as Anime[]) || [],
          topRated: ((await store.get(CACHE_KEYS.TOP_RATED)) as Anime[]) || [],
          topAiring: ((await store.get(CACHE_KEYS.TOP_AIRING)) as Anime[]) || [],
          upcoming: ((await store.get(CACHE_KEYS.UPCOMING)) as Anime[]) || [],
        };

        // State mit gecachten Daten aktualisieren
        setState((prevState) => ({
          ...prevState,
          trendingAnime: cachedData.trending,
          popularAnime: cachedData.popular,
          topAnime: cachedData.topRated,
          topAiring: cachedData.topAiring,
          Upcoming: cachedData.upcoming,
        }));

        // Daten aus der API abrufen
        const test_1 = fetchPopularAnime(1, fetchCount);
        const test_2 = fetchPopularAnime(1, 6);
        const [trending, popular, topRated, topAiring, Upcoming] =
            await Promise.all([test_1, test_1, test_2, test_2, test_2]);

        // Daten filtern und aktualisieren
        const newData = {
          trending: filterAndTrimAnime(trending),
          popular: filterAndTrimAnime(popular),
          topRated: filterAndTrimAnime(topRated),
          topAiring: filterAndTrimAnime(topAiring),
          upcoming: filterAndTrimAnime(Upcoming),
        };

        // Gecachte Daten speichern
        await Promise.all([
          store.set(CACHE_KEYS.TRENDING, newData.trending),
          store.set(CACHE_KEYS.POPULAR, newData.popular),
          store.set(CACHE_KEYS.TOP_RATED, newData.topRated),
          store.set(CACHE_KEYS.TOP_AIRING, newData.topAiring),
          store.set(CACHE_KEYS.UPCOMING, newData.upcoming),
        ]);
        await store.save();

        // State mit neuen Daten aktualisieren
        setState((prevState) => ({
          ...prevState,
          ...newData,
        }));
      } catch (fetchError) {
        setState((prevState) => ({
          ...prevState,
          error: "An unexpected error occurred",
        }));
      } finally {
        setState((prevState) => ({
          ...prevState,
          loading: {
            trending: false,
            popular: false,
            topRated: false,
            topAiring: false,
            Upcoming: false,
          },
        }));
      }
    };

    fetchData();
  }, [itemsCount]);


  useEffect(() => {
    document.title = `TEST APP`;
  }, [activeTab]);

  useEffect(() => {
    const tabData = JSON.stringify({ tab: activeTab, timestamp: time });
    localStorage.setItem('home tab', tabData);
  }, [activeTab]);

  const filterAndTrimAnime = (animeList: any) =>
    animeList.results
      /*       .filter(
              (anime: Anime) =>
                anime.totalEpisodes !== null &&
                anime.duration !== null &&
                anime.releaseDate !== null,
            ) */
      .slice(0, itemsCount);

  const renderCardGrid = (
    animeData: Anime[],
    isLoading: boolean,
    hasError: boolean,
  ) => (
    <Section>
      {isLoading || hasError ? (
        <StyledCardGrid>
          {Array.from({ length: itemsCount }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </StyledCardGrid>
      ) : (
        <CardGrid
          animeData={animeData}
          hasNextPage={false}
          onLoadMore={() => {}}
        />
      )}
    </Section>
  );

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  const SEASON = getNextSeason();

  return (
    <SimpleLayout>
      {state.error && (
        <ErrorMessage title='Error Message'>
          <p>ERROR: {state.error}</p>
        </ErrorMessage>
      )}
      {state.loading.trending || state.error ? (
        <SkeletonSlide />
      ) : (
        <HomeCarousel
          data={state.trendingAnime}
          loading={state.loading.trending}
          error={state.error}
        />
      )}
      <EpisodeCard />
      <ContentSidebarLayout>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            gap: '1rem',
          }}
        >
          <TabContainer>
            <Tab
              title='Trending Tab'
              $isActive={activeTab === 'trending'}
              onClick={() => handleTabClick('trending')}
            >
              ANIMES
            </Tab>
            <Tab
              title='Popular Tab'
              $isActive={activeTab === 'popular'}
              onClick={() => handleTabClick('popular')}
            >
              SERIEN
            </Tab>
            <Tab
              title='Top Rated Tab'
              $isActive={activeTab === 'topRated'}
              onClick={() => handleTabClick('topRated')}
            >
              TOP RATED
            </Tab>
          </TabContainer>
          <div>
            {activeTab === 'trending' &&
              renderCardGrid(
                state.trendingAnime,
                state.loading.trending,
                !!state.error,
              )}
            {activeTab === 'popular' &&
              renderCardGrid(
                state.popularAnime,
                state.loading.popular,
                !!state.error,
              )}
            {activeTab === 'topRated' &&
              renderCardGrid(
                state.topAnime,
                state.loading.topRated,
                !!state.error,
              )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              padding: '0.75rem 0',
            }}
          >
            TOP AIRING
          </div>
          <HomeSideBar animeData={state.topAiring} />
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              padding: '0.75rem 0',
            }}
          >
            UPCOMING {SEASON}
          </div>
          <HomeSideBar animeData={state.Upcoming} />
        </div>
      </ContentSidebarLayout>
    </SimpleLayout>
  );
};

export default Home;
