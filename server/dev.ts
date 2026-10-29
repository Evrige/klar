import 'dotenv/config';
import {createServer} from 'node:http';
import handler from './handler.ts';
import type {VercelRequest,VercelResponse} from './vercel.ts';
export function createLocalServer(){
  return createServer(async(req,res)=>{
    const url=new URL(req.url??'/','http://localhost:3000'),parts:Buffer[]=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){res.writeHead(413,{'Cache-Control':'private, no-store'}).end();return;}parts.push(chunk);}
    const request=req as VercelRequest;request.query={...Object.fromEntries(url.searchParams),path:url.pathname.replace(/^\/api\/?/,'')};request.body=Buffer.concat(parts).toString()||undefined;
    const response=res as VercelResponse;response.status=(code:number)=>{res.statusCode=code;return response;};response.json=(body:unknown)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));return response;};await handler(request,response);
  });
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/server/dev.ts'))createLocalServer().listen(3000,'127.0.0.1',()=>console.log('Klar API http://localhost:3000'));
