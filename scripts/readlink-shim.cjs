/**
 * This project lives on a volume where Node's readlink returns EISDIR for
 * ordinary files. Webpack and Turbopack treat that as a hard failure.
 * Normalize it to EINVAL, which those tools already handle as "not a link".
 */
const fs = require("node:fs");

function asNotLink(error) {
  if (error && (error.code === "EISDIR" || error.code === "ENOTDIR" || error.code === "UNKNOWN")) {
    const wrapped = new Error("EINVAL: invalid argument, readlink");
    wrapped.code = "EINVAL";
    wrapped.errno = error.errno;
    wrapped.syscall = "readlink";
    wrapped.path = error.path;
    return wrapped;
  }
  return error;
}

const readlinkSync = fs.readlinkSync;
fs.readlinkSync = function readlinkSyncShim(...args) {
  try {
    return readlinkSync.apply(fs, args);
  } catch (error) {
    throw asNotLink(error);
  }
};

const readlink = fs.readlink;
fs.readlink = function readlinkShim(path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  const done = typeof callback === "function" ? callback : undefined;
  if (!done) {
    return readlink.call(fs, path, options);
  }
  return readlink.call(fs, path, options, (error, link) => {
    if (error) done(asNotLink(error));
    else done(null, link);
  });
};

const readlinkPromise = fs.promises.readlink.bind(fs.promises);
fs.promises.readlink = async function readlinkPromiseShim(...args) {
  try {
    return await readlinkPromise(...args);
  } catch (error) {
    throw asNotLink(error);
  }
};
