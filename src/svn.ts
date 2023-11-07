import { FileStatus, SVNOptions } from "./const";
import { commandSync } from "execa";
import { existsSync } from "fs";
import { emptydirSync as emptyDirSync, ensureDirSync } from "fs-extra";
import { has, merge, toNumber } from "lodash";
import { join, relative, win32 } from "path";

export class SVNRepoInfo {
  Error: string = ""; // 如果仓库正常，是不应该出现错误的
  Path: string = "";
  WorkingCopyRootPath: string = "";
  URL: string = "";
  RelativeURL: string = "";
  RepositoryRoot: string = "";
  RepositoryUUID: string = "";
  Revision: number = 0;
  NodeKind: string = "";
  Schedule: string = "";
  LastChangedAuthor: string = "";
  LastChangedRev: number = 0;
  LastChangedDate: string = "";

  parse(info: string) {
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
              this.Revision = toNumber(val);
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
              this.LastChangedRev = toNumber(val);
              break;
            case "Last Changed Date":
              this.LastChangedDate = val;
              break;
          }
        } else {
          console.error("parse error");
        }
      }
    }
  }
}

export class SVN {
  protected repo: string = "";
  protected dir: string = "";
  public autoLog: string = "auto_commit_by_Jenkins";
  init(options: SVNOptions) {
    const { repo, dir, checkout } = merge({ check: true }, options);
    if (!repo) {
      console.log(`invalid svn repo: ${repo}`);
      process.exit(5);
    }

    this.setRepo(repo);
    this.dir = dir;
    ensureDirSync(dir);

    if (checkout) {
      let hasUpdate = false;
      if (this.existRepo()) {
        if (!this.isSameRepo()) {
          emptyDirSync(this.dir);
          hasUpdate = this.checkout(options.filter);
        }
      } else {
        hasUpdate = this.checkout(options.filter);
      }
      if (!hasUpdate) {
        this.update(options.filter);
      }
    }
  }
  private setRepo(repo: string) {
    if (repo.endsWith("/")) {
      repo = repo.slice(0, repo.length - 1);
    }
    if (repo.startsWith("http") || repo.startsWith("https")) {
      this.repo = repo;
      return;
    }
    if (existsSync(repo)) {
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
  push(files: string[]) {
    this.update();
    files = files.map((file) => {
      return relative(this.dir, file);
    });
    this.add(files);
    this.commit(files);
  }
  // 导入只能新增的文件，无法更新文件
  import(files: string[]) {
    files = files.map((file: string) => {
      return win32.join(file);
    });
    const filesStr = files.join(" ");
    const cmd = `svn import -m "import" ${filesStr} ${this.repo}`;
    console.log(cmd);
    const { stderr, stdout } = commandSync(cmd, { cwd: this.dir });
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
  }
  static export(url: string, dir: string) {
    if (!existsSync(dir)) {
      console.error(`unexist dir: ${dir}`);
      process.exit(-1);
    }
    const cmd = `svn export ${url} --force`;
    console.log(`export ${url} to ${dir}`);
    const { stderr, stdout } = commandSync(cmd, { cwd: dir });
    if (stderr) {
      console.log(stderr);
      process.exit(-1);
    }
    if (stdout) {
      //console.log(stdout)
    }
  }
  public static Commit(dir: string, files: string[]) {
    const cmd = `svn commit `;
  }
  private commit(files: string[]) {
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
      const { stderr, stdout } = commandSync(cmd, { cwd: this.dir });
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        // 有冲突
        console.log(stderr);
      }
    } catch (e: any) {
      this.dealError(e.stderr);
      process.exit(-1);
    }
  }
  private add(files: string[]) {
    const needAddFiles: string[] = [];
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
      const { stderr, stdout } = commandSync(cmd, { cwd: this.dir });
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.log(stderr);
      }
    } else {
      console.log(`no file need add to: ${this.repo}`);
    }
  }
  static Update(dir: string) {
    const cmd = "svn update";
    const { stderr, stdout } = commandSync(cmd, { cwd: dir });
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
  }
  update(subDirs: string[] = []) {
    // 判断sub dir是否存在
    const existDirs: string[] = [];
    for (let i = 0; i < subDirs.length; i++) {
      const dir = subDirs[i];
      const b = this.isFileInRepo(dir);
      if (b) {
        existDirs.push(dir);
      } else {
        console.log(`not exists ${dir}`);
      }
    }

    const cmd = `svn update ${existDirs.join(" ")}`;
    console.log(`${cmd} in ${this.dir}`);
    try {
      const { stderr, stdout } = commandSync(cmd, { cwd: this.dir });
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.log(stderr);
      }
    } catch (e: any) {
      if (this.dealError(e.stderr)) {
        this.update();
      }
    }
  }
  // 返回值表示是否处理成功，如果处理成功，命令再次尝试下
  private dealError(errorString: string) {
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
    const { stderr, stdout } = commandSync(`svn upgrade`, { cwd: this.dir });
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(`svn upgrade failed!!!`);
      process.exit(-1);
    }
  }
  private useName = "xuyanfeng";
  private password = "fengge20220301";
  private checkout(filter: string[] | undefined): boolean {
    let depth = "";
    const noFilter = typeof filter === undefined;
    if (!noFilter) {
      depth = "--depth empty"; // 先克隆空目录，在update新目录
    }
    const cmd = `svn checkout ${depth} ${this.repo} ./ --username ${this.useName} --password ${this.password}`;
    console.log(`${cmd}`);
    const { stderr, stdout } = commandSync(cmd, { cwd: this.dir });
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
    console.log("checkout success");
    if (!noFilter) {
      this.update(filter);
      return true;
    }
    return false;
  }
  private existRepo() {
    if (existsSync(this.dir)) {
      if (existsSync(join(this.dir, ".svn"))) {
        return true;
      } else {
        // 可能是svn的子目录
        return !!this.getLocalRepoAddress(this.dir);
      }
    }
    return false;
  }
  private getLocalRepoAddress(dir: string): string | null {
    if (existsSync(dir)) {
      try {
        const { stdout, stderr } = commandSync(`svn info`, { cwd: dir });
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
      } catch (e: any) {
        if (this.dealError(e.stderr)) {
          return this.getLocalRepoAddress(dir);
        } else {
          console.error(`unknow error`);
          return null;
        }
      }
    }
    return null;
  }

  private isSameRepo() {
    const { stdout, stderr } = commandSync(`svn info`, { cwd: this.dir });
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
  getFileStatus(file: string) {
    const { stdout, stderr } = commandSync(`svn st ${file}`, { cwd: this.dir });
    if (stderr) {
      return FileStatus.Error;
    }
    if (stdout.length === 0) {
      if (existsSync(join(this.dir, file))) {
        return FileStatus.Sync;
      } else {
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
  isFileInRepo(file: string) {
    return this.getFileStatus(file) !== FileStatus.NoUnderVerion;
  }
}
