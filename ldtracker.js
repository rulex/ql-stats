/*
 Download new game results from http://www.quakelive.com/tracker/ and add them to the database
*/
'use strict';


var
  fs = require('graceful-fs'),
  mysql = require('mysql'),
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
var _adaptivePollDelaySec = 15; // will be reduced to 60 after first (=full) batch. Values are 15,30,60,120
var _lastGameTimestamp = ""; // last timestamp retrieved from live game tracker, used to get next incremental set of games
var program = require( 'commander' );

program
	.version( '0.0.2' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.option( '-l, --loglevel <LEVEL>', 'Default is DEBUG. levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL' )
	.parse( process.argv );

main();

function main() {
  _logger = log4js.getLogger( "ldtracker" );
  _logger.setLevel( program.loglevel || log4js.levels.DEBUG );
  var data = fs.readFileSync( program.config || __dirname + '/cfg.json' );
  _config = JSON.parse(data);
  if (!(_config.loader.saveDownloadedJson || _config.loader.importDownloadedJson)) {
    _logger.error("At least one of loader.saveDownloadedJson or loader.importDownloadedJson must be set in cfg.json");
    process.exit();
  }
  _dbpool = mysql.createPool(_config.mysql_db);
  Q.longStackSupport = false;
  Q
    .ninvoke(_dbpool, "getConnection")
    .then(function(conn) {
      _conn = conn;
      return ld.init(conn);
    })
    .then(ld.loginToQuakeliveWebsite)
    .then(fetchAndProcessJsonInfiniteLoop)
    .fail(function (err) { _logger.error(err.stack); })
    .done(function() { _logger.info("completed"); process.exit(); });
}

//==========================================================================================
// QL live data tracker
//==========================================================================================


function fetchAndProcessJsonInfiniteLoop() {
  _logger.info("Fetching data from http://www.quakelive.com/tracker/from/");
  return requestJson()
    .then(processBatch)
    .fail(function (err) { _logger.error("Error processing batch: " + err); })
    .then(sleepBetweenBatches)
    .then(fetchAndProcessJsonInfiniteLoop);
}

function requestJson() {
  var defer = Q.defer();
  request(
    {
      uri: "http://www.quakelive.com/tracker/from/" + _lastGameTimestamp,
      timeout: 10000,
      method: "GET",
      jar: ld._cookieJar
    },
    function (err, resp, body) {
      if (err)
        defer.reject(new Error(err));
      else
        defer.resolve(body);
    });
  return defer.promise;
}

function processBatch(json) {
  var batch = JSON.parse(json);

  // adapt polling rate
  var len = batch.length;
  if( len < 40 && _adaptivePollDelaySec < 120 ) {
    _adaptivePollDelaySec *= 2;
	}
	else if( len == 100 ) {
		_adaptivePollDelaySec = 1;
		_logger.debug( "Received " + len + " games. Next fetch in " + _adaptivePollDelaySec + "sec" );
	}
  else if( len > 80 ) {
    _adaptivePollDelaySec /= 2;
	}
  _logger.info("Received " + len + " games. Next fetch in " + _adaptivePollDelaySec + "sec");

  if (len == 0)
    return undefined; // value doesnt matter

  _lastGameTimestamp = batch[0].GAME_TIMESTAMP;
  var tasks = [];
  batch.forEach(function(game) {
    if (_config.loader.saveDownloadedJson)
      tasks.push(ld.saveGameJson(game, _config.loader.jsondir));
    if (_config.loader.importDownloadedJson)
      tasks.push(ld.processGame(game));
   });
  return Q
    .allSettled(tasks)
    .catch(function (err) { _logger.error(err.stack); });
}

function sleepBetweenBatches() {
  var defer = Q.defer();
  setTimeout(function () { defer.resolve(); }, _adaptivePollDelaySec * 1000);
  return defer.promise;
}
