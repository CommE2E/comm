// @flow

import * as React from 'react';

export type MessageContextType = {
  +messageKey: string,
};

const MessageContext: React.Context<MessageContextType> = React.createContext<MessageContextType>(
  {
    messageKey: '',
  },
);

export { MessageContext };
