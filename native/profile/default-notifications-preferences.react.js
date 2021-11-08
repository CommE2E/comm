// @flow

import * as React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';

import Action from '../components/action-row.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import type { ProfileNavigationProp } from './profile.react';

const CheckIcon = () => (
  <SWMansionIcon
    name="check"
    size={20}
    color="#888888"
    style={unboundStyles.icon}
  />
);

type ProfileRowProps = {
  +content: string,
  +onPress: () => void,
  +danger?: boolean,
};

function NotificationRow(props: ProfileRowProps): React.Node {
  const { content, onPress, danger } = props;
  return (
    <Action.Row onPress={onPress}>
      <Action.Text {...{ danger, content }} />
      <CheckIcon />
    </Action.Row>
  );
}

type BaseProps = {
  +navigation: ProfileNavigationProp<>,
  +route: NavigationRoute<'DefaultNotifications'>,
};

type Props = {
  ...BaseProps,
  styles: typeof unboundStyles,
};

class DefaultNotificationsPreferences extends React.PureComponent<Props> {
  render() {
    const { styles } = this.props;
    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.scrollView}
      >
        <Text style={styles.header}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <NotificationRow content="All" onPress={() => {}} />
          <NotificationRow content="Background" onPress={() => {}} />
          <NotificationRow content="None" onPress={() => {}} />
        </View>
      </ScrollView>
    );
  }
}

const unboundStyles = {
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    marginVertical: 2,
  },
  icon: {
    lineHeight: Platform.OS === 'ios' ? 18 : 20,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
};

const ConnectedDefaultNotificationPreferences: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedDefaultNotificationPreferences(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    return <DefaultNotificationsPreferences {...props} {...{ styles }} />;
  },
);

export default ConnectedDefaultNotificationPreferences;
