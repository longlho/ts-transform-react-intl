/// <reference types="react-intl" />
import { Messages } from 'react-intl';
import { Extractor } from './transform';
/**
 * Aggregate messages, inline modify msgs
 *
 * @export
 * @param {Messages} msgs messages map to aggregate to
 * @returns {Extractor} extractor fn
 */
export default function aggregate(msgs: Messages): Extractor;
