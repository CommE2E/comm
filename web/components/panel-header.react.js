// @flow

import * as React from 'react';

import css from './panel-header.css';
import AddButton from '../components/add-button.react.js';

type Props = {
  +headerLabel: string,
  +onClickAddButton?: () => mixed,
};

function PanelHeader(props: Props): React.Node {
  const { headerLabel, onClickAddButton } = props;

  const addButton = React.useMemo(() => {
    if (!onClickAddButton) {
      return null;
    }

    return <AddButton onClick={onClickAddButton} />;
  }, [onClickAddButton]);

  const panelHeader = React.useMemo(
    () => (
      <div className={css.container}>
        <div className={css.headerLabel}>{headerLabel}</div>
        {addButton}
      </div>
    ),
    [addButton, headerLabel],
  );

  return panelHeader;
}

export default PanelHeader;
