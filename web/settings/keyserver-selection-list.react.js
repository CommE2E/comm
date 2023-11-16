// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { selectedKeyserversSelector } from 'lib/selectors/keyserver-selectors.js';
import type { SelectedKeyserverInfo } from 'lib/types/keyserver-types.js';

import KeyserverSelectionListItem from './keyserver-selection-list-item.react.js';
import css from './keyserver-selection-list.css';
import AddKeyserverModal from '../modals/keyserver-selection/add-keyserver-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function KeyserverSelectionList(): React.Node {
  const selectedKeyserverInfos: $ReadOnlyArray<SelectedKeyserverInfo> =
    useSelector(selectedKeyserversSelector);

  const selectedKeyservers = React.useMemo(
    () =>
      selectedKeyserverInfos.map(
        ({ keyserverAdminUserInfo, keyserverInfo }) => (
          <KeyserverSelectionListItem
            key={`${keyserverAdminUserInfo.id}${keyserverInfo.urlPrefix}`}
            keyserverAdminUserInfo={keyserverAdminUserInfo}
            keyserverInfo={keyserverInfo}
          />
        ),
      ),
    [selectedKeyserverInfos],
  );

  const { pushModal } = useModalContext();

  const onClickAddKeyserver = React.useCallback(() => {
    pushModal(<AddKeyserverModal />);
  }, [pushModal]);

  const keyserverSelectionList = React.useMemo(
    () => (
      <div className={css.container}>
        <div className={css.headerContainer}>
          <h4 className={css.header}>Keyservers</h4>
          <div onClick={onClickAddKeyserver}>
            <SWMansionIcon
              icon="plus-small"
              size={26}
              className={css.addButton}
            />
          </div>
        </div>
        {selectedKeyservers}
      </div>
    ),
    [onClickAddKeyserver, selectedKeyservers],
  );

  return keyserverSelectionList;
}

export default KeyserverSelectionList;
