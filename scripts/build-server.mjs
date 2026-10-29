import {build} from 'esbuild';

// Bundle all local TypeScript, including the generated Prisma client and
// catalog modules. Runtime npm packages remain available to Vercel's tracer.
const result=await build({
    entryPoints:['server/handler.ts'],outfile:'server/build/handler.mjs',
    bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',
    metafile:true,logLevel:'info',
});
for(const output of Object.values(result.metafile.outputs)){
    if(output.imports.some(item=>item.external&&item.path.startsWith('.')&&/\.tsx?$/.test(item.path)))throw new Error('Uncompiled local TypeScript import in API bundle');
}
