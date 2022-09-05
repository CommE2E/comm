// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ItemAndContainerPositionInfo } from './position-types';
import { type TooltipPosition, tooltipPositions } from './tooltip-utils';
import css from './tooltip.css';

type Style = {
  +left?: number,
  +right?: number,
  +top?: number,
  +bottom?: number,
};
export type TooltipStyle = { +className: string, +style?: Style };

type TooltipMenuProps = {
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
  +targetPositionInfo: ItemAndContainerPositionInfo,
  +layoutPosition: 'relative' | 'absolute',
  +getStyle: (tooltipPosition: TooltipPosition) => TooltipStyle,
  +children: React.ChildrenArray<
    React.Element<typeof TooltipButton | typeof TooltipTextItem>,
  >,
};
function TooltipMenu(props: TooltipMenuProps): React.Node {
  const { getStyle, children } = props;

  // eslint-disable-next-line no-unused-vars
  const tooltipTexts = React.useMemo(
    () => React.Children.map(children, item => item.props.text),
    [children],
  );

  const tooltipPosition = React.useMemo(() => tooltipPositions.LEFT, []);

  const tooltipStyle = React.useMemo(() => getStyle(tooltipPosition), [
    getStyle,
    tooltipPosition,
  ]);

  const className = React.useMemo(
    () =>
      classNames(
        css.messageTooltipMenu,
        tooltipStyle.className,
        css.messageTimestampTooltip,
      ),
    [tooltipStyle],
  );

  const style = tooltipStyle.style ? tooltipStyle.style : null;

  return (
    <div className={className} style={style}>
      <ul>{children}</ul>
    </div>
  );
}

type TooltipButtonProps = {
  +onClick: (event: SyntheticEvent<HTMLButtonElement>) => void,
  +text: string,
};
function TooltipButton(props: TooltipButtonProps): React.Node {
  const { onClick, text } = props;
  return (
    <li>
      <button onClick={onClick}>{text}</button>
    </li>
  );
}

type TooltipTextItemProps = {
  +text: string,
};
function TooltipTextItem(props: TooltipTextItemProps): React.Node {
  return (
    <li>
      <span>{props.text}</span>
    </li>
  );
}

export { TooltipMenu, TooltipButton, TooltipTextItem };
