// @flow

import * as React from 'react';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import css from './keyserver-selection-list-item.css';
import KeyserverPill from '../components/keyserver-pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';

type Props = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionListItem(props: Props): React.Node {
  const { keyserverAdminUserInfo, keyserverInfo } = props;

  const keyserverSelectionListItem = React.useMemo(
    () => (
      <div className={css.container}>
        <KeyserverPill
          keyserverAdminUsername={keyserverAdminUserInfo.username}
        />
        <StatusIndicator connectionInfo={keyserverInfo.connection} />
      </div>
    ),
    [keyserverAdminUserInfo.username, keyserverInfo.connection],
  );

  return keyserverSelectionListItem;
}

export default KeyserverSelectionListItem;
