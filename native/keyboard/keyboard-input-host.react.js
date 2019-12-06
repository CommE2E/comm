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
import type { GalleryMediaInfo } from '../media/media-gallery-media.react';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TextInput } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-input';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';
import {
  mediaGalleryKeyboardName,
} from '../media/media-gallery-keyboard.react';

type Props = {|
  textInputRef: ?TextInput,
  // Redux state
  styles: Styles,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // withChatInput
  chatInputState: ?ChatInputState,
|};
class KeyboardInputHost extends React.PureComponent<Props> {

  static propTypes = {
    textInputRef: PropTypes.instanceOf(TextInput),
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    keyboardState: keyboardStatePropType,
    chatInputState: chatInputStatePropType,
  };

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
    mediaInfos: $ReadOnlyArray<GalleryMediaInfo>,
  ) => {
    const { keyboardState } = this.props;
    invariant(
      keyboardState,
      "keyboardState should be set in onMediaGalleryItemSelected",
    );
    keyboardState.dismissKeyboard();
    const mediaGalleryThreadID = keyboardState.getMediaGalleryThreadID();
    if (mediaGalleryThreadID === null || mediaGalleryThreadID === undefined) {
      return;
    }

    const { chatInputState } = this.props;
    invariant(
      chatInputState,
      "chatInputState should be set in onMediaGalleryItemSelected",
    );

    // We do this for Flow
    const mappedMediaInfos = [];
    for (let mediaInfo of mediaInfos) {
      if (mediaInfo.type === "photo") {
        mappedMediaInfos.push({ ...mediaInfo });
      } else {
        mappedMediaInfos.push({ ...mediaInfo });
      }
    }

    chatInputState.sendMultimediaMessage(
      mediaGalleryThreadID,
      mappedMediaInfos,
    );
  }

  hideMediaGallery = () => {
    const { keyboardState } = this.props;
    invariant(keyboardState, "keyboardState should be initialized");
    keyboardState.hideMediaGallery();
  }

}

const styles = {
  kbInitialProps: {
    backgroundColor: 'listBackground',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(withKeyboardState(withChatInputState(KeyboardInputHost)));
