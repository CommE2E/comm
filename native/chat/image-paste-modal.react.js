// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Button, View, Image } from 'react-native';
import filesystem from 'react-native-fs';

import type { PhotoPaste } from 'lib/types/media-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import sleep from 'lib/utils/sleep.js';

import Modal from '../components/modal.react.js';
import { InputStateContext } from '../input/input-state.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

export type ImagePasteModalParams = {
  +imagePasteStagingInfo: PhotoPaste,
  +thread: ThreadInfo,
};

type Props = {
  +navigation: RootNavigationProp<'ImagePasteModal'>,
  +route: NavigationRoute<'ImagePasteModal'>,
};
function ImagePasteModal(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const inputState = React.useContext(InputStateContext);
  const {
    navigation,
    route: {
      params: { imagePasteStagingInfo, thread: threadInfo },
    },
  } = props;

  const [sendButtonDisabled, setSendButtonDisabled] = React.useState(false);

  const sendImage = React.useCallback(async () => {
    setSendButtonDisabled(true);
    navigation.goBackOnce();
    const selection: $ReadOnlyArray<PhotoPaste> = [imagePasteStagingInfo];
    invariant(inputState, 'inputState should be set in ImagePasteModal');
    await inputState.sendMultimediaMessage(selection, threadInfo);
  }, [imagePasteStagingInfo, inputState, navigation, threadInfo]);

  const cancel = React.useCallback(async () => {
    navigation.goBackOnce();
    await sleep(5000);
    filesystem.unlink(imagePasteStagingInfo.uri);
  }, [imagePasteStagingInfo.uri, navigation]);

  return (
    <Modal modalStyle={styles.modal} safeAreaEdges={['top']}>
      <Image style={styles.image} source={{ uri: imagePasteStagingInfo.uri }} />
      <View style={styles.linebreak} />
      <View style={styles.spacer} />
      <Button disabled={sendButtonDisabled} title="Send" onPress={sendImage} />
      <View style={styles.linebreak} />
      <View style={styles.spacer} />
      <Button title="Cancel" onPress={cancel} />
      <View style={styles.spacer} />
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    marginHorizontal: 0,
    marginTop: 300,
    marginBottom: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderRadius: 0,
  },
  image: {
    resizeMode: 'contain',
    flex: 1,
    justifyContent: 'center',
    marginBottom: 15,
    marginHorizontal: 15,
    marginTop: 20,
  },
  linebreak: {
    borderBottomColor: 'gray',
    alignSelf: 'stretch',
    margin: 0,
    borderBottomWidth: 0.25,
    paddingBottom: 10,
    padding: 5,
  },
  spacer: {
    padding: 5,
  },
};

export default ImagePasteModal;
