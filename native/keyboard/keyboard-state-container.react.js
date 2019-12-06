// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from './keyboard';
import { KeyboardContext } from './keyboard-state';

type Props = {|
  children: React.Node,
|};
type State = {|
  systemKeyboardShowing: bool,
  mediaGalleryOpen: bool,
|};
class KeyboardStateContainer extends React.PureComponent<Props, State> {

  static propTypes = {
    children: PropTypes.node.isRequired,
  };
  state = {
    systemKeyboardShowing: false,
    mediaGalleryOpen: false,
  };
  keyboardShowListener: ?Object;
  keyboardDismissListener: ?Object;

  keyboardShow = () => {
    this.setState({ systemKeyboardShowing: true });
  }

  keyboardDismiss = () => {
    this.setState({ systemKeyboardShowing: false });
  }

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
  }

  dismissKeyboardIfShowing = () => {
    if (!this.keyboardShowing) {
      return false;
    }
    this.dismissKeyboard();
    return true;
  }

  get keyboardShowing() {
    const { systemKeyboardShowing, mediaGalleryOpen } = this.state;
    return systemKeyboardShowing || mediaGalleryOpen;
  }

  setMediaGalleryOpen = (mediaGalleryOpen: bool) => {
    this.setState({ mediaGalleryOpen });
  }

  render() {
    const { systemKeyboardShowing, mediaGalleryOpen } = this.state;
    const {
      keyboardShowing,
      dismissKeyboard,
      dismissKeyboardIfShowing,
      setMediaGalleryOpen,
    } = this;
    const keyboardState = {
      keyboardShowing,
      dismissKeyboard,
      dismissKeyboardIfShowing,
      systemKeyboardShowing,
      mediaGalleryOpen,
      setMediaGalleryOpen,
    };
    return (
      <KeyboardContext.Provider value={keyboardState}>
        {this.props.children}
      </KeyboardContext.Provider>
    );
  }

}

export default KeyboardStateContainer;
