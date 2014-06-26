
var apiurl = '/';
//var apiurl = 'http://ql.leeto.fi/';
//var apiurl = 'http://ql.l.leeto.fi/';
var ajaxDataType = ( apiurl == '/' ) ? 'json' : 'jsonp';

$( function() {
} );

var dynatable_writers = {
	COUNTRY: function( obj ) {
		var c = '';
		if( obj.COUNTRY !== null ) {
			c = obj.COUNTRY.toLowerCase();
		}
		return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ c +'_v2013071601.0.gif" class="playerflag" /> ' + c.toUpperCase();
	},
	PLAYER: function( obj ) {
		var clan = '';
		var clanlink = '';
		var country = '';
		var countrylink = '';
		if( obj.CLAN_ID !== null ) { clan = obj.CLAN; clanlink = '<small class="pull-right"><a href="#/clans/'+ obj.CLAN_ID +'">'+ obj.CLAN +'</a></small>'; }
		if( obj.COUNTRY !== null ) {
			country = obj.COUNTRY.toLowerCase();
			countrylink = '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ country +'_v2013071601.0.gif" class="playerflag" title="'+ country.toUpperCase() +'" /> ';
		}
		return countrylink + '<a href="#/players/'+ obj.PLAYER +'">' + obj.PLAYER + '</a> ' + clanlink;
	},
	CLAN: function( obj ) {
		if( obj.CLAN_ID !== null )
			return '<a href="#/clans/'+ obj.CLAN_ID +'">' + obj.CLAN + '</a>';
		else
			return '';
	},
	MAP: function( obj ) {
		if( parseHash().indexOf( 'race' ) > -1 ) {
			return '<a class="map-popup" href="#/race/maps/'+ obj.MAP +'">' + obj.MAP + '</a>';
		}
		return '<a class="map-popup" href="#/maps/'+ obj.MAP +'">' + obj.MAP + '</a>';
	},
	WIN: function( obj ) {
		if( obj.WIN == 1 ) {
			return '<span class="btn btn-xs btn-success" title="Win">W</span>';
		}
		else {
			return '<span class="btn btn-xs btn-danger" title="Loss">L</span>';
		}
	},
	TEAM: function( obj ) {
		if( obj.TEAM == 1 ) {
			return '<span class="btn btn-xs btn-danger">Red</span>';
		}
		else {
			return '<span class="btn btn-xs btn-primary">Blue</span>';
		}
	},
	RANK: function( obj ) {
		if( obj.RANK == -1 ) {
			return '<span data-toggle="tooltip" class="btn btn-xs btn-danger" data-placement="left" title="Quit">'+ obj.RANK +'</span>';
		}
		else {
			return obj.RANK;
		}
	},
	TEAM_RANK: function( obj ) {
		if( obj.TEAM_RANK == -1 ) {
			return '<span data-toggle="tooltip" class="btn btn-xs btn-danger" data-placement="left" title="Quit">'+ obj.TEAM_RANK +'</span>';
		}
		else {
			return obj.TEAM_RANK;
		}
	},
	TAG: function( obj ) {
		return '<a href="#/tags/'+ obj.ID +'">' + obj.TAG + '</a>';
	},
	KILLS: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.KILLS/obj.MATCHES_PLAYED).toFixed(2) +' kills/game with a ratio of '+ (obj.KILLS/obj.DEATHS).toFixed(2) +' on average">'+ obj.KILLS +'</span>';
	},
	IMPRESSIVE: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.IMPRESSIVE/obj.MATCHES_PLAYED).toFixed(2) +' imp/game on average">'+ obj.IMPRESSIVE +'</span>';
	},
	EXCELLENT: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.EXCELLENT/obj.MATCHES_PLAYED).toFixed(2) +' exc/game on average">'+ obj.EXCELLENT +'</span>';
	},
	HUMILIATION: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.HUMILIATION/obj.MATCHES_PLAYED).toFixed(2) +' hum/game on average">'+ obj.HUMILIATION +'</span>';
	},
	DAMAGE_DEALT: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.DAMAGE_DEALT/obj.PLAY_TIME).toFixed(2) +' dmg/sec">'+ obj.DAMAGE_DEALT +'</span>';
	},
	OWNER: function( obj ) {
		return '<a href="#/owners/'+ obj.OWNER +'">' + obj.OWNER + '</a>';
	},
	PUBLIC_ID: function( obj ) {
		return '<a href="#/games/'+ obj.PUBLIC_ID +'">' + shortenPID( obj.PUBLIC_ID ) + '</a>';
	},
	PLAYER_NICK: function( obj ) {
		return '<a href="#/players/'+ obj.PLAYER_NICK +'">' + obj.PLAYER_NICK + '</a>';
	},
	LEADER_NICK: function( obj ) {
		return '<a href="#/race/players/'+ obj.LEADER_NICK +'">' + obj.LEADER_NICK + '</a>';
	},
	GAME_TIMESTAMP: function( obj ) {
		if( parseHash().indexOf( 'race' ) > -1 ) {
			return obj.GAME_TIMESTAMP;
		}
		return timediff( ( obj.GAME_TIMESTAMP *1000 )+60*60*6*1000, new Date().getTime() ) + ' ago';
	},
	GAME_LENGTH: function( obj ) {
		return timediff( obj.GAME_LENGTH * 1000 );
	},
	PLAY_TIME: function( obj ) {
		return timediff( obj.PLAY_TIME * 1000 );
	},
	GAME_TYPE: function( obj ) {
		var gt = '';
		if( obj.GAME_TYPE == 'harv' ) { gt = 'harvester'; }
		else { gt = obj.GAME_TYPE.toLowerCase(); }
		return '<a class="btn btn-xs btn-default" title="' + gt + '" href="#/gametypes/' + obj.GAME_TYPE.toLowerCase() + '"><img src="http://cdn.quakelive.com/web/2014051402/images/gametypes/xsm/' + gt + '_v2014051402.0.png" title="' + gt + '" /></a>';
	},
	PQL_weapons: function( obj ) {
		// GAME_ID: ' + obj.LEADERS[0].GAME_ID + '
		if( obj.LEADERS[0] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[0].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[0].PLAYER + '">' + obj.LEADERS[0].PLAYER + '</a> <div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[0].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs race-popup pull-right"><span class="glyphicon glyphicon-question-sign "></span></div> <span class="pull-right">' + obj.LEADERS[0].SCORE + ' </span>';
		else return '';
	},
	PQL_strafe: function( obj ) {
		if( obj.LEADERS[1] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[1].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[1].PLAYER + '">' + obj.LEADERS[1].PLAYER + '</a> <div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[1].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs race-popup pull-right"><span class="glyphicon glyphicon-question-sign "></span></div> <span class="pull-right">' + obj.LEADERS[1].SCORE + ' </span>';
		else return '';
	},
	VQL_weapons: function( obj ) {
		if( obj.LEADERS[2] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[2].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[2].PLAYER + '">' + obj.LEADERS[2].PLAYER + '</a> <div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[2].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs race-popup pull-right"><span class="glyphicon glyphicon-question-sign "></span></div> <span class="pull-right">' + obj.LEADERS[2].SCORE + ' </span>';
		else return '';
	},
	VQL_strafe: function( obj ) {
		if( obj.LEADERS[3] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[3].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[3].PLAYER + '">' + obj.LEADERS[3].PLAYER + '</a> <div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[3].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs race-popup pull-right"><span class="glyphicon glyphicon-question-sign "></span></div> <span class="pull-right">' + obj.LEADERS[3].SCORE + ' </span>';
		else return '';
	},
	GAME_LENGTH_SUM: function( obj ) {
		return timediff( obj.GAME_LENGTH_SUM * 1000 );
	},
	GAME_LENGTH_AVG: function( obj ) {
		return timediff( obj.GAME_LENGTH_AVG * 1000 );
	},
	ACC: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ obj.HITS + ' hits of ' + obj.SHOTS + ' shots.">' + ( obj.HITS / obj.SHOTS * 100 ).toFixed(1) + '%</span>';
	},
	RL: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ obj.RL_H + ' hits of ' + obj.RL_S + ' shots.">' + ( obj.RL_H / obj.RL_S * 100 ).toFixed(1) + '%</span>';
	},
	RG: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ obj.RG_H + ' hits of ' + obj.RG_S + ' shots.">' + ( obj.RG_H / obj.RG_S * 100 ).toFixed(1) + '%</span>';
	},
	LG: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ obj.LG_H + ' hits of ' + obj.LG_S + ' shots.">' + ( obj.LG_H / obj.LG_S * 100 ).toFixed(1) + '%</span>';
	},
	RL_A: function( obj ) {
		return ( obj.RL_H / obj.RL_S * 100 ).toFixed(2) + '%';
	},
	RG_A: function( obj ) {
		return ( obj.RG_H / obj.RG_S * 100 ).toFixed(2) + '%';
	},
	LG_A: function( obj ) {
		return ( obj.LG_H / obj.LG_S * 100 ).toFixed(2) + '%';
	},
};
var dynatable_features = {
	sort: true,
	perPageSelect: true,
	paginate: true,
	search: true,
	recordCount: true,
	pushState: false,
};


angular.module( 'liz', ['lizzy'] )
.config( [ '$routeProvider', function( $routeProvider ) {
	$routeProvider.
	when( '/', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	//when( '/', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	//when( '/all', { controller: AllCtrl, templateUrl: 'all.html' } ).
	when( '/overview', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	when( '/games', { controller: GamesCtrl, templateUrl: 'games2.html' } ).
	when( '/games/:game', { controller: GameCtrl, templateUrl: 'game.html' } ).
	when( '/players', { controller: PlayersCtrl, templateUrl: 'players.html' } ).
	when( '/players/:player', { controller: PlayerCtrl, templateUrl: 'player.html' } ).
	when( '/owners', { controller: OwnersCtrl, templateUrl: 'owners.html' } ).
	when( '/owners/:owner', { controller: OwnerCtrl, templateUrl: 'owner.html' } ).
	when( '/owners/:owner/players', { controller: OwnerPlayersCtrl, templateUrl: 'players.html' } ).
	when( '/owners/:owner/games', { controller: OwnerGamesCtrl, templateUrl: 'games2.html' } ).
	when( '/owners/:owner/players/:player', { controller: OwnerPlayerCtrl, templateUrl: 'player.html' } ).
	when( '/owners/:owner/top/last30days', { controller: OwnerTop30Ctrl, templateUrl: 'top.html' } ).
	when( '/clans', { controller: ClansCtrl, templateUrl: 'clans.html' } ).
	//when( '/clans', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/clans/:clan', { controller: ClanCtrl, templateUrl: 'clan.html' } ).
	//when( '/clan/:clan', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/maps', { controller: MapsCtrl, templateUrl: 'maps.html' } ).
	//when( '/maps', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/maps/:map', { controller: MapCtrl, templateUrl: 'map.html' } ).
	//when( '/map/:map', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/countries', { controller: CountriesCtrl, templateUrl: 'countries.html' } ).
	when( '/countries/:country', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	//when( '/eloduel', { controller: EloDuelCtrl, templateUrl: 'elo_duel.html' } ).
	when( '/gametypes/:gametype', { controller: GametypeCtrl, templateUrl: 'gametype.html' } ).
	when( '/gametypes/:gametype/top/all', { controller: GametypeTopAllCtrl, templateUrl: 'top.html' } ).
	when( '/gametypes/:gametype/players/:player', { controller: PlayerCtrl, templateUrl: 'player.html' } ).
	when( '/tags/:tag', { controller: TagCtrl, templateUrl: 'tag.html' } ).
	when( '/tags/:tag/games', { controller: TagGamesCtrl, templateUrl: 'games2.html' } ).
	when( '/tags/:tag/top/last30days', { controller: TagTop30daysCtrl, templateUrl: 'top.html' } ).
	when( '/tags/:tag/top/all', { controller: TagTopAllCtrl, templateUrl: 'top.html' } ).
	when( '/tags/:tag/players', { controller: TagPlayersCtrl, templateUrl: 'players.html' } ).
	when( '/tags/:tag/players/:player', { controller: TagPlayerCtrl, templateUrl: 'player.html' } ).
	when( '/tags', { controller: TagsCtrl, templateUrl: 'tags.html' } ).
	when('/race', { controller: RaceCtrl, templateUrl: 'race.html' }).
	when('/race/maps/:map', { controller: RaceMapCtrl, templateUrl: 'racemap.html' }).
	when('/race/players/:player', { controller: RacePlayerCtrl, templateUrl: 'raceplayer.html' }).
	when( '/top/last30days', { controller: TopCtrl, templateUrl: 'top.html' } ).
	otherwise({ redirectTo: '/' });
}]);

function EmptyCtrl( $scope, $timeout, $routeParams ) {
	setNavbarActive();
}
function OverviewCtrl( $scope, theLiz, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/overview',
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var _kills = [];
			var _gametypesP = [];
			var _gametypes = [];
			var total = 0;
			for( var i in data.data ) {
				d = data.data[i];
				total = total + d.MATCHES_PLAYED;
			}
			var _k = 0;
			for( var i in data.data ) {
				d = data.data[i];
				_kills.push( { label: d.GAME_TYPE, value: d.TOTAL_KILLS } );
				_gametypes.push( { label: d.GAME_TYPE, value: d.MATCHES_PLAYED } );
				_gametypesP.push( { label: d.GAME_TYPE, value: ( (d.MATCHES_PLAYED/total*100) ).toFixed(1) } );
			}
			// gametypes matches
			Morris.Donut( {
				element: 'chart',
				data: _kills,
			} );
			Morris.Donut( {
				element: 'chart2',
				data: _gametypes,
				//formatter: function( y ) { return y + '%'; },
			} );
			// dynatable
			$( '#table_overview' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
			} );
			$( '#table_overview' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: false,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	/*
	var lol = theLiz.overview();
	$scope.overview = lol;
	$scope.ordercolumn = 'TOTAL_KILLS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	$scope.sum = function( list, field ) {
		var total = 0;
		angular.forEach( list, function( item ) {
			total += item[field];
		} );
		return total;
	}
	*/
}
function AllCtrl( $scope, theLiz, $timeout, $routeParams ) {
	setNavbarActive();
	var lol = theLiz.all();
	$scope.overview = lol;
	$scope.date = new Date().getTime();
	//$scope.maps = theLiz.overview_maps();
	$.ajax( {
		url: "api/all/daily",
		dataType: ajaxDataType,
		type: "get",
	} ).success( function( data ) {
		console.log( data );
		var thedata = polyjs.data( data.thedays );
		polyjs.chart( {
			title: "Saved matches / day",
			dom: "daily_matches",
			width: 500,
			height: 300,
			layers: [
				{
					data: thedata,
					type: 'line',
					x: 'date',
					y: 'count',
					color: { const: 'green' },
				},
				/*
				{
					data: thedata,
					type: 'point',
					x: 'date',
					y: 'count',
					opacity: { const: 0.5 },
					color: { const: 'green' },
				},
				*/
			],
			guide: {
				y: {
					min: 0,
					max: 15000
				},
				color: { numticks: 10 },
			}
		} );
	} );
}
function GamesCtrl( $scope, theLiz, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/games',
		dataType: ajaxDataType,
		success: function( data ) {
			//console.log( data );
			$( '#table_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
}
function GameCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var g = $routeParams.game;
	$.ajax( {
		url: apiurl + 'api/games/' + g,
		dataType: ajaxDataType,
		success: function( data ) {
			// info
			var g = data.data.game;
			var p = data.data.players;
			$( '#info' ).append( 'Gametype: ' + g.GAME_TYPE + '<br><br>' );
			$( '#info' ).append( 'Date: ' + timediff( g.GAME_TIMESTAMP ) + '<br><br>' );
			$( '#info' ).append( 'Map:<br><a href="#/maps/'+ g.MAP +'"><img src="http://cdn.quakelive.com/web/2011071903/images/levelshots/md/'+ g.MAP +'_v2011071903.0.jpg" alt="'+ g.MAP +'" style="height:42px;width:56px;border-width:0px;" /></a><br><a href="#/maps/'+ g.MAP +'">' + g.MAP + '</a><br><br>' );
			if( g.OWNER_ID !== null ) {
				$( '#info' ).append( 'Owner: <a href="#/owners/'+ g.OWNER +'">' + g.OWNER + '</a><br>' );
			}
			// teams
			if( g.GAME_TYPE.toLowerCase() != 'duel' || g.GAME_TYPE.toLowerCase() != 'ffa' || g.GAME_TYPE.toLowerCase() != 'race' ) {
				$( '#info3' ).prepend( '<h6 class="text-center">Red damage distribution</h6>' );
				$( '#info4' ).prepend( '<h6 class="text-center">Blue damage distribution</h6>' );
				var red = [];
				var blue = [];
				for( var i in p ) {
					if( p[i].TEAM == 1 )
						red.push( { PLAYER: p[i].PLAYER, dmg: p[i].DAMAGE_DEALT } );
					if( p[i].TEAM == 2 )
						blue.push( { PLAYER: p[i].PLAYER, dmg: p[i].DAMAGE_DEALT } );
				}
				Morris.Bar( {
					element: 'red',
					data: red,
					xkey: 'PLAYER',
					ykeys: [ 'dmg' ],
					labels: [ 'Damage dealt' ],
					barRatio: 0.4,
					hideHover: 'auto',
					//ymax: 'auto ' + 50000,
					barColors: [ '#CC6868' ],
				} );
				Morris.Bar( {
					element: 'blue',
					data: blue,
					xkey: 'PLAYER',
					ykeys: [ 'dmg' ],
					labels: [ 'Damage dealt' ],
					barRatio: 0.4,
					hideHover: 'auto',
				} );
			}
			if( g.GAME_TYPE.toLowerCase() == 'duel' || g.GAME_TYPE.toLowerCase() == 'ffa' || g.GAME_TYPE.toLowerCase() == 'race' ) {
				$( '.teamgame' ).hide();
			}
			if( g.GAME_TYPE.toLowerCase() == 'race' ) {
				$( '.antirace' ).hide();
			}
			// score
			var score = [];
			for( var i in p ) {
				score.push( { label: p[i].PLAYER, value: p[i].SCORE } );
			}
			Morris.Donut( {
				element: 'score',
				data: score,
				formatter: function( y ) { return y + ''; },
			} );
			// accuracy
			var acc = [];
			for( var i in p ) {
				if( p[i].SHOTS !== 0 && p[i].HITS !== 0 )
					acc.push( { label: p[i].PLAYER, value: ( p[i].HITS / p[i].SHOTS * 100 ).toFixed(2) } );
			}
			Morris.Donut( {
				element: 'acc',
				data: acc,
				formatter: function( y ) { return y + '%'; },
			} );
			// kills
			var kills = [];
			for( var i in p ) {
				kills.push( { label: p[i].PLAYER, value: p[i].KILLS } );
			}
			Morris.Donut( {
				element: 'kills',
				data: kills,
				formatter: function( y ) { return y + ''; },
			} );
			// weapons
			var RL_A = [];
			var RG_A = [];
			var LG_A = [];
			var RL_K = [];
			var RG_K = [];
			var LG_K = [];
			for( var i in p ) {
				if( p[i].QUIT !== 1 ) {
					if( p[i].RL_H !== 0 && p[i].RL_S !== 0 )
						RL_A.push( { label: p[i].PLAYER, value: ( p[i].RL_H / p[i].RL_S * 100 ).toFixed(2) } );
					if( p[i].RG_H !== 0 && p[i].RG_S !== 0 )
						RG_A.push( { label: p[i].PLAYER, value: ( p[i].RG_H / p[i].RG_S * 100 ).toFixed(2) } );
					if( p[i].LG_H !== 0 && p[i].LG_S !== 0 )
						LG_A.push( { label: p[i].PLAYER, value: ( p[i].LG_H / p[i].LG_S * 100 ).toFixed(2) } );
					if( p[i].RL_K !== 0 )
						RL_K.push( { label: p[i].PLAYER, value: p[i].RL_K } );
					if( p[i].RG_K !== 0 )
						RG_K.push( { label: p[i].PLAYER, value: p[i].RG_K } );
					if( p[i].LG_K !== 0 )
						LG_K.push( { label: p[i].PLAYER, value: p[i].LG_K } );
				}
			}
			Morris.Donut( {
				element: 'weap1',
				data: RL_A,
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'weap2',
				data: RG_A,
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'weap3',
				data: LG_A,
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'weapk1',
				data: RL_K,
			} );
			Morris.Donut( {
				element: 'weapk2',
				data: RG_K,
			} );
			Morris.Donut( {
				element: 'weapk3',
				data: LG_K,
			} );
			// dynatable
			$( '#players_table' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'RANK', 1 );
			} );
			$( '#players_table' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: false,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 100,
					perPageOptions: [10,20,50,100,200],
					records: data.data.players
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	/*
	var lol = theLiz.game( g );
	$scope.game = lol;
	$scope.ordercolumn = 'RANK';
	$scope.ordertype = false;
	$scope.date = new Date().getTime();
	*/
}
function PlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#loading' ).addClass( 'loading' );
	$( '#current_url' ).html( printLocations() );
	var gt = $routeParams.gametype;
	var p = $routeParams.player;
	var t = $routeParams.tag;
	// player nick top of page
	$( '#player' ).html( p );
	// player nick append to gametype buttons href
	$( 'a.gametypebuttons' ).each( function() {
		var _href = $(this).attr( "href" );
		$( this ).attr( "href", _href + p );
	} );
	// gametypebuttons set active
	if( parseHash().indexOf( 'gametypes' ) == 0 ) {
		$( '#' + gt + 'b' ).addClass( 'btn-primary' );
 	}
	else {
		$( '#allb' ).addClass( 'btn-primary' );
	}
	// api url
	var add = '';
	if( parseHash().indexOf( 'gametypes' ) == 0 ) { add = '/gametypes/' + gt; }
	else if( parseHash().indexOf( 'tags' ) == 0 ) { add = '/tags/' + t; }
	var _url = apiurl + 'api' + add + '/players/' + p + '/games';
	$.ajax( {
		url: _url,
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var gametypes = [];
			var _gametypes = {};
			var _maps = {};
			var maps = [];
			var yearmonth = [];
			var _yearmonth = {};
			var total = data.data.games.length;
			var wins = 0;
			var losses = 0;
			var quits = 0;
			for( var i in data.data.games ) {
				d = data.data.games[i];
				gt = d.GAME_TYPE.toLowerCase();
				// wins / losses / quits
				if( d.WIN == 1 ) { wins++; }
				else {  losses++; }
				if( d.RANK == -1 ) { quits++; }
				// gametypes
				if( gt in _gametypes ) { _gametypes[gt]++; }
				else { _gametypes[gt] = 1; }
				// maps
				if( d.MAP in _maps ) { _maps[d.MAP]++; }
				else { _maps[d.MAP] = 1; }
				//
				var date = new Date( d.GAME_TIMESTAMP * 1000 )
				ym = date.getFullYear() + '-' + ( date.getMonth()+1 );
				if( ym in _yearmonth ) { _yearmonth[ym]++; }
				else { _yearmonth[ym] = 1; }
			}
			for( var i in _gametypes ) {
				d = _gametypes[i];
				gametypes.push( { label: i, value: ( (_gametypes[i]/total*100) ).toFixed(2) } );
			}
			for( var i in _maps ) {
				d = _maps[i];
				if( (_maps[i]/total*100) > 0.5 ) {
					maps.push( { label: i, value: ( (_maps[i]/total*100) ).toFixed(2) } );
				}
			}
			for( var i in _yearmonth ) {
				d = _yearmonth[i];
				yearmonth.push( { date: i, matches: _yearmonth[i] } );
			}
			// matches
			new Morris.Line( {
				element: 'matches',
				data: yearmonth,
				xkey: 'date',
				ykeys: [ 'matches' ],
				labels: [ 'matches played' ],
				hideHover: 'auto',
			} );
			// wins
			Morris.Donut( {
				element: 'winp',
				data: [
					{ label: 'Wins', value: wins },
					{ label: 'Losses', value: losses },
					{ label: 'Quits', value: quits },
				],
				formatter: function( y ) { return y + ' (' + ( y/data.data.games.length*100 ).toFixed(2) + '%)'; },
			} );
			// maps
			Morris.Donut( {
				element: 'mapsgraph',
				data: maps,
				formatter: function( y ) { return y + '%'; },
			} );
			// gametypes
			Morris.Donut( {
				element: 'gametypes',
				data: gametypes,
				formatter: function( y ) { return y + '%'; },
			} );
			// dynatable
			$( '#table_player_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_player_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data.games.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function PlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	onComplete();
	$( '#current_url' ).html( printLocations() );
	$( document ).on( {
		mouseenter: function() {
			$(this).find( 'span' ).fadeIn( 'fast' );
		},
		mouseleave: function() {
			$(this).find( 'span' ).hide();
		}
	}, 'a.btn-default' );
	$scope.theurl = '';
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.$on( 'Search', function() {
		$scope.players = theLiz.players_search( $( '#players_search' ).val() );
	} );
	$scope.showsearch = true;
}
function OwnersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/owners',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_owners' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
			} );
			$( '#table_owners' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
}
function OwnerTop30Ctrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/top/last30days/kills',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_kills' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'KILLS', -1 );
			} );
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/top/last30days/ranks',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_ranks' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'RANK_TEAM_RANK', 1 );
			} );
			$( '#table_top_ranks' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function OwnerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/games',
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var gametypes = [];
			var _gametypes = {};
			var _maps = {};
			var maps = [];
			var yearmonth = [];
			var _yearmonth = {};
			var mostDmgD = [];
			var _mostDmgD = [];
			var mostAcc = [];
			var _mostAcc = [];
			var _ma = [];
			var total = data.data.length;
			for( var i in data.data ) {
				d = data.data[i];
				gt = d.GAME_TYPE.toLowerCase();
				// most accurate
				if( d.MOST_ACCURATE_NICK !== null && typeof d.MOST_ACCURATE_NICK != 'undefined' ) {
					n = d.MOST_ACCURATE_NICK;
					if( n in _mostAcc ) { _mostAcc[n].dmg++ }
					else { _mostAcc[n] = { nick: n, dmg: 1 }; }
				}
				// most dmg delivered
				if( d.DAMAGE_DELIVERED_NICK !== null && typeof d.DAMAGE_DELIVERED_NICK != 'undefined' ) {
					n = d.DAMAGE_DELIVERED_NICK;
					if( n in _mostDmgD ) { _mostDmgD[n].dmg++ }
					else { _mostDmgD[n] = { nick: n, dmg: 1 }; }
				}
				// gametypes
				if( gt in _gametypes ) { _gametypes[gt]++; }
				else { _gametypes[gt] = 1; }
				// maps
				if( d.MAP in _maps ) { _maps[d.MAP]++; }
				else { _maps[d.MAP] = 1; }
				//
				var date = new Date( d.GAME_TIMESTAMP * 1000 )
				ym = date.getFullYear() + '-' + ( date.getMonth()+1 );
				if( ym in _yearmonth ) { _yearmonth[ym]++; }
				else { _yearmonth[ym] = 1; }
			}
			// most acc
			for( var i in _mostAcc ) { mostAcc.push( { label: _mostAcc[i].nick, value: _mostAcc[i].dmg } ) }
			mostAcc.sort( function( a, b ) { return b.value - a.value; } );
			while( mostAcc.length > 10 ) { mostAcc.pop(); }
			// most dmg dealt
			for( var i in _mostDmgD ) { mostDmgD.push( { label: _mostDmgD[i].nick, value: _mostDmgD[i].dmg } ) }
			mostDmgD.sort( function( a, b ) { return b.value - a.value; } );
			while( mostDmgD.length > 10 ) { mostDmgD.pop(); }
			// gametypes
			for( var i in _gametypes ) {
				d = _gametypes[i];
				gametypes.push( { label: i, value: _gametypes[i] } );
			}
			// maps
			for( var i in _maps ) {
				d = _maps[i];
				if( (_maps[i]/total*100) > 0.5 ) {
					maps.push( { label: i, value: _maps[i] } );
				}
			}
			for( var i in _yearmonth ) {
				d = _yearmonth[i];
				yearmonth.push( { date: i, matches: _yearmonth[i] } );
			}
			// top10 most acc
			Morris.Donut( {
				element: 'mostacc',
				data: mostAcc,
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			// top10 most dmg
			Morris.Donut( {
				element: 'mostdmg',
				data: mostDmgD,
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			// matches
			new Morris.Line( {
				element: 'matches',
				data: yearmonth,
				xkey: 'date',
				ykeys: [ 'matches' ],
				labels: [ 'matches played' ],
				hideHover: 'auto',
			} );
			// maps
			Morris.Donut( {
				element: 'mapsgraph',
				data: maps,
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			// gametypes
			Morris.Donut( {
				element: 'gametypes',
				data: gametypes,
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			//console.log( data );
			$( '#table_owner_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_owner_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
}
function OwnerPlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	var p = $routeParams.player;
	var lol = theLiz.ownerplayer( o, p );
	$scope.player = lol;
	$scope.games = theLiz.ownerplayergames( o, p );
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function OwnerPlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	if( $routeParams.owner ) {
		$scope.theurl = 'owner/' + $routeParams.owner + '/';
	}
	var o = $routeParams.owner;
	var lol = theLiz.owner_players( o );
	$scope.players = lol;
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function OwnerGamesCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/games',
		dataType: ajaxDataType,
		success: function( data ) {
			//console.log( data );
			$( '#table_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 20,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
	/*
	if( $routeParams.owner ) {
		$scope.theurl = 'owner/' + $routeParams.owner + '/';
	}
	var o = $routeParams.owner;
	var lol = theLiz.owner_games( o );
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	*/
}
function ClansCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/clans',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_clans' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 20,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function ClanCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	onComplete();
	var c = $routeParams.clan;
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/clans/' + c,
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#clan_table' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 20,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function MapsCtrl( $scope, theLiz, $timeout ) {
	setNavbarActive();
	mkMapsHover();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/maps',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_maps' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
			} );
			$( '#table_maps' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function MapCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var m = $routeParams.map;
	$.ajax( {
		url: apiurl + 'api/maps/' + m + '/graphs/permonth',
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var _data = [];
			for( var i in data.data ) {
				var d = data.data[i];
				_data.push( { date: d.year + '-' + d.month, matches: d.MATCHES_PLAYED } );
			}
			//console.log( _data );
			new Morris.Line( {
				// ID of the element in which to draw the chart.
				element: 'chart',
				// Chart data records -- each entry in this array corresponds to a point on
				// the chart.
				data: _data,
				// The name of the data record attribute that contains x-values.
				xkey: 'date',
				// A list of names of data record attributes that contain y-values.
				ykeys: ['matches'],
				// Labels for the ykeys -- will be displayed when you hover over the
				// chart.
				labels: ['matches played']
			} );
			// dynatable
			/*
			$( '#table_map' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
			*/
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	$.ajax( {
		url: apiurl + 'api/maps/' + m,
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var _data = [];
			var total = 0;
			for( var i in data.data ) {
				d = data.data[i];
				total = total + d.MATCHES_PLAYED;
			}
			for( var i in data.data ) {
				d = data.data[i];
				_data.push( { label: d.GAME_TYPE, value: ( (d.MATCHES_PLAYED/total*100) ).toFixed(2) } );
			}
			// gametypes
			Morris.Donut( {
				element: 'chart2',
				data: _data,
				formatter: function( y ) { return y + '%'; },
			} );
			// dynatable
			/*
			$( '#table_map' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
			*/
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function GametypeCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var gt = $routeParams.gametype;
	var lol = theLiz.gametype( gt );
	$scope.gametype = lol;
	$scope.date = new Date().getTime();
}
function GametypeTopAllCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var gt = $routeParams.gametype;
	$.ajax( {
		url: apiurl + 'api/gametypes/' + gt + '/top/all/kills',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_kills' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'KILLS', -1 );
			} );
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	$.ajax( {
		url: apiurl + 'api/gametypes/' + gt + '/top/all/ranks',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_ranks' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'RANK_TEAM_RANK', 1 );
			} );
			$( '#table_top_ranks' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function CountriesCtrl( $scope, theLiz, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/countries',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_countries' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'NUM_PLAYERS', -1 );
			} );
			$( '#table_countries' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
			// Initiate the chart
			var ar = [];
			var ob = {};
			for( var i in data.data ) {
				if( data.data[i].NUM_PLAYERS > 0 ) {
					ob = { name: data.data[i].COUNTRY, code: data.data[i].COUNTRY, value: data.data[i].NUM_PLAYERS };
					ar.push( ob );
				}
			}
			console.log( 'done' );
			// Initiate the chart
			$( '#mapgraph' ).highcharts( 'Map', {
				title : {
					text : 'Players by country'
				},
				mapNavigation: {
					enabled: true,
					buttonOptions: {
						verticalAlign: 'bottom'
					}
				},
				colorAxis: {
					min: 500,
					max: 100000,
					type: 'logarithmic'
				},
				series: [ {
					data: ar,
					mapData: Highcharts.maps['custom/world'],
					joinBy: ['iso-a2', 'code'],
					name: 'Number of players',
					states: {
						hover: {
							color: '#BADA55'
						}
					},
					tooltip: {
						valueSuffix: ' '
					}
				} ]
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function EloDuelCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	var lol = theLiz.eloduel();
	$scope.players = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'ELO';
	$scope.ordertype = true;
}
function TagCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	var lol = theLiz.tag( t );
	$scope.tag = lol;
	$scope.date = new Date().getTime();
}
function TagsCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/tags',
		dataType: ajaxDataType,
		success: function( data ) {
			//console.log( data );
			$( '#table_tags' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
}
function TagTop30daysCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	$.ajax( {
		url: apiurl + 'api/tags/' + t + '/top/last30days/kills',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_kills' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'KILLS', -1 );
			} );
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	$.ajax( {
		url: apiurl + 'api/tags/' + t + '/top/last30days/ranks',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_ranks' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'RANK_TEAM_RANK', 1 );
			} );
			$( '#table_top_ranks' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function TagTopAllCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	$.ajax( {
		url: apiurl + 'api/tags/' + t + '/top/all/kills',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_kills' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'KILLS', -1 );
			} );
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	$.ajax( {
		url: apiurl + 'api/tags/' + t + '/top/all/ranks',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_ranks' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'RANK_TEAM_RANK', 1 );
			} );
			$( '#table_top_ranks' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function TagGamesCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	var t = $routeParams.tag;
	$( '#current_url' ).html( printLocations() );
	$( '#table_games' ).bind( 'dynatable:init', function( e, dynatable ) {
		dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
	} );
	$.ajax( {
		url: apiurl + 'api/tags/' + t + '/games',
		dataType: ajaxDataType,
		success: function( data ) {
			//console.log( data );
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
			//console.log( data );
		},
	} );
}
function TagPlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	if( $routeParams.tag ) {
		$scope.theurl = 'tags/' + $routeParams.tag + '/';
	}
	var t = $routeParams.tag;
	var lol = theLiz.tagplayers( t );
	$scope.players = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function TagPlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	var p = $routeParams.player;
	var lol = theLiz.tagplayer( t, p );
	$scope.player = lol;
	//$scope.games = theLiz.ownerplayergames( t, p );
	//$scope.ordercolumn = 'GAME_TIMESTAMP';
	//$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function RaceCtrl($scope, theLiz, $routeParams, $location, $timeout) {
	setNavbarActive();
	mkMapsHover();
	mkRaceHover();
  $('#current_url').html(printLocations());
	$.ajax( {
		url: apiurl + 'api/race',
		dataType: ajaxDataType,
		success: function( data ) {
			// morris
			var pw = []; // pql weapons
			var ps = []; // pql strafe
			var vw = []; // vql weapons
			var vs = []; // vql strafe
			var _pw = {};
			var _ps = {};
			var _vw = {};
			var _vs = {};
			for( var i in data.data.maps ) {
				d = data.data.maps[i];
				if( d.LEADERS[0] !== null && typeof d.LEADERS[0] != 'undefined' ) {
					n = d.LEADERS[0].PLAYER;
					if( n in _pw ) { _pw[n]++ }
					else { _pw[n] = 1; }
				}
				if( d.LEADERS[1] !== null && typeof d.LEADERS[1] != 'undefined' ) {
					n = d.LEADERS[1].PLAYER;
					if( n in _ps ) { _ps[n]++ }
					else { _ps[n] = 1; }
				}
				if( d.LEADERS[2] !== null && typeof d.LEADERS[2] != 'undefined' ) {
					n = d.LEADERS[2].PLAYER;
					if( n in _vw ) { _vw[n]++ }
					else { _vw[n] = 1; }
				}
				if( d.LEADERS[3] !== null && typeof d.LEADERS[3] != 'undefined' ) {
					n = d.LEADERS[3].PLAYER;
					if( n in _vs ) { _vs[n]++ }
					else { _vs[n] = 1; }
				}
			}
			for( var i in _pw ) { pw.push( { label: i, value: _pw[i] } ); }
			for( var i in _ps ) { ps.push( { label: i, value: _ps[i] } ); }
			for( var i in _vw ) { vw.push( { label: i, value: _vw[i] } ); }
			for( var i in _vs ) { vs.push( { label: i, value: _vs[i] } ); }
			Morris.Donut( {
				element: 'pw',
				data: pw.sort(),
			} );
			Morris.Donut( {
				element: 'ps',
				data: ps.sort(),
			} );
			Morris.Donut( {
				element: 'vw',
				data: vw.sort(),
			} );
			Morris.Donut( {
				element: 'vs',
				data: vs.sort(),
			} );
			// dynatable
			$( '#table_race' ).dynatable( {
				features: {
					sort: false,
					perPageSelect: false,
					paginate: false,
					search: false,
					recordCount: true,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					records: data.data.maps
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function RaceMapCtrl($scope, theLiz, $routeParams, $location, $timeout) {
	setNavbarActive();
  $('#current_url').html(printLocations());
  var m = $routeParams.map;
  var w = $location.search()["weapons"];
  var r = $location.search()["ruleset"];
  var lol = theLiz.racemap(m, r, w);
  $scope.scores = lol;
  $scope.map = m;
  $scope.ordercolumn = 'RANK';
  $scope.ordertype = false;
}
function RacePlayerCtrl($scope, theLiz, $routeParams, $location, $timeout) {
	setNavbarActive();
  $('#current_url').html(printLocations());
  var p = $routeParams.player;
  $scope.player = p;
	$.ajax( {
		url: apiurl + 'api/race/players/' + p,
		dataType: ajaxDataType,
		data: {
			weapons: $location.search()["weapons"],
			ruleset: $location.search()["ruleset"],
		},
		success: function( data ) {
			// page stuff
			$( '#weapons' ).html( data.data.weapons.toUpperCase() );
			$( '#ruleset' ).html( data.data.ruleset.toUpperCase() );
			// morris
			var avgRank = 0;
			for( var i in data.data.scores ) {
				d = data.data.scores[i];
				avgRank = avgRank + d.RANK;
			}
			avgRank = ( avgRank/data.data.scores.length ).toFixed(2);
			Morris.Donut( {
				element: 'avgRank',
				data: [ { label: 'avg Rank', value: avgRank } ],
			} );
			Morris.Donut( {
				element: 'mapsgraph',
				data: [ { label: 'Maps', value: data.data.scores.length } ],
			} );
			// dynatable
			$( '#table_maps' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: false,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					records: data.data.scores
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}
function TopCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/top/last30days/kills',
		dataType: ajaxDataType,
		success: function( data ) {
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			onError( data );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
}

var _perpage = 20;

function parseUrl() {
	var url_params = location.search.substring(1).split( '&' ), url_p = {};
	for( var i in url_params ) { url_p[url_params[i].split( '=' )[0]] = url_params[i].split( '=' )[1] };
	return url_p;
}
function parseHash() {
	var url_params = location.hash.substring(2).split( '/' );
	return url_params;
}
function printLocations() {
	var out = "";
	var h = parseHash();
	var url = "";
	for( var i in h ) {
		url += '/' + h[i];
		out += '<span class=""> / </span>';
		out += '<a class="btn btn-xs btn-default" href="#'+ url +'">'+ h[i] +'</a> ';
		//out += '<div class="btn btn-xs btn-default"> > </div>';
	}
	return out;
}

angular.module( 'lizzy', ['ngResource'] ).
factory( 'theLiz', function( $http ) {
	var theLiz = function( data ) {
		angular.extend( this, data );
	}
	theLiz.all = function() {
		return $http( { url: apiurl + 'api/all' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.overview = function() {
		return $http( { url: apiurl + 'api/overview' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.overview_maps = function() {
		return $http( { url: apiurl + 'api/all/maps' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.games = function() {
		return $http( { url: apiurl + 'api/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.game = function( g ) {
		return $http( { url: apiurl + 'api/games/' + g + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.player = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.playergames = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.players = function( page ) {
		return $http( { url: apiurl + 'api/players/' + page + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owners = function() {
		return $http( { url: apiurl + 'api/owners' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.ownerplayer = function( o, p ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.ownerplayergames = function( o, p ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players/' + p + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner_players = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner_games = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.clans = function() {
		return $http( { url: apiurl + 'api/clans' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.clan = function( c ) {
		return $http( { url: apiurl + 'api/clans/' + c + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.maps = function() {
		return $http( { url: apiurl + 'api/maps' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.gametype = function( gt ) {
		return $http( { url: apiurl + 'api/gametypes/' + gt + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.countries = function() {
		return $http( { url: apiurl + 'api/countries' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.eloduel = function( m ) {
		return $http( { url: apiurl + 'api/eloduel' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tag = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tags = function( t ) {
		return $http( { url: apiurl + 'api/tags' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.taggames = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tagplayers = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/players' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tagplayer = function( t, p ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.players_search = function( p ) {
		return $http( { url: apiurl + 'api/search/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.player_update = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/update/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.race = function () {
	  return $http({ url: apiurl + 'api/race/?callback=JSON_CALLBACK', method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
	}
	theLiz.racemap = function (m, ruleset, weapons) {
	  return $http({ url: apiurl + 'api/race/maps/' + m + '/?callback=JSON_CALLBACK&weapons=' + weapons + "&ruleset="+ruleset, method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
	}
	theLiz.raceplayer = function (p, ruleset, weapons) {
	  return $http({ url: apiurl + 'api/race/players/' + p + '/?callback=JSON_CALLBACK&weapons=' + weapons + "&ruleset=" + ruleset, method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
	}
	return theLiz;
} )
.filter( 'kbytes', function() {
	return function( bytes, precision ) {
		if( isNaN( parseFloat( bytes ) ) || !isFinite( bytes ) ) return '-';
		if( typeof precision === 'undefined' ) precision = 1;
		var units = [ 'kB', 'MB', 'GB', 'TB', 'PB' ];
		var number = Math.floor( Math.log( bytes) / Math.log( 1024 ) );
		return ( bytes / Math.pow( 1024, Math.floor( number ) ) ).toFixed( precision ) +  ' ' + units[number];
	}
} )
.filter( 'timeago', function() {
	return function( d1, d2 ) {
		d1 = new Date( d1 );
		//d1 = new Date( '2013-03-28T11:00:00' );
		d2 = new Date(  );
		var ms = d2 - d1;
		var _y = parseInt( ms / 1000 / 60 / 60 / 24 / 365 );
		ms = ms - ( _y * 1000 * 60 * 60 * 24 * 365 );
		var _M = parseInt( ms / 1000 / 60 / 60 / 24 / 30 );
		ms = ms - ( _M * 1000 * 60 * 60 * 24 * 30 );
		var _w = parseInt( ms / 1000 / 60 / 60 / 24 / 7 );
		ms = ms - ( _w * 1000 * 60 * 60 * 24 * 7 );
		var _d = parseInt( ms / 1000 / 60 / 60 / 24 );
		ms = ms - ( _d * 1000 * 60 * 60 * 24 );
		var _h = parseInt( ms / 1000 / 60 / 60 );
		ms = ms - ( _h * 1000 * 60 * 60 );
		var _m = parseInt( ms / 1000 / 60 );
		ms = ms - ( _m * 1000 * 60 );
		var _s = parseInt( ms / 1000 );
		var y = _y >= 1 ? _y + "y " : "";
		var M = _M >= 1 ? _M + "M " : "";
		var w = _w >= 1 ? _w + "w " : "";
		var d = _d >= 1 ? _d + "d " : "";
		var h = _h >= 1 ? _h + "h " : "";
		var m = _m >= 1 ? _m + "m " : "";
		var s = _s >= 1 ? _s + "s " : "";
		//return d + h + m + s + "";
		return y + M + w + d + h + m + s + "";
		//return _d + "d " + _h + "h " + _m + "m " + _s + "s " + "ago";
	}
} )
.filter( 'daysago', function() {
	return function( d1, d2 ) {
		d1 = new Date( d1 );
		d2 = new Date(  );
		var ms = d2 - d1;
		return ms / 1000 / 60 / 60 / 24 ;
	}
} )
.filter( 'shortenPID', function() {
	return function( pid ) {
		return pid.split( '-' )[0];
	}
} )
.filter( 'ruleset', function() {
	return function( r ) {
		if( r == 1 ) return "";
		else if( r == 2 ) return "PQL";
		else return "";
	}
} )
.filter( 'ranked', function() {
	return function( r ) {
		if( r == 1 ) return "";
		else return "unranked_icon";
	}
} )
.filter( 'premium', function() {
	return function( r ) {
		if( r == 1 ) return "premium_icon";
		else if( r == 0 ) return "";
		else return "";
	}
} )
.filter( 'startForm', function() {
	return function( input, start ) {
		start = +start;
		return input.slice( start );
	}
} )
.filter( 'escape', function() {
	return function( m ) {
		return escape( m );
	}
} )
.filter( 'team', function() {
	return function( t ) {
		if( t == '2' ) { return "success" }
		else if( t == '1' ) { return "danger" }
		else return "";
	}
} )
.filter( 'lower', function() {
	return function lower( str ) {
		return str.toLowerCase();
	}
} )
.filter( 'cleanclan', function() {
	return function( c ) {
		if( c == 'None' ) { return '' }
		else { return c; }
	}
} )
.filter('gametype', function () {
  return function (input) { return input == "harv" ? "harvester" : input.toLowerCase(); }
})
.filter('teamname', function () {
  return function (input) { input = parseInt(input); return input == 1 ? "Red" : input == 2 ? "Blue" : ""; }
});

function convertTimestamp(timestamp) {
	var d = new Date(timestamp * 1000), // Convert to milliseconds
			yyyy = d.getFullYear(),
			mm = ('0' + (d.getMonth() + 1)).slice(-2),  // Months are zero based. Add leading 0.
			dd = ('0' + d.getDate()).slice(-2),         // Add leading 0.
			hh = d.getHours(),
			h = hh,
			min = ('0' + d.getMinutes()).slice(-2),     // Add leading 0.
			ampm = 'AM',
			time;
	if (hh > 12) {
		h = hh - 12;
		ampm = 'PM';
	}
	else if (hh == 0) {
		h = 12;
	}
	// ie: 2013-02-18, 8:35 AM  
	time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
	return time;
}
function shortenPID( pid ) {
	return pid.split( '-' )[0];
}
function daysago( d1, d2 ) {
	d1 = new Date( d1 );
	//d1 = new Date( '2013-03-28T11:00:00' );
	d2 = new Date(  );
	var ms = d2 - d1;
	var _d = parseInt( ms / 1000 / 60 / 60 / 24 );
	var d = _d > 1 ? _d + "d " : "";
	return d;
	//return _d + "d " + _h + "h " + _m + "m " + _s + "s " + "ago";
}
function timediff( d1, d2 ) {
	var ms;
	if( d2 ) {
		d1 = new Date( d1 );
		d2 = new Date( d2 );
		ms = d1 - d2;
		if( ms < 0 ) { ms = Math.abs( ms ); }
	}
	else {
		ms = d1;
	}
	var _y = parseInt( ms / 1000 / 60 / 60 / 24 / 365 );
	ms = ms - ( _y * 1000 * 60 * 60 * 24 * 365 );
	var _M = parseInt( ms / 1000 / 60 / 60 / 24 / 30 );
	ms = ms - ( _M * 1000 * 60 * 60 * 24 * 30 );
	var _w = parseInt( ms / 1000 / 60 / 60 / 24 / 7 );
	ms = ms - ( _w * 1000 * 60 * 60 * 24 * 7 );
	var _d = parseInt( ms / 1000 / 60 / 60 / 24 );
	ms = ms - ( _d * 1000 * 60 * 60 * 24 );
	var _h = parseInt( ms / 1000 / 60 / 60 );
	ms = ms - ( _h * 1000 * 60 * 60 );
	var _m = parseInt( ms / 1000 / 60 );
	ms = ms - ( _m * 1000 * 60 );
	var _s = parseInt( ms / 1000 );
	var y = _y >= 1 ? _y + "y " : "";
	var M = _M >= 1 ? _M + "M " : "";
	var w = _w >= 1 ? _w + "w " : "";
	var d = _d >= 1 ? _d + "d " : "";
	var h = _h >= 1 ? _h + "h " : "";
	var m = _m >= 1 ? _m + "m " : "";
	var s = _s >= 1 ? _s + "s " : "";
	//return d + h + m + s + "";
	return y + M + w + d + h + m + s + "";
	//return _d + "d " + _h + "h " + _m + "m " + _s + "s " + "ago";
}
function onComplete() {
	$( '#loading' ).removeClass( 'loading' );
	setTimeout( function() {
		$( '#error' ).children().fadeOut( 'fast', function() {
			$( '#error' ).children().remove();
		}	);
	}, 7000 );
}
function onError( data ) {
	console.log( data );
	console.log( data.statusCode );
	console.log( data.statusText );
	console.log( data.responseText );
	$( '#error' ).append( '<p class="alert alert-danger">' + data.responseText + '</p>' );
}
function setNavbarActive() {
	$( 'ul.navbar-nav' ).children().removeClass( 'active' );
	if( parseHash().length == 0 ) {
		$( '#overview' ).parent().addClass( 'active' );
	}
	else {
		$( '#' + parseHash()[0] ).parent().addClass( 'active' );
	}
}
function mkMapsHover() {
	$( document ).on( {
		mouseenter: function() {
			var title = $( this ).html();
			var img = '<img src="http://cdn.quakelive.com/web/2014051402/images/levelshots/lg/' + $(this).html() + '_v2014051402.0.jpg" />';
			$(this).popover( { placement: 'right', title: title, content: img, html: true } );
			$(this).popover( 'show' );
		},
		mouseleave: function() {
			$(this).popover( 'hide' );
		}
	}, 'a.map-popup' );
}
function mkRaceHover() {
	$( document ).on( {
		mouseenter: function() {
			$(this).popover( 'show' );
		},
		mouseleave: function() {
			$(this).popover( 'hide' );
		}
	}, 'div.race-popup' );
}


