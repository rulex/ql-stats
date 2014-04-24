/*
scan the directory configured in cfg.json as "loader.jsondir" and move all *.json[.gz] files 
based on their GAME_TIMESTAMP into subdirectories named YYYY-MM/DD/
*/
'use strict';

var
  fs = require('graceful-fs'),
  log4js = require('log4js'),
  zlib = require('zlib'),
  Q = require('q');

var LOGLEVEL = log4js.levels.INFO;

var __dirname; // current working directory (defined by node.js)
var _logger; // log4js logger
var _config; // config data from cfg.json file
var _progress = 0; // counter for already moved files
var _dirCache = {}; // dirname -> true, if a directory was already created

main();

function main() {
  var data = fs.readFileSync(__dirname + '/cfg.json');
  _config = JSON.parse(data);

  Q.longStackSupport = false;
  _logger = log4js.getLogger("loader");
  _logger.setLevel(LOGLEVEL);

  return Q
    .nfcall(fs.readdir, _config.loader.jsondir)
    .then(function (files) {
      _logger.info("Processing " + files.length + " files");
      setInterval(function () { _logger.info(_progress + " files processed"); }, 10000);
      var tasks = files.map(function (file) {
        return function () { return processFile(_config.loader.jsondir, file); }
      });
      return tasks.reduce(Q.when, Q(undefined));
    })
    .then(function () { _logger.info("completed"); process.exit(); })
    .done();
}

function processFile(dir, file) {
  var defer = Q.defer();
  if (!file.match(/.json(.gz)?$/))
    return file;
  var isGzip = file.slice(-3) == ".gz";
  //_logger.debug("Moving " + file);
  Q
    .nfcall(fs.readFile, dir + file)
    .then(function (data) { return isGzip ? Q.nfcall(zlib.gunzip, data) : data; })
    .then(function (json) {
      ++_progress;
      var game = JSON.parse(json);
      if (!game.PUBLIC_ID || !game.GAME_TIMESTAMP) {
        _logger.warn(file + ": no PUBLIC_ID or GAME_TIMESTAMP in json data. File was ignored.");
        defer.resolve(file);
        return file;
      }
      processGame(dir, file, game)
	  .then(defer.resolve(file));
    })
    .catch(function (err) { _logger.error(file + ": " + err); defer.resolve(file); })
  //.finally(function() { _logger.debug("finished " + file); })
  ;
  return defer.promise;
}

function processGame(dir, file, game) {
  // JSONs loaded from match profiles contain "mm/dd/yyyy h:MM a" format, live tracker contains unixtime int data
  var GAME_TIMESTAMP = game.GAME_TIMESTAMP; // can be either a number, an Object-number, a string, ... 
  if (GAME_TIMESTAMP.indexOf("/") >= 0) {
    GAME_TIMESTAMP = new Date(GAME_TIMESTAMP).getTime() / 1000;
  }
  var date = new Date(GAME_TIMESTAMP * 1000);
  if (date.getFullYear() == NaN)
    return Q(function () { _logger.warn(file + ": can't parse GAME_TIMESTAMP value " + game.GAME_TIMESTAMP); });
  var dirName1 = dir + date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
  var dirName2 = dirName1 + "/" + ("0" + date.getDate()).slice(-2);
  return createDir(dirName1)
    .then(createDir(dirName2))
    .then(function () {
      return Q.nfcall(fs.rename, dir + file, dirName2 + "/" + file);
    })
    .fail(function (err) { _logger.error("Can't move " + file + ": " + err); });
}

function createDir(dir) {
  if (_dirCache[dir])
    return Q(dir);
  var defer = Q.defer();
  // fs.mkdir returns an error when the directory already exists
  fs.mkdir(dir, function (err) {
    if (err && err.code != "EEXIST")
      defer.reject(err);
    else {
      _dirCache[dir] = true;
      defer.resolve(dir);
    }
  });
  return defer.promise;
}