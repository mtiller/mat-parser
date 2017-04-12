import fs = require('fs');

export enum DataFormat {
    Float64,
    Float32,
    Int32,
    Int16,
    UInt16,
    UInt8,
}

export enum MatrixType {
    FullNumeric,
    SparseNumeric,
    Text,
}

export interface Header {
    data: DataFormat;
    matrix: MatrixType;
    rows: number;
    cols: number;
    imaginary: boolean;
    namelen: number;
}

export enum Expecting {
    Header,
    Name,
    Row,
    Nothing, // Closed, Error
}

export interface MatrixEvent {
    type: "matrix";
    name: string;
}

export interface RowEvent {
    type: "row";
    row: Array<any>;
}

export interface ErrorEvent {
    type: "error";
    err: Error;
}

export type Event = MatrixEvent | RowEvent | ErrorEvent;

/**
 * A Handler should return true if it wants to continue;
 */
export type Handler = (e: Event) => boolean;

export class MatFile {
    private rem: Buffer;
    private stream: fs.ReadStream;
    private expecting: Expecting;
    private header: Header | null;
    constructor(filename: string, private handler: Handler) {
        this.rem = Buffer.alloc(0);
        this.expecting = Expecting.Header;
        this.header = null;
        this.stream = fs.createReadStream(filename, {
            // autoClose?
        });
        this.stream.on('data', (chunk: Buffer) => {
            this.rem = Buffer.concat([this.rem, chunk]);
            try {
                while (this.processBuffer());
            } catch (e) {
                this.sendError(e);
            }
        });
        this.stream.on('error', (err: Error) => {
            this.sendError(err);
        });
        this.stream.on('end', () => {
            try {
                while (this.processBuffer());
            } catch (e) {
                this.sendError(e);
            }
        });
        this.stream.resume();
    }
    private sendError(err: Error) {
        this.handler({ type: "error", err: err });
        this.expecting = Expecting.Nothing;
        this.stream.close();
    }
    private dataType(n: string): DataFormat {
        if (n == "0") return DataFormat.Float64;
        if (n == "1") return DataFormat.Float32;
        if (n == "2") return DataFormat.Int32;
        if (n == "3") return DataFormat.Int16;
        if (n == "4") return DataFormat.UInt16;
        if (n == "5") return DataFormat.UInt8;
        throw new Error("Invalid data type '" + n + "'");
    }
    private matrixType(n: string): MatrixType {
        if (n == "0") return MatrixType.FullNumeric;
        if (n == "1") return MatrixType.Text;
        if (n=="2") return MatrixType.SparseNumeric;
        throw new Error("Invalid matrix type '"+n+"'");
    }
    /**
     * This method returns false if it cannot process anything else.
     */
    processBuffer(): boolean {
        switch (this.expecting) {
            case Expecting.Header:
                if (this.rem.length >= 20) {
                    let type = this.rem.readInt16LE(0);
                    let rows = this.rem.readInt16LE(4);
                    let cols = this.rem.readInt16LE(8);
                    let imaginary = this.rem.readInt16BE(12);
                    let namelen = this.rem.readInt16LE(16);

                    let dec = type.toString();
                    while (dec.length < 4) {
                        dec = "0" + dec;
                    }

                    let M = dec[0];
                    let O = dec[1];
                    let P = dec[2];
                    let T = dec[3];

                    if (M != "0") {
                        throw new Error("Only big-endian architectures are currently supported");
                    }

                    if (O != "0") {
                        throw new Error("Expected O to be zero, but it was " + O);
                    }

                    this.header = {
                        data: this.dataType(P),
                        matrix: this.matrixType(T),
                        rows: rows,
                        cols: cols,
                        imaginary: imaginary>0,
                        namelen: namelen,
                    }

                    this.rem = this.rem.slice(16);
                    return true;
                }
            case Expecting.Name:
            case Expecting.Row:
            default:
                return false;
        }
    }
}
