// * ==== Components ====
// TODO Shared components
export { StatusIndicator } from './components/shared/StatusIndicator.tsx';

// TODO Basic UI Components
export { Navbar } from './components/Navigation/Navbar.tsx';
export { Footer } from './components/Navigation/Footer.tsx';
export { DropDownSearch } from './components/Navigation/DropSearch.tsx';
export { SearchFilters } from './components/Navigation/SearchFilters.tsx';
export { ShortcutsPopup } from './components/ShortcutsPopup.tsx';
export { ThemeProvider, useTheme } from './components/ThemeContext.tsx';

// TODO Cards
export * from './components/Cards/CardGrid.tsx';
export { CardItem } from './components/Cards/CardItem.tsx';

// TODO Home Page Specific
export { EpisodeCard } from './components/Home/EpisodeCard.tsx';
export { HomeCarousel } from './components/Home/HomeCarousel.tsx';
export { HomeSideBar } from './components/Home/HomeSideBar.tsx';

// TODO Skeletons for Loading States
export {
  SkeletonCard,
  SkeletonSlide,
  SkeletonPlayer,
} from './components/Skeletons/Skeletons.tsx';

// TODO Watching Anime Functionality
export { EpisodeList } from './components/Watch/EpisodeList.tsx';
export { EmbedPlayer } from './components/Watch/Video/EmbedPlayer.tsx';
export { Player } from './components/Watch/Video/Player.tsx'; // Notice: This is not a default export
export { MediaSource } from './components/Watch/Video/MediaSource.tsx';
export { WatchAnimeData } from './components/Watch/WatchAnimeData.tsx';
export { AnimeDataList } from './components/Watch/AnimeDataList.tsx';
export { Seasons } from './components/Watch/Seasons.tsx';

// TODO User Components
export { Settings } from './components/Profile/Settings.tsx';
export {
  SettingsProvider,
  useSettings,
} from './components/Profile/SettingsProvider.tsx';
export { WatchingAnilist } from './components/Profile/WatchingAnilist.tsx';

// * ==== Hooks ====
// TODO Utilizing API and Other Functionalities
export * from './hooks/useApi.ts';
export * from './hooks/animeInterface.ts';
export * from './hooks/useScroll.ts';
export * from './hooks/useTIme.ts';
export * from './hooks/useFilters.ts';
export * from './hooks/useCountdown.ts';

// * ==== Client ====
export { ApolloClientProvider } from './client/ApolloClient.tsx';
export * from './client/userInfoTypes.ts';
export * from './client/authService.ts';
export * from './client/useAuth.tsx';

// * ==== Pages ====
// TODO Main Pages of the Application
export { default as Home } from './pages/Home.tsx';
export { default as Search } from './pages/Search.tsx';
export { default as Watch } from './pages/Watch.tsx';
export { default as Profile } from './pages/Profile.tsx';
export { default as About } from './pages/About.tsx';
export { default as PolicyTerms } from './pages/PolicyTerms.tsx';
export { default as Page404 } from './pages/404.tsx';
export { default as Callback } from './pages/Callback.tsx';
