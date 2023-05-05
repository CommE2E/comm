// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';

import { useColors } from '../themes/colors.js';

type Props = React.ElementConfig<typeof BaseHeaderBackButton>;
function ViewInviteLinksHeaderLeftButton(props: Props): React.Node {
  const { headerChevron } = useColors();
  if (!props.canGoBack) {
    return null;
  }
  return (
    <BaseHeaderBackButton {...props} label="Close" tintColor={headerChevron} />
  );
}

export default ViewInviteLinksHeaderLeftButton;
