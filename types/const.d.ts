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
export interface DirectoryOptions {
    /**
     * 目录对应的远程url
     */
    url: string;
    /**
     * 目录名字，不能带多级目录
     */
    name: string;
    /**
     * 仅仅获取目录，不获取子文件
     */
    empty: boolean;
}
export interface UpdateOptions {
    /**
     * 基于更新目录的子目录，如果没有，则按照现有规则更新
     */
    dirs?: DirectoryOptions[];
    /**
     * 更新的工作目录，必须是本地有效的svn目录，不能是remote url
     */
    root: string;
}
export interface InfoOptions {
    /**
     * 从本地目录获取
     */
    cwd?: string;
    /**
     * 从远程url获取
     */
    url?: string;
}
export declare enum FileStatus {
    Error = 0,
    Unknow = 1,
    NoUnderVersion = 2,
    Add = 3,
    Sync = 4,
    Modify = 5
}
