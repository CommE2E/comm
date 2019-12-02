// @flow

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { AppState } from '../redux/redux-setup';
import {
  type GlobalTheme,
  type GlobalThemeInfo,
  globalThemeInfoPropType,
  osCanTheme,
} from '../types/themes';
import { updateThemeInfoActionType } from '../redux/action-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  initialMode as initialSystemTheme,
  eventEmitter as systemThemeEventEmitter,
} from 'react-native-dark-mode';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  // Redux state
  globalThemeInfo: GlobalThemeInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class ThemeHandler extends React.PureComponent<Props> {

  static propTypes = {
    globalThemeInfo: globalThemeInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    if (!osCanTheme) {
      return;
    }
    systemThemeEventEmitter.addListener(
      'currentModeChanged',
      this.updateSystemTheme,
    );
    this.updateSystemTheme(initialSystemTheme);
  }

  componentWillUnmount() {
    if (!osCanTheme) {
      return;
    }
    systemThemeEventEmitter.removeListener(
      'currentModeChanged',
      this.updateSystemTheme,
    );
  }

  updateSystemTheme = (colorScheme: GlobalTheme) => {
    if (this.props.globalThemeInfo.systemTheme === colorScheme) {
      return;
    }

    const updateObject: $Shape<GlobalThemeInfo> = { systemTheme: colorScheme };
    if (this.props.globalThemeInfo.preference === 'system') {
      updateObject.activeTheme = colorScheme;
    }

    this.props.dispatchActionPayload(updateThemeInfoActionType, updateObject);
  }

  render() {
    return null;
  }

}

export default connect(
  (state: AppState) => ({
    globalThemeInfo: state.globalThemeInfo,
  }),
  null,
  true,
)(ThemeHandler);
