// @flow

import {
  type InputState,
  inputStatePropType,
  InputStateContext,
} from '../input/input-state';
import {
  type KeyboardState,
  keyboardStatePropType,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import type { MediaLibrarySelection } from 'lib/types/media-types';
import { NavContext } from '../navigation/navigation-context';

import * as React from 'react';
import PropTypes from 'prop-types';
import { TextInput } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-input';
import invariant from 'invariant';

import { useStyles } from '../themes/colors';
import { mediaGalleryKeyboardName } from '../media/media-gallery-keyboard.react';
import { activeMessageListSelector } from '../navigation/nav-selectors';

type BaseProps = {|
  +textInputRef?: React.ElementRef<typeof TextInput>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  +activeMessageList: ?string,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withInputState
  +inputState: ?InputState,
|};
class KeyboardInputHost extends React.PureComponent<Props> {
  static propTypes = {
    textInputRef: PropTypes.object,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    activeMessageList: PropTypes.string,
    keyboardState: keyboardStatePropType,
    inputState: inputStatePropType,
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

    const { inputState } = this.props;
    invariant(
      inputState,
      'inputState should be set in onMediaGalleryItemSelected',
    );
    inputState.sendMultimediaMessage(mediaGalleryThreadID, selections);
  };

  hideMediaGallery = () => {
    const { keyboardState } = this.props;
    invariant(keyboardState, 'keyboardState should be initialized');
    keyboardState.hideMediaGallery();
  };
}

const unboundStyles = {
  kbInitialProps: {
    backgroundColor: 'listBackground',
  },
};

export default React.memo<BaseProps>(function ConnectedKeyboardInputHost(
  props: BaseProps,
) {
  const inputState = React.useContext(InputStateContext);
  const keyboardState = React.useContext(KeyboardContext);
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
