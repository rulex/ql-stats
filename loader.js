/*

*/
'use strict';

var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  async = require('async'),
  request = require('request'),
  log4js = require('log4js'),
  Q = require('q');

var LOGLEVEL = log4js.levels.INFO;

var __dirname; // externally defined
var _logger;
var _dbpool;
var _conn;
var _cache;
var _sqlInsertGame;
var _sqlInsertGamePlayer;
var _sqlErrorParams; // can be printed from an error handler for debugging
var _cookieJar;
var _adaptivePollDelaySec = 128; // must be power of 2, will be cut in half after first (=full) batch
var _lastGameTimestamp = "";

main();

function main() {
  Q.longStackSupport = true;
  var data = fs.readFileSync(__dirname + '/cfg.json');
  var cfg = JSON.parse(data);
  cfg.mysql_db.database = "qlstats2";

  _logger = log4js.getLogger();
  _logger.setLevel(LOGLEVEL);

  _dbpool = mysql.createPool(cfg.mysql_db);
  createSqlStatements();
  connect().then(initCaches)
    .then(function () { return processingLoop(cfg.loader.stream); })
    .fail(function (err) { _logger.error(err); })
    .done(function() { _logger.info("completed"); process.exit(); });
}

function processingLoop(useStream) {
  if (useStream) {
    _logger.info("fetching data from live game tracker");
    return loginToQuakeliveWebsite().then(fetchAndProcessJsonInfiniteLoop);
  } else {
    _logger.info("fetching data from files in ./jsons/ directory");
    throw new Error("Not Implemented");
  }
}

//==========================================================================================
// SQL init
//==========================================================================================

function createSqlStatements() {
  var cols =
      'PUBLIC_ID, OWNER_ID, MAP_ID, NUM_PLAYERS, AVG_ACC, ' +
      'PREMIUM, RANKED, RESTARTED, RULESET, TIER, ' +
      'TOTAL_KILLS, TOTAL_ROUNDS, WINNING_TEAM, TSCORE0, TSCORE1, ' +
      'FIRST_SCORER_ID, LAST_SCORER_ID, GAME_LENGTH, GAME_TYPE, GAME_TIMESTAMP, ' +
      'DMG_DELIVERED_ID, DMG_DELIVERED_NUM, DMG_TAKEN_ID, DMG_TAKEN_NUM, LEAST_DEATHS_ID, ' +
      'LEAST_DEATHS_NUM, MOST_DEATHS_ID, MOST_DEATHS_NUM, MOST_ACCURATE_ID, MOST_ACCURATE_NUM ';
  var vals = "";
  for (var i = 0, c = cols.split(",").length; i < c; i++)
    vals += ",?";
  _sqlInsertGame = 'INSERT INTO Game(' + cols + ") values (" + vals.substr(1) + ")";

  cols =
    'GAME_ID, PLAYER_ID, PLAYER_CLAN_ID, RANK, ' +
      'SCORE, QUIT, DAMAGE_DEALT, DAMAGE_TAKEN, KILLS, ' +
      'DEATHS, HITS, SHOTS, TEAM, TEAM_RANK, ' +
      'HUMILIATION, IMPRESSIVE, EXCELLENT, PLAY_TIME, G_K, ' +
      'BFG_H, BFG_K, BFG_S, CG_H, CG_K, CG_S, ' +
      'GL_H, GL_K, GL_S, LG_H, LG_K, LG_S, ' +
      'MG_H, MG_K, MG_S, NG_H, NG_K, NG_S, ' +
      'PG_H, PG_K, PG_S, PM_H, PM_K, PM_S, ' +
      'RG_H, RG_K, RG_S, RL_H, RL_K, RL_S, ' +
      'SG_H, SG_K, SG_S';
  vals = "";
  for (i = 0, c = cols.split(",").length; i < c; i++)
    vals += ",?";
  _sqlInsertGamePlayer = "INSERT INTO GamePlayer(" + cols + ") values (" + vals.substr(1) + ")";
}

function connect() {
  return Q.ninvoke(_dbpool, "getConnection");
}

function initCaches(conn) {
  _conn = conn;
  _cache = {};
  return Q.allSettled([initCache("Map"), initCache("Clan"), initCache("Player")]);
}

function initCache(table) {
  return query("select ID, NAME from " + table)
    .then(function (rows) {
      var cache = { count: rows.length };
      for (var i = 0, c = rows.length; i < c; i++)
        cache[rows[i].NAME.toLowerCase()] = rows[i].ID;
      _cache[table] = cache;
      _logger.info(table + " cache: " + cache.count);
      return cache;
    });
}

//==========================================================================================
// QL live data feed
//==========================================================================================

function loginToQuakeliveWebsite() {
  var defer = Q.defer();
  _cookieJar = request.jar();
  request({
      uri: "https://secure.quakelive.com/user/login",
      timeout: 10000,
      method: "POST",
      form: { submit: "", email: "horst.beham@gmx.at", pass: "5Chd1995rb" },
      jar: _cookieJar
    },
    function(err) {
      if (err) {
        _logger.error("Error logging in to quakelive.com: " + err);
        defer.reject(new Error(err));
      } else {
        _logger.info("Logged on to quakelive.com");
        defer.resolve(_cookieJar);
      }
    });
  return defer.promise;
}

function fetchAndProcessJsonInfiniteLoop() {
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
      jar: _cookieJar
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
  if (len < 40 && _adaptivePollDelaySec < 256) // up to ~4.3min
    _adaptivePollDelaySec *= 2;
  else if (len > 80 && _adaptivePollDelaySec > 16) // down to 16sec
    _adaptivePollDelaySec /= 2;
  _logger.info("Received " + len + " games. Next fetch in " + _adaptivePollDelaySec + "sec");

  if (len == 0)
    return true; // value doesnt matter

  _lastGameTimestamp = batch[0].GAME_TIMESTAMP;
  var tasks = [];
  batch.forEach(function(game) {
      tasks.push(Q.nfcall(fs.writeFile, __dirname + "/jsons/" + game.PUBLIC_ID, JSON.stringify(game)));
      tasks.push(processGame(game));
    }
  );
  return Q.allSettled(tasks); //.then(allSettledErrorHandler);
}

function sleepBetweenBatches() {
  var defer = Q.defer();
  setTimeout(function () { defer.resolve(); }, _adaptivePollDelaySec * 1000);
  return defer.promise;
}

function allSettledErrorHandler(promises) {
  if (!Array.isArray(promises)) return true;
  promises.forEach(function(promise) {
    if (promise.state == "rejected")
      throw new Error(promise.reason);
  });
  return true;
}

//==========================================================================================
// common game data processing
//==========================================================================================

function processGame(game) {
  return insertGame(game)
    .then(function(gameId) { return processGamePlayers(game, gameId); })
    .catch(function() { _logger.debug("error/dupe: " + game.PUBLIC_ID); });
}

function insertGame(g) {
  var playerStatsFields = ["MOST_ACCURATE", "DMG_DELIVERED", "DMG_TAKEN", "LEAST_DEATHS", "MOST_DEATHS"];
  var playerStatsNum = [0, 0, 0, 0, 0];
  var lookups = [null, null, null, null, null];
  var TOTAL_ROUNDS = 0;
  var WINNING_TEAM = "";
  var AVG_ACC = 0;
  if (!isNaN(g.AVG_ACC) && g.AVG_ACC !== 'undefined') {
    AVG_ACC = g.AVG_ACC;
  }

  for (var i = 0, c = playerStatsFields.length; i < c; i++) {
    var obj = g[playerStatsFields[i]];
    if (obj) {
      lookups[i] = getCachedItem("Player", obj.PLAYER_NICK);
      playerStatsNum[i] = obj.NUM;
    }
  }
  if (typeof g.TOTAL_ROUNDS !== 'undefined') {
    TOTAL_ROUNDS = g.TOTAL_ROUNDS;
    WINNING_TEAM = g.WINNING_TEAM;
  }

  lookups.push(getCachedItem("Player", g.OWNER));
  lookups.push(getCachedItem("Player", g.FIRST_SCORER));
  lookups.push(getCachedItem("Player", g.LAST_SCORER));
  lookups.push(getCachedItem("Map", g.MAP));

  return Q
    .allSettled(lookups)
    .then(function(promises) {
      var values = promises.map(function(promise) { return promise.value; });
      var data = [
        g.PUBLIC_ID, values[5], values[8], g.NUM_PLAYERS, AVG_ACC,
        parseInt(g.PREMIUM), parseInt(g.RANKED), parseInt(g.RESTARTED), parseInt(g.RULESET), parseInt(g.TIER),
        g.TOTAL_KILLS, TOTAL_ROUNDS, WINNING_TEAM, g.TSCORE0, g.TSCORE1,
        values[6], values[7], g.GAME_LENGTH, g.GAME_TYPE.substr(0,4), g.GAME_TIMESTAMP,
        values[0], playerStatsNum[0], values[1], playerStatsNum[1], values[2], playerStatsNum[2],
        values[3], playerStatsNum[3], values[4], playerStatsNum[4]
      ];
      data = data.map(function(value) { return Number.isNaN(value) ? null : value; });
      return query(_sqlInsertGame, data)
        .then(function(result) {
            _logger.debug("inserted game " + g.PUBLIC_ID + ": " + result.insertId);
          return result.insertId;
        });
    });
}

function processGamePlayers(g, gameId) {
  var players = [];
  var boardNames = [
    "SCOREBOARD", "SCOREBOARD_QUITTERS", "RACE_SCOREBOARD", "RACE_SCOREBOARD_QUITTERS",
    "RED_SCOREBOARD", "RED_SCOREBOARD_QUITTERS", "BLUE_SCOREBOARD", "BLUE_SCOREBOARD_QUITTERS"
  ];

  boardNames.forEach(function (boardName) {
    var board = g[boardName];
    if (board && board.length) {
      board.forEach(function(p) {
        players.push(p);
      });
    }
  });

  var promises = players.map(function(player) { return insertGamePlayer(player, gameId); });
  return Q.allSettled(promises);
}

function insertGamePlayer(p, gameId) {
  var IMPRESSIVE = 0;
  var EXCELLENT = 0;
  var SCORE = 0;
  var QUIT = 1;
  var TEAM = p.TEAM == "Red" ? 1 : p.TEAM == "Blue" ? 2 : 0;;
  var TEAM_RANK = 16;
  if (typeof p.IMPRESSIVE !== 'undefined') {
    IMPRESSIVE = p.IMPRESSIVE;
  }
  if (typeof p.EXCELLENT !== 'undefined') {
    EXCELLENT = p.EXCELLENT;
  }
  if (typeof p.SCORE !== 'undefined') {
    SCORE = p.SCORE;
  }
  if (typeof p.QUIT !== 'undefined') {
    QUIT = p.QUIT;
  }
  if (typeof p.TEAM_RANK !== 'undefined') {
    TEAM_RANK = p.TEAM_RANK;
  }

  var lookups = [
    getCachedItem("Player", p.PLAYER_NICK),
    getCachedItem("Clan", p.PLAYER_CLAN)
  ];

  return Q
    .allSettled(lookups)
    .then(function (promises) {
      var values = promises.map(function(promise) { return promise.value; });

      var data = [
        gameId, values[0], values[1], p.RANK,
        SCORE, parseInt(QUIT), p.DAMAGE_DEALT, p.DAMAGE_TAKEN, p.KILLS,
        p.DEATHS, p.HITS, p.SHOTS, TEAM, TEAM_RANK,
        p.HUMILIATION, IMPRESSIVE, EXCELLENT, p.PLAY_TIME, p.GAUNTLET_KILLS,
        p.BFG_HITS, p.BFG_KILLS, p.BFG_SHOTS, p.CHAINGUN_HITS, p.CHAINGUN_KILLS, p.CHAINGUN_SHOTS,
        p.GRENADE_HITS, p.GRENADE_KILLS, p.GRENADE_SHOTS, p.LIGHTNING_HITS, p.LIGHTNING_KILLS, p.LIGHTNING_SHOTS,
        p.MACHINEGUN_HITS, p.MACHINEGUN_KILLS, p.MACHINEGUN_SHOTS, p.NAILGUN_HITS, p.NAILGUN_KILLS, p.NAILGUN_SHOTS,
        p.PLASMA_HITS, p.PLASMA_KILLS, p.PLASMA_SHOTS, p.PROXMINE_HITS, p.PROXMINE_KILLS, p.PROXMINE_SHOTS,
        p.RAILGUN_HITS, p.RAILGUN_KILLS, p.RAILGUN_SHOTS, p.ROCKET_HITS, p.ROCKET_KILLS, p.ROCKET_SHOTS,
        p.SHOTGUN_HITS, p.SHOTGUN_KILLS, p.SHOTGUN_SHOTS
      ];
      data = data.map(function (value) { return Number.isNaN(value) ? null : value; });
      return data;
    })
    .then(function(data) { return query(_sqlInsertGamePlayer, data); })
    .then(function () {  });
}

function getCachedItem(table, key) {
  var lower = key.toLowerCase();
  var id = _cache[table][lower];
  if (typeof id !== "undefined")
    return Q(id); //  cached ID or Promise
  var promise = query("insert into " + table + " (NAME) values (?)", [key])
    .then(function (result) {
      _logger.debug("inserted " + table + " " + key + ": " + result.insertId);
      _cache[table][lower] = result.insertId;
      return result.insertId;
    });
  _cache[table][lower] = promise;
  return promise;
}

function query(sql, params) {
  var defer = Q.defer();
  params = params || {}; 
  _conn.query(sql, params, function (err, result) {
    if (err) {
      _sqlErrorParams = params;
      defer.reject(new Error(err));
      //throw new Error(err);
      return;
    }
    defer.resolve(result);
  });  
  return defer.promise;
}
