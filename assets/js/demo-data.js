/* Static GitHub Pages adapter. No server, analytics collection, or personal-data storage. */
'use strict';
window.NetworkDemo=(()=>{
 const base=new URL('./',location.href),config=window.DEMO_CONFIG||{},storageKey='btn-demo-v1:'+base.pathname;
 const empty=()=>({completed:0,invited:false,last_scenario:null,history:[]});
 let memory=empty(),dataset;
 function loadState(){try{const value=JSON.parse(localStorage.getItem(storageKey));if(value&&Number.isInteger(value.completed)&&value.completed>=0&&Array.isArray(value.history))return value;}catch(e){}return memory;}
 function saveState(s){memory=s;try{localStorage.setItem(storageKey,JSON.stringify(s))}catch(e){}}
 const ready=fetch(new URL('data/network.json',base)).then(r=>{if(!r.ok)throw Error('Could not load the sample network data. Check the data folder was uploaded.');return r.json()}).then(d=>{dataset=d;return d});
 const pending=new Map(),keys=new Map();let sequence=0;
 function status(){const s=loadState();const limit=Number.isInteger(config.attemptLimit)&&config.attemptLimit>=0?config.attemptLimit:3;return {...s,limit,csrf:''};}
 async function impact(id){await ready;const n=dataset.networks[String(id)];if(!n)throw Error('This scenario is unavailable.');const members=new Set(n.station_ids);return {impact:n.impact,stations:dataset.stations.filter(st=>members.has(st.id)),connections:n.connections};}
 async function request(endpoint,data={}){
  await ready;
  switch(endpoint){
   case 'network-scenarios':return {scenarios:dataset.scenarios,settings:dataset.settings};
   case 'session-status':return status();
   case 'partnership-packages':return {packages:dataset.packages,illustrative:true,referral_enabled:!!officialUrl()};
   case 'activate-network':{
    if(data.phase==='complete'){
     const a=pending.get(data.activation_id);if(!a||a.token!==data.completion_token)throw Error('Activation unavailable. Please choose a milestone again.');
     if(!a.done){const s=loadState();s.completed++;s.last_scenario=a.scenario;s.history.push({scenario_id:a.scenario,completed_at:new Date().toISOString()});s.history=s.history.slice(-50);saveState(s);a.done=true;}
     return status();
    }
    const payload=await impact(data.scenario_id);const existing=keys.get(data.request_key);if(existing){const a=pending.get(existing);if(a.scenario!==data.scenario_id)throw Error('Request key belongs to another scenario.');return {...payload,activation_id:existing,completion_token:a.token};}
    const id=++sequence,token=crypto.randomUUID?crypto.randomUUID():String(id)+'-'+Date.now();pending.set(id,{token,scenario:data.scenario_id,done:false});keys.set(data.request_key,id);return {...payload,activation_id:id,completion_token:token};
   }
   case 'track-event':if(data.event==='invitation_view'){const s=loadState();s.invited=true;saveState(s);}return {recorded:false,local_only:true};
   default:throw Error('This feature requires the full PHP/MySQL version.');
  }
 }
 function officialUrl(){if(!config.officialPartnershipUrl)return '';try{const u=new URL(config.officialPartnershipUrl);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch(e){return '';}}
 function reset(){memory=empty();try{localStorage.removeItem(storageKey)}catch(e){}location.reload();}
 return {ready,request,impact,officialUrl,reset};
})();
