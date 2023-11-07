export interface SVNOptions {
  /**仓库的地址 */
  repo: string;
  /**仓库的本地存放目录 */
  dir: string;
  /**
   * 是否立即检出仓库
   */
  checkout?: boolean;
  /**
   * 只检出远程地址下的部分目录
   */
  filter?: string[];
}

export enum FileStatus {
  Error,
  Unknow,
  NoUnderVerion,
  Add,
  Sync, // 已经和服务器同步
  Modify,
}
