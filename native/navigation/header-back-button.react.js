// @flow

import type { AppState } from '../redux/redux-setup';
import type { GlobalTheme } from '../types/themes';

import * as React from 'react';
import {
  HeaderBackButton as BaseHeaderBackButton,
} from 'react-navigation-stack';

import { connect } from 'lib/utils/redux-utils';

import { colors } from '../themes/colors';

type Props = {
  ...React.ElementConfig<typeof BaseHeaderBackButton>,
  // Redux state
  activeTheme: ?GlobalTheme,
};
function HeaderBackButton(props: Props) {
  if (props.scene && props.scene.index === 0) {
    return null;
  }
  const { activeTheme, ...rest } = props;
  const { link: tintColor } = activeTheme === 'dark'
    ? colors.dark
    : colors.light;
  return <BaseHeaderBackButton {...rest} tintColor={tintColor} />;
}

export default connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
}))(HeaderBackButton);
