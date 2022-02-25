// @flow

import * as React from 'react';
import IcomoonReact from 'react-icomoon';

import iconSet from './icons/selection.json';

export type Icon =
  | 'arrow-right-small'
  | 'bell'
  | 'logout'
  | 'plus-circle'
  | 'users'
  | 'chevron-right-small'
  | 'reply-arrow'
  | 'right-angle-arrow'
  | 'plus'
  | 'settings'
  | 'wrench'
  | 'message-filled-round'
  | 'bug'
  | 'cloud'
  | 'copy'
  | 'smile'
  | 'inbox'
  | 'info-circle'
  | 'message-circle-line'
  | 'question-circle'
  | 'search'
  | 'key'
  | 'chevron-left'
  | 'arrow-left'
  | 'arrow-right'
  | 'cross'
  | 'edit'
  | 'filters'
  | 'menu-horizontal'
  | 'menu-vertical'
  | 'message-square'
  | 'message-square-lines'
  | 'bell-disabled'
  | 'chevron-right'
  | 'send'
  | 'calendar'
  | 'message-circle-lines'
  | 'image';

type SWMansionIconProps = {
  +icon: Icon,
  +size: number | string,
  +color?: string,
  +title?: string,
  +className?: string,
  +disableFill?: boolean,
  +removeInlineStyle?: boolean,
  +style?: $Shape<CSSStyleDeclaration>,
};

function SWMansionIcon(props: SWMansionIconProps): React.Node {
  return <IcomoonReact {...props} iconSet={iconSet} />;
}

export default SWMansionIcon;
