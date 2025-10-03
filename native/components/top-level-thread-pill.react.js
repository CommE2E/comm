// @flow

import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import { useKeyserverAdmin } from 'lib/shared/user-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import CommIcon from './comm-icon.react.js';
import Pill from './pill.react.js';
import SWMansionIcon from './swmansion-icon.react.js';
import ThreadPill from './thread-pill.react.js';
import { useColors } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

const threadPillRoundCorners = { left: false, right: true };

type Props = {
  +threadInfo: ThreadInfo,
};
function TopLevelThreadPill(props: Props): React.Node {
  const { threadInfo } = props;

  const keyserverAdmin = useKeyserverAdmin(threadInfo);
  const keyserverOperatorUsername = keyserverAdmin?.username;

  const colors = useColors();
  const keyserverOperatorLabel: ?React.Node = React.useMemo(() => {
    const topLevelThreadConfig =
      threadSpecs[threadInfo.type].protocol().presentationDetails
        .topLevelThread;

    let label;
    let icon;
    if (topLevelThreadConfig.type === 'keyserverAdmin') {
      if (!keyserverOperatorUsername) {
        return undefined;
      }
      icon = (
        <CommIcon
          name="cloud-filled"
          size={12}
          color={colors.panelForegroundLabel}
        />
      );
      label = keyserverOperatorUsername;
    } else if (topLevelThreadConfig.label === 'Local DM') {
      label = 'Local DM';
      icon = (
        <SWMansionIcon
          name="lock-on"
          size={18}
          color={colors.panelForegroundLabel}
        />
      );
    } else {
      label = 'Farcaster';
      icon = (
        <View style={styles.farcasterIcon}>
          <FarcasterLogo size={14} />
        </View>
      );
    }

    return (
      <Pill
        backgroundColor={colors.codeBackground}
        roundCorners={{ left: true, right: false }}
        label={label}
        icon={icon}
      />
    );
  }, [
    colors.codeBackground,
    colors.panelForegroundLabel,
    keyserverOperatorUsername,
    threadInfo.type,
  ]);

  return (
    <View style={styles.container}>
      {keyserverOperatorLabel}
      <ThreadPill
        threadInfo={threadInfo}
        roundCorners={threadPillRoundCorners}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  farcasterIcon: {
    alignItems: 'center',
    backgroundColor: '#855DCD',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    opacity: 0.7,
    width: 18,
  },
});

export default TopLevelThreadPill;
