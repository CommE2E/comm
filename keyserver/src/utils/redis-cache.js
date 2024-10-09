// @flow

import type { RedisClient } from 'redis';
import redis from 'redis';

import type { NeynarChannel } from 'lib/types/farcaster-types.js';
import type { Identity } from 'lib/types/identity-service-types.js';

import { redisConfig } from '../socket/redis.js';

class RedisCache {
  _cacheClient: ?RedisClient;

  get cacheClient(): RedisClient {
    if (!this._cacheClient) {
      this._cacheClient = redis.createClient(redisConfig);
    }
    return this._cacheClient;
  }

  setChannelInfo(fcChannelID: string, fcChannel: NeynarChannel): Promise<void> {
    const stringifiedChannelInfo = JSON.stringify(fcChannel);
    return new Promise((resolve, reject) => {
      this.cacheClient.set(
        `channel:${fcChannelID}`,
        stringifiedChannelInfo,
        'EX',
        600, // item expires after 10 minutes
        err => {
          if (err) {
            return reject(err);
          }
          return resolve();
        },
      );
    });
  }

  getChannelInfo(fcChannelID: string): Promise<?NeynarChannel> {
    return new Promise((resolve, reject) => {
      this.cacheClient.get(`channel:${fcChannelID}`, (err, result) => {
        if (err) {
          return reject(err);
        }
        // Reset the expiration when the cached data is successfully retrieved
        this.cacheClient.expire(`channel:${fcChannelID}`, 600);
        return resolve(result ? JSON.parse(result) : null);
      });
    });
  }

  setUserIdentity(userID: string, userIdentity: Identity): Promise<void> {
    const stringifiedUserIdentity = JSON.stringify(userIdentity);
    return new Promise((resolve, reject) => {
      this.cacheClient.set(
        `user:${userID}`,
        stringifiedUserIdentity,
        'EX',
        60, // item expires after 1 minute
        err => {
          if (err) {
            return reject(err);
          }
          return resolve();
        },
      );
    });
  }

  getUserIdentity(userID: string): Promise<?Identity> {
    return new Promise((resolve, reject) => {
      this.cacheClient.get(`user:${userID}`, (err, result) => {
        if (err) {
          return reject(err);
        }
        // Reset the expiration when the cached data is successfully retrieved
        this.cacheClient.expire(`user:${userID}`, 60);
        return resolve(result ? JSON.parse(result) : null);
      });
    });
  }
}

const redisCache: RedisCache = new RedisCache();

export { redisCache };
