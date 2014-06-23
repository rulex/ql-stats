// no longer used
var fs = require( 'fs' );
var request = require( 'request' );
var mysql = require( 'mysql' );
var express = require( 'express' );
var app = express();
app.enable( "jsonp callback" );
var http = require( 'http' );
var url = require( 'url' );
var $ = require( 'jquery' );
var server = http.createServer( app );

var apiurl = 'http://ql.leeto.fi/api/';
//var apiurl = 'http://ql.l.leeto.fi/api/';

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
	database: cfg.mysql.database,
	user: cfg.mysql_db.user,
	password: cfg.mysql_db.password,
	multipleStatements: true,
} );
db.connect();

var apiurl = 'http://ql.leeto.fi/api/';
//var queue = [];
var queue = [];
var done = {};
var avg_ms = [];
var games = [];

app.use( express.bodyParser() );

app.get( '/api/done', function ( req, res ) {
	res.jsonp( done );
	res.end();
} );
app.get( '/api/queue', function ( req, res ) {
	res.jsonp( queue );
	res.end();
} );
app.get( '/api/ms', function ( req, res ) {
	res.jsonp( avg_ms );
	res.end();
} );
app.get( '/api/games', function ( req, res ) {
	res.jsonp( games );
	res.end();
} );
app.post( '/api/add', function ( req, res ) {
	//console.log( req.body );
	//console.log( req.params );
	for( var i in req.body.players ) {
		if( queue.indexOf( req.body.players[i] ) == -1 ) {
			queue.unshift( req.body.players[i] );
		}
	}
	res.jsonp( { players: req.body } );
	res.end();
} );
app.listen( 5656 );

function upd( nick ) {
	//console.log( 'queue: ' + queue.length );
	//console.log( queue.length );
	//console.log( queue );
	var timer = new Date().getTime();
	$.ajax( {
		url: apiurl + 'players/' + nick + '/update?long',
		//type: 'get',
		dataType:'json',
		complete: function( data ) {
		},
		success: function( data ) {
			var d = new Date();
			// add player to done obj
			done[data.data.player] = {};
			done[data.data.player].ts = d.getTime() + ( 12 *60*60*1000 );
			// update ts for player
			sql2 = 'update updated_players set TS=CURRENT_TIMESTAMP where PLAYER_NICK="'+ data.data.player +'"';
			db.query( sql2, function( err, rows, fields ) {
				if( err ) { console.log( err ); }
			} );
			//console.log( data );
			var _queue = [];
			var _ins = [];
			var _c = 0;
			for( var i in data.data.updated_games ) {
				//console.log( data.data.updated_games[i].players );
				for( var j in data.data.updated_games[i].players ) {
					//console.log( data.data.updated_games[i].players[j].PLAYER_NICK );
					// push to queue if not already there
					games.push( data.data.updated_games[i].PUBLIC_ID );
					_c++;
					if( queue.indexOf( data.data.updated_games[i].players[j].PLAYER_NICK ) != -1 ) {
						continue;
					}
					else {
						// if in done obj
						if( data.data.updated_games[i].players[j].PLAYER_NICK in done ) {
							if( done[data.data.updated_games[i].players[j].PLAYER_NICK].ts < new Date().getTime() ) {
								queue.push( data.data.updated_games[i].players[j].PLAYER_NICK );
							}
						}
						else {
							queue.push( data.data.updated_games[i].players[j].PLAYER_NICK );
						}
					}
				} // for
			} // for
			// log stuff to console
			var _next = "";
			if( 1 in queue ) { _next = queue[1]; }
			var diff = ( new Date().getTime() - timer );
			console.log( d.getMonth()+1 + "-" + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + ":" + d.getSeconds() + " d:" + sizeOf( done ) + ": q:" + queue.length + ", t:" + diff + "ms"  + " u:" + data.data.updated + ", p:" + _c + " - " + data.data.player + " next: " + _next  );
			/*
			// get player ts
			var sql = 'select * from updated_players where PLAYER_NICK="' + data.data.updated_games[i].players[j].PLAYER_NICK  + '"';
			db.query( sql, function( err, rows, fields ) {
				if( err ) { console.log( err ); }
				if( 0 in rows ) {
					if( ( new Date( rows[0].TS ).getTime() + ( 4*24*60*60*1000 ) ) < new Date().getTime() ) {
						queue.push( data.data.updated_games[i].players[j].PLAYER_NICK );
					}
				}
				else {
					queue.push( data.data.updated_games[i].players[j].PLAYER_NICK );
					// insert
				}
			} );
			*/
			/*
			// insert new player
			var sql = 'insert into updated_players(PLAYER_NICK) values( "'+ data.data.updated_games[i].players[j].PLAYER_NICK  +'" )';
			db.query( sql, function( err, rows, fields ) {
				if( err ) { console.log( err ); }
				console.log( 'inserted: ' + data.data.updated_games[i].players[j].PLAYER_NICK );
			} );
			*/
			queue.shift();
		},
		error: function( err ) {
			console.log( 'err' );
			console.log( err );
		}
	} );
}

setInterval( function() {
	if( queue.length == 0 ) {
		var sql = 'select PLAYER_NICK, TS from updated_players order by TS asc limit 1';
		db.query( sql, function( err, rows, fields ) {
			if( err ) { console.log( err ); }
			upd( rows[0].PLAYER_NICK );
			console.log( rows[0].TS );
			sql2 = 'update updated_players set TS=CURRENT_TIMESTAMP where PLAYER_NICK="'+ rows[0].PLAYER_NICK +'"';
			db.query( sql2, function( err, rows, fields ) {
				if( err ) {
					console.log( 'ERR' );
					console.log( err );
				}
			} );
		} );
	}
	else {
		upd( queue[0] );
	}
}, 8*1000 );

function sizeOf( obj ) {
	var size = 0, key;
	for( key in obj ) {
		if( obj.hasOwnProperty( key ) )
			size++;
	}
	return size;
}


/*
setInterval( function() {
	var sql = 'select PLAYER_NICK from Players order by RAND() limit 1';
	//console.log( 'loop!' );
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		$.ajax( {
			url:'http://localhost:8585/stats/player/' + rows[0].PLAYER_NICK + '/update',
			type:'get',
			dataType:'json',
			success: function( data ) {
				//console.log( 'successful' );
				console.log( new Date() + " " + data.player + " updated " + data.updated );
			}
		} );
	} );
}, 3*60*1000 );
*/


/*
setInterval( function() {
	var sql = 'select PLAYER_NICK from Players order by RAND() limit 1'; // too slow
	db.query( sql, function( err, rows, fields ) {
		$.ajax( {
			url: apiurl + 'player/' + rows[0].PLAYER_NICK + '/update',
			type:'get',
			dataType:'json',
			success: function( data ) {
				console.log( new Date() + " " + data.data.player + " updated " + data.data.updated );
				sql2 = 'update updated_players set TS=CURRENT_TIMESTAMP where PLAYER_NICK="'+ data.data.player +'"';
				db.query( sql2, function( err, rows, fields ) {
					// console.log( rows.affectedRows );
					if( rows.affectedRows == 0 ) {
						sql3 = 'insert into updated_players( PLAYER_NICK, TS ) values( "'+ data.data.player +'", CURRENT_TIMESTAMP )';
						db.query( sql2, function( err, rows, fields ) {} );
					}
				} );
			}
		} );
	} );
}, 1.5*60*1000 );
*/

/*
setInterval( function() {
	var sql = 'select PLAYER_NICK from updated_players order by TS asc limit 1';
	//var sql = 'select PLAYER_NICK from updated_players order by PLAYER_NICK limit 1';
	db.query( sql, function( err, rows, fields ) {
		$.ajax( {
			url: apiurl + 'players/' + rows[0].PLAYER_NICK + '/update',
			type:'get',
			dataType:'json',
			success: function( data ) {
				//console.log( 'successful' );
				console.log( new Date() + " " + data.data.updated + " " + data.data.player + " updated " );
				sql2 = 'update updated_players set TS=CURRENT_TIMESTAMP where PLAYER_NICK="'+ data.data.player +'"';
				db.query( sql2, function( err, rows, fields ) { } );
			}
		} );
	} );
}, 0.18*60*1000 );
*/



