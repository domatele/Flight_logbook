const DB="FlightLogbookDB", STORE="flights", ASTORE="aircraft";
let flights=[], aircraft=[], editId=null;
const $=id=>document.getElementById(id);
function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{let d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});if(!d.objectStoreNames.contains(ASTORE))d.createObjectStore(ASTORE,{keyPath:"id",autoIncrement:true});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function all(store){let d=await openDB();return new Promise((res,rej)=>{let r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(store,obj){let d=await openDB();return new Promise((res,rej)=>{let r=d.transaction(store,"readwrite").objectStore(store).put(obj);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function del(store,id){let d=await openDB();d.transaction(store,"readwrite").objectStore(store).delete(id)}
const mins=s=>{if(!s)return 0;let [h,m]=s.split(":").map(Number);return h*60+m};
const hhmm=m=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const timeInput=m=>hhmm(m);
function toast(t){$("toast").textContent=t;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",1800)}
async function refresh(){flights=await all(STORE);aircraft=await all(ASTORE);flights.sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.id-a.id));render()}
function render(){let total=flights.reduce((s,f)=>s+mins(f.duration),0),night=flights.reduce((s,f)=>s+mins(f.night),0),lands=flights.reduce((s,f)=>s+(+f.landings||0),0);$("totalTime").textContent=hhmm(total);$("nightTime").textContent=hhmm(night);$("landings").textContent=lands;$("flightCount").textContent=flights.length;
let recent=flights.slice(0,5);$("recent").innerHTML=recent.length?recent.map(card).join(""):'<div class="empty">No flights yet.</div>';renderFlights();renderAircraft()}
function card(f){return `<div class="flight"><div class="flightTop"><div><div class="route">${f.dep||"----"} → ${f.arr||"----"}</div><div class="meta">${f.date||""} · ${f.reg||""} · ${f.type||""}</div></div><strong>${f.duration||"00:00"}</strong></div><div class="meta">${f.flightNo||""}${f.pic&&f.pic!=="00:00"?" · PIC "+f.pic:""}${f.night&&f.night!=="00:00"?" · Night "+f.night:""}</div><div class="rowBtns"><button onclick="editFlight(${f.id})">Edit</button><button onclick="deleteFlight(${f.id})">Delete</button></div></div>`}
function renderFlights(){let q=($("search").value||"").toLowerCase();let x=flights.filter(f=>JSON.stringify(f).toLowerCase().includes(q));$("flightList").innerHTML=x.length?x.map(card).join(""):'<div class="empty">No matching flights.</div>'}
function renderAircraft(){$("aircraftList").innerHTML=aircraft.length?aircraft.map(a=>`<div class="aircraftRow"><div><b>${a.reg}</b><div class="meta">${a.type}${a.operator?" · "+a.operator:""}</div></div><button onclick="deleteAircraft(${a.id})">Delete</button></div>`).join(""):'<div class="empty">No aircraft saved.</div>'}
function showPage(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("selected",x.dataset.page===p));if(p==="flights")renderFlights()}
function openModal(f=null){editId=f?.id||null;$("modalTitle").textContent=f?"Edit flight":"Add flight";$("flightForm").reset();$("date").value=f?.date||new Date().toISOString().slice(0,10);["duration","night","pic","sic","dual","instruction","ifr"].forEach(k=>$(k).value=f?.[k]||"00:00");$("landingsInput").value=f?.landings??0;$("takeoffsInput").value=f?.takeoffs??0;["reg","type","flightNo","dep","arr","off","on","remarks"].forEach(k=>$(k).value=f?.[k]||"");$("modal").classList.remove("hidden")}
window.editFlight=id=>openModal(flights.find(f=>f.id===id));
window.deleteFlight=async id=>{if(confirm("Delete this flight?")){await del(STORE,id);refresh();toast("Flight deleted")}};
$("flightForm").onsubmit=async e=>{e.preventDefault();let f={id:editId,date:$("date").value,reg:$("reg").value.trim().toUpperCase(),type:$("type").value.trim(),flightNo:$("flightNo").value.trim(),dep:$("dep").value.trim().toUpperCase(),arr:$("arr").value.trim().toUpperCase(),off:$("off").value,on:$("on").value,duration:$("duration").value,night:$("night").value,landings:+$("landingsInput").value||0,takeoffs:+$("takeoffsInput").value||0,pic:$("pic").value,sic:$("sic").value,dual:$("dual").value,instruction:$("instruction").value,ifr:$("ifr").value,remarks:$("remarks").value};if(!f.id)delete f.id;await put(STORE,f);$("modal").classList.add("hidden");await refresh();toast("Flight saved")};
$("closeModal").onclick=$("cancel").onclick=()=>$("modal").classList.add("hidden");
$("addFlight").onclick=$("addTop").onclick=()=>openModal();
$("allFlights").onclick=()=>showPage("flights");$("search").oninput=renderFlights;
$("addAircraft").onclick=()=>{$("aircraftForm").reset();$("aircraftModal").classList.remove("hidden")};$("closeAircraft").onclick=$("cancelAircraft").onclick=()=>$("aircraftModal").classList.add("hidden");
$("aircraftForm").onsubmit=async e=>{e.preventDefault();await put(ASTORE,{reg:$("aReg").value.trim().toUpperCase(),type:$("aType").value.trim(),operator:$("aOperator").value.trim()});$("aircraftModal").classList.add("hidden");refresh();toast("Aircraft saved")};
window.deleteAircraft=async id=>{if(confirm("Delete this aircraft?")){await del(ASTORE,id);refresh()}};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function download(name,text,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function backup(){download("flight-logbook-backup.json",JSON.stringify({version:1,exported:new Date().toISOString(),flights,aircraft,settings:JSON.parse(localStorage.getItem("settings")||"{}")},null,2),"application/json")}
function csv(){let cols=["date","reg","type","flightNo","dep","arr","off","on","duration","night","pic","sic","dual","instruction","ifr","landings","takeoffs","remarks"];let esc=v=>`"${String(v??"").replaceAll('"','""')}"`;download("flight-logbook.csv",cols.join(",")+"\n"+flights.map(f=>cols.map(c=>esc(f[c])).join(",")).join("\n"),"text/csv")}
async function importFile(file){try{let x=JSON.parse(await file.text());if(!Array.isArray(x.flights))throw Error();for(let f of x.flights){let g={...f};delete g.id;await put(STORE,g)}for(let a of (x.aircraft||[])){let g={...a};delete g.id;await put(ASTORE,g)}if(x.settings)localStorage.setItem("settings",JSON.stringify(x.settings));await refresh();toast("Backup imported")}catch(e){alert("Invalid logbook backup.")}}
$("backupBtn").onclick=$("backupBtn2").onclick=backup;$("csvBtn").onclick=csv;
$("importInput").onchange=e=>e.target.files[0]&&importFile(e.target.files[0]);$("importInput2").onchange=e=>e.target.files[0]&&importFile(e.target.files[0]);
$("clearData").onclick=async()=>{if(confirm("Delete ALL flights and aircraft? Export a backup first.")){let d=await openDB();for(let s of [STORE,ASTORE])await new Promise(r=>{let q=d.transaction(s,"readwrite").objectStore(s).clear();q.onsuccess=r});refresh();toast("All data deleted")}};
let settings=JSON.parse(localStorage.getItem("settings")||"{}");$("ownerName").value=settings.name||"";$("ownerNotes").value=settings.notes||"";$("saveSettings").onclick=()=>{localStorage.setItem("settings",JSON.stringify({name:$("ownerName").value,notes:$("ownerNotes").value}));toast("Settings saved")};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
refresh();
