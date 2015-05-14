/*

*/
var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  race = require('./racecache.js');
var program = require( 'commander' );

program
	.version( '0.0.3' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.parse( process.argv );

var __dirname; // externally defined

var dbpool;

main();

function main() {
	var data = fs.readFileSync( program.config || __dirname + '/cfg.json' );
	//var data = fs.readFileSync(__dirname + '/v.cfg.json');
	var cfg = JSON.parse(data);
	dbpool = mysql.createPool(cfg.mysql_db);
	dbpool.getConnection(function (err, conn) {
		race.updateMap(conn, null, function () {
			conn.release();
			process.exit();
		});
	});
}
