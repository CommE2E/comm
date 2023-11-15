// @flow

import * as React from 'react';

import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

export type KeyboardState = {
  +keyboardShowing: boolean,
  +dismissKeyboard: () => void,
  +dismissKeyboardIfShowing: () => boolean,
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +showMediaGallery: (thread: ThreadInfo | MinimallyEncodedThreadInfo) => void,
  +hideMediaGallery: () => void,
  +getMediaGalleryThread: () => ?ThreadInfo | ?MinimallyEncodedThreadInfo,
};

const KeyboardContext: React.Context<?KeyboardState> =
  React.createContext<?KeyboardState>(null);

export { KeyboardContext };
