// @flow

import caller from 'grpc-caller';

const protoPath = '../native/cpp/CommonCpp/grpc/protos/tunnelbroker.proto';
const deviceID = 'ks:256'; // harcoding this for now since we only have one keyserver

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
    const response: string = await this.client.sessionSignature({
      deviceID: deviceID,
    });
    return response;
  }

  async newSession(publicKey: Buffer, signature: string): Promise<string> {
    const response: string = await this.client.newSession({
      deviceID: deviceID,
      publicKey: publicKey,
      signature: signature,
      deviceType: 2, // enum variant for keyserver
      deviceAppVersion: process.env.npm_package_version,
      deviceOS: process.platform,
    });
    return response;
  }
}

export { GrpcClient };
