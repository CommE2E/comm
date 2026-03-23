// @flow

import nodeFetch from 'node-fetch';
import path from 'path';
import { Writable } from 'stream';

import {
  BackupStorageSpaceExceededError,
  type BackupWriteStream,
  type DropboxStorageConfig,
  type StoredFileInfo,
} from './backup-storage.js';

type DropboxTokenResponse = {
  +access_token: string,
  ...
};

class DropboxRequestError extends Error {
  +status: number;
  +responseText: string;

  constructor(status: number, responseText: string) {
    super(`Dropbox request failed with status ${status}: ${responseText}`);
    this.status = status;
    this.responseText = responseText;
  }
}

class DropboxBackupStorageAdapter {
  +directory: string;
  +appKey: string;
  +appSecret: string;
  +refreshToken: string;

  constructor(config: DropboxStorageConfig) {
    this.directory = config.directory;
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.refreshToken = config.refreshToken;
  }

  async listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>> {
    const fileEntries: StoredFileInfo[] = [];
    let response = await this.rpcRequest('files/list_folder', {
      path: this.directory,
    });
    while (true) {
      for (const entry of response.entries) {
        if (entry['.tag'] !== 'file') {
          continue;
        }
        fileEntries.push({
          filename: path.posix.basename(entry.path_display ?? entry.name),
          lastModifiedTime: new Date(entry.server_modified).getTime(),
          byteCount: entry.size,
        });
      }
      if (!response.has_more) {
        break;
      }
      response = await this.rpcRequest('files/list_folder/continue', {
        cursor: response.cursor,
      });
    }
    return fileEntries;
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.rpcRequest('files/delete_v2', {
        path: this.filePath(filename),
      });
    } catch (error) {
      if (
        error instanceof DropboxRequestError &&
        error.status === 409 &&
        error.responseText.includes('not_found')
      ) {
        return;
      }
      throw error;
    }
  }

  async createWriteStream(filename: string): Promise<BackupWriteStream> {
    const accessToken = await this.refreshAccessToken();
    return new DropboxUploadWriteStream(this, accessToken, filename);
  }

  async uploadChunk(
    accessToken: string,
    sessionID: ?string,
    offset: number,
    chunk: Buffer,
  ): Promise<string> {
    if (!sessionID) {
      const response = await this.contentRequest(
        accessToken,
        'files/upload_session/start',
        { close: false },
        chunk,
      );
      return response.session_id;
    }
    await this.contentRequest(
      accessToken,
      'files/upload_session/append_v2',
      {
        cursor: {
          session_id: sessionID,
          offset,
        },
        close: false,
      },
      chunk,
    );
    return sessionID;
  }

  async finishUpload(
    accessToken: string,
    filename: string,
    sessionID: ?string,
    offset: number,
    chunk: Buffer,
  ): Promise<void> {
    if (!sessionID) {
      await this.contentRequest(
        accessToken,
        'files/upload',
        {
          path: this.filePath(filename),
          mode: { '.tag': 'overwrite' },
          autorename: false,
          mute: true,
        },
        chunk,
      );
      return;
    }
    await this.contentRequest(
      accessToken,
      'files/upload_session/finish',
      {
        cursor: {
          session_id: sessionID,
          offset,
        },
        commit: {
          path: this.filePath(filename),
          mode: { '.tag': 'overwrite' },
          autorename: false,
          mute: true,
        },
      },
      chunk,
    );
  }

  filePath(filename: string): string {
    return path.posix.join(this.directory, filename);
  }

  async refreshAccessToken(): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.refreshToken);
    params.append('client_id', this.appKey);
    params.append('client_secret', this.appSecret);

    const response = await nodeFetch(
      'https://api.dropboxapi.com/oauth2/token',
      {
        method: 'POST',
        body: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    if (!response.ok) {
      const responseText = await response.text();
      throw new DropboxRequestError(response.status, responseText);
    }
    const tokenResponse: DropboxTokenResponse = await response.json();
    return tokenResponse.access_token;
  }

  async rpcRequest(endpoint: string, payload: Object): Promise<any> {
    const accessToken = await this.refreshAccessToken();
    const response = await nodeFetch(
      `https://api.dropboxapi.com/2/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      const responseText = await response.text();
      throw mapDropboxError(response.status, responseText);
    }
    return await response.json();
  }

  async contentRequest(
    accessToken: string,
    endpoint: string,
    args: Object,
    content: Buffer,
  ): Promise<any> {
    const response = await nodeFetch(
      `https://content.dropboxapi.com/2/${endpoint}`,
      {
        method: 'POST',
        body: content,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify(args),
        },
      },
    );
    if (!response.ok) {
      const responseText = await response.text();
      throw mapDropboxError(response.status, responseText);
    }

    const responseText = await response.text();
    if (!responseText) {
      return {};
    }
    return JSON.parse(responseText);
  }
}

const dropboxChunkSize = 16 * 1024 * 1024;
class DropboxUploadWriteStream extends Writable {
  +adapter: DropboxBackupStorageAdapter;
  +accessToken: string;
  +filename: string;
  sessionID: ?string;
  offset: number;
  bufferedChunk: Buffer;

  constructor(
    adapter: DropboxBackupStorageAdapter,
    accessToken: string,
    filename: string,
  ) {
    super();
    this.adapter = adapter;
    this.accessToken = accessToken;
    this.filename = filename;
    this.sessionID = null;
    this.offset = 0;
    this.bufferedChunk = Buffer.alloc(0);
  }

  _write(
    chunk: Buffer | string,
    encoding: string,
    callback: (error?: Error) => void,
  ) {
    const buffer =
      typeof chunk === 'string'
        ? Buffer.from(chunk, verifyBufferEncoding(encoding))
        : chunk;
    void (async () => {
      try {
        await this.appendChunk(buffer);
        callback();
      } catch (error) {
        callback(error);
      }
    })();
  }

  _final(callback: (error?: Error) => void) {
    this.finish()
      .then(() => callback())
      .catch(callback);
  }

  async appendChunk(buffer: Buffer): Promise<void> {
    this.bufferedChunk = Buffer.concat([this.bufferedChunk, buffer]);
    while (this.bufferedChunk.length >= dropboxChunkSize) {
      const uploadChunk = this.bufferedChunk.subarray(0, dropboxChunkSize);
      this.sessionID = await this.adapter.uploadChunk(
        this.accessToken,
        this.sessionID,
        this.offset,
        uploadChunk,
      );
      this.offset += uploadChunk.length;
      this.bufferedChunk = this.bufferedChunk.subarray(dropboxChunkSize);
    }
  }

  async finish(): Promise<void> {
    await this.adapter.finishUpload(
      this.accessToken,
      this.filename,
      this.sessionID,
      this.offset,
      this.bufferedChunk,
    );
    this.bufferedChunk = Buffer.alloc(0);
  }

  getUploadedByteCount(): number {
    return this.offset;
  }
}

function verifyBufferEncoding(encoding: string): buffer$Encoding {
  switch (encoding) {
    case 'ascii':
    case 'utf8':
    case 'utf-8':
    case 'utf16le':
    case 'ucs2':
    case 'ucs-2':
    case 'base64':
    case 'latin1':
    case 'binary':
    case 'hex':
      return encoding;
    default:
      throw new Error(`unsupported buffer encoding: ${encoding}`);
  }
}

function mapDropboxError(status: number, responseText: string): Error {
  if (responseText.includes('insufficient_space')) {
    return new BackupStorageSpaceExceededError(responseText);
  }
  return new DropboxRequestError(status, responseText);
}

export { DropboxBackupStorageAdapter };
