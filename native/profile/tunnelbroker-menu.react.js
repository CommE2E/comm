// @flow

import * as React from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { TunnelbrokerMessage } from 'lib/types/tunnelbroker/messages.js';

import type { ProfileNavigationProp } from './profile.react.js';
import Button from '../components/button.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +navigation: ProfileNavigationProp<'TunnelbrokerMenu'>,
  +route: NavigationRoute<'TunnelbrokerMenu'>,
};
// eslint-disable-next-line no-unused-vars
function TunnelbrokerMenu(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { connected, addListener, sendMessage, removeListener } =
    useTunnelbroker();
  const [messages, setMessages] = useState<TunnelbrokerMessage[]>([]);
  const [recipient, setRecipient] = useState('');

  const [message, setMessage] = useState('');

  const listener = React.useCallback((msg: TunnelbrokerMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  React.useEffect(() => {
    addListener(listener);
    return () => removeListener(listener);
  }, [addListener, listener, removeListener]);

  const onSubmit = React.useCallback(async () => {
    try {
      await sendMessage({ deviceID: recipient, payload: message });
    } catch (e) {
      console.error(e.message);
    }
  }, [message, recipient, sendMessage]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>INFO</Text>
      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Connected</Text>
          <Text style={styles.text}>{connected.toString()}</Text>
        </View>
      </View>

      <Text style={styles.header}>SEND MESSAGE</Text>

      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Recipient</Text>
          <TextInput
            style={styles.textInput}
            value={recipient}
            onChangeText={setRecipient}
          />
        </View>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Message</Text>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
          />
        </View>
        <Button
          onPress={onSubmit}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <Text style={styles.submenuText}>Send Message</Text>
        </Button>
      </View>

      <Text style={styles.header}>MESSAGES</Text>
      {messages.map(msg => (
        <View key={msg.messageID} style={styles.section}>
          <Text style={styles.submenuText}>{JSON.stringify(msg)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    marginVertical: 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
  text: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  textInput: {
    color: 'modalBackgroundLabel',
    flex: 1,
    fontSize: 16,
    margin: 0,
    padding: 0,
    borderBottomColor: 'transparent',
  },
};

export default TunnelbrokerMenu;
