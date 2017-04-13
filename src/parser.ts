import fs = require('fs');
import { Observable } from 'rxjs';
import { DataFormat, readOne, dataSize, MatrixType } from './dataformats';
import { Handler } from './events';

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

export class MatFile {
    private rem: Buffer;
    private expecting: Expecting;
    private header: Header | null;
    private colnum: number | null;
    private name: string | null;
    private handler: Handler | null;
    constructor(protected filename: string) {
        // Initialize buffer
        this.rem = Buffer.alloc(0);

        // Reset state machine
        this.expecting = Expecting.Header;
        this.header = null;
        this.colnum = null;
        // this.stream = fs.createReadStream(filename, {
        //     // autoClose?
        // });
        // console.log("eventNames = ", this.stream.eventNames());
        // this.stream.on('data', (chunk: Buffer) => {
        //     console.log(">>> Adding new chunk of size "+chunk.length+" to existing chunk of size "+this.rem.length);
        //     this.rem = Buffer.concat([this.rem, chunk]);
        //     try {
        //         while (this.processBuffer());
        //     } catch (e) {
        //         this.sendError(e);
        //     }
        // });
        // this.stream.on('error', (err: Error) => {
        //     console.error(err);
        //     this.sendError(err);
        // });
        // this.stream.on('end', () => {
        //     console.error("'end' event caught!");
        // })
        // this.stream.on('close', () => {
        //     try {
        //         while (this.processBuffer());
        //     } catch (e) {
        //         this.sendError(e);
        //     }
        //     if (this.expecting!=Expecting.Header) {
        //         console.error("End of file encountered mid-file in "+filename);
        //     } else {
        //         console.log("Found EOF");
        //     }
        //     this.handler({ type: "eof", filename: filename });
        // });
        // this.stream.resume();
    }
    obs(data: Observable<Buffer>, handler: Handler): Promise<void> {
        this.rem = Buffer.alloc(0);
        this.handler = handler;
        return new Promise<void>((resolve, reject) => {
            let sub = data.subscribe((chunk) => {
                this.rem = Buffer.concat([this.rem, chunk]);
                try {
                    while (this.processBuffer());
                } catch (e) {
                    console.error("Error processing buffer: ", e);
                    sub.unsubscribe();
                    reject(e);
                }
            }, (err: Error) => {
                reject(err);
            }, () => {
                if (this.rem.length==0) {
                    handler({ type: "eof" });
                    resolve(undefined);
                }
                else reject(new Error("Ran out of data prematurely"));
            })
        })
    }
    blob(handler: Handler): Promise<void> {
        this.handler = handler;
        return new Promise<void>((resolve, reject) => {
            fs.readFile(this.filename, (err, data) => {
                this.rem = data;
                try {
                    while (this.processBuffer());
                } catch (e) {
                    reject(e);
                }
                handler({ type: "eof" });
                resolve(undefined);
            })
        })
    }
    readBytes(rs: fs.ReadStream, num: number): Promise<Buffer | null> {
        return new Promise<Buffer | null>((resolve, reject) => {
            try {
                let buf = rs.read(num);
                if (buf) {
                    if (buf.length < num) {
                        let left = num - buf.length;
                        console.log("Found ourselves " + left + " short");
                        this.readBytes(rs, left).then((rem) => {
                            if (rem == null) reject(new Error("Couldn't finish incomplete chunk"));
                            else {
                                let ret = Buffer.concat([buf, rem]);
                                if (ret.length != num) reject(new Error("Unable to complete chunk"));
                                else {
                                    console.log("Completed chunk");
                                    resolve(ret);
                                }
                            }
                        })
                    } else if (buf.length == num) {
                        resolve(buf);
                    } else {
                        reject(new Error("Expected " + num + " but got too many (" + buf.length + ")"));
                    }
                }
            } catch (e) {
                reject(e);
            }
            rs.on('readable', () => {
                return this.readBytes(rs, num).then(resolve, reject);
            })
            rs.on('end', () => resolve(null));
            rs.on('close', () => resolve(null));
            rs.on('error', (e: Error) => reject(e));
        })
    }
    async chunks(handler: Handler): Promise<void> {
        this.handler = handler;
        let file = fs.createReadStream(this.filename);
        while (this.expecting != Expecting.Nothing) {
            await this.processChunk(file, handler);
        }
    }
    public async processChunk(file: fs.ReadStream, handler: Handler): Promise<void> {
        let next: Buffer | null = null;
        switch (this.expecting) {
            case Expecting.Header:
                next = await this.readBytes(file, 20);
                if (next == null) return;
                this.rem = next;
                if (this.processBuffer() == false) throw new Error("Error reading header");
                return;
            case Expecting.Name:
                if (this.header == null) throw new Error("Expected header to be set when reading name");
                next = await this.readBytes(file, this.header.namelen);
                if (next == null) throw new Error("End of file reading name information");
                this.rem = next;
                if (this.processBuffer() == false) throw new Error("Error reading header");
                return;
            case Expecting.Row:
                if (this.header == null) throw new Error("Expected header to be set when reading row");
                next = await this.readBytes(file, dataSize(this.header.data, this.header.rows));
                if (next == null) throw new Error("End of file reading row");
                this.rem = next;
                if (this.processBuffer() == false) throw new Error("Error reading row");
                return;
        }
    }
    stream(handler: Handler) {
        this.handler = handler;
        let stream = fs.createReadStream(this.filename, {
            // autoClose?
        });
        stream.on('data', (chunk: Buffer) => {
            console.log(">>> data [" + chunk.length + "]");
        });
        stream.on('readable', () => {
            stream.resume();
        });
        stream.on('end', () => {
            console.log(">>> end");
        });
        stream.on('finish', () => {
            console.log(">>> finish");
        });
        stream.on('close', () => {
            console.log(">>> close");
        });
        stream.on('error', (err: Error) => {
            console.log(">>> error ", err);
        })
    }
    // private sendError(err: Error) {
    //     console.error("Error encountered: ", err);
    //     this.handler({ type: "error", err: err });
    //     this.expecting = Expecting.Nothing;
    // }
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
        if (n == "2") return MatrixType.SparseNumeric;
        throw new Error("Invalid matrix type '" + n + "'");
    }
    /**
     * This method returns false if it cannot process anything else.
     */
    processBuffer(): boolean {
        let size = this.rem.length;
        //console.log("Processing a buffer of size: " + size);
        switch (this.expecting) {
            case Expecting.Header:
                if (size < 20) return false;
                //console.log("header bytes = ", this.rem.slice(0, 20));
                let type = this.rem.readInt32LE(0);
                let rows = this.rem.readInt32LE(4);
                let cols = this.rem.readInt32LE(8);
                let imaginary = this.rem.readInt32BE(12);
                let namelen = this.rem.readInt32LE(16);

                let dec = type.toString();
                while (dec.length < 4) {
                    dec = "0" + dec;
                }
                //console.log("type = ", dec);

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
                    imaginary: imaginary > 0,
                    namelen: namelen,
                }

                //console.log("header = ", JSON.stringify(this.header));

                this.rem = this.rem.slice(20);
                this.expecting = Expecting.Name;
                return true;
            case Expecting.Name:
                if (this.header == null) throw new Error("Reading name, but no header found...this should not happen");
                if (size < this.header.namelen) return false;
                //console.log("name buffer = ", this.rem.slice(0, this.header.namelen));
                let name = this.rem.slice(0, this.header.namelen - 1).toString("ascii");
                //console.log("name = ", name);
                try {
                    if (this.handler) {
                        this.handler({ type: "matrix", name: name });
                    }
                } catch (e) {
                    console.error("Ignoring error in handling matrix event: ", e);
                }
                this.rem = this.rem.slice(this.header.namelen);
                this.colnum = 0;
                this.name = name;
                this.expecting = Expecting.Row;
                return true;
            case Expecting.Row:
                if (this.header == null) throw new Error("Reading name, but no header found. This should not happen");
                if (this.colnum == null) throw new Error("Expected column number to be set, but was null. This should not happen");
                if (this.name == null) throw new Error("Expected matrix to be named, but found null. This should not happen");
                if (size < dataSize(this.header.data, this.header.rows)) return false;
                console.log("Processing column " + this.colnum + " of " + this.header.cols + " in " + this.name + "...");
                let col: any[] = [];
                for (let i = 0; i < this.header.rows; i++) {
                    this.rem = readOne(col, this.header.data, this.rem);
                }
                try {
                    if (this.handler) {
                        this.handler({ type: "column", format: this.header.matrix, name: this.name, colnum: this.colnum, column: col });
                    }
                } catch (e) {
                    console.error("Ignore error in handling column event: ", e);
                }
                this.colnum++;
                //console.log("...done");
                if (this.colnum == 727) {
                    return true;
                }
                if (this.colnum == this.header.cols) {
                    //console.log("End of matrix "+this.name);
                    if (this.handler) {
                        this.handler({ type: "end", name: this.name });
                    }
                    this.header = null;
                    this.colnum = null;
                    this.name = null;
                    this.expecting = Expecting.Header;
                }
                return true;
            default:
                throw new Error("Unexpected state: " + this.expecting);
        }
    }
}
