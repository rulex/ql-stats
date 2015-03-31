var request = require( 'request' );
var cheerio = require( 'cheerio' );
var fs = require( 'fs' );
var mysql = require( 'mysql' );
var express = require( 'express' );
var app = express();
app.enable( "jsonp callback" );
var http = require( 'http' );
var url = require( 'url' );
var server = http.createServer( app );
var zlib = require( 'zlib' );
var Q = require( 'q' );
var log4js = require( 'log4js' );
var race = require('./racecache.js');
var allow_update = false;
var bodyParser = require( 'body-parser' );
var program = require( 'commander' );
var compress = require( 'compression' );
var os = require( 'os' );
var logger = require ( 'morgan' );

program
	.version( '0.0.3' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.option( '-l, --loglevel <LEVEL>', 'Default is DEBUG. levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL' )
	.option( '-n, --nologin', 'Don\'t log in to quakelive.com. For use with */update & */get routes' )
	.parse( process.argv );

_logger = log4js.getLogger( 'api' );
_logger.setLevel( log4js.levels[program.level] || log4js.levels.DEBUG );

// read cfg.json
var data = fs.readFileSync( program.config || __dirname + '/cfg.json' );
var cfg;
try {
	cfg = JSON.parse( data );
	_logger.info( 'Parsed config file' );
}
catch( err ) {
	_logger.error( 'failed to parse cfg: ' + err );
	process.exit();
}

var Countries = require( './public/countries.json' );

//multipleStatements: true,
cfg.mysql_db.multipleStatements = true;
cfg.mysql_db.waitForConnections = false;
cfg.mysql_db.connectionLimit = 15;
var dbpool = mysql.createPool( cfg.mysql_db );

// core
var ldcore = require( './ldcore.js' );
ldcore.init( dbpool, { useCache: false, loglevel: program.loglevel } );
if( program.nologin ) {
	ldcore.loginToQuakeliveWebsite();
}

// counter
var requests_counter = 0;
var requests_counter_api = 0;
var requests_counter_pub = 0;
var requests_counter_total = 0;

// cache
var qlscache = require( './qlscache.js' );
qlscache.init( cfg, program.loglevel );

var maxAge_public, maxAge_api, http_cache_time;
var env = process.env.NODE_ENV || 'development';
if( 'development' == env ) {
	// dev env should not use 
	maxAge_public   = 0;
	maxAge_api      = 0;
	maxAge_api_long = 0;
	http_cache_time = 0;
}
if( 'production' == env ) {
	allow_update    = true;
	maxAge_public   = 24*60*60*1000;
	maxAge_api      = 60*1000;
	maxAge_api_long = 60*60*1000;
	http_cache_time = 60*60;
}

// gzip/compress
//app.use( compress() );
// http console logger
app.use( log4js.connectLogger( _logger, { level: log4js.levels.INFO, format: ':response-timems :method :url ' } ) );
// http log to file
var logFile = fs.createWriteStream( cfg.api.httplogfile, { flags: 'w' } );
app.use( logger ('combined', {stream: logFile }));
app.use( bodyParser.urlencoded( { extended: true } ) );
// count requests made
app.use( function( req, res, next ) {
	++requests_counter;
	++requests_counter_pub;
	++requests_counter_total;
	next();
} );
// serve static html files
app.use( express.static( __dirname + '/public', { maxAge: maxAge_public } ) );
// serve saved games from /get/game/<PUBLIC_ID>.json.gz
//app.use( '/get/game', express.static( __dirname + '/games' ) );
app.use( function( req, res, next ) {
	//--requests_counter;
	--requests_counter_pub;
	++requests_counter_api;
	next();
} );

var _perpage = 20;
var lastgames = [];

// api
app.get( '/api', function ( req, res ) {
	res.jsonp( { data: { routes: app._router.stack } } );
	res.end();
} );

app.get( '/api/search/players/:search_str', function ( req, res ) {
	var sql = 'select /*api/search/players/*/ p.NAME as PLAYER, p.ID as PLAYER_ID, p.COUNTRY, c.NAME as CLAN, c.ID as CLAN_ID from Player p left join Clan c on c.ID=p.CLAN_ID WHERE p.NAME like ? ORDER BY NULL LIMIT 200';
	dbpool.getConnection( function( err, conn ) {
		if( err ) throw err;
		conn.query( sql, [ req.params.search_str + "%" ], function( err, rows ) {
			conn.release();
			if( err ) throw err;
			res.jsonp( { data: rows } );
			res.end();
		} );
	} );
} );

app.get( '/api/players', function (req, res) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/players*/' );
	sql.push( 'p.COUNTRY,' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'c.NAME as CLAN,' );
	sql.push( 'c.ID as CLAN_ID' );
	sql.push( 'from Player p' );
	sql.push( 'left join Clan c' );
	sql.push( 'on c.ID=p.CLAN_ID' );
	sql.push( 'order by p.NAME asc' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql1 = 'select count(ID) as totalRecordCount from Player';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql1, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/players/:player', function( req, res ) {
  var nick = mysql_real_escape_string(req.params.player);
	var sql = [];
	sql.push( 'select /*api/players/X*/' );
	sql.push( 'p.ID as PLAYER_ID,' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'p.COUNTRY,' );
	sql.push( 'p.CLAN_ID,' );
	sql.push( 'c.NAME as CLAN' );
	sql.push( 'from Player p' );
	sql.push( 'left join Clan c' );
	sql.push( 'on c.ID=p.CLAN_ID' );
	sql.push( 'where p.NAME=?' );
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [nick], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows[0] } );
			res.end();
			conn.release();
		});
	});
});

app.get( '/api/players/:player/lastgame', function( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	sql = [];
	sql.push( 'select /*api/players/X/lastgame*/' );
	sql.push( 'g.PUBLIC_ID,' );
	sql.push( 'g.GAME_TIMESTAMP' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'where PLAYER_ID=( select ID from Player where NAME=? )' );
	sql.push( 'order by g.GAME_TIMESTAMP' );
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [nick], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			out = rows[0];
			out.PLAYER = nick;
			res.jsonp( { data: out } );
			res.end();
			conn.release();
		});
	});
} );

app.get( '/api/players/:player/games', function( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select PUBLIC_ID,' );
	sql.push( 'GAME_TIMESTAMP,' );
	sql.push( 'm.NAME as MAP,' );
	sql.push( 'GAME_TYPE,' );
	sql.push( 'o.NAME as OWNER,' );
	sql.push( 'o.COUNTRY as OWNER_COUNTRY,' );
	sql.push( '( case when ( GAME_TYPE in ("ca","ctf","tdm","ad","harv","fctf","rr","ft","dom") and g.WINNING_TEAM = gp.TEAM and gp.RANK > 0 ) or ( ( RANK = 1 and GAME_TYPE = "ffa" ) or ( RANK = 1 and GAME_TYPE = "race" ) or ( RANK = 1 and GAME_TYPE = "duel" ) ) then 1 else 0 end ) as WIN,' );
	sql.push( 'RANK,' );
	sql.push( 'RULESET,' );
	sql.push( 'RANKED,' );
	sql.push( 'PREMIUM,' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'p.COUNTRY as COUNTRY,' );
	sql.push( 'p.ID as PLAYER_ID' );
	sql.push( 'from GamePlayer gp' );
	sql.push( 'left join Player p on p.ID=gp.PLAYER_ID' );
	sql.push( 'left join Game g on g.ID=gp.GAME_ID' );
	sql.push( 'left join Map m on m.ID=g.MAP_ID' );
	sql.push( 'left join Player o on o.ID=g.OWNER_ID ' );
	sql.push( 'where gp.PLAYER_ID=( select ID from Player where NAME="' + req.params.player + '" ) ' );
	sql.push( 'order by null' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	//
	/*
	sql.push( 'select' );
	sql.push( 'g.ID,' );
	sql.push( 'g.PUBLIC_ID,' );
	sql.push( 'GAME_TYPE,' );
	sql.push( 'RULESET,' );
	sql.push( 'RANKED,' );
	sql.push( 'PREMIUM,' );
	sql.push( 'TOTAL_KILLS,' );
	sql.push( 'GAME_LENGTH,' );
	sql.push( 'NUM_PLAYERS,' );
	sql.push( 'm.NAME as MAP,' );
	sql.push( 'g.GAME_TIMESTAMP,' );
	sql.push( 'o.NAME as OWNER,' );
	sql.push( 'o.COUNTRY as OWNER_COUNTRY' );
	sql.push( 'from Game g' );
	sql.push( 'left join Player o' );
	sql.push( 'on o.ID=g.OWNER_ID' );
	sql.push( 'left join Map m on m.ID=g.MAP_ID' );
	sql.push( 'where g.ID in ( select gp.GAME_ID from GamePlayer gp where gp.PLAYER_ID=( select p.ID from Player p where p.NAME="' + req.params.player + '" ) )' );
	sql.push( 'order by GAME_TIMESTAMP' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	*/
	sql2 = 'select count(PLAYER_ID) as totalRecordCount from GamePlayer where PLAYER_ID=( select ID from Player where NAME="' + req.params.player + '" )';
	//sql2 = 'select count(ID) as totalRecordCount from Game';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/hostedgames', function( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var owner = mysql_real_escape_string( req.params.player );
  var sql = 'SELECT /*api/owners/X/games*/ g.*, m.NAME as MAP, o.NAME as OWNER, o.COUNTRY as OWNER_COUNTRY, fs.NAME FIRST_SCORER, ls.NAME as LAST_SCORER, dd.NAME as DAMAGE_DELIVERED_NICK, dt.NAME as DAMAGE_TAKEN_NICK, '
  + 'ld.NAME as LEAST_DEATHS_NICK, md.NAME as MOST_DEATHS_NICK, ma.NAME as MOST_ACCURATE_NICK '
  + 'FROM Game g inner join Map m on m.ID=g.MAP_ID '
  + 'left outer join Player o on o.ID=g.OWNER_ID '
  + 'left outer join Player fs on fs.ID=g.FIRST_SCORER_ID '
  + 'left outer join Player ls on ls.ID=g.LAST_SCORER_ID '
  + 'left outer join Player dd on dd.ID=g.DMG_DELIVERED_ID '
  + 'left outer join Player dt on dt.ID=g.DMG_TAKEN_ID '
  + 'left outer join Player ld on ld.ID=g.LEAST_DEATHS_ID '
  + 'left outer join Player md on md.ID=g.MOST_DEATHS_ID '
  + 'left outer join Player ma on ma.ID=g.MOST_ACCURATE_ID '
	+ 'where o.NAME="' + owner + '" '
  + 'order by g.GAME_TIMESTAMP desc '
  + 'limit ' + _offset + ', ' + _perPage + ''
	;
	/*
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [owner], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
	*/
	sql2 = 'select count(OWNER_ID) as totalRecordCount from Game where OWNER_ID=( select ID from Player where NAME="' + req.params.player + '" )';
	//sql2 = 'select count(ID) as totalRecordCount from Game';
	//sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/weapons', function( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var owner = mysql_real_escape_string( req.params.player );
  var sql = 'SELECT /*api/owners/X/games*/'
	+ 'sum(gp.G_K) as G_K,'
	+ 'sum(gp.BFG_S) as BFG_S,'
	+ 'sum(gp.BFG_H) as BFG_H,'
	+ 'sum(gp.BFG_K) as BFG_K,'
	+ 'sum(gp.CG_S) as CG_S,'
	+ 'sum(gp.CG_H) as CG_H,'
	+ 'sum(gp.CG_K) as CG_K,'
	+ 'sum(gp.GL_S) as GL_S,'
	+ 'sum(gp.GL_H) as GL_H,'
	+ 'sum(gp.GL_K) as GL_K,'
	+ 'sum(gp.LG_S) as LG_S,'
	+ 'sum(gp.LG_H) as LG_H,'
	+ 'sum(gp.LG_K) as LG_K,'
	+ 'sum(gp.MG_S) as MG_S,'
	+ 'sum(gp.MG_H) as MG_H,'
	+ 'sum(gp.MG_K) as MG_K,'
	+ 'sum(gp.NG_S) as NG_S,'
	+ 'sum(gp.NG_H) as NG_H,'
	+ 'sum(gp.NG_K) as NG_K,'
	+ 'sum(gp.PG_S) as PG_S,'
	+ 'sum(gp.PG_H) as PG_H,'
	+ 'sum(gp.PG_K) as PG_K,'
	+ 'sum(gp.PM_S) as PM_S,'
	+ 'sum(gp.PM_H) as PM_H,'
	+ 'sum(gp.PM_K) as PM_K,'
	+ 'sum(gp.RG_S) as RG_S,'
	+ 'sum(gp.RG_H) as RG_H,'
	+ 'sum(gp.RG_K) as RG_K,'
	+ 'sum(gp.RL_S) as RL_S,'
	+ 'sum(gp.RL_H) as RL_H,'
	+ 'sum(gp.RL_K) as RL_K,'
	+ 'sum(gp.SG_S) as SG_S,'
	+ 'sum(gp.SG_H) as SG_H,'
	+ 'sum(gp.SG_K) as SG_K,'
	+ 'sum(gp.HMG_S) as HMG_S,'
	+ 'sum(gp.HMG_H) as HMG_H,'
	+ 'sum(gp.HMG_K) as HMG_K '
  + 'FROM GamePlayer gp '
  + 'left join Player p on p.ID=gp.PLAYER_ID '
	+ 'where p.NAME=? '
	;
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.player], function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0] } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/overview', function ( req, res ) {
	var sql = 'select /*api/players/:player/overview*/';
	sql += 'GAME_TYPE, ';
	sql += 'count(1) as MATCHES_PLAYED, ';
	sql += 'sum(GAME_LENGTH) as GAME_LENGTH, ';
	sql += 'sum(TOTAL_KILLS) as TOTAL_KILLS ';
	sql += 'from Game g ';
	sql += 'left join GamePlayer gp on gp.GAME_ID=g.ID ';
	sql += 'left join Player p on p.ID=gp.PLAYER_ID ';
	sql += 'where p.NAME=? ';
	sql += 'group by GAME_TYPE ';
	sql += 'order by null ';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.player], function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/games/graphs/perweek', function ( req, res ) {
  var sql = 'select /*api/games/graphs/perweek*/';
	sql += 'year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, ';
	sql += 'week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, ';
	sql += 'count(GAME_TIMESTAMP) as c ';
	sql += 'from Game g ';
	sql += 'left join GamePlayer gp on gp.GAME_ID=g.ID ';
	sql += 'left join Player p on p.ID=gp.PLAYER_ID ';
	sql += 'where p.NAME=? ';
	sql += 'group by year, week';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.player], function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty } );
			res.end();
			conn.release();
		} );
	} );
} );

/*
app.get( '/api/players/:player/rank', function( req, res ) {
	//var ranking = new glicko2.Glicko2( settings );
	// UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )
	var sql = 'select ID, NAME from Player where NAME=? ';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.player], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { games: rows } } );
			res.end();
			conn.release();
		} );
	} );
} );
*/

app.get( '/api/players/:player/clans', function ( req, res ) {
	var sql = 'select /*api/players/X/clans*/ c.ID as CLAN_ID, c.NAME as CLAN, count(*) as MATCHES_PLAYED from Player p inner join GamePlayer gp on gp.PLAYER_ID=p.ID inner join Clan c on c.ID=gp.CLAN_ID '
	  + ' where p.NAME=? group by p.NAME, c.NAME';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [ req.params.player ], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/update', function ( req, res ) {
  var queryObject = url.parse( req.url, true ).query;
  if (!allow_update) {
    res.jsonp({ data: {}, error: [{ not_allowed: "" }] });
    res.end();
    return;
  }
	var d = new Date();
	var _date = d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getUTCDate();
	if( typeof queryObject.date != 'undefined' ) { _date = queryObject.date; }
  var nick = mysql_real_escape_string(req.params.player);
	var _url = 'http://www.quakelive.com/profile/matches_by_week/' + nick + '/' + _date;

  request( _url, function( err, resp, body ) {
		if( err ) { throw err; }
		$ = cheerio.load( body );

		var conn;
		var updatedGames = [];
		var scanned = 0;
    Q.ninvoke(dbpool, "getConnection")
			.then(function(c) { conn = c; })
			.then(function() {
				return ldcore.init( conn, { useCache: false } ).then(function() {
					var tasks = [];
					$('.areaMapC').each(function () {
						++scanned;
						var publicId = $(this).attr('id').split('_')[1];
						tasks.push(
								ldcore.query( 'SELECT /*api/players/X/update*/ PUBLIC_ID FROM Game WHERE PUBLIC_ID=?', [publicId] )
								.then(function(result) {
									if (result.length == 0) {
										updatedGames.push( publicId );
										return get_game( ldcore, publicId );
									}
									else {
										return undefined;
									}
								})
								);
					});
					return Q.allSettled(tasks);
				})
				.then(function() {
					res.jsonp({ data: { player: nick, updated: updatedGames.length, scanned: scanned, updated_games: updatedGames } });
					res.end();
				})
				.fail(function (err) {
					res.jsonp({ data: { }, error: err });
					res.end();
				})
				.finally(function () {
					conn.release();
				});
			} );
	} );
} );

app.get( '/api/players/:player/maps', function( req, res ) {
	var sql = 'select /*api/players/:player/maps*/ ';
	sql += 'm.NAME as MAP, ';
	sql += 'g.MAP_ID, ';
	sql += 'count(g.ID) as MATCHES_PLAYED ';
	sql += 'from Game g ';
	sql += 'left join Map m on m.ID=g.MAP_ID ';
	sql += 'left join GamePlayer gp on gp.GAME_ID=g.ID ';
	sql += 'left join Player p on p.ID=gp.PLAYER_ID ';
	sql += 'where p.NAME=? ';
	sql += 'group by MAP_ID ';
	//_dt = qlscache.doCache( req, sql, [req.params.player], { time: 24*60*60*1000 } );
	//res.jsonp( _dt );
	//res.end();
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.player], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/players/:player/race', function( req, res ) {
	var queryObject = url.parse(req.url, true).query;
	var _playerNick = req.params.player;
	var _ruleset = queryObject.ruleset == "vql" ? 2 : 0;
	var _weapons = queryObject.weapons == "off" ? 1 : 0;
	var _mapName = queryObject.map;
	sql = "select m.NAME MAP,p.NAME PLAYER_NICK,p.NAME PLAYER,r.SCORE,from_unixtime(r.GAME_TIMESTAMP) GAME_TIMESTAMP,r.RANK,g.PUBLIC_ID, " +
		" leader.NAME LEADER_NICK,best.SCORE LEADER_SCORE" +
		" from Race r inner join Player p on p.ID=r.PLAYER_ID inner join Map m on m.ID=r.MAP_ID left outer join Game g on g.ID=r.GAME_ID " +
		" left outer join Race best on best.MAP_ID=r.MAP_ID and best.MODE=r.mode and best.RANK=1 left outer join Player leader on leader.ID=best.PLAYER_ID" +
		" where p.NAME=? and r.MODE=?";
	if(queryObject.map)
		sql += " and m.NAME=?";
	sql += " order by m.NAME";
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, [_playerNick, _ruleset + _weapons, _mapName], function( err2, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { ruleset: _ruleset ? "vql" : "pql", weapons: _weapons ? "off" : "on", scores: rows } } );
			conn.release();
			res.end();
		});
	});
});

app.get( '/api/games', function ( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/games*/' );
	sql.push( 'g.PUBLIC_ID,' );
	sql.push( 'g.GAME_TYPE,' );
	sql.push( 'g.GAME_TIMESTAMP,' );
	sql.push( 'g.TOTAL_KILLS,' );
	sql.push( 'g.GAME_LENGTH,' );
	sql.push( 'g.NUM_PLAYERS,' );
	sql.push( 'g.PREMIUM,' );
	sql.push( 'g.RANKED,' );
	sql.push( 'g.RULESET,' );
	sql.push( 'm.NAME as MAP,' );
	sql.push( 'p.NAME as OWNER,' );
	sql.push( 'p.COUNTRY as OWNER_COUNTRY' );
	sql.push( 'from Game g' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=g.OWNER_ID' );
	//sql.push( 'order by null' );
	sql.push( 'order by g.ID desc' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql2 = 'select count(ID) as totalRecordCount from Game';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/games/graphs/permonth', function ( req, res ) {
  var sql = 'select /*api/games/graphs/permonth*/ year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, month(FROM_UNIXTIME(GAME_TIMESTAMP)) as month, count(GAME_TIMESTAMP) as c from Game group by year, month';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/games/graphs/perweek', function ( req, res ) {
  var sql = 'select /*api/games/graphs/perweek*/ year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game group by year, week ;';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/games/graphs/perday', function ( req, res ) {
  var sql = 'select /*api/games/graphs/perday*/ year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, month(FROM_UNIXTIME(GAME_TIMESTAMP)) as month, day(FROM_UNIXTIME(GAME_TIMESTAMP)) as day, count(GAME_TIMESTAMP) as c from Game group by year, month, day ;';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get('/api/games/:game', function (req, res) {
  var game = mysql_real_escape_string(req.params.game);
  var sql = [];
  sql[0] = 'SELECT /*api/games/X*/ g.*, m.NAME as MAP, p.NAME as OWNER FROM Game g inner join Map m on m.ID=g.MAP_ID left join Player p on p.ID=g.OWNER_ID WHERE g.PUBLIC_ID=\'' + game + '\'';
  sql[1] = 'SELECT /*api/games/X*/ p.NAME as PLAYER, p.ID as PLAYER_ID, p.COUNTRY, c.NAME as CLAN, gp.* FROM Player p inner join GamePlayer gp on gp.PLAYER_ID=p.ID left join Clan c on c.ID=p.CLAN_ID WHERE gp.GAME_ID=(select ID from Game where PUBLIC_ID=\'' + game + '\') order by TEAM';
  sql[2] = 'select /*api/games/X*/ gp.TEAM, count(1) as PLAYERS, sum(gp.SCORE) as SCORE_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, '
  + ' avg(gp.SCORE) as SCORE_AVG, sum(gp.KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, avg(gp.DEATHS) as DEATHS_AVG, sum(gp.DEATHS) as DEATHS_SUM, '
  + 'sum(gp.SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(gp.HITS) as HITS_SUM, avg(HITS) as HITS_AVG, avg(gp.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, '
  + 'sum(gp.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, sum(gp.DAMAGE_DEALT)/sum(gp.PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(gp.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(gp.DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, '
  + 'sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(G_K) as HUMILIATION_SUM, '
  + 'avg(G_K) as HUMILIATION_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, avg(RL_H) as RL_H_AVG, sum(RL_H) as RL_H_SUM, avg(RL_S) as RL_S_AVG, sum(RL_S) as RL_S_SUM, '
  + 'sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, avg(LG_H) as LG_H_AVG, sum(LG_H) as LG_H_SUM, avg(LG_S) as LG_S_AVG, sum(LG_S) as LG_S_SUM, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, '
  + 'avg(RG_H) as RG_H_AVG, sum(RG_H) as RG_H_SUM, avg(RG_S) as RG_S_AVG, sum(RG_S) as RG_S_SUM '
  + 'from GamePlayer gp inner join Game g on g.ID=gp.GAME_ID '
  + 'where g.PUBLIC_ID="' + game + '" and team in (1,2) group by TEAM with rollup';
	sql[3] = 'select t.ID, t.NAME, t.DESCR from GameTag gt left join Tag t on gt.TAG_ID=t.ID where PUBLIC_ID="'+ game +'"';
  dbpool.getConnection(function (err, conn) {
    if (err) { _logger.error(err); }
    conn.query(sql.join(';'), function (err, resulty) {
      if (err) { _logger.error(err); }
      conn.release();
      res.set('Cache-Control', 'public, max-age=' + http_cache_time);
      res.jsonp( { data: { game: resulty[0][0], teams: resulty[2], players: resulty[1], tags: resulty[3] } } );
      res.end();
    });
  });
});

app.post( '/api/games/:game/tags', function( req, res ) {
  var queryObject = url.parse( req.url, true ).query;
	var game = mysql_real_escape_string( req.params.game );
	_logger.debug( 'game: ' + game );
	_logger.debug( req.body );
	if( 'tag' in req.body ) {
		var _pw = false;
		for( var i in cfg.users ) {
			if( cfg.users[i].password == queryObject.password ) {
				_pw = true;
				_logger.debug( 'user: ' + cfg.users[i].name );
			}
		}
		//
		if( _pw ) {
			var sql = 'insert /*api/games/X/tags*/ into GameTag( TAG_ID, PUBLIC_ID ) values( ?, ? )';
			dbpool.getConnection( function( err, conn ) {
				conn.query( sql, [ req.body.tag, game ], function( err, rows, fields ) {
					res.jsonp( { data: rows, error: err, fields: fields } );
					res.end();
					conn.release();
				} );
			} );
		}
		else {
			res.jsonp( { error: 'not authorized' } );
			res.end();
		}
	}
	else {
		res.jsonp( { error: 'no tag specified' } );
		res.end();
	}
	/*
	*/
} );

/*
app.get( '/api/games/:game/tags', function( req, res ) {
	// move this to /game/* ?
	var game = mysql_real_escape_string( req.params.game );
	var sql = 'select tags.id, tags.name, game_tags.PUBLIC_ID from tags left join game_tags on tags.id=game_tags.tag_id where game_tags.PUBLIC_ID=\''+ game +'\'';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { tags: rows } } );
			res.end();
			conn.release();
		} );
	} );
} );

*/

app.get('/api/games/:game/get', function (req, res) {
  var publicId = req.params.game;
	var sql = 'select /*api/games/X/get*/ PUBLIC_ID from Game where PUBLIC_ID=?';
  var conn;
  Q.ninvoke( dbpool, "getConnection" )
    .then( function(c) { conn = c; } )
    .then( function() { return ldcore.init( conn, { useCache: false } ); } )
    .then( function() { return ldcore.query( sql, [publicId]); } )
    .then( function(rows) {
      if( rows.length )
        _logger.log( "already exist" );
      return get_game( ldcore, publicId );
    })
    .then( function() {
      res.jsonp( { data: { PUBLIC_ID: publicId } } );
      res.end();
    })
    .fail( function( err ) {
      res.jsonp( { data: {}, error: err } );
      res.end();
    })
    .finally(function() { conn.Release(); });
} );

app.get( '/api/owners', function ( req, res ) {
  var sql = 'SELECT /*api/owners*/ o.NAME as OWNER, o.COUNTRY as OWNER_COUNTRY,count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH_SUM, avg(GAME_LENGTH) as GAME_LENGTH_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC '
  + 'FROM Game g inner join Player o on o.ID=g.OWNER_ID group by o.NAME';
	_dt = qlscache.doCache( req, sql, [], { searchColumns: ['OWNER'], time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
});

/*
app.get( '/api/owners/:owner/players', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	// players
	//var sql = 'select Games.PUBLIC_ID, Games.OWNER, Players.PLAYER_NICK, Players.PLAYER_CLAN, Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(Players.DAMAGE_DEALT)/avg(Players.PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( Players.PLAY_TIME ) as PLAY_TIME, sum( Players.KILLS ) as KILLS, sum( Players.DEATHS ) as DEATHS, avg( Players.KILLS/Players.DEATHS ) as RATIO from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where OWNER="'+ owner +'" group by Players.PLAYER_NICK;';
	var sql = 'select Players.PLAYER_NICK, Players.PLAYER_CLAN, Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_NICK order by NULL';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { players: rows } } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/owners/:owner/clans', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	sql = 'select Players.PLAYER_CLAN, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_CLAN order by NULL';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
			res.jsonp( { data: { clans: rows, more: 'less' } } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/owners/:owner/tags', function( req, res ) {
	// move this to /game/* ?
	var owner = mysql_real_escape_string( req.params.owner );
	var sql = 'select tags.id, tags.name, game_tags.PUBLIC_ID from tags left join game_tags on tags.id=game_tags.tag_id where game_tags.OWNER=\''+ owner +'\'';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { tags: rows } } );
			res.end();
			conn.release();
		} );
	} );
} );

//app.get( '/api/owner/*  ....  /clan/*'
app.get( '/api/owners/:owner/player/:player/games', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'select Games.PUBLIC_ID, Games.GAME_TIMESTAMP, Games.MAP, Games.GAME_TYPE, Games.OWNER, Games.RULESET, Games.RANKED, Games.PREMIUM, Players.PLAYER_NICK, DAMAGE_DEALT/PLAY_TIME as DAMAGE_DEALT_PER_SEC_AVG from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where Players.PLAYER_NICK="'+ nick +'" and Games.OWNER=\''+ owner +'\' order by NULL';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/owners/:owner/player/:player', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT/PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(G_K) as HUMILIATION_SUM, avg(G_K) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE Games.OWNER=\'' + owner + '\' and Players.PLAYER_NICK=\''+ nick +'\' GROUP BY PLAYER_NICK order by NULL';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { player: rows[0] } } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/owners/:owner/countries', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	// players
	sql = 'select Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_COUNTRY order by NULL';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows ) {
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { countries: rows, more: 'less' } } );
			res.end();
			conn.release();
		} );
	} );
} );
*/

app.get( '/api/owners/:owner/games', function ( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var owner = mysql_real_escape_string( req.params.owner );
  var sql = 'SELECT /*api/owners/X/games*/ g.*, m.NAME as MAP, o.NAME as OWNER, o.COUNTRY as OWNER_COUNTRY, fs.NAME FIRST_SCORER, ls.NAME as LAST_SCORER, dd.NAME as DAMAGE_DELIVERED_NICK, dt.NAME as DAMAGE_TAKEN_NICK, '
  + 'ld.NAME as LEAST_DEATHS_NICK, md.NAME as MOST_DEATHS_NICK, ma.NAME as MOST_ACCURATE_NICK '
  + 'FROM Game g inner join Map m on m.ID=g.MAP_ID '
  + 'left outer join Player o on o.ID=g.OWNER_ID '
  + 'left outer join Player fs on fs.ID=g.FIRST_SCORER_ID '
  + 'left outer join Player ls on ls.ID=g.LAST_SCORER_ID '
  + 'left outer join Player dd on dd.ID=g.DMG_DELIVERED_ID '
  + 'left outer join Player dt on dt.ID=g.DMG_TAKEN_ID '
  + 'left outer join Player ld on ld.ID=g.LEAST_DEATHS_ID '
  + 'left outer join Player md on md.ID=g.MOST_DEATHS_ID '
  + 'left outer join Player ma on ma.ID=g.MOST_ACCURATE_ID '
	+ 'where o.NAME="' + owner + '" '
  + 'order by g.GAME_TIMESTAMP desc '
  + 'limit ' + _offset + ', ' + _perPage + ''
	;
	/*
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [owner], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
	*/
	sql2 = 'select count(PLAYER_ID) as totalRecordCount from GamePlayer where PLAYER_ID=( select ID from Player where NAME="' + req.params.player + '" )';
	//sql2 = 'select count(ID) as totalRecordCount from Game';
	//sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
			conn.release();
		} );
	} );
} );

/*
app.get( '/api/owners/:owner/top/last30days/kills', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join Player o on o.ID=g.OWNER_ID ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'where o.NAME="'+ owner +'" and g.GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/owners/:owner/top/last30days/ranks', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'gp.PLAYER_ID, ' +
		'count(*) as MATCHES_PLAYED, ' +
		'avg(gp.RANK) as RANK, ' +
		'avg(gp.RANK+gp.TEAM_RANK) as RANK_TEAM_RANK, ' +
		'avg(gp.TEAM_RANK) as TEAM_RANK, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join Player o on o.ID=g.OWNER_ID ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'where o.NAME="'+ owner +'" and g.GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ' +
		' and RANK > 0 and TEAM_RANK > 0 ' +
		' group by gp.PLAYER_ID having MATCHES_PLAYED > 5 ' +
		'order by RANK asc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
*/

app.get( '/api/owners/:owner', function ( req, res ) {
	var sql;
	sql = 'SELECT /*api/owners/X*/ o.NAME as OWNER, o.COUNTRY as OWNER_COUNTRY, count(1) as MATCHES_PLAYED, sum(PREMIUM) as PREMIUM_COUNT, avg(GAME_LENGTH) as GAME_LENGTH_AVG,  sum(GAME_LENGTH) as GAME_LENGTH_SUM,'
	+ 'avg(NUM_PLAYERS) as NUM_PLAYERS_AVG, avg(TOTAL_KILLS) as TOTAL_KILLS_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS_SUM, avg(DMG_DELIVERED_NUM) as DMG_DELIVERED_NUM_AVG, '
  + 'avg(TSCORE0) as TSCORE0_AVG, avg(TSCORE1) as TSCORE1_AVG '
  + 'FROM Game g inner join Player o on o.ID=g.OWNER_ID where o.NAME=?';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.owner], function( err2, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: { owner: rows[0] } } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/places/countries', function ( req, res ) {
	sql = 'select /*api/places/countries*/ COUNTRY, count(COUNTRY) as NUM_PLAYERS from Player group by COUNTRY';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/countries/:country/players', function (req, res) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
  var c = mysql_real_escape_string( req.params.country );
	var sql = [];
	sql.push( 'select /*api/countries/:country/players*/' );
	sql.push( 'p.COUNTRY,' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'c.NAME as CLAN,' );
	sql.push( 'c.ID as CLAN_ID' );
	sql.push( 'from Player p' );
	sql.push( 'left join Clan c' );
	sql.push( 'on c.ID=p.CLAN_ID' );
	sql.push( 'where p.COUNTRY="' + c + '"' );
	sql.push( 'order by p.NAME asc' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql1 = 'select count(ID) as totalRecordCount from Player where COUNTRY="' + c + '"';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql1, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/places/countries/:country/activity/week/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/places/countries/X/activity/week/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY=?' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/countries/:country/activity/week/players', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/places/countries/X/activity/week/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'hour,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY=?' );
	sql.push( 'group by day, hour, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/countries/:country/activity/month/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/places/countries/X/activity/month/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY=?' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/countries/:country/activity/month/players', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/places/countries/X/activity/month/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY=?' );
	sql.push( 'group by day, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/regions/:region/activity/week/matches', function( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/region/X/activity/week/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/regions/:region/activity/week/players', function( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/region/X/activity/week/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'hour,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by day, hour, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/regions/:region/activity/month/matches', function( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/region/X/activity/month/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/regions/:region/activity/month/players', function( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/region/X/activity/month/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by day, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/subregions/:subregion/activity/week/matches', function( req, res ) {
	subregions = [];
	r = req.params.subregion.replace( /\+/g, ' ' );
	console.log( r );
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/subregions/X/activity/week/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/subregions/:subregion/activity/week/players', function( req, res ) {
	subregions = [];
	r = req.params.subregion.replace( /\+/g, ' ' );
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/subregions/X/activity/week/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'hour,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by day, hour, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/subregions/:subregion/activity/month/matches', function( req, res ) {
	subregions = [];
	r = req.params.subregion.replace( /\+/g, ' ' );
	console.log( r );
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/subregions/X/activity/month/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/places/subregions/:subregion/activity/month/players', function( req, res ) {
	subregions = [];
	r = req.params.subregion.replace( /\+/g, ' ' );
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	var sql = [];
	sql.push( 'select /*api/places/subregions/X/activity/month/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'and p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by day, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

/*
app.get( '/api/places/countries/:country/overview', function ( req, res ) {
	sql = [];
	sql.push( 'select' );
	sql.push( '	g.GAME_TYPE,' );
	sql.push( '	count(1) as MATCHES_PLAYED,' );
	sql.push( '	sum(GAME_LENGTH) as GAME_LENGTH,' );
	sql.push( '	sum(TOTAL_KILLS) as TOTAL_KILLS' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY=?' );
	sql.push( 'group by g.GAME_TYPE order by 1' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], {} );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/countries/:country/games/graphs/perweek', function( req, res ) {
	var sql = 'select year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game where GAME_TYPE=? group by year, week';
	sql = [];
	sql.push( 'select' );
	sql.push( 'year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year,' );
	sql.push( 'week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week,' );
	sql.push( 'count(GAME_TIMESTAMP) as c' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY=?' );
	sql.push( 'group by year, week' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.country], {} );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/regions/:region/overview', function ( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	sql = [];
	sql.push( 'select' );
	sql.push( '	g.GAME_TYPE,' );
	sql.push( '	count(1) as MATCHES_PLAYED,' );
	sql.push( '	sum(GAME_LENGTH) as GAME_LENGTH,' );
	sql.push( '	sum(TOTAL_KILLS) as TOTAL_KILLS' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by g.GAME_TYPE order by 1' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], {} );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/regions/:region/games/graphs/perweek', function( req, res ) {
	regions = [];
	r = req.params.region;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.region == r ) {
			regions.push( c.cca2 );
		}
	}
	var sql = 'select year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game where GAME_TYPE=? group by year, week';
	sql = [];
	sql.push( 'select' );
	sql.push( 'year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year,' );
	sql.push( 'week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week,' );
	sql.push( 'count(GAME_TIMESTAMP) as c' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY in ( "' + regions.join( '", "' ) + '" )' );
	sql.push( 'group by year, week' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], {} );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/subregions/:subregion/overview', function ( req, res ) {
	subregions = [];
	r = req.params.subregion;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	sql = [];
	sql.push( 'select' );
	sql.push( '	g.GAME_TYPE,' );
	sql.push( '	count(1) as MATCHES_PLAYED,' );
	sql.push( '	sum(GAME_LENGTH) as GAME_LENGTH,' );
	sql.push( '	sum(TOTAL_KILLS) as TOTAL_KILLS' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by g.GAME_TYPE order by 1' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], {} );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/places/subregions/:subregion/games/graphs/perweek', function( req, res ) {
	subregions = [];
	r = req.params.subregion;
	for( var i in Countries ) {
		c = Countries[i];
		if( c.subregion == r ) {
			subregions.push( c.cca2 );
		}
	}
	var sql = 'select year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game where GAME_TYPE=? group by year, week';
	sql = [];
	sql.push( 'select' );
	sql.push( 'year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year,' );
	sql.push( 'week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week,' );
	sql.push( 'count(GAME_TIMESTAMP) as c' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where p.COUNTRY in ( "' + subregions.join( '", "' ) + '" )' );
	sql.push( 'group by year, week' );
	sql.push( '' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], {} );
	res.jsonp( _dt );
	res.end();
} );
*/

app.get( '/api/gametypes', function ( req, res ) {
	var sql = 'SELECT /*api/gametypes*/ GAME_TYPE, count(1) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH FROM Game group by GAME_TYPE order by 1';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/gametypes/:gametype/overview', function ( req, res ) {
	var gt = req.params.gametype;
	var sql = 'select /*api/gametypes/X/overview*/ GAME_TYPE, count(1) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH, sum(TOTAL_KILLS) as TOTAL_KILLS from Game where GAME_TYPE=? group by GAME_TYPE order by null';
	_dt = qlscache.doCache( req, sql, [gt], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/gametypes/:gametype/games', function ( req, res ) {
	var gt = req.params.gametype;
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/games*/' );
	sql.push( 'g.PUBLIC_ID,' );
	sql.push( 'g.GAME_TYPE,' );
	sql.push( 'g.GAME_TIMESTAMP,' );
	sql.push( 'g.TOTAL_KILLS,' );
	sql.push( 'g.GAME_LENGTH,' );
	sql.push( 'g.NUM_PLAYERS,' );
	sql.push( 'g.PREMIUM,' );
	sql.push( 'g.RANKED,' );
	sql.push( 'g.RULESET,' );
	sql.push( 'm.NAME as MAP,' );
	sql.push( 'p.NAME as OWNER,' );
	sql.push( 'p.COUNTRY as OWNER_COUNTRY' );
	sql.push( 'from Game g' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=g.OWNER_ID' );
	sql.push( 'where g.GAME_TYPE="' + gt + '"' );
	//sql.push( 'order by null' );
	sql.push( 'order by g.ID desc' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql2 = 'select count(ID) as totalRecordCount from Game';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/gametypes/:gametype/games/graphs/permonth', function( req, res ) {
	var gt = req.params.gametype;
	var sql = 'select /*api/gametypes/X/games/graphs/permonth*/ year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, month(FROM_UNIXTIME(GAME_TIMESTAMP)) as month, count(GAME_TIMESTAMP) as c from Game where GAME_TYPE=? group by year, month';
	_dt = qlscache.doCache( req, sql, [gt], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/gametypes/:gametype/games/graphs/perweek', function( req, res ) {
	var gt = req.params.gametype;
	var sql = 'select /*api/gametypes/X/games/graphs/perweek*/ year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game where GAME_TYPE=? group by year, week';
	_dt = qlscache.doCache( req, sql, [gt], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

/*
app.get( '/api/gametypes/:gametype/top/all/kills', function ( req, res ) {
	var gametype = mysql_real_escape_string( req.params.gametype );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'where g.GAME_TYPE="'+ gametype +'" ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/gametypes/:gametype/top/all/ranks', function ( req, res ) {
	var gametype = mysql_real_escape_string( req.params.gametype );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'gp.PLAYER_ID, ' +
		'count(*) as MATCHES_PLAYED, ' +
		'avg(gp.RANK) as RANK, ' +
		'avg(gp.TEAM_RANK) as TEAM_RANK, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'where g.GAME_TYPE="'+ gametype +'" ' +
		' and RANK > 0 and TEAM_RANK > 0 ' +
		'group by gp.PLAYER_ID having MATCHES_PLAYED > 5 ' + 
		'order by RANK asc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
*/

/*
app.get( '/api/gametypes/:gametype/players/:player', function (req, res) {
	var gametype = mysql_real_escape_string( req.params.gametype );
  var nick = mysql_real_escape_string( req.params.player );
  var sql = 'SELECT ' +
		'p.NAME as PLAYER, ' +
		'gp.PLAYER_ID, ' +
		'c.NAME as CLAN, ' +
		'c.ID as CLAN_ID, ' +
		'p.COUNTRY, ' +
		'count(*) as MATCHES_PLAYED, ' +
		//'sum(case when gp.TEAM = g.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, ' +
		//'sum(case when gp.TEAM = g.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, ' +
		'sum(gp.QUIT) as QUIT_SUM, avg(gp.QUIT) as QUIT_AVG, ' +
		'avg(gp.RANK) as RANK_AVG, ' +
		'sum(gp.SCORE) as SCORE_SUM, avg(gp.SCORE) as SCORE_AVG, ' +
		'sum(gp.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, ' +
		'avg(gp.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, ' +
		'avg(gp.DAMAGE_DEALT)/avg(gp.PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, ' +
		'sum(gp.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, ' +
		'avg(gp.DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, ' +
		'avg(gp.DAMAGE_DEALT-gp.DAMAGE_TAKEN) as DAMAGE_NET_AVG, ' +
		'sum(gp.KILLS) as KILLS_SUM, avg(gp.KILLS) as KILLS_AVG, ' +
		'sum(gp.DEATHS) as DEATHS_SUM, avg(gp.DEATHS) as DEATHS_AVG, ' +
		'sum(gp.KILLS)/sum(gp.DEATHS) as RATIO, ' +
		'sum(gp.HITS) as HITS_SUM, avg(gp.HITS) as HITS_AVG, ' +
		'sum(gp.SHOTS) as SHOTS_SUM, avg(gp.SHOTS) as SHOTS_AVG, ' +
		'sum(gp.HITS)/sum(gp.SHOTS)*100 as ACC_AVG, avg(gp.RANK) as RANK_AVG, avg(gp.TEAM_RANK) as TEAM_RANK_AVG, ' +
		'sum(gp.G_K) as HUMILIATION_SUM, avg(gp.G_K) as HUMILIATION_AVG, sum(gp.IMPRESSIVE) as IMPRESSIVE_SUM, avg(gp.IMPRESSIVE) as IMPRESSIVE_AVG, ' +
		'sum(gp.EXCELLENT) as EXCELLENT_SUM, avg(gp.EXCELLENT) as EXCELLENT_AVG, sum(gp.PLAY_TIME) as PLAY_TIME_SUM, avg(gp.PLAY_TIME) as PLAY_TIME_AVG, ' +
		'sum(gp.G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, ' +
		'sum(gp.GL_S) as GL_S_SUM, avg(gp.GL_S) as GL_S_AVG, sum(gp.LG_H) as LG_H_SUM, avg(gp.LG_H) as LG_H_AVG, sum(gp.LG_K) as LG_K_SUM, avg(gp.LG_K) as LG_K_AVG, ' +
		'sum(gp.LG_S) as LG_S_SUM, avg(gp.LG_S) as LG_S_AVG, sum(gp.MG_H) as MG_H_SUM, avg(gp.MG_H) as MG_H_AVG, sum(gp.MG_K) as MG_K_SUM, avg(gp.MG_K) as MG_K_AVG, ' +
		'sum(gp.MG_S) as MG_S_SUM, avg(gp.MG_S) as MG_S_AVG, sum(gp.PG_H) as PG_H_SUM, avg(gp.PG_H) as PG_H_AVG, sum(gp.PG_K) as PG_K_SUM, avg(gp.PG_K) as PG_K_AVG, ' +
		'sum(gp.PG_S) as PG_S_SUM, avg(gp.PG_S) as PG_S_AVG, sum(gp.RG_H) as RG_H_SUM, avg(gp.RG_H) as RG_H_AVG, sum(gp.RG_K) as RG_K_SUM, avg(gp.RG_K) as RG_K_AVG, ' +
		'sum(gp.RG_S) as RG_S_SUM, avg(gp.RG_S) as RG_S_AVG, sum(gp.RL_H) as RL_H_SUM, avg(gp.RL_H) as RL_H_AVG, sum(gp.RL_K) as RL_K_SUM, avg(gp.RL_K) as RL_K_AVG, ' +
		'sum(gp.RL_S) as RL_S_SUM, avg(gp.RL_S) as RL_S_AVG, sum(gp.SG_H) as SG_H_SUM, avg(gp.SG_H) as SG_H_AVG, sum(gp.SG_K) as SG_K_SUM, avg(gp.SG_K) as SG_K_AVG, ' +
		'sum(gp.SG_S) as SG_S_SUM, avg(gp.SG_S) as SG_S_AVG ' +
		'FROM GamePlayer gp ' +
		'left join Game g on gp.GAME_ID=g.ID ' +
		'left join Player p on gp.PLAYER_ID=p.ID ' +
		'left join Clan c on p.CLAN_ID=c.ID ' +
		//'WHERE p.NAME=\'' + nick + '\' ' +
		'WHERE gp.PLAYER_ID=( select ID from Player where NAME=? ) AND g.GAME_TYPE=? ' +
		'GROUP BY PLAYER_ID ' +
		'order by NULL';
  dbpool.getConnection(function (err, conn) {
		if( err ) { _logger.error( err ); }
    conn.query(sql, [nick,gametype], function (err, rows) {
			if( err ) { _logger.error( err ); }
      res.set('Cache-Control', 'public, max-age=' + http_cache_time);
      res.jsonp( { data: { player: rows[0] } } );
      res.end();
      conn.release();
    });
  });
});
*/

app.get( '/api/gametypes/:gametype/players/:player/games', function( req, res ) {
	var gametype = mysql_real_escape_string( req.params.gametype );
	var player = mysql_real_escape_string( req.params.player );
	var sql = 'select PUBLIC_ID, GAME_TIMESTAMP, m.NAME as MAP, GAME_TYPE, o.NAME as OWNER, ( case when ( GAME_TYPE in ("ca","ctf","tdm","ad","harv","fctf","rr","ft","dom") and g.WINNING_TEAM = gp.TEAM and gp.RANK > 0 ) or ( ( RANK = 1 and GAME_TYPE = "ffa" ) or ( RANK = 1 and GAME_TYPE = "race" ) '
	+ 'or ( RANK = 1 and GAME_TYPE = "duel" ) ) then 1 else 0 end ) as WIN, RANK, RULESET, RANKED, PREMIUM, p.NAME as PLAYER, p.ID as PLAYER_ID, c.NAME as CLAN, c.ID as CLAN_ID, gp.* '
  + ' from GamePlayer gp inner join Player p on p.ID=gp.PLAYER_ID inner join Game g on g.ID=gp.GAME_ID inner join Map m on m.ID=g.MAP_ID left join Clan c on c.ID=gp.CLAN_ID left join Player o on o.ID=g.OWNER_ID '
  + ' where g.GAME_TYPE=? and gp.PLAYER_ID=( select ID from Player where NAME=? ) order by NULL';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [gametype,player], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/gametypes/:gametype/maps', function ( req, res ) {
	var gt = req.params.gametype;
	var sql = 'select /*api/gametypes/X/maps*/ m.NAME as MAP, g.MAP_ID, count(g.ID) as MATCHES_PLAYED from Game g left join Map m on m.ID=g.MAP_ID where g.GAME_TYPE=? group by MAP_ID';
	_dt = qlscache.doCache( req, sql, [gt], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/overview', function ( req, res ) {
	var sql = 'select /*api/overview*/ GAME_TYPE, count(1) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH, sum(TOTAL_KILLS) as TOTAL_KILLS from Game group by GAME_TYPE order by null';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/tags', function( req, res ) {
	var sql = 'SELECT /*api/tags*/ ID, NAME as TAG, count(*) as tagged_games FROM Tag t left join GameTag gt on t.ID=gt.TAG_ID group by ID';
	dbpool.getConnection( function( err, conn ) {
		conn.query( sql, function( err, rows, fields ) {
			//res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.post( '/api/tags', function( req, res ) {
  var queryObject = url.parse( req.url, true ).query;
	_logger.debug( req.body );
	if( 'name' in req.body ) {
		var _pw = false;
		for( var i in cfg.users ) {
			if( cfg.users[i].password == queryObject.password ) {
				_pw = true;
				_logger.debug( 'user: ' + cfg.users[i].name );
			}
		}
		//
		if( _pw ) {
			var sql = 'insert /*api/tags*/ into Tag( NAME, DESCR ) values( ?, ? )';
			dbpool.getConnection( function( err, conn ) {
				conn.query( sql, [ req.body.name, req.body.descr ], function( err, rows, fields ) {
					res.jsonp( { data: rows, error: err, fields: fields } );
					res.end();
					conn.release();
				} );
			} );
		}
		else {
			res.jsonp( { error: 'not authorized' } );
			res.end();
		}
	}
	else {
		res.jsonp( { error: 'no tag specified' } );
		res.end();
	}
} );

app.get( '/api/tags/:tag', function ( req, res ) {
	var sql = 'SELECT /*api/tags/X*/ * FROM Tag WHERE ID=?';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.tag], function( err, rows, fields ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			out = ( rows.length > 0 ) ? rows[0] : {};
			res.jsonp( { data: out } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/tags/:tag/overview', function( req, res ) {
	//var sql = 'select GAME_TYPE, count(1) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH, sum(TOTAL_KILLS) as TOTAL_KILLS from Game where RULESET=? group by GAME_TYPE order by 1';
	var sql = [];
	sql.push( 'select /*api/tags/X/overview*/' );
	sql.push( 'g.GAME_TYPE,' );
	sql.push( 'count(1) as MATCHES_PLAYED,' );
	sql.push( 'sum(GAME_LENGTH) as GAME_LENGTH,' );
	sql.push( 'sum(TOTAL_KILLS) as TOTAL_KILLS' );
	sql.push( 'from Game g' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on g.PUBLIC_ID=gt.PUBLIC_ID' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=g.OWNER_ID' );
	sql.push( 'where gt.TAG_ID=?' );
	sql.push( 'group by GAME_TYPE' );
	sql.push( 'order by null' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/games/graphs/perweek', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/games/graphs/perweek*/' );
	sql.push( 'year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year,' );
	sql.push( 'week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week,' );
	sql.push( 'count(1) as c' );
	sql.push( 'from Game g' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on g.PUBLIC_ID=gt.PUBLIC_ID' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=g.OWNER_ID' );
	sql.push( 'where gt.TAG_ID=?' );
	sql.push( 'group by year, week' );
	sql.push( 'order by null' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/tags/:tag/games', function ( req, res ) {
	_start = new Date().getTime();
	var tag = mysql_real_escape_string( req.params.tag );
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/tags/X/games*/' );
	sql.push( 'g.*,' );
	sql.push( 'gt.*,' );
	sql.push( 'p.NAME as OWNER,' );
	sql.push( 'm.NAME as MAP' );
	sql.push( 'from Game g' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on g.PUBLIC_ID=gt.PUBLIC_ID' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=g.OWNER_ID' );
	sql.push( 'where gt.TAG_ID=' + tag + '' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql1 = 'select count(*) as totalRecordCount from GameTag where TAG_ID=' + tag + '';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql1, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/tags/:tag/players', function ( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/tags/X/players*/' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'c.ID as CLAN_ID,' );
	sql.push( 'c.NAME as CLAN,' );
	sql.push( 'p.COUNTRY' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'left join Clan c' );
	sql.push( 'on c.ID=p.CLAN_ID' );
	sql.push( 'where TAG_ID=?' );
	sql.push( 'group by gp.PLAYER_ID' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { searchColumns: ['OWNER'], time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/tags/:tag/owners', function ( req, res ) {
	var sql = [];
	sql.push( 'SELECT /*api/tags/X/owners*/' );
	sql.push( 'o.NAME as OWNER,' );
	sql.push( 'o.COUNTRY as OWNER_COUNTRY,' );
	sql.push( 'count(1) as MATCHES_PLAYED,' );
	sql.push( 'sum(GAME_LENGTH) as GAME_LENGTH_SUM,' );
	sql.push( 'avg(GAME_LENGTH) as GAME_LENGTH_AVG,' );
	sql.push( 'sum(TOTAL_KILLS) as TOTAL_KILLS,' );
	sql.push( 'avg(AVG_ACC) as AVG_ACC' );
	sql.push( 'FROM Game g' );
	sql.push( 'left join Player o' );
	sql.push( 'on o.ID=g.OWNER_ID' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'WHERE TAG_ID=?' );
	sql.push( 'group by g.OWNER_ID' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { searchColumns: ['OWNER'], time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/maps', function ( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/maps*/' );
	sql.push( 'm.NAME as MAP,' );
	sql.push( 'g.MAP_ID,' );
	sql.push( 'count(g.ID) as MATCHES_PLAYED' );
	sql.push( 'from Game g' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'where TAG_ID=?' );
	sql.push( 'group by g.MAP_ID' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 3*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/places/countries', function ( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/places/countries*/' );
	sql.push( '	COUNTRY,' );
	sql.push( '	count(COUNTRY) as NUM_PLAYERS' );
	sql.push( 'from' );
	sql.push( '	( select' );
	sql.push( '		p.NAME as PLAYER,' );
	sql.push( '		p.COUNTRY as COUNTRY' );
	sql.push( '	from Game g' );
	sql.push( '		left join GamePlayer gp' );
	sql.push( '		on gp.GAME_ID=g.ID' );
	sql.push( '		left join GameTag gt' );
	sql.push( '		on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( '		left join Player p' );
	sql.push( '		on p.ID=gp.PLAYER_ID' );
	sql.push( '	where TAG_ID=?' );
	sql.push( '	group by gp.PLAYER_ID' );
	sql.push( '	) a' );
	sql.push( 'group by COUNTRY' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/activity/week/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/activity/week/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game g' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'WHERE TAG_ID=?' );
	sql.push( 'AND GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/activity/week/players', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/activity/week/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'hour,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'WHERE TAG_ID=?' );
	sql.push( 'AND GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'GROUP by day, hour, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/activity/month/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/activity/month/matches*/' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'WHERE TAG_ID=?' );
	sql.push( 'AND GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );
app.get( '/api/tags/:tag/activity/month/players', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/tags/X/activity/month/players*/' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'left join GameTag gt' );
	sql.push( 'on gt.PUBLIC_ID=g.PUBLIC_ID' );
	sql.push( 'WHERE TAG_ID=?' );
	sql.push( 'AND GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'group by day, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [req.params.tag], { time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

/*
app.get( '/api/tags/:tag/top/last30days/kills', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'join GameTag gt on gt.PUBLIC_ID=g.PUBLIC_ID ' +
		'where gt.TAG_ID="'+ tag +'" and g.GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/tags/:tag/top/last30days/ranks', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'gp.PLAYER_ID, ' +
		'count(*) as MATCHES_PLAYED, ' +
		'avg(gp.RANK+gp.TEAM_RANK) as RANK_TEAM_RANK, ' +
		'avg(gp.RANK) as RANK, ' +
		'avg(gp.TEAM_RANK) as TEAM_RANK, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'join GameTag gt on gt.PUBLIC_ID=g.PUBLIC_ID ' +
		'where gt.TAG_ID="'+ tag +'" and g.GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ' +
		' and RANK > 0 and TEAM_RANK > 0 ' +
		'group by gp.PLAYER_ID having MATCHES_PLAYED > 5 ' + 
		'order by RANK asc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/tags/:tag/top/all/kills', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'join GameTag gt on gt.PUBLIC_ID=g.PUBLIC_ID ' +
		'where gt.TAG_ID="'+ tag +'" ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/tags/:tag/top/all/ranks', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'gp.PLAYER_ID, ' +
		'count(*) as MATCHES_PLAYED, ' +
		'avg(gp.RANK) as RANK, ' +
		'avg(gp.TEAM_RANK) as TEAM_RANK, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'join GameTag gt on gt.PUBLIC_ID=g.PUBLIC_ID ' +
		'where gt.TAG_ID="'+ tag +'" ' +
		' and RANK > 0 and TEAM_RANK > 0 ' +
		'group by gp.PLAYER_ID having MATCHES_PLAYED > 5 ' + 
		'order by RANK asc limit 50) x left join Player p on p.ID=x.PLAYER_ID' +
		'';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
*/

app.get( '/api/maps/:map', function( req, res ) {
  var map = mysql_real_escape_string( req.params.map );
	var sql = 'select /*api/maps/X*/ GAME_TYPE, count(GAME_TYPE) as MATCHES_PLAYED from Game g left join Map m on m.ID=g.MAP_ID where m.NAME="'+ map +'" group by GAME_TYPE';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/maps', function( req, res ) {
	var sql = 'select /*api/maps*/ m.NAME as MAP, g.MAP_ID, count(g.ID) as MATCHES_PLAYED from Game g left join Map m on m.ID=g.MAP_ID group by MAP_ID';
	_dt = qlscache.doCache( req, sql, [], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/maps/:map/graphs/permonth', function( req, res ) {
  var map = mysql_real_escape_string( req.params.map );
	var sql = 'select /*api/maps/X/graphs/permonth*/ year(from_unixtime(GAME_TIMESTAMP)) as year, month(from_unixtime(GAME_TIMESTAMP)) as month, count(MAP_ID) as MATCHES_PLAYED from Game g left join Map m on m.ID=g.MAP_ID where m.NAME="'+ map +'" group by year, month';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/maps/:map/graphs/perweek', function( req, res ) {
  var map = mysql_real_escape_string( req.params.map );
	var sql = 'select /*api/maps/X/graphs/perweek*/ year(from_unixtime(GAME_TIMESTAMP)) as year, week(from_unixtime(GAME_TIMESTAMP),1) as week, count(MAP_ID) as MATCHES_PLAYED from Game g left join Map m on m.ID=g.MAP_ID where m.NAME="'+ map +'" group by year, week';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/clans', function( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var sql = [];
	sql.push( 'select /*api/clans*/' );
	sql.push( 'ID as CLAN_ID,' );
	sql.push( 'NAME as CLAN' );
	sql.push( 'from Clan c' );
	sql.push( 'order by c.NAME asc' );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql1 = 'select count(ID) as totalRecordCount from Clan';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql1, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount, ms: ( new Date().getTime() - _start ) } );
			res.end();
		} );
	} );
} );

app.get( '/api/clans/:clan', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/clans*/' );
	sql.push( 'NAME as CLAN,' );
	sql.push( 'ID as CLAN_ID' );
	sql.push( 'from Clan' );
	sql.push( 'where ID=?' );
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.clan], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows[0] } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/clans/:clan/players', function( req, res ) {
	var sql = [];
	sql.push( 'select /*api/clans/X*/' );
	sql.push( 'p.NAME as PLAYER,' );
	sql.push( 'p.ID as PLAYER_ID,' );
	sql.push( 'c.ID as CLAN_ID,' );
	sql.push( 'c.NAME as CLAN,' );
	sql.push( 'p.COUNTRY' );
	sql.push( 'from Player p' );
	sql.push( 'left join Clan c' );
	sql.push( 'on c.ID=p.CLAN_ID' );
	sql.push( 'where c.ID=?' );
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [req.params.clan], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );

app.get( '/api/top/last30days/kills', function( req, res ) {
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'where g.GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID ' +
		'';
	_dt = qlscache.doCache( req, sql, [], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/top/all/kills', function( req, res ) {
	var sql = 'select x.*, p.NAME as PLAYER from (select ' +
		'count(*) as MATCHES_PLAYED, ' +
		'gp.PLAYER_ID, ' +
		'sum(gp.KILLS) as KILLS, ' +
		'sum(gp.DEATHS) as DEATHS, ' +
		'sum(gp.IMPRESSIVE) as IMPRESSIVE, ' +
		'sum(gp.EXCELLENT) as EXCELLENT, ' +
		'sum(gp.G_K) as HUMILIATION, ' +
		'round(avg(gp.HITS/gp.SHOTS)*100,2) as ACC ' +
		'from Game g ' +
		'join GamePlayer gp on gp.GAME_ID=g.ID ' +
		'group by gp.PLAYER_ID order by KILLS desc limit 50) x left join Player p on p.ID=x.PLAYER_ID ' +
		'';
	_dt = qlscache.doCache( req, sql, [], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/status/cache', function( req, res ) {
	res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
	var _cache = [];
	var now = new Date();
	res.jsonp( { now: now.getTime(), now_nice: now, cached: qlscache.listCaches() } );
	res.end();
} );
app.get( '/api/status/cache/queue', function( req, res ) {
	res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
	var _cache = [];
	var now = new Date();
	res.jsonp( { now: now.getTime(), now_nice: now, cached: qlscache.listQueue() } );
	res.end();
} );

app.get( '/api/status/db/rows', function( req, res ) {
	var sql = 'SELECT TABLE_NAME, TABLE_ROWS  FROM INFORMATION_SCHEMA.TABLES  WHERE TABLE_SCHEMA=? ORDER BY TABLES.TABLE_ROWS DESC';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [cfg.mysql_db.database], function( err, rows ) {
			if( err ) { _logger.error( err ); }
			res.jsonp( { data: rows } );
			res.end();
			conn.release();
		} );
	} );
} );
app.get( '/api/status/loadavg', function( req, res ) {
	res.jsonp( { data: os.loadavg() } );
	res.end();
} );
app.get( '/status', function( req, res ) {
	var queryObject = url.parse( req.url, true ).query;
	res.jsonp( { requests_counter_total: requests_counter_total, requests_counter: requests_counter, requests_counter_api: requests_counter_api, requests_counter_pub: requests_counter_pub, process_uptime: process.uptime() } );
	res.end();
	if( typeof queryObject.cacti != 'undefined' ) {
		requests_counter = 0;
		requests_counter_api = 0;
		requests_counter_pub = 0;
	}
});

app.get( '/api/race', function(req, res) {
  sql = "select m.NAME MAP, g.PUBLIC_ID, r.MODE, p.NAME PLAYER_NICK, p.NAME PLAYER, p.COUNTRY, r.SCORE, r.GAME_ID, r.GAME_TIMESTAMP from Race r inner join Map m on m.ID=r.MAP_ID inner join Player p on p.ID=r.PLAYER_ID left join Game g on g.ID=r.GAME_ID where RANK=1 order by null";
  dbpool.getConnection(function (err, conn) {
		if( err ) { _logger.error( err ); }
    conn.query(sql, function (err2, rows) {
			if( err2 ) { _logger.error( err2 ); }
      var mapDict = {};
      var maps = [];
      res.set('Cache-Control', 'public, max-age=' + http_cache_time);
      for (var i = 0, c = rows.length; i < c; i++) {
        var row = rows[i];
        var map = mapDict[row.MAP];
        if (!map) {
          map = { MAP: row.MAP, LEADERS: [] }
          mapDict[row.MAP] = map;
          maps.push(map);
        }
        map.LEADERS[row.MODE] = { MODE: row.MODE, PLAYER_NICK: row.PLAYER_NICK, PLAYER: row.PLAYER, COUNTRY: row.COUNTRY, SCORE: row.SCORE, PUBLIC_ID: row.PUBLIC_ID, GAME_TIMESTAMP: row.GAME_TIMESTAMP };
      }
      res.jsonp({ data: { maps: maps, more: 'less' } });
      res.end();
      conn.release();
    });
  });
});

app.get( '/api/race/maps2/:map', function( req, res ) {
	_start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	_page = queryObject.page || 1;
	_perPage = queryObject.limit || queryObject.perPage || 10;
	if( _perPage > 100 ) { _perPage = 100; }
	_offset = queryObject.offset || 0;
	var _ruleset = queryObject.ruleset == "vql" ? 2 : 0;
	var _weapons = queryObject.weapons == "off" ? 1 : 0;
	var _mapName = req.params.map;
	var sql = [];
	sql.push( 'select' );
	sql.push( 'm.NAME MAP,' );
	sql.push( 'p.NAME PLAYER_NICK,' );
	sql.push( 'p.NAME PLAYER,' );
	sql.push( 'p.COUNTRY,' );
	sql.push( 'SCORE,' );
	sql.push( 'from_unixtime(r.GAME_TIMESTAMP) GAME_TIMESTAMP,' );
	sql.push( 'RANK,' );
	sql.push( 'g.PUBLIC_ID' );
	sql.push( 'from Race r' );
	sql.push( 'inner join Map m' );
	sql.push( 'on m.ID=r.MAP_ID' );
	sql.push( 'inner join Player p' );
	sql.push( 'on p.ID=r.PLAYER_ID' );
	sql.push( 'left outer join Game g' );
	sql.push( 'on g.ID=r.GAME_ID' );
	sql.push( 'where m.NAME="' + _mapName + '" and MODE=' + ( _ruleset + _weapons ) );
	sql.push( 'limit ' + _offset + ', ' + _perPage + '' );
	sql2 = 'select count(PLAYER_ID) as totalRecordCount from Race where MAP_ID=( select ID from Map where NAME="' + _mapName + '" ) and MODE="' + ( _ruleset + _weapons ) + '"';
	sql = sql.join( ' ' );
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql + ';' + sql2, function( err, resulty ) {
			if( err ) { _logger.error( err ); }
			conn.release();
			res.set( 'Cache-Control', 'public, max-age=' + http_cache_time );
			res.jsonp( { data: resulty[0], ruleset: _ruleset ? "vql" : "pql", weapons: _weapons ? "on" : "off", queryRecordCount: resulty[1][0].totalRecordCount, totalRecordCount: resulty[1][0].totalRecordCount } );
			res.end();
		} );
	} );
});

app.get( '/api/race/maps/:map', function( req, res ) {
	var queryObject = url.parse(req.url, true).query;
	var _mapName = req.params.map;
	var _ruleset = queryObject.ruleset == "vql" ? 2 : 0;
	var _weapons = queryObject.weapons == "off" ? 1 : 0;
	var _limit = parseInt(queryObject.limit);
	var _player = queryObject.player;
	sql = "select m.NAME MAP,p.NAME PLAYER_NICK, p.NAME PLAYER, p.COUNTRY, SCORE,from_unixtime(r.GAME_TIMESTAMP) GAME_TIMESTAMP,RANK,g.PUBLIC_ID "
		+ "from Race r inner join Map m on m.ID=r.MAP_ID inner join Player p on p.ID=r.PLAYER_ID left outer join Game g on g.ID=r.GAME_ID where m.NAME=? and MODE=?";
	if(_limit)
		sql += " and (RANK<=? or p.NAME=?)";
	sql += " order by RANK";
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, [_mapName, _ruleset + _weapons, _limit, _player], function( err, rows, fields ) {
			if( err ) { _logger.error( err ); }
			res.set('Cache-Control', 'public, max-age=' + http_cache_time);
			res.jsonp({ data: { ruleset: _ruleset ? "vql" : "pql", weapons: _weapons ? "on" : "off", scores: rows } });
			res.end();
			conn.release();
		});
	});
});

app.get( '/api/race/players/:player', function (req, res) {
  var queryObject = url.parse(req.url, true).query;
  var _playerNick = req.params.player;
  var _ruleset = queryObject.ruleset == "vql" ? 2 : 0;
  var _weapons = queryObject.weapons == "off" ? 1 : 0;
  var _mapName = queryObject.map;

  sql = "select m.NAME MAP,p.NAME PLAYER_NICK,p.NAME PLAYER,r.SCORE,from_unixtime(r.GAME_TIMESTAMP) GAME_TIMESTAMP,r.RANK,g.PUBLIC_ID, " +
    " leader.NAME LEADER_NICK,best.SCORE LEADER_SCORE" +
    " from Race r inner join Player p on p.ID=r.PLAYER_ID inner join Map m on m.ID=r.MAP_ID left outer join Game g on g.ID=r.GAME_ID " +
    " left outer join Race best on best.MAP_ID=r.MAP_ID and best.MODE=r.mode and best.RANK=1 left outer join Player leader on leader.ID=best.PLAYER_ID" +
    " where p.NAME=? and r.MODE=?";
  if (queryObject.map)
    sql += " and m.NAME=?";
  sql += " order by m.NAME";

  dbpool.getConnection(function(err, conn) {
    conn.query(sql, [_playerNick, _ruleset + _weapons, _mapName], function(err2, rows) {
      res.set('Cache-Control', 'public, max-age=' + http_cache_time);
      res.jsonp({ data: { ruleset: _ruleset ? "vql" : "pql", weapons: _weapons ? "off" : "on", scores: rows } });
      conn.release();
      res.end();
    });
  });
});

app.get( '/api/rulesets', function( req, res ) {
  sql = "select RULESET, count(RULESET) as MATCHES_PLAYED from Game group by RULESET";
	_dt = qlscache.doCache( req, sql, [], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/rulesets/:ruleset/overview', function( req, res ) {
  var ruleset = req.params.ruleset;
	var sql = 'select GAME_TYPE, count(1) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH, sum(TOTAL_KILLS) as TOTAL_KILLS from Game where RULESET=? group by GAME_TYPE order by null';
	_dt = qlscache.doCache( req, sql, [ruleset], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/rulesets/:ruleset/games/graphs/permonth', function( req, res ) {
	var ruleset = req.params.ruleset;
	var sql = 'select year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, month(FROM_UNIXTIME(GAME_TIMESTAMP)) as month, count(GAME_TIMESTAMP) as c from Game where RULESET=? group by year, month';
	_dt = qlscache.doCache( req, sql, [ruleset], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/rulesets/:ruleset/games/graphs/perweek', function( req, res ) {
	var ruleset = req.params.ruleset;
	var sql = 'select year(FROM_UNIXTIME(GAME_TIMESTAMP)) as year, week(FROM_UNIXTIME(GAME_TIMESTAMP),1) as week, count(GAME_TIMESTAMP) as c from Game where RULESET=? group by year, week';
	_dt = qlscache.doCache( req, sql, [ruleset], { time: 24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

var GUNS = {
	RL: 'Rocket Launcher',
	RG: 'Rail Gun',
	LG: 'Lightning Gun',
	GL: 'Grenade Launcher',
	PG: 'Plasma Gun',
	MG: 'Machine Gun',
	HMG: 'HMG',
	SG: 'Shotgun',
	BFG: 'Big Fucking Gun',
	NG: 'Nailgun',
	CG: 'Chaingun',
	G: 'Gauntlet',
}

app.get( '/api/weapons', function( req, res ) {
  sql = "select sum(RL_S) as RL_S, sum(RG_S) as RG_S, sum(LG_S) as LG_S, sum(GL_S) as GL_S, sum(PG_S) as PG_S, sum(MG_S) as MG_S, sum(HMG_S) as HMG_S, sum(SG_S) as SG_S, sum(BFG_S) as BFG_S, sum(NG_S) as NG_S, sum(CG_S) as CG_S from GamePlayer";
	var sql = [];
	sql.push( 'select' );
	sql.push( 'sum(RL_S) as RL_S, sum(RG_S) as RG_S, sum(LG_S) as LG_S, sum(GL_S) as GL_S, sum(PG_S) as PG_S, sum(MG_S) as MG_S, sum(HMG_S) as HMG_S, sum(SG_S) as SG_S, sum(BFG_S) as BFG_S, sum(NG_S) as NG_S, sum(CG_S) as CG_S ' );
	sql.push( 'from GamePlayer' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 7*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/activity/week/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/activity/week/players', function( req, res ) {
	var sql = [];
	sql.push( 'select' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'hour,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'hour( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as hour,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 7 day ) )' );
	sql.push( 'group by day, hour, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day, hour' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/activity/month/matches', function( req, res ) {
	var sql = [];
	sql.push( 'select' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'sum( IF( PREMIUM=1, 1, 0 ) ) as premium,' );
	sql.push( 'sum( IF( PREMIUM=0, 1, 0 ) ) as standard,' );
	sql.push( 'sum( IF( RANKED=1, 1, 0 ) ) as ranked,' );
	sql.push( 'sum( IF( RANKED=0, 1, 0 ) ) as unranked,' );
	sql.push( 'sum( IF( RULESET=1, 1, 0 ) ) as classic,' );
	sql.push( 'sum( IF( RULESET=2, 1, 0 ) ) as turbo,' );
	sql.push( 'sum( IF( RULESET=3, 1, 0 ) ) as ql,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from Game' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.get( '/api/activity/month/players', function( req, res ) {
	var sql = [];
	sql.push( 'select' );
	sql.push( 'year,' );
	sql.push( 'month,' );
	sql.push( 'day,' );
	sql.push( 'sum( duel ) as duel,' );
	sql.push( 'sum( ca ) as ca,' );
	sql.push( 'sum( ffa ) as ffa,' );
	sql.push( 'sum( tdm ) as tdm,' );
	sql.push( 'sum( ctf ) as ctf,' );
	sql.push( 'sum( race ) as race,' );
	sql.push( 'sum( rr ) as rr,' );
	sql.push( 'sum( ad ) as ad,' );
	sql.push( 'sum( harv ) as harv,' );
	sql.push( 'sum( ft ) as ft,' );
	sql.push( 'sum( dom ) as dom,' );
	sql.push( 'count(*) as total' );
	sql.push( 'from (' );
	sql.push( 'select' );
	sql.push( 'p.NAME,' );
	sql.push( 'year( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as year,' );
	sql.push( 'month( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as month,' );
	sql.push( 'day( FROM_UNIXTIME( GAME_TIMESTAMP ) ) as day,' );
	sql.push( 'sum( IF( GAME_TYPE="duel", 1, 0 ) ) as duel,' );
	sql.push( 'sum( IF( GAME_TYPE="ca", 1, 0 ) ) as ca,' );
	sql.push( 'sum( IF( GAME_TYPE="ffa", 1, 0 ) ) as ffa,' );
	sql.push( 'sum( IF( GAME_TYPE="tdm", 1, 0 ) ) as tdm,' );
	sql.push( 'sum( IF( GAME_TYPE="ctf", 1, 0 ) ) as ctf,' );
	sql.push( 'sum( IF( GAME_TYPE="race", 1, 0 ) ) as race,' );
	sql.push( 'sum( IF( GAME_TYPE="rr", 1, 0 ) ) as rr,' );
	sql.push( 'sum( IF( GAME_TYPE="ad", 1, 0 ) ) as ad,' );
	sql.push( 'sum( IF( GAME_TYPE="harv", 1, 0 ) ) as harv,' );
	sql.push( 'sum( IF( GAME_TYPE="ft", 1, 0 ) ) as ft,' );
	sql.push( 'sum( IF( GAME_TYPE="dom", 1, 0 ) ) as dom,' );
	sql.push( 'count(*)' );
	sql.push( 'from Game g' );
	sql.push( 'left join GamePlayer gp' );
	sql.push( 'on gp.GAME_ID=g.ID' );
	sql.push( 'left join Player p' );
	sql.push( 'on p.ID=gp.PLAYER_ID' );
	sql.push( 'where GAME_TIMESTAMP > UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) )' );
	sql.push( 'group by day, p.NAME' );
	sql.push( ') a' );
	sql.push( 'group by day' );
	sql = sql.join( ' ' );
	_dt = qlscache.doCache( req, sql, [], { time: 2*24*60*60*1000 } );
	res.jsonp( _dt );
	res.end();
} );

app.listen( cfg.api.port );

// escape chars
function mysql_real_escape_string( str ) {
	return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
		switch( char ) {
			case "\0":
				return "\\0";
			case "\x08":
				return "\\b";
			case "\x09":
				return "\\t";
			case "\x1a":
				return "\\z";
			case "\n":
				return "\\n";
			case "\r":
				return "\\r";
			case "\"":
			case "'":
			case "\\":
			case "%":
				return "\\"+char; // prepends a backslash to backslash, percent,
				// and double/single quotes
		}
	} );
}

// get game
function get_game( ldcore, game_public_id ) {
	var url2 = 'http://www.quakelive.com/stats/matchdetails/' + "";
	request( { uri: url2 + game_public_id, jar: ldcore._cookieJar, method: 'GET', timeout: 10000 }, function( err, resp, body ) {
		console.log( body ); // ASDF
		var j = JSON.parse( body );
		// save to disk
		if( j.UNAVAILABLE != 1 ) {
		  return ldcore.processGame(j);
		}
	  return Q( undefined );
	} );
}

// currentgame function and route
app.get('/api/players/:player/currentgame', function (req, res) {
    player = (req.params.player);
    var u = 'http://www.quakelive.com/browser/list?filter=';
    var s1 = '{\"arena_type\":\"\",\"filters\":{\"arena\":\"\",\"difficulty\":\"any\",\"game_type\":\"any\",\"group\":\"all\",\"invitation_only\":0,\"location\":\"ALL\",\"premium_only\":0,\"private\":0,\"ranked\":\"any\",\"state\":\"any\"},\"game_types\":[5,4,3,0,1,9,10,11,8,6],\"ig\":0,\"players\":[\"' + (req.params.player) + '\"]}';
    var s2 = '{\"arena_type\":\"\",\"filters\":{\"arena\":\"\",\"difficulty\":\"any\",\"game_type\":\"any\",\"group\":\"all\",\"invitation_only\":0,\"location\":\"ALL\",\"premium_only\":0,\"private\":1,\"ranked\":\"any\",\"state\":\"any\"},\"game_types\":[5,4,3,0,1,9,10,11,8,6],\"ig\":0,\"players\":[\"' + (req.params.player) + '\"]}';
    var b1 = Buffer(s1).toString('base64');
    var b2 = Buffer(s2).toString('base64');
    var searchpublicreq;
    searchpublicreq = (u) + (b1);
    searchprivatereq = (u) + (b2);
    searchpublic(searchpublicreq , res);
});

function searchpublic(searchpublicreq, res) {
    request(searchpublicreq, function (error, response, body) {
        if(!error && response.statusCode == 200) {
            var x = (body);
            var playergame = JSON.parse(x);
            var a = JSON.parse(x);
            var str = JSON.stringify(a);
            //todo ALTER THIS with better method eg /public_id":(\d+)
            var regexp = /public_id/ig;
            var matches_array = str.match(regexp);
						if(matches_array == null) {
							searchprivate(searchprivatereq, res);
						}
						else {
							var getcurrentgame;
							getcurrentgame = (a.servers[0].public_id);
							getmatchdetails(getcurrentgame, res);
						}
        }
    });
};

function searchprivate (searchprivatereq, res) {
    request(searchprivatereq, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var x = (body);
            var playergame = JSON.parse(x);
            var a = JSON.parse(x);
            var str = JSON.stringify(a);
            //todo ALTER THIS with better method /public_id":(\d+)
            var regexp = /public_id/ig;
            var matches_array = str.match(regexp);
            if(matches_array == null) {
								res.set( 'Cache-Control', 'public, max-age=120' );
								res.jsonp( { data: { } } );
								res.end();
            }
						else {
                var getcurrentgame;
                getcurrentgame = (a.servers[0].public_id);
                getmatchdetails(getcurrentgame, res);
            }
        }
    });
};


// use on sucess of search
// TODO add error check and for usuage outside currentgame route
function getmatchdetails( getcurrentgame, res ) {
    var pid = 'http://quakelive.com/browser/details?ids=' + ( getcurrentgame );
    request(pid, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var x = (body);
            var a = x.substring(1, x.length - 1);  // i don't like arrays :)
            var b = JSON.parse(a);
/*
 TODO Add player(s) score(s): can use b.players.PLAYERNAME.score Change to set vars via loop
*/
            // setup vars
            var insta = (b.g_instagib);
            var gtype = (b.game_type_title);
            var ruleset = (b.ruleset);
            var map = (b.map_title);
            var location = (b.location_id);
            var red = (b.g_redscore);
            var blue = (b.g_bluescore);
            var pubid = (b.public_id);
            var host = (b.host_name);
            var ip = (b.host_address);
            var owner = (b.owner);
            var gamestate = (b.g_gamestate);
            var numplayers = (b.num_players);
            var fraglimit = (b.fraglimit);
            var caplimit = (b.capturelimit);
            var timelimit = (b.timelimit);
            var premium = (b.premium);
            var pass = (b.g_needpass);
            var teamsize = (b.teamsize);
            var scorelimit = (b.scorelimit);
            var needpass = '';
            var needprem ='';
            var rulesettype ='';
            var maxclients = (b.max_clients);
            var num_clients = (b.num_clients);
            var slotsfree = (maxclients) - (num_clients);
            if (gamestate != 'IN_PROGRESS') {var gamestate = 'Not Started'}
            if (ruleset = '0') {var rulesettype = 'VQL';}
            if (ruleset != '0' ) { var rulesettype = ' PQL';}
            if (insta != '0' ) { var gtype = 'Insta ' + gtype;}
            if (pass != '0' ) {var needpass = ' Need Pass';}
            if (premium != '0' ) { var needprem = ' Need Prem' ;}
            var starttime = (b.g_levelstarttime);
//use?  var currenttime = Math.round(+new Date()/1000); //unixtime
            var expectedendtime = (b.g_levelstarttime) + (timelimit * 60 )  ;
// todo change to better method
            var newstarttime = new Date(starttime * 1000 );
            var newhours = newstarttime.getHours();
            var newmins  = newstarttime.getMinutes();
            var newsec   = newstarttime.getSeconds();
            var newstarttimeformat = newhours + ':' + newmins + ':' + newsec;
            var newendtime = new Date(expectedendtime * 1000 );
            var newendhours = newendtime.getHours();
            var newendmins  = newendtime.getMinutes();
            var newendsec   = newendtime.getSeconds();
            var newendtimeformat = newendhours + ':' + newendmins + ':' + newendsec;
            var startendtime = ' Start: ' + newstarttimeformat + ' End: ' + newendtimeformat;
// todo fix output
            foundgamedata = (player + ' at: /connect ' + ip + ' GameType: ' + gtype + ' ' + startendtime + ' Free Slots: ' + slotsfree + needpass + needprem + ' join them at: http://www.quakelive.com/#!join/' + pubid) ;
						res.set( 'Cache-Control', 'public, max-age=120' );
						res.jsonp( b );
						res.end();
        }
    });
}




