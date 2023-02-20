// @flow

import * as React from 'react';

export type MessagePressResponderContextType = {
  +onPressMessage: () => void,
};

const MessagePressResponderContext: React.Context<?MessagePressResponderContextType> =
  React.createContext<?MessagePressResponderContextType>(null);

export { MessagePressResponderContext };
