// @flow

import * as React from 'react';

import { threadSettingsNotificationsCopy } from 'lib/shared/thread-settings-notifications-utils.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';

const homeChatThreadListOptions: {
  +title: string,
  +tabBarIcon: ({ +color: string, ... }) => React.Node,
} = {
  title: threadSettingsNotificationsCopy.HOME,
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="home-1" size={22} style={{ color }} />
  ),
};
const backgroundChatThreadListOptions: {
  +title: string,
  +tabBarIcon: ({ +color: string, ... }) => React.Node,
} = {
  title: threadSettingsNotificationsCopy.MUTED,
  tabBarIcon: ({ color }) => (
    <SWMansionIcon name="bell-disabled" size={22} style={{ color }} />
  ),
};

export { backgroundChatThreadListOptions, homeChatThreadListOptions };
