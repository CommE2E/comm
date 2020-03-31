// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { NavigationState } from 'react-navigation';

import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils';

import {
  AppRouteName,
  TabNavigatorRouteName,
  LoggedOutModalRouteName,
  MoreRouteName,
  MoreScreenRouteName,
  ChatRouteName,
  ChatThreadListRouteName,
  CalendarRouteName,
} from './route-names';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  navigationState: NavigationState,
|};

const defaultNavigationState = {
  index: 1,
  routes: [
    {
      key: 'App',
      routeName: AppRouteName,
      index: 0,
      routes: [
        {
          key: 'TabNavigator',
          routeName: TabNavigatorRouteName,
          index: 1,
          routes: [
            { key: 'Calendar', routeName: CalendarRouteName },
            {
              key: 'Chat',
              routeName: ChatRouteName,
              index: 0,
              routes: [
                { key: 'ChatThreadList', routeName: ChatThreadListRouteName },
              ],
            },
            {
              key: 'More',
              routeName: MoreRouteName,
              index: 0,
              routes: [{ key: 'MoreScreen', routeName: MoreScreenRouteName }],
            },
          ],
        },
      ],
    },
    { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
  ],
};

const defaultNavInfo: NavInfo = {
  startDate: fifteenDaysEarlier().valueOf(),
  endDate: fifteenDaysLater().valueOf(),
  navigationState: defaultNavigationState,
};

export { defaultNavInfo };
