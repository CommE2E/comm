// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import css from './keyserver-selection-list-item.css';
import KeyserverPill from '../components/keyserver-pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
import KeyserverSelectionModal from '../modals/keyserver-selection/keyserver-selection-modal.react.js';

type Props = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

function KeyserverSelectionListItem(props: Props): React.Node {
  const { keyserverAdminUserInfo, keyserverInfo } = props;

  const { pushModal } = useModalContext();

  const onClick = React.useCallback(() => {
    pushModal(
      <KeyserverSelectionModal
        keyserverAdminUserInfo={keyserverAdminUserInfo}
        keyserverInfo={keyserverInfo}
      />,
    );
  }, [keyserverAdminUserInfo, keyserverInfo, pushModal]);

  const keyserverSelectionListItem = React.useMemo(
    () => (
      <div className={css.container} onClick={onClick}>
        <KeyserverPill
          keyserverAdminUsername={keyserverAdminUserInfo.username}
        />
        <StatusIndicator connectionInfo={keyserverInfo.connection} />
      </div>
    ),
    [keyserverAdminUserInfo.username, keyserverInfo.connection, onClick],
  );

  return keyserverSelectionListItem;
}

export default KeyserverSelectionListItem;
