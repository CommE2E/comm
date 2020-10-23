// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { ThreadSettingsNavigate } from './thread-settings.react';

import * as React from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import ColorSplotch from '../../components/color-splotch.react';
import { ColorPickerModalRouteName } from '../../navigation/route-names';
import {
  type Colors,
  colorsPropType,
  useColors,
  useStyles,
} from '../../themes/colors';
import { useSelector } from '../../redux/redux-utils';

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +colorEditValue: string,
  +setColorEditValue: (color: string) => void,
  +canChangeSettings: boolean,
  +navigate: ThreadSettingsNavigate,
  +threadSettingsRouteKey: string,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
|};
class ThreadSettingsColor extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    colorEditValue: PropTypes.string.isRequired,
    setColorEditValue: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    threadSettingsRouteKey: PropTypes.string.isRequired,
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
      name: ColorPickerModalRouteName,
      params: {
        presentedFrom: this.props.threadSettingsRouteKey,
        color: this.props.colorEditValue,
        threadInfo: this.props.threadInfo,
        setColor: this.props.setColorEditValue,
      },
    });
  };
}

const unboundStyles = {
  colorLine: {
    lineHeight: Platform.select({ android: 22, default: 25 }),
  },
  colorRow: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
};

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);

export default React.memo<BaseProps>(function ConnectedThreadSettingsColor(
  props: BaseProps,
) {
  const loadingStatus = useSelector(loadingStatusSelector);
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  return (
    <ThreadSettingsColor
      {...props}
      loadingStatus={loadingStatus}
      colors={colors}
      styles={styles}
    />
  );
});
