// @flow

import * as React from 'react';
import { View, Switch } from 'react-native';

import {
  updateSubscriptionActionTypes,
  updateSubscription,
} from 'lib/actions/user-actions.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from 'lib/types/subscription-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import type { DispatchActionPromise } from 'lib/utils/action-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { SingleLine } from '../../components/single-line.react.js';
import { useStyles } from '../../themes/colors.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +updateSubscription: (
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>,
};
type State = {
  +currentValue: boolean,
};
class ThreadSettingsHomeNotifs extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      currentValue: !props.threadInfo.currentUser.subscription.home,
    };
  }

  render() {
    const componentLabel = 'Background';
    return (
      <View style={this.props.styles.row}>
        <SingleLine style={this.props.styles.label} adjustsFontSizeToFit={true}>
          {componentLabel}
        </SingleLine>
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
          home: !value,
        },
      }),
    );
  };
}

const unboundStyles = {
  currentValue: {
    alignItems: 'flex-end',
    margin: 0,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    flex: 1,
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 3,
  },
};

const ConnectedThreadSettingsHomeNotifs: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsHomeNotifs(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const callUpdateSubscription = useServerCall(updateSubscription);
    return (
      <ThreadSettingsHomeNotifs
        {...props}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        updateSubscription={callUpdateSubscription}
      />
    );
  });

export default ConnectedThreadSettingsHomeNotifs;
