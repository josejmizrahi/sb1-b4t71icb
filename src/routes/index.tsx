import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { RequireUnauth } from '@/lib/auth/RequireUnauth';

// Pages
import AuthPage from './auth';
import OnboardingPage from './onboarding';
import DashboardPage from './dashboard';
import CommunityPage from './community';
import MessagesPage from './messages';
import MenuPage from './menu';
import EventsPage from './events';
import EventDetailPage from './events/[id]';
import CreatePage from './create';
import NewEventPage from './events/new';
import StudyGroupsPage from './study-groups';
import NewStudyGroupPage from './study-groups/new';
import PollsPage from './polls';
import NewPollPage from './polls/new';
import FundraisingPage from './fundraising';
import CampaignDetailPage from './fundraising/[id]';
import NewFundraisingPage from './fundraising/new';
import ProfilePage from './profile';
import ProfileSettingsPage from './profile/settings';
import ProfileViewPage from './profile/[id]';
import NotificationsPage from './notifications';
import SettingsPage from './settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <RequireAuth><DashboardPage /></RequireAuth>,
      },
      {
        path: 'community',
        element: <RequireAuth><CommunityPage /></RequireAuth>,
      },
      {
        path: 'messages',
        element: <RequireAuth><MessagesPage /></RequireAuth>,
      },
      {
        path: 'menu',
        element: <RequireAuth><MenuPage /></RequireAuth>,
      },
      {
        path: 'events',
        children: [
          { index: true, element: <RequireAuth><EventsPage /></RequireAuth> },
          { path: 'new', element: <RequireAuth><NewEventPage /></RequireAuth> },
          { path: ':id', element: <RequireAuth><EventDetailPage /></RequireAuth> }
        ]
      },
      {
        path: 'study-groups',
        children: [
          { index: true, element: <RequireAuth><StudyGroupsPage /></RequireAuth> },
          { path: 'new', element: <RequireAuth><NewStudyGroupPage /></RequireAuth> }
        ]
      },
      {
        path: 'polls',
        children: [
          { index: true, element: <RequireAuth><PollsPage /></RequireAuth> },
          { path: 'new', element: <RequireAuth><NewPollPage /></RequireAuth> }
        ]
      },
      {
        path: 'fundraising',
        children: [
          { index: true, element: <RequireAuth><FundraisingPage /></RequireAuth> },
          { path: 'new', element: <RequireAuth><NewFundraisingPage /></RequireAuth> },
          { path: ':id', element: <RequireAuth><CampaignDetailPage /></RequireAuth> }
        ]
      },
      {
        path: 'profile',
        children: [
          { index: true, element: <RequireAuth><ProfilePage /></RequireAuth> },
          { path: 'settings', element: <RequireAuth><ProfileSettingsPage /></RequireAuth> },
          { path: ':id', element: <RequireAuth><ProfileViewPage /></RequireAuth> }
        ]
      },
      {
        path: 'notifications',
        element: <RequireAuth><NotificationsPage /></RequireAuth>,
      },
      {
        path: 'settings',
        element: <RequireAuth><SettingsPage /></RequireAuth>,
      },
      {
        path: 'create',
        element: <RequireAuth><CreatePage /></RequireAuth>,
      }
    ]
  },
  {
    path: '/auth',
    element: <RequireUnauth><AuthPage /></RequireUnauth>,
  },
  {
    path: '/onboarding',
    element: <RequireAuth><OnboardingPage /></RequireAuth>,
  }
]);