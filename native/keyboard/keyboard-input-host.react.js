// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TextInput } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-input';

import type { MediaLibrarySelection } from 'lib/types/media-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import { type KeyboardState, KeyboardContext } from './keyboard-state.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { mediaGalleryKeyboardName } from '../media/media-gallery-keyboard.react.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useStyles } from '../themes/colors.js';

type BaseProps = {
  +textInputRef?: ?React.ElementRef<typeof TextInput>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  +activeMessageList: ?string,
  // withKeyboardState
  +keyboardState: KeyboardState,
  // withInputState
  +inputState: ?InputState,
};
class KeyboardInputHost extends React.PureComponent<Props> {
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
    const kbInitialProps = {
      ...this.props.styles.kbInitialProps,
      threadInfo: this.props.keyboardState.getMediaGalleryThread(),
    };
    return (
      <KeyboardAccessoryView
        kbInputRef={this.props.textInputRef}
        kbComponent={kbComponent}
        kbInitialProps={kbInitialProps}
        onItemSelected={this.onMediaGalleryItemSelected}
        onKeyboardResigned={this.hideMediaGallery}
        manageScrollView={false}
      />
    );
  }

  onMediaGalleryItemSelected = async (
    keyboardName: string,
    result: {
      +selections: $ReadOnlyArray<MediaLibrarySelection>,
      +threadInfo: ?ThreadInfo,
    },
  ) => {
    const { keyboardState } = this.props;
    keyboardState.dismissKeyboard();

    const { selections, threadInfo: mediaGalleryThread } = result;
    if (!mediaGalleryThread) {
      return;
    }

    const { inputState } = this.props;
    invariant(
      inputState,
      'inputState should be set in onMediaGalleryItemSelected',
    );
    inputState.sendMultimediaMessage(selections, mediaGalleryThread);
  };

  hideMediaGallery = () => {
    const { keyboardState } = this.props;
    keyboardState.hideMediaGallery();
  };
}

const unboundStyles = {
  // This is a special style needed by 'react-native-keyboard-input':
  // https://github.com/wix/react-native-keyboard-input/blob/acb3a58e96988026f449b48e8b49f49164684d9f/src/KeyboardAccessoryView.js#L115
  kbInitialProps: {
    backgroundColor: 'listBackground',
  },
};

const ConnectedKeyboardInputHost: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedKeyboardInputHost(props: BaseProps) {
    const inputState = React.useContext(InputStateContext);
    const keyboardState = React.useContext(KeyboardContext);
    invariant(keyboardState, 'keyboardState should be initialized');
    const navContext = React.useContext(NavContext);
    const styles = useStyles(unboundStyles);
    const activeMessageList = activeMessageListSelector(navContext);

    return (
      <KeyboardInputHost
        {...props}
        styles={styles}
        activeMessageList={activeMessageList}
        keyboardState={keyboardState}
        inputState={inputState}
      />
    );
  });

export default ConnectedKeyboardInputHost;
