// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { KeyboardUtils } from 'react-native-keyboard-input';

import type { Shape } from 'lib/types/core';
import type { OptimisticThreadInfo } from 'lib/types/thread-types';
import sleep from 'lib/utils/sleep';

import { tabBarAnimationDuration } from '../navigation/tab-bar.react';
import { waitForInteractions } from '../utils/timers';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
  androidKeyboardResizesFrame,
} from './keyboard';
import KeyboardInputHost from './keyboard-input-host.react';
import { KeyboardContext } from './keyboard-state';

type Props = {|
  +children: React.Node,
|};
type State = {|
  +systemKeyboardShowing: boolean,
  +mediaGalleryOpen: boolean,
  +mediaGalleryThread: ?OptimisticThreadInfo,
  +renderKeyboardInputHost: boolean,
|};
class KeyboardStateContainer extends React.PureComponent<Props, State> {
  state: State = {
    systemKeyboardShowing: false,
    mediaGalleryOpen: false,
    mediaGalleryThread: null,
    renderKeyboardInputHost: false,
  };
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;

  keyboardShow = () => {
    this.setState({ systemKeyboardShowing: true });
  };

  keyboardDismiss = () => {
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
    if (Platform.OS !== 'android' || androidKeyboardResizesFrame) {
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

  dismissKeyboard = () => {
    KeyboardUtils.dismiss();
    this.hideMediaGallery();
  };

  dismissKeyboardIfShowing = () => {
    if (!this.keyboardShowing) {
      return false;
    }
    this.dismissKeyboard();
    return true;
  };

  get keyboardShowing() {
    const { systemKeyboardShowing, mediaGalleryOpen } = this.state;
    return systemKeyboardShowing || mediaGalleryOpen;
  }

  showMediaGallery = (thread: OptimisticThreadInfo) => {
    let updates: Shape<State> = {
      mediaGalleryOpen: true,
      mediaGalleryThread: thread,
    };
    if (androidKeyboardResizesFrame) {
      updates = { ...updates, renderKeyboardInputHost: true };
    }
    this.setState(updates);
  };

  hideMediaGallery = () => {
    this.setState({
      mediaGalleryOpen: false,
      mediaGalleryThread: null,
      renderKeyboardInputHost: false,
    });
  };

  getMediaGalleryThread = () => this.state.mediaGalleryThread;

  render() {
    const {
      systemKeyboardShowing,
      mediaGalleryOpen,
      renderKeyboardInputHost,
    } = this.state;
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
