"use strict";
// This file defines an abstract class for a Retriever.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Retriever = void 0;
/**
 * Abstract base class for Retriever implementations.
 * This class provides a common structure for different types of retrievers.
 */
class Retriever {
    /**
     * Constructor for the Retriever class.
     * @param options - Configuration options for the retriever.
     */
    constructor(options) {
        // Initialize the options property with the provided options.
        this.options = options;
    }
}
exports.Retriever = Retriever;
//# sourceMappingURL=retriever.js.map