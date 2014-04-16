

var cluster = require('cluster');
var fs = require('fs');

if (cluster.isMaster) {
	// this is the master control process
	console.log("Control process running: PID=" + process.pid);
	// write PID to file
	fs.writeFile( "cluster.pid", process.pid, function( err ) {
		if( err ) {
			console.log( err );
		}
		else {
			console.log( "The PID file saved!" );
		}
	} );

	// fork as many times as we have CPUs
	var numCPUs = require("os").cpus().length;
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}
	// handle unwanted worker exits
	cluster.on("exit", function(worker, code) {
		if (code != 0) {
			console.log("Worker crashed! Spawning a replacement.");
			cluster.fork();
		}
	});
	// I'm using the SIGUSR2 signal to listen for reload requests
	// you could, instead, use file watcher logic, or anything else
	process.on("SIGUSR2", function() {
		console.log("SIGUSR2 received, reloading workers");
		// delete the cached module, so we can reload the app
		delete require.cache[require.resolve("./api.js")];
		// only reload one worker at a time
		// otherwise, we'll have a time when no request handlers are running
		var i = 0;
		var workers = Object.keys(cluster.workers);
		var f = function() {
			if (i == workers.length) return;
			console.log("Killing " + workers[i]);
			cluster.workers[workers[i]].disconnect();
			cluster.workers[workers[i]].on("disconnect", function() {
				console.log("Shutdown complete");
			});
			var newWorker = cluster.fork();
			newWorker.on("listening", function() {
				console.log("Replacement worker online.");
				i++;
				f();
			});
		}
		f();
	});
}
else {
	var app = require( "./api.js" );
}

