// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  type UpdateThreadRequest,
  type ChangeThreadSettingsPayload,
  threadTypes,
} from 'lib/types/thread-types';
import {
  type LoadingStatus,
  loadingStatusPropType,
} from 'lib/types/loading-types';

import * as React from 'react';
import { Text, Alert, ActivityIndicator, View, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import {
  changeThreadSettingsActionTypes,
  changeThreadSettings,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import {
  type Colors,
  colorsPropType,
  useColors,
  useStyles,
} from '../../themes/colors';

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +lastActionButton: boolean,
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
class ThreadSettingsPromoteSubthread extends React.PureComponent<Props> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    lastActionButton: PropTypes.bool.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeThreadSettings: PropTypes.func.isRequired,
  };

  render() {
    const {
      panelIosHighlightUnderlay,
      panelForegroundSecondaryLabel,
    } = this.props.colors;
    const loadingIndicator =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color={panelForegroundSecondaryLabel} />
      ) : null;
    const lastButtonStyle = this.props.lastActionButton
      ? this.props.styles.lastButton
      : null;
    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onPress}
          style={[this.props.styles.button, lastButtonStyle]}
          iosFormat="highlight"
          iosHighlightUnderlayColor={panelIosHighlightUnderlay}
        >
          <Text style={this.props.styles.text}>Promote to subthread...</Text>
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
        changes: { type: threadTypes.CHAT_NESTED_OPEN },
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
  lastButton: {
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    paddingTop: 10,
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

export default React.memo<BaseProps>(
  function ConnectedThreadSettingsPromoteSubthread(props: BaseProps) {
    const loadingStatus = useSelector(loadingStatusSelector);
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeThreadSettings = useServerCall(changeThreadSettings);
    return (
      <ThreadSettingsPromoteSubthread
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
