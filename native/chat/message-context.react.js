// @flow

import * as React from 'react';

export type MessageContextType = {
  +messageID: string,
};

const MessageContext: React.Context<MessageContextType> = React.createContext<MessageContextType>(
  {
    messageID: '',
  },
);

export { MessageContext };
