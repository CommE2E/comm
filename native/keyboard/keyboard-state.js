// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

export type KeyboardState = {
  +keyboardShowing: boolean,
  +dismissKeyboard: () => void,
  +dismissKeyboardIfShowing: () => boolean,
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +showMediaGallery: (thread: LegacyThreadInfo | ThreadInfo) => void,
  +hideMediaGallery: () => void,
  +getMediaGalleryThread: () => ?LegacyThreadInfo | ?ThreadInfo,
};

const KeyboardContext: React.Context<?KeyboardState> =
  React.createContext<?KeyboardState>(null);

export { KeyboardContext };
