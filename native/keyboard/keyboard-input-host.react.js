// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert, TextInput } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-input';

import { useRealThreadCreator } from 'lib/shared/thread-utils';
import type { MediaLibrarySelection } from 'lib/types/media-types';

import { type InputState, InputStateContext } from '../input/input-state';
import { mediaGalleryKeyboardName } from '../media/media-gallery-keyboard.react';
import { activeMessageListSelector } from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';
import { useStyles } from '../themes/colors';
import { type KeyboardState, KeyboardContext } from './keyboard-state';

type BaseProps = {|
  +textInputRef?: React.ElementRef<typeof TextInput>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  +activeMessageList: ?string,
  // withKeyboardState
  +keyboardState: KeyboardState,
  // withInputState
  +inputState: ?InputState,
  +getServerThreadID: () => Promise<?string>,
|};
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

  onMediaGalleryItemSelected = async (
    keyboardName: string,
    selections: $ReadOnlyArray<MediaLibrarySelection>,
  ) => {
    const { keyboardState, getServerThreadID } = this.props;
    keyboardState.dismissKeyboard();
    const mediaGalleryThreadID = await getServerThreadID();
    if (mediaGalleryThreadID === null || mediaGalleryThreadID === undefined) {
      return;
    }

    const { inputState } = this.props;
    invariant(
      inputState,
      'inputState should be set in onMediaGalleryItemSelected',
    );
    inputState.sendMultimediaMessage(mediaGalleryThreadID, selections);
  };

  hideMediaGallery = () => {
    const { keyboardState } = this.props;
    keyboardState.hideMediaGallery();
  };
}

const unboundStyles = {
  kbInitialProps: {
    backgroundColor: 'listBackground',
  },
};

const showErrorAlert = () =>
  Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
    cancelable: false,
  });

export default React.memo<BaseProps>(function ConnectedKeyboardInputHost(
  props: BaseProps,
) {
  const inputState = React.useContext(InputStateContext);
  const keyboardState = React.useContext(KeyboardContext);
  const navContext = React.useContext(NavContext);
  const styles = useStyles(unboundStyles);
  const activeMessageList = activeMessageListSelector(navContext);

  invariant(keyboardState, 'keyboardState should be initialized');
  const getServerThreadID = useRealThreadCreator(
    keyboardState.getMediaGalleryThread(),
    showErrorAlert,
  );
  return (
    <KeyboardInputHost
      {...props}
      styles={styles}
      activeMessageList={activeMessageList}
      keyboardState={keyboardState}
      inputState={inputState}
      getServerThreadID={getServerThreadID}
    />
  );
});
