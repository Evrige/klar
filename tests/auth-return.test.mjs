import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAuthReturn} from '../src/sync/authReturn.ts';
test('password reset callback opens only the appropriate form and treats error links as invalid',()=>{
    assert.deepEqual(parseAuthReturn('?auth=reset-password&token=test-token'),{token:'test-token',open:true});
    assert.deepEqual(parseAuthReturn('?auth=reset-password&error=INVALID_TOKEN'),{notice:'invalid',open:true});
    assert.deepEqual(parseAuthReturn('?auth=reset-password&token='+ 'x'.repeat(4097)),{notice:'invalid',open:true});
    assert.deepEqual(parseAuthReturn('?token=unrelated'),{open:false});
});
test('verification and password change notices preserve no token in their parsed state',()=>{
    assert.deepEqual(parseAuthReturn('?auth=verified&token=ignored'),{notice:'verified',open:true});
    assert.deepEqual(parseAuthReturn('?auth=password-changed'),{notice:'password-changed',open:true});
});
