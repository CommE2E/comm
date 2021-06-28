// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import ThreadPill from '../../components/thread-pill.react';
import { MessageListRouteName } from '../../navigation/route-names';
import { useStyles } from '../../themes/colors';
import type { ThreadSettingsNavigate } from './thread-settings.react';

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
  +navigate: ThreadSettingsNavigate,
|};
type Props = {|
  ...BaseProps,
  +styles: typeof unboundStyles,
|};
class ThreadSettingsParent extends React.PureComponent<Props> {
  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button onPress={this.onPressParentThread}>
          <ThreadPill threadInfo={this.props.parentThreadInfo} />
        </Button>
      );
    } else if (this.props.threadInfo.parentThreadID) {
      parent = (
        <Text
          style={[
            this.props.styles.currentValue,
            this.props.styles.currentValueText,
            this.props.styles.noParent,
          ]}
          numberOfLines={1}
        >
          Secret parent
        </Text>
      );
    } else {
      parent = (
        <Text
          style={[
            this.props.styles.currentValue,
            this.props.styles.currentValueText,
            this.props.styles.noParent,
          ]}
          numberOfLines={1}
        >
          No parent
        </Text>
      );
    }
    return (
      <View style={this.props.styles.row}>
        <Text style={this.props.styles.label} numberOfLines={1}>
          Parent
        </Text>
        {parent}
      </View>
    );
  }

  onPressParentThread = () => {
    const threadInfo = this.props.parentThreadInfo;
    invariant(threadInfo, 'should be set');
    this.props.navigate({
      name: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}

const unboundStyles = {
  currentValue: {
    flex: 1,
  },
  currentValueText: {
    color: 'panelForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingRight: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 4,
    alignItems: 'center',
  },
};

export default React.memo<BaseProps>(function ConnectedThreadSettingsParent(
  props: BaseProps,
) {
  const styles = useStyles(unboundStyles);
  return <ThreadSettingsParent {...props} styles={styles} />;
});
