// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import PanelHeader from '../components/panel-header.react.js';
import AppsDirectory from '../modals/apps/apps-directory-modal.react.js';

function AppListHeader(): React.Node {
  const { pushModal } = useModalContext();

  const onClickApps = React.useCallback(
    () => pushModal(<AppsDirectory />),
    [pushModal],
  );

  return <PanelHeader headerLabel="Your apps" onClickAddButton={onClickApps} />;
}

export default AppListHeader;
