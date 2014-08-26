var
  fs = require('graceful-fs'),
  zlib = require('zlib'),
  mysql = require('mysql2'),
  log4js = require('log4js'),
  Q = require('q');

exports.init = init;
exports.processGame = processGame;
exports.query = query;
exports.saveGameJson = saveGameJson;
exports.getCachedMap = getCachedMap;
exports.getCachedClan = getCachedClan;
exports.getCachedPlayer = getCachedPlayer;

var _sqlErrorQuery, _sqlErrorParams; // if an SQL error occurs, this can be printed for debugging purposes
var _conn; // DB connection
var _cache = { Map: {}, Clan: {}, Player: {} }; // NAME -> { ID [, ...] }; Player cache also contains CLAN_ID and COUNTRY
var _sqlInsertGame; // SQL statement to insert into Game table
var _sqlInsertGamePlayer; // SQL statement to insert into GamePlayer table
var _sqlUpdatePlayer; // SQL statement to update Player CLAN_ID and COUNTRY
var _logger; // log4js logger

//==========================================================================================
// SQL init
//==========================================================================================

// returns a Q promise to initialze the cache
function init(conn, options) {
  _logger = log4js.getLogger("ldcore");
  _logger.setLevel(log4js.levels.DEBUG);
 
  _conn = conn;
  createSqlStatements();
  if (!options || options.useCache !== false)
    return initCaches();
  return Q(undefined);
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
    'GAME_ID, PLAYER_ID, CLAN_ID, RANK, ' +
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

  _sqlUpdatePlayer = "UPDATE Player set CLAN_ID=?, COUNTRY=? where ID=?";
}

function initCaches() {
  return Q.all([initCache("Map"), initCache("Clan"), initCache("Player")]);
}

function initCache(table) {
  return query("select ID, NAME from " + table)
    .then(function (rows) {
      var cache = { count: rows.length };
      for (var i = 0, c = rows.length; i < c; i++)
        cache[rows[i].NAME.toLowerCase()] = { ID: rows[i].ID };
      _cache[table] = cache;
      _logger.info(table + " cache: " + cache.count);
      return cache;
    });
}

//==========================================================================================
// common game data processing
//==========================================================================================

function processGame(game) {
  return insertGame(game)
    .then(function (gameIdAndTimestamp) { return processGamePlayers(game, gameIdAndTimestamp[0], gameIdAndTimestamp[1]); })
    .catch(function (err) {
      if (err.toString().match(/uplicate/))
        _logger.debug("dupe: " + game.PUBLIC_ID);
      else
        _logger.error(game.PUBLIC_ID + " - " + err.stack + getQueryErrorInfo());
    });
}

function insertGame(g) {
  var playerStatsFields = ["DMG_DELIVERED", "DMG_TAKEN", "LEAST_DEATHS", "MOST_DEATHS", "MOST_ACCURATE"];
  var playerStatsNum = [0, 0, 0, 0, 0];
  var lookups = [{ ID: null }, { ID: null }, { ID: null }, { ID: null }, { ID: null }];
  var TOTAL_ROUNDS = 0;
  var WINNING_TEAM;
  var AVG_ACC = 0;
  var GAME_TYPE;
  var GAME_TIMESTAMP;
  if (!isNaN(g.AVG_ACC) && g.AVG_ACC !== 'undefined') {
    AVG_ACC = g.AVG_ACC;
  }

  GAME_TYPE = g.GAME_TYPE.substr(0, 4).toLowerCase();
  if (GAME_TYPE == "dm") GAME_TYPE = "ffa";
  else if (GAME_TYPE == "tour") GAME_TYPE = "duel";
  else if (GAME_TYPE == "1fct") GAME_TYPE = "fctf";

  // JSONs loaded from match profiles contain "mm/dd/yyyy h:MM a" format, live tracker contains unixtime int data
  GAME_TIMESTAMP = g.GAME_TIMESTAMP.toString(); // can be either a number, an Object-number, a string, ... 
  if (GAME_TIMESTAMP.indexOf("/") >= 0) {
    GAME_TIMESTAMP = new Date(GAME_TIMESTAMP).getTime() / 1000;
  }

  for (var i = 0, c = playerStatsFields.length; i < c; i++) {
    var obj = g[playerStatsFields[i]];
    if (obj) {
      lookups[i] = getCachedItem( "Player", { NAME: obj.PLAYER_NICK } );
      playerStatsNum[i] = obj.NUM;
    }
  }
  if (typeof g.TOTAL_ROUNDS !== 'undefined') {
    TOTAL_ROUNDS = g.TOTAL_ROUNDS;
    if (TOTAL_ROUNDS < 0) // some broken data contains -990
      TOTAL_ROUNDS = 0;
  }
  WINNING_TEAM = g.WINNING_TEAM == "Red" ? 1 : g.WINNING_TEAM == "Blue" ? 2 : 0;

  lookups.push(getCachedItem( "Player", { NAME: g.OWNER } ));
  lookups.push(getCachedItem( "Player", { NAME: g.FIRST_SCORER } ));
  lookups.push(getCachedItem( "Player", { NAME: g.LAST_SCORER } ));
  lookups.push(getCachedMap(g.MAP));

  return Q
    .all(lookups)
    .then(function (promises) {
      var values = getPromisedValues(promises);
      var data = [
        g.PUBLIC_ID, values[5].ID, values[8].ID, g.NUM_PLAYERS, AVG_ACC,
        parseInt(g.PREMIUM), parseInt(g.RANKED), parseInt(g.RESTARTED), parseInt(g.RULESET), parseInt(g.TIER),
        g.TOTAL_KILLS, TOTAL_ROUNDS, WINNING_TEAM, g.TSCORE0, g.TSCORE1,
        values[6].ID, values[7].ID, g.GAME_LENGTH, GAME_TYPE, GAME_TIMESTAMP,
        values[0].ID, playerStatsNum[0], values[1].ID, playerStatsNum[1], values[2].ID, playerStatsNum[2],
        values[3].ID, playerStatsNum[3], values[4].ID, playerStatsNum[4]
      ];
      data = data.map(function (value) { return Number.isNaN(value) ? null : value; });
      return query(_sqlInsertGame, data)
        .then(function (result) {
          _logger.debug("inserted game " + g.PUBLIC_ID + ": " + result.insertId);
          return [result.insertId, GAME_TIMESTAMP];
        });
    });
}

function processGamePlayers(g, gameId, gameTimestamp) {
  var players = [];
  var boardNames = [
    "SCOREBOARD", "SCOREBOARD_QUITTERS", "RACE_SCOREBOARD", "RACE_SCOREBOARD_QUITTERS",
    "RED_SCOREBOARD", "RED_SCOREBOARD_QUITTERS", "BLUE_SCOREBOARD", "BLUE_SCOREBOARD_QUITTERS"
  ];

  boardNames.forEach(function (boardName) {
    var board = g[boardName];
    if (board && board.length) {
      board.forEach(function (p) {
        players.push(p);
      });
    }
  });

  var promises = players.map(function (player) { return insertGamePlayer(player, gameId, gameTimestamp); });
  return Q.allSettled(promises);
}

function insertGamePlayer(p, gameId, timestamp) {
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

  var tasks = [getCachedPlayer(p), getCachedClan(p.PLAYER_CLAN)];

  return Q.
    all(tasks)
    .then(function (promises) {
      var values = getPromisedValues(promises);
      var player = values[0];
      var clan = values[1];
			var _hmg_shots = 0;
			var _hmg_hits = 0;
			var _hmg_kills = 0;
			if( 'HMG_HITS' in p && 'HMG_KILLS' in p && 'HMG_SHOTS' in p ) {
				_hmg_hits = p.HMG_HITS;
				_hmg_kills = p.HMG_KILLS;
				_hmg_shots = p.HMG_SHOTS;
			}
			else {
				_logger.debug( p.PUBLIC_ID + ' missing HMG' );
			}
      var data = [
        gameId, player.ID, player.CLAN_ID, p.RANK,
        SCORE, parseInt(QUIT), p.DAMAGE_DEALT, p.DAMAGE_TAKEN, p.KILLS,
        p.DEATHS, p.HITS, p.SHOTS, TEAM, TEAM_RANK,
        p.HUMILIATION, IMPRESSIVE, EXCELLENT, p.PLAY_TIME, p.GAUNTLET_KILLS,
        p.BFG_HITS, p.BFG_KILLS, p.BFG_SHOTS, p.CHAINGUN_HITS, p.CHAINGUN_KILLS, p.CHAINGUN_SHOTS,
        p.GRENADE_HITS, p.GRENADE_KILLS, p.GRENADE_SHOTS, p.LIGHTNING_HITS, p.LIGHTNING_KILLS, p.LIGHTNING_SHOTS,
        p.MACHINEGUN_HITS, p.MACHINEGUN_KILLS, p.MACHINEGUN_SHOTS, p.NAILGUN_HITS, p.NAILGUN_KILLS, p.NAILGUN_SHOTS,
        p.PLASMA_HITS, p.PLASMA_KILLS, p.PLASMA_SHOTS, p.PROXMINE_HITS, p.PROXMINE_KILLS, p.PROXMINE_SHOTS,
        p.RAILGUN_HITS, p.RAILGUN_KILLS, p.RAILGUN_SHOTS, p.ROCKET_HITS, p.ROCKET_KILLS, p.ROCKET_SHOTS,
        p.SHOTGUN_HITS, p.SHOTGUN_KILLS, p.SHOTGUN_SHOTS, _hmg_hits, _hmg_kills, _hmg_shots
      ];
      data = data.map(function (value) { return Number.isNaN(value) ? null : value; });

      // check if player has changed clan or country
      var isNewerData = !player.timestamp || player.timestamp < timestamp;
      if (isNewerData && (player.CLAN_ID != clan.ID && clan.ID || player.COUNTRY != p.PLAYER_COUNTRY && p.PLAYER_COUNTRY)) {
        _logger.debug("updating player " + p.PLAYER_NICK + ": old clan_id=" + player.CLAN_ID + ", country=" + player.COUNTRY + ", new clan_id=" + clan.ID + ", country=" + p.PLAYER_COUNTRY);
        if (clan.ID)
          player.CLAN_ID = clan.ID;
        if (p.PLAYER_COUNTRY)
          player.COUNTRY = p.PLAYER_COUNTRY;
        player.timestamp = timestamp;
        return query(_sqlUpdatePlayer, [player.CLAN_ID, player.COUNTRY, player.ID]).then(function () { return data; });
      }

      return data;
    })
    .then(function (data) { return query(_sqlInsertGamePlayer, data); })
    .fail(function (err) { _logger.error("#" + gameId + ", " + p.PLAYER_NICK + ": " + err.stack + getQueryErrorInfo()); });
}

function getCachedMap(name) {
  return getCachedItem("Map", { NAME: name });
}

function getCachedClan(name) {
  if( !name || name == "None" )
    return Q({ ID: null });
  return getCachedItem( "Clan", { NAME: name } );
}

function getCachedPlayer(obj) {
	return getCachedClan( obj.PLAYER_CLAN )
		.then( function( clan ) { return getCachedItem( "Player", { NAME: obj.PLAYER_NICK, CLAN_ID: clan.ID, COUNTRY: obj.PLAYER_COUNTRY } ); } );
}

function getCachedItem(table, objWithName) {
  if( ! 'NAME' in objWithName )
    return Q( { ID: null } );
  var lower = objWithName.NAME.toLowerCase();
  if (!_cache[table])
    _cache[table] = {};
  var entry = _cache[table][lower];
  if (typeof entry !== "undefined")
    return Q.isPromise(entry) ? entry : Q(entry); //  cached object or Promise

  var fields = "";
  var placeholders = "";
  var values = [];
  for (var key in objWithName) {
    fields += "," + key;
    placeholders += ",?";
    values.push(objWithName[key]);
  }
  var clone = JSON.parse(JSON.stringify(objWithName));
  var promise =
    query("insert into " + table + " (" + fields.substr(1) + ") values (" + placeholders.substr(1) + ")", values)
    .then(function (result) {
      _logger.debug("inserted " + table + " " + objWithName.NAME + ": " + result.insertId);
      clone.ID = result.insertId;
      _cache[table][lower] = clone;
      return clone;
    })
    .fail(function (err) {
      // if another loader runs in parallel, it might have already inserted the object
      return query("select ID from " + table + " where NAME=?", [objWithName.NAME])
        .then(function (result) {
          if (result.length == 1) {
            clone.ID = result[0].ID;
            _cache[table][lower] = clone;
            return clone;
          }
          throw err;
        });
    });
  _cache[table][lower] = promise;
  return promise;
}

function query(sql, params) {
  var defer = Q.defer();
  params = params || [];
  _conn.query(sql, params, function (err, result) {
    if (err) {
      _sqlErrorQuery = sql;
      _sqlErrorParams = JSON.stringify(params);
      defer.reject(new Error(err));
      //throw new Error(err);
      return;
    }
    _sqlErrorQuery = undefined;
    _sqlErrorParams = undefined;
    defer.resolve(result);
  });
  return defer.promise;
}

function getQueryErrorInfo() {
  return _sqlErrorQuery ? "\nQuery: " + _sqlErrorQuery + "\nParams: " + _sqlErrorParams : "";
}

function getPromisedValues(promisesOrValues) {
  return promisesOrValues.map(function (promiseOrValue) {
    return Q.isPromise(promiseOrValue) ? promiseOrValue.value : promiseOrValue;
  });
}

//==========================================================================================
// File system functions
//==========================================================================================

function saveGameJson(game, basedir) {
  // JSONs loaded from match profiles contain "mm/dd/yyyy h:MM a" format, live tracker contains unixtime int data
  var GAME_TIMESTAMP = game.GAME_TIMESTAMP; // can be either a number, an Object-number, a string, ... 
  if (GAME_TIMESTAMP.indexOf("/") >= 0) {
    GAME_TIMESTAMP = new Date(GAME_TIMESTAMP).getTime() / 1000;
  }
  var date = new Date(GAME_TIMESTAMP * 1000);
  var dirName1 = basedir + date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2);
  var dirName2 = dirName1 + "/" + ("0" + date.getDate()).slice(-2);
  var filePath = dirName2 + "/" + game.PUBLIC_ID + ".json.gz";
  _logger.debug("saving JSON: " + filePath);
  return createDir(dirName1)
    .then(createDir(dirName2))
    .then(function () {
      var json = JSON.stringify(game);
      return Q.nfcall(zlib.gzip, json);
    })
    .then(function (gzip) {
      return Q.nfcall(fs.writeFile, filePath, gzip);
    })
    .fail(function (err) { _logger.error("Can't save game JSON: " + err.stack); });
}

function createDir(dir) {
  var defer = Q.defer();
  // fs.mkdir returns an error when the directory already exists
  fs.mkdir(dir, function (err) {
    if (err && err.code != "EEXIST")
      defer.reject(err);
    else
      defer.resolve(dir);
  });
  return defer.promise;
}
