/*

*/
'use strict';

var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  async = require('async'),
  Q = require('q'),
  $ = require('jquery');

var __dirname; // externally defined
var _dbpool;
var _conn;
var _cache;
var _sqlInsertGame;
var _sqlInsertGamePlayer;
var DEBUG = false;

main();

function main() {
  Q.longStackSupport = true;
  var data = fs.readFileSync(__dirname + '/cfg.json');
  var cfg = JSON.parse(data);
  cfg.mysql_db.database = "qlstats2";
  _dbpool = mysql.createPool(cfg.mysql_db);

  createSqlStatements();

  connect()
    .then(initCaches)
    .then(loadJson)
    .then(processJson)
    .done(function() { process.exit(); });
}

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
      console.log(table + " cache: " + cache.count);
    return cache;
  });
}

function loadJson() {
  var fileName = "00000000.json";
  return Q
    .nfcall(fs.readFile, __dirname + "/jsons/" + fileName)
    .then(function(json) {
      debug("loaded " + fileName);
      return JSON.parse(json);
  });
}

function processJson(data) {
  var promises = data.map(function (game) { return processGame(game); });
  return Q.allSettled(promises).then(function () { console.log("JSON completed"); });
}

function processGame(game) {
  return insertGame(game)
    .then(function(gameId) { return processGamePlayers(game, gameId); })
    .catch(function() { console.log("error/dupe: " + game.PUBLIC_ID); });
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
            debug("inserted game " + g.PUBLIC_ID + ": " + result.insertId);
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
      debug("inserted " + table + " " + key + ": " + result.insertId);
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
      debug(params);
      defer.reject(new Error(err));
      //throw new Error(err);
      return;
    }
    defer.resolve(result);
  });  
  return defer.promise;
}

function debug(text) {
  if (DEBUG)
    console.log(text);
}