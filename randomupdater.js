
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


setInterval( function() {
	db.ping();
}, 5000*1000 );


setInterval( function() {
	var sql = 'select PLAYER_NICK from Players order by RAND() limit 1';
	console.log( 'loop!' );
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
}, 300000 );

var notsorandom = [
	"rulex",
	"rul3x",
	"opazor",
	"b3ra",
	"uwu",
	"knubbe",
	"ahxnxa",
	"straikki",
	"stiquu",
	"hagu",
	"hallogallo",
	"stuk4d",
	"gasmania",
	"xentox",
	"xen7ox",
	"verify",
	"reefa",
	"xtr4nce",
	"whodares",
	"isis"
];

