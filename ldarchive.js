/*
  Load .json[.gz] file archive into database.
*/
'use strict';

var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  async = require('async'),
  request = require('request'),
  log4js = require('log4js'),
  zlib = require('zlib'),
  Q = require('q'),
  ld = require('./ldcore.js');

var __dirname; // current working directory (defined by node.js)
var _logger; // log4js logger
var _config; // config data from cfg.json file
var _dbpool; // DB connection pool
var _conn; // DB connection
var _cookieJar; // www.quakelive.com login cookies
var _profilingInfo;

main();

function main() {
  _logger = log4js.getLogger("ldarchive");
  _logger.setLevel(log4js.levels.INFO);
  var data = fs.readFileSync(__dirname + '/cfg.json');
  _config = JSON.parse(data);
  _dbpool = mysql.createPool(_config.mysql_db);
  Q.longStackSupport = false;
  Q
    .ninvoke(_dbpool, "getConnection")
    .then(function (conn) {
      _conn = conn;
      return ld.init(conn);
    })
    .then(loginToQuakeliveWebsite)
    .then(loadAndProcessJsonFileLoop)
    .fail(function (err) { _logger.error(err.stack); })
    .done(function () { _logger.info("completed"); process.exit(); });
}

//==========================================================================================
// file data feed
//==========================================================================================

function Stats() {
  this.incProcessed = function() {
    ++this.total;
    ++this.processed;
  }
  this.incSkipped = function () {
    ++this.total;
    ++this.skipped;
  }
  this.reset = function () {
    this.timestamp = new Date().getTime();
    this.processed = 0;
    this.skipped = 0;
  }
  this.reset();
  this.total = 0;
  this.timestamp0 = this.timestamp;
}

function loadAndProcessJsonFileLoop() {
  _profilingInfo = new Stats();
  setInterval(function() {
    _logger.info("" + (_profilingInfo.processed / 30) + " games/sec (" + _profilingInfo.total + " total)");
    _profilingInfo.reset();
  }, 30000);

  return loadAndProcessJsonFilesInDirectory(_config.loader.jsondir)
    .then(function() {
      var secs = (new Date().getTime() - _profilingInfo.timestamp0) / 1000;
      _logger.info("Total time: " + secs + " sec. Game files found: " + _profilingInfo.total
        + ", loaded: " + _profilingInfo.processed + ", skipped: " + _profilingInfo.skipped);
    });
}

function loadAndProcessJsonFilesInDirectory(dir) {
  _logger.info("Loading data from " + dir + "*.json[.gz]");
  return Q
    .nfcall(fs.readdir, dir)
    .then(function (files) {
      var subDirs = [];
      var tasks = files.map(function (file) {
        var path = dir + file;
        var stats = fs.statSync(path);
        if (stats.isDirectory()) {
          subDirs.push(path + "/");
          return undefined;
        } else
          return function() { return processFile(path); }
      });
      subDirs.forEach(function(subdir) {
        tasks.push(function() { return loadAndProcessJsonFilesInDirectory(subdir); });
      });
      return tasks.reduce(Q.when, Q(undefined));
    });
}

function processFile(file) {
  if (!file.match(/.json(.gz)?$/))
    return undefined;
  var isGzip = file.slice(-3) == ".gz";
  var basename;
  var match = file.match(/.*[\/\\]([^\.]*).*/);
  if (match)
    basename = match[1];
  return Q
    .fcall(function() { return basename ? query("select ID from Game where PUBLIC_ID=?", [basename]) : []; })
    .then(function (result) {
      if (result.length > 0) {
        _logger.debug("Skipping " + file + " (already in database)");
        _profilingInfo.incSkipped();
        return true;
      }
      return Q
        .fcall(function() { _logger.debug("Loading " + file); })
        .then(function() { return Q.nfcall(fs.readFile, file); })
        .then(function(data) { return isGzip ? Q.nfcall(zlib.gunzip, data) : data; })
        .then(function(json) {
          var game = JSON.parse(json);
          if (!game.PUBLIC_ID) {
            _logger.warn(file + ": no PUBLIC_ID in json data. File was ignored.");
            return undefined;
          }
          return ld.processGame(game)
            .then(function() { _profilingInfo.incProcessed(); });
        });
    })
    .catch(function (err) { _logger.error(file + ": " + err); });
}
