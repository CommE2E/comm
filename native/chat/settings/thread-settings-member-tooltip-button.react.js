// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import PencilIcon from '../../components/pencil-icon.react.js';
import type { AppNavigationProp } from '../../navigation/app-navigator.react.js';

type Props = {
  +navigation: AppNavigationProp<'ThreadSettingsMemberTooltipModal'>,
  ...
};
class ThreadSettingsMemberTooltipButton extends React.PureComponent<Props> {
  render(): React.Node {
    return (
      <TouchableOpacity onPress={this.onPress}>
        <PencilIcon />
      </TouchableOpacity>
    );
  }

  onPress: () => void = () => {
    this.props.navigation.goBackOnce();
  };
}

export default ThreadSettingsMemberTooltipButton;
