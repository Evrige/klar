import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translateGloss} from '../src/lib/translateGloss.ts';

test('personal word translation sends only the requested word in the chosen German language pair',async()=>{
    for(const locale of ['ru','uk']){
        let called=0;
        const value=await translateGloss('Straße',locale,new AbortController().signal,async(url,options)=>{
            called++;const request=new URL(url);
            assert.equal(request.origin,'https://api.mymemory.translated.net');
            assert.equal(request.searchParams.get('q'),'Straße');
            assert.equal(request.searchParams.get('langpair'),`de|${locale}`);
            assert.equal(options.credentials,'omit');
            return new Response(JSON.stringify({responseStatus:200,responseData:{translatedText:locale==='ru'?'улица':'вулиця'}}));
        });
        assert.equal(called,1);assert.equal(value,locale==='ru'?'улица':'вулиця');
    }
});
test('word glosses reject quotas, broken responses and oversized input',async()=>{
    const signal=new AbortController().signal;
    await assert.rejects(translateGloss('Wort','ru',signal,async()=>new Response(JSON.stringify({responseStatus:200,quotaFinished:true,responseData:{translatedText:'warning'}}))));
    await assert.rejects(translateGloss('Wort','ru',signal,async()=>new Response('{}')));
    await assert.rejects(translateGloss('ä'.repeat(251),'ru',signal,async()=>{throw new Error('must not fetch');}),/INVALID_WORD/);
});
