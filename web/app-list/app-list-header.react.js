// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './app-list-header.css';
import AddButton from '../components/add-button.react.js';
import AppsDirectory from '../modals/apps/apps-directory-modal.react.js';

function AppListHeader(): React.Node {
  const { pushModal } = useModalContext();

  const onClickApps = React.useCallback(
    () => pushModal(<AppsDirectory />),
    [pushModal],
  );

  return (
    <div className={css.container}>
      <div className={css.headerLabel}>Your apps</div>
      <AddButton onClick={onClickApps} />
    </div>
  );
}

export default AppListHeader;
