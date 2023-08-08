// @flow

import * as React from 'react';

import { BaseEditThreadAvatarProvider } from 'lib/components/base-edit-thread-avatar-provider.react.js';

import { useUploadSelectedMedia } from './avatar-hooks.js';
import { activeThreadSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';

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
      useUploadSelectedMedia={useUploadSelectedMedia}
      activeThreadID={activeThreadID}
    >
      {children}
    </BaseEditThreadAvatarProvider>
  );
}

export default NativeEditThreadAvatarProvider;
