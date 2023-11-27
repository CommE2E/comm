// @flow

import * as React from 'react';

import { selectedKeyserversSelector } from 'lib/selectors/keyserver-selectors.js';
import type { SelectedKeyserverInfo } from 'lib/types/keyserver-types.js';

import KeyserverSelectionListItem from './keyserver-selection-list-item.react.js';
import css from './keyserver-selection-list.css';
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

  const keyserverSelectionList = React.useMemo(
    () => (
      <div className={css.container}>
        <h4 className={css.header}>Keyservers</h4>
        {selectedKeyservers}
      </div>
    ),
    [selectedKeyservers],
  );

  return keyserverSelectionList;
}

export default KeyserverSelectionList;
