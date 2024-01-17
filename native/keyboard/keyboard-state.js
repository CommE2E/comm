// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

export type KeyboardState = {
  +keyboardShowing: boolean,
  +dismissKeyboard: () => void,
  +dismissKeyboardIfShowing: () => boolean,
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +showMediaGallery: (thread: ThreadInfo) => void,
  +hideMediaGallery: () => void,
  +getMediaGalleryThread: () => ?ThreadInfo,
};

const KeyboardContext: React.Context<?KeyboardState> =
  React.createContext<?KeyboardState>(null);

export { KeyboardContext };
