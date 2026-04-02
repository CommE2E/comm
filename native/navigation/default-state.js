// @flow

import type { StaleNavigationState } from '@react-navigation/core';

import type { BaseNavInfo } from 'lib/types/nav-types.js';
import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils.js';

import {
  AppRouteName,
  TabNavigatorRouteName,
  LoggedOutModalRouteName,
  CalendarRouteName,
  CalendarScreenRouteName,
  ProfileRouteName,
  ProfileScreenRouteName,
  ChatRouteName,
  ChatThreadListRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  CommunityDrawerNavigatorRouteName,
} from './route-names.js';

export type NavInfo = $Exact<BaseNavInfo>;

const defaultNavigationState: StaleNavigationState = {
  type: 'stack',
  index: 1,
  routes: [
    {
      name: AppRouteName,
      state: {
        type: 'stack',
        index: 0,
        routes: [
          {
            name: CommunityDrawerNavigatorRouteName,
            state: {
              type: 'drawer',
              index: 0,
              routes: [
                {
                  name: TabNavigatorRouteName,
                  state: {
                    type: 'tab',
                    index: 0,
                    routes: [
                      {
                        name: ChatRouteName,
                        state: {
                          type: 'stack',
                          index: 0,
                          routes: [
                            {
                              name: ChatThreadListRouteName,
                              state: {
                                type: 'tab',
                                index: 0,
                                routes: [
                                  { name: HomeChatThreadListRouteName },
                                  { name: BackgroundChatThreadListRouteName },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        name: CalendarRouteName,
                        state: {
                          type: 'stack',
                          index: 0,
                          routes: [{ name: CalendarScreenRouteName }],
                        },
                      },
                      {
                        name: ProfileRouteName,
                        state: {
                          type: 'stack',
                          index: 0,
                          routes: [{ name: ProfileScreenRouteName }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { name: LoggedOutModalRouteName },
  ],
};

const defaultNavInfo: NavInfo = {
  startDate: fifteenDaysEarlier().valueOf(),
  endDate: fifteenDaysLater().valueOf(),
};

export { defaultNavigationState, defaultNavInfo };
