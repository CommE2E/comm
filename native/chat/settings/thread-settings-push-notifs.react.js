// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from 'lib/types/subscription-types';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { Text, View, Switch } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import {
  updateSubscriptionActionTypes,
  updateSubscription,
} from 'lib/actions/user-actions';

import { styleSelector } from '../../themes/colors';

type Props = {|
  threadInfo: ThreadInfo,
  // Redux state
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateSubscription: (
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>,
|};
type State = {|
  currentValue: boolean,
|};
class ThreadSettingsPushNotifs extends React.PureComponent<Props, State> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateSubscription: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentValue: props.threadInfo.currentUser.subscription.pushNotifs,
    };
  }

  render() {
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label}>Push notifs</Text>
        <View style={this.props.styles.currentValue}>
          <Switch
            value={this.state.currentValue}
            onValueChange={this.onValueChange}
          />
        </View>
      </View>
    );
  }

  onValueChange = (value: boolean) => {
    this.setState({ currentValue: value });
    this.props.dispatchActionPromise(
      updateSubscriptionActionTypes,
      this.props.updateSubscription({
        threadID: this.props.threadInfo.id,
        updatedFields: {
          pushNotifs: value,
        },
      }),
    );
  };
}

const styles = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'panelForeground',
    paddingVertical: 3,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: 'panelForegroundTertiaryLabel',
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
    margin: 0,
    alignItems: 'flex-end',
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    styles: stylesSelector(state),
  }),
  { updateSubscription },
)(ThreadSettingsPushNotifs);
