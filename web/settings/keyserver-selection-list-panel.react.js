// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './keyserver-selection-list.css';
import KeyserverSelectionList from './keyserver-selection-list.react.js';
import PanelHeader from '../components/panel-header.react.js';
import Panel, { type PanelData } from '../components/panel.react.js';
import AddKeyserverModal from '../modals/keyserver-selection/add-keyserver-modal.react.js';

function KeyserverSelectionListPanel(): React.Node {
  const { pushModal } = useModalContext();

  const onClickAddKeyserver = React.useCallback(
    () => pushModal(<AddKeyserverModal />),
    [pushModal],
  );

  const panelData: $ReadOnlyArray<PanelData> = React.useMemo(
    () => [
      {
        header: (
          <PanelHeader
            headerLabel="Keyservers"
            onClickAddButton={onClickAddKeyserver}
          />
        ),
        body: <KeyserverSelectionList />,
        classNameOveride: css.panelContainer,
      },
    ],
    [onClickAddKeyserver],
  );

  return <Panel panelItems={panelData} />;
}

export default KeyserverSelectionListPanel;
