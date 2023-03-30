// @flow

import * as React from 'react';

import type { ThreadInfo, ResolvedThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Button from './button.react.js';
import ColorSplotch from './color-splotch.react.js';
import { SingleLine } from './single-line.react.js';
import ThreadAvatar from './thread-avatar.react.js';
import { type Colors, useStyles, useColors } from '../themes/colors.js';
import type { ViewStyle, TextStyle } from '../types/styles.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

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
  +shouldRenderAvatars: boolean,
  +colors: Colors,
  +styles: typeof unboundStyles,
};
class ThreadListThread extends React.PureComponent<Props> {
  render() {
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;

    let avatar;
    if (this.props.shouldRenderAvatars) {
      avatar = (
        <ThreadAvatar size="small" threadID={this.props.threadInfo.id} />
      );
    } else {
      avatar = <ColorSplotch color={this.props.threadInfo.color} />;
    }

    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlayColor}
        iosActiveOpacity={0.85}
        style={[this.props.styles.button, this.props.style]}
      >
        {avatar}
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

const ConnectedThreadListThread: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadListThread(props: BaseProps) {
    const { threadInfo, ...rest } = props;
    const styles = useStyles(unboundStyles);
    const colors = useColors();
    const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);
    const shouldRenderAvatars = useShouldRenderAvatars();

    return (
      <ThreadListThread
        {...rest}
        threadInfo={resolvedThreadInfo}
        shouldRenderAvatars={shouldRenderAvatars}
        styles={styles}
        colors={colors}
      />
    );
  });

export default ConnectedThreadListThread;
