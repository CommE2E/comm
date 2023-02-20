// @flow

import * as React from 'react';
import { Text, ActivityIndicator, View, Alert } from 'react-native';

import { usePromoteSidebar } from 'lib/hooks/promote-sidebar.react.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import Button from '../../components/button.react.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';

type BaseProps = {
  +threadInfo: ThreadInfo,
  +buttonStyle: ViewStyle,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +promoteSidebar: () => mixed,
};
class ThreadSettingsPromoteSidebar extends React.PureComponent<Props> {
  onClick = () => {
    Alert.alert(
      'Are you sure?',
      'Promoting a thread to a channel cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: this.props.promoteSidebar,
        },
      ],
    );
  };

  render() {
    const { panelIosHighlightUnderlay, panelForegroundSecondaryLabel } =
      this.props.colors;
    const loadingIndicator =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color={panelForegroundSecondaryLabel} />
      ) : null;

    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onClick}
          style={[this.props.styles.button, this.props.buttonStyle]}
          iosFormat="highlight"
          iosHighlightUnderlayColor={panelIosHighlightUnderlay}
        >
          <Text style={this.props.styles.text}>Promote to channel</Text>
          {loadingIndicator}
        </Button>
      </View>
    );
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

const onError = () => {
  Alert.alert('Unknown error', 'Uhh... try again?', undefined, {
    cancelable: true,
  });
};

const ConnectedThreadSettingsPromoteSidebar: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsPromoteSidebar(
    props: BaseProps,
  ) {
    const { threadInfo } = props;
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const { onPromoteSidebar, loading } = usePromoteSidebar(
      threadInfo,
      onError,
    );

    return (
      <ThreadSettingsPromoteSidebar
        {...props}
        colors={colors}
        styles={styles}
        promoteSidebar={onPromoteSidebar}
        loadingStatus={loading}
      />
    );
  });

export default ConnectedThreadSettingsPromoteSidebar;
