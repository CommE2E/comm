// @flow

import type { RedisClient } from 'redis';
import redis from 'redis';
import uuidv4 from 'uuid/v4.js';

import {
  redisMessageTypes,
  type RedisMessage,
  type UpdateTarget,
  type SessionIdentifier,
} from 'lib/types/redis-types.js';

import { getScriptContext } from '../scripts/script-context.js';

function channelNameForUpdateTarget(updateTarget: UpdateTarget): string {
  if (updateTarget.sessionID) {
    return `user.${updateTarget.userID}.${updateTarget.sessionID}`;
  } else {
    return `user.${updateTarget.userID}`;
  }
}

const redisConfig = (() => {
  if (!process.env.REDIS_URL) {
    return undefined;
  }
  return {
    url: process.env.REDIS_URL,
  };
})();

class RedisPublisher {
  client: ?RedisClient;

  get pub(): RedisClient {
    if (!this.client) {
      this.client = redis.createClient(redisConfig);
    }
    return this.client;
  }

  sendMessage(target: UpdateTarget, message: RedisMessage) {
    const channelName = channelNameForUpdateTarget(target);
    const stringifiedMessage = JSON.stringify(message);
    const scriptContext = getScriptContext();
    if (scriptContext && scriptContext.dryRun) {
      console.log(`Redis publish to ${channelName}: ${stringifiedMessage}`);
      return;
    }
    this.pub.publish(channelName, stringifiedMessage);
  }

  end() {
    this.client?.unref();
  }
}
const publisher: RedisPublisher = new RedisPublisher();

type OnMessage = (message: RedisMessage) => void | Promise<void>;
class RedisSubscriber {
  sub: RedisClient;
  instanceID: string;
  onMessageCallback: OnMessage;

  constructor(sessionIdentifier: SessionIdentifier, onMessage: OnMessage) {
    this.sub = redis.createClient(redisConfig);
    this.instanceID = uuidv4();
    this.onMessageCallback = onMessage;

    const { userID } = sessionIdentifier;
    this.sub.subscribe(channelNameForUpdateTarget({ userID }));
    this.sub.subscribe(channelNameForUpdateTarget(sessionIdentifier));

    publisher.sendMessage(sessionIdentifier, {
      type: redisMessageTypes.START_SUBSCRIPTION,
      instanceID: this.instanceID,
    });

    this.sub.on('message', this.onMessage);
  }

  static messageFromString(messageString: string): ?RedisMessage {
    try {
      return JSON.parse(messageString);
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  onMessage: (channel: string, messageString: string) => void = (
    channel,
    messageString,
  ) => {
    const message = RedisSubscriber.messageFromString(messageString);
    if (!message) {
      return;
    }
    if (message.type === redisMessageTypes.START_SUBSCRIPTION) {
      if (message.instanceID === this.instanceID) {
        return;
      } else {
        this.quit();
      }
    }
    this.onMessageCallback(message);
  };

  quit() {
    this.sub.quit();
  }
}

export { channelNameForUpdateTarget, publisher, RedisSubscriber };
