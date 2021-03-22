// @flow

import * as React from 'react';

import type { OptimisticThreadInfo } from 'lib/types/thread-types';

export type KeyboardState = {|
  +keyboardShowing: boolean,
  +dismissKeyboard: () => void,
  +dismissKeyboardIfShowing: () => boolean,
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +showMediaGallery: (thread: OptimisticThreadInfo) => void,
  +hideMediaGallery: () => void,
  +getMediaGalleryThread: () => ?OptimisticThreadInfo,
|};

const KeyboardContext = React.createContext<?KeyboardState>(null);

export { KeyboardContext };
