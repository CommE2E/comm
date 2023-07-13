// @flow

type Emscripten$FileSystemType =
  | 'MEMFS'
  | 'NODEFS'
  | 'NODERAWFS'
  | 'IDBFS'
  | 'WORKERFS'
  | 'PROXYFS';

interface FS$Lookup {
  +path: string;
  +node: FS$FSNode;
}

interface FS$FSStream {}

interface FS$FSNode {}

interface FS$stats {
  +[key: string]: mixed;
}

export interface FS {
  // paths
  lookupPath(
    path: string,
    opts: { +parent: boolean, +follow: boolean },
  ): FS$Lookup;
  getPath(node: FS$FSNode): string;

  // nodes
  isFile(mode: number): boolean;
  isDir(mode: number): boolean;
  isLink(mode: number): boolean;
  isChrdev(mode: number): boolean;
  isBlkdev(mode: number): boolean;
  isFIFO(mode: number): boolean;
  isSocket(mode: number): boolean;

  // devices
  major(dev: number): number;
  minor(dev: number): number;
  makedev(ma: number, mi: number): number;
  registerDevice(dev: number, ops: any): void;

  // core
  syncfs(populate: boolean, callback: (e: any) => void): void;
  syncfs(callback: (e: any) => void, populate?: boolean): void;
  mount(
    type: Emscripten$FileSystemType,
    opts: { +[key: string]: mixed },
    mountpoint: string,
  ): void;
  unmount(mountpoint: string): void;

  mkdir(path: string, mode?: number): any;
  mkdev(path: string, mode?: number, dev?: number): void;
  symlink(oldpath: string, newpath: string): void;
  rename(old_path: string, new_path: string): void;
  rmdir(path: string): void;
  readdir(path: string): $ReadOnlyArray<string>;
  unlink(path: string): void;
  readlink(path: string): string;
  stat(path: string, dontFollow?: boolean): FS$stats;
  lstat(path: string): FS$stats;
  chmod(path: string, mode: number, dontFollow?: boolean): void;
  lchmod(path: string, mode: number): void;
  fchmod(fd: number, mode: number): void;
  chown(path: string, uid: number, gid: number, dontFollow?: boolean): void;
  lchown(path: string, uid: number, gid: number): void;
  fchown(fd: number, uid: number, gid: number): void;
  truncate(path: string, len: number): void;
  ftruncate(fd: number, len: number): void;
  utime(path: string, atime: number, mtime: number): void;
  open(
    path: string,
    flags: string,
    mode?: number,
    fd_start?: number,
    fd_end?: number,
  ): FS$FSStream;
  close(stream: FS$FSStream): void;
  llseek(stream: FS$FSStream, offset: number, whence: number): number;
  read(
    stream: FS$FSStream,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position?: number,
  ): number;
  write(
    stream: FS$FSStream,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position?: number,
    canOwn?: boolean,
  ): number;
  allocate(stream: FS$FSStream, offset: number, length: number): void;
  readFile(
    path: string,
    opts: { +encoding: 'binary', +flags?: string },
  ): Uint8Array;
  readFile(path: string, opts: { +encoding: 'utf8', +flags?: string }): string;
  writeFile(
    path: string,
    data: string | Uint8Array,
    opts?: { +flags?: string },
  ): void;

  // module-level FS code
  cwd(): string;
  chdir(path: string): void;
  init(
    input: null | (() => number | null),
    output: null | ((c: number) => void),
    error: null | ((c: number) => void),
  ): void;
}
