// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
import { EditThreadAvatarProvider } from './edit-thread-avatar-provider.react.js';
import { activeThreadSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';

const displayAvatarUpdateFailureAlert = () =>
  Alert.alert(
    'Couldn’t save avatar',
    'Please try again later',
    [{ text: 'OK' }],
    { cancelable: true },
  );

type Props = {
  +children: React.Node,
};
function NativeEditThreadAvatarProvider(props: Props): React.Node {
  const { children } = props;

  const navContext = React.useContext(NavContext);
  const activeThreadID = React.useMemo(
    () => activeThreadSelector(navContext) ?? '',
    [navContext],
  );

  return (
    <EditThreadAvatarProvider
      displayFailureAlert={displayAvatarUpdateFailureAlert}
      selectFromGallery={selectFromGallery}
      useUploadSelectedMedia={useUploadSelectedMedia}
      activeThreadID={activeThreadID}
    >
      {children}
    </EditThreadAvatarProvider>
  );
}

export default NativeEditThreadAvatarProvider;
