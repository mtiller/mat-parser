import { blobReader } from './readers';
import { MatFile } from './parser';
import { DymolaSignalExtractor } from './dsres';

export function belongsToPart(parts: string[]) {
    return (name: string) => {
        if (parts.some((n) => name.startsWith(n + "."))) {
            return true;
        }
        return false;
    }
}

export async function partNames(filename: string): Promise<string[]> {
    let obs = blobReader(filename);
    let file = new MatFile(obs);
    let handler = new DymolaSignalExtractor();
    await file.parse(handler);
    let signals = Object.keys(handler.descriptions).filter((signal) => signal.endsWith(".Form"));
    return signals.map((n) => n.slice(0, n.length - 5));
}
