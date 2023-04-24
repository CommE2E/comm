// @flow

import * as React from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import type { ThreadSettingsNavigate } from './thread-settings.react.js';
import ColorSplotch from '../../components/color-splotch.react.js';
import EditSettingButton from '../../components/edit-setting-button.react.js';
import { ColorSelectorModalRouteName } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +colorEditValue: string,
  +setColorEditValue: (color: string) => void,
  +canChangeSettings: boolean,
  +navigate: ThreadSettingsNavigate,
  +threadSettingsRouteKey: string,
};
type Props = {
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
};
class ThreadSettingsColor extends React.PureComponent<Props> {
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
    this.props.navigate<'ColorSelectorModal'>({
      name: ColorSelectorModalRouteName,
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

const ConnectedThreadSettingsColor: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsColor(
    props: BaseProps,
  ) {
    const threadID = props.threadInfo.id;
    const loadingStatus = useSelector(
      createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:${threadID}:color`,
      ),
    );
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

export default ConnectedThreadSettingsColor;
