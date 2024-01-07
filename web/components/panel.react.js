// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './panel.css';

export type PanelData = {
  +header: React.Node,
  +body: React.Node,
  +classNameOveride?: string,
};

type PanelItemProps = {
  ...PanelData,
  +index: number,
  +numOfItems: number,
};

function PanelItem(props: PanelItemProps): React.Node {
  const { header, body, index, numOfItems, classNameOveride } = props;

  const className = classnames(
    {
      [css.itemContainer]: true,
      [css.secondaryItemContainer]: index % 2 === 1,
      [css.singleItemContainer]: numOfItems === 1,
      [css.firstMultiItemContainer]: numOfItems > 1 && index === 0,
      [css.lastMultiItemContainer]: numOfItems > 1 && index === numOfItems - 1,
    },
    classNameOveride,
  );

  const headerClassName = classnames({
    [css.headerContainer]: true,
    [css.secondaryHeaderContainer]: index % 2 === 1,
  });

  return (
    <div className={className}>
      <div className={headerClassName}>{header}</div>
      {body}
    </div>
  );
}

type PanelProps = {
  +panelItems: $ReadOnlyArray<PanelData>,
};

function Panel(props: PanelProps): React.Node {
  const { panelItems } = props;

  const items = React.useMemo(
    () =>
      panelItems.map((item, index) => {
        return (
          <PanelItem
            key={index}
            header={item.header}
            body={item.body}
            classNameOveride={item.classNameOveride}
            index={index}
            numOfItems={panelItems.length}
          />
        );
      }),
    [panelItems],
  );

  return <div className={css.container}>{items}</div>;
}

export default Panel;
