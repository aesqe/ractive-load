import Ractive from 'ractive';

var get;

// Test for XHR to see if we're in a browser...
if ( typeof XMLHttpRequest !== 'undefined' ) {
	get = function ( url ) {
		return new Promise( function ( resolve, reject ) {
			var xhr, onload, loaded;

			xhr = new XMLHttpRequest();
			xhr.open( 'GET', url );

			onload = function () {
				if ( ( xhr.readyState !== 4 ) || loaded ) {
					return;
				}

				resolve( xhr.responseText );
				loaded = true;
			};

			xhr.onload = xhr.onreadystatechange = onload;
			xhr.onerror = reject;
			xhr.send();

			if ( xhr.readyState === 4 ) {
				onload();
			}
		});
	};
}

// ...or in node.js
else {
	get = function ( url ) {
		return new Promise( function ( resolve, reject ) {
			require( 'fs' ).readFile( url, function ( err, result ) {
				if ( err ) {
					return reject( err );
				}

				resolve( result.toString() );
			});
		});
	};
}

export default get;
