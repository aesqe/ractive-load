import Ractive from 'ractive';

var charToInteger = {};
var integerToChar = {};

'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split( '' ).forEach( function ( char, i ) {
	charToInteger[ char ] = i;
	integerToChar[ i ] = char;
});

function encode ( value ) {
	var result, i;

	if ( typeof value === 'number' ) {
		result = encodeInteger( value );
	} else {
		result = '';
		for ( i = 0; i < value.length; i += 1 ) {
			result += encodeInteger( value[i] );
		}
	}

	return result;
}

function encodeInteger ( num ) {
	var result = '', clamped;

	if ( num < 0 ) {
		num = ( -num << 1 ) | 1;
	} else {
		num <<= 1;
	}

	do {
		clamped = num & 31;
		num >>= 5;

		if ( num > 0 ) {
			clamped |= 32;
		}

		result += integerToChar[ clamped ];
	} while ( num > 0 );

	return result;
}

/**
 * Encodes a string as base64
 * @param {string} str - the string to encode
 * @returns {string}
 */
function btoa$1 ( str ) {
	return new Buffer( str ).toString( 'base64' );
}

function SourceMap ( properties ) {
	this.version = 3;

	this.file           = properties.file;
	this.sources        = properties.sources;
	this.sourcesContent = properties.sourcesContent;
	this.names          = properties.names;
	this.mappings       = properties.mappings;
}

SourceMap.prototype = {
	toString: function toString () {
		return JSON.stringify( this );
	},

	toUrl: function toUrl () {
		return 'data:application/json;charset=utf-8;base64,' + btoa$1( this.toString() );
	}
};

var alreadyWarned = false;

/**
 * Generates a v3 sourcemap between an original source and its built form
 * @param {object} definition - the result of `rcu.parse( originalSource )`
 * @param {object} options
 * @param {string} options.source - the name of the original source file
 * @param {number=} options.offset - the number of lines in the generated
   code that precede the script portion of the original source
 * @param {string=} options.file - the name of the generated file
 * @returns {object}
 */
function generateSourceMap ( definition, options ) {
	if ( options === void 0 ) options = {};

	if ( 'padding' in options ) {
		options.offset = options.padding;

		if ( !alreadyWarned ) {
			console.warn( 'rcu: options.padding is deprecated, use options.offset instead' ); // eslint-disable-line no-console
			alreadyWarned = true;
		}
	}

	var mappings = '';

	if ( definition.scriptStart ) {
		// The generated code probably includes a load of module gubbins - we don't bother
		// mapping that to anything, instead we just have a bunch of empty lines
		var offset = new Array( ( options.offset || 0 ) + 1 ).join( ';' );
		var lines = definition.script.split( '\n' );

		var encoded;

		if ( options.hires !== false ) {
			var previousLineEnd = -definition.scriptStart.column;

			encoded = lines.map( function ( line, i ) {
				var lineOffset = i === 0 ? definition.scriptStart.line : 1;

				var encoded = encode([ 0, 0, lineOffset, -previousLineEnd ]);

				var lineEnd = line.length;

				for ( var j = 1; j < lineEnd; j += 1 ) {
					encoded += ',CAAC';
				}

				previousLineEnd = i === 0 ?
					lineEnd + definition.scriptStart.column :
					Math.max( 0, lineEnd - 1 );

				return encoded;
			});
		} else {
			encoded = lines.map( function ( line, i ) {
				if ( i === 0 ) {
					// first mapping points to code immediately following opening <script> tag
					return encode([ 0, 0, definition.scriptStart.line, definition.scriptStart.column ]);
				}

				if ( i === 1 ) {
					return encode([ 0, 0, 1, -definition.scriptStart.column ]);
				}

				return 'AACA'; // equates to [ 0, 0, 1, 0 ];
			});
		}

		mappings = offset + encoded.join( ';' );
	}

	return new SourceMap({
		file: options.file || null,
		sources: [ options.source || null ],
		sourcesContent: [ definition.source ],
		names: [],
		mappings: mappings
	});
}

function getName ( path ) {
	var pathParts = path.split( '/' );
	var filename = pathParts.pop();

	var lastIndex = filename.lastIndexOf( '.' );
	if ( lastIndex !== -1 ) filename = filename.substr( 0, lastIndex );

	return filename;
}

var Ractive$1;

function init ( copy ) {
	Ractive$1 = copy;
}

var _eval;
var isBrowser;
var isNode;
var head;
var Module;
var base64Encode;
var SOURCE_MAPPING_URL = 'sourceMappingUrl';
var DATA = 'data';

// This causes code to be eval'd in the global scope
_eval = eval;

if ( typeof document !== 'undefined' ) {
	isBrowser = true;
	head = document.getElementsByTagName( 'head' )[0];
} else if ( typeof process !== 'undefined' ) {
	isNode = true;
	Module = ( require.nodeRequire || require )( 'module' );
}

if ( typeof btoa === 'function' ) {
	base64Encode = function ( str ) {
		str = str.replace( /[^\x00-\x7F]/g, function ( char ) {
			var hex = char.charCodeAt( 0 ).toString( 16 );
			while ( hex.length < 4 ) hex = '0' + hex;

			return '\\u' + hex;
		});

		return btoa( str );
	};
} else if ( typeof Buffer === 'function' ) {
	base64Encode = function ( str ) {
		return new Buffer( str, 'utf-8' ).toString( 'base64' );
	};
} else {
	base64Encode = function () {};
}

function eval2 ( script, options ) {
	options = options || {};

	if ( options.sourceMap ) {
		script += '\n//# ' + SOURCE_MAPPING_URL + '=data:application/json;charset=utf-8;base64,' + base64Encode( JSON.stringify( options.sourceMap ) );
	}

	else if ( options.sourceURL ) {
		script += '\n//# sourceURL=' + options.sourceURL;
	}

	try {
		return _eval( script );
	} catch ( err ) {
		if ( isNode ) {
			locateErrorUsingModule( script, options.sourceURL || '' );
			return;
		}

		// In browsers, only locate syntax errors. Other errors can
		// be located via the console in the normal fashion
		else if ( isBrowser && err.name === 'SyntaxError' ) {
			locateErrorUsingDataUri( script );
		}

		throw err;
	}
}

eval2.Function = function () {
	var arguments$1 = arguments;

	var i, args = [], body, wrapped, options;

	i = arguments.length;
	while ( i-- ) {
		args[i] = arguments$1[i];
	}

	if ( typeof args[ args.length - 1 ] === 'object' ) {
		options = args.pop();
	} else {
		options = {};
	}

	// allow an array of arguments to be passed
	if ( args.length === 1 && Object.prototype.toString.call( args ) === '[object Array]' ) {
		args = args[0];
	}

	if ( options.sourceMap ) {
		options.sourceMap = clone( options.sourceMap );

		// shift everything a line down, to accommodate `(function (...) {`
		options.sourceMap.mappings = ';' + options.sourceMap.mappings;
	}


	body = args.pop();
	wrapped = '(function (' + args.join( ', ' ) + ') {\n' + body + '\n})';

	return eval2( wrapped, options );
};

function locateErrorUsingDataUri ( code ) {
	var dataURI, scriptElement;

	dataURI = DATA + ':text/javascript;charset=utf-8,' + encodeURIComponent( code );

	scriptElement = document.createElement( 'script' );
	scriptElement.src = dataURI;

	scriptElement.onload = function () {
		head.removeChild( scriptElement );
	};

	head.appendChild( scriptElement );
}

function locateErrorUsingModule ( code, url ) {
	var m = new Module();

	try {
		m._compile( 'module.exports = function () {\n' + code + '\n};', url );
	} catch ( err ) {
		console.error( err );
		return;
	}

	m.exports();
}

function clone ( obj ) {
	var cloned = {}, key;

	for ( key in obj ) {
		if ( obj.hasOwnProperty( key ) ) {
			cloned[ key ] = obj[ key ];
		}
	}

	return cloned;
}

function getLocation ( source, charIndex ) {
	var lines = source.split( '\n' );
	var len = lines.length;

	for ( var i = 0, lineStart = 0; i < len; i += 1 ) {
		var line = lines[i];
		var lineEnd =  lineStart + line.length + 1; // +1 for newline

		if ( lineEnd > charIndex ) {
			return { line: i + 1, column: charIndex - lineStart };
		}

		lineStart = lineEnd;
	}

	throw new Error( ("Could not determine location of character " + charIndex) );
}

var keywords = /(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
var punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
var ambiguous = /(\}|\)|\+\+|--)\s*$/;

function find ( str ) {
	var quote;
	var escapedFrom;
	var regexEnabled = true;
	var pfixOp = false;
	var stack = [];

	var start;
	var found = [];
	var state = base;

	function base ( char, i ) {
		if ( char === '/' ) {
			// could be start of regex literal OR division punctuator. Solution via
			// http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110
			var substr = str.substr( 0, i );
			if ( keywords.test( substr ) || punctuators.test( substr ) ) regexEnabled = true;
			else if ( ambiguous.test( substr ) && !tokenClosesExpression( substr, found ) ) regexEnabled = true; // TODO save this determination for when it's necessary?
			else regexEnabled = false;

			return start = i, slash;
		}

		if ( char === '"' || char === "'" ) return start = i, quote = char, string;
		if ( char === '`' ) return start = i, templateString;

		if ( char === '{' ) return stack.push( base ), base;
		if ( char === '}' ) return start = i, stack.pop();

		if ( !( pfixOp && /\W/.test( char ) ) ) {
			pfixOp = ( char === '+' && str[ i - 1 ] === '+' ) || ( char === '-' && str[ i - 1 ] === '-' );
		}

		return base;
	}

	function slash ( char ) {
		if ( char === '/' ) return lineComment;
		if ( char === '*' ) return blockComment;
		if ( char === '[' ) return regexEnabled ? regexCharacter : base;
		return regexEnabled && !pfixOp ? regex : base;
	}

	function regex ( char, i ) {
		if ( char === '[' ) return regexCharacter;
		if ( char === '\\' ) return escapedFrom = regex, escaped;

		if ( char === '/' ) {
			var end = i + 1;
			var outer = str.slice( start, end );
			var inner = outer.slice( 1, -1 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'regex' });

			return base;
		}

		return regex;
	}

	function regexCharacter ( char ) {
		if ( char === ']' ) return regex;
		if ( char === '\\' ) return escapedFrom = regexCharacter, escaped;
		return regexCharacter;
	}

	function string ( char, i ) {
		if ( char === '\\' ) return escapedFrom = string, escaped;
		if ( char === quote ) {
			var end = i + 1;
			var outer = str.slice( start, end );
			var inner = outer.slice( 1, -1 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'string' });

			return base;
		}

		return string;
	}

	function escaped () {
		return escapedFrom;
	}

	function templateString ( char, i ) {
		if ( char === '$' ) return templateStringDollar;
		if ( char === '\\' ) return escapedFrom = templateString, escaped;

		if ( char === '`' ) {
			var end = i + 1;
			var outer = str.slice( start, end );
			var inner = outer.slice( 1, -1 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'templateEnd' });

			return base;
		}

		return templateString;
	}

	function templateStringDollar ( char, i ) {
		if ( char === '{' ) {
			var end = i + 1;
			var outer = str.slice( start, end );
			var inner = outer.slice( 1, -2 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'templateChunk' });

			stack.push( templateString );
			return base;
		}
		return templateString( char, i );
	}

	function lineComment ( char, end ) {
		if ( char === '\n' ) {
			var outer = str.slice( start, end );
			var inner = outer.slice( 2 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'line' });

			return base;
		}

		return lineComment;
	}

	function blockComment ( char ) {
		if ( char === '*' ) return blockCommentEnding;
		return blockComment;
	}

	function blockCommentEnding ( char, i ) {
		if ( char === '/' ) {
			var end = i + 1;
			var outer = str.slice( start, end );
			var inner = outer.slice( 2, -2 );

			found.push({ start: start, end: end, inner: inner, outer: outer, type: 'block' });

			return base;
		}

		return blockComment( char );
	}

	for ( var i = 0; i < str.length; i += 1 ) {
		if ( !state ) {
			var ref = getLocation( str, i ), line = ref.line, column = ref.column;
			var before = str.slice( 0, i );
			var beforeLine = /(^|\n).+$/.exec( before )[0];
			var after = str.slice( i );
			var afterLine = /.+(\n|$)/.exec( after )[0];

			var snippet = "" + beforeLine + afterLine + "\n" + (Array( beforeLine.length + 1 ).join( ' ' )) + "^";

			throw new Error( ("Unexpected character (" + line + ":" + column + "). If this is valid JavaScript, it's probably a bug in tippex. Please raise an issue at https://github.com/Rich-Harris/tippex/issues – thanks!\n\n" + snippet) );
		}

		state = state( str[i], i );
	}

	return found;
}

function tokenClosesExpression ( substr, found ) {
	substr = _erase( substr, found );

	var token = ambiguous.exec( substr );
	if ( token ) token = token[1];

	if ( token === ')' ) {
		var count = 0;
		var i = substr.length;
		while ( i-- ) {
			if ( substr[i] === ')' ) {
				count += 1;
			}

			if ( substr[i] === '(' ) {
				count -= 1;
				if ( count === 0 ) {
					i -= 1;
					break;
				}
			}
		}

		// if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
		while ( /\s/.test( substr[i - 1] ) ) i -= 1;
		if ( substr.slice( i - 2, i ) === 'if' || substr.slice( i - 5, i ) === 'while' ) return false;
	}

	// TODO handle }, ++ and -- tokens immediately followed by / character
	return true;
}

function spaces ( count ) {
	var spaces = '';
	while ( count-- ) spaces += ' ';
	return spaces;
}

var erasers = {
	string: function ( chunk ) { return chunk.outer[0] + spaces( chunk.inner.length ) + chunk.outer[0]; },
	line: function ( chunk ) { return spaces( chunk.outer.length ); },
	block: function ( chunk ) { return chunk.outer.split( '\n' ).map( function ( line ) { return spaces( line.length ); } ).join( '\n' ); },
	regex: function ( chunk ) { return '/' + spaces( chunk.inner.length ) + '/'; },
	templateChunk: function ( chunk ) { return chunk.outer[0] + spaces( chunk.inner.length ) + '${'; },
	templateEnd: function ( chunk ) { return chunk.outer[0] + spaces( chunk.inner.length ) + '`'; }
};

function _erase ( str, found ) {
	var erased = '';
	var charIndex = 0;

	for ( var i = 0; i < found.length; i += 1 ) {
		var chunk = found[i];
		erased += str.slice( charIndex, chunk.start );
		erased += erasers[ chunk.type ]( chunk );

		charIndex = chunk.end;
	}

	erased += str.slice( charIndex );
	return erased;
}

function makeGlobalRegExp ( original ) {
	var flags = 'g';

	if ( original.multiline ) flags += 'm';
	if ( original.ignoreCase ) flags += 'i';
	if ( original.sticky ) flags += 'y';
	if ( original.unicode ) flags += 'u';

	return new RegExp( original.source, flags );
}

function match ( str, pattern, callback ) {
	var g = pattern.global;
	if ( !g ) pattern = makeGlobalRegExp( pattern );

	var found = find( str );

	var match;
	var chunkIndex = 0;

	while ( match = pattern.exec( str ) ) {
		var chunk;

		do {
			chunk = found[ chunkIndex ];

			if ( chunk && chunk.end < match.index ) {
				chunkIndex += 1;
			} else {
				break;
			}
		} while ( chunk );

		if ( !chunk || chunk.start > match.index ) {
			var args = [].slice.call( match ).concat( match.index, str );
			callback.apply( null, args );
			if ( !g ) break;
		}
	}
}

/**
 * Finds the line and column position of character `char`
   in a (presumably) multi-line string
 * @param {array} lines - an array of strings, each representing
   a line of the original string
 * @param {number} char - the character index to convert
 * @returns {object}
     * @property {number} line - the zero-based line index
     * @property {number} column - the zero-based column index
     * @property {number} char - the character index that was passed in
 */
function getLinePosition ( lines, char ) {
	var line = 0;
	var lineStart = 0;

	var lineEnds = lines.map( function ( line ) {
		lineStart += line.length + 1; // +1 for the newline
		return lineStart;
	});

	lineStart = 0;

	while ( char >= lineEnds[ line ] ) {
		lineStart = lineEnds[ line ];
		line += 1;
	}

	var column = char - lineStart;
	return { line: line, column: column, char: char };
}

var requirePattern = /require\s*\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g;
var TEMPLATE_VERSION = 4;

function parse ( source ) {
	if ( !Ractive$1 ) {
		throw new Error( 'rcu has not been initialised! You must call rcu.init(Ractive) before rcu.parse()' );
	}

	var parsed = Ractive$1.parse( source, {
		noStringify: true,
		interpolate: { script: false, style: false },
		includeLinePositions: true
	});

	if ( parsed.v !== TEMPLATE_VERSION ) {
		console.warn( ("Mismatched template version (expected " + TEMPLATE_VERSION + ", got " + (parsed.v) + ")! Please ensure you are using the latest version of Ractive.js in your build process as well as in your app") ); // eslint-disable-line no-console
	}

	var links = [];
	var styles = [];
	var modules = [];

	// Extract certain top-level nodes from the template. We work backwards
	// so that we can easily splice them out as we go
	var template = parsed.t;
	var i = template.length;
	var scriptItem;

	while ( i-- ) {
		var item = template[i];

		if ( item && item.t === 7 ) {
			var attr = getAttr( 'rel', item );
			if ( item.e === 'link' && attr === 'ractive' ) {
				links.push( template.splice( i, 1 )[0] );
			}

			attr = getAttr( 'type', item );
			if ( item.e === 'script' && ( !attr || attr === 'text/javascript' ) ) {
				if ( scriptItem ) {
					throw new Error( 'You can only have one <script> tag per component file' );
				}
				scriptItem = template.splice( i, 1 )[0];
			}

			if ( item.e === 'style' && ( !attr || attr === 'text/css' ) ) {
				styles.push( template.splice( i, 1 )[0] );
			}
		}
	}

	// Clean up template - trim whitespace left over from the removal
	// of <link>, <style> and <script> tags from start...
	while ( /^\s*$/.test( template[0] ) ) template.shift();

	// ...and end
	while ( /^\s*$/.test( template[ template.length - 1 ] ) ) template.pop();

	// Extract names from links
	var imports = links.map( function ( link ) {
		var href = getAttr( 'href', link );
		var name = getAttr( 'name', link ) || getName( href );

		if ( typeof name !== 'string' ) {
			throw new Error( 'Error parsing link tag' );
		}

		return { name: name, href: href };
	});

	var result = {
		source: source, imports: imports, modules: modules,
		template: parsed,
		css: styles.map( function ( item ) { return item.f; } ).join( ' ' ),
		script: ''
	};

	// extract position information, so that we can generate source maps
	if ( scriptItem && scriptItem.f ) {
		var content = scriptItem.f[0];

		var contentStart = source.indexOf( '>', scriptItem.p[2] ) + 1;

		// we have to jump through some hoops to find contentEnd, because the contents
		// of the <script> tag get trimmed at parse time
		var contentEnd = contentStart + content.length + source.slice( contentStart ).replace( content, '' ).indexOf( '</script' );

		var lines = source.split( '\n' );

		result.scriptStart = getLinePosition( lines, contentStart );
		result.scriptEnd = getLinePosition( lines, contentEnd );

		result.script = source.slice( contentStart, contentEnd );

		match( result.script, requirePattern, function ( match, doubleQuoted, singleQuoted ) {
			var source = doubleQuoted || singleQuoted;
			if ( !~modules.indexOf( source ) ) modules.push( source );
		});
	}

	return result;
}

function getAttr ( name, node ) {
	if ( node.a && node.a[name] ) return node.a[name];
	else if ( node.m ) {
		var i = node.m.length;
		while ( i-- ) {
			var a = node.m[i];
			// plain attribute
			if ( a.t === 13 ) {
				if ( a.n === name ) return a.f;
			}
		}
	}
}

function make ( source, config, callback, errback ) {
	config = config || {};

	// Implementation-specific config
	var url        = config.url || '';
	var loadImport = config.loadImport;
	var loadModule = config.loadModule;

	var definition = parse( source );

	var imports = {};

	function createComponent () {
		var options = {
			template: definition.template,
			partials: definition.partials,
			css: definition.css,
			components: imports
		};

		var Component;

		if ( definition.script ) {
			var sourceMap = generateSourceMap( definition, {
				source: url,
				content: source
			});

			try {
				var factory = new eval2.Function( 'component', 'require', 'Ractive', definition.script, {
					sourceMap: sourceMap
				});

				var component = {};
				factory( component, config.require, Ractive$1 );
				var exports = component.exports;

				if ( typeof exports === 'object' ) {
					for ( var prop in exports ) {
						if ( exports.hasOwnProperty( prop ) ) {
							options[ prop ] = exports[ prop ];
						}
					}
				}

				Component = Ractive$1.extend( options );
			} catch ( err ) {
				errback( err );
				return;
			}

			callback( Component );
		} else {
			Component = Ractive$1.extend( options );
			callback( Component );
		}
	}

	// If the definition includes sub-components e.g.
	//     <link rel='ractive' href='foo.html'>
	//
	// ...then we need to load them first, using the loadImport method
	// specified by the implementation.
	//
	// In some environments (e.g. AMD) the same goes for modules, which
	// most be loaded before the script can execute
	var remainingDependencies = ( definition.imports.length + ( loadModule ? definition.modules.length : 0 ) );
	var ready = false;

	if ( remainingDependencies ) {
		var onloaded = function () {
			if ( !--remainingDependencies ) {
				if ( ready ) {
					createComponent();
				} else {
					setTimeout( createComponent ); // cheap way to enforce asynchrony for a non-Zalgoesque API
				}
			}
		};

		if ( definition.imports.length ) {
			if ( !loadImport ) {
				throw new Error( ("Component definition includes imports (e.g. <link rel=\"ractive\" href=\"" + (definition.imports[0].href) + "\">) but no loadImport method was passed to rcu.make()") );
			}

			definition.imports.forEach( function ( toImport ) {
				loadImport( toImport.name, toImport.href, url, function ( Component ) {
					imports[ toImport.name ] = Component;
					onloaded();
				});
			});
		}

		if ( loadModule && definition.modules.length ) {
			definition.modules.forEach( function ( name ) {
				loadModule( name, name, url, onloaded );
			});
		}
	} else {
		setTimeout( createComponent, 0 );
	}

	ready = true;
}

function resolve ( relativePath, base ) {
	// If we've got an absolute path, or base is '', return
	// relativePath
	if ( !base || relativePath.charAt( 0 ) === '/' ) {
		return relativePath;
	}

	// 'foo/bar/baz.html' -> ['foo', 'bar', 'baz.html']
	var pathParts = ( base || '' ).split( '/' );
	var relativePathParts = relativePath.split( '/' );

	// ['foo', 'bar', 'baz.html'] -> ['foo', 'bar']
	pathParts.pop();

	var part;

	while ( part = relativePathParts.shift() ) {
		if ( part === '..' ) {
			pathParts.pop();
		} else if ( part !== '.' ) {
			pathParts.push( part );
		}
	}

	return pathParts.join( '/' );
}

var get;

// Test for XHR to see if we're in a browser...
if ( typeof XMLHttpRequest !== 'undefined' ) {
	get = function ( url ) {
		return new Ractive.Promise( function ( fulfil, reject ) {
			var xhr, onload, loaded;

			xhr = new XMLHttpRequest();
			xhr.open( 'GET', url );

			onload = function () {
				if ( ( xhr.readyState !== 4 ) || loaded ) {
					return;
				}

				fulfil( xhr.responseText );
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
		return new Ractive.Promise( function ( fulfil, reject ) {
			require( 'fs' ).readFile( url, function ( err, result ) {
				if ( err ) {
					return reject( err );
				}

				fulfil( result.toString() );
			});
		});
	};
}

var get$1 = get;

// Load multiple components:
//
//     Ractive.load({
//       foo: 'path/to/foo.html',
//       bar: 'path/to/bar.html'
//     }).then( function ( components ) {
//       var foo = new components.foo(...);
//       var bar = new components.bar(...);
//     });
function loadMultiple ( map, baseUrl, cache ) {
	var promise = new Ractive.Promise( function ( resolve, reject ) {
		var pending = 0, result = {}, name, load;

		load = function ( name ) {
			var path = map[ name ];

			loadSingle( path, baseUrl, baseUrl, cache ).then( function ( Component ) {
				result[ name ] = Component;

				if ( !--pending ) {
					resolve( result );
				}
			}, reject );
		};

		for ( name in map ) {
			if ( map.hasOwnProperty( name ) ) {
				pending += 1;
				load( name );
			}
		}
	});

	return promise;
}

init( Ractive );

function load$1 ( url ) {
	var baseUrl = load$1.baseUrl;
	var cache = load$1.cache !== false;

	if ( !url ) {
		return loadFromLinks( baseUrl, cache );
	}

	if ( typeof url === 'object' ) {
		return loadMultiple( url, baseUrl, cache );
	}

	return loadSingle( url, baseUrl, baseUrl, cache );
}

load$1.baseUrl = '';
load$1.modules = {};

var promises = {};
var global = ( typeof window !== 'undefined' ? window : {} );
// Load a single component:
//
//     Ractive.load( 'path/to/foo' ).then( function ( Foo ) {
//       var foo = new Foo(...);
//     });
function loadSingle ( path, parentUrl, baseUrl, cache ) {
	var promise, url;

	url = resolve( path, path[0] === '.' ? parentUrl : baseUrl );

	// if this component has already been requested, don't
	// request it again
	if ( !cache || !promises[ url ] ) {
		promise = get$1( url ).then( function ( template ) {
			return new Ractive.Promise( function ( fulfil, reject ) {
				make( template, {
					url: url,
					loadImport: function ( name, path, parentUrl, callback ) {
						// if import has a relative URL, it should resolve
						// relative to this (parent). Otherwise, relative
						// to load.baseUrl
						loadSingle( path, parentUrl, baseUrl, cache ).then( callback, reject );
					},
					require: ractiveRequire
				}, fulfil, reject );
			});
		});

		promises[ url ] = promise;
	}

	return promises[ url ];
}

function ractiveRequire ( name ) {
	var dependency, qualified;

	dependency = load$1.modules.hasOwnProperty( name ) ? load$1.modules[ name ] :
	             global.hasOwnProperty( name ) ? global[ name ] : null;

	if ( !dependency && typeof require === 'function' ) {
		try {
			dependency = require( name );
		} catch (e) {
			if (typeof process !== 'undefined') {
				dependency = require( process.cwd() + '/' + name );
			} else {
				throw e;
			}
		}
	}

	if ( !dependency ) {
		qualified = !/^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test( name ) ? '["' + name + '"]' : '.' + name;
		throw new Error( 'Ractive.load() error: Could not find dependency "' + name + '". It should be exposed as Ractive.load.modules' + qualified + ' or window' + qualified );
	}

	return dependency;
}

// Create globally-available components from links found on the page:
//
//     <link rel='ractive' href='path/to/foo.html'>
//
// You can optionally add a name attribute, otherwise the file name (in
// the example above, 'foo') will be used instead. The component will
// be available as `Ractive.components.foo`:
//
//     Ractive.load().then( function () {
//       var foo = new Ractive.components.foo(...);
//     });
function loadFromLinks ( baseUrl, cache ) {
	var promise = new Ractive.Promise( function ( resolve, reject ) {
		var links, pending;

		links = toArray( document.querySelectorAll( 'link[rel="ractive"]' ) );
		pending = links.length;

		links.forEach( function ( link ) {
			var name = getNameFromLink( link );

			loadSingle( link.getAttribute( 'href' ), '', baseUrl, cache ).then( function ( Component ) {
				Ractive.components[ name ] = Component;

				if ( !--pending ) {
					resolve();
				}
			}, reject );
		});
	});

	return promise;
}

function getNameFromLink ( link ) {
	return link.getAttribute( 'name' ) || getName( link.getAttribute( 'href' ) );
}

function toArray ( arrayLike ) {
	var arr = [], i = arrayLike.length;

	while ( i-- ) {
		arr[i] = arrayLike[i];
	}

	return arr;
}

init( Ractive );

function load ( url ) {
	var baseUrl = load.baseUrl;
	var cache = load.cache !== false;

	if ( !url ) {
		return loadFromLinks( baseUrl, cache );
	}

	if ( typeof url === 'object' ) {
		return loadMultiple( url, baseUrl, cache );
	}

	return loadSingle( url, baseUrl, baseUrl, cache );
}

load.baseUrl = '';
load.modules = {};

export default load;