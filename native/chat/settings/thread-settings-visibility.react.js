// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { Colors } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { Text, View, Platform } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import ThreadVisibility from '../../components/thread-visibility.react';
import { colorsSelector, styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  // Redux state
  colors: Colors,
  styles: Styles,
|};
function ThreadSettingsVisibility(props: Props) {
  return (
    <View style={props.styles.row}>
      <Text style={props.styles.label}>Visibility</Text>
      <ThreadVisibility
        threadType={props.threadInfo.type}
        color={props.colors.panelForegroundSecondaryLabel}
      />
    </View>
  );
}

const styles = {
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: 'panelForeground',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: 'panelForegroundTertiaryLabel',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ThreadSettingsVisibility);
