// @flow

import * as React from 'react';
import { Text, Alert, ActivityIndicator, View } from 'react-native';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LoadingStatus } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  type UpdateThreadRequest,
  type ChangeThreadSettingsPayload,
  threadTypes,
} from 'lib/types/thread-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import { useSelector } from '../../redux/redux-utils';
import { type Colors, useColors, useStyles } from '../../themes/colors';
import type { ViewStyle } from '../../types/styles';

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +buttonStyle: ViewStyle,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeThreadSettings: (
    request: UpdateThreadRequest,
  ) => Promise<ChangeThreadSettingsPayload>,
|};
class ThreadSettingsPromoteSidebar extends React.PureComponent<Props> {
  render() {
    const {
      panelIosHighlightUnderlay,
      panelForegroundSecondaryLabel,
    } = this.props.colors;
    const loadingIndicator =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color={panelForegroundSecondaryLabel} />
      ) : null;
    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onPress}
          style={[this.props.styles.button, this.props.buttonStyle]}
          iosFormat="highlight"
          iosHighlightUnderlayColor={panelIosHighlightUnderlay}
        >
          <Text style={this.props.styles.text}>Promote to full thread</Text>
          {loadingIndicator}
        </Button>
      </View>
    );
  }

  onPress = () => {
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.changeThreadSettings(),
    );
  };

  async changeThreadSettings() {
    const threadID = this.props.threadInfo.id;
    try {
      return await this.props.changeThreadSettings({
        threadID,
        changes: { type: threadTypes.COMMUNITY_OPEN_SUBTHREAD },
      });
    } catch (e) {
      Alert.alert('Unknown error', 'Uhh... try again?', undefined, {
        cancelable: true,
      });
      throw e;
    }
  }
}

const unboundStyles = {
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  container: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  text: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
  },
};

const loadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
);

const ConnectedThreadSettingsPromoteSidebar: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedThreadSettingsPromoteSidebar(props: BaseProps) {
    const loadingStatus = useSelector(loadingStatusSelector);
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeThreadSettings = useServerCall(changeThreadSettings);
    return (
      <ThreadSettingsPromoteSidebar
        {...props}
        loadingStatus={loadingStatus}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        changeThreadSettings={callChangeThreadSettings}
      />
    );
  },
);

export default ConnectedThreadSettingsPromoteSidebar;
