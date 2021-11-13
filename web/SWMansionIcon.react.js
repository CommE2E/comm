// @flow

import * as React from 'react';
import IcomoonReact from 'react-icomoon';

import iconSet from 'lib/shared/swmansion-icon-config.json';

type SWMansionIconProps = {
  +icon: string,
  +size: number | string,
  +color?: string,
  +title?: string,
  +className?: string,
  +disableFill?: boolean,
  +removeInlineStyle?: boolean,
};

function SWMansionIcon(props: SWMansionIconProps): React.Node {
  return <IcomoonReact {...props} iconSet={iconSet} />;
}

export default SWMansionIcon;
