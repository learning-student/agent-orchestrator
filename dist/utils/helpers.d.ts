import { Transform, TransformCallback } from 'stream';
import { ToolInput } from '../types';
export declare class AccumulatorTransform extends Transform {
    private accumulator;
    constructor();
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
    extractTextFromChunk(chunk: any): string | null;
    getAccumulatedData(): string;
}
export declare function extractXML(text: string): string;
export declare function isClassifierToolInput(input: unknown): input is ToolInput;
