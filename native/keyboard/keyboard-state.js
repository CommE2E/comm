// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import type { OptimisticThreadInfo } from 'lib/types/thread-types';

export type KeyboardState = {|
  keyboardShowing: boolean,
  dismissKeyboard: () => void,
  dismissKeyboardIfShowing: () => boolean,
  systemKeyboardShowing: boolean,
  mediaGalleryOpen: boolean,
  showMediaGallery: (thread: OptimisticThreadInfo) => void,
  hideMediaGallery: () => void,
  getMediaGalleryThread: () => ?OptimisticThreadInfo,
|};

const keyboardStatePropType = PropTypes.shape({
  keyboardShowing: PropTypes.bool.isRequired,
  dismissKeyboard: PropTypes.func.isRequired,
  dismissKeyboardIfShowing: PropTypes.func.isRequired,
  systemKeyboardShowing: PropTypes.bool.isRequired,
  mediaGalleryOpen: PropTypes.bool.isRequired,
  showMediaGallery: PropTypes.func.isRequired,
  hideMediaGallery: PropTypes.func.isRequired,
  getMediaGalleryThread: PropTypes.func.isRequired,
});

const KeyboardContext = React.createContext<?KeyboardState>(null);

export { keyboardStatePropType, KeyboardContext };
