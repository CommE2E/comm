// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import HeaderRightTextButton from '../../navigation/header-right-text-button.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import type { ChatNavigationProp } from '../chat.react.js';

export type ThreadSettingsNotificationsParams = {
  +threadInfo: ThreadInfo,
};

type Props = {
  +navigation: ChatNavigationProp<'ThreadSettingsNotifications'>,
  +route: NavigationRoute<'ThreadSettingsNotifications'>,
};

function ThreadSettingsNotifications(props: Props): React.Node {
  const {
    navigation: { setOptions },
  } = props;
  const onPressSave = React.useCallback(() => {
    // TODO: implement this
  }, []);

  React.useEffect(() => {
    setOptions({
      headerRight: () => (
        <HeaderRightTextButton label="Save" onPress={onPressSave} />
      ),
    });
  }, [onPressSave, setOptions]);

  return null;
}

export default ThreadSettingsNotifications;
