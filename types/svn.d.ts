import { FileStatus, SVNOptions, UpdateOptions } from "./const";
export declare class SVNRepoInfo {
    Exist: boolean;
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
export declare class SVN {
    protected repo: string;
    protected dir: string;
    autoLog: string;
    init(options: SVNOptions): void;
    private checkSubDirectory;
    private setRepo;
    push(files: string[]): void;
    import(files: string[]): void;
    static export(url: string, dir: string): void;
    commit(files: string[]): void;
    private add;
    static Update(dir: string): void;
    private _updateCommand;
    update(options: UpdateOptions): void;
    private dealError;
    upgrade(): void;
    private useName;
    private password;
    private checkout;
    private existRepo;
    private getSnvInfo;
    private getLocalRepoAddress;
    private isSameRepo;
    getFileStatus(file: string): FileStatus.Error | FileStatus.Unknow | FileStatus.NoUnderVersion | FileStatus.Add | FileStatus.Sync;
    isFileInRepo(repo: string, file?: string): boolean;
}
