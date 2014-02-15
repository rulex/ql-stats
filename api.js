
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
var allow_update = false;

// read cfg.json
var data = fs.readFileSync( __dirname + '/cfg.json' );
var cfg;
try {
	cfg = JSON.parse( data );
	console.log( 'info', 'Parsed cfg' );
}
catch( err ) {
	console.log( 'warn', 'failed to parse cfg: ' + err );
}

var db = mysql.createConnection( {
	host: cfg.mysql_db.host,
	database: cfg.mysql_db.database,
	user: cfg.mysql_db.user,
	password: cfg.mysql_db.password,
	multipleStatements: true,
} );
db.connect();
// db timeout
setInterval( function() {
	db.ping();
}, 10*60*1000 );

// counter
var requests_counter = 0;
var requests_counter_api = 0;
var requests_counter_pub = 0;
var requests_counter_total = 0;
if( cfg.counter.on ) {
	/*
	setInterval( function() {
		// write counter to file for use in external app
		fs.writeFile( cfg.counter.path, requests_counter, function ( err ) {
			if( err ) { throw err; }
			requests_counter = 0;
		} );
	}, 5*1000 );
	*/
}

// cache
var CACHE = {};

// minify json
//app.set( 'json spaces', 0 );
// vs
//NODE_ENV=production node app.js
var maxAge_public, maxAge_api;
app.configure( 'development', function() {
	//db = require( 'mongoskin').db( 'localhost:27017/bands' );
	maxAge_public = 0;
	maxAge_api = 0;
	maxAge_api_long = 0;
} );

app.configure( 'production', function() {
	//db = require( 'mongoskin').db( 'localhost:37751/bands' );
	allow_update = true;
	maxAge_public = 24*60*60*1000;
	maxAge_api = 60*1000;
	maxAge_api_long = 60*60*1000;
} );

// gzip/compress
app.use( express.compress() );
// http console logger
app.use( express.logger( 'short' ) );
// http log to file
var logFile = fs.createWriteStream( cfg.api.httplogfile, { flags: 'w' } );
app.use( express.logger( { stream: logFile } ) );
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
app.use( '/get/game', express.static( __dirname + '/games' ) );
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
	res.jsonp( { data: { routes: app.routes } } );
	res.end();
} );
app.get( '/api/search/players/:search_str', function ( req, res ) {
	var search_str = mysql_real_escape_string( req.params.search_str );
	var sql = 'select PLAYER_NICK from Players WHERE PLAYER_NICK like \'' + search_str + '%\' GROUP BY PLAYER_NICK ORDER BY NULL desc LIMIT 200';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { data: { players: rows } } );
		res.end();
	} );
} );
app.get( '/api/search/teams', function ( req, res ) {
	var queryObject = url.parse( req.url, true ).query;
	var _nicks = _owners = _players = _gametypes = _maps = _ranked = _premium = _ruleset = _tags = null;
	var _nicks_sql = _owners_sql = _owners_sql2 = _players_sql = _gametypes_sql = _maps_sql = _ranked_sql = _premium_sql = _tags_sql = _tags_sql2 = _ruleset_sql = "";
	if( typeof queryObject.nicks != 'undefined' ) { _nicks = mysql_real_escape_string( queryObject.nicks ).split( ' ' ); }
	if( typeof queryObject.owners != 'undefined' ) { _owners = mysql_real_escape_string( queryObject.owners ).split( ' ' ); }
	if( typeof queryObject.gametypes != 'undefined' ) { _gametypes = mysql_real_escape_string( queryObject.gametypes ).split( ' ' ); }
	if( typeof queryObject.maps != 'undefined' ) { _maps = mysql_real_escape_string( queryObject.maps ).split( ' ' ); }
	if( typeof queryObject.ranked != 'undefined' ) { _ranked = mysql_real_escape_string( queryObject.ranked ).split( ' ' ); }
	if( typeof queryObject.premium != 'undefined' ) { _premium = mysql_real_escape_string( queryObject.premium ).split( ' ' ); }
	if( typeof queryObject.ruleset != 'undefined' ) { _ruleset = mysql_real_escape_string( queryObject.ruleset ).split( ' ' ); }
	if( typeof queryObject.tags != 'undefined' ) { _tags = mysql_real_escape_string( queryObject.tags ).split( ' ' ); }
	if( _nicks != null ) {
		_nicks_sql = '(';
		for( var i=0; i<_nicks.length; i++ ) {
			_nicks_sql += ' PLAYER_NICK="' + _nicks[i] + '" ';
			if( ( i + 1 ) != _nicks.length ) { _nicks_sql += ' or ' }
		}
		_nicks_sql += ')';
	}
	if( _owners != null ) {
		_owners_sql = ' and (';
		for( var i=0; i<_owners.length; i++ ) {
			_owners_sql += ' OWNER="' + _owners[i] + '" ';
			if( ( i + 1 ) != _owners.length ) { _owners_sql += ' or ' }
		}
		_owners_sql += ')';
		_owners_sql2 = ' left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID ';
	}
	if( _gametypes != null ) {
		_gametypes_sql = ' and (';
		for( var i=0; i<_gametypes.length; i++ ) {
			_gametypes_sql += ' GAME_TYPE="' + _gametypes[i] + '" ';
			if( ( i + 1 ) != _gametypes.length ) { _gametypes_sql += ' or ' }
		}
		_gametypes_sql += ')';
		_owners_sql2 = ' left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID ';
	}
	if( _maps != null ) {
		_maps_sql = ' and (';
		for( var i=0; i<_maps.length; i++ ) {
			_maps_sql += ' MAP="' + _maps[i] + '" ';
			if( ( i + 1 ) != _maps.length ) { _maps_sql += ' or ' }
		}
		_maps_sql += ')';
		_owners_sql2 = ' left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID ';
	}
	if( _tags != null ) {
		_tags_sql = ' and (';
		for( var i=0; i<_tags.length; i++ ) {
			_tags_sql += ' tag_id=' + _tags[i] + ' ';
			if( ( i + 1 ) != _tags.length ) { _tags_sql += ' or ' }
		}
		_tags_sql += ')';
		_tags_sql2 = ' left join game_tags on Players.PUBLIC_ID=game_tags.PUBLIC_ID ';
	}
	if( _ranked != null ) {
		_ranked_sql = ' and (';
		for( var i=0; i<_ranked.length; i++ ) {
			_ranked_sql += ' RANKED="' + _ranked[i] + '" ';
			if( ( i + 1 ) != _ranked.length ) { _ranked_sql += ' or ' }
		}
		_ranked_sql += ')';
		_owners_sql2 = ' left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID ';
	}
	if( _premium != null ) {
		_premium_sql = ' and (';
		for( var i=0; i<_premium.length; i++ ) {
			_premium_sql += ' PREMIUM="' + _premium[i] + '" ';
			if( ( i + 1 ) != _premium.length ) { _premium_sql += ' or ' }
		}
		_premium_sql += ')';
		_owners_sql2 = ' left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID ';
	}
	if( _ruleset != null ) {
		_ruleset_sql = ' and (';
		for( var i=0; i<_ruleset.length; i++ ) {
			_ruleset_sql += ' RULESET=' + _ruleset[i] + ' ';
			if( ( i + 1 ) != _ruleset.length ) { _ruleset_sql += ' or ' }
		}
		_ruleset_sql += ')';
	}
	var sql = 'select \
	PLAYER_NICK, \
	count(*) as MATCHES_PLAYED, \
	sum(PLAY_TIME) as PLAY_TIME_SUM, \
	avg(RANK) as RANK_AVG, \
	avg(TEAM_RANK) as TEAM_RANK_AVG, \
	avg(SCORE) as SCORE_AVG, \
	avg(KILLS) as KILLS_AVG, \
	avg(DEATHS) as DEATHS_AVG, \
	avg(KILLS/DEATHS) as RATIO_AVG, \
	avg(HITS)/avg(SHOTS)*100 as ACC, \
	avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, \
	avg(SCORE)/avg(PLAY_TIME)*60 as SCORE_PER_MIN_AVG, \
	avg(DAMAGE_DEALT)-avg(DAMAGE_TAKEN) as DAMAGE_NET_AVG  \
	from Players '+ _owners_sql2 +' '+ _tags_sql2 +' WHERE '+ _nicks_sql +' '+ _owners_sql +' '+ _gametypes_sql +' '+ _maps_sql +' '+ _tags_sql +' '+ _ranked_sql +' '+ _premium_sql +' '+ _ruleset_sql +' GROUP BY PLAYER_NICK ORDER BY NULL desc LIMIT 200';
	db.query( sql, function( err, rows, fields ) {
		if( typeof queryObject.dbug != 'undefined' ) {
			res.jsonp( { data: { nicks: _nicks, owners: _owners, gametypes: _gametypes, maps: _maps, ranked: _ranked, premium: _premium, tags: _tags, players: rows }, sql: sql, fields: fields, err: err } );
		}
		else {
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
			res.jsonp( { data: { players: rows } } );
		}
		res.end();
	} );
} );
//app.get( '/api/search/games', function ( req, res ) 
app.get( '/api/players/:page', function ( req, res ) {
	var page = mysql_real_escape_string( req.params.page );
	if( !isNumber( page ) ) {
		page = 0;
	}
	var sql = 'select PLAYER_NICK as PLAYER_NICK, PLAYER_COUNTRY as PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(KILLS) as KILLS, sum(DEATHS) as DEATHS, sum(KILLS)/sum(DEATHS) as RATIO,sum(HITS) as HITS,avg(HITS) as HITS_AVG,sum(SHOTS) as SHOTS,avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(PLAY_TIME) as PLAY_TIME,sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG,sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG,sum(DAMAGE_DEALT) as DAMAGE_DEALT,avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG from Players GROUP BY PLAYER_NICK ORDER BY PLAYER_NICK desc LIMIT ' + page*_perpage + ',' + _perpage;
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { players: rows } } );
		res.end();
	} );
} );
app.get( '/api/player/:player/games', function ( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'select Games.PUBLIC_ID, Games.GAME_TIMESTAMP, Games.MAP, Games.GAME_TYPE, Games.OWNER, Games.RULESET, Games.RANKED, Games.PREMIUM, DAMAGE_DEALT/PLAY_TIME as DAMAGE_DEALT_PER_SEC_AVG, Players.PLAYER_NICK from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where Players.PLAYER_NICK="'+ nick +'" order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { games: rows } } );
		res.end();
	} );
} );
app.get( '/api/player/:player/clans', function ( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'select PLAYER_NICK, PLAYER_CLAN, count(*) as MATCHES_PLAYED from Players where PLAYER_NICK="'+ nick +'" group by PLAYER_CLAN order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { clans: rows } } );
		res.end();
	} );
} );
app.get( '/api/player/:player/countries', function ( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'select PLAYER_NICK, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED from Players where PLAYER_NICK="'+ nick +'" group by PLAYER_COUNTRY order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { countries: rows } } );
		res.end();
	} );
} );
app.get( '/api/player/:player/update', function ( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	var d = new Date();
	var url = 'http://www.quakelive.com/profile/matches_by_week/' + nick + '/' + d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getUTCDate();
	if( allow_update ) {
		request( url, function( err, resp, body ) {
			if( err ) { throw err; }
			$ = cheerio.load( body );
			var lastgame = "";
			var _lastgame = $( '.areaMapC' ).length-1;
			var nrcallbacks = $( '.areaMapC' ).length;
			if( nrcallbacks == 0 ) {
				res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
				res.jsonp( { data: { player: nick, updated: 0, scanned: nrcallbacks, updated_games: lastgames } } );
				return;
			}
			var requestCallback = new MyRequestsCompleted( {
				numRequest: nrcallbacks,
				singleCallback: function() {
					res.jsonp( { data: { player: nick, updated: lastgames.length, scanned: nrcallbacks, updated_games: lastgames } } );
					lastgames = [];
					res.end();
				}
			} );
			$( '.areaMapC' ).each( function( i ) {
				lastgame = $(this).attr( 'id' ).split( '_' )[1];
				var last_game_public_id = lastgame;
				db.query( 'SELECT PUBLIC_ID FROM Games WHERE PUBLIC_ID=\''+ lastgame +'\'', function( err, rows, fields ) {
					if( err ) { throw err; }
					if( rows.length > 0 ) {
						requestCallback.requestComplete( true );
					}
					else {
						get_game( last_game_public_id, requestCallback );
					}
				}	);
			} );
		} );
	}
	else {
		res.jsonp( { data: {}, error: [ { not_allowed: "" } ] } );
		res.end();
	}
} );
app.get( '/api/player/:player', function ( req, res ) {
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE PLAYER_NICK=\''+ nick +'\' GROUP BY PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { player: rows[0] } } );
		res.end();
	} );
} );
app.get( '/api/games', function ( req, res ) {
	var sql = 'SELECT * FROM Games order by GAME_TIMESTAMP desc LIMIT 100';
	if( req.route.path in CACHE ) {
		res.jsonp( { data: { games: CACHE[req.route.path].data } } );
		res.end();
		if( CACHE[req.route.path].ts > ( new Date().getTime() + maxAge_api_long ) && !CACHE[req.route.path].fetching ) {
			CACHE[req.route.path].fetching = true;
			db.query( sql, function( err, rows, fields ) {
				CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			} );
		}
	}
	else {
		db.query( sql, function( err, rows, fields ) {
			CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
			res.jsonp( { data: { games: rows } } );
			res.end();
		} );
	}
} );
app.get( '/api/game/:game/player/:player', function ( req, res ) {
	var game = mysql_real_escape_string( req.params.game );
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players WHERE Players.PUBLIC_ID=\'' + game + '\' and Players.PLAYER_NICK=\''+ nick +'\' ';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { player: rows[0] } } );
		res.end();
	} );
} );
app.get( '/api/game/:game/tags', function( req, res ) {
	// move this to /game/* ?
	var game = mysql_real_escape_string( req.params.game );
	var sql = 'select tags.id, tags.name, game_tags.PUBLIC_ID from tags left join game_tags on tags.id=game_tags.tag_id where game_tags.PUBLIC_ID=\''+ game +'\'';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { tags: rows } } );
		res.end();
	} );
} );
app.get( '/api/game/:game/get', function( req, res ) {
	var game = mysql_real_escape_string( req.params.game );
	var sql = 'select PUBLIC_ID from Games where PUBLIC_ID=\''+ game +'\'';
	db.query( sql, function( err, rows, fields ) {
		if( rows.length == 0 ) {
			get_game( game, null, res );
		}
		else {
			res.jsonp( { data: {}, error: "already exist" } );
			res.end();
		}
	} );
} );
app.get( '/api/game/:game/tag/add/:tag', function( req, res ) {
	// move this to /game/* ?
	var game = mysql_real_escape_string( req.params.game );
	var tag = mysql_real_escape_string( req.params.tag );
	// if game/tag exists...
	var sql = 'insert into game_tags( tag_id, PUBLIC_ID ) values( '+ tag +', \''+ game +'\' )';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { data: { rows: rows, err: err, fields: fields } } );
		res.end();
	} );
} );
//app.get( '/api/game/*/tag/del/*',
app.get( '/api/game/:game', function ( req, res ) {
	var game = mysql_real_escape_string( req.params.game );
	var sql = [];
	sql[0] = 'SELECT * FROM Games WHERE PUBLIC_ID=\'' + game + '\'';
	sql[1] = 'SELECT * FROM Players WHERE PUBLIC_ID=\'' + game + '\'';
	sql[2] = 'select Players.TEAM, count(Players.PLAYER_NICK) as PLAYERS, sum(Players.SCORE) as SCORE_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(Players.SCORE) as SCORE_AVG, sum(Players.KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, avg(Players.DEATHS) as DEATHS_AVG, sum(Players.DEATHS) as DEATHS_SUM, sum(Players.SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(Players.HITS) as HITS_SUM, avg(HITS) as HITS_AVG, avg(Players.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, sum(Players.DAMAGE_DEALT)/sum(Players.PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, avg(RL_H) as RL_H_AVG, sum(RL_H) as RL_H_SUM, avg(RL_S) as RL_S_AVG, sum(RL_S) as RL_S_SUM, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, avg(LG_H) as LG_H_AVG, sum(LG_H) as LG_H_SUM, avg(LG_S) as LG_S_AVG, sum(LG_S) as LG_S_SUM, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, avg(RG_H) as RG_H_AVG, sum(RG_H) as RG_H_SUM, avg(RG_S) as RG_S_AVG, sum(RG_S) as RG_S_SUM from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Players.PUBLIC_ID="'+ game +'" group by TEAM with rollup ';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { game: resulty[0][0], teams: resulty[2], players: resulty[1] } } );
		res.end();
	} );
} );
app.get( '/api/owners', function ( req, res ) {
	var sql = 'SELECT OWNER, count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH_SUM, avg(GAME_LENGTH) as GAME_LENGTH_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC, sum(case when GAME_TYPE="duel" then 1 else 0 end) as duel, sum(case when GAME_TYPE="tdm" then 1 else 0 end) as tdm, sum(case when GAME_TYPE="ca" then 1 else 0 end) as ca FROM Games group by OWNER order by NULL';
	if( req.route.path in CACHE ) {
		res.jsonp( { data: { owners: CACHE[req.route.path].data } } );
		res.end();
		if( CACHE[req.route.path].ts > ( new Date().getTime() + maxAge_api_long ) && !CACHE[req.route.path].fetching ) {
			CACHE[req.route.path].fetching = true;
			db.query( sql, function( err, rows, fields ) {
				CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			} );
		}
	}
	else {
		db.query( sql, function( err, rows, fields ) {
			CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
			res.jsonp( { data: { owners: rows } } );
			res.end();
		} );
	}
} );
app.get( '/api/owner/:owner/players', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	// players
	//var sql = 'select Games.PUBLIC_ID, Games.OWNER, Players.PLAYER_NICK, Players.PLAYER_CLAN, Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(Players.DAMAGE_DEALT)/avg(Players.PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( Players.PLAY_TIME ) as PLAY_TIME, sum( Players.KILLS ) as KILLS, sum( Players.DEATHS ) as DEATHS, avg( Players.KILLS/Players.DEATHS ) as RATIO from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where OWNER="'+ owner +'" group by Players.PLAYER_NICK;';
	var sql = 'select Players.PLAYER_NICK, Players.PLAYER_CLAN, Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { players: rows } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner/clans', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	sql = 'select Players.PLAYER_CLAN, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_CLAN order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { clans: rows, more: 'less' } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner/tags', function( req, res ) {
	// move this to /game/* ?
	var owner = mysql_real_escape_string( req.params.owner );
	var sql = 'select tags.id, tags.name, game_tags.PUBLIC_ID from tags left join game_tags on tags.id=game_tags.tag_id where game_tags.OWNER=\''+ owner +'\'';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { tags: rows } } );
		res.end();
	} );
} );
//app.get( '/api/owner/*/clan/*'
app.get( '/api/owner/:owner/player/:player/games', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'select Games.PUBLIC_ID, Games.GAME_TIMESTAMP, Games.MAP, Games.GAME_TYPE, Games.OWNER, Games.RULESET, Games.RANKED, Games.PREMIUM, Players.PLAYER_NICK, DAMAGE_DEALT/PLAY_TIME as DAMAGE_DEALT_PER_SEC_AVG from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where Players.PLAYER_NICK="'+ nick +'" and Games.OWNER=\''+ owner +'\' order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { games: rows } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner/player/:player', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var nick = mysql_real_escape_string( req.params.player );
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT/PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE Games.OWNER=\'' + owner + '\' and Players.PLAYER_NICK=\''+ nick +'\' GROUP BY PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { player: rows[0] } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner/countries', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	// players
	sql = 'select Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_COUNTRY order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { countries: rows, more: 'less' } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner/games', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	sql = 'select * from Games where OWNER="'+ owner +'"';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { games: rows, more: 'less' } } );
		res.end();
	} );
} );
app.get( '/api/owner/:owner', function ( req, res ) {
	var owner = mysql_real_escape_string( req.params.owner );
	var sql = [];
	sql = 'SELECT OWNER, count(*) as MATCHES_PLAYED, sum(PREMIUM) as PREMIUM_COUNT, avg(GAME_LENGTH) as GAME_LENGTH_AVG,  sum(GAME_LENGTH) as GAME_LENGTH_SUM,avg(NUM_PLAYERS) as NUM_PLAYERS_AVG, avg(TOTAL_KILLS) as TOTAL_KILLS_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS_SUM, avg(DMG_DELIVERED_NUM) as DMG_DELIVERED_NUM_AVG, avg(TSCORE0) as TSCORE0_AVG, avg(TSCORE1) as TSCORE1_AVG FROM Games where OWNER="'+ owner +'" order by null';
	//sql[1] = 'select MAP, count(*) as MATCHES_PLAYED from Games where OWNER="'+ owner +'" group by MAP order by NULL';
	// unique players
	//sql[1] = 'select count(*) as UNIQUE_PLAYERS from ( select PLAYER_NICK from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by PLAYER_NICK order by NULL ) as a';
	// game types
	//sql[3] = 'select count(*) as MATCHES_PLAYED, GAME_TYPE from Games where OWNER="'+ owner +'" group by GAME_TYPE order by NULL';
	// players
	//sql[4] = 'select Players.PLAYER_NICK, count(*) as MATCHES_PLAYED, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api_long );
		res.jsonp( { data: { owner: rows[0] } } );
		res.end();
	} );
} );
/*
app.get( '/api/clans', function ( req, res ) {
	var sql = 'select Players.PLAYER_CLAN as PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, sum(Players.KILLS) as KILLS, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(Players.PLAY_TIME) as PLAY_TIME, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG from Players GROUP BY Players.PLAYER_CLAN ORDER BY NULL';
	//var sql = 'select Players.PLAYER_CLAN as PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, sum(Players.KILLS) as KILLS, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(Players.PLAY_TIME) as PLAY_TIME, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID GROUP BY Players.PLAYER_CLAN ORDER BY NULL';
	//var sql = 'select Players.PLAYER_CLAN as PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO,sum(Players.HITS) as HITS, avg(Players.HITS) as HITS_AVG,sum(Players.SHOTS) as SHOTS,avg(Players.SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(Players.PLAY_TIME) as PLAY_TIME,sum(Players.EXCELLENT) as EXCELLENT_SUM, avg(Players.EXCELLENT) as EXCELLENT_AVG, sum(Players.IMPRESSIVE) as IMPRESSIVE_SUM, avg(Players.IMPRESSIVE) as IMPRESSIVE_AVG,sum(Players.HUMILIATION) as HUMILIATION_SUM, avg(Players.HUMILIATION) as HUMILIATION_AVG,sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT,avg(Players.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN, avg(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID GROUP BY Players.PLAYER_CLAN ORDER BY NULL';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { data: { clans: rows } } );
		res.end();
	} );
} );
app.get( '/api/clan/*', function ( req, res ) {
	var str1 = '';
	var str2 = '';
	var clan = req.url.split( '/' );
	clan.shift(); clan.shift(); clan.shift();
	clan = decodeURI( clan.join( '' ) );
	var sql = [];
	sql[0] = 'SELECT PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE '+str1+str2+' PLAYER_CLAN=\''+ clan +'\' GROUP BY PLAYER_CLAN order by null';
	sql[1] = 'SELECT PLAYER_NICK, PLAYER_COUNTRY, count(PLAYER_NICK) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE '+str1+str2+' PLAYER_CLAN=\''+ clan +'\' GROUP BY PLAYER_NICK, PLAYER_CLAN order by null';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.jsonp( { data: { clan: resulty[0][0], players: resulty[1] } } );
		res.end();
	} );
} );
app.get( '/api/all/daily', function ( req, res ) {
	// maps
	sql = 'select count(*) as count, DATE(from_unixtime(GAME_TIMESTAMP)) as date, year(from_unixtime(GAME_TIMESTAMP)) as year, month(from_unixtime(GAME_TIMESTAMP)) as month, day(from_unixtime(GAME_TIMESTAMP)) as day from Games group by year,month,day order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { thedays: rows } );
		res.end();
	} );
} );
app.get( '/api/all/maps', function ( req, res ) {
	// maps
	sql = 'select count(*) as MATCHES_PLAYED, MAP from Games group by MAP order by MATCHES_PLAYED desc';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { themaps: rows } );
		res.end();
	} );
} );
app.get( '/api/all', function ( req, res ) {
	//var game = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = [];
	// games
	sql[0] = 'SELECT count(*) as MATCHES_PLAYED, SUM(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC FROM Games';
	// players
	sql[1] = 'SELECT sum(PLAY_TIME) as PLAY_TIME_SUM, sum(SHOTS) as SHOTS, sum(KILLS) as KILLS, sum(RL_K) as RL_K_SUM, sum(RG_K) as RG_K_SUM, sum(LG_K) as LG_K_SUM FROM Players ';
	// UNIQUE_PLAYERS
	sql[2] = 'select count(*) as UNIQUE_PLAYERS from ( select PLAYER_NICK from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID group by PLAYER_NICK ) as a';
	// first/latest game
	sql[3] = 'select min(GAME_TIMESTAMP) as min, max(GAME_TIMESTAMP) as max from Games';
	// types
	sql[4] = 'select GAME_TYPE, count(*) as MATCHES_PLAYED from Games group by GAME_TYPE order by MATCHES_PLAYED desc';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.jsonp( { games: resulty[0], UNIQUE_PLAYERS: resulty[2], min_max: resulty[3], gametypes: resulty[4], players: resulty[1] } );
		res.end();
	} );
} );
app.get( '/api/maps', function ( req, res ) {
	var sql = 'SELECT MAP, count(*) as MATCHES_PLAYED, sum(TOTAL_KILLS) as TOTAL_KILLS, sum(GAME_LENGTH) as GAME_LENGTH FROM Games group by MAP order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { data: { maps: rows } } );
		res.end();
	} );
} );
app.get( '/api/map/*', function ( req, res ) {
	var map = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = [];
	sql[0] = 'SELECT MAP, count(*) as MATCHES_PLAYED FROM Games WHERE MAP=\'' + map + '\' group by MAP';
	//sql[1] = 'SELECT * FROM Players WHERE MAP=\'' + map + '\'';
	//sql[2] = 'select Players.TEAM, count(Players.PLAYER_NICK) as PLAYERS, sum(Players.SCORE) as SCORE, avg(Players.SCORE) as SCORE_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.SHOTS) as SHOTS, sum(Players.HITS) as HITS, sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, sum(Players.DAMAGE_DEALT)/sum(Games.GAME_LENGTH) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Players.PUBLIC_ID="'+ game +'" group by TEAM';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.jsonp( { data: { map: resulty[0], teams: resulty[2], players: resulty[1] } } );
		res.end();
	} );
} );
app.get( '/api/countries', function ( req, res ) {
	sql = 'select Players.PLAYER_COUNTRY, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players group by Players.PLAYER_COUNTRY order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { thecountries: rows, more: 'less' } );
		res.end();
	} );
} );
app.get( '/api/gametypes', function ( req, res ) {
	//var type = mysql_real_escape_string( req.url.split( '/' )[4] );
	var sql = 'SELECT GAME_TYPE, count(*) as MATCHES_PLAYED, sum( GAME_LENGTH ) as GAME_LENGTH FROM Games group by GAME_TYPE order by null';
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { data: { gametypes: rows } } );
		res.end();
	} );
} );
*/
app.get( '/api/overview', function ( req, res ) {
	sql = 'select GAME_TYPE, count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH, sum(TOTAL_KILLS) as TOTAL_KILLS from Games group by GAME_TYPE order by NULL';
	if( req.route.path in CACHE ) {
		res.jsonp( { data: { overview: CACHE[req.route.path].data } } );
		res.end();
		if( CACHE[req.route.path].ts > ( new Date().getTime() + maxAge_api_long ) && !CACHE[req.route.path].fetching ) {
			CACHE[req.route.path].fetching = true;
			db.query( sql, function( err, rows, fields ) {
				CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			} );
		}
	}
	else {
		db.query( sql, function( err, rows, fields ) {
			CACHE[req.route.path] = { ts: new Date().getTime(), data: rows, fetching: false };
			res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
			res.jsonp( { data: { overview: rows } } );
			res.end();
		} );
	}
} );
app.get( '/api/tags', function ( req, res ) {
	var sql = 'SELECT id, name, count(*) as tagged_games FROM tags left join game_tags on tags.id=game_tags.tag_id group by id';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { tags: rows } } );
		res.end();
	} );
} );
app.get( '/api/tag/:tag/games', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = [];
	sql = 'SELECT * FROM Games left join game_tags on Games.PUBLIC_ID=game_tags.PUBLIC_ID where game_tags.tag_id=' + tag + ' ';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { games: rows } } );
		res.end();
	} );
} );
app.get( '/api/tag/:tag/owners', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = 'SELECT OWNER, count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH_SUM, avg(GAME_LENGTH) as GAME_LENGTH_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC FROM Games left join game_tags on Games.PUBLIC_ID=game_tags.PUBLIC_ID where game_tags.tag_id='+ tag +' group by OWNER order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { owners: rows } } );
		res.end();
	} );
} );
app.get( '/api/tag/:tag/player/:player', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var nick = mysql_real_escape_string( req.params.player );
	//var sql = 'select * from Players left join game_tags on Players.PUBLIC_ID=game_tags.PUBLIC_ID where game_tags.tag_id='+ tag +' and Players.PLAYER_NICK=\''+ nick +'\'';
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join game_tags on Players.PUBLIC_ID=game_tags.PUBLIC_ID where game_tags.tag_id='+ tag +' and Players.PLAYER_NICK=\''+ nick +'\' GROUP BY PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { player: rows[0] } } );
		res.end();
	} );
} );
app.get( '/api/tag/:tag', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	var sql = [];
	sql[0] = 'SELECT * FROM tags WHERE id=' + tag + '';
	//sql[1] = 'SELECT * FROM Players WHERE PUBLIC_ID=\'' + game + '\'';
	//sql[2] = 'select Players.TEAM, count(Players.PLAYER_NICK) as PLAYERS, sum(Players.SCORE) as SCORE, avg(Players.SCORE) as SCORE_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.SHOTS) as SHOTS, sum(Players.HITS) as HITS, sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, sum(Players.DAMAGE_DEALT)/sum(Games.GAME_LENGTH) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Players.PUBLIC_ID="'+ game +'" group by TEAM';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { tag: resulty[0] } } );
		res.end();
	} );
} );
app.get( '/api/tag/:tag/players', function ( req, res ) {
	var tag = mysql_real_escape_string( req.params.tag );
	// players
	sql = 'select Players.PLAYER_NICK, Players.PLAYER_CLAN, Players.PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS, sum( DEATHS ) as DEATHS, avg( KILLS/DEATHS ) as RATIO from Players left join game_tags on Players.PUBLIC_ID=game_tags.PUBLIC_ID where game_tags.tag_id="'+ tag +'" group by Players.PLAYER_NICK order by NULL';
	db.query( sql, function( err, rows, fields ) {
		res.set( 'Cache-Control', 'public, max-age=' + maxAge_api );
		res.jsonp( { data: { players: rows, more: 'less' } } );
		res.end();
	} );
} );
app.get( '/status', function ( req, res ) {
	var queryObject = url.parse( req.url, true ).query;
	res.jsonp( { requests_counter_total: requests_counter_total, requests_counter: requests_counter, requests_counter_api: requests_counter_api, requests_counter_pub: requests_counter_pub, process_uptime: process.uptime() } );
	res.end();
	if( typeof queryObject.cacti != 'undefined' ) {
		requests_counter = 0;
		requests_counter_api = 0;
		requests_counter_pub = 0;
	}
} );
/*
app.get( '*', function ( req, res ) {
	res.sendfile( './public/index.html' );
} );
*/

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

// elapsed time
function elapsed_time2( timer ) {
	var precision = 3; // 3 decimal places
	var elapsed = process.hrtime( timer )[1] / 1000000; // divide by a million to get nano to milli
	timer = process.hrtime(); // reset the timer
	return parseFloat( elapsed.toFixed( precision ) );
}

//
var MyRequestsCompleted = ( function() {
	var numRequestToComplete, requestsCompleted, callBacks, singleCallBack;
	return function( options ) {
		if( !options ) {
			options = {};
		}
		numRequestToComplete = options.numRequest || 0;
		requestsCompleted = options.requestsCompleted || 0;
		callBacks = [];
		var fireCallbacks = function () {
			for( var i = 0; i < callBacks.length; i++ ) {
				callBacks[i]();
			}
		};
		if( options.singleCallback ) {
			callBacks.push( options.singleCallback );
		}
		this.addCallbackToQueue = function( isComplete, callback ) {
			if( isComplete ) requestsCompleted++;
			if( callback ) callBacks.push( callback );
			if( requestsCompleted == numRequestToComplete ) fireCallbacks();
		};
		this.requestComplete = function( isComplete ) {
			if( isComplete ) requestsCompleted++;
			if( requestsCompleted == numRequestToComplete ) {
				fireCallbacks();
			}
		};
		this.setCallback = function( callback ) {
			callBacks.push( callBack );
		};
	};
} )();

// number
function isNumber( n ) {
	return !isNaN( parseFloat( n ) ) && isFinite( n );
}

// get game

function get_game( game_public_id, requestCallback, res ) {
	var url2 = 'http://www.quakelive.com/stats/matchdetails/' + "";
	request( url2 + game_public_id, function( err, resp, body ) {
		var j = JSON.parse( body );
		// save to disk
		if( j.UNAVAILABLE != 1 ) {
			if( cfg.api.games.save ) {
				fs.writeFile( cfg.api.games.tempdir + j.PUBLIC_ID + '.json', body, function( err ) {
					if( err ) { console.log( err ); }
					else {
						var gzip = zlib.createGzip();
						var inp = fs.createReadStream( cfg.api.games.tempdir  + j.PUBLIC_ID + '.json' );
						var out = fs.createWriteStream( cfg.api.games.gamesdir + j.PUBLIC_ID + '.json.gz' );
						inp.pipe( gzip ).pipe( out );
						fs.unlink( cfg.api.games.tempdir + j.PUBLIC_ID + '.json' );
					}
				} );
			}
			//
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
			if( !isNaN( j.AVG_ACC ) && j.AVG_ACC !== 'undefined' ) {
				AVG_ACC = j.AVG_ACC;
			}
			if( typeof j.MOST_ACCURATE !== 'undefined' ) {
				MOST_ACCURATE_NICK = j.MOST_ACCURATE.PLAYER_NICK;
				MOST_ACCURATE_NUM = j.MOST_ACCURATE.NUM;
			}
			if( typeof j.DMG_DELIVERED !== 'undefined' ) {
				DMG_DELIVERED_NICK = j.DMG_DELIVERED.PLAYER_NICK;
				DMG_DELIVERED_NUM = j.DMG_DELIVERED.NUM;
			}
			if( typeof j.DMG_TAKEN !== 'undefined' ) {
				DMG_TAKEN_NICK = j.DMG_TAKEN.PLAYER_NICK;
				DMG_TAKEN_NUM = j.DMG_TAKEN.NUM;
			}
			if( typeof j.LEAST_DEATHS !== 'undefined' ) {
				LEAST_DEATHS_NICK = j.LEAST_DEATHS.PLAYER_NICK;
				LEAST_DEATHS_NUM = j.LEAST_DEATHS.NUM;
			}
			if( typeof j.MOST_DEATHS !== 'undefined' ) {
				MOST_DEATHS_NICK = j.MOST_DEATHS.PLAYER_NICK;
				MOST_DEATHS_NUM = j.MOST_DEATHS.NUM;
			}
			if( typeof j.TOTAL_ROUNDS !== 'undefined' ) {
				TOTAL_ROUNDS = j.TOTAL_ROUNDS;
				WINNING_TEAM = j.WINNING_TEAM;
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
						'\"' + j.PUBLIC_ID + '\",' +
						'\"' + j.OWNER + '\",' +
						'\"' + j.MAP + '\",' +
						'' + j.NUM_PLAYERS + ',' +
						'' + AVG_ACC + ',' +
						'' + j.PREMIUM + ',' +
						'' + j.RANKED + ',' +
						'' + j.RESTARTED + ',' +
						'' + j.RULESET + ',' +
						'' + j.TIER + ',' +
						'' + j.TOTAL_KILLS + ',' +
						'' + TOTAL_ROUNDS + ',' +
						'\"' + WINNING_TEAM + '\",' +
						'' + j.TSCORE0 + ',' +
						'' + j.TSCORE1 + ',' +
						'\"' + j.FIRST_SCORER + '\",' +
						'\"' + j.LAST_SCORER + '\",' +
						'' + j.GAME_LENGTH + ',' +
						'\"' + j.GAME_TYPE + '\",' +
						'' + new Date( j.GAME_TIMESTAMP ).getTime()/1000 + ',' +
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
			db.query( sql1 + sql2, function( err, rows, fields ) {
				if( err != null && err.code == 'ER_DUP_ENTRY' ) {
					console.log( err );
				}
				else if( err ) {
					throw err;
				}
				else {
					lastgames.push( { PUBLIC_ID: j.PUBLIC_ID, MAP: j.MAP, OWNER: j.OWNER, GAME_TYPE: j.GAME_TYPE, GAME_TIMESTAMP: new Date( j.GAME_TIMESTAMP ).getTime()/1000, GAME_TIMESTAMP2: j.GAME_TIMESTAMP, GAME_TIMESTAMP_NICE: j.GAME_TIMESTAMP_NICE } );
				if( requestCallback != null )
					requestCallback.requestComplete( true );
					//res.jsonp( { nick: nick, update_games:  } );
				}
			}	);
			for( var i in j.BLUE_SCOREBOARD ) {
				var p = j.BLUE_SCOREBOARD[i];
				var IMPRESSIVE = 0;
				var EXCELLENT = 0;
				if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
				if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
				var sql3 = 'INSERT INTO Players(' +
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
						') values( ';
							var sql4 = '' +
							'\"' + j.PUBLIC_ID + '\",' +
							'\"' + p.PLAYER_NICK + '\",' +
							'\"' + p.PLAYER_CLAN + '\",' +
							'\"' + p.PLAYER_COUNTRY + '\",' +
							'' + p.RANK + ',' +
							'' + p.SCORE + ',' +
							'' + p.QUIT + ',' +
							'' + p.DAMAGE_DEALT + ',' +
							'' + p.DAMAGE_TAKEN + ',' +
							'' + p.KILLS + ',' +
							'' + p.DEATHS + ',' +
							'' + p.HITS + ',' +
							'' + p.SHOTS + ',' +
							'\"' + p.TEAM + '\",' +
							'' + p.TEAM_RANK + ',' +
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
							')';
				db.query( sql3 + sql4, function( err, rows, fields ) {
					if( err != null && err.code == 'ER_DUP_ENTRY' ) {
						console.log( err );
					}
					else if( err ) {
						throw err;
					}
				} );
			}
			for( var i in j.RED_SCOREBOARD ) {
				var p = j.RED_SCOREBOARD[i];
				var IMPRESSIVE = 0;
				var EXCELLENT = 0;
				if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
				if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
				var sql3 = 'INSERT INTO Players(' +
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
						') values( ';
							var sql4 = '' +
							'\"' + j.PUBLIC_ID + '\",' +
							'\"' + p.PLAYER_NICK + '\",' +
							'\"' + p.PLAYER_CLAN + '\",' +
							'\"' + p.PLAYER_COUNTRY + '\",' +
							'' + p.RANK + ',' +
							'' + p.SCORE + ',' +
							'' + p.QUIT + ',' +
							'' + p.DAMAGE_DEALT + ',' +
							'' + p.DAMAGE_TAKEN + ',' +
							'' + p.KILLS + ',' +
							'' + p.DEATHS + ',' +
							'' + p.HITS + ',' +
							'' + p.SHOTS + ',' +
							'\"' + p.TEAM + '\",' +
							'' + p.TEAM_RANK + ',' +
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
							')';
				db.query( sql3 + sql4, function( err, rows, fields ) {
					if( err != null && err.code == 'ER_DUP_ENTRY' ) {
						console.log( err );
					}
					else if( err ) {
						throw err;
					}
				} );
			}
			for( var i in j.SCOREBOARD ) {
				var p = j.SCOREBOARD[i];
				var IMPRESSIVE = 0;
				var EXCELLENT = 0;
				var QUIT = 0;
				var TEAM_RANK = 0;
				if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
				if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
				if( typeof p.QUIT !== 'undefined' ) { QUIT = p.QUIT; }
				if( typeof p.TEAM_RANK !== 'undefined' ) { TEAM_RANK = p.TEAM_RANK; }
				var sql3 = 'INSERT INTO Players(' +
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
						') values( ';
							var sql4 = '' +
							'\"' + j.PUBLIC_ID + '\",' +
							'\"' + p.PLAYER_NICK + '\",' +
							'\"' + p.PLAYER_CLAN + '\",' +
							'\"' + p.PLAYER_COUNTRY + '\",' +
							'' + p.RANK + ',' +
							'' + p.SCORE + ',' +
							'' + QUIT + ',' +
							'' + p.DAMAGE_DEALT + ',' +
							'' + p.DAMAGE_TAKEN + ',' +
							'' + p.KILLS + ',' +
							'' + p.DEATHS + ',' +
							'' + p.HITS + ',' +
							'' + p.SHOTS + ',' +
							'\"' + p.TEAM + '\",' +
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
							')';
				db.query( sql3 + sql4, function( err, rows, fields ) {
					if( err != null && err.code == 'ER_DUP_ENTRY' ) {
						console.log( err );
					}
					else if( err ) {
						throw err;
					}
				} );
			}
			if( requestCallback == null ) {
				res.jsonp( { data: { PUBLIC_ID: j.PUBLIC_ID, game: {} } } );
				res.end();
			}
		}
		else {
			if( requestCallback != null )
				requestCallback.requestComplete( true );
		}
	} );
}

