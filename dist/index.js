"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVN = exports.SVNRepoInfo = exports.FileStatus = void 0;
const execa_1 = require("execa");
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const lodash_1 = require("lodash");
const path_1 = require("path");
var FileStatus;
(function (FileStatus) {
    FileStatus[FileStatus["Error"] = 0] = "Error";
    FileStatus[FileStatus["Unknow"] = 1] = "Unknow";
    FileStatus[FileStatus["NoUnderVerion"] = 2] = "NoUnderVerion";
    FileStatus[FileStatus["Add"] = 3] = "Add";
    FileStatus[FileStatus["Sync"] = 4] = "Sync";
    FileStatus[FileStatus["Modify"] = 5] = "Modify";
})(FileStatus || (exports.FileStatus = FileStatus = {}));
class SVNRepoInfo {
    constructor() {
        this.Error = ""; // 如果仓库正常，是不应该出现错误的
        this.Path = "";
        this.WorkingCopyRootPath = "";
        this.URL = "";
        this.RelativeURL = "";
        this.RepositoryRoot = "";
        this.RepositoryUUID = "";
        this.Revision = 0;
        this.NodeKind = "";
        this.Schedule = "";
        this.LastChangedAuthor = "";
        this.LastChangedRev = 0;
        this.LastChangedDate = "";
    }
    parse(info) {
        info = decodeURI(info);
        const arr = info.split("\r\n");
        for (let i = 0; i < arr.length; i++) {
            const line = arr[i];
            if (line) {
                const dataArr = line.split(": ");
                if (dataArr.length === 2) {
                    let val = dataArr[1];
                    switch (dataArr[0]) {
                        case "Path":
                            this.Path = val;
                            break;
                        case "Working Copy Root Path":
                            this.WorkingCopyRootPath = val;
                            break;
                        case "URL": {
                            if (val.endsWith("/")) {
                                val = val.slice(0, val.length - 1);
                            }
                            this.URL = val;
                            break;
                        }
                        case "Relative URL":
                            this.RelativeURL = val;
                            break;
                        case "Repository Root":
                            this.RepositoryRoot = val;
                            break;
                        case "Repository UUID":
                            this.RepositoryUUID = val;
                            break;
                        case "Revision":
                            this.Revision = (0, lodash_1.toNumber)(val);
                            break;
                        case "Node Kind":
                            this.NodeKind = val;
                            break;
                        case "Schedule":
                            this.Schedule = val;
                            break;
                        case "Last Changed Author":
                            this.LastChangedAuthor = val;
                            break;
                        case "Last Changed Rev":
                            this.LastChangedRev = (0, lodash_1.toNumber)(val);
                            break;
                        case "Last Changed Date":
                            this.LastChangedDate = val;
                            break;
                    }
                }
                else {
                    console.error("parse error");
                }
            }
        }
    }
}
exports.SVNRepoInfo = SVNRepoInfo;
class SVN {
    constructor() {
        this.repo = "";
        this.dir = "";
        this.autoLog = "auto_commit_by_Jenkins";
    }
    init(options) {
        const { repo, dir, checkout } = (0, lodash_1.merge)({ check: true }, options);
        if (!repo) {
            console.log(`invalid svn repo: ${repo}`);
            process.exit(5);
        }
        this.setRepo(repo);
        this.dir = dir;
        (0, fs_extra_1.ensureDirSync)(dir);
        if (checkout) {
            if (this.existRepo()) {
                if (!this.isSameRepo()) {
                    (0, fs_extra_1.emptydirSync)(this.dir);
                    this.checkout();
                }
            }
            else {
                this.checkout();
            }
            this.update();
        }
    }
    setRepo(repo) {
        if (repo.endsWith("/")) {
            repo = repo.slice(0, repo.length - 1);
        }
        if (repo.startsWith("http") || repo.startsWith("https")) {
            this.repo = repo;
            return;
        }
        if ((0, fs_1.existsSync)(repo)) {
            // 本地仓库
            const url = this.getLocalRepoAddress(repo);
            if (url) {
                this.repo = url;
                return;
            }
        }
        console.error(`invalid repo: ${repo}`);
        process.exit(-1);
    }
    // 传递的是绝对路径
    push(files) {
        this.update();
        files = files.map((file) => {
            return (0, path_1.relative)(this.dir, file);
        });
        this.add(files);
        this.commit(files);
    }
    // 导入只能新增的文件，无法更新文件
    import(files) {
        files = files.map((file) => {
            return path_1.win32.join(file);
        });
        const filesStr = files.join(" ");
        const cmd = `svn import -m "import" ${filesStr} ${this.repo}`;
        console.log(cmd);
        const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: this.dir });
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log(stderr);
        }
    }
    static export(url, dir) {
        if (!(0, fs_1.existsSync)(dir)) {
            console.error(`unexist dir: ${dir}`);
            process.exit(-1);
        }
        const cmd = `svn export ${url} --force`;
        console.log(`export ${url} to ${dir}`);
        const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: dir });
        if (stderr) {
            console.log(stderr);
            process.exit(-1);
        }
        if (stdout) {
            //console.log(stdout)
        }
    }
    static Commit(dir, files) {
        const cmd = `svn commit `;
    }
    commit(files) {
        console.log(`svn commit files to: ${this.repo}`);
        files = files.filter((file) => {
            const status = this.getFileStatus(file);
            if (status === FileStatus.Sync) {
                return false;
            }
            console.log(`[${this.dir}] commit file: ${file}`);
            return true;
        });
        if (files.length <= 0) {
            console.log(`no file need to commit`);
            return;
        }
        const allFile = files.join(" ");
        const cmd = `svn commit ${allFile} -m "${this.autoLog}"`;
        try {
            const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: this.dir });
            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                // 有冲突
                console.log(stderr);
            }
        }
        catch (e) {
            this.dealError(e.stderr);
            process.exit(-1);
        }
    }
    add(files) {
        const needAddFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const status = this.getFileStatus(file);
            if (status === FileStatus.NoUnderVerion) {
                needAddFiles.push(file);
            }
        }
        if (needAddFiles.length) {
            const allFile = needAddFiles.join(" ");
            const cmd = `svn add ${allFile}`;
            console.log(`svn add files to: ${this.repo}`);
            const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: this.dir });
            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                console.log(stderr);
            }
        }
        else {
            console.log(`no file need add to: ${this.repo}`);
        }
    }
    static Update(dir) {
        const cmd = "svn update";
        const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: dir });
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log(stderr);
        }
    }
    update() {
        const cmd = "svn update";
        console.log(`${cmd} in ${this.dir}`);
        try {
            const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: this.dir });
            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                console.log(stderr);
            }
        }
        catch (e) {
            if (this.dealError(e.stderr)) {
                this.update();
            }
        }
    }
    // 返回值表示是否处理成功，如果处理成功，命令再次尝试下
    dealError(errorString) {
        console.log(decodeURI(errorString));
        const errFunc = [
            {
                err: "svn: E155036",
                func: () => {
                    // 工作空间需要upgrade
                    this.upgrade();
                },
            },
            {
                err: "svn: E155015",
                func: () => {
                    // 文件冲突了
                    console.log("files conflict");
                },
            },
        ];
        for (let i = 0; i < errFunc.length; i++) {
            const item = errFunc[i];
            if (errorString.indexOf(item.err) !== -1) {
                item.func();
                return true;
            }
        }
        return false;
    }
    upgrade() {
        const { stderr, stdout } = (0, execa_1.commandSync)(`svn upgrade`, { cwd: this.dir });
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.error(`svn upgrade failed!!!`);
            process.exit(-1);
        }
    }
    checkout() {
        console.log(`checkout: ${this.repo}`);
        const cmd = `svn checkout ${this.repo} ./ --username xuyanfeng --password fengge20220301`;
        const { stderr, stdout } = (0, execa_1.commandSync)(cmd, { cwd: this.dir });
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log(stderr);
        }
        console.log("checkout success");
    }
    existRepo() {
        if ((0, fs_1.existsSync)(this.dir)) {
            if ((0, fs_1.existsSync)((0, path_1.join)(this.dir, ".svn"))) {
                return true;
            }
            else {
                // 可能是svn的子目录
                return !!this.getLocalRepoAddress(this.dir);
            }
        }
        return false;
    }
    getLocalRepoAddress(dir) {
        if ((0, fs_1.existsSync)(dir)) {
            try {
                const { stdout, stderr } = (0, execa_1.commandSync)(`svn info`, { cwd: dir });
                if (stderr) {
                    return null;
                }
                if (stdout) {
                    const ret = new SVNRepoInfo();
                    ret.parse(stdout);
                    if (!ret.Error) {
                        return ret.URL;
                    }
                }
            }
            catch (e) {
                if (this.dealError(e.stderr)) {
                    return this.getLocalRepoAddress(dir);
                }
                else {
                    console.error(`unknow error`);
                    return null;
                }
            }
        }
        return null;
    }
    isSameRepo() {
        const { stdout, stderr } = (0, execa_1.commandSync)(`svn info`, { cwd: this.dir });
        if (stderr) {
            return false;
        }
        if (stdout) {
            //console.log(stdout)
            const info = new SVNRepoInfo();
            info.parse(stdout);
            return info.URL === this.repo;
        }
        return false;
    }
    getFileStatus(file) {
        const { stdout, stderr } = (0, execa_1.commandSync)(`svn st ${file}`, { cwd: this.dir });
        if (stderr) {
            return FileStatus.Error;
        }
        if (stdout.length === 0) {
            if ((0, fs_1.existsSync)((0, path_1.join)(this.dir, file))) {
                return FileStatus.Sync;
            }
            else {
                return FileStatus.NoUnderVerion;
            }
        }
        if (stdout.startsWith("?")) {
            return FileStatus.NoUnderVerion;
        }
        if (stdout.startsWith("A")) {
            return FileStatus.Add;
        }
        return FileStatus.Unknow;
    }
    isFileInRepo(file) {
        return this.getFileStatus(file) !== FileStatus.NoUnderVerion;
    }
}
exports.SVN = SVN;
