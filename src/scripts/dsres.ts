import { blobReader } from '../readers';
import { MatFile } from '../parser';
import { DymolaResultsExtractor } from '../dsres';
import yargs = require('yargs');
import fs = require('fs');

let opts = yargs
    .default("final", [], "Variables to get the final value for")
    .default("signal", [], "Variables to get the continuous signal for")
    .default("outfile", null, "Output file")
    .default("pretty", true, "Pretty output")
    .default("parts", false, "Include all data for 3D parts")
    .alias("f", "final")
    .alias("s", "signal")
    .alias("o", "outfile")
    .alias("p", "pretty")
    .alias("d", "parts")

let args = opts.argv;

if (args._.length != 1) {
    console.error("Usage: " + args["$0"] + " [options] file");
    process.exit(1);
}

if (!Array.isArray(args.final)) args.final = [args.final];
if (!Array.isArray(args.signal)) args.signal = [args.signal];

function partPredicate(n: string) {
    return n.endsWith(".Form");
}

function matchsNothing(n: string) {
    return false;
}

export function partOrSignal(parts: string[], signals: string[]) {
    return (name: string) => {
        if (signals.indexOf(name) >= 0) return true;
        if (parts.some((n) => name.startsWith(n + "."))) {
            return true;
        }
        return false;
    }
}

function matchsNames(names: string[]) {
    return (name: string) => {
        return names.indexOf(name) >= 0;
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

    let signals = [...args.signal];

    let parts: string[] = [];
    if (args.parts) {
        parts = await partNames(filename);
        console.log("Parts found: ");
        parts.forEach((part) => {
            console.log("  "+part);
        })
    }

    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaResultsExtractor(partOrSignal(parts, signals), matchsNames(args.final));
    await file.parse(handler);
    let result = {
        trajectories: handler.trajectories,
        final: handler.finals,
    }
    if (args.outfile) {
        if (args.pretty) {
            fs.writeFileSync(args.outfile, JSON.stringify(result, null, 4));
        } else {
            fs.writeFileSync(args.outfile, JSON.stringify(result));
        }
    } else {
        if (args.pretty) {
            console.log(JSON.stringify(result, null, 4));
        } else {
            console.log(JSON.stringify(result));
        }
    }
    return result;
}

run().catch((e) => console.error(e));
