// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';

import { useColors } from '../themes/colors.js';

type Props = React.ElementConfig<typeof BaseHeaderBackButton>;
function HeaderBackButton(props: Props): React.Node {
  const { headerChevron } = useColors();
  if (!props.canGoBack) {
    return null;
  }
  return <BaseHeaderBackButton {...props} tintColor={headerChevron} />;
}
export default HeaderBackButton;
