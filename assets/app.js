
const SUPABASE_URL=""; // add your Supabase URL
const SUPABASE_ANON_KEY=""; // add your publishable/anon key
function renderTasks(){const b=document.querySelector("#tasks");if(!b)return;b.innerHTML=(window.NEXORA_TASKS||[]).filter(x=>x.active).map(t=>`<article class="card"><div class="icon">${t.icon}</div><h3>${t.title}</h3><p class="muted">${t.description}</p><div class="tasklink"><a class="btn primary" href="${t.link}" target="_blank" rel="noopener">COMPLETE TASK →</a></div></article>`).join("")}
async function submitWhitelist(e){e.preventDefault();const email=document.querySelector("#email").value.trim(),twitter=document.querySelector("#twitter").value.trim(),telegram=document.querySelector("#telegram").value.trim(),wallet=document.querySelector("#wallet").value.trim(),out=document.querySelector("#result");if(!email||!twitter||!telegram||!wallet)return;
 const data={email,twitter_username:twitter,telegram_username:telegram,bnb_address:wallet};
 try{
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY) throw new Error("CONFIG");
  const r=await fetch(SUPABASE_URL+"/rest/v1/whitelist_applications",{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(data)});
  if(!r.ok)throw new Error(await r.text());
  out.style.display="block";out.innerHTML="✓ APPLICATION SUBMITTED SUCCESSFULLY. Your whitelist information has been received.";e.target.reset();
 }catch(err){out.style.display="block";out.innerHTML=(!SUPABASE_URL?"Demo mode: add Supabase configuration in assets/app.js to save submissions to your database.":"Submission could not be saved. Please check the database configuration.");}
}
document.addEventListener("DOMContentLoaded",()=>{renderTasks();document.querySelector("#whitelistForm")?.addEventListener("submit",submitWhitelist)})
