import { RetrievalOptions } from "./retriieverOptions";
/**
 * Abstract base class for Retriever implementations.
 * This class provides a common structure for different types of retrievers.
 */
export declare abstract class Retriever {
    protected options: any;
    /**
     * Constructor for the Retriever class.
     * @param options - Configuration options for the retriever.
     */
    constructor(options: any);
    /**
     * Abstract method for retrieving information based on input text.
     * This method must be implemented by all concrete subclasses.
     * @param text - The input text to base the retrieval on.
     * @param options - Optional retrieval options including userId and sessionId
     * @returns A Promise that resolves to the retrieved information.
     */
    abstract retrieve(text: any, options?: RetrievalOptions): Promise<any>;
    /**
     * Abstract method for retrieving information and combining results.
     * This method must be implemented by all concrete subclasses.
     * It's expected to perform retrieval and then combine or process the results in some way.
     * @param text - The input text to base the retrieval on.
     * @param options - Optional retrieval options including userId and sessionId
     * @returns A Promise that resolves to the combined retrieval results.
     */
    abstract retrieveAndCombineResults(text: any, options?: RetrievalOptions): Promise<any>;
    /**
     * Abstract method for retrieving information and generating something based on the results.
     * This method must be implemented by all concrete subclasses.
     * It's expected to perform retrieval and then use the results to generate new information.
     * @param text - The input text to base the retrieval on.
     * @param options - Optional retrieval options including userId and sessionId
     * @returns A Promise that resolves to the generated information based on retrieval results.
     */
    abstract retrieveAndGenerate(text: any, options?: RetrievalOptions): Promise<any>;
}
