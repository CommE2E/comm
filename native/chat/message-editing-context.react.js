// @flow

import * as React from 'react';

import type { MessageInfo } from 'lib/types/message-types.js';

export type EditState = {
  +editedMessage: ?MessageInfo,
  +isEditedMessageChanged: boolean,
};

export type MessageEditingContextType = {
  +editState: EditState,
  +setEditedMessage: (
    editedMessage: ?MessageInfo,
    callback?: () => void,
  ) => void,
  +setEditedMessageChanged: (isEditedMessageChanged: boolean) => void,
};

const MessageEditingContext: React.Context<?MessageEditingContextType> =
  React.createContext<?MessageEditingContextType>(null);

export { MessageEditingContext };
