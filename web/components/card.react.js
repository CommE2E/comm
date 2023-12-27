// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './card.css';

type CardItemProps = {
  +header: React.Node,
  +body: React.Node,
  +className?: string,
};

function CardItem(props: CardItemProps): React.Node {
  const { header, body } = props;

  return (
    <>
      <div className={css.headerShadow}>{header}</div>
      {body}
    </>
  );
}

type CardContainerProps = {
  +children: React.ChildrenArray<React.Element<typeof CardItem>>,
};

function CardContainer(props: CardContainerProps): React.Node {
  const { children } = props;

  const items = React.useMemo(
    () =>
      React.Children.map(children, (child, index) => {
        if (!child) {
          return null;
        }

        const numOfCards = React.Children.count(children);

        const className = classnames(
          {
            [css.itemContainer]: true,
            [css.secondaryItemContainer]: index % 2 === 1,
            [css.singleItemContainer]: numOfCards === 1,
            [css.firstMultiItemContainer]: numOfCards > 1 && index === 0,
            [css.lastMultiItemContainer]:
              numOfCards > 1 && index === numOfCards - 1,
          },
          child.props.className,
        );

        return <div className={className}>{child}</div>;
      }),
    [children],
  );

  return <div className={css.container}>{items}</div>;
}

const Card = {
  Container: CardContainer,
  Item: CardItem,
};

export default Card;
