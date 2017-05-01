import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import { loadDymolaResults, PartCollection } from '@xogeny/part-collection';
import yargs = require('yargs');
import fs = require('fs');
import * as msgpack5 from 'msgpack5';

const msgpack = msgpack5({});
let opts = yargs
    .default("outfile", null, "Output file")
    .default("pretty", true, "Pretty output")
    .default("msgpack", true, "Write in msgpack format")
    .alias("o", "outfile")
    .alias("p", "pretty")
    .alias("m", "msgpack")

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

function partPredicate(n: string) {
    return n.endsWith(".Form");
}

function matchsNothing(n: string) {
    return false;
}

export function forPart(parts: string[]) {
    return (name: string) => {
        if (parts.some((n) => name.startsWith(n + "."))) {
            return true;
        }
        return false;
    }
}

async function partNames(filename: string): Promise<string[]> {
    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(partPredicate, matchsNothing);
    await file.parse(handler);
    let signals = Object.keys(handler.trajectories);
    return signals.map((n) => n.slice(0, n.length - 5));
}

async function run() {
    let filename = args._[0];

    let parts = await partNames(filename);
    console.log("Parts found: ");
    parts.forEach((part) => {
        console.log("  " + part);
    })

    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(forPart(parts), () => false);
    await file.parse(handler);
    let trajs = {
        trajectories: handler.trajectories,
        final: {},
    }

    if (args.pretty && args.msgpack) {
        throw new Error("--pretty and --msgpack are mutually incompatible");
    }
    let col = loadDymolaResults(trajs, {});
    let serialize = (col: PartCollection) => {
        if (args.msgpack) return msgpack.encode(col);
        if (args.pretty) return JSON.stringify(col, null, 4);
        return JSON.stringify(col);
    }
    if (args.outfile) {
        fs.writeFileSync(args.outfile, serialize(col));
    } else {
        console.log(serialize(col));
    }
    return;
}

run().catch((e) => console.error(e));
