
import chalk				from 'chalk';
import { sprintf }			from 'sprintf-js';


export function print ( msg, ...args ) {
    if ( print.quiet === true )
	return;
    console.log( chalk.whiteBright( sprintf(msg, ...args) ) );
}
print.quiet				= false;


export function parseHex ( hex ) {
    return Uint8Array.from(
	hex.match(/.{1,2}/g)
	    .map((byte) => parseInt(byte, 16))
    );
}


export function buildList ( value, list ) {
    if ( !Array.isArray(list) )
	list				= [];

    list.push( value );

    return list;
}


export default {
    print,
    parseHex,
    buildList,
};
