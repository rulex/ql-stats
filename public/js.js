
//var apiurl = '/';
//var apiurl = 'http://ql.leeto.fi/';
//var apiurl = 'http://ql.l.leeto.fi/';
var Countries = [];
var adminPassword;
function getApiURL() {
	return $( '#apiurl' ).val();
}
function getAjaxDataType() {
	return ( $( '#apiurl' ).val() == '/' ) ? 'json' : 'jsonp';
}

$( function() {
	// sammyjs
	var app = $.sammy( function() {
		this.get( '#/settings', function( context ) {
			SettingsCtrl();
		} );
		this.get( '#/', function( context ) {
			context.render( 'overview.html', {} ).replace( $( '#content' ) ).then( function() {
				OverviewCtrl();
			} );
		} );
		this.get( '#/overview', function( context ) {
			context.render( 'overview.html', {} ).replace( $( '#content' ) ).then( function() {
				OverviewCtrl();
			} );
		} );
		this.get( '#/games', function( context ) {
			context.render( 'games.html', {} ).replace( $( '#content' ) ).then( function() {
				GamesCtrl();
			} );
		} );
		this.get( '#/games/:game', function( context ) {
			params = this.params;
			context.render( 'game.html', {} ).replace( $( '#content' ) ).then( function() {
				GameCtrl( params );
			} );
		} );
		this.get( '#/players', function( context ) {
			context.render( 'players.html', {} ).replace( $( '#content' ) ).then( function() {
				PlayersCtrl();
			} );
		} );
		this.get( '#/players/:player', function( context ) {
			params = this.params;
			context.render( 'player.html', {} ).replace( $( '#content' ) ).then( function() {
				PlayerCtrl( params );
			} );
		} );
		this.get( '#/owners', function( context ) {
			context.render( 'owners.html', {} ).replace( $( '#content' ) ).then( function() {
				OwnersCtrl();
			} );
		} );
		this.get( '#/owners/:owner', function( context ) {
			params = this.params;
			context.render( 'owner.html', {} ).replace( $( '#content' ) ).then( function() {
				OwnerCtrl( params );
			} );
		} );
		//this.get( '#/owners/:owner/players', function( context ) { context.render( 'players.html', {} ).replace( $( '#content' ) ); OwnerPlayersCtrl( this.params ); } );
		//this.get( '#/owners/:owner/games', function( context ) { context.render( 'games.html', {} ).replace( $( '#content' ) ); OwnerGamesCtrl( this.params ); } );
		//this.get( '#/owners/:owner/players/:player', function( context ) { context.render( 'player.html', {} ).replace( $( '#content' ) ); OwnerPlayerCtrl( this.params ); } );
		//this.get( '#/owners/:owner/top/last30days', function( context ) { context.render( 'top.html', {} ).replace( $( '#content' ) ); OwnerTop30Ctrl( this.params ); } );
		this.get( '#/clans', function( context ) {
			context.render( 'clans.html', {} ).replace( $( '#content' ) ).then( function() {
				ClansCtrl();
			} );
		} );
		//this.get( '#/clans/:clan', function( context ) { context.render( 'clan.html', {} ).replace( $( '#content' ) ); ClanCtrl( this.params ); } );
		this.get( '#/maps', function( context ) {
			context.render( 'maps.html', {} ).replace( $( '#content' ) ).then( function() {
				MapsCtrl();
			} );
		} );
		this.get( '#/maps/:map', function( context ) {
			params = this.params;
			context.render( 'map.html', {} ).replace( $( '#content' ) ).then( function() {
				MapCtrl( params );
			} );
		} );
		this.get( '#/places', function( context ) {
			context.render( 'places.html', {} ).replace( $( '#content' ) ).then( function() {
				PlacesCtrl();
			} );
		} );
		this.get( '#/places/countries/:country/activity', function( context ) {
			params = this.params;
			context.render( 'activity.html', {} ).replace( $( '#content' ) ).then( function() {
				ActivityCtrl( params, context );
			} );
		} );
		this.get( '#/places/regions/:region/activity', function( context ) {
			params = this.params;
			context.render( 'activity.html', {} ).replace( $( '#content' ) ).then( function() {
				ActivityCtrl( params, context );
			} );
		} );
		this.get( '#/places/subregions/:subregion/activity', function( context ) {
			params = this.params;
			context.render( 'activity.html', {} ).replace( $( '#content' ) ).then( function() {
				ActivityCtrl( params, context );
			} );
		} );
		this.get( '#/gametypes/:gametype', function( context ) {
			params = this.params;
			context.render( 'overview.html', {} ).replace( $( '#content' ) ).then( function() {
				GametypeOverviewCtrl( params );
			} );
		} );
		this.get( '#/gametypes/:gametype/maps', function( context ) {
			params = this.params;
			context.render( 'maps.html', {} ).replace( $( '#content' ) ).then( function() {
				GametypeMapsCtrl( params );
			} );
		} );
		//this.get( '#/gametypes/:gametype/top/all', function( context ) { context.render( 'top.html', {} ).replace( $( '#content' ) ); GametypeTopAllCtrl( this.params ); } );
		//this.get( '#/gametypes/:gametype/players/:player', function( context ) { context.render( 'player.html', {} ).replace( $( '#content' ) ); PlayerCtrl( this.params ); } );
		this.get( '#/tags/:tag', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				TagCtrl( params );
			} );
		} );
		this.get( '#/tags/:tag/overview', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'overview.html' ).replace( $( '#tag_content' ) ).then( function() {
					OverviewCtrl( params );
				} );
			} );
		} );
		this.get( '#/tags/:tag/games', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'games.html' ).replace( $( '#tag_content' ) ).then( function() {
					GamesCtrl( params );
				} );
			} );
		} );
		//this.get( '#/tags/:tag/top/last30days', function( context ) { context.render( 'top.html', {} ).replace( $( '#content' ) ); TagTop30daysCtrl( this.params ) } );
		//this.get( '#/tags/:tag/top/all', function( context ) { context.render( 'top.html', {} ).replace( $( '#content' ) ); TagTopAllCtrl( this.params ); } );
		this.get( '#/tags/:tag/players', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'players.html' ).replace( $( '#tag_content' ) ).then( function() {
					PlayersCtrl( params );
				} );
			} );
		} );
		this.get( '#/tags/:tag/owners', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'owners.html' ).replace( $( '#tag_content' ) ).then( function() {
					OwnersCtrl( params );
				} );
			} );
		} );
		this.get( '#/tags/:tag/maps', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'maps.html' ).replace( $( '#tag_content' ) ).then( function() {
					MapsCtrl( params );
				} );
			} );
		} );
		this.get( '#/tags/:tag/places', function( context ) {
			params = this.params;
			context.render( 'tag.html', {} ).replace( $( '#content' ) ).then( function() {
				TagBaseCtrl( params );
				context.render( 'places.html' ).replace( $( '#tag_content' ) ).then( function() {
					PlacesCtrl( params );
				} );
			} );
		} );
		this.get( '#/tags/:tag/players/:player', function( context ) {
			params = this.params;
			context.render( 'player.html', {} ).replace( $( '#content' ) ).then( function() {
				TagPlayerCtrl( params );
			} );
		} );
		this.get( '#/tags', function( context ) {
			context.render( 'tags.html', {} ).replace( $( '#content' ) ).then( function() {
				TagsCtrl();
			} );
		} );
		this.get( '#/race', function( context ) {
			context.render( 'race.html', {} ).replace( $( '#content' ) ).then( function() {
				RaceCtrl();
			} );
		} );
		this.get( '#/race/maps/:map', function( context ) {
			params = this.params;
			context.render( 'racemap.html', {} ).replace( $( '#content' ) ).then( function() {
				RaceMapCtrl( params );
			} );
		} );
		this.get( '#/race/players/:player', function( context ) {
			params = this.params;
			context.render( 'raceplayer.html', {} ).replace( $( '#content' ) ).then( function() {
				RacePlayerCtrl( params );
			} );
		} );
		//this.get( '#/top/last30days', function( context ) { context.render( 'top.html', {} ).replace( $( '#content' ) ); TopCtrl( this.params ); } );
		//this.get( '#/duelvs/:nicks', function( context ) { context.render( 'duelvs.html', {} ).replace( $( '#content' ) ); DuelVsCtrl( this.params ); } );
		//this.get( '#/duelvs/:nicks/:map', function( context ) { context.render( 'duelvs.html', {} ).replace( $( '#content' ) ); DuelVsCtrl( this.params ); } );
		this.get( '#/rulesets/:ruleset/games', function( context ) {
			params = this.params;
			context.render( 'games.html', {} ).replace( $( '#content' ) ).then( function() {
				RulesetGamesCtrl( params );
			} );
		} );
		this.get( '#/rulesets/:ruleset', function( context ) {
			params = this.params;
			context.render( 'overview.html', {} ).replace( $( '#content' ) ).then( function() {
				RulesetOverviewCtrl( params );
			} );
		} );
		//this.get( '#/weapons', function( context ) { context.render( 'weapons.html', {} ).replace( $( '#content' ) ); WeaponsCtrl( this.params ); } );
		this.get( '#/activity', function( context ) {
			params = this.params;
			context.render( 'activity.html', {} ).replace( $( '#content' ) ).then( function() {
				ActivityCtrl( params, context );
			} );
		} );
		this.get( '#/status', function( context ) {
			context.render( 'status.html', {} ).replace( $( '#content' ) ).then( function() {
				context.log( 'yoooo' );
				onLoading();
				setNavbarActive();
				$( '#current_url' ).html( printLocations() );
				var activeTab = parseHashParams()['tab'] || 'db_rows';
				context.log( 'activeTab', activeTab );
				// set active tab button
				$( '#tab_btn_' + activeTab ).addClass( 'active' );
				// db_rows
				if( activeTab == 'db_rows' ) {
					$( '#db_rows' ).show();
					$( '#table_db_rows' ).bind( 'dynatable:init', function( e, dynatable ) {
						dynatable.sorts.add( 'TABLE_ROWS', -1 );
					} );
					$( '#table_db_rows' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
						onComplete();
					} );
					$.ajax( {
						url: getApiURL() + 'api/status/db/rows',
						cache: false,
						dataType: getAjaxDataType(),
						success: function( data ) {
							context.log( 'success' );
							$( '#table_db_rows' ).dynatable( {
								features: dynatable_features,
								writers: dynatable_writers,
								table: dynatable_table,
								dataset: {
									perPageDefault: 10,
									perPageOptions: [10,20,50,100],
									records: data.data
								}
							} );
						},
						error: function( data ) {
						},
						complete: function( data ) {
							onComplete( data );
							//context.log( data );
						},
					} );
				}
				// cache
				if( activeTab == 'cache' ) {
					$( '#cache' ).show();
					$( '#table_cache' ).bind( 'dynatable:init', function( e, dynatable ) {
						dynatable.sorts.add( 'time', 1 );
					} );
					$( '#table_cache' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
						onComplete();
					} );
					// cache
					$.ajax( {
						url: getApiURL() + 'api/status/cache',
						cache: false,
						dataType: getAjaxDataType(),
						success: function( data ) {
							$( '#table_cache' ).dynatable( {
								features: dynatable_features,
								writers: dynatable_writers,
								table: dynatable_table,
								dataset: {
									perPageDefault: 10,
									perPageOptions: [10,20,50,100],
									records: data.cached
								}
							} );
						},
						error: function( data ) {
						},
						complete: function( data ) {
							onComplete( data );
							//context.log( data );
						},
					} );
					// cache queue
					$.ajax( {
						url: getApiURL() + 'api/status/cache/queue',
						cache: false,
						dataType: getAjaxDataType(),
						success: function( data ) {
							$( '#table_cache_queue' ).dynatable( {
								features: dynatable_features,
								writers: dynatable_writers,
								table: dynatable_table,
								dataset: {
									perPageDefault: 10,
									perPageOptions: [10,20,50,100],
									records: data.cached
								}
							} );
						},
						error: function( data ) {
						},
						complete: function( data ) {
							onComplete( data );
							//context.log( data );
						},
					} );
				}
			} );
		this.get( '#*', function( context ) {
			context.log( 'no such route' );
			context.log( parseHash() );
		} );
		});
	} );
	$( function() { app.run( '#/' ) } );
	// google analytics
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', 'UA-54810866-1', 'auto' );
	// Morris.js inject name-drawing
	var originalDrawEvent = Morris.Grid.prototype.drawEvent;
	Morris.Grid.prototype.gridDefaults.eventTextSize = 12;
	Morris.Grid.prototype.drawEvent = function( event, color ) {
		originalDrawEvent.apply( this, arguments );
		var idx = $.inArray( event, this.events );
		if( ! this.options.eventLabels || ! this.options.eventLabels[idx] )
			return;
		this.raphael.text( this.transX( event ),this.top - this.options.eventTextSize, this.options.eventLabels[idx] ).attr( 'stroke', color ).attr( 'font-size', this.options.eventTextSize );
	}
	// countries.json
	$.ajax( {
		url: 'countries.json',
		dataType: 'json',
		success: function( data ) {
			for( var i in data ) {
				Countries.push( data[i] );
			}
		},
		error: function( data ) {
			console.log( 'countries.json error' );
		},
		complete: function( data ) {
			onComplete();
		},
	} );
	// navbar player search
	$( '#player_search' ).autocomplete( {
		source: function( request, response ) {
			$.ajax( {
				url: getApiURL() + 'api/search/players/' + request.term,
				dataType: getAjaxDataType(),
				success: function( data ) {
					response( $.map( data.data, function( item ) {
						return { label: item.PLAYER, value: item.PLAYER }
					} ) );
				}
			} );
		},
		minLength: 2,
		select: function( event, ui ) {
			window.location = document.URL.split( '#' )[0] + '#/players/' + ui.item.value;
			ga( 'send', {
				'hitType': 'event',
				'eventCategory': 'button',
				'eventAction': 'click',
				'eventLabel': 'player-search-nav-click',
			} );
			$(this).val( '' ); return false;
		}
	} );
	// default popup
	$( document ).on( {
		mouseenter: function() {
			$(this).popover( 'show' );
		},
		mouseleave: function() {
			$(this).popover( 'hide' );
		}
	}, '.popthis' );
	// mapnames popover
	$( document ).on( {
		mouseenter: function() {
			var title = $( this ).html();
			var placement = $( this ).attr( 'data-placement' ) || 'right';
			var img = '<img src="http://cdn.quakelive.com/web/2014051402/images/levelshots/lg/' + $(this).html() + '_v2014051402.0.jpg" />';
			$(this).popover( { placement: placement, title: title, content: img, html: true } );
			$(this).popover( 'show' );
		},
		mouseleave: function() {
			$(this).popover( 'hide' );
		}
	}, 'a.map-popup' );
} );

// _S, _H, _K
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
var RULESETS = {
	1: 'Classic',
	2: 'Turbo',
	3: 'QL',
}
var GT = {
	ca: 'Clan Arena',
	duel: 'Duel',
	ctf: 'Capture the Flag',
	race: 'Race',
	tdm: 'Team Deathmatch',
	ffa: 'Free For All',
	ad: 'Attack & Defend',
	dom: 'Domination',
	ft: 'Freeze Tag',
	rr: 'Red Rover',
	harvester: 'Harvester',
	harv: 'Harvester',
	fctf: 'fctf',
}

var morris_events = [
	//'2013-07-16',
	//'2013 W31',
	//'2013 W44',
	'2013-12-17',
	'2014-07-19',
	'2014-08-27',
	'2014-09-17',
];
var morris_eventLabels = [
	//'Race',
	//'Start Developing',
	//'Start Auto Collecting',
	'Standalone',
	'QC2014',
	'New Rulesets',
	'Steam',
];

var dynatable_table = {
	headRowClass: 'well well-sm',
	copyHeaderClass: true,
}
var dynatable_writers = {
	TABLE_ROWS: function( obj ) {
		return thousandSeparator( obj.TABLE_ROWS );
	},
	REGION: function( obj ) {
		return '<a href="#/places/regions/' + obj.REGION + '/activity">' + obj.REGION + '</a>';
	},
	SUBREGION: function( obj ) {
		return '<a href="#/places/subregions/' + obj.SUBREGION.replace( / /g, '+' ) + '/activity">' + obj.SUBREGION + '</a>';
	},
	COUNTRY: function( obj ) {
		var c = '';
		if( obj.COUNTRY !== null ) {
			var countryobj = getCountry( obj.COUNTRY );
			c = obj.COUNTRY.toLowerCase();
		}
		if( countryobj ) {
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ c +'_v2013071601.0.gif" class="playerflag" /> <a href="#/places/countries/' + c + '/activity">' + countryobj.name + '</a><small class="pull-right"><a href="#/places/regions/' + countryobj.region + '/activity">' + countryobj.region + '</a></small>';
		}
		else {
			return '';
		}
	},
	NUM_PLAYERS: function( obj ) {
		return thousandSeparator( obj.NUM_PLAYERS );
	},
	NUM_PLAYERS_KM: function( obj ) {
		var c = '';
		if( obj.COUNTRY !== null ) {
			var countryobj = getCountry( obj.COUNTRY );
			c = obj.COUNTRY.toLowerCase();
		}
		if( countryobj )
			return '' + ( obj.NUM_PLAYERS/countryobj.area*1000 ).toFixed(1);
		else
			return '';
	},
	PLAYER: function( obj ) {
		return mkPlayerButton( obj, 'PLAYER', 'COUNTRY' );
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
			return '<span  rel="popover" data-html="true" data-placement="right" data-content="WIN" class="btn btn-xs btn-success popthis" >W</span>';
		}
		else {
			return '<span  rel="popover" data-html="true" data-placement="right" data-content="LOSS" class="btn btn-xs btn-danger popthis" >L</span>';
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
			return '<span data-toggle="tooltip" class="btn btn-xs btn-danger popthis" data-placement="left" data-content="Quit"><i>'+ obj.RANK +'</i></span>';
		}
		else {
			return obj.RANK;
		}
	},
	TEAM_RANK: function( obj ) {
		if( obj.TEAM_RANK == -1 ) {
			return '<span data-toggle="tooltip" class="btn btn-xs btn-danger popthis" data-placement="left" data-content="Quit"><i>'+ obj.TEAM_RANK +'</i></span>';
		}
		else {
			return obj.TEAM_RANK;
		}
	},
	TAG: function( obj ) {
		return '<a class="btn btn-xs btn-default " href="#/tags/'+ obj.ID +'"><span class="glyphicon glyphicon-tag"></span> ' + obj.TAG + '</a>';
	},
	MATCHES_PLAYED: function( obj ) {
		return thousandSeparator( obj.MATCHES_PLAYED );
	},
	TOTAL_KILLS: function( obj ) {
		return thousandSeparator( obj.TOTAL_KILLS );
	},
	KILLS: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.KILLS/obj.MATCHES_PLAYED).toFixed(2) +' kills/game with a ratio of '+ (obj.KILLS/obj.DEATHS).toFixed(2) +' on average">'+ obj.KILLS +'</span>';
	},
	IMPRESSIVE: function( obj ) {
		val = ( obj.IMPRESSIVE > 0 ) ? obj.IMPRESSIVE : '-';
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.IMPRESSIVE/obj.MATCHES_PLAYED).toFixed(2) +' imp/game on average">'+ val +'</span>';
	},
	EXCELLENT: function( obj ) {
		val = ( obj.EXCELLENT > 0 ) ? obj.EXCELLENT : '-';
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.EXCELLENT/obj.MATCHES_PLAYED).toFixed(2) +' exc/game on average">'+ val +'</span>';
	},
	HUMILIATION: function( obj ) {
		return '<span data-toggle="tooltip" data-placement="left" title="'+ (obj.G_K/obj.MATCHES_PLAYED).toFixed(2) +' hum/game on average">'+ obj.G_K +'</span>';
	},
	DAMAGE_TAKEN: function( obj ) {
		return thousandSeparator( obj.DAMAGE_TAKEN );
	},
	DAMAGE_DEALT: function( obj ) {
		return '<span rel="popover"><div rel="popover" class="popthis" data-html="true" data-placement="top" data-content="'+ (obj.DAMAGE_DEALT/obj.PLAY_TIME).toFixed(2) +' dmg/sec  ' + ( obj.DAMAGE_DEALT - obj.DAMAGE_TAKEN ) + ' netDMG"><i>'+ thousandSeparator( obj.DAMAGE_DEALT ) +'</i></span>';
	},
	OWNER: function( obj ) {
		return mkPlayerButton( obj, 'OWNER', 'OWNER_COUNTRY' );
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
		return '<div rel="popover" class="popthis" data-html="true" data-placement="bottom" data-content="'+ new Date( obj.GAME_TIMESTAMP *1000 ) +'">' + timediff( ( obj.GAME_TIMESTAMP *1000 ), new Date().getTime() ) + ' ago';
	},
	GAME_LENGTH: function( obj ) {
		return timediff( obj.GAME_LENGTH * 1000 );
	},
	PLAY_TIME: function( obj ) {
		return '<span rel="popover"><div rel="popover" class="popthis" data-html="true" data-placement="top" data-content="'+ obj.PLAY_TIME +' sec"><i>'+ timediff( obj.PLAY_TIME * 1000 ) +'</i></div></span>';
	},
	GAME_TYPE: function( obj ) {
		return mkGameType( obj );
	},
	SCORE: function( obj ) {
		return thousandSeparator( obj.SCORE );
	},
	SCORE_DIFF: function( obj ) {
		if( ( obj.SCORE - obj.LEADER_SCORE ) == 0 )
			return '';
		else
			return '<span style="color: red;">+' + thousandSeparator( obj.SCORE - obj.LEADER_SCORE ) + '</span>';
	},
	LEADER_SCORE: function( obj ) {
		return thousandSeparator( obj.LEADER_SCORE );
	},
	PQL_weapons: function( obj ) {
		// GAME_ID: ' + obj.LEADERS[0].GAME_ID + '
		if( obj.LEADERS[0] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[0].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[0].PLAYER + '">' + obj.LEADERS[0].PLAYER + '</a> <a href="#/games/' + obj.LEADERS[0].PUBLIC_ID + '"><div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[0].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs popthis pull-right"><span class="glyphicon glyphicon-info-sign "></span></div></a> <span class="pull-right">' + thousandSeparator( obj.LEADERS[0].SCORE ) + ' </span>';
		else return '';
	},
	PQL_strafe: function( obj ) {
		if( obj.LEADERS[1] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[1].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[1].PLAYER + '?ruleset=pql&weapons=off">' + obj.LEADERS[1].PLAYER + '</a> <a href="#/games/' + obj.LEADERS[1].PUBLIC_ID + '"><div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[1].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs popthis pull-right"><span class="glyphicon glyphicon-info-sign "></span></div></a> <span class="pull-right">' + thousandSeparator( obj.LEADERS[1].SCORE ) + ' </span>';
		else return '';
	},
	VQL_weapons: function( obj ) {
		if( obj.LEADERS[2] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[2].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[2].PLAYER + '?ruleset=vql&weapons=on">' + obj.LEADERS[2].PLAYER + '</a> <a href="#/games/' + obj.LEADERS[2].PUBLIC_ID + '"><div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[2].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs popthis pull-right"><span class="glyphicon glyphicon-info-sign "></span></div></a> <span class="pull-right">' + thousandSeparator( obj.LEADERS[2].SCORE ) + ' </span>';
		else return '';
	},
	VQL_strafe: function( obj ) {
		if( obj.LEADERS[3] != null )
			return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.LEADERS[3].COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" /> <a href="#/race/players/' + obj.LEADERS[3].PLAYER + '?ruleset=vql&weapons=off">' + obj.LEADERS[3].PLAYER + '</a> <a href="#/games/' + obj.LEADERS[3].PUBLIC_ID + '"><div rel="popover" data-html="true" data-placement="bottom" data-content="<br>Set <b>' + timediff( obj.LEADERS[3].GAME_TIMESTAMP*1000, new Date().getTime() ) + '</b> ago<br>" data-original-title="" class="btn btn-xs popthis pull-right"><span class="glyphicon glyphicon-info-sign "></span></div></a> <span class="pull-right">' + thousandSeparator( obj.LEADERS[3].SCORE ) + ' </span>';
		else return '';
	},
	GAME_LENGTH_SUM: function( obj ) {
		return timediff( obj.GAME_LENGTH_SUM * 1000 );
	},
	GAME_LENGTH_AVG: function( obj ) {
		return timediff( obj.GAME_LENGTH_AVG * 1000 );
	},
	ACC: function( obj ) {
		// this->
		if( 'HITS' in obj && 'SHOTS' in obj )
			return '<span rel="popover" <div rel="popover" class="popthis" data-html="true" data-placement="top" data-content="'+ obj.HITS + ' hits of ' + obj.SHOTS + ' shots"><i>'+ ( obj.HITS / obj.SHOTS * 100 ).toFixed(1) +'%</i></span>';
		else if( 'ACC' in obj )
			return '<span><i>'+ obj.ACC +'%</i></span>';
	},
	RL: function( obj ) {
		return '<span rel="popover" <div rel="popover" class="popthis" data-html="true" data-placement="right" data-content="' + obj.RL_K + ' kills '+ obj.RL_H + ' hits of ' + obj.RL_S + ' shots">'+ ( obj.RL_H / obj.RL_S * 100 ).toFixed(1) +'%</span>';
	},
	RG: function( obj ) {
		return '<span rel="popover" <div rel="popover" class="popthis" data-html="true" data-placement="right" data-content="' + obj.RG_K + ' kills '+ obj.RG_H + ' hits of ' + obj.RG_S + ' shots">'+ ( obj.RG_H / obj.RG_S * 100 ).toFixed(1) +'%</span>';
	},
	LG: function( obj ) {
		return '<span rel="popover" <div rel="popover" class="popthis" data-html="true" data-placement="right" data-content="' + obj.LG_K + ' kills '+ obj.LG_H + ' hits of ' + obj.LG_S + ' shots">'+ ( obj.LG_H / obj.LG_S * 100 ).toFixed(1) +'%</span>';
		return '<span data-toggle="tooltip" data-placement="left" title="'+ obj.LG_H + ' hits of ' + obj.LG_S + ' shots.">' + ( obj.LG_H / obj.LG_S * 100 ).toFixed(1) + '%</span>';
	},
	// kills
	G_K: function( obj ) { return ( obj.G_K > 0 ) ? obj.G_K : '-'; },
	RL_K: function( obj ) { return ( obj.RL_K > 0 ) ? obj.RL_K : '-'; },
	RG_K: function( obj ) { return ( obj.RG_K > 0 ) ? obj.RG_K : '-'; },
	LG_K: function( obj ) { return ( obj.LG_K > 0 ) ? obj.LG_K : '-'; },
	SG_K: function( obj ) { return ( obj.SG_K > 0 ) ? obj.SG_K : '-'; },
	GL_K: function( obj ) { return ( obj.GL_K > 0 ) ? obj.GL_K : '-'; },
	PG_K: function( obj ) { return ( obj.PG_K > 0 ) ? obj.PG_K : '-'; },
	HMG_K: function( obj ) { return ( obj.HMG_K > 0 ) ? obj.HMG_K : '-'; },
	MG_K: function( obj ) { return ( obj.MG_K > 0 ) ? obj.MG_K : '-'; },
	BFG_K: function( obj ) { return ( obj.BFG_K > 0 ) ? obj.BFG_K : '-'; },
	// shots
	G_S: function( obj ) { return ( obj.G_S > 0 ) ? thousandSeparator( obj.G_S ) : '-'; },
	RL_S: function( obj ) { return ( obj.RL_S > 0 ) ? thousandSeparator( obj.RL_S ) : '-'; },
	RG_S: function( obj ) { return ( obj.RG_S > 0 ) ? thousandSeparator( obj.RG_S ) : '-'; },
	LG_S: function( obj ) { return ( obj.LG_S > 0 ) ? thousandSeparator( obj.LG_S ) : '-'; },
	SG_S: function( obj ) { return ( obj.SG_S > 0 ) ? thousandSeparator( obj.SG_S ) : '-'; },
	GL_S: function( obj ) { return ( obj.GL_S > 0 ) ? thousandSeparator( obj.GL_S ) : '-'; },
	PG_S: function( obj ) { return ( obj.PG_S > 0 ) ? thousandSeparator( obj.PG_S ) : '-'; },
	HMG_S: function( obj ) { return ( obj.HMG_S > 0 ) ? thousandSeparator( obj.HMG_S ) : '-'; },
	MG_S: function( obj ) { return ( obj.MG_S > 0 ) ? thousandSeparator( obj.MG_S ) : '-'; },
	BFG_S: function( obj ) { return ( obj.BFG_S > 0 ) ? thousandSeparator( obj.BFG_S ) : '-'; },
	// hits
	G_H: function( obj ) { return ( obj.G_H > 0 ) ? thousandSeparator( obj.G_H ) : '-'; },
	RL_H: function( obj ) { return ( obj.RL_H > 0 ) ? thousandSeparator( obj.RL_H ) : '-'; },
	RG_H: function( obj ) { return ( obj.RG_H > 0 ) ? thousandSeparator( obj.RG_H ) : '-'; },
	LG_H: function( obj ) { return ( obj.LG_H > 0 ) ? thousandSeparator( obj.LG_H ) : '-'; },
	SG_H: function( obj ) { return ( obj.SG_H > 0 ) ? thousandSeparator( obj.SG_H ) : '-'; },
	GL_H: function( obj ) { return ( obj.GL_H > 0 ) ? thousandSeparator( obj.GL_H ) : '-'; },
	PG_H: function( obj ) { return ( obj.PG_H > 0 ) ? thousandSeparator( obj.PG_H ) : '-'; },
	HMG_H: function( obj ) { return ( obj.HMG_H > 0 ) ? thousandSeparator( obj.HMG_H ) : '-'; },
	MG_H: function( obj ) { return ( obj.MG_H > 0 ) ? thousandSeparator( obj.MG_H ) : '-'; },
	BFG_H: function( obj ) { return ( obj.BFG_H > 0 ) ? thousandSeparator( obj.BFG_H ) : '-'; },
	// acc
	RL_A: function( obj ) { return ( obj.RL_S > 0 ) ? ( obj.RL_H / obj.RL_S * 100 ).toFixed(1) + '%' : '-'; },
	RG_A: function( obj ) { return ( obj.RG_S > 0 ) ? ( obj.RG_H / obj.RG_S * 100 ).toFixed(1) + '%' : '-'; },
	LG_A: function( obj ) { return ( obj.LG_S > 0 ) ? ( obj.LG_H / obj.LG_S * 100 ).toFixed(1) + '%' : '-'; },
	SG_A: function( obj ) { return ( obj.SG_S > 0 ) ? ( obj.SG_H / obj.SG_S * 100 ).toFixed(1) + '%' : '-'; },
	GL_A: function( obj ) { return ( obj.GL_S > 0 ) ? ( obj.GL_H / obj.GL_S * 100 ).toFixed(1) + '%' : '-'; },
	PG_A: function( obj ) { return ( obj.PG_S > 0 ) ? ( obj.PG_H / obj.PG_S * 100 ).toFixed(1) + '%' : '-'; },
	HMG_A: function( obj ) { return ( obj.HMG_S > 0 ) ? ( obj.HMG_H / obj.HMG_S * 100 ).toFixed(1) + '%' : '-'; },
	MG_A: function( obj ) { return ( obj.MG_S > 0 ) ? ( obj.MG_H / obj.MG_S * 100 ).toFixed(1) + '%' : '-'; },
	BFG_A: function( obj ) { return ( obj.BFG_S > 0 ) ? ( obj.BFG_H / obj.BFG_S * 100 ).toFixed(1) + '%' : '-'; },
};
var dynatable_features = {
	sort: true,
	perPageSelect: true,
	paginate: true,
	search: true,
	recordCount: true,
	pushState: false,
};

function EmptyCtrl( params ) {
	setNavbarActive();
}
function SettingsCtrl( params ) {
	//$( '#loading' ).addClass( 'loading' );
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	adminPassword = $( 'admin_password' ).val();
	$( '#admin_settings' ).slideToggle();
}
function WeaponsCtrl( params ) {
	onLoading();
	setNavbarActive();
	$.ajax( {
		url: getApiURL() + 'api/weapons',
		dataType: getAjaxDataType(),
		success: function( data ) {
			Morris.Donut( {
				element: 'chart',
				data: data.data.sort( function( a, b ) { return b.value - a.value } ),
				//formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_kills*100 ).toFixed(1) + '%)'; },
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function OverviewCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	_url = parseHash();
	if( _url.indexOf( 'overview' ) != -1 ) {
		_index = _url.indexOf( 'overview' );
		_url.splice( _index, 1 );
		_url = '/' + _url.join( '/' )
	}
	$.ajax( {
		url: getApiURL() + 'api' + _url + '/games/graphs/perweek',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// matches
			dt = [];
			for( var i in data.data ) {
				d = data.data[i];
				dt.push( { date: d.year + ' W' + d.week, c: d.c } );
			}
			new Morris.Line( {
				element: 'matchesline',
				data: dt,
				xkey: 'date',
				ykeys: [ 'c' ],
				labels: [ 'Games' ],
				hideHover: 'auto',
				events: morris_events,
				eventLineColors: [ '#B78779', '#7580AF' ],
				eventLabels: morris_eventLabels,
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api' + _url + '/overview',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// morris
			var _kills = [];
			var _gametypesP = [];
			var _gametypes = [];
			var total_matches = 0;
			var total_kills = 0;
			for( var i in data.data ) {
				d = data.data[i];
				total_matches = total_matches + d.MATCHES_PLAYED;
				total_kills = total_kills + d.TOTAL_KILLS;
			}
			// total matches / kills
			$( '#chart_total' ).html( thousandSeparator( total_kills ) + ' total kills' );
			$( '#chart2_total' ).html( thousandSeparator( total_matches ) + ' total matches' );
			var _k = 0;
			for( var i in data.data ) {
				d = data.data[i];
				_kills.push( { label: GT[d.GAME_TYPE], value: d.TOTAL_KILLS } );
				_gametypes.push( { label: GT[d.GAME_TYPE], value: d.MATCHES_PLAYED } );
				_gametypesP.push( { label: GT[d.GAME_TYPE], value: ( (d.MATCHES_PLAYED/total_matches*100) ).toFixed(1) } );
			}
			// gametypes matches
			Morris.Donut( {
				element: 'chart',
				data: _kills.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_kills*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'chart2',
				data: _gametypes.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_matches*100 ).toFixed(1) + '%)'; },
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
				table: dynatable_table,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function RulesetOverviewCtrl( params ) {
	var g = params['game'];
	var ruleset = params['ruleset'];
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/rulesets/' + ruleset + '/games/graphs/perweek',
		dataType: getAjaxDataType(),
		success: function( data ) {
			dt = [];
			for( var i in data.data ) {
				d = data.data[i];
				dt.push( { date: d.year + ' W' + d.week, c: d.c } );
			}
			// matches
			new Morris.Line( {
				element: 'matchesline',
				data: dt,
				xkey: 'date',
				ykeys: [ 'c' ],
				labels: [ 'Games' ],
				hideHover: 'auto',
				//events: morris_events,
				//eventLineColors: [ '#B78779', '#7580AF' ],
				//eventLabels: morris_eventLabels,
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/rulesets/' + ruleset + '/overview',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// morris
			var _kills = [];
			var _gametypesP = [];
			var _gametypes = [];
			var total_matches = 0;
			var total_kills = 0;
			for( var i in data.data ) {
				d = data.data[i];
				total_matches = total_matches + d.MATCHES_PLAYED;
				total_kills = total_kills + d.TOTAL_KILLS;
			}
			// total matches / kills
			$( '#chart_total' ).html( thousandSeparator( total_kills ) + ' total kills' );
			$( '#chart2_total' ).html( thousandSeparator( total_matches ) + ' total matches' );
			var _k = 0;
			for( var i in data.data ) {
				d = data.data[i];
				_kills.push( { label: GT[d.GAME_TYPE], value: d.TOTAL_KILLS } );
				_gametypes.push( { label: GT[d.GAME_TYPE], value: d.MATCHES_PLAYED } );
				_gametypesP.push( { label: GT[d.GAME_TYPE], value: ( (d.MATCHES_PLAYED/total_matches*100) ).toFixed(1) } );
			}
			// gametypes matches
			Morris.Donut( {
				element: 'chart',
				data: _kills.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_kills*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'chart2',
				data: _gametypes.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_matches*100 ).toFixed(1) + '%)'; },
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
				table: dynatable_table,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function AllCtrl( params ) {
	onLoading();
	setNavbarActive();
	var lol = theLiz.all();
	$scope.overview = lol;
	$scope.date = new Date().getTime();
	//$scope.maps = theLiz.overview_maps();
	$.ajax( {
		url: "api/all/daily",
		dataType: getAjaxDataType(),
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
var _inDuelVs = 0;
var playerGames = {};
var _duelVsMap = null;
var _duelMaps = [
	'aerowalk',
	'campgroundsintel',
	'cure',
	'furiousheights',
	'lostworld',
	'sinister',
	'toxicity',
	'campgrounds',
	'bloodrun',
];
var _weapons = [
	{ short: 'RL', name: 'ROCKET LAUNCHER' },
	{ short: 'RG', name: 'RAIL GUN' },
	{ short: 'LG', name: 'LIGHTNING GUN' },
	{ short: 'GL', name: 'GRENADE LAUNCHER' },
	{ short: 'PG', name: 'PLASMA GUN' } ,
	{ short: 'G',  name: 'GAUNTLET' },
	{ short: 'MG', name: 'MACHINE GUN' },
];
var _weaponMore = [ '_S', '_H', '_K' ];
function inDuelVsAfter() {
	onComplete();
	$( '#current_url' ).html( printLocations() );
	$( document ).on( {
		mouseenter: function() {
			$(this).find( 'span' ).fadeIn( 'fast' );
		},
		mouseleave: function() {
			$(this).find( 'span' ).hide();
		}
	}, 'a.gametypebtn' );
	$scope.theurl = '';
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.$on( 'Search', function() {
		$scope.players = theLiz.players_search( $( '#players_search' ).val() );
	} );
	$scope.showsearch = true;
	onComplete();
	console.log( 'AFTER' );
	console.log( _duelVsMap );
	var p1g = [];
	var joinedGames = [];
	var wins = [];
	// player 1
	for( var i in playerGames[1] ) {
		g = playerGames[1][i];
		p1g.push( g.PUBLIC_ID );
	}
	// player 2
	for( var i in playerGames[2] ) {
		g = playerGames[2][i];
		// when players played eachother
		if( p1g.indexOf( g.PUBLIC_ID ) != -1 ) {
			joinedGames.push( g );
			if( g.WIN == 0 ) {
				wins.push( g );
			}
		}
	}
	$( '.p1' ).find( 'div' ).find( 'div.MATCHES_VS' ).append( joinedGames.length );
	$( '.p2' ).find( 'div' ).find( 'div.MATCHES_VS' ).append( joinedGames.length );
	$( '.p1' ).find( 'div' ).find( 'div.MATCHES_VS_WINS' ).append( wins.length + ' (<b>' + ( wins.length/joinedGames.length*100 ).toFixed(2) + '</b>%)' );
	$( '.p2' ).find( 'div' ).find( 'div.MATCHES_VS_WINS' ).append( ( joinedGames.length-wins.length ) + ' (<b>' + ( ( joinedGames.length-wins.length )/joinedGames.length*100 ).toFixed(2) + '</b>%)' );
	// dynatable joined games
	$( '#table_player_games' ).bind( 'dynatable:init', function( e, dynatable ) {
		dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
	} );
	$( '#table_player_games' ).dynatable( {
		features: dynatable_features,
		writers: dynatable_writers,
		table: dynatable_table,
		dataset: {
			perPageDefault: 10,
			perPageOptions: [10,20,50,100,200],
			records: joinedGames.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
		}
	} );
}
function inDuelVs( nr, d ) {
	_inDuelVs++;
	console.log( 'inDuelVs: ' + nr );
	console.log( d.PLAYER_NICK );
	$( '.PLAYER' + nr ).append( d[0].PLAYER );
	var wins = 0;
	var yearmonth = [];
	var _yearmonth = {};
	var yearmonth_wins = [];
	var _yearmonth_wins = {};
	// da loop
	playerGames[nr] = [];
	// if a specific map is set
	var gamesData = [];
	if( typeof _duelVsMap !== 'undefined' ) {
		console.log( '_duelVsMap not null: ' + _duelVsMap );
		for( var i in d ) {
			g = d[i];
			if( g.MAP == _duelVsMap ) {
				gamesData.push( g )
			}
		}
	}
	else {
		for( var i in d ) {
			g = d[i];
			gamesData.push( g )
		}
	}
	var _playerStats = { kills: 0, deaths: 0, dmgd: 0, dmgt: 0, hits: 0, shots: 0 };
	var _playerW  = { RL: { S: 0, H: 0, K: 0 }, RG: { S: 0, H: 0, K: 0 }, LG: { S: 0, H: 0, K: 0 } };
	// MATCHES_PLAYED
	$( '.p' + nr ).find( 'div' ).find( 'div.MATCHES_PLAYED' ).append( gamesData.length );
	for( var i in gamesData ) {
		g = gamesData[i];
		// save player nr's games
		playerGames[nr].push( g );
		// wins
		if( g.WIN == 1 ) { wins++; }
		// game dates
		var date = new Date( g.GAME_TIMESTAMP * 1000 );
		ym = date.getFullYear() + '-' + ( date.getMonth()+1 );
		if( ym in _yearmonth ) { _yearmonth[ym]++; _yearmonth_wins[ym] += g.WIN; }
		else { _yearmonth[ym] = 1; _yearmonth_wins[ym] = 0; _yearmonth_wins[ym] += g.WIN; }
		// player stats
		_playerStats.kills += g.KILLS;
		_playerStats.deaths += g.DEATHS;
		_playerStats.dmgd += g.DAMAGE_DEALT;
		_playerStats.dmgt += g.DAMAGE_TAKEN;
		_playerStats.hits += g.HITS;
		_playerStats.shots += g.SHOTS;
		_playerW.RL.S += g.RL_S; _playerW.RL.H += g.RL_H; _playerW.RL.K += g.RL_K;
		_playerW.RG.S += g.RG_S; _playerW.RG.H += g.RG_H; _playerW.RG.K += g.RG_K;
		_playerW.LG.S += g.LG_S; _playerW.LG.H += g.LG_H; _playerW.LG.K += g.LG_K;
		//_playerW.G.K += g.G_K;
	}
	console.log( 'weapons' );
	console.log( _playerW );
	// stats total
	var tot = gamesData.length;
	$( '.p' + nr ).find( 'div' ).find( 'div.STATS_TOTAL' ).append( '<b>' + _playerStats.kills + '</b> kills <b>' + _playerStats.deaths  + '</b> deaths (<b>' + ( _playerStats.kills/_playerStats.deaths ).toFixed(2) + '</b> ratio) <b>' + ( _playerStats.hits/_playerStats.shots*100 ).toFixed(2) + '</b> acc' );
	// stats avg
	if( nr == 1 ) {
		$( '#STATS_AVG' ).append( '<p>Stats avg/game</p>' );
		for( var i in _playerW ) {
			$( '#STATS_AVG' ).append( '<p><b>' + i + '</b> avg/game</p>' );
		}
	}
	$( '.p' + nr ).find( 'div' ).find( 'div.STATS_AVG' ).append( '<p><b>' + ( _playerStats.kills/tot ).toFixed(2) + '</b> kills <b>' + ( _playerStats.deaths/tot ).toFixed(2)  + '</b> deaths <b>' + ( _playerStats.dmgd/tot ).toFixed(0) + '</b> dmgD <b>' + ( (_playerStats.dmgd-_playerStats.dmgt)/tot ).toFixed(0) + '</b> netDmg</p>' );
	for( var i in _playerW ) {
		w = _playerW[i];
		$( '.p' + nr ).find( 'div' ).find( 'div.STATS_AVG' ).append( '<p><b>' + ( w.S/tot ).toFixed(1) + '</b> shots <b>' + ( w.H/w.S*100 ).toFixed(0) + '%</b> acc <b>' + ( w.K/tot ).toFixed(2) + '</b> kills</p>' );
	}
	// quakecon duel mappool
	var qConMaps = [];
	var qConMapWins = [];
	if( typeof _duelVsMap === 'undefined' ) {
		for( var i in _duelMaps ) {
			m = _duelMaps[i];
			qConMaps[m] = 0;
			qConMapWins[m] = 0;
			for( var j in d ) {
				if( d[j].MAP == m ) {
					qConMaps[m]++;
					qConMapWins[m] += d[j].WIN;
				}
			}
		}
		for( var i in qConMaps ) {
			if( nr == 1 ) { $( '#QCON_MAPS' ).append( '<p><b>' + i + '</b></p>' ); }
			m = qConMaps[i];
			w = qConMapWins[i];
			$( '.p' + nr ).find( 'div' ).find( 'div.QCON_MAPS' ).append( '<p>' + ' <b>' + w + '</b> wins / <b>' + m + '</b> matches (<b>' + ( w/m*100 ).toFixed(2) + '</b>% wins)</p>' );
		}
	}
	console.log( 'qconmaps' );
	console.log( qConMaps );
	console.log( qConMapWins );
	// matches dates
	for( var i in _yearmonth ) {
		y = _yearmonth[i];
		yearmonth.push( { date: i, matches: _yearmonth[i], wins: _yearmonth_wins[i] } );
	}
	console.log( 'ym' );
	console.log( _yearmonth );
	console.log( _yearmonth_wins );
	// matches won
	$( '.p' + nr ).find( 'div' ).find( 'div.WINS' ).append( wins + ' (' + ( wins/gamesData.length*100 ).toFixed(2) + '%)' );
	// matches
	console.log( yearmonth );
	// matches
	new Morris.Line( {
		element: $( '.p' + nr ).find( 'div.MATCHES' ),
		data: yearmonth,
		ymax: 400,
		xkey: 'date',
		ykeys: [ 'matches', 'wins' ],
		labels: [ 'matches played', 'Wins' ],
		hideHover: 'auto',
	} );
	// dynatable player games
	$( '#table_player' + nr + '_games' ).bind( 'dynatable:init', function( e, dynatable ) {
		dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
	} );
	$( '#table_player' + nr + '_games' ).dynatable( {
		features: dynatable_features,
		writers: dynatable_writers,
		table: dynatable_table,
		dataset: {
			perPageDefault: 10,
			perPageOptions: [10,20,50,100,200],
			records: gamesData.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
		}
	} );
	if( _inDuelVs == 2 ) {
		console.log( '_inDuelVs TWOOOO' );
		inDuelVsAfter();
		_inDuelVs = 0;
	}
}
function DuelVsCtrl( params ) {
	onLoading();
	setNavbarActive();
	var ns = params['nicks'].split( '+' );
	var map = params['map'];
	_duelVsMap = map;
	console.log( ns );
	$( '#current_url' ).html( printLocations() );
	// player1
	$.ajax( {
		url: getApiURL() + 'api/gametypes/duel/players/' + ns[0] + '/games',
		dataType: getAjaxDataType(),
		success: function( data ) {
			console.log( data );
			inDuelVs( 1, data.data );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			//onComplete( data );
		},
	} );
	// player2
	$.ajax( {
		url: getApiURL() + 'api/gametypes/duel/players/' + ns[1] + '/games',
		dataType: getAjaxDataType(),
		success: function( data ) {
			console.log( data );
			inDuelVs( 2, data.data );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			//onComplete( data );
		},
	} );
}
function RulesetGamesCtrl( params ) {
	var ruleset = params['ruleset'];
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/rulesets/' + ruleset + '/games',
		dataType: getAjaxDataType(),
		success: function( data ) {
			$( '#table_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
}
function GamesCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$( '#table_games' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
		onComplete();
	} );
	$( '#table_games' ).dynatable( {
		dataset: {
			ajax: true,
			ajaxUrl: getApiURL() + 'api/' + parseHash().join( '/' ),
			ajaxCache: false,
			ajaxDataType: getAjaxDataType(),
			ajaxOnLoad: true,
			processingText: 'Loading...',
			records: [],
			perPageDefault: 20,
			perPageOptions: [10,20,50,100],
		},
		params: {
			records: 'data',
		},
		features: {
			sort: false,
			search: false,
			pushState: false,
			perPageSelect: true,
			paginate: true,
			recordCount: true,
		},
		writers: dynatable_writers,
	} );
}
function GameCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var g = params['game'];
	$.ajax( {
		url: getApiURL() + 'api/games/' + g,
		dataType: getAjaxDataType(),
		success: function( data ) {
			// info
			$( '.wshots' ).hide();
			var g = data.data.game;
			var p = data.data.players;
			var ranked = '<div class="btn btn-danger popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Unranked match">U</div>';
			var ruleset = '<div class="btn btn-info popthis" data-container="body" data-html="true" data-placement="left" data-content="Classic Ruleset">C</div>';
			var premium = '<div class="btn btn-info popthis" data-container="body" data-html="true" data-placement="right" data-content="Standard server">S</div>';
			var gt = '';
			if( g.GAME_TYPE == 'harv' ) { gt = 'harvester'; }
			else { gt = g.GAME_TYPE.toLowerCase(); }
			if( g.RANKED == 1 ) { ranked = '<div class="btn btn-success popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Ranked match">R</div>'; }
			if( g.RULESET == 2 ) { ruleset = '<div class="btn btn-danger popthis" data-container="body" data-html="true" data-placement="left" data-content="Turbo Ruleset">T</div>'; }
			if( g.RULESET == 3 ) { ruleset = '<div class="btn btn-success popthis" data-container="body" data-html="true" data-placement="left" data-content="QL Ruleset">Q</div>'; }
			if( g.PREMIUM == 1 ) { premium = '<div class="btn btn-success popthis" data-container="body" data-html="true" data-placement="right" data-content="Premium server">P</div>'; }
			var img = '<a style="color: #000;" href="#/maps/' + g.MAP + '"><div class=""><img title="' + g.MAP + '" alt="' + g.MAP + '" class="img-thumbnail dumbnail" src="http://cdn.quakelive.com/web/2014051402/images/levelshots/lg/' + g.MAP + '_v2014051402.0.jpg/50%" /><div class="wrapper"><div class="map-name">' + g.MAP + '</div></div></div></a>';
			$( '#info' ).append( '<div class="gametype btn-group btn-group-xs">' + ruleset + ranked + premium + '</div>' );
			$( '#info' ).append( img );
			$( '#info_title' ).append( '<img src="http://cdn.quakelive.com/web/2014051402/images/gametypes/xsm/' + gt + '_v2014051402.0.png" title="' + gt + '" /> ' + GT[g.GAME_TYPE] + '' );
			//$( '#info' ).append( ' ' + timediff( g.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago ' );
			$( '#info' ).append( 'Game Length: ' + timediff( g.GAME_LENGTH * 1000 ) );
			if( g.OWNER_ID !== null && g.OWNER_ID != 269750 ) {
				$( '#info' ).append( ' hosted by <a href="#/owners/'+ g.OWNER +'">' + g.OWNER + '</a> ' );
			}
			// tags
			if( data.data.tags.length > 0 ) {
				for( var i in data.data.tags ) {
					t = data.data.tags[i];
					$( '#info' ).append( '<a data-html="true" data-placement="right" data-original-title="Tag: ' + t.NAME + '" data-content="' + t.DESCR + '" class="btn btn-xs btn-default popthis" href="#/tags/' + t.ID + '"><span class="glyphicon glyphicon-tag"></span> ' + t.NAME + '</a>' );
				}
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
					data: red.sort( function( a, b) { return b.dmg - a.dmg } ),
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
					data: blue.sort( function( a, b) { return b.dmg - a.dmg } ),
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
				data: score.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ''; },
			} );
			// accuracy
			var acc = [];
			for( var i in p ) {
				if( p[i].SHOTS !== 0 && p[i].HITS !== 0 && p[i].RANK != -1 )
					acc.push( { label: p[i].PLAYER, value: ( p[i].HITS / p[i].SHOTS * 100 ).toFixed(2) } );
			}
			Morris.Donut( {
				element: 'acc',
				data: acc.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			// KILLS IMPRESSIVE EXCELLENT HUMILIATION
			var kills = [];
			var _imp = [];
			var _exc = [];
			var _hum = [];
			for( var i in p ) {
				kills.push( { label: p[i].PLAYER, value: p[i].KILLS } );
				_imp.push( { label: p[i].PLAYER, value: p[i].IMPRESSIVE } );
				_exc.push( { label: p[i].PLAYER, value: p[i].EXCELLENT } );
				_hum.push( { label: p[i].PLAYER, value: p[i].G_K } );
			}
			Morris.Donut( {
				element: 'kills',
				data: kills.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ''; },
			} );
			Morris.Donut( {
				element: 'imp',
				data: _imp.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ''; },
			} );
			Morris.Donut( {
				element: 'exc',
				data: _exc.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ''; },
			} );
			Morris.Donut( {
				element: 'hum',
				data: _hum.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ''; },
			} );
			// weapons
			var RL_A = [];
			var RL_K = [];
			var RG_A = [];
			var RG_K = [];
			var LG_A = [];
			var LG_K = [];
			var PG_A = [];
			var PG_K = [];
			var GL_A = [];
			var GL_K = [];
			var SG_A = [];
			var SG_K = [];
			for( var i in p ) {
				if( p[i].QUIT !== 1 ) {
					if( p[i].RL_H !== 0 && p[i].RL_S !== 0 )
						RL_A.push( { label: p[i].PLAYER, value: ( p[i].RL_H / p[i].RL_S * 100 ).toFixed(2) } );
					if( p[i].RL_K !== 0 )
						RL_K.push( { label: p[i].PLAYER, value: p[i].RL_K } );
					if( p[i].RG_H !== 0 && p[i].RG_S !== 0 )
						RG_A.push( { label: p[i].PLAYER, value: ( p[i].RG_H / p[i].RG_S * 100 ).toFixed(2) } );
					if( p[i].RG_K !== 0 )
						RG_K.push( { label: p[i].PLAYER, value: p[i].RG_K } );
					if( p[i].LG_H !== 0 && p[i].LG_S !== 0 )
						LG_A.push( { label: p[i].PLAYER, value: ( p[i].LG_H / p[i].LG_S * 100 ).toFixed(2) } );
					if( p[i].LG_K !== 0 )
						LG_K.push( { label: p[i].PLAYER, value: p[i].LG_K } );
					if( p[i].PG_H !== 0 && p[i].PG_S !== 0 )
						PG_A.push( { label: p[i].PLAYER, value: ( p[i].PG_H / p[i].PG_S * 100 ).toFixed(2) } );
					if( p[i].PG_K !== 0 )
						PG_K.push( { label: p[i].PLAYER, value: p[i].PG_K } );
					if( p[i].GL_H !== 0 && p[i].GL_S !== 0 )
						GL_A.push( { label: p[i].PLAYER, value: ( p[i].GL_H / p[i].GL_S * 100 ).toFixed(2) } );
					if( p[i].GL_K !== 0 )
						GL_K.push( { label: p[i].PLAYER, value: p[i].GL_K } );
					if( p[i].SG_H !== 0 && p[i].SG_S !== 0 )
						SG_A.push( { label: p[i].PLAYER, value: ( p[i].SG_H / p[i].SG_S * 100 ).toFixed(2) } );
					if( p[i].SG_K !== 0 )
						SG_K.push( { label: p[i].PLAYER, value: p[i].SG_K } );
				}
			}
			Morris.Donut( {
				element: 'rl',
				data: RL_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'rlk',
				data: RL_K.sort( function( a, b ) { return b.value - a.value } ),
			} );
			Morris.Donut( {
				element: 'rg',
				data: RG_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'rgk',
				data: RG_K.sort( function( a, b ) { return b.value - a.value } ),
			} );
			Morris.Donut( {
				element: 'lg',
				data: LG_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'lgk',
				data: LG_K.sort( function( a, b ) { return b.value - a.value } ),
			} );
			Morris.Donut( {
				element: 'pg',
				data: PG_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'pgk',
				data: PG_K.sort( function( a, b ) { return b.value - a.value } ),
			} );
			Morris.Donut( {
				element: 'gl',
				data: GL_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'glk',
				data: GL_K.sort( function( a, b ) { return b.value - a.value } ),
			} );
			Morris.Donut( {
				element: 'sg',
				data: SG_A.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			Morris.Donut( {
				element: 'sgk',
				data: SG_K.sort( function( a, b ) { return b.value - a.value } ),
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
				table: dynatable_table,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 100,
					perPageOptions: [10,20,50,100,200],
					records: data.data.players
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	// admin stuff
	if( $( '#admin_password' ).val().length > 0 ) {
		$.ajax( {
			url: getApiURL() + 'api/tags',
			dataType: getAjaxDataType(),
			success: function( data ) {
				for( var i in data.data ) {
					t = data.data[i];
					$( '#admin_gametags' ).append( '<button onclick="submitGameTag(' + t.ID + ', \'' + g + '\');" class="btn btn-xs btn-default"><span class="glyphicon glyphicon-tag"></span> ' + t.TAG + '</button>' );
				}
			},
			error: function( data ) {
			},
			complete: function( data ) {
				onComplete( data );
			},
		} );
	}
}
function PlayerCtrl( params ) {
	setNavbarActive();
	onLoading();
	$( '#current_url' ).html( printLocations() );
	var gt = params['gametype'];
	var p = params['player'];
	var t = params['tag'];
	// player nick top of page
	// '<div class="btn-group btn-group-xs">' + countrylink + '<a class="btn btn-default" href="#/players/'+ obj.PLAYER +'">' + obj.PLAYER + '</a><div class="btn-group btn-group-xs"><a class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></a><ul class="dropdown-menu" ><li><a href="#/players/' + obj.PLAYER + '">Player profile</a></li><li><a href="#/race/players/' + obj.PLAYER + '">Race profile</a></li><li><a href="#/owners/' + obj.PLAYER + '">Owner profile</a></li></ul></div></a></div> ' + clanlink;
	$( '#player' ).html( '<div class="btn-group btn-group-lg"><a class="btn btn-default" href="#/players/'+ p +'">' + p + '</a><div class="btn-group btn-group-lg"><a class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></a><ul class="dropdown-menu" ><li><a href="#/players/' + p + '">Player profile</a></li><li><a href="#/race/players/' + p + '">Race profile</a></li><li><a href="#/owners/' + p + '">Owner profile</a></li></ul></div></a></div>' );
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
	var _url = getApiURL() + 'api' + add + '/players/' + p + '/games';
	$.ajax( {
		url: _url,
		dataType: getAjaxDataType(),
		success: function( data ) {
			// morris
			var gametypes = [];
			var _gametypes = {};
			var rulesets = [];
			var _rulesets = {};
			var _maps = {};
			var maps = [];
			var yearmonth = [];
			var _yearmonth = {};
			var total = data.data.length;
			var wins = 0;
			var losses = 0;
			var quits = 0;
			for( var i in data.data ) {
				d = data.data[i];
				gt = d.GAME_TYPE.toLowerCase();
				rls = d.RULESET;
				// wins / losses / quits
				if( d.WIN == 1 ) { wins++; }
				else {  losses++; }
				if( d.RANK == -1 ) { quits++; }
				// gametypes
				if( gt in _gametypes ) { _gametypes[gt]++; }
				else { _gametypes[gt] = 1; }
				// rulesets
				if( rls in _rulesets ) { _rulesets[rls]++; }
				else { _rulesets[rls] = 1; }
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
				gametypes.push( { label: GT[i], value: ( (_gametypes[i]/total*100) ).toFixed(2) } );
			}
			for( var i in _rulesets ) {
				d = _rulesets[i];
				rulesets.push( { label: RULESETS[i], value: ( (_rulesets[i]/total*100) ).toFixed(2) } );
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
				formatter: function( y ) { return y + ' (' + ( y/data.data.length*100 ).toFixed(2) + '%)'; },
			} );
			// maps
			Morris.Donut( {
				element: 'mapsgraph',
				data: maps.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			// gametypes
			Morris.Donut( {
				element: 'gametypes',
				data: gametypes.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			// rulesets
			Morris.Donut( {
				element: 'rulesets',
				data: rulesets.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + '%'; },
			} );
			// dynatable
			$( '#table_player_games' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'GAME_TIMESTAMP', -1 );
			} );
			$( '#table_player_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function PlayersCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$( '#table_players' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
		onComplete();
	} );
	$( '#table_players' ).dynatable( {
		dataset: {
			ajax: true,
			ajaxUrl: getApiURL() + 'api/' + parseHash().join( '/' ),
			ajaxDataType: getAjaxDataType(),
			ajaxOnLoad: true,
			processingText: 'Loading...',
			records: [],
			perPageDefault: 20,
			perPageOptions: [10,20,50,100],
		},
		params: {
			records: 'data',
		},
		features: {
			sort: false,
			search: false,
			pushState: false,
			perPageSelect: true,
			paginate: true,
			recordCount: true,
		},
		writers: dynatable_writers,
	} );
}
function OwnersCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$( '#table_owners' ).bind( 'dynatable:init', function( e, dynatable ) {
		dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
	} );
	$( '#table_owners' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
		onComplete();
	} );
	$( '#table_owners' ).dynatable( {
		dataset: {
			ajax: true,
			ajaxUrl: getApiURL() + 'api/' + parseHash().join( '/' ),
			ajaxDataType: getAjaxDataType(),
			ajaxOnLoad: true,
			processingText: 'Loading...',
			records: [],
			perPageDefault: 20,
			perPageOptions: [10,20,50,100],
		},
		params: {
			records: 'data',
		},
		features: {
			sort: true,
			search: true,
			pushState: false,
			perPageSelect: true,
			paginate: true,
			recordCount: true,
		},
		writers: dynatable_writers,
	} );
}
function OwnerTop30Ctrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = params['owner'];
	$.ajax( {
		url: getApiURL() + 'api/owners/' + o + '/top/last30days/kills',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/owners/' + o + '/top/last30days/ranks',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function OwnerCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = params['owner'];
	$.ajax( {
		url: getApiURL() + 'api/owners/' + o + '/games',
		dataType: getAjaxDataType(),
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
				data: mostAcc.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			// top10 most dmg
			Morris.Donut( {
				element: 'mostdmg',
				data: mostDmgD.sort( function( a, b ) { return b.value - a.value } ),
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
				data: maps.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/total*100 ).toFixed(2) + '%)'; },
			} );
			// gametypes
			Morris.Donut( {
				element: 'gametypes',
				data: gametypes.sort( function( a, b ) { return b.value - a.value } ),
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
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
}
function OwnerPlayerCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = params['owner'];
	var p = params['player'];
	var lol = theLiz.ownerplayer( o, p );
	$scope.player = lol;
	$scope.games = theLiz.ownerplayergames( o, p );
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function OwnerPlayersCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	if( params['owner'] ) {
		$scope.theurl = 'owner/' + params['owner'] + '/';
	}
	var o = params['owner'];
	var lol = theLiz.owner_players( o );
	$scope.players = lol;
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function OwnerGamesCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var o = params['owner'];
	$.ajax( {
		url: getApiURL() + 'api/owners/' + o + '/games',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
	/*
	if( params['owner'] ) {
		$scope.theurl = 'owner/' + params['owner'] + '/';
	}
	var o = params['owner'];
	var lol = theLiz.owner_games( o );
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	*/
}
function ClansCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$( '#table_clans' ).bind( 'dynatable:ajax:success', function( e, dynatable ) {
		onComplete();
	} );
	$( '#table_clans' ).dynatable( {
		dataset: {
			ajax: true,
			ajaxUrl: getApiURL() + 'api/clans',
			ajaxDataType: getAjaxDataType(),
			ajaxOnLoad: true,
			processingText: 'Loading...',
			records: [],
			perPageDefault: 20,
			perPageOptions: [10,20,50,100],
		},
		params: {
			records: 'data',
		},
		features: {
			sort: false,
			search: false,
			pushState: false,
			perPageSelect: true,
			paginate: true,
			recordCount: true,
		},
		writers: dynatable_writers,
	} );
	/*
	$.ajax( {
		url: getApiURL() + 'api/clans',
		dataType: getAjaxDataType(),
		success: function( data ) {
			$( '#table_clans' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 20,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	*/
}
function ClanCtrl( params ) {
	onLoading();
	setNavbarActive();
	//onComplete();
	var c = params['clan'];
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/clans/' + c,
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function MapsCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/' + parseHash().join( '/' ),
		dataType: getAjaxDataType(),
		success: function( data ) {
			$( '#table_maps' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
			} );
			$( '#table_maps' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 200,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
			Morris.Bar( {
				element: 'chart_maps',
				data: data.data.sort( function( a, b ) { return b.MATCHES_PLAYED - a.MATCHES_PLAYED } ),
				xkey: 'MAP',
				ykeys: [ 'MATCHES_PLAYED' ],
				labels: [ 'Matches played' ]
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function MapCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var m = params['map'];
	$.ajax( {
		url: getApiURL() + 'api/maps/' + m + '/graphs/permonth',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/maps/' + m,
		dataType: getAjaxDataType(),
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
				data: _data.sort( function( a, b ) { return b.value - a.value } ),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function GametypeOverviewCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var gt = params['gametype'];
	$.ajax( {
		url: getApiURL() + 'api/gametypes/' + gt + '/games/graphs/perweek',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// matches
			dt = [];
			for( var i in data.data ) {
				d = data.data[i];
				dt.push( { date: d.year + ' W' + d.week, c: d.c } );
			}
			new Morris.Line( {
				element: 'matchesline',
				data: dt,
				xkey: 'date',
				ykeys: [ 'c' ],
				labels: [ 'Games' ],
				hideHover: 'auto',
				events: morris_events,
				eventLineColors: [ '#B78779', '#7580AF' ],
				eventLabels: morris_eventLabels,
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/gametypes/' + gt + '/overview',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// morris
			var _kills = [];
			var _gametypesP = [];
			var _gametypes = [];
			var total_matches = 0;
			var total_kills = 0;
			for( var i in data.data ) {
				d = data.data[i];
				total_matches = total_matches + d.MATCHES_PLAYED;
				total_kills = total_kills + d.TOTAL_KILLS;
			}
			// total matches / kills
			$( '#chart_total' ).html( thousandSeparator( total_kills ) + ' total kills' );
			$( '#chart2_total' ).html( thousandSeparator( total_matches ) + ' total matches' );
			var _k = 0;
			for( var i in data.data ) {
				d = data.data[i];
				_kills.push( { label: GT[d.GAME_TYPE], value: d.TOTAL_KILLS } );
				_gametypes.push( { label: GT[d.GAME_TYPE], value: d.MATCHES_PLAYED } );
				_gametypesP.push( { label: GT[d.GAME_TYPE], value: ( (d.MATCHES_PLAYED/total_matches*100) ).toFixed(1) } );
			}
			// gametypes matches
			Morris.Donut( {
				element: 'chart',
				data: _kills.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_kills*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'chart2',
				data: _gametypes.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return thousandSeparator( y ) + ' (' + ( y/total_matches*100 ).toFixed(1) + '%)'; },
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
				table: dynatable_table,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function GametypeMapsCtrl( params ) {
	var gt = params['gametype'];
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/gametypes/' + gt + '/maps',
		dataType: getAjaxDataType(),
		success: function( data ) {
			$( '#table_maps' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'MATCHES_PLAYED', -1 );
			} );
			$( '#table_maps' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 200,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function GametypeTopAllCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var gt = params['gametype'];
	$.ajax( {
		url: getApiURL() + 'api/gametypes/' + gt + '/top/all/kills',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/gametypes/' + gt + '/top/all/ranks',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function PlacesCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/' + parseHash().join( '/' ) + '/countries',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// Initiate the chart
			var ar = [];
			var ob = {};
			var ar2 = [];
			var ob2 = {};
			var _regions = {};
			var regions = [];
			var _subregions = {};
			var subregions = [];
			var _countries = [];
			totalPlayers = 0;
			for( var i in data.data ) {
				c = data.data[i];
				totalPlayers += c.NUM_PLAYERS;
				_countries.push( { COUNTRY: c.COUNTRY, NUM_PLAYERS: c.NUM_PLAYERS, NUM_PLAYERS_KM: c.NUM_PLAYERS_KM } );
				if( data.data[i].NUM_PLAYERS > 0 ) {
					ob = { name: c.COUNTRY, code: c.COUNTRY, value: c.NUM_PLAYERS };
					ar.push( ob );
					if( c.COUNTRY !== null ) {
						var countryobj = getCountry( c.COUNTRY );
					}
					if( countryobj.area > 0 ) {
						ob2 = { name: c.COUNTRY, code: c.COUNTRY, value: ( c.NUM_PLAYERS/countryobj.area*1000 ).toFixed(2) };
						ar2.push( ob2 );
					}
					if( 'region' in countryobj ) {
						if( countryobj.region in _regions ) {
							_regions[countryobj.region] += c.NUM_PLAYERS;
						}
						else {
							_regions[countryobj.region] = c.NUM_PLAYERS;
						}
					}
					if( 'subregion' in countryobj ) {
						if( countryobj.subregion in _subregions ) {
							_subregions[countryobj.subregion] += c.NUM_PLAYERS;
						}
						else {
							_subregions[countryobj.subregion] = c.NUM_PLAYERS;
						}
					}
				}
			}
			for( var i in _regions ) {
				regions.push( { REGION: i, NUM_PLAYERS: _regions[i] } );
			}
			for( var i in _subregions ) {
				subregions.push( { SUBREGION: i, NUM_PLAYERS: _subregions[i] } );
			}
			// dynatable
			$( '#table_subregions' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'NUM_PLAYERS', -1 );
			} );
			$( '#table_subregions' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: subregions
				}
			} );
			// dynatable
			$( '#table_regions' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'NUM_PLAYERS', -1 );
			} );
			$( '#table_regions' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: regions
				}
			} );
			// dynatable
			$( '#table_countries' ).bind( 'dynatable:init', function( e, dynatable ) {
				dynatable.sorts.add( 'NUM_PLAYERS', -1 );
			} );
			$( '#table_countries' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: _countries
				}
			} );
			console.log( regions );
			console.log( 'done' );
			// map graph chart
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
					//min: 500,
					//max: 100000,
					type: 'logarithmic'
				},
				/*
				colorAxis: {
					min: 0,
					max: 200,
					type: 'logarithmic'
				},
				*/
				series: [
					{
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
					},
					/*
					{
						data: ar2,
						mapData: Highcharts.maps['custom/world'],
						joinBy: ['iso-a2', 'code'],
						name: 'Number of players / 1000km^2',
						states: {
							hover: {
								color: '#BADA55'
							}
						},
						tooltip: {
							valueSuffix: ' '
						}
					}
					*/
				]
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function EloDuelCtrl( params ) {
	onLoading();
	setNavbarActive();
	var lol = theLiz.eloduel();
	$scope.players = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'ELO';
	$scope.ordertype = true;
}
function TagBaseCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = params['tag'];
	// set tag name
	$( '#tag_id' ).html( t );
	// set button urls
	$( '#tab_btn_info' ).attr( 'href', '#/tags/' + t );
	$( '#tab_btn_overview' ).attr( 'href', '#/tags/' + t + '/overview' );
	$( '#tab_btn_games' ).attr( 'href', '#/tags/' + t + '/games' );
	$( '#tab_btn_players' ).attr( 'href', '#/tags/' + t + '/players' );
	$( '#tab_btn_owners' ).attr( 'href', '#/tags/' + t + '/owners' );
	$( '#tab_btn_maps' ).attr( 'href', '#/tags/' + t + '/maps' );
	$( '#tab_btn_places' ).attr( 'href', '#/tags/' + t + '/places' );
}
function TagCtrl( params ) {
	var t = params['tag'];
	$.ajax( {
		url: getApiURL() + 'api/tags/' + t,
		dataType: getAjaxDataType(),
		success: function( data ) {
			// set tag name
			$( '#tag_name' ).html( data.data.NAME );
			$( '#tag_descr' ).append( data.data.DESCR );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
	//
	onComplete();
}
function TagsCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/tags',
		dataType: getAjaxDataType(),
		success: function( data ) {
			//console.log( data );
			$( '#table_tags' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				table: dynatable_table,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
			//console.log( data );
		},
	} );
	// admin add new tag
	$( '#admin_tag_submit' ).click( function() {
		$.ajax( {
			url: getApiURL() + 'api/tags?password=' + $( '#admin_password' ).val(),
			dataType: getAjaxDataType(),
			type: 'POST',
			data: {
				name: $( '#admin_tag_name' ).val(),
				descr: $( '#admin_tag_descr' ).val(),
			},
			success: function( data ) {
				console.log( data );
				$( '#message' ).append( '<p class="alert alert-success">Created tag ' + data.data.insertId + '</p>' );
			},
			error: function( data ) {
			},
			complete: function( data ) {
				onComplete( data );
			},
		} );
	} );
}
function TagTop30daysCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = params['tag'];
	$.ajax( {
		url: getApiURL() + 'api/tags/' + t + '/top/last30days/kills',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/tags/' + t + '/top/last30days/ranks',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function TagTopAllCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = params['tag'];
	$.ajax( {
		url: getApiURL() + 'api/tags/' + t + '/top/all/kills',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/tags/' + t + '/top/all/ranks',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function TagPlayersCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = params['tag'];
}
function TagPlayerCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var t = params['tag'];
	var p = params['player'];
	var lol = theLiz.tagplayer( t, p );
	$scope.player = lol;
	//$scope.games = theLiz.ownerplayergames( t, p );
	//$scope.ordercolumn = 'GAME_TIMESTAMP';
	//$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function RaceCtrl( params ) {
	onLoading();
	setNavbarActive();
  $('#current_url').html(printLocations());
	$.ajax( {
		url: getApiURL() + 'api/race',
		dataType: getAjaxDataType(),
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
			var ipw = { max: { ts: ( ( new Date().getTime()/1000 ) - 60*60*24*30 ) }, min: { ts: ( new Date().getTime()/1000 ) } };
			var ips = { max: { ts: ( ( new Date().getTime()/1000 ) - 60*60*24*30 ) }, min: { ts: ( new Date().getTime()/1000 ) } };
			var ivw = { max: { ts: ( ( new Date().getTime()/1000 ) - 60*60*24*30 ) }, min: { ts: ( new Date().getTime()/1000 ) } };
			var ivs = { max: { ts: ( ( new Date().getTime()/1000 ) - 60*60*24*30 ) }, min: { ts: ( new Date().getTime()/1000 ) } };
			for( var i in data.data.maps ) {
				d = data.data.maps[i];
				if( d.LEADERS[0] !== null && typeof d.LEADERS[0] != 'undefined' &&
						d.LEADERS[1] !== null && typeof d.LEADERS[1] != 'undefined' &&
						d.LEADERS[2] !== null && typeof d.LEADERS[2] != 'undefined' &&
						d.LEADERS[3] !== null && typeof d.LEADERS[3] != 'undefined'
					) {
					if( ipw.max.ts < d.LEADERS[0].GAME_TIMESTAMP ) { ipw.max.ts = d.LEADERS[0].GAME_TIMESTAMP; ipw.max.ifo = d.LEADERS[0]; ipw.max.map = d.MAP; }
					if( ipw.min.ts > d.LEADERS[0].GAME_TIMESTAMP ) { ipw.min.ts = d.LEADERS[0].GAME_TIMESTAMP; ipw.min.ifo = d.LEADERS[0]; ipw.min.map = d.MAP; }
					if( ips.max.ts < d.LEADERS[1].GAME_TIMESTAMP ) { ips.max.ts = d.LEADERS[1].GAME_TIMESTAMP; ips.max.ifo = d.LEADERS[1]; ips.max.map = d.MAP; }
					if( ips.min.ts > d.LEADERS[1].GAME_TIMESTAMP ) { ips.min.ts = d.LEADERS[1].GAME_TIMESTAMP; ips.min.ifo = d.LEADERS[1]; ips.min.map = d.MAP; }
					if( ivw.max.ts < d.LEADERS[2].GAME_TIMESTAMP ) { ivw.max.ts = d.LEADERS[2].GAME_TIMESTAMP; ivw.max.ifo = d.LEADERS[2]; ivw.max.map = d.MAP; }
					if( ivw.min.ts > d.LEADERS[2].GAME_TIMESTAMP ) { ivw.min.ts = d.LEADERS[2].GAME_TIMESTAMP; ivw.min.ifo = d.LEADERS[2]; ivw.min.map = d.MAP; }
					if( ivs.max.ts < d.LEADERS[3].GAME_TIMESTAMP ) { ivs.max.ts = d.LEADERS[3].GAME_TIMESTAMP; ivs.max.ifo = d.LEADERS[3]; ivs.max.map = d.MAP; }
					if( ivs.min.ts > d.LEADERS[3].GAME_TIMESTAMP ) { ivs.min.ts = d.LEADERS[3].GAME_TIMESTAMP; ivs.min.ifo = d.LEADERS[3]; ivs.min.map = d.MAP; }
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
			// oldest/newest record
			/*
			$( '#pwinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ipw.min.ifo.SCORE + ' on ' + ipw.min.map + '" data-original-title="" class="popthis">' + timediff( ipw.min.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ipw.min.ifo.PLAYER + ' </div>'  );
			$( '#pwinfo' ).append( '<br>' );
			$( '#pwinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ipw.max.ifo.SCORE + ' on ' + ipw.max.map + '" data-original-title="" class="popthis">' + timediff( ipw.max.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ipw.max.ifo.PLAYER + ' </div>'  );
			//
			$( '#psinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ips.min.ifo.SCORE + ' on ' + ips.min.map + '" data-original-title="" class="popthis">' + timediff( ips.min.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ips.min.ifo.PLAYER + ' </div>'  );
			$( '#psinfo' ).append( '<br>' );
			$( '#psinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ips.max.ifo.SCORE + ' on ' + ips.max.map + '" data-original-title="" class="popthis">' + timediff( ips.max.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ips.max.ifo.PLAYER + ' </div>'  );
			//
			$( '#vwinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ivw.min.ifo.SCORE + ' on ' + ivw.min.map + '" data-original-title="" class="popthis">' + timediff( ivw.min.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ivw.min.ifo.PLAYER + ' </div>'  );
			$( '#vwinfo' ).append( '<br>' );
			$( '#vwinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ivw.max.ifo.SCORE + ' on ' + ivw.max.map + '" data-original-title="" class="popthis">' + timediff( ivw.max.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ivw.max.ifo.PLAYER + ' </div>'  );
			//
			$( '#vsinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ivs.min.ifo.SCORE + ' on ' + ivs.min.map + '" data-original-title="" class="popthis">' + timediff( ivs.min.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ivs.min.ifo.PLAYER + ' </div>'  );
			$( '#vsinfo' ).append( '<br>' );
			$( '#vsinfo' ).append( '<div rel="popover" data-html="true" data-placement="top" data-content="' + ivs.max.ifo.SCORE + ' on ' + ivs.max.map + '" data-original-title="" class="popthis">' + timediff( ivs.max.ifo.GAME_TIMESTAMP*1000, new Date().getTime() ) + ' ago by ' + ivs.max.ifo.PLAYER + ' </div>'  );
			*/
			//
			for( var i in _pw ) { pw.push( { label: i, value: _pw[i] } ); }
			for( var i in _ps ) { ps.push( { label: i, value: _ps[i] } ); }
			for( var i in _vw ) { vw.push( { label: i, value: _vw[i] } ); }
			for( var i in _vs ) { vs.push( { label: i, value: _vs[i] } ); }
			Morris.Donut( {
				element: 'pw',
				data: pw.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/data.data.maps.length*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'ps',
				data: ps.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/data.data.maps.length*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'vw',
				data: vw.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/data.data.maps.length*100 ).toFixed(1) + '%)'; },
			} );
			Morris.Donut( {
				element: 'vs',
				data: vs.sort( function( a, b ) { return b.value - a.value } ),
				formatter: function( y ) { return y + ' (' + ( y/data.data.maps.length*100 ).toFixed(1) + '%)'; },
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
				table: dynatable_table,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					records: data.data.maps
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function RaceMapCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var w = parseHashParams()['weapons'] || 'on';
	var r = parseHashParams()['ruleset'] || 'pql';
	var m = params['map'];
	// map name
	$( '#map_name' ).append( '<a data-placement="bottom" class="map-popup" href="#/race/maps/'+ m +'">' + m + '</a>' );
	// set active tab button
	$( '#btn_ruleset_' + r ).addClass( 'active' );
	$( '#btn_weapons_' + w ).addClass( 'active' );
	// set button urls
	_url = {};
	_url.weapons = w;
	console.warn( mkURL( _url ) );
	$( '#btn_ruleset_pql' ).attr( 'href', '#/race/maps/' + m + '?' + mkURL( _url ) + '&ruleset=pql' );
	$( '#btn_ruleset_vql' ).attr( 'href', '#/race/maps/' + m + '?' + mkURL( _url ) + '&ruleset=vql' );
	delete _url.weapons;
	_url.ruleset = r;
	console.warn( mkURL( _url ) );
	$( '#btn_weapons_on' ).attr( 'href', '#/race/maps/' + m + '?' + mkURL( _url ) + '&weapons=on' );
	$( '#btn_weapons_off' ).attr( 'href', '#/race/maps/' + m + '?' + mkURL( _url ) + '&weapons=off' );
	$( '#race_maps' ).bind( 'dynatable:init', function( e, dynatable ) {
		dynatable.sorts.add( 'RANK', 1 );
	} );
	$.ajax( {
		url: getApiURL() + 'api/race/maps/' + m,
		dataType: getAjaxDataType(),
		data: {
			weapons: w,
			ruleset: r,
		},
		success: function( data ) {
			// dynatable
			$( '#race_maps' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: true,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 20,
					records: data.data.scores
				}
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function RacePlayerCtrl( params ) {
	onLoading();
	setNavbarActive();
  $( '#current_url' ).html(printLocations());
  var p = params['player'];
	var w = parseHashParams()['weapons'] || 'on';
	var r = parseHashParams()['ruleset'] || 'pql';
	// set player link
	$( '#player_link' ).html( p );
	$( '#player_link' ).attr( 'href', '#/race/player/' + p );
	// set active tab button
	$( '#btn_ruleset_' + r ).addClass( 'active' );
	$( '#btn_weapons_' + w ).addClass( 'active' );
	// set button urls
	_url = {};
	_url.weapons = w;
	console.warn( mkURL( _url ) );
	$( '#btn_ruleset_pql' ).attr( 'href', '#/race/players/' + p + '?' + mkURL( _url ) + '&ruleset=pql' );
	$( '#btn_ruleset_vql' ).attr( 'href', '#/race/players/' + p + '?' + mkURL( _url ) + '&ruleset=vql' );
	delete _url.weapons;
	_url.ruleset = r;
	console.warn( mkURL( _url ) );
	$( '#btn_weapons_on' ).attr( 'href', '#/race/players/' + p + '?' + mkURL( _url ) + '&weapons=on' );
	$( '#btn_weapons_off' ).attr( 'href', '#/race/players/' + p + '?' + mkURL( _url ) + '&weapons=off' );
	$.ajax( {
		url: getApiURL() + 'api/race/players/' + p,
		dataType: getAjaxDataType(),
		data: {
			weapons: w,
			ruleset: r,
		},
		success: function( data ) {
			// page stuff
			_r = data.data.ruleset;
			_w = data.data.weapons;
			$( '#pql' ).attr( 'href', $( '#pql' ).attr( 'href' ) + '?ruleset=pql&weapons=' + _w );
			$( '#vql' ).attr( 'href', $( '#vql' ).attr( 'href' ) + '?ruleset=vql&weapons=' + _w );
			$( '#won' ).attr( 'href', $( '#won' ).attr( 'href' ) + '?ruleset=' + _r + '&weapons=on' );
			$( '#woff' ).attr( 'href', $( '#woff' ).attr( 'href' ) + '?ruleset=' + _r + '&weapons=off' );
			if( _r == 'pql' ) {
				$( '.vql' ).removeClass( 'active' );
				$( '.pql' ).addClass( 'active' );
			}
			else {
				$( '.pql' ).removeClass( 'active' );
				$( '.vql' ).addClass( 'active' );
			}
			if( _w == 'on' ) {
				$( '.woff' ).removeClass( 'active' );
				$( '.won' ).addClass( 'active' );
			}
			else {
				$( '.won' ).removeClass( 'active' );
				$( '.woff' ).addClass( 'active' );
			}
			//$( '#weapons' ).html( data.data.weapons.toUpperCase() );
			//$( '#ruleset' ).html( data.data.ruleset.toUpperCase() );
			// morris
			var avgRank = 0;
			var gold = 0;
			var silver = 0;
			var bronze = 0;
			for( var i in data.data.scores ) {
				d = data.data.scores[i];
				avgRank = avgRank + d.RANK;
				if( d.RANK == 1 ) { gold++; }
				if( d.RANK == 2 ) { silver++; }
				if( d.RANK == 3 ) { bronze++; }
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
			Morris.Donut( {
				element: 'medals',
				data: [
					{ label: 'Gold', value: gold },
					{ label: 'Silver', value: silver },
					{ label: 'Bronze', value: bronze },
				],
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function TopCtrl( params ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: getApiURL() + 'api/top/last30days/kills',
		dataType: getAjaxDataType(),
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
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function ActivityCtrl( params, context ) {
	onLoading();
	setNavbarActive();
	$( '#current_url' ).html( printLocations() );
	var activeTab = parseHashParams()['tab'] || 'week';
	context.log( 'activeTab', activeTab );
	$( '#tab_btn_' + activeTab ).addClass( 'active' );
	// set urls
	$( '#tab_btn_week' ).attr( 'href', '#/' + parseHash().join( '/' ) + '?tab=week' );
	$( '#tab_btn_month' ).attr( 'href', '#/' + parseHash().join( '/' ) + '?tab=month' );
	var matchesData = [];
	var playersData = [];
	var _gametypes = [ 'duel', 'ffa', 'ca', 'tdm', 'ctf', 'dom', 'ft', 'race', 'rr', 'ad', 'harv' ];
	$.ajax( {
		url: getApiURL() + 'api/' + parseHash().join( '/' ) + '/' + activeTab + '/matches',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// matches
			for( var i in data.data ) {
				d = data.data[i];
				if( activeTab == 'week' ) {
					_date = d.year + '-' + d.month + '-' + d.day + ' ' + d.hour + ':00';
				}
				else if( activeTab == 'month' ) {
					_date = d.year + '-' + d.month + '-' + d.day;
				}
				d.date = _date;
				matchesData.push( d );
			}
			// matches
			new Morris.Line( {
				element: 'activity_matches',
				data: matchesData,
				pointSize: 2,
				xkey: 'date',
				ykeys: ['total'],
				labels: ['Matches played'],
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					out.push( '<div class="morris-hover-point" style="color: #0b62a4">' );
					out.push( 'Matches played: ' + row.total );
					out.push( '</div>' );
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
			// matches/gametype
			new Morris.Line( {
				element: 'chart3',
				data: matchesData,
				lineWidth: 1,
				pointSize: 2,
				xkey: 'date',
				ykeys: _gametypes,
				labels: _gametypes,
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					//
					out.push( '<div class="morris-hover-point" style="color: #000">' );
					out.push( 'Total matches played: ' + row.total );
					out.push( '</div>' );
					k = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						out.push( '<div class="morris-hover-point" style="color: ' + this.lineColors[k%this.lineColors.length] + '">' );
						out.push( i + ': ' + thousandSeparator( row[i] ) + '  (' + ( row[i]/row.total*100 ).toFixed(1) + '%)' );
						out.push( '</div>' );
						k++;
					}
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
			// matches/ruleset
			new Morris.Line( {
				element: 'chart4',
				data: matchesData,
				pointSize: 2,
				xkey: 'date',
				ykeys: [ 'ql', 'classic', 'turbo' ],
				labels: [ 'ql', 'classic', 'turbo' ],
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					//
					_tot = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						_tot += row[i];
					}
					out.push( '<div class="morris-hover-point" style="color: #000">' );
					out.push( 'Total unique players: ' + row.total + ' ' );
					out.push( '</div>' );
					k = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						out.push( '<div class="morris-hover-point" style="color: ' + this.lineColors[k%this.lineColors.length] + '">' );
						out.push( i + ': ' + row[i] + '  (' + ( row[i]/row.total*100 ).toFixed(1) + '%)' );
						out.push( '</div>' );
						k++;
					}
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
			// premium/standard ranked/unranked
			new Morris.Line( {
				element: 'chart5',
				data: matchesData,
				pointSize: 2,
				xkey: 'date',
				ykeys: [ 'premium', 'standard', 'ranked', 'unranked' ],
				labels: [ 'premium', 'standard', 'ranked', 'unranked' ],
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					//
					_tot = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						_tot += row[i];
					}
					out.push( '<div class="morris-hover-point" style="color: #000">' );
					out.push( 'Total unique players: ' + row.total + ' ' );
					out.push( '</div>' );
					k = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						out.push( '<div class="morris-hover-point" style="color: ' + this.lineColors[k%this.lineColors.length] + '">' );
						out.push( i + ': ' + row[i] + '  (' + ( row[i]/row.total*100 ).toFixed(1) + '%)' );
						out.push( '</div>' );
						k++;
					}
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
	$.ajax( {
		url: getApiURL() + 'api/' + parseHash().join( '/' ) + '/' + activeTab + '/players',
		dataType: getAjaxDataType(),
		success: function( data ) {
			// matches
			for( var i in data.data ) {
				d = data.data[i];
				if( activeTab == 'week' ) {
					_date = d.year + '-' + d.month + '-' + d.day + ' ' + d.hour + ':00';
				}
				else if( activeTab == 'month' ) {
					_date = d.year + '-' + d.month + '-' + d.day;
				}
				d.date = _date;
				playersData.push( d );
			}
			// unique players
			new Morris.Line( {
				element: 'chart2',
				data: playersData,
				pointSize: 2,
				xkey: 'date',
				ykeys: [ 'total' ],
				labels: [ 'Unique players' ],
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					out.push( '<div class="morris-hover-point" style="color: #0b62a4">' );
					out.push( 'Unique players: ' + row.total );
					out.push( '</div>' );
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
			// unique players/gamemodes
			new Morris.Line( {
				element: 'chart6',
				lineWidth: 1,
				data: playersData,
				pointSize: 2,
				xkey: 'date',
				ykeys: _gametypes,
				labels: _gametypes,
				hideHover: 'auto',
				hoverCallback: function( index, options, content, row ) {
					out = [];
					out.push( '<div class="morris-hover-row-label">' );
					out.push( row.date );
					out.push( '</div>' );
					//
					_tot = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						_tot += row[i];
					}
					out.push( '<div class="morris-hover-point" style="color: #000">' );
					out.push( 'Total unique players: ' + row.total + ' ' );
					out.push( '</div>' );
					k = 0;
					for( var j in this.ykeys ) {
						i = this.ykeys[j];
						out.push( '<div class="morris-hover-point" style="color: ' + this.lineColors[k%this.lineColors.length] + '">' );
						out.push( i + ': ' + thousandSeparator( row[i] ) + '  (' + ( row[i]/_tot*100 ).toFixed(1) + '%)' );
						out.push( '</div>' );
						k++;
					}
					return out.join( '' );;
				},
					//events: [ '2014-09-17 21:00' ],
					//eventLabels: [ 'Steam release' ],
			} );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}

function parseHash() {
	var url_params = location.hash.substring(2).split( '/' );
	for( var i in url_params ) {
		url = url_params[i];
		url_params[i] = url.split( '?' )[0];
	}
	return url_params;
}
function parseHashParams() {
	var url_params = location.hash.substring(2).split( '?' );
	if( url_params.length > 1 ) {
		url_params = url_params[1].split( '&');
		var url_p = {};
		for( var i in url_params ) { url_p[url_params[i].split( '=' )[0]] = url_params[i].split( '=' )[1] };
		return url_p;
	}
	else {
		return {};
	}
}
function printLocations() {
	var out = "";
	var h = parseHash();
	var url = "";
	for( var i in h ) {
		url += '/' + h[i];
		out += '<span class=""> / </span>';
		out += '<a class="btn btn-xs btn-default" href="#'+ url +'">'+ h[i] +'</a> ';
	}
	return out;
}
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
function submitGameTag( tagId, game ) {
	console.log( 'submitGameTag ' + tagId );
	$.ajax( {
		url: getApiURL() + 'api/games/' + game + '/tags?password=' + $( '#admin_password' ).val(),
		dataType: getAjaxDataType(),
		data: { tag: tagId },
		type: 'POST',
		success: function( data ) {
			console.log( data );
			$( '#message' ).append( '<p class="alert alert-success">Added tag.</p>' );
		},
		error: function( data ) {
		},
		complete: function( data ) {
			onComplete( data );
		},
	} );
}
function onLoading() {
	console.log( 'onLoading()' );
	console.log( 'parseHash()' );
	console.log( parseHash() );
	console.log( 'parseHashParams()' );
	console.log( parseHashParams() );
	console.log( 'clearing footer' );
	$( '#footer' ).empty();
	//$( '#loading' ).addClass( 'loading' );
	ga( 'send', 'pageview', { page: '/#/' + parseHash().join( '/' ) + '?' + mkURL( parseHashParams() ) } );
	//ga( 'send', 'event', 'tab4', 'clicked' );
}
function onComplete( d ) {
	console.log( 'onComplete()' );
	if( typeof d != 'undefined' && 'responseJSON' in d ) {
		console.log( 'data' );
		console.log( d.responseJSON );
	}
	// error
	if( typeof d != 'undefined' && 'responseJSON' in d && 'error' in d.responseJSON && d.responseJSON.error !== null ) {
		console.log( d );
		txt = [];
		txt.push( '<div class="alert alert-danger">' );
		txt.push( '<span class="glyphicon glyphicon-warning-sign"></span>' );
		txt.push( d.responseJSON.error );
		txt.push( '<span class="btn pull-right" onclick="$(this).parent().remove();">x</span>' );
		txt.push( '</div>' );
		txt.push( '' );
		$( '#message' ).append( txt.join( ' ' ) );
	}
	// msg
	if( typeof d != 'undefined' && 'responseJSON' in d && 'msg' in d.responseJSON ) {
		txt = [];
		txt.push( '<div class="alert alert-info">' );
		txt.push( '<span class="glyphicon glyphicon-info-sign"></span>' );
		txt.push( d.responseJSON.msg );
		txt.push( '<span class="btn pull-right" onclick="$(this).parent().remove();">x</span>' );
		txt.push( '</div>' );
		txt.push( '' );
		$( '#message' ).append( txt.join( ' ' ) );
	}
	// footer
	if( typeof d != 'undefined' && 'responseJSON' in d ) {
		if( 'ms' in d.responseJSON ) {
			$( '#footer' ).append( '<p><small class="text-muted">' + d.responseJSON.ms + '</small></p>' );
		}
		if( 'updated' in d.responseJSON ) {
			out = [];
			out.push( '<p>' );
			out.push( '<small class="text-muted">' );
			out.push( d.responseJSON.route  );
			out.push( ' last updated: ' );
			//out.push( d.responseJSON.updated_nice  );
			out.push( '' + timediff( d.responseJSON.updated, new Date().getTime() ) + ' ago ' );
			out.push( '</small>' );
			out.push( '</p>' );
			$( '#footer' ).append( out.join( '' ) );
		}
	}
	$( '#loading' ).removeClass( 'loading' );
	// show admin stuff
	if( $( '#admin_password' ).val().length > 0 ) {
		$( '.admin' ).show();
	}
}
function setNavbarActive() {
	$( 'ul.navbar-nav' ).children().removeClass( 'active' );
	$( 'ul.dropdown-menu' ).children().removeClass( 'active' );
	console.log( parseHash() );
	if( parseHash()[0] == "" ) {
		$( '#overview' ).parent().addClass( 'active' );
	}
	else {
		$( '#' + parseHash()[0] ).parent().addClass( 'active' );
	}
}
function getCountry( c ) {
	for( var i in Countries ) {
		if( Countries[i].cca2 == c.toUpperCase() ) {
			return Countries[i];
		}
	}
	return {};
}
function thousandSeparator( num ) {
	return num.toString().replace( /\B(?=(\d{3})+(?!\d))/g, "," );
}
function Weaponsz( self ) {
	// buttons
	self.parent().children().removeClass( 'active' );
	item = self.html();
	self.addClass( 'active' );
	// columns
	weaps = [ '.wKills', '.wShots', '.wHits', '.wAccuracy' ];
	for( var i in weaps ) {
		$( weaps[i] ).hide();
	}
	$( '.w' + item ).show();
}
function mkPlayerButton( obj, nickProperty, countryProperty ) {
	countryBtn = mkCountryButton( obj[countryProperty] );
	nickname = obj[nickProperty];
	if( nickname == '' )
		return '';
	var out = [];
	out.push( '<div class="btn-group btn-group-xs">' );
	out.push( countryBtn );
	out.push( '<a class="btn btn-default" href="#/players/'+ nickname +'">' + nickname + '</a>' );
	out.push( '<div class="btn-group btn-group-xs">' );
	out.push( '<a class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></a>' );
	out.push( '<ul class="dropdown-menu" >' );
	out.push( '<li><a href="#/players/' + nickname + '">Player profile</a></li>' );
	out.push( '<li><a href="#/race/players/' + nickname + '">Race profile</a></li>' );
	out.push( '<li><a href="#/owners/' + nickname + '">Owner profile</a></li></ul></div></a></div>' );
	if( nickProperty == 'PLAYER' ) {
		out.push( mkPlayerClanLink( obj ) );
	}
	out.push( '</div>' );
	return out.join( '' );
}
function mkCountryButton( c ) {
	if( c !== null && typeof c != 'undefined' && c != '' ) {
		var country = '';
		var countrylink = [];
		var countryobj = getCountry( c );
		country = c.toLowerCase();
		countrylink.push( '<div class="btn btn-default playerflag popthis" data-html="true" data-placement="left" data-container="body" data-content="' + countryobj.name + '" >' );
		countrylink.push( '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ country +'_v2013071601.0.gif" alt="'+ country.toUpperCase() +'" />' );
		countrylink.push( '</div>' );
		return countrylink.join( '' );
	}
	return '';
}
function mkPlayerClanLink( obj ) {
	var clan = '';
	var clanlink = '';
	if( 'CLAN_ID' in obj && obj.CLAN_ID !== null && obj.CLAN_ID != '' ) { clan = obj.CLAN; clanlink = '<small class="pull-right"><a href="#/clans/'+ obj.CLAN_ID +'">'+ obj.CLAN +'</a></small>'; }
	return clanlink;
}
function mkGameType( obj ) {
	var ranked = '';
	var ruleset = '';
	var premium = '';
	var gt = '';
	if( obj.GAME_TYPE == 'harv' ) { gt = 'harvester'; }
	else { gt = obj.GAME_TYPE.toLowerCase(); }
	if( 'RANKED' in obj && 'RULESET' in obj && 'PREMIUM' in obj ) {
		ranked = '<div class="btn btn-xs btn-danger popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Unranked match">U</div>';
		ruleset = '<a class="btn btn-xs btn-info popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Classic Ruleset" href="#/rulesets/' + obj.RULESET + '">C</a>';
		premium = '<div class="btn btn-xs btn-info popthis" data-container="body" data-html="true" data-placement="right" data-content="Standard server">S</div>';
		if( obj.RANKED == 1 ) { ranked = '<div class="btn btn-xs btn-success popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Ranked match">R</div>'; }
		if( obj.RULESET == 2 ) { ruleset = '<a class="btn btn-xs btn-danger popthis" data-container="body" data-html="true" data-placement="bottom" data-content="Turbo Ruleset" href="#/rulesets/' + obj.RULESET + '">T</a>'; }
		if( obj.RULESET == 3 ) { ruleset = '<a class="btn btn-xs btn-success popthis" data-container="body" data-html="true" data-placement="bottom" data-content="QL Ruleset" href="#/rulesets/' + obj.RULESET + '">Q</a>'; }
		if( obj.PREMIUM == 1 ) { premium = '<div class="btn btn-xs btn-success popthis" data-container="body" data-html="true" data-placement="right" data-content="Premium server">P</div>'; }
	}
	else {
	}
	var _ranked = '';
	var _ruleset = '';
	var _premium = '';
	if( 'RANKED' in obj && 'RULESET' in obj && 'PREMIUM' in obj ) {
		_ranked = 'UNRANKED';
		_ruleset = 'CLASSIC';
		_premium = 'STANDARD';
		if( obj.RANKED == 1 ) { _ranked = 'RANKED'; }
		if( obj.RULESET == 2 ) { _ruleset = 'TURBO'; }
		else if( obj.RULESET == 3 ) { _ruleset = 'QL'; }
		if( obj.PREMIUM == 1 ) { _premium = 'PREMIUM'; }
	}
	var gt = '';
	if( obj.GAME_TYPE == 'harv' ) { gt = 'harvester'; }
	else { gt = obj.GAME_TYPE.toLowerCase(); }
	return '<div class="btn-group btn-group-xs"><div class="popthis btn btn-default" data-html="true" data-container="body" data-placement="left" data-content="' + GT[gt] + '" > <a title="' + gt + '" href="#/gametypes/' + obj.GAME_TYPE.toLowerCase() + '"><img src="http://cdn.quakelive.com/web/2014051402/images/gametypes/xsm/' + gt + '_v2014051402.0.png" title="' + gt + '" /> ' + '</a></div>' + ruleset + ranked + premium + '</div>';
}
function adminSettings() {
	$( '#admin_settings' ).slideToggle();
	ga( 'send', {
		'hitType': 'event',
		'eventCategory': 'button',
		'eventAction': 'click',
		'eventLabel': 'admin button',
	} );
}
function mkURL( obj ) {
	params = [];
	for( var i in obj ) {
		params.push(  i + '=' + obj[i] );
	}
	return params.join( '&' );
}

