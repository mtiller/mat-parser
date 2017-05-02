import { MatrixType } from './types';

export interface Handler {
    start(name: string, rows: number, cols: number): void;
    column(name: string, colnum: number, format: MatrixType, column: Array<any>, last: boolean): void;
    end(name: string): boolean;
    eof(): void;
    error(err: Error): void;
}

export class NullHandler implements Handler {
    start(name: string, rows: number, cols: number) {}
    column(name: string, colnum: number, format: MatrixType, column: Array<any>, last: boolean): void {}
    end(name: string): boolean { return false; }
    eof(): void {}
    error(err: Error): void {}
}