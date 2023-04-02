// @flow

import * as React from 'react';
import IcomoonReact from 'react-icomoon';

import iconSet from 'lib/shared/comm-icon-config.json';

const IcomoonIcon = IcomoonReact.default;

export type CommIcons =
  | 'cloud-filled'
  | 'sidebar'
  | 'sidebar-filled'
  | 'reply'
  | 'reply-filled'
  | 'megaphone'
  | 'copy-filled'
  | 'emote-smile-filled'
  | 'pin'
  | 'unpin';

type CommIconProps = {
  +icon: CommIcons,
  +size: number | string,
  +color?: string,
  +title?: string,
  +className?: string,
  +disableFill?: boolean,
  +removeInlineStyle?: boolean,
};

const iconStyle = {
  stroke: 'none',
};

function CommIcon(props: CommIconProps): React.Node {
  return <IcomoonIcon {...props} style={iconStyle} iconSet={iconSet} />;
}

export default CommIcon;
