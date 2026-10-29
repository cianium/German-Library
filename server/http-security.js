import crypto from 'node:crypto';

const REQUEST_ID=/^[A-Za-z0-9._:-]{8,128}$/;

export function prepareRequest(req,res){
  const incoming=String(req.headers?.['x-request-id']||'').trim();
  const requestId=REQUEST_ID.test(incoming)?incoming:crypto.randomUUID();
  res.setHeader('X-Request-ID',requestId);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  return requestId;
}

export function allowReadOnly(req,res){
  const method=req.method||'GET';
  if(method==='GET'||method==='HEAD')return true;
  res.statusCode=405;
  res.setHeader('Allow','GET, HEAD');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.end(method==='HEAD'?'':'Method not allowed');
  return false;
}

export function end(req,res,status,body,headers={}){
  res.statusCode=status;
  for(const [key,value] of Object.entries(headers))res.setHeader(key,value);
  res.end(req.method==='HEAD'?'':body);
}

export function logServerError(scope,requestId,error){
  console.error(JSON.stringify({
    level:'error',
    scope,
    requestId,
    name:error?.name||'Error',
    upstreamStatus:Number(error?.status)||undefined
  }));
}
