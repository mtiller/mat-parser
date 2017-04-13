import { MatrixType } from './types';

export interface Handler {
    start(name: string): void;
    column(colnum: number, name: string, format: MatrixType, column: Array<any>): void;
    end(name: string): void;
    eof(): void;
    error(err: Error): void;
}

export class NullHandler implements Handler {
    start(name: string) {}
    column(colnum: number, name: string, format: MatrixType, column: Array<any>): void {}
    end(name: string): void {}
    eof(): void {}
    error(err: Error): void {}
}