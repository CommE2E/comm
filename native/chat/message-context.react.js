// @flow

import * as React from 'react';

export type MessageContextType = {
  +messageID: string,
  +messageText: ?string,
};

const MessageContext: React.Context<MessageContextType> = React.createContext<MessageContextType>(
  {
    messageID: '',
    messageText: null,
  },
);

export { MessageContext };
