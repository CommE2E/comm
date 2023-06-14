// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import { BaseEditThreadAvatarProvider } from 'lib/components/base-edit-thread-avatar-provider.react.js';

import { selectFromGallery, useUploadSelectedMedia } from './avatar-hooks.js';
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
    <BaseEditThreadAvatarProvider
      displayFailureAlert={displayAvatarUpdateFailureAlert}
      selectFromGallery={selectFromGallery}
      useUploadSelectedMedia={useUploadSelectedMedia}
      activeThreadID={activeThreadID}
    >
      {children}
    </BaseEditThreadAvatarProvider>
  );
}

export default NativeEditThreadAvatarProvider;
