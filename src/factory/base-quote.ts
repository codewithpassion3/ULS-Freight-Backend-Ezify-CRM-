import { IQuote } from "src/interfaces/IQuote.inteface";

export abstract class BaseQuote implements IQuote {
    abstract validateAndReturn(): void;
}