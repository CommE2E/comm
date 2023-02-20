// @flow

import IonIcon from '@expo/vector-icons/Ionicons.js';
import * as React from 'react';
import { Text } from 'react-native';

import { threadTypeDescriptions } from 'lib/shared/thread-utils.js';
import { type ThreadInfo, threadTypes } from 'lib/types/thread-types.js';

import Button from '../../components/button.react.js';
import Modal from '../../components/modal.react.js';
import SWMansionIcon from '../../components/swmansion-icon.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { ComposeSubchannelRouteName } from '../../navigation/route-names.js';
import { type Colors, useStyles, useColors } from '../../themes/colors.js';

export type ComposeSubchannelModalParams = {
  +presentedFrom: string,
  +threadInfo: ThreadInfo,
};

type BaseProps = {
  +navigation: RootNavigationProp<'ComposeSubchannelModal'>,
  +route: NavigationRoute<'ComposeSubchannelModal'>,
};
type Props = {
  ...BaseProps,
  +colors: Colors,
  +styles: typeof unboundStyles,
};
class ComposeSubchannelModal extends React.PureComponent<Props> {
  render() {
    return (
      <Modal modalStyle={this.props.styles.modal}>
        <Text style={this.props.styles.visibility}>Chat type</Text>
        <Button style={this.props.styles.option} onPress={this.onPressOpen}>
          <SWMansionIcon
            name="globe-1"
            size={32}
            style={this.props.styles.visibilityIcon}
          />
          <Text style={this.props.styles.optionText}>Open</Text>
          <Text style={this.props.styles.optionExplanation}>
            {threadTypeDescriptions[threadTypes.COMMUNITY_OPEN_SUBTHREAD]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            style={this.props.styles.forwardIcon}
          />
        </Button>
        <Button style={this.props.styles.option} onPress={this.onPressSecret}>
          <SWMansionIcon
            name="lock-on"
            size={32}
            style={this.props.styles.visibilityIcon}
          />
          <Text style={this.props.styles.optionText}>Secret</Text>
          <Text style={this.props.styles.optionExplanation}>
            {threadTypeDescriptions[threadTypes.COMMUNITY_SECRET_SUBTHREAD]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            style={this.props.styles.forwardIcon}
          />
        </Button>
      </Modal>
    );
  }

  onPressOpen = () => {
    const threadInfo = this.props.route.params.threadInfo;
    this.props.navigation.navigate<'ComposeSubchannel'>({
      name: ComposeSubchannelRouteName,
      params: {
        threadType: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
        parentThreadInfo: threadInfo,
      },
      key:
        `${ComposeSubchannelRouteName}|` +
        `${threadInfo.id}|${threadTypes.COMMUNITY_OPEN_SUBTHREAD}`,
    });
  };

  onPressSecret = () => {
    const threadInfo = this.props.route.params.threadInfo;
    this.props.navigation.navigate<'ComposeSubchannel'>({
      name: ComposeSubchannelRouteName,
      params: {
        threadType: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
        parentThreadInfo: threadInfo,
      },
      key:
        `${ComposeSubchannelRouteName}|` +
        `${threadInfo.id}|${threadTypes.COMMUNITY_SECRET_SUBTHREAD}`,
    });
  };
}

const unboundStyles = {
  forwardIcon: {
    color: 'modalForegroundSecondaryLabel',
    paddingLeft: 10,
  },
  modal: {
    flex: 0,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  optionExplanation: {
    color: 'modalBackgroundLabel',
    flex: 1,
    fontSize: 14,
    paddingLeft: 20,
    textAlign: 'center',
  },
  optionText: {
    color: 'modalBackgroundLabel',
    fontSize: 20,
    paddingLeft: 5,
  },
  visibility: {
    color: 'modalBackgroundLabel',
    fontSize: 24,
    textAlign: 'center',
  },
  visibilityIcon: {
    color: 'modalBackgroundLabel',
    paddingRight: 3,
  },
};

const ConnectedComposeSubchannelModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedComposeSubchannelModal(
    props: BaseProps,
  ) {
    const styles = useStyles(unboundStyles);
    const colors = useColors();

    return (
      <ComposeSubchannelModal {...props} styles={styles} colors={colors} />
    );
  });

export default ConnectedComposeSubchannelModal;
