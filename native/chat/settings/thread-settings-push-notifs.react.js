// @flow

import * as React from 'react';
import { Text, View, Switch } from 'react-native';

import {
  updateSubscriptionActionTypes,
  updateSubscription,
} from 'lib/actions/user-actions';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from 'lib/types/subscription-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { useStyles } from '../../themes/colors';

type BaseProps = {|
  +threadInfo: ThreadInfo,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +updateSubscription: (
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>,
|};
type State = {|
  +currentValue: boolean,
|};
class ThreadSettingsPushNotifs extends React.PureComponent<Props, State> {
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

const unboundStyles = {
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

const ConnectedThreadSettingsPushNotifs: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedThreadSettingsPushNotifs(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const callUpdateSubscription = useServerCall(updateSubscription);
    return (
      <ThreadSettingsPushNotifs
        {...props}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        updateSubscription={callUpdateSubscription}
      />
    );
  },
);

export default ConnectedThreadSettingsPushNotifs;
