// @flow

import caller from 'grpc-caller';

const protoPath = '../native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto';
const deviceID = 'ks:256';

class GrpcClient {
  hostname: string;
  port: string;
  client: any;

  constructor(hostname: string, port: string) {
    this.hostname = hostname;
    this.port = port;

    this.client = caller(
      `${this.hostname}:${this.port}`,
      protoPath,
      'TunnelbrokerService',
    );
  }

  async sessionSignature(): Promise<string> {
    const res: string = await this.client.sessionSignature({
      deviceID: deviceID,
    });
    return res;
  }
}

export { GrpcClient };
