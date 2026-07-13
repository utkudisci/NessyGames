import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../../pages/HomePage/HomePage';
import { GamesPage } from '../../pages/GamesPage/GamesPage';
import { GameDetailPage } from '../../pages/GameDetailPage/GameDetailPage';
import { PlayGamePage } from '../../pages/PlayGamePage/PlayGamePage';
import { SettingsPage } from '../../pages/SettingsPage/SettingsPage';
import { LeaderboardPage } from '../../pages/LeaderboardPage/LeaderboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <HomePage />,
      },
      {
        path: 'games',
        element: <GamesPage />,
      },
      {
        path: 'games/:gameId',
        element: <GameDetailPage />,
      },
      {
        path: 'play/:gameId',
        element: <PlayGamePage />,
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
