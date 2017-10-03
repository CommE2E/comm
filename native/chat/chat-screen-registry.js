// @flow

import React from 'react';

// In order for Chat's navigationOptions.tabBarOnPress callback to have access
// to the components that it needs to call, we have to register those components
// (by key) in some state somewhere. This is an ugly hack.

const chatSceenRegistry: {[key: string]: ?ChatScreen} = {};

export type ChatScreen = React.Component<*, *, *> & { canReset: () => bool };

function registerChatScreen(key: string, screen: ?ChatScreen) {
  chatSceenRegistry[key] = screen;
}

function getChatScreen(key: string): ?ChatScreen {
  return chatSceenRegistry[key];
}

export {
  registerChatScreen,
  getChatScreen,
};
