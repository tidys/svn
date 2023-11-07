export declare enum FileStatus {
    Error = 0,
    Unknow = 1,
    NoUnderVerion = 2,
    Add = 3,
    Sync = 4,
    Modify = 5
}
export declare class SVNRepoInfo {
    Error: string;
    Path: string;
    WorkingCopyRootPath: string;
    URL: string;
    RelativeURL: string;
    RepositoryRoot: string;
    RepositoryUUID: string;
    Revision: number;
    NodeKind: string;
    Schedule: string;
    LastChangedAuthor: string;
    LastChangedRev: number;
    LastChangedDate: string;
    parse(info: string): void;
}
export interface SVNOptions {
    repo: string;
    dir: string;
    checkout?: boolean;
}
export declare class SVN {
    protected repo: string;
    protected dir: string;
    autoLog: string;
    init(options: SVNOptions): void;
    private setRepo;
    push(files: string[]): void;
    import(files: string[]): void;
    static export(url: string, dir: string): void;
    static Commit(dir: string, files: string[]): void;
    private commit;
    private add;
    static Update(dir: string): void;
    update(): void;
    private dealError;
    upgrade(): void;
    private checkout;
    private existRepo;
    private getLocalRepoAddress;
    private isSameRepo;
    getFileStatus(file: string): FileStatus.Error | FileStatus.Unknow | FileStatus.NoUnderVerion | FileStatus.Add | FileStatus.Sync;
    isFileInRepo(file: string): boolean;
}
