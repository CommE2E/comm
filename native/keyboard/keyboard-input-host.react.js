// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';
import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from '../chat/chat-input-state';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import type { MediaLibrarySelection } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TextInput } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-input';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';
import { mediaGalleryKeyboardName } from '../media/media-gallery-keyboard.react';
import { activeMessageListSelector } from '../navigation/nav-selectors';
import {
  connectNav,
  type NavContextType,
} from '../navigation/navigation-context';

type Props = {|
  textInputRef: ?TextInput,
  // Redux state
  styles: Styles,
  activeMessageList: ?string,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // withChatInputState
  chatInputState: ?ChatInputState,
|};
class KeyboardInputHost extends React.PureComponent<Props> {
  static propTypes = {
    textInputRef: PropTypes.instanceOf(TextInput),
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    activeMessageList: PropTypes.string,
    keyboardState: keyboardStatePropType,
    chatInputState: chatInputStatePropType,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.activeMessageList &&
      this.props.activeMessageList !== prevProps.activeMessageList
    ) {
      this.hideMediaGallery();
    }
  }

  static mediaGalleryOpen(props: Props) {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.mediaGalleryOpen);
  }

  render() {
    const kbComponent = KeyboardInputHost.mediaGalleryOpen(this.props)
      ? mediaGalleryKeyboardName
      : null;
    return (
      <KeyboardAccessoryView
        kbInputRef={this.props.textInputRef}
        kbComponent={kbComponent}
        kbInitialProps={this.props.styles.kbInitialProps}
        onItemSelected={this.onMediaGalleryItemSelected}
        onKeyboardResigned={this.hideMediaGallery}
        manageScrollView={false}
      />
    );
  }

  onMediaGalleryItemSelected = (
    keyboardName: string,
    selections: $ReadOnlyArray<MediaLibrarySelection>,
  ) => {
    const { keyboardState } = this.props;
    invariant(
      keyboardState,
      'keyboardState should be set in onMediaGalleryItemSelected',
    );
    keyboardState.dismissKeyboard();
    const mediaGalleryThreadID = keyboardState.getMediaGalleryThreadID();
    if (mediaGalleryThreadID === null || mediaGalleryThreadID === undefined) {
      return;
    }

    const { chatInputState } = this.props;
    invariant(
      chatInputState,
      'chatInputState should be set in onMediaGalleryItemSelected',
    );
    chatInputState.sendMultimediaMessage(mediaGalleryThreadID, selections);
  };

  hideMediaGallery = () => {
    const { keyboardState } = this.props;
    invariant(keyboardState, 'keyboardState should be initialized');
    keyboardState.hideMediaGallery();
  };
}

const styles = {
  kbInitialProps: {
    backgroundColor: 'listBackground',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(
  connectNav((context: ?NavContextType) => ({
    activeMessageList: activeMessageListSelector(context),
  }))(withKeyboardState(withChatInputState(KeyboardInputHost))),
);
