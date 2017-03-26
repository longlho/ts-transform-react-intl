/// <reference types="react-intl" />
import * as ts from 'typescript';
import { Messages } from 'react-intl';
export declare const DEFINE_MESSAGES_HOOK = "defineMessages";
export declare type Extractor = (messages: Messages) => void;
export interface Opts {
    idPrefix?: string;
    onMsgExtracted?: Extractor;
}
export default function (opts: Opts): (ctx: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
