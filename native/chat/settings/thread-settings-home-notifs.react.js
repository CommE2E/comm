// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from 'lib/types/subscription-types';

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
  styles: typeof styles,
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
class ThreadSettingsHomeNotifs extends React.PureComponent<Props, State> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateSubscription: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentValue: props.threadInfo.currentUser.subscription.home,
    };
  }

  render() {
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label}>Home notifs</Text>
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
          home: value,
        },
      }),
    );
  };
}

const styles = {
  currentValue: {
    alignItems: 'flex-end',
    flex: 1,
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 3,
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    styles: stylesSelector(state),
  }),
  { updateSubscription },
)(ThreadSettingsHomeNotifs);
