"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccumulatorTransform = void 0;
exports.extractXML = extractXML;
exports.isClassifierToolInput = isClassifierToolInput;
const stream_1 = require("stream");
class AccumulatorTransform extends stream_1.Transform {
    constructor() {
        super({
            objectMode: true // This allows the transform to handle object chunks
        });
        this.accumulator = '';
    }
    _transform(chunk, encoding, callback) {
        const text = this.extractTextFromChunk(chunk);
        if (text) {
            this.accumulator += text;
            // @ts-ignore
            this.push(text); // Push the text, not the original chunk
        }
        callback();
    }
    extractTextFromChunk(chunk) {
        var _a, _b;
        if (typeof chunk === 'string') {
            return chunk;
        }
        else if ((_b = (_a = chunk.contentBlockDelta) === null || _a === void 0 ? void 0 : _a.delta) === null || _b === void 0 ? void 0 : _b.text) {
            return chunk.contentBlockDelta.delta.text;
        }
        // Add more conditions here if there are other possible structures
        return null;
    }
    getAccumulatedData() {
        return this.accumulator;
    }
}
exports.AccumulatorTransform = AccumulatorTransform;
function extractXML(text) {
    const xmlRegex = /<response>[\s\S]*?<\/response>/;
    const match = text.match(xmlRegex);
    return match ? match[0] : null;
}
function isClassifierToolInput(input) {
    return (typeof input === 'object' &&
        input !== null &&
        'userinput' in input &&
        'selected_agent' in input &&
        'confidence' in input);
}
//# sourceMappingURL=helpers.js.map