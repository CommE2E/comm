// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';
import { Platform, View, StyleSheet } from 'react-native';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from './keyboard';
import { KeyboardContext } from './keyboard-state';
import KeyboardInputHost from './keyboard-input-host.react';

type Props = {|
  children: React.Node,
|};
type State = {|
  systemKeyboardShowing: boolean,
  mediaGalleryOpen: boolean,
  mediaGalleryThreadID: ?string,
|};
class KeyboardStateContainer extends React.PureComponent<Props, State> {
  static propTypes = {
    children: PropTypes.node.isRequired,
  };
  state = {
    systemKeyboardShowing: false,
    mediaGalleryOpen: false,
    mediaGalleryThreadID: null,
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
    this.setState({ mediaGalleryOpen: true, mediaGalleryThreadID: threadID });
  };

  hideMediaGallery = () => {
    this.setState({ mediaGalleryOpen: false, mediaGalleryThreadID: null });
  };

  getMediaGalleryThreadID = () => this.state.mediaGalleryThreadID;

  render() {
    const { systemKeyboardShowing, mediaGalleryOpen } = this.state;
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
    if (Platform.OS !== 'android') {
      return (
        <KeyboardContext.Provider value={keyboardState}>
          {this.props.children}
        </KeyboardContext.Provider>
      );
    }
    const keyboardInputHost = mediaGalleryOpen ? <KeyboardInputHost /> : null;
    return (
      <KeyboardContext.Provider value={keyboardState}>
        <View style={styles.container}>
          {this.props.children}
        </View>
        {keyboardInputHost}
      </KeyboardContext.Provider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardStateContainer;
