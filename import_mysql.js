
// I'm having a problem while looping through a directory with gziped json files with createReadStream. 
// But I'm probably not using the data/end events correctly because now only small json files that only trigger one data event is successfully parsed. 
// https://gist.github.com/rulex/f80d6a3da68b259a24eb#file-parser-js-L16-L23
//

var zlib = require('zlib'),
  fs = require('graceful-fs'),
  JSONStream = require('JSONStream'),
  mysql = require('mysql'),
  async = require('async');

var dir = './jsonfiles/',
  count = 0,
  myjson = "",
  inp,
  modes = [],
  gameTypeExamples = [],
  gz;

var dbug = { r: 0, g: 0, p: 0 };

var db; // database

var __dirname; // externally defined

// ca: BLUE_SCOREBOARD, RED_SCOREBOARD, BLUE_SCOREBOARD_QUITTERS, RED_SCOREBOARD_QUITTERS
// tdm: BLUE_SCOREBOARD, RED_SCOREBOARD, BLUE_SCOREBOARD_QUITTERS, RED_SCOREBOARD_QUITTERS
// ft: BLUE_SCOREBOARD, RED_SCOREBOARD, BLUE_SCOREBOARD_QUITTERS, RED_SCOREBOARD_QUITTERS
// dom: BLUE_SCOREBOARD, RED_SCOREBOARD, BLUE_SCOREBOARD_QUITTERS, RED_SCOREBOARD_QUITTERS
// harvester: BLUE_SCOREBOARD, RED_SCOREBOARD, BLUE_SCOREBOARD_QUITTERS, RED_SCOREBOARD_QUITTERS
// rr: SCOREBOARD, SCOREBOARD_QUITTERS
// ffa: SCOREBOARD, SCOREBOARD_QUITTERS
// race: RACE_SCOREBOARD, RACE_SCOREBOARD_QUITTERS ?

main();

function main() {
  var data = fs.readFileSync(__dirname + '/cfg.json');
  var cfg = JSON.parse(data);
  db = mysql.createConnection({
    host: cfg.mysql_db.host,
    database: cfg.mysql_db.database,
    user: cfg.mysql_db.user,
    password: cfg.mysql_db.password,
    multipleStatements: true,
  });
  db.connect();

  setInterval(function() {
    console.log(process.uptime());
    console.log(dbug);
  }, 5000);

  // read dir
  fs.readdir(dir, function (err, files) {
    if (err) {
      throw err;
    }
    async.eachLimit(files, 500, processFile, function(err2) {
      console.log(dbug);
      console.log('uptime: ' + process.uptime());
      if (err2) {
        throw err2;
      }
      process.exit();
    });
  });
}

function processFile(file, cb) {
  try {
    if (file.match(/.json$/)) {
      var data = fs.readFileSync(dir + file, { encoding: "UTF-8" });
      processJson(JSON.parse(data), createSafeCallback(file, cb));
    }
    else if (file.match(/.json.gz$/)) {
      var parser = JSONStream.parse();
      parser.on('root', function (obj) { processJson(obj, createSafeCallback(file, cb)); });
      inp = fs.createReadStream(dir + file);
      gz = inp.pipe(zlib.createGunzip());
      gz.pipe(parser);
    }
  } catch (ex) {
    console.log("processFile: " + file + ": " + ex);
    cb(null);
  }
}

function createSafeCallback(file, cb) {
  return function(err) {
    if (err)
      console.log(file + ": " + err);
    cb(null);
  };
}

function processJson(obj, cb) {
  dbug.r++;
// changed PUBLIC_ID to GAME_EXPIRES_FULL it is the last object in the json and fixes the crash
  if (!("GAME_EXPIRES_FULL" in obj)) {
    cb("Match data missing");
    return;
  }
  
  var i,p;
  var players_array = [];
  if ("SCOREBOARD" in obj) {
    for (i in obj.SCOREBOARD) {
      p = obj.SCOREBOARD[i];
      players_array.push(p);
    }
  }
  if ("SCOREBOARD_QUITTERS" in obj) {
    for (i in obj.SCOREBOARD_QUITTERS) {
      p = obj.SCOREBOARD_QUITTERS[i];
      players_array.push(p);
    }
  }
  if ("RACE_SCOREBOARD" in obj) {
    for (i in obj.RACE_SCOREBOARD) {
      p = obj.RACE_SCOREBOARD[i];
      players_array.push(p);
    }
  }
  if ("RACE_SCOREBOARD_QUITTERS" in obj) {
    for (i in obj.RACE_SCOREBOARD_QUITTERS) {
      p = obj.RACE_SCOREBOARD_QUITTERS[i];
      players_array.push(p);
    }
  }
  if ("RED_SCOREBOARD" in obj) {
    for (i in obj.RED_SCOREBOARD) {
      p = obj.RED_SCOREBOARD[i];
      players_array.push(p);
    }
  }
  if ("RED_SCOREBOARD_QUITTERS" in obj) {
    for (i in obj.RED_SCOREBOARD_QUITTERS) {
      p = obj.RED_SCOREBOARD_QUITTERS[i];
      players_array.push(p);
    }
  }
  if ("BLUE_SCOREBOARD" in obj) {
    for (i in obj.BLUE_SCOREBOARD) {
      p = obj.BLUE_SCOREBOARD[i];
      players_array.push(p);
    }
  }
  if ("BLUE_SCOREBOARD_QUITTERS" in obj) {
    for (i in obj.BLUE_SCOREBOARD_QUITTERS) {
      p = obj.BLUE_SCOREBOARD_QUITTERS[i];
      players_array.push(p);
    }
  }

  insertGameData(obj, players_array, cb);
}

function insertGameData(obj, player_array, cb) {
  var AVG_ACC = 0;
  var MOST_ACCURATE_NICK = "";
  var MOST_ACCURATE_NUM = 0;
  var DMG_DELIVERED_NICK = "";
  var DMG_DELIVERED_NUM = 0;
  var DMG_TAKEN_NICK = "";
  var DMG_TAKEN_NUM = 0;
  var LEAST_DEATHS_NICK = "";
  var LEAST_DEATHS_NUM = 0;
  var MOST_DEATHS_NICK = "";
  var MOST_DEATHS_NUM = 0;
  var TOTAL_ROUNDS = 0;
  var WINNING_TEAM = "";
  if (!isNaN(obj.AVG_ACC) && obj.AVG_ACC !== 'undefined') {
    AVG_ACC = obj.AVG_ACC;
  }
  if (typeof obj.MOST_ACCURATE !== 'undefined') {
    MOST_ACCURATE_NICK = obj.MOST_ACCURATE.PLAYER_NICK;
    MOST_ACCURATE_NUM = obj.MOST_ACCURATE.NUM;
  }
  if (typeof obj.DMG_DELIVERED !== 'undefined') {
    DMG_DELIVERED_NICK = obj.DMG_DELIVERED.PLAYER_NICK;
    DMG_DELIVERED_NUM = obj.DMG_DELIVERED.NUM;
  }
  if (typeof obj.DMG_TAKEN !== 'undefined') {
    DMG_TAKEN_NICK = obj.DMG_TAKEN.PLAYER_NICK;
    DMG_TAKEN_NUM = obj.DMG_TAKEN.NUM;
  }
  if (typeof obj.LEAST_DEATHS !== 'undefined') {
    LEAST_DEATHS_NICK = obj.LEAST_DEATHS.PLAYER_NICK;
    LEAST_DEATHS_NUM = obj.LEAST_DEATHS.NUM;
  }
  if (typeof obj.MOST_DEATHS !== 'undefined') {
    MOST_DEATHS_NICK = obj.MOST_DEATHS.PLAYER_NICK;
    MOST_DEATHS_NUM = obj.MOST_DEATHS.NUM;
  }
  if (typeof obj.TOTAL_ROUNDS !== 'undefined') {
    TOTAL_ROUNDS = obj.TOTAL_ROUNDS;
    WINNING_TEAM = obj.WINNING_TEAM;
  }
  var sql1 = 'INSERT INTO Games(' +
    'PUBLIC_ID,' +
    'OWNER, ' +
    'MAP, ' +
    'NUM_PLAYERS, ' +
    'AVG_ACC, ' +
    'PREMIUM, ' +
    'RANKED, ' +
    'RESTARTED, ' +
    'RULESET, ' +
    'TIER, ' +
    'TOTAL_KILLS, ' +
    'TOTAL_ROUNDS, ' +
    'WINNING_TEAM, ' +
    'TSCORE0, ' +
    'TSCORE1, ' +
    'FIRST_SCORER, ' +
    'LAST_SCORER, ' +
    'GAME_LENGTH, ' +
    'GAME_TYPE, ' +
    'GAME_TIMESTAMP, ' +
    'DMG_DELIVERED_NICK, ' +
    'DMG_DELIVERED_NUM, ' +
    'DMG_TAKEN_NICK, ' +
    'DMG_TAKEN_NUM, ' +
    'LEAST_DEATHS_NICK, ' +
    'LEAST_DEATHS_NUM, ' +
    'MOST_DEATHS_NICK, ' +
    'MOST_DEATHS_NUM, ' +
    'MOST_ACCURATE_NICK, ' +
    'MOST_ACCURATE_NUM ' +
    ') values( ';
  var sql2 = '' +
    '\"' + obj.PUBLIC_ID + '\",' +
    '\"' + obj.OWNER + '\",' +
    '\"' + obj.MAP + '\",' +
    '' + obj.NUM_PLAYERS + ',' +
    '' + AVG_ACC + ',' +
    '' + obj.PREMIUM + ',' +
    '' + obj.RANKED + ',' +
    '' + obj.RESTARTED + ',' +
    '' + obj.RULESET + ',' +
    '' + obj.TIER + ',' +
    '' + obj.TOTAL_KILLS + ',' +
    '' + TOTAL_ROUNDS + ',' +
    '\"' + WINNING_TEAM + '\",' +
    '' + obj.TSCORE0 + ',' +
    '' + obj.TSCORE1 + ',' +
    '\"' + obj.FIRST_SCORER + '\",' +
    '\"' + obj.LAST_SCORER + '\",' +
    '' + obj.GAME_LENGTH + ',' +
    '\"' + obj.GAME_TYPE + '\",' +
    '' + new Date(obj.GAME_TIMESTAMP).getTime() / 1000 + ',' +
    '\"' + DMG_DELIVERED_NICK + '\",' +
    '' + DMG_DELIVERED_NUM + ',' +
    '\"' + DMG_TAKEN_NICK + '\",' +
    '' + DMG_TAKEN_NUM + ',' +
    '\"' + LEAST_DEATHS_NICK + '\",' +
    '' + LEAST_DEATHS_NUM + ',' +
    '\"' + MOST_DEATHS_NICK + '\",' +
    '' + MOST_DEATHS_NUM + ',' +
    '\"' + MOST_ACCURATE_NICK + '\",' +
    '' + MOST_ACCURATE_NUM +
    ')';

  db.query(sql1 + sql2, function (err) {
    dbug.g++;
    if (!err || err.code == 'ER_DUP_ENTRY') {
      insertPlayerData(obj, player_array, cb);
    } else {
      console.log("Query: " + sql1 + sql2);
      console.log(err);
      cb(err);
    }
  });
}

// ------------------------------ Players ----------------------------
function insertPlayerData(obj, players_array, cb) {
  var sql3;
  var sql4 = [];
  sql3 = 'INSERT INTO Players(' +
    'PUBLIC_ID, ' +
    'PLAYER_NICK, ' +
    'PLAYER_CLAN, ' +
    'PLAYER_COUNTRY, ' +
    'RANK, ' +
    'SCORE, ' +
    'QUIT, ' +
    'DAMAGE_DEALT, ' +
    'DAMAGE_TAKEN, ' +
    'KILLS, ' +
    'DEATHS, ' +
    'HITS, ' +
    'SHOTS, ' +
    'TEAM, ' +
    'TEAM_RANK, ' +
    'HUMILIATION, ' +
    'IMPRESSIVE, ' +
    'EXCELLENT, ' +
    'PLAY_TIME, ' +
    'G_K, ' +
    'GL_H, ' +
    'GL_K, ' +
    'GL_S, ' +
    'LG_H, ' +
    'LG_K, ' +
    'LG_S, ' +
    'MG_H, ' +
    'MG_K, ' +
    'MG_S, ' +
    'PG_H, ' +
    'PG_K, ' +
    'PG_S, ' +
    'RG_H, ' +
    'RG_K, ' +
    'RG_S, ' +
    'RL_H, ' +
    'RL_K, ' +
    'RL_S, ' +
    'SG_H, ' +
    'SG_K, ' +
    'SG_S' +
    ') values ';
  for (var i in players_array) {
    var p = players_array[i];
    var IMPRESSIVE = 0;
    var EXCELLENT = 0;
    var SCORE = 0;
    var QUIT = 1;
    var TEAM = "";
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
    if (typeof p.TEAM !== 'undefined') {
      TEAM = p.TEAM;
    }
    if (typeof p.TEAM_RANK !== 'undefined') {
      TEAM_RANK = p.TEAM_RANK;
    }
    sql4.push('(' +
      '\"' + obj.PUBLIC_ID + '\",' +
      '\"' + p.PLAYER_NICK + '\",' +
      '\"' + p.PLAYER_CLAN + '\",' +
      '\"' + p.PLAYER_COUNTRY + '\",' +
      '' + p.RANK + ',' +
      '' + SCORE + ',' +
      '' + QUIT + ',' +
      '' + p.DAMAGE_DEALT + ',' +
      '' + p.DAMAGE_TAKEN + ',' +
      '' + p.KILLS + ',' +
      '' + p.DEATHS + ',' +
      '' + p.HITS + ',' +
      '' + p.SHOTS + ',' +
      '\"' + TEAM + '\",' +
      '' + TEAM_RANK + ',' +
      '' + p.HUMILIATION + ',' +
      '' + IMPRESSIVE + ',' +
      '' + EXCELLENT + ',' +
      '' + p.PLAY_TIME + ',' +
      '' + p.GAUNTLET_KILLS + ',' +
      '' + p.GRENADE_HITS + ',' +
      '' + p.GRENADE_KILLS + ',' +
      '' + p.GRENADE_SHOTS + ',' +
      '' + p.LIGHTNING_HITS + ',' +
      '' + p.LIGHTNING_KILLS + ',' +
      '' + p.LIGHTNING_SHOTS + ',' +
      '' + p.MACHINEGUN_HITS + ',' +
      '' + p.MACHINEGUN_KILLS + ',' +
      '' + p.MACHINEGUN_SHOTS + ',' +
      '' + p.PLASMA_HITS + ',' +
      '' + p.PLASMA_KILLS + ',' +
      '' + p.PLASMA_SHOTS + ',' +
      '' + p.RAILGUN_HITS + ',' +
      '' + p.RAILGUN_KILLS + ',' +
      '' + p.RAILGUN_SHOTS + ',' +
      '' + p.ROCKET_HITS + ',' +
      '' + p.ROCKET_KILLS + ',' +
      '' + p.ROCKET_SHOTS + ',' +
      '' + p.SHOTGUN_HITS + ',' +
      '' + p.SHOTGUN_KILLS + ',' +
      '' + p.SHOTGUN_SHOTS +
      ')');
  }

  db.query(sql3 + sql4.join(','), function (err) {
    dbug.p += players_array.length;
    if (err && err.code != 'ER_DUP_ENTRY') {
      console.log("Query: " + sql3 + sql4.join(","));
      console.log(err);
    }
    else
      err = null;
    cb(err);
  });
}