"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStatus = void 0;
var FileStatus;
(function (FileStatus) {
    FileStatus[FileStatus["Error"] = 0] = "Error";
    FileStatus[FileStatus["Unknow"] = 1] = "Unknow";
    FileStatus[FileStatus["NoUnderVersion"] = 2] = "NoUnderVersion";
    FileStatus[FileStatus["Add"] = 3] = "Add";
    FileStatus[FileStatus["Sync"] = 4] = "Sync";
    FileStatus[FileStatus["Modify"] = 5] = "Modify";
})(FileStatus || (exports.FileStatus = FileStatus = {}));
