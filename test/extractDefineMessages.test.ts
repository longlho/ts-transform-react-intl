import compile from '../compile'
import { resolve } from 'path'
import { expect } from 'chai'

describe('extractDefineMessages', function () {
    it('should be able to extract messages', function () {
        expect(compile(resolve(__dirname, 'fixture/*.ts'))).to.deep.equal({
            'ts-transform-react-intl_bar': {
                id: 'ts-transform-react-intl_bar',
                description: 'description bar',
                defaultMessage: 'defaultMessage bar'
            },
            'ts-transform-react-intl_foo': {
                id: 'ts-transform-react-intl_foo',
                description: 'description foo',
                defaultMessage: 'defaultMessage foo',
            }
        })

        expect(require('./fixture/defineMessage.js').default).to.deep.equal({
            foo: {
                id: "ts-transform-react-intl_foo",
                description: "description foo",
                defaultMessage: "defaultMessage foo"
            },
            bar: {
                id: "ts-transform-react-intl_bar",
                description: "description bar",
                defaultMessage: "defaultMessage bar"
            }
        })
    })
})