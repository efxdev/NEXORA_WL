const SUPABASE_URL="https://mhkhckiqpxgbpaaslqga.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_u3M4IzCLppREM9LzMziTeA_6cnKJXmN";
const CAMPAIGN_BASELINE=1500;

function maskWallet(v){return v?`${v.slice(0,6)}••••${v.slice(-4)}`:"Anonymous"}
function getRef(){return new URLSearchParams(location.search).get("ref")||""}
function renderTasks(){
 const box=document.querySelector("#tasks");
 box.innerHTML=(window.NEXORA_TASKS||[]).filter(t=>t.active).map(t=>`<article class="task"><div class="task-icon">${t.icon}</div><h3>${t.title}</h3><p>${t.description}</p><a class="btn primary" target="_blank" rel="noopener" href="${t.link}">COMPLETE TASK →</a></article>`).join("");
}
async function api(path,opt={}){
 const r=await fetch(SUPABASE_URL+path,{...opt,headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json",...(opt.headers||{})}});
 if(!r.ok)throw new Error(await r.text()); return r;
}
async function loadStats(){
 try{
  const r=await api("/rest/v1/whitelist_applications?select=id",{headers:{Prefer:"count=exact"}});
  const n=r.headers.get("content-range")?.split("/")[1]||"0";
  document.querySelector("#applicationCount").textContent=Number(n).toLocaleString();
 }catch(e){document.querySelector("#applicationCount").textContent="LIVE";}
}
async function loadLeaderboard(){
 const box=document.querySelector("#leaderboard");
 try{
  const r=await api("/rest/v1/whitelist_applications?select=referral_code,evm_address,referral_count,campaign_rank&order=campaign_rank.asc&limit=10");
  const rows=await r.json();
  if(!rows.length){box.innerHTML='<p class="loading">Leaderboard will appear as verified applications arrive.</p>';return}
  box.innerHTML=rows.map((x,i)=>`<div class="lb-row"><span class="lb-rank">#${x.campaign_rank||"—"}</span><span>${maskWallet(x.evm_address)}</span><span class="lb-ref">${x.referral_count||0} REFERRALS</span></div>`).join("");
 }catch(e){box.innerHTML='<p class="loading">Leaderboard will appear when campaign data is available.</p>'}
}
function referralCode(){return "NEX"+crypto.randomUUID().replaceAll("-","").slice(0,10).toUpperCase()}
function evmValid(v){return /^0x[a-fA-F0-9]{40}$/.test(v)}
function progress(refs){
 const milestones=[10,50,100,250], next=milestones.find(x=>refs<x)||250;
 const prev=[0,...milestones].filter(x=>x<=refs).pop()||0;
 const pct=next===prev?100:Math.min(100,((refs-prev)/(next-prev))*100);
 document.querySelector("#refCount").textContent=`${refs} VALID REFERRALS`;
 document.querySelector("#progressBar").style.width=pct+"%";
 document.querySelector("#nextBoost").textContent=refs>=250?"ELITE BOOST UNLOCKED":`${next-refs} MORE REFERRALS TO NEXT MILESTONE`;
}
async function submit(e){
 e.preventDefault();
 const email=emailEl.value.trim().toLowerCase(), twitter=twitterEl.value.trim(), telegram=telegramEl.value.trim(), wallet=walletEl.value.trim();
 const button=e.target.querySelector("button"); if(!evmValid(wallet)){alert("Please enter a valid EVM address (0x + 40 hexadecimal characters).");return}
 button.disabled=true;button.textContent="VERIFYING APPLICATION…";
 const code=referralCode(), ref=getRef()||null;
 const payload={email,twitter_username:twitter,telegram_username:telegram,evm_address:wallet,referral_code:code,referred_by:ref,referral_count:0};
 try{
  // Database trigger assigns campaign_rank safely and handles referral count.
  const r=await api("/rest/v1/whitelist_applications",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
  const [saved]=await r.json();
  e.target.closest(".apply-section").classList.add("hidden");
  const success=document.querySelector("#success");success.classList.remove("hidden");success.scrollIntoView({behavior:"smooth"});
  document.querySelector("#rankResult").textContent="#"+(saved.campaign_rank||CAMPAIGN_BASELINE+1);
  const link=location.origin+location.pathname+"?ref="+encodeURIComponent(saved.referral_code);
  document.querySelector("#refLink").textContent=link;
  document.querySelector("#copyRef").onclick=async()=>{await navigator.clipboard.writeText(link);document.querySelector("#copyRef").textContent="COPIED";setTimeout(()=>document.querySelector("#copyRef").textContent="COPY",1500)}
  progress(saved.referral_count||0); loadStats();loadLeaderboard();
 }catch(err){
  console.error(err);
  let msg="Application could not be submitted. Please try again.";
  if(String(err.message).includes("duplicate"))msg="Duplicate application detected. Each participant may submit only once.";
  alert(msg);
 }finally{button.disabled=false;button.textContent="SUBMIT WHITELIST APPLICATION →"}
}
const emailEl=document.querySelector("#email"),twitterEl=document.querySelector("#twitter"),telegramEl=document.querySelector("#telegram"),walletEl=document.querySelector("#wallet");
document.addEventListener("DOMContentLoaded",()=>{renderTasks();loadStats();loadLeaderboard();document.querySelector("#referrer").value=getRef();document.querySelector("#whitelistForm").addEventListener("submit",submit)});
