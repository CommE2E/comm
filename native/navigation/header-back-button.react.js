// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/stack';
import * as React from 'react';

import { useColors } from '../themes/colors';

type Props = React.ElementConfig<typeof BaseHeaderBackButton>;
function HeaderBackButton(props: Props) {
  const { headerChevron } = useColors();
  if (!props.canGoBack) {
    return null;
  }
  return <BaseHeaderBackButton {...props} tintColor={headerChevron} />;
}
export default HeaderBackButton;
