// @flow

import { getRustAPI } from 'rust-node-addon';

import type { TunnelbrokerClientClass } from 'lib/types/rust-binding-types.js';

class TunnelbrokerPublisher {
  client: ?TunnelbrokerClientClass;

  async connect() {
    if (!this.client) {
      const rustBinding = await getRustAPI();
      const tbClientBinding = rustBinding.TunnelbrokerClient;
      this.client = new tbClientBinding('keyserver', err => {
        if (err) {
          console.error('Error in Tunnelbroker publisher: ', err);
          return;
        }
      });
    }
    console.error('Tunnelbroker client is already connected');
  }

  async publish(toDeviceId: string, payload: string): Promise<void> {
    if (!this.client) {
      console.error('Tunnelbroker client is not available on publish');
      this.connect();
      return;
    }
    return await this.client.publish(toDeviceId, payload);
  }
}

const tunnelbrokerPublisher: TunnelbrokerPublisher =
  new TunnelbrokerPublisher();

export { tunnelbrokerPublisher };
