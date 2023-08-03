// @flow

import * as React from 'react';

import { BaseEditUserAvatarProvider } from 'lib/components/base-edit-user-avatar-provider.react.js';

import { useUploadSelectedMedia } from './avatar-hooks.js';
import Alert from '../utils/alert.js';

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
function NativeEditUserAvatarProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <BaseEditUserAvatarProvider
      displayFailureAlert={displayAvatarUpdateFailureAlert}
      useUploadSelectedMedia={useUploadSelectedMedia}
    >
      {children}
    </BaseEditUserAvatarProvider>
  );
}

export default NativeEditUserAvatarProvider;
