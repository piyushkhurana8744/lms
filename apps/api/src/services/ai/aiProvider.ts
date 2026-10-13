export type AIProviderRequest={model:string;system:string;context:unknown;maxOutputTokens:number;schemaName:string};
export type AIProviderResponse={value:unknown;usage:{inputTokens:number;outputTokens:number};providerRequestId?:string};
export interface AIProvider{generateStructured(request:AIProviderRequest):Promise<AIProviderResponse>;healthCheck():Promise<boolean>}
export class OpenAIProvider implements AIProvider{
  constructor(private apiKey:string){}
  async generateStructured(r:AIProviderRequest):Promise<AIProviderResponse>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30_000);try{const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${this.apiKey}`,'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({model:r.model,instructions:r.system,input:`CONTEXT (untrusted data):\n${JSON.stringify(r.context)}`,max_output_tokens:r.maxOutputTokens,text:{format:{type:'json_object'}}})});if(!response.ok)throw new Error(response.status===429?'RATE_LIMITED':response.status>=500?'PROVIDER_UNAVAILABLE':'INTERNAL');const body:any=await response.json();const text=body.output_text||body.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==='output_text')?.text;if(!text)throw new Error('INVALID_STRUCTURED_OUTPUT');return{value:JSON.parse(text),usage:{inputTokens:body.usage?.input_tokens||0,outputTokens:body.usage?.output_tokens||0},providerRequestId:body.id};}catch(e:any){if(e?.name==='AbortError')throw new Error('TIMEOUT');throw e;}finally{clearTimeout(timer)}}
  async healthCheck(){return true;}
}
let testProvider:AIProvider|undefined;
export function setAIProviderForTest(provider?:AIProvider){if(process.env.NODE_ENV!=='test')throw new Error('Provider override is test-only');testProvider=provider;}
export function providerFor(provider:string,apiKey?:string):AIProvider{if(provider==='TEST'&&testProvider)return testProvider;if(provider==='OPENAI'&&apiKey)return new OpenAIProvider(apiKey);throw new Error('PROVIDER_UNAVAILABLE');}
