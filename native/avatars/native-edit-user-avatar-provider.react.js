// @flow

import * as React from 'react';

import { BaseEditUserAvatarProvider } from 'lib/components/base-edit-user-avatar-provider.react.js';

import {
  useUploadSelectedMedia,
  displayAvatarUpdateFailureAlert,
} from './avatar-hooks.js';

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
