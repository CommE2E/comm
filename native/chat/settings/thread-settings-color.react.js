// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux-setup';
import type { Navigate } from '../../navigation/route-names';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import EditSettingButton from '../../components/edit-setting-button.react';
import ColorSplotch from '../../components/color-splotch.react';
import { ColorPickerModalRouteName } from '../../navigation/route-names';

type Props = {|
  threadInfo: ThreadInfo,
  colorEditValue: string,
  setColorEditValue: (color: string) => void,
  canChangeSettings: bool,
  navigate: Navigate,
  // Redux state
  loadingStatus: LoadingStatus,
|};
class ThreadSettingsColor extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    colorEditValue: PropTypes.string.isRequired,
    setColorEditValue: PropTypes.func.isRequired,
    canChangeSettings: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
  };

  render() {
    let colorButton;
    if (this.props.loadingStatus !== "loading") {
      colorButton = (
        <EditSettingButton
          onPress={this.onPressEditColor}
          canChangeSettings={this.props.canChangeSettings}
          style={styles.colorLine}
        />
      );
    } else {
      colorButton = <ActivityIndicator size="small" key="activityIndicator" />;
    }

    return (
      <View style={styles.colorRow}>
        <Text style={[styles.label, styles.colorLine]}>Color</Text>
        <View style={styles.currentValue}>
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
  }

}

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  colorLine: {
    lineHeight: Platform.select({ android: 22, default: 25 }),
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:color`,
);

export default connect((state: AppState) => ({
  loadingStatus: loadingStatusSelector(state),
}))(ThreadSettingsColor);
