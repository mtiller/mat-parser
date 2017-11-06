import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import yargs = require('yargs');
import * as fs from 'fs';

let opts = yargs
    .default("outfile", null, "Output file")
    .alias("o", "outfile")

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

async function run() {
    let filename = args._[0];

    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(() => true, () => false);
    await file.parse(handler);
    let signals = Object.keys(handler.trajectories);
    if (args.outfile) {
        fs.writeFileSync(args.outfile, JSON.stringify({ signals: signals }, null, 4));
    } else {
        console.log(JSON.stringify({ signals: signals }, null, 4));
    }

    //signals.forEach((signal) => console.log(signal));
}

run().catch((e) => console.error(e));
