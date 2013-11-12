
var util = require( 'util' );

var fs = require( 'graceful-fs' );
var mysql = require( 'mysql' );
var express = require( 'express' );
var app = express();
app.enable( "jsonp callback" );
var http = require( 'http' );
var url = require( 'url' );
var server = http.createServer( app );
var zlib = require( 'zlib' );


//var dir='./games/';
var dir='./games/';

fs.readdir( dir, function _fs_readdir( err, files ) {
	if( err ) throw err;
	var inp, out;
	var c = 0;
	var max = files.length;
	setImmediate( function next() {
		console.log( files[c] );
			var gzip = zlib.createGzip();
			console.log( c + " " + dir + files[c] );
			inp = fs.createReadStream( './games/' + files[c] );
			out = fs.createWriteStream( './gzgames/' + files[c] + '.gz' );
			inp.pipe( gzip ).pipe( out );
		c++;
		if( c >= max ) {
			console.log( "done!" );
		}
		else {
			setImmediate( next );
		}
	} );
} );


