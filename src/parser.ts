import { Observable } from 'rxjs';
import { DataFormat, readOne, dataSize, MatrixType, matrixType, dataType } from './types';
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

export interface ParserState {
    rem: Buffer;
    expecting: Expecting;
    header: Header | null;
    colnum: number | null;
    name: string | null;
}

export class MatFile {
    private state: ParserState;
    constructor(protected source: Observable<Buffer>) {
        this.resetState();
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
    private resetState() {
        this.state = {
            rem: Buffer.alloc(0),
            expecting: Expecting.Header,
            header: null,
            colnum: null,
            name: null,
        }
    }
    parse(handler: Handler): Promise<void> {
        this.resetState();
        return new Promise<void>((resolve, reject) => {
            let sub = this.source.subscribe((chunk) => {
                this.state.rem = Buffer.concat([this.state.rem, chunk]);
                try {
                    while (this.processBuffer(handler));
                } catch (e) {
                    console.error("Error processing buffer: ", e);
                    sub.unsubscribe();
                    reject(e);
                }
            }, (err: Error) => {
                reject(err);
            }, () => {
                if (this.state.rem.length == 0) {
                    handler({ type: "eof" });
                    resolve(undefined);
                }
                else reject(new Error("Ran out of data prematurely"));
            })
        })
    }
    // readBytes(rs: fs.ReadStream, num: number): Promise<Buffer | null> {
    //     return new Promise<Buffer | null>((resolve, reject) => {
    //         try {
    //             let buf = rs.read(num);
    //             if (buf) {
    //                 if (buf.length < num) {
    //                     let left = num - buf.length;
    //                     console.log("Found ourselves " + left + " short");
    //                     this.readBytes(rs, left).then((rem) => {
    //                         if (rem == null) reject(new Error("Couldn't finish incomplete chunk"));
    //                         else {
    //                             let ret = Buffer.concat([buf, rem]);
    //                             if (ret.length != num) reject(new Error("Unable to complete chunk"));
    //                             else {
    //                                 console.log("Completed chunk");
    //                                 resolve(ret);
    //                             }
    //                         }
    //                     })
    //                 } else if (buf.length == num) {
    //                     resolve(buf);
    //                 } else {
    //                     reject(new Error("Expected " + num + " but got too many (" + buf.length + ")"));
    //                 }
    //             }
    //         } catch (e) {
    //             reject(e);
    //         }
    //         rs.on('readable', () => {
    //             return this.readBytes(rs, num).then(resolve, reject);
    //         })
    //         rs.on('end', () => resolve(null));
    //         rs.on('close', () => resolve(null));
    //         rs.on('error', (e: Error) => reject(e));
    //     })
    // }
    // async chunks(handler: Handler): Promise<void> {
    //     this.handler = handler;
    //     let file = fs.createReadStream(this.filename);
    //     while (this.expecting != Expecting.Nothing) {
    //         await this.processChunk(file, handler);
    //     }
    // }
    // public async processChunk(file: fs.ReadStream, handler: Handler): Promise<void> {
    //     let next: Buffer | null = null;
    //     switch (this.expecting) {
    //         case Expecting.Header:
    //             next = await this.readBytes(file, 20);
    //             if (next == null) return;
    //             this.rem = next;
    //             if (this.processBuffer() == false) throw new Error("Error reading header");
    //             return;
    //         case Expecting.Name:
    //             if (this.header == null) throw new Error("Expected header to be set when reading name");
    //             next = await this.readBytes(file, this.header.namelen);
    //             if (next == null) throw new Error("End of file reading name information");
    //             this.rem = next;
    //             if (this.processBuffer() == false) throw new Error("Error reading header");
    //             return;
    //         case Expecting.Row:
    //             if (this.header == null) throw new Error("Expected header to be set when reading row");
    //             next = await this.readBytes(file, dataSize(this.header.data, this.header.rows));
    //             if (next == null) throw new Error("End of file reading row");
    //             this.rem = next;
    //             if (this.processBuffer() == false) throw new Error("Error reading row");
    //             return;
    //     }
    // }
    // stream(handler: Handler) {
    //     this.handler = handler;
    //     let stream = fs.createReadStream(this.filename, {
    //         // autoClose?
    //     });
    //     stream.on('data', (chunk: Buffer) => {
    //         console.log(">>> data [" + chunk.length + "]");
    //     });
    //     stream.on('readable', () => {
    //         stream.resume();
    //     });
    //     stream.on('end', () => {
    //         console.log(">>> end");
    //     });
    //     stream.on('finish', () => {
    //         console.log(">>> finish");
    //     });
    //     stream.on('close', () => {
    //         console.log(">>> close");
    //     });
    //     stream.on('error', (err: Error) => {
    //         console.log(">>> error ", err);
    //     })
    // }
    // private sendError(err: Error) {
    //     console.error("Error encountered: ", err);
    //     this.handler({ type: "error", err: err });
    //     this.expecting = Expecting.Nothing;
    // }
    /**
     * This method returns false if it cannot process anything else.
     */
    processBuffer(handler: Handler): boolean {
        let size = this.state.rem.length;
        //console.log("Processing a buffer of size: " + size);
        switch (this.state.expecting) {
            case Expecting.Header:
                if (size < 20) return false;
                //console.log("header bytes = ", this.rem.slice(0, 20));
                let type = this.state.rem.readInt32LE(0);
                let rows = this.state.rem.readInt32LE(4);
                let cols = this.state.rem.readInt32LE(8);
                let imaginary = this.state.rem.readInt32BE(12);
                let namelen = this.state.rem.readInt32LE(16);

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

                this.state.header = {
                    data: dataType(P),
                    matrix: matrixType(T),
                    rows: rows,
                    cols: cols,
                    imaginary: imaginary > 0,
                    namelen: namelen,
                }

                //console.log("header = ", JSON.stringify(this.header));

                this.state.rem = this.state.rem.slice(20);
                this.state.expecting = Expecting.Name;
                return true;
            case Expecting.Name:
                if (this.state.header == null) {
                    throw new Error("Reading name, but no header found...this should not happen");
                }
                if (size < this.state.header.namelen) return false;
                //console.log("name buffer = ", this.rem.slice(0, this.header.namelen));
                let name = this.state.rem.slice(0, this.state.header.namelen - 1).toString("ascii");
                //console.log("name = ", name);
                try {
                    if (handler) {
                        handler({ type: "matrix", name: name });
                    }
                } catch (e) {
                    console.error("Ignoring error in handling matrix event: ", e);
                }
                this.state.rem = this.state.rem.slice(this.state.header.namelen);
                this.state.colnum = 0;
                this.state.name = name;
                this.state.expecting = Expecting.Row;
                return true;
            case Expecting.Row:
                if (this.state.header == null) throw new Error("Reading name, but no header found. This should not happen");
                if (this.state.colnum == null) throw new Error("Expected column number to be set, but was null. This should not happen");
                if (this.state.name == null) throw new Error("Expected matrix to be named, but found null. This should not happen");
                if (size < dataSize(this.state.header.data, this.state.header.rows)) return false;

                let col: any[] = [];
                for (let i = 0; i < this.state.header.rows; i++) {
                    this.state.rem = readOne(col, this.state.header.data, this.state.rem);
                }
                try {
                    if (handler) {
                        handler({ type: "column", format: this.state.header.matrix, name: this.state.name, colnum: this.state.colnum, column: col });
                    }
                } catch (e) {
                    console.error("Ignore error in handling column event: ", e);
                }
                this.state.colnum++;
                if (this.state.colnum == this.state.header.cols) {
                    //console.log("End of matrix "+this.name);
                    if (handler) {
                        handler({ type: "end", name: this.state.name });
                    }
                    this.state.header = null;
                    this.state.colnum = null;
                    this.state.name = null;
                    this.state.expecting = Expecting.Header;
                }
                return true;
            default:
                throw new Error("Unexpected state: " + this.state.expecting);
        }
    }
}
