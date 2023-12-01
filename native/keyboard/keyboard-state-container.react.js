// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { KeyboardUtils } from 'react-native-keyboard-input';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import sleep from 'lib/utils/sleep.js';

import KeyboardInputHost from './keyboard-input-host.react.js';
import { KeyboardContext } from './keyboard-state.js';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from './keyboard.js';
import { tabBarAnimationDuration } from '../navigation/tab-bar.react.js';
import { waitForInteractions } from '../utils/timers.js';

type Props = {
  +children: React.Node,
};
type State = {
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +mediaGalleryThread: ?ThreadInfo,
  +renderKeyboardInputHost: boolean,
};
class KeyboardStateContainer extends React.PureComponent<Props, State> {
  state: State = {
    systemKeyboardShowing: false,
    mediaGalleryOpen: false,
    mediaGalleryThread: null,
    renderKeyboardInputHost: false,
  };
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;

  keyboardShow: () => void = () => {
    this.setState({ systemKeyboardShowing: true });
  };

  keyboardDismiss: () => void = () => {
    this.setState({ systemKeyboardShowing: false });
  };

  componentDidMount() {
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardShow);
    this.keyboardDismissListener = addKeyboardDismissListener(
      this.keyboardDismiss,
    );
  }

  componentWillUnmount() {
    if (this.keyboardShowListener) {
      removeKeyboardListener(this.keyboardShowListener);
      this.keyboardShowListener = null;
    }
    if (this.keyboardDismissListener) {
      removeKeyboardListener(this.keyboardDismissListener);
      this.keyboardDismissListener = null;
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (Platform.OS !== 'android') {
      return;
    }
    if (this.state.mediaGalleryOpen && !prevState.mediaGalleryOpen) {
      (async () => {
        await sleep(tabBarAnimationDuration);
        await waitForInteractions();
        this.setState({ renderKeyboardInputHost: true });
      })();
    }
  }

  dismissKeyboard: () => void = () => {
    KeyboardUtils.dismiss();
    this.hideMediaGallery();
  };

  dismissKeyboardIfShowing: () => boolean = () => {
    if (!this.keyboardShowing) {
      return false;
    }
    this.dismissKeyboard();
    return true;
  };

  get keyboardShowing(): boolean {
    const { systemKeyboardShowing, mediaGalleryOpen } = this.state;
    return systemKeyboardShowing || mediaGalleryOpen;
  }

  showMediaGallery: (thread: ThreadInfo) => void = (thread: ThreadInfo) => {
    this.setState({
      mediaGalleryOpen: true,
      mediaGalleryThread: thread,
    });
  };

  hideMediaGallery: () => void = () => {
    this.setState({
      mediaGalleryOpen: false,
      mediaGalleryThread: null,
      renderKeyboardInputHost: false,
    });
  };

  getMediaGalleryThread: () => ?ThreadInfo = () =>
    this.state.mediaGalleryThread;

  render(): React.Node {
    const { systemKeyboardShowing, mediaGalleryOpen, renderKeyboardInputHost } =
      this.state;
    const {
      keyboardShowing,
      dismissKeyboard,
      dismissKeyboardIfShowing,
      showMediaGallery,
      hideMediaGallery,
      getMediaGalleryThread,
    } = this;
    const keyboardState = {
      keyboardShowing,
      dismissKeyboard,
      dismissKeyboardIfShowing,
      systemKeyboardShowing,
      mediaGalleryOpen,
      showMediaGallery,
      hideMediaGallery,
      getMediaGalleryThread,
    };
    const keyboardInputHost = renderKeyboardInputHost ? (
      <KeyboardInputHost />
    ) : null;
    return (
      <KeyboardContext.Provider value={keyboardState}>
        {this.props.children}
        {keyboardInputHost}
      </KeyboardContext.Provider>
    );
  }
}

export default KeyboardStateContainer;
