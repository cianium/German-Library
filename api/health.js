import {allowReadOnly,end,logServerError,prepareRequest} from '../server/http-security.js';

export default async function handler(req,res){
  const requestId=prepareRequest(req,res);
  if(!allowReadOnly(req,res))return;
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'';
  try{
    if(!base||!key)throw new Error('Missing configuration');
    const response=await fetch(`${base}/rest/v1/published_articles?select=id&limit=1`,{
      headers:{apikey:key,Authorization:`Bearer ${key}`},
      signal:AbortSignal.timeout(5000)
    });
    if(!response.ok){const error=new Error('Dependency unavailable');error.status=response.status;throw error}
    return end(req,res,200,JSON.stringify({ok:true}),{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  }catch(error){
    logServerError('api/health',requestId,error);
    return end(req,res,503,JSON.stringify({ok:false}),{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  }
}
