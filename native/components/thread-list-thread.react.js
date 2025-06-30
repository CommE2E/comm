// @flow

import * as React from 'react';

import type {
  ResolvedThreadInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Button from './button.react.js';
import SingleLine from './single-line.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { TextStyle, ViewStyle } from '../types/styles.js';

const unboundStyles = {
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingLeft: 13,
  },
  text: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    paddingLeft: 9,
    paddingRight: 12,
    paddingVertical: 6,
  },
};

type SharedProps = {
  +onSelect: (threadID: string) => void,
  +style?: ViewStyle,
  +textStyle?: TextStyle,
};
type BaseProps = {
  ...SharedProps,
  +threadInfo: ThreadInfo,
};
type Props = {
  ...SharedProps,
  +threadInfo: ResolvedThreadInfo,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
};
class ThreadListThread extends React.PureComponent<Props> {
  render(): React.Node {
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;

    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlayColor}
        iosActiveOpacity={0.85}
        style={[this.props.styles.button, this.props.style]}
      >
        <ThreadAvatar size="S" threadInfo={this.props.threadInfo} />
        <SingleLine style={[this.props.styles.text, this.props.textStyle]}>
          {this.props.threadInfo.uiName}
        </SingleLine>
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.threadInfo.id);
  };
}

const ConnectedThreadListThread: React.ComponentType<BaseProps> = React.memo(
  function ConnectedThreadListThread(props: BaseProps) {
    const { threadInfo, ...rest } = props;
    const styles = useStyles(unboundStyles);
    const colors = useColors();
    const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);

    return (
      <ThreadListThread
        {...rest}
        threadInfo={resolvedThreadInfo}
        styles={styles}
        colors={colors}
      />
    );
  },
);

export default ConnectedThreadListThread;
