// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';
import { Platform } from 'react-native';

import sleep from 'lib/utils/sleep';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
  androidKeyboardResizesFrame,
} from './keyboard';
import { KeyboardContext } from './keyboard-state';
import KeyboardInputHost from './keyboard-input-host.react';
import { waitForInteractions } from '../utils/timers';
import { tabBarAnimationDuration } from '../navigation/tab-bar.react';

type Props = {|
  children: React.Node,
|};
type State = {|
  systemKeyboardShowing: boolean,
  mediaGalleryOpen: boolean,
  mediaGalleryThreadID: ?string,
  renderKeyboardInputHost: boolean,
|};
class KeyboardStateContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    children: PropTypes.node.isRequired,
  };
  state: State = {
    systemKeyboardShowing: false,
    mediaGalleryOpen: false,
    mediaGalleryThreadID: null,
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

  showMediaGallery = (threadID: string) => {
    const updates: $Shape<State> = {
      mediaGalleryOpen: true,
      mediaGalleryThreadID: threadID,
    };
    if (androidKeyboardResizesFrame) {
      updates.renderKeyboardInputHost = true;
    }
    this.setState(updates);
  };

  hideMediaGallery = () => {
    this.setState({
      mediaGalleryOpen: false,
      mediaGalleryThreadID: null,
      renderKeyboardInputHost: false,
    });
  };

  getMediaGalleryThreadID = () => this.state.mediaGalleryThreadID;

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
      getMediaGalleryThreadID,
    } = this;
    const keyboardState = {
      keyboardShowing,
      dismissKeyboard,
      dismissKeyboardIfShowing,
      systemKeyboardShowing,
      mediaGalleryOpen,
      showMediaGallery,
      hideMediaGallery,
      getMediaGalleryThreadID,
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
