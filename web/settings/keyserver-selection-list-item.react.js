// @flow

import * as React from 'react';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import css from './keyserver-selection-list-item.css';
import CommIcon from '../CommIcon.react.js';
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
        <div className={css.keyserverContainer}>
          <CommIcon icon="cloud-filled" size={18} color="white" />
          <p className={css.keyserverAdminLabel}>
            {keyserverAdminUserInfo.username}
          </p>
        </div>
        <StatusIndicator connectionInfo={keyserverInfo.connection} />
      </div>
    ),
    [keyserverAdminUserInfo.username, keyserverInfo.connection],
  );

  return keyserverSelectionListItem;
}

export default KeyserverSelectionListItem;
