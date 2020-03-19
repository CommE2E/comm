// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux/redux-setup';
import type { Navigate } from '../../navigation/route-names';
import { type Colors, colorsPropType } from '../../themes/colors';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import ColorSplotch from '../../components/color-splotch.react';
import { ColorPickerModalRouteName } from '../../navigation/route-names';
import { colorsSelector, styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  colorEditValue: string,
  setColorEditValue: (color: string) => void,
  canChangeSettings: boolean,
  navigate: Navigate,
  // Redux state
  loadingStatus: LoadingStatus,
  colors: Colors,
  styles: Styles,
|};
class ThreadSettingsColor extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    colorEditValue: PropTypes.string.isRequired,
    setColorEditValue: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    let colorButton;
    if (this.props.loadingStatus !== 'loading') {
      colorButton = (
        <EditSettingButton
          onPress={this.onPressEditColor}
          canChangeSettings={this.props.canChangeSettings}
          style={this.props.styles.colorLine}
        />
      );
    } else {
      colorButton = (
        <ActivityIndicator
          size="small"
          key="activityIndicator"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    }

    return (
      <View style={this.props.styles.colorRow}>
        <Text style={[this.props.styles.label, this.props.styles.colorLine]}>
          Color
        </Text>
        <View style={this.props.styles.currentValue}>
          <ColorSplotch color={this.props.threadInfo.color} />
        </View>
        {colorButton}
      </View>
    );
  }

  onPressEditColor = () => {
    this.props.navigate({
      routeName: ColorPickerModalRouteName,
      params: {
        color: this.props.colorEditValue,
        threadInfo: this.props.threadInfo,
        setColor: this.props.setColorEditValue,
      },
    });
  };
}

const styles = {
  colorRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: 'panelForeground',
  },
  colorLine: {
    lineHeight: Platform.select({ android: 22, default: 25 }),
  },
  label: {
    fontSize: 16,
    width: 96,
    color: 'panelForegroundTertiaryLabel',
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);

export default connect((state: AppState) => ({
  loadingStatus: loadingStatusSelector(state),
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(ThreadSettingsColor);
