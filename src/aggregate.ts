import { Messages } from 'react-intl'
import { Extractor } from './transform'

/**
 * Aggregate messages, inline modify msgs
 *
 * @export
 * @param {Messages} msgs messages map to aggregate to
 * @returns {Extractor} extractor fn
 */
export default function aggregate(msgs: Messages): Extractor {
    const defaultMessages = Object.keys(msgs).reduce(
        (all, k) => {
            all[msgs[k].defaultMessage] = msgs[k]
            return all
        },
        {} as Messages
    )

    return (trans: Messages) =>
        Object.keys(trans).forEach(k => {
            const msg = trans[k]
            const { id, description, defaultMessage } = trans[k]
            // Throw an error if we have messages with the same ID but different
            // description & defaultMessage
            if (
                msgs[id] &&
                (msgs[id].description !== msg.description || msgs[id].defaultMessage !== msg.defaultMessage)
            ) {
                console.error(`
--- [ERR] Translation key ${k} already exists ---
Description: "${msgs[id].description}" vs "${description}"
Default Message: "${msgs[id].defaultMessage}" vs "${defaultMessage}"
`)
                return process.exit(1)
            }

            // Warn if we have 2 messages with the same defaultMessage,
            // but different ID/description
            // For ex: Close can be Close Price or Close button
            if (
                defaultMessages[defaultMessage] &&
                (defaultMessages[defaultMessage].description !== msg.description ||
                    defaultMessages[defaultMessage].id !== msg.id)
            ) {
                console.warn(`
--- [WARN]: Default Message ${defaultMessage} already exists ---
Description: "${defaultMessages[defaultMessage].description}" vs "${description}"
ID: "${defaultMessages[defaultMessage].id}" vs "${id}"
`)
            }
            msgs[id] = msg
            defaultMessages[defaultMessage] = msg
        })
}
