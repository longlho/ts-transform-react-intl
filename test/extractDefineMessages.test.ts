import compile from '../compile'
import { resolve } from 'path'
import test from 'ava'

test('should be able to extract messages with our macro', t => {
    t.deepEqual(compile(resolve(__dirname, 'fixture/defineMessage.ts')), {
        '3nxZQB0eo3': {
            id: '3nxZQB0eo3',
            description: 'description bar',
            defaultMessage: 'defaultMessage bar',
        },
        jv83iiJolI: {
            id: 'jv83iiJolI',
            description: 'description foo',
            defaultMessage: 'defaultMessage foo',
        },
    })
    const strings = require('./fixture/defineMessage.js')
    t.deepEqual(strings.foo, {
        id: 'jv83iiJolI',
        defaultMessage: 'defaultMessage foo',
    })
    t.deepEqual(strings.bar, {
        id: '3nxZQB0eo3',
        defaultMessage: 'defaultMessage bar',
    })
})

test('should be able to extract messages with our macro under alias import', t => {
    t.deepEqual(compile(resolve(__dirname, 'fixture/messageAlias.ts')), {
        '3nxZQB0eo3': {
            id: '3nxZQB0eo3',
            description: 'description bar',
            defaultMessage: 'defaultMessage bar',
        },
        jv83iiJolI: {
            id: 'jv83iiJolI',
            description: 'description foo',
            defaultMessage: 'defaultMessage foo',
        },
    })
    const strings = require('./fixture/defineMessage.js')
    t.deepEqual(strings.foo, {
        id: 'jv83iiJolI',
        defaultMessage: 'defaultMessage foo',
    })
    t.deepEqual(strings.bar, {
        id: '3nxZQB0eo3',
        defaultMessage: 'defaultMessage bar',
    })
})
