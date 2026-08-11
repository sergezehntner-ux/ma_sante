const KEY='ma-sante-v02001';
const OLD_KEYS=['ma-sante-v0200','ma-sante-v0192','ma-sante-v0191','ma-sante-v019','ma-sante-v017','ma-sante-v0183','ma-sante-v0182','ma-sante-v0171','ma-sante-v016','ma-sante-v015','ma-sante-v014','ma-sante-v013','ma-sante-v012','ma-sante-v011','ma-sante-v01'];
function uid(){return(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
function freshDefault(){return{schemaVersion:4,treatments:[],pharmacy:[],takes:{},history:[],measures:[],measureHistory:[],prescriptions:[],contacts:[]}}
function migrate(data){if(!data||typeof data!=='object')data=freshDefault();data.schemaVersion=4;data.pharmacy=Array.isArray(data.pharmacy)?data.pharmacy:[];data.treatments=Array.isArray(data.treatments)?data.treatments:[];data.takes=data.takes||{};data.history=Array.isArray(data.history)?data.history:[];data.measures=Array.isArray(data.measures)?data.measures:[];data.measureHistory=Array.isArray(data.measureHistory)?data.measureHistory:[];data.prescriptions=Array.isArray(data.prescriptions)?data.prescriptions:[];data.contacts=Array.isArray(data.contacts)?data.contacts:[];
 data.treatments=data.treatments.map(t=>({...t,information:t.information||'',periodicity:t.periodicity||'daily',weekdays:Array.isArray(t.weekdays)?t.weekdays:[],monthDays:Array.isArray(t.monthDays)?t.monthDays:[],schedule:Array.isArray(t.schedule)?t.schedule:[]}));
 // Every existing treatment is guaranteed to have a pharmacy record.
 data.treatments.forEach(t=>{let p=t.pharmacyId?data.pharmacy.find(x=>x.id===t.pharmacyId):null;if(!p)p=data.pharmacy.find(x=>(x.name||'').toLowerCase()===(t.name||'').toLowerCase()&&(x.strength||'')===(t.strength||''));if(!p){p={id:uid(),name:t.name||'Sans nom',strength:t.strength||'',unit:t.unit||'unité',stock:Number(t.stock||0),expiry:t.expiry||'',information:t.information||'',photo:t.photo||''};data.pharmacy.push(p)}t.pharmacyId=p.id});
 data.pharmacy=data.pharmacy.map(p=>{const q={...p};q.threshold=Number(q.threshold||0);if(!Array.isArray(q.lots)||!q.lots.length){const s=Number(q.stock||0);q.lots=s>0?[{id:uid(),qty:s,expiry:q.expiry||''}]:[]}q.lots=q.lots.map(l=>({id:l.id||uid(),qty:Number(l.qty||0),expiry:l.expiry||''})).filter(l=>l.qty>0);q.stock=q.lots.reduce((s,l)=>s+l.qty,0);q.expiry=(q.lots.filter(l=>l.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]||{}).expiry||'';return q});

 data.prescriptions.forEach(r=>{
   if(!r.prescriberContactId && r.prescriber){
     let c=data.contacts.find(x=>((x.firstName||'')+' '+(x.lastName||'')).trim()===r.prescriber);
     if(!c){
       c={id:uid(),type:'Médecin',firstName:'',lastName:r.prescriber,specialty:'',reference:'',phone:'',mobile:'',email:'',address:'',zip:'',city:'',website:'',notes:'Importé depuis une ancienne ordonnance',primary:false};
       data.contacts.push(c);
     }
     r.prescriberContactId=c.id;
   }
 });
 return data}
function load(){try{for(const k of[KEY,...OLD_KEYS]){const raw=localStorage.getItem(k);if(raw)return migrate(JSON.parse(raw))}return freshDefault()}catch(e){console.error(e);return freshDefault()}}
let db=load();
async function migrateLegacyPharmacyImages(){let changed=false;for(const p of db.pharmacy||[]){if(p.photo&&typeof p.photo==='string'&&p.photo.startsWith('data:image/')){try{const blob=await (await fetch(p.photo)).blob(),key=p.id||uid();await imgPut(key,blob);p.imageKey=key;p.photo='';changed=true}catch(e){}}}if(changed)save()}

const [today,todayDate,prnBtn,todayList,todayMeasures,todayHistoryCount,todayHistory,treatments,openTreatmentForm,treatmentList,treatmentFormPanel,formTitle,editId,treatmentProduct,treatmentProductInfo,reason,reasonOther,instruction,instructionOther,information,start,end,periodicity,weeklyOptions,monthlyOptions,monthDays,scheduleRows,addSchedule,saveTreatment,cancelEdit,openMeasureForm,measureList,measureFormPanel,measureFormTitle,measureEditId,measureType,measureTypeOther,measureUnit,measureUnitOther,measureInfo,measurePeriodicity,measureWeeklyOptions,measureMonthlyOptions,measureMonthDays,measureTime,saveMeasure,cancelMeasure,pillbox,printWeek,weekStart,weekDays,generateWeek,weekPlan,pharmacy,openPharmacyForm,importPharmacyBtn,importPharmacyFile,pharmacyList,pharmacyFilter,pharmacyFormPanel,pharmacyFormTitle,pharmacyEditId,phName,phStrength,phUnit,phUnitOther,phThreshold,phStockTotal,phLots,addPhLot,phCamera,phPhoto,phPhotoView,phPhotoDelete,phPhotoStatus,phInformation,savePharmacy,cancelPharmacy,prescriptions,openPrescriptionForm,prescriptionList,prescriptionFormPanel,prescriptionFormTitle,prescriptionEditId,prescriptionProduct,prescriber,issueDate,validUntil,renewalsAllowed,renewalsUsed,prescriptionPdf,prescriptionPdfStatus,viewPrescriptionPdf,removePrescriptionPdf,prescriptionNotes,savePrescription,cancelPrescription,more,fullHistory,exportBtn,importFile,takeModal,takeModalTitle,takeTreatmentId,takePlannedTime,takeQty,takeUnit,takeDate,takeTime,takeNote,confirmTake,prnChoiceModal,prnChoiceList,prnTakeModal,prnTakeTitle,prnPharmacyId,prnQty,prnUnit,prnDate,prnTime,prnNote,confirmPrn,measureModal,measureModalTitle,measureDefinitionId,measureValue,measureDate,measureActualTime,measureNote,confirmMeasure]=['today','todayDate','prnBtn','todayList','todayMeasures','todayHistoryCount','todayHistory','treatments','openTreatmentForm','treatmentList','treatmentFormPanel','formTitle','editId','treatmentProduct','treatmentProductInfo','reason','reasonOther','instruction','instructionOther','information','start','end','periodicity','weeklyOptions','monthlyOptions','monthDays','scheduleRows','addSchedule','saveTreatment','cancelEdit','openMeasureForm','measureList','measureFormPanel','measureFormTitle','measureEditId','measureType','measureTypeOther','measureUnit','measureUnitOther','measureInfo','measurePeriodicity','measureWeeklyOptions','measureMonthlyOptions','measureMonthDays','measureTime','saveMeasure','cancelMeasure','pillbox','printWeek','weekStart','weekDays','generateWeek','weekPlan','pharmacy','openPharmacyForm','importPharmacyBtn','importPharmacyFile','pharmacyList','pharmacyFilter','pharmacyFormPanel','pharmacyFormTitle','pharmacyEditId','phName','phStrength','phUnit','phUnitOther','phThreshold','phStockTotal','phLots','addPhLot','phCamera','phPhoto','phPhotoView','phPhotoDelete','phPhotoStatus','phInformation','savePharmacy','cancelPharmacy','prescriptions','openPrescriptionForm','prescriptionList','prescriptionFormPanel','prescriptionFormTitle','prescriptionEditId','prescriptionProduct','prescriber','issueDate','validUntil','renewalsAllowed','renewalsUsed','prescriptionPdf','prescriptionPdfStatus','viewPrescriptionPdf','removePrescriptionPdf','prescriptionNotes','savePrescription','cancelPrescription','more','fullHistory','exportBtn','importFile','takeModal','takeModalTitle','takeTreatmentId','takePlannedTime','takeQty','takeUnit','takeDate','takeTime','takeNote','confirmTake','prnChoiceModal','prnChoiceList','prnTakeModal','prnTakeTitle','prnPharmacyId','prnQty','prnUnit','prnDate','prnTime','prnNote','confirmPrn','measureModal','measureModalTitle','measureDefinitionId','measureValue','measureDate','measureActualTime','measureNote','confirmMeasure'].map(id=>document.getElementById(id));

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(db))}
  catch(e){console.error('Erreur de sauvegarde',e);alert("Impossible d'enregistrer les données : "+(e.message||e));return false}
  try{renderAll()}
  catch(e){console.error('Erreur d’affichage après sauvegarde',e);alert("Les données ont été enregistrées, mais l'affichage a rencontré une erreur : "+(e.message||e))}
  return true
}
function esc(x=''){return String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function isoDay(d=new Date()){let x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}function currentTime(){return new Date().toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'})}function fmtDate(s){return new Date(s+'T12:00:00').toLocaleDateString('fr-CH',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
function openModal(id){document.getElementById(id).classList.add('open')}function closeModal(id){
 const modal=document.getElementById(id);
 if(id==='pdfViewerModal'){
   if(activePdfRenderTask){try{activePdfRenderTask.cancel()}catch(_){}activePdfRenderTask=null}
   if(activePdfDoc){try{activePdfDoc.destroy()}catch(_){}activePdfDoc=null}
   const canvas=document.getElementById('pdfCanvas');
   if(canvas){canvas.width=1;canvas.height=1;canvas.style.width='1px';canvas.style.height='1px'}
   activePdfPage=1;activePdfScale=1;
 }
 modal.classList.remove('open');
}document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(b.dataset.view).classList.add('active');renderAll()});
function alpha(a,b){return(a||'').localeCompare(b||'','fr',{sensitivity:'base'})}
function pharmacyItem(id){return db.pharmacy.find(p=>p.id===id)}
const PDF_DB='ma-sante-pdf-v1',PDF_STORE='pdfs';
const IMG_DB='ma-sante-images-v1',IMG_STORE='images';
function imgDb(){return new Promise((ok,ko)=>{const r=indexedDB.open(IMG_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IMG_STORE))r.result.createObjectStore(IMG_STORE)};r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function imgPut(id,file){const d=await imgDb();return new Promise((ok,ko)=>{const t=d.transaction(IMG_STORE,'readwrite');t.objectStore(IMG_STORE).put(file,id);t.oncomplete=()=>{d.close();ok()};t.onerror=()=>{d.close();ko(t.error)}})}
async function imgGet(id){if(!id)return null;const d=await imgDb();return new Promise((ok,ko)=>{const r=d.transaction(IMG_STORE,'readonly').objectStore(IMG_STORE).get(id);r.onsuccess=()=>{d.close();ok(r.result||null)};r.onerror=()=>{d.close();ko(r.error)}})}
async function imgDel(id){if(!id)return;const d=await imgDb();return new Promise((ok,ko)=>{const t=d.transaction(IMG_STORE,'readwrite');t.objectStore(IMG_STORE).delete(id);t.oncomplete=()=>{d.close();ok()};t.onerror=()=>{d.close();ko(t.error)}})}
let pharmacyImageRemovePending=false;
function pdfDb(){return new Promise((ok,ko)=>{try{const q=indexedDB.open(PDF_DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(PDF_STORE))q.result.createObjectStore(PDF_STORE)};q.onsuccess=()=>ok(q.result);q.onerror=()=>ko(q.error)}catch(e){ko(e)}})}
async function pdfPut(id,file){const d=await pdfDb();return new Promise((ok,ko)=>{const t=d.transaction(PDF_STORE,'readwrite');t.objectStore(PDF_STORE).put(file,id);t.oncomplete=()=>{d.close();ok()};t.onerror=()=>{d.close();ko(t.error)}})}
async function pdfGet(id){const d=await pdfDb();return new Promise((ok,ko)=>{const t=d.transaction(PDF_STORE,'readonly'),q=t.objectStore(PDF_STORE).get(id);q.onsuccess=()=>{d.close();ok(q.result||null)};q.onerror=()=>{d.close();ko(q.error)}})}
async function pdfDel(id){const d=await pdfDb();return new Promise((ok,ko)=>{const t=d.transaction(PDF_STORE,'readwrite');t.objectStore(PDF_STORE).delete(id);t.oncomplete=()=>{d.close();ok()};t.onerror=()=>{d.close();ko(t.error)}})}
let activePdfDoc=null,activePdfPage=1,activePdfScale=1,activePdfRenderTask=null;

function configurePdfJs(){
 if(!window.pdfjsLib)return false;
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 return true;
}

async function renderActivePdfPage(){
 if(!activePdfDoc)return;
 const canvas=document.getElementById('pdfCanvas');
 const wrap=document.getElementById('pdfCanvasWrap');
 const label=document.getElementById('pdfPageLabel');
 const zoom=document.getElementById('pdfZoomLabel');
 const err=document.getElementById('pdfViewerError');
 try{
   if(activePdfRenderTask){try{activePdfRenderTask.cancel()}catch(_){}}
   const page=await activePdfDoc.getPage(activePdfPage);
   const base=page.getViewport({scale:1});
   const available=Math.max(280,(wrap.clientWidth||window.innerWidth)-28);
   const fit=Math.min(2,available/base.width);
   const viewport=page.getViewport({scale:fit*activePdfScale});
   const ratio=window.devicePixelRatio||1;
   canvas.width=Math.floor(viewport.width*ratio);
   canvas.height=Math.floor(viewport.height*ratio);
   canvas.style.width=Math.floor(viewport.width)+'px';
   canvas.style.height=Math.floor(viewport.height)+'px';
   const ctx=canvas.getContext('2d',{alpha:false});
   ctx.setTransform(ratio,0,0,ratio,0,0);
   activePdfRenderTask=page.render({canvasContext:ctx,viewport});
   await activePdfRenderTask.promise;
   activePdfRenderTask=null;
   label.textContent=`Page ${activePdfPage} / ${activePdfDoc.numPages}`;
   zoom.textContent=Math.round(activePdfScale*100)+' %';
   document.getElementById('pdfPrev').disabled=activePdfPage<=1;
   document.getElementById('pdfNext').disabled=activePdfPage>=activePdfDoc.numPages;
   err.classList.add('hidden');
   wrap.scrollTop=0;wrap.scrollLeft=0;
 }catch(e){
   if(e?.name==='RenderingCancelledException')return;
   console.error(e);
   err.textContent='Impossible d’afficher cette page : '+(e.message||e);
   err.classList.remove('hidden');
 }
}

async function openPrescriptionPdf(id){
 const err=document.getElementById('pdfViewerError');
 try{
   const f=await pdfGet(id);
   if(!f)return alert('Aucun PDF associé.');
   openModal('pdfViewerModal');
   document.getElementById('pdfViewerTitle').textContent='Ordonnance scannée';
   document.getElementById('pdfViewerInfo').textContent=f.name||'Document PDF';
   err.textContent='Chargement du document…';err.classList.remove('hidden');
   if(!configurePdfJs()){
     err.textContent='Le lecteur PDF intégré n’a pas pu être chargé. Vérifie la connexion Internet puis réessaie.';
     return;
   }
   const bytes=new Uint8Array(await f.arrayBuffer());
   activePdfDoc=await pdfjsLib.getDocument({data:bytes}).promise;
   activePdfPage=1;activePdfScale=1;
   await renderActivePdfPage();
 }catch(e){
   console.error(e);
   err.textContent='Impossible d’ouvrir le PDF : '+(e.message||e);
   err.classList.remove('hidden');
   openModal('pdfViewerModal');
 }
}
let prescriptionDraft=null,pdfRemovePending=false;
function normalizeLots(p){if(!p)return p;p.lots=Array.isArray(p.lots)?p.lots:[];p.lots=p.lots.filter(l=>Number(l.qty||0)>0);p.stock=p.lots.reduce((s,l)=>s+Number(l.qty||0),0);p.expiry=(p.lots.filter(l=>l.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]||{}).expiry||'';return p}
function consumeStock(p,qty){normalizeLots(p);let left=Number(qty||0);[...p.lots].sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999')).forEach(l=>{if(left<=0)return;const n=Math.min(l.qty,left);l.qty-=n;left-=n});normalizeLots(p)}
function restoreStock(p,qty){normalizeLots(p);let l=p.lots.find(x=>!x.expiry);if(!l){l={id:uid(),qty:0,expiry:''};p.lots.push(l)}l.qty+=Number(qty||0);normalizeLots(p)}
function stockWarning(p){return Number(p.stock||0)<=Number(p.threshold||0)}
function unitAbbr(u=''){const s=u.toLowerCase();if(s.includes('comprim'))return'cpr';if(s.includes('caps'))return'cps';if(s.includes('gél'))return'gél.';if(s.includes('unité'))return'U';if(s.includes('millil'))return'ml';return u}
function getTreatmentProduct(t){return pharmacyItem(t.pharmacyId)||t}
function activeOn(t,date){return(!t.start||date>=t.start)&&(!t.end||date<=t.end)}function applies(periodicity,weekdays,monthDays,dateStr,start='',end=''){if(start&&dateStr<start)return false;if(end&&dateStr>end)return false;const d=new Date(dateStr+'T12:00:00');if((periodicity||'daily')==='daily')return true;if(periodicity==='weekly')return(weekdays||[]).map(Number).includes(d.getDay());if(periodicity==='monthly')return(monthDays||[]).map(Number).includes(d.getDate());return true}function appliesTreatment(t,d){return applies(t.periodicity,t.weekdays,t.monthDays,d,t.start,t.end)}function appliesMeasure(m,d){return applies(m.periodicity,m.weekdays,m.monthDays,d)}
function instructionPriority(text){const s=(text||'').toLowerCase();if(s.includes('à jeun'))return 0;if(s.includes('avant'))return 1;if(s.includes('pendant'))return 2;if(s.includes('après'))return 3;return 4}function periodicityLabel(t){if((t.periodicity||'daily')==='daily')return'Tous les jours';if(t.periodicity==='weekly'){const n=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];return(t.weekdays||[]).map(x=>n[Number(x)]).join(', ')}return'Jour(s) '+(t.monthDays||[]).join(', ')+' du mois'}
function getCatalog(kind){const vals=new Set();if(kind==='unit'){db.pharmacy.forEach(p=>p.unit&&vals.add(p.unit));db.measures.forEach(m=>m.unit&&vals.add(m.unit))}else if(kind==='reason'||kind==='instruction'){db.treatments.forEach(t=>t[kind]&&vals.add(t[kind]))}else if(kind==='measureType'){db.measures.forEach(m=>m.type&&vals.add(m.type))}return[...vals].sort(alpha)}
function dynamicSelect(selectId,otherId,kind,current=''){const sel=document.getElementById(selectId),vals=getCatalog(kind);sel.innerHTML='<option value="">— Choisir —</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__OTHER__">Autre…</option>';if(current&&vals.includes(current))sel.value=current;else if(current){sel.value='__OTHER__';document.getElementById(otherId).value=current}else sel.value='';syncOther(selectId,otherId)}function syncOther(s,i){document.getElementById(i).classList.toggle('hidden',document.getElementById(s).value!=='__OTHER__')}function selectedOrOther(s,i){return document.getElementById(s).value==='__OTHER__'?document.getElementById(i).value.trim():document.getElementById(s).value}
function fillProductSelect(id,current=''){const sel=document.getElementById(id),list=[...db.pharmacy].sort((a,b)=>alpha(a.name,b.name));const tail=id==='prescriptionProduct'?'<option value="__NEW__">＋ Nouveau médicament…</option>':'';sel.innerHTML='<option value="">— Choisir dans Pharmacie —</option>'+list.map(p=>`<option value="${p.id}">${esc(p.name)}${p.strength?' · '+esc(p.strength):''}</option>`).join('')+tail;sel.value=current||''}

function renderToday(){renderTodayAlerts();const day=isoDay();document.getElementById('todayDate').textContent=fmtDate(day);let events=[];db.treatments.filter(t=>appliesTreatment(t,day)).forEach(t=>t.schedule.forEach(s=>events.push({t,s,p:getTreatmentProduct(t)})));events.sort((a,b)=>a.s.time.localeCompare(b.s.time)||instructionPriority(a.t.instruction)-instructionPriority(b.t.instruction)||alpha(a.p.name,b.p.name));let html='',last='';events.forEach(({t,s,p})=>{if(s.time!==last){if(last)html+=`<div class="actions group-action"><button class="secondary small" onclick="takeGroup('${day}','${last}')">Tout enregistrer à ${last}</button></div>`;last=s.time;html+=`<div class="time-head"><div class="time">${s.time}</div></div>`}const k=`${day}|${t.id}|${s.time}`,done=db.takes[k];html+=`<div class="card compact-card dose-row ${done?'taken':''}"><div class="dose-main"><strong>${esc(p.name)} ${esc(p.strength||'')}</strong><div class="dose-sub">${s.qty} ${esc(p.unit||'')} ${t.instruction?'· '+esc(t.instruction):''}${done?' · pris '+esc(done.qty)+' '+esc(done.unit||p.unit)+' à '+esc(done.time):''}</div></div><button class="${done?'secondary':'primary'} icon-btn" onclick="${done?`cancelTake('${t.id}','${s.time}')`:`openTake('${t.id}','${s.time}')`}">${done?'Annuler':'Pris'}</button></div>`});if(last)html+=`<div class="actions group-action"><button class="secondary small" onclick="takeGroup('${day}','${last}')">Tout enregistrer à ${last}</button></div>`;document.getElementById('todayList').innerHTML=html||'<div class="card compact-card">Aucun traitement prévu aujourd’hui.</div>';renderTodayMeasures();renderTodayHistory()}
function renderTodayMeasures(){const day=isoDay(),list=db.measures.filter(m=>appliesMeasure(m,day)).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||alpha(a.type,b.type));document.getElementById('todayMeasures').innerHTML=list.length?list.map(m=>`<div class="card compact-card measure-row"><div><strong>${esc(m.type)}</strong><div class="muted">${esc(m.time||'')} · ${esc(m.unit||'')} ${m.info?'· '+esc(m.info):''}</div></div><button class="primary icon-btn" onclick="openMeasureTake('${m.id}')">Saisir</button></div>`).join(''):'<div class="card compact-card muted">Aucune mesure prévue aujourd’hui.</div>'}
function renderTodayHistory(){const day=isoDay();const med=db.history.filter(h=>h.date===day).map(h=>({...h,_type:'med'}));const meas=db.measureHistory.filter(h=>h.date===day).map(h=>({...h,_type:'measure'}));const items=[...med,...meas].sort((a,b)=>(b.time||'').localeCompare(a.time||''));document.getElementById('todayHistoryCount').textContent=items.length;document.getElementById('todayHistory').innerHTML=items.length?items.map(h=>h._type==='measure'?`<div class="history-row"><div><strong>${esc(h.time)}</strong><br><span class="badge">Mesure</span></div><div><strong>${esc(h.type)}</strong><div class="muted">${esc(h.value)} ${esc(h.unit||'')} ${h.note?'· '+esc(h.note):''}</div></div></div>`:`<div class="history-row"><div><strong>${esc(h.time)}</strong><br><span class="badge">${h.kind==='prn'?'Au besoin':'Planifié'}</span></div><div><strong>${esc(h.name)}</strong><div class="muted">${esc(h.qty)} ${esc(h.unit||'')} ${h.note?'· '+esc(h.note):''}</div></div></div>`).join(''):'<div class="muted">Rien enregistré aujourd’hui.</div>'}
function openTake(id,time){const t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t),s=t?.schedule.find(x=>x.time===time);if(!t||!s)return;const k=`${isoDay()}|${id}|${time}`,e=db.takes[k];takeTreatmentId.value=id;takePlannedTime.value=time;takeModalTitle.textContent=p.name;takeQty.value=e?.qty??s.qty;takeUnit.value=p.unit||'';takeDate.value=e?.actualDate||isoDay();takeTime.value=e?.time||currentTime();takeNote.value=e?.note||'';openModal('takeModal')}
confirmTake.onclick=()=>{const id=takeTreatmentId.value,planned=takePlannedTime.value,t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t);if(!t||!p)return;const key=`${isoDay()}|${id}|${planned}`,qty=Number(takeQty.value||0);if(qty<=0)return alert('Indique la quantité.');const old=db.takes[key];if(old?.qty)restoreStock(p,old.qty);consumeStock(p,qty);db.takes[key]={qty,unit:p.unit,actualDate:takeDate.value,time:takeTime.value,note:takeNote.value.trim()};db.history=db.history.filter(h=>h.eventKey!==key);db.history.push({id:uid(),eventKey:key,kind:'planned',date:takeDate.value,time:takeTime.value,name:p.name,strength:p.strength,qty,unit:p.unit,note:takeNote.value.trim()});closeModal('takeModal');save()}
function cancelTake(id,time){const key=`${isoDay()}|${id}|${time}`,old=db.takes[key],t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t);if(old?.qty&&p)restoreStock(p,old.qty);delete db.takes[key];db.history=db.history.filter(h=>h.eventKey!==key);save()}
let pendingGroupDay='',pendingGroupPlanned='';
function takeGroup(day,time){pendingGroupDay=day;pendingGroupPlanned=time;groupTakeTitle.textContent=`Toutes les prises prévues à ${time}`;groupTakeDate.value=day;groupTakeTime.value=currentTime();openModal('groupTakeModal')}
function commitGroupTake(actualTime){const day=pendingGroupDay,time=pendingGroupPlanned,date=groupTakeDate.value||day;db.treatments.filter(t=>appliesTreatment(t,day)).forEach(t=>t.schedule.filter(s=>s.time===time).forEach(s=>{const key=`${day}|${t.id}|${time}`;if(db.takes[key])return;const p=getTreatmentProduct(t),qty=Number(s.qty||0);if(p)consumeStock(p,qty);db.takes[key]={qty,unit:p?.unit||'',actualDate:date,time:actualTime,note:''};db.history.push({id:uid(),eventKey:key,kind:'planned',date,time:actualTime,name:p?.name||'',strength:p?.strength||'',qty,unit:p?.unit||'',note:''})}));closeModal('groupTakeModal');save()}

prnBtn.onclick=()=>{const list=[...db.pharmacy].filter(p=>Number(p.stock||0)>0).sort((a,b)=>alpha(a.name,b.name));prnChoiceList.innerHTML=list.length?list.map(p=>`<button class="secondary choice" onclick="choosePrn('${p.id}')"><strong>${esc(p.name)}</strong><br><span class="muted">Stock ${p.stock} ${esc(p.unit)}</span></button>`).join(''):'<div class="notice">Pharmacie vide.</div>';openModal('prnChoiceModal')}
function choosePrn(id){const p=pharmacyItem(id);if(!p)return;closeModal('prnChoiceModal');prnPharmacyId.value=id;prnTakeTitle.textContent=p.name;prnQty.value=1;prnUnit.value=p.unit||'';prnDate.value=isoDay();prnTime.value=currentTime();prnNote.value='';openModal('prnTakeModal')}
confirmPrn.onclick=()=>{const p=pharmacyItem(prnPharmacyId.value),qty=Number(prnQty.value||0);if(!p||qty<=0)return;consumeStock(p,qty);db.history.push({id:uid(),eventKey:'prn-'+uid(),kind:'prn',date:prnDate.value,time:prnTime.value,name:p.name,strength:p.strength,qty,unit:p.unit,note:prnNote.value.trim(),pharmacyId:p.id});closeModal('prnTakeModal');save()}

function renderTreatments(){const list=[...db.treatments].sort((a,b)=>alpha(getTreatmentProduct(a).name,getTreatmentProduct(b).name));treatmentList.innerHTML=list.length?list.map(t=>{const p=getTreatmentProduct(t);return`<div class="card compact-card treatment-row"><div class="treatment-main"><strong>${esc(p.name)} ${esc(p.strength||'')}</strong><div class="muted">${t.schedule.map(s=>`${s.time} ${s.qty} ${esc(p.unit)}`).join(' · ')} · ${esc(periodicityLabel(t))}${t.instruction?' · '+esc(t.instruction):''}</div>${t.information?`<div class="info-note">${esc(t.information)}</div>`:''}</div><div class="actions"><button class="secondary icon-btn" onclick="viewTreatment('${t.id}')">Voir</button><button class="secondary icon-btn" onclick="editTreatment('${t.id}')">Modifier</button><button class="danger icon-btn" onclick="deleteTreatment('${t.id}')">×</button></div></div>`}).join(''):'<div class="card compact-card">Aucun traitement.</div>';fillProductSelect('treatmentProduct')}
function addScheduleRow(time='09:00',qty=1){const d=document.createElement('div');d.className='schedule-row';d.innerHTML=`<input type="time" class="stime" value="${time}"><input type="number" class="sqty" min="0" step=".5" value="${qty}"><button class="danger">Retirer</button>`;d.querySelector('button').onclick=()=>d.remove();scheduleRows.appendChild(d)}addSchedule.onclick=()=>addScheduleRow('12:00',1)
function updatePeriodUI(){weeklyOptions.classList.toggle('hidden',periodicity.value!=='weekly');monthlyOptions.classList.toggle('hidden',periodicity.value!=='monthly')}periodicity.onchange=updatePeriodUI;reason.onchange=()=>syncOther('reason','reasonOther');instruction.onchange=()=>syncOther('instruction','instructionOther');
function showProductInfo(){const p=pharmacyItem(treatmentProduct.value);if(!p){treatmentProductInfo.classList.add('hidden');return}treatmentProductInfo.classList.remove('hidden');treatmentProductInfo.innerHTML=`<strong>${esc(p.name)}</strong>${p.strength?' · '+esc(p.strength):''}<br>Unité: ${esc(p.unit)} · Stock: ${p.stock} · Péremption: ${esc(p.expiry||'—')}${p.information?'<br>'+esc(p.information):''}`}treatmentProduct.onchange=showProductInfo;
function resetTreatment(){editId.value='';formTitle.textContent='Ajouter un traitement';fillProductSelect('treatmentProduct');treatmentProductInfo.classList.add('hidden');dynamicSelect('reason','reasonOther','reason');dynamicSelect('instruction','instructionOther','instruction');information.value='';start.value=isoDay();end.value='';periodicity.value='daily';document.querySelectorAll('.weekday').forEach(c=>c.checked=false);monthDays.value='';scheduleRows.innerHTML='';addScheduleRow();updatePeriodUI()}
openTreatmentForm.onclick=()=>{if(!db.pharmacy.length)return alert('Ajoute ou importe d’abord les médicaments dans Pharmacie.');resetTreatment();treatmentFormPanel.classList.add('open');treatmentFormPanel.scrollIntoView({behavior:'smooth'})};cancelEdit.onclick=()=>treatmentFormPanel.classList.remove('open');
saveTreatment.onclick=()=>{const pid=treatmentProduct.value;if(!pid)return alert('Choisis un médicament de la Pharmacie.');const schedule=[...scheduleRows.children].map(r=>({time:r.querySelector('.stime').value,qty:Number(r.querySelector('.sqty').value||0)})).filter(x=>x.time);if(!schedule.length)return alert('Ajoute une heure.');const wd=[...document.querySelectorAll('.weekday:checked')].map(c=>Number(c.value)),md=monthDays.value.split(',').map(x=>Number(x.trim())).filter(x=>x>=1&&x<=31);if(periodicity.value==='weekly'&&!wd.length)return alert('Choisis un jour.');if(periodicity.value==='monthly'&&!md.length)return alert('Indique un jour du mois.');const obj={id:editId.value||uid(),pharmacyId:pid,reason:selectedOrOther('reason','reasonOther'),instruction:selectedOrOther('instruction','instructionOther'),information:information.value.trim(),start:start.value,end:end.value,periodicity:periodicity.value,weekdays:wd,monthDays:md,schedule};const ix=db.treatments.findIndex(x=>x.id===obj.id);if(ix>=0)db.treatments[ix]=obj;else db.treatments.push(obj);treatmentFormPanel.classList.remove('open');save()}
function viewTreatment(id){
 const t=db.treatments.find(x=>x.id===id);if(!t)return;
 const p=getTreatmentProduct(t);
 treatmentDetailTitle.textContent=(p?.name||'Traitement')+(p?.strength?' · '+p.strength:'');
 const sched=(t.schedule||[]).map(s=>`<div><strong>${esc(s.time)}</strong> · ${s.qty} ${esc(unitAbbr(p?.unit||''))}</div>`).join('');
 treatmentDetailBody.innerHTML=`
   ${p?.photo?`<img class="photo-preview" src="${p.photo}">`:''}
   <div class="detail-grid">
     <strong>Médicament</strong><span>${esc(p?.name||'')}</span>
     <strong>Dosage</strong><span>${esc(p?.strength||'—')}</span>
     <strong>Unité</strong><span>${esc(p?.unit||'—')}</span>
     <strong>Raison</strong><span>${esc(t.reason||'—')}</span>
     <strong>Instructions</strong><span>${esc(t.instruction||'—')}</span>
     <strong>Informations</strong><span>${esc(t.information||p?.information||'—')}</span>
     <strong>Début</strong><span>${esc(t.start||'—')}</span>
     <strong>Fin</strong><span>${esc(t.end||'—')}</span>
     <strong>Périodicité</strong><span>${esc(periodicityLabel(t)||'—')}</span>
     <strong>Stock</strong><span>${p?.stock??'—'} ${esc(p?.unit||'')}</span>
     <strong>Prochaine péremption</strong><span>${esc(p?.expiry||'—')}</span>
   </div>
   <h4>Posologie</h4>
   <div class="treatment-detail-schedule">${sched||'<div class="muted">Aucune prise définie.</div>'}</div>`;
 openModal('treatmentDetailModal');
}
function editTreatment(id){const t=db.treatments.find(x=>x.id===id);if(!t)return;resetTreatment();editId.value=t.id;formTitle.textContent='Modifier le traitement';fillProductSelect('treatmentProduct',t.pharmacyId);showProductInfo();dynamicSelect('reason','reasonOther','reason',t.reason||'');dynamicSelect('instruction','instructionOther','instruction',t.instruction||'');information.value=t.information||'';start.value=t.start||'';end.value=t.end||'';periodicity.value=t.periodicity||'daily';document.querySelectorAll('.weekday').forEach(c=>c.checked=(t.weekdays||[]).map(Number).includes(Number(c.value)));monthDays.value=(t.monthDays||[]).join(',');scheduleRows.innerHTML='';t.schedule.forEach(s=>addScheduleRow(s.time,s.qty));updatePeriodUI();treatmentFormPanel.classList.add('open');treatmentFormPanel.scrollIntoView({behavior:'smooth'})}function deleteTreatment(id){if(confirm('Supprimer ce traitement ?')){db.treatments=db.treatments.filter(x=>x.id!==id);save()}}

function renderMeasures(){const list=[...db.measures].sort((a,b)=>alpha(a.type,b.type));measureList.innerHTML=list.length?list.map(m=>`<div class="card compact-card measure-row"><div><strong>${esc(m.type)}</strong><div class="muted">${esc(m.time)} · ${esc(m.unit)} · ${esc(periodicityLabel(m))}${m.info?' · '+esc(m.info):''}</div></div><div class="actions"><button class="secondary icon-btn" onclick="editMeasure('${m.id}')">Modifier</button><button class="danger icon-btn" onclick="deleteMeasure('${m.id}')">×</button></div></div>`).join(''):'<div class="card compact-card muted">Aucune mesure planifiée.</div>'}
function updateMeasurePeriod(){measureWeeklyOptions.classList.toggle('hidden',measurePeriodicity.value!=='weekly');measureMonthlyOptions.classList.toggle('hidden',measurePeriodicity.value!=='monthly')}measurePeriodicity.onchange=updateMeasurePeriod;measureType.onchange=()=>syncOther('measureType','measureTypeOther');measureUnit.onchange=()=>syncOther('measureUnit','measureUnitOther');
function resetMeasure(){measureEditId.value='';measureFormTitle.textContent='Ajouter une mesure';dynamicSelect('measureType','measureTypeOther','measureType');dynamicSelect('measureUnit','measureUnitOther','unit');measureInfo.value='';measurePeriodicity.value='daily';document.querySelectorAll('.mweekday').forEach(c=>c.checked=false);measureMonthDays.value='';measureTime.value='08:00';updateMeasurePeriod()}
openMeasureForm.onclick=()=>{resetMeasure();measureFormPanel.classList.add('open');measureFormPanel.scrollIntoView({behavior:'smooth'})};cancelMeasure.onclick=()=>measureFormPanel.classList.remove('open');saveMeasure.onclick=()=>{const type=selectedOrOther('measureType','measureTypeOther'),unit=selectedOrOther('measureUnit','measureUnitOther');if(!type)return alert('Indique le type de mesure.');const wd=[...document.querySelectorAll('.mweekday:checked')].map(c=>Number(c.value)),md=measureMonthDays.value.split(',').map(x=>Number(x.trim())).filter(x=>x>=1&&x<=31);if(measurePeriodicity.value==='weekly'&&!wd.length)return alert('Choisis un jour.');if(measurePeriodicity.value==='monthly'&&!md.length)return alert('Indique un jour du mois.');const m={id:measureEditId.value||uid(),type,unit,info:measureInfo.value.trim(),periodicity:measurePeriodicity.value,weekdays:wd,monthDays:md,time:measureTime.value};const ix=db.measures.findIndex(x=>x.id===m.id);if(ix>=0)db.measures[ix]=m;else db.measures.push(m);measureFormPanel.classList.remove('open');save()};function editMeasure(id){const m=db.measures.find(x=>x.id===id);if(!m)return;resetMeasure();measureEditId.value=m.id;measureFormTitle.textContent='Modifier la mesure';dynamicSelect('measureType','measureTypeOther','measureType',m.type);dynamicSelect('measureUnit','measureUnitOther','unit',m.unit);measureInfo.value=m.info||'';measurePeriodicity.value=m.periodicity||'daily';document.querySelectorAll('.mweekday').forEach(c=>c.checked=(m.weekdays||[]).map(Number).includes(Number(c.value)));measureMonthDays.value=(m.monthDays||[]).join(',');measureTime.value=m.time||'08:00';updateMeasurePeriod();measureFormPanel.classList.add('open');measureFormPanel.scrollIntoView({behavior:'smooth'})}function deleteMeasure(id){if(confirm('Supprimer cette mesure ?')){db.measures=db.measures.filter(x=>x.id!==id);save()}}
function openMeasureTake(id){const m=db.measures.find(x=>x.id===id);if(!m)return;measureDefinitionId.value=id;measureModalTitle.textContent=m.type;measureValue.value='';measureDate.value=isoDay();measureActualTime.value=currentTime();measureNote.value='';openModal('measureModal')}confirmMeasure.onclick=()=>{const m=db.measures.find(x=>x.id===measureDefinitionId.value);if(!m||!measureValue.value.trim())return alert('Indique la valeur.');db.measureHistory.push({id:uid(),definitionId:m.id,type:m.type,unit:m.unit,value:measureValue.value.trim(),date:measureDate.value,time:measureActualTime.value,note:measureNote.value.trim()});closeModal('measureModal');save()}



function contactDisplayName(c){if(!c)return'';return [c.firstName,c.lastName].filter(Boolean).join(' ').trim()||c.reference||'Contact sans nom'}
function contactBadgeClass(t){if(t==='Pharmacie')return'pharmacy';if(t==='Thérapeute')return'therapist';if(t==='Médecin')return'';return'other'}
function contactSpecialties(){return[...new Set(db.contacts.map(c=>c.specialty).filter(Boolean))].sort(alpha)}
function fillContactSpecialty(current=''){
 const vals=contactSpecialties();
 contactSpecialty.innerHTML='<option value="">— Choisir —</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__OTHER__">Autre…</option>';
 if(current&&vals.includes(current))contactSpecialty.value=current;
 else if(current){contactSpecialty.value='__OTHER__';contactSpecialtyOther.value=current}
 else contactSpecialty.value='';
 contactSpecialtyOther.classList.toggle('hidden',contactSpecialty.value!=='__OTHER__');
}
function fillPrescriberSelect(current=''){
 const list=db.contacts.filter(c=>c.type==='Médecin'||c.type==='Thérapeute').sort((a,b)=>alpha(contactDisplayName(a),contactDisplayName(b)));
 prescriberContact.innerHTML='<option value="">— Choisir un prescripteur —</option>'+list.map(c=>`<option value="${c.id}">${esc(contactDisplayName(c))}${c.specialty?' · '+esc(c.specialty):''}</option>`).join('')+'<option value="__NEW_CONTACT__">＋ Nouveau contact de santé…</option>';
 prescriberContact.value=current||'';
}
function renderContacts(){
 const type=contactFilter.value||'',q=(contactSearch.value||'').toLowerCase().trim();
 const list=[...db.contacts].filter(c=>{
   if(type&&c.type!==type)return false;
   if(!q)return true;
   return [c.type,c.firstName,c.lastName,c.specialty,c.reference,c.city,c.notes].join(' ').toLowerCase().includes(q)
 }).sort((a,b)=>alpha(contactDisplayName(a),contactDisplayName(b)));
 contactList.innerHTML=list.length?list.map(c=>`<div class="card compact-card contact-row"><div>
 <div><span class="contact-badge ${contactBadgeClass(c.type)}">${esc(c.type||'Autre')}</span>${c.primary?'<span class="contact-primary">★ Référent</span>':''}</div>
 <div class="contact-name">${esc(contactDisplayName(c))}</div><div class="muted">${esc(c.specialty||'')}${c.city?' · '+esc(c.city):''}</div>
 </div><div class="actions"><button class="secondary icon-btn" onclick="viewContact('${c.id}')">Voir</button><button class="secondary icon-btn" onclick="editContact('${c.id}')">Modifier</button><button class="danger icon-btn" onclick="deleteContact('${c.id}')">×</button></div></div>`).join(''):'<div class="card compact-card">Aucun contact.</div>';
}
function resetContactForm(){
 contactEditId.value='';contactFormTitle.textContent='Ajouter un contact de santé';contactType.value='Médecin';contactTypeOther.value='';contactTypeOther.classList.add('hidden');
 ['contactFirstName','contactLastName','contactReference','contactPhone','contactMobile','contactEmail','contactAddress','contactZip','contactCity','contactWebsite','contactNotes'].forEach(id=>document.getElementById(id).value='');
 contactPrimary.checked=false;fillContactSpecialty();
}
openContactForm.onclick=()=>{resetContactForm();contactFormPanel.classList.add('open');contactFormPanel.scrollIntoView({behavior:'smooth'})};
cancelContact.onclick=()=>contactFormPanel.classList.remove('open');
contactType.onchange=()=>contactTypeOther.classList.toggle('hidden',contactType.value!=='Autre');
contactSpecialty.onchange=()=>contactSpecialtyOther.classList.toggle('hidden',contactSpecialty.value!=='__OTHER__');
contactFilter.onchange=renderContacts;contactSearch.oninput=renderContacts;

saveContact.onclick=()=>{
 const type=contactType.value==='Autre'?(contactTypeOther.value.trim()||'Autre'):contactType.value;
 const specialty=contactSpecialty.value==='__OTHER__'?contactSpecialtyOther.value.trim():contactSpecialty.value;
 if(!contactLastName.value.trim()&&!contactFirstName.value.trim())return alert('Indique au moins un nom.');
 const c={id:contactEditId.value||uid(),type,firstName:contactFirstName.value.trim(),lastName:contactLastName.value.trim(),specialty,
 reference:contactReference.value.trim(),phone:contactPhone.value.trim(),mobile:contactMobile.value.trim(),email:contactEmail.value.trim(),
 address:contactAddress.value.trim(),zip:contactZip.value.trim(),city:contactCity.value.trim(),website:contactWebsite.value.trim(),
 notes:contactNotes.value.trim(),primary:contactPrimary.checked};
 const ix=db.contacts.findIndex(x=>x.id===c.id);if(ix>=0)db.contacts[ix]=c;else db.contacts.push(c);
 contactFormPanel.classList.remove('open');save();fillPrescriberSelect();
 if(prescriptionDraft?.mode==='contact'){
   const d=prescriptionDraft;prescriptionDraft=null;
   document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='prescriptions'));
   document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='prescriptions'));
   resetPrescription();prescriptionFormPanel.classList.add('open');
   fillProductSelect('prescriptionProduct',d.pharmacyId||'');fillPrescriberSelect(c.id);
   issueDate.value=d.issueDate||isoDay();validUntil.value=d.validUntil||'';renewalsAllowed.value=d.renewalsAllowed||0;renewalsUsed.value=d.renewalsUsed||0;prescriptionNotes.value=d.notes||'';
   prescriberHint.textContent='Nouveau prescripteur ajouté aux Contacts de santé.';
   prescriptionFormPanel.scrollIntoView({behavior:'smooth'});
 }
};
function editContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;resetContactForm();contactEditId.value=c.id;contactFormTitle.textContent='Modifier le contact';
 if(['Médecin','Thérapeute','Pharmacie'].includes(c.type)){contactType.value=c.type;contactTypeOther.classList.add('hidden')}else{contactType.value='Autre';contactTypeOther.value=c.type||'';contactTypeOther.classList.remove('hidden')}
 contactFirstName.value=c.firstName||'';contactLastName.value=c.lastName||'';fillContactSpecialty(c.specialty||'');contactReference.value=c.reference||'';
 contactPhone.value=c.phone||'';contactMobile.value=c.mobile||'';contactEmail.value=c.email||'';contactAddress.value=c.address||'';contactZip.value=c.zip||'';
 contactCity.value=c.city||'';contactWebsite.value=c.website||'';contactNotes.value=c.notes||'';contactPrimary.checked=!!c.primary;
 contactFormPanel.classList.add('open');contactFormPanel.scrollIntoView({behavior:'smooth'});
}
function viewContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;contactDetailTitle.textContent=contactDisplayName(c);
 contactDetailBody.innerHTML=`<div><span class="contact-badge ${contactBadgeClass(c.type)}">${esc(c.type||'Autre')}</span>${c.primary?'<span class="contact-primary">★ Référent</span>':''}</div>
 <div class="contact-detail-grid"><strong>Spécialité</strong><span>${esc(c.specialty||'—')}</span><strong>Référence</strong><span>${esc(c.reference||'—')}</span>
 <strong>Téléphone</strong><span>${esc(c.phone||'—')}</span><strong>Mobile</strong><span>${esc(c.mobile||'—')}</span><strong>E-mail</strong><span>${esc(c.email||'—')}</span>
 <strong>Adresse</strong><span>${esc(c.address||'—')}</span><strong>NPA / localité</strong><span>${esc([c.zip,c.city].filter(Boolean).join(' ')||'—')}</span>
 <strong>Site web</strong><span>${esc(c.website||'—')}</span><strong>Remarques</strong><span>${esc(c.notes||'—')}</span></div>`;
 openModal('contactDetailModal');
}
function deleteContact(id){
 if(db.prescriptions.some(r=>r.prescriberContactId===id))return alert('Ce contact est utilisé dans une ordonnance.');
 if(confirm('Supprimer ce contact ?')){db.contacts=db.contacts.filter(c=>c.id!==id);save()}
}
function isTreatmentProduct(pharmacyId){
 return db.treatments.some(t=>t.pharmacyId===pharmacyId);
}
function collectAlerts(){
 const alerts=[];
 const today=isoDay();
 db.pharmacy.map(normalizeLots).forEach(p=>{
   if(Number(p.stock||0)<=Number(p.threshold||0)){
     alerts.push({
       level:Number(p.stock||0)<=0?'critical':'warning',
       text:`${p.name}: stock ${p.stock} ${unitAbbr(p.unit)} — seuil ${p.threshold} ${unitAbbr(p.unit)}`
     });
   }
   (p.lots||[]).forEach(l=>{
     if(!l.expiry)return;
     const days=Math.ceil((new Date(l.expiry+'T12:00:00')-new Date(today+'T12:00:00'))/86400000);
     if(days<0){
       alerts.push({level:'critical',text:`${p.name}: lot périmé depuis ${Math.abs(days)} jour(s) (${l.expiry})`});
     }else if(days<=30){
       alerts.push({level:'warning',text:`${p.name}: lot à péremption dans ${days} jour(s) (${l.expiry})`});
     }
   });
 });
 db.prescriptions.forEach(r=>{
   if(!r.validUntil)return;
   const days=Math.ceil((new Date(r.validUntil+'T12:00:00')-new Date(today+'T12:00:00'))/86400000);
   if(days<0)alerts.push({level:'critical',text:`Ordonnance expirée : ${r.validUntil}`});
   else if(days<=30)alerts.push({level:'warning',text:`Ordonnance à renouveler dans ${days} jour(s) (${r.validUntil})`});
 });
 return alerts;
}
function renderTodayAlerts(){
 const wrap=document.getElementById('todayAlertsWrap'),box=document.getElementById('todayAlerts');
 if(!wrap||!box)return;
 const alerts=collectAlerts();
 wrap.classList.toggle('hidden',alerts.length===0);
 box.innerHTML=alerts.map(a=>`<div class="alert-item ${a.level==='critical'?'alert-critical':'alert-warning'}"><span>${esc(a.text)}</span></div>`).join('');
}
function renderPharmacy(){const filter=document.getElementById('pharmacyFilter'),list=[...db.pharmacy].map(normalizeLots).sort((a,b)=>alpha(a.name,b.name)),keep=filter?.value||'';if(filter){filter.innerHTML='<option value="">— Tous les médicaments —</option>'+list.map(p=>`<option value="${p.id}">${esc(p.name)}${p.strength?' · '+esc(p.strength):''}</option>`).join('');filter.value=keep}const visible=keep?list.filter(p=>p.id===keep):list;pharmacyList.innerHTML=visible.length?visible.map(p=>`<div class="card compact-card pharmacy-row ${stockWarning(p)?'low-stock':''} ${isTreatmentProduct(p.id)?'pharmacy-treatment':''}"><div class="pharmacy-main"><div class="pharmacy-name-line">${p.photo?`<img class="photo" src="${p.photo}" onclick="showPharmacyPhoto('${p.id}')">`:''}<strong>${esc(p.name)}</strong>${isTreatmentProduct(p.id)?'<span class="treatment-badge">Traitement</span>':''}${p.strength?' <span class="muted">'+esc(p.strength)+'</span>':''}</div><div class="muted">Stock ${p.stock} ${esc(p.unit)} · ${p.lots.length} lot(s)${p.expiry?' · prochaine péremption '+esc(p.expiry):''}</div>${stockWarning(p)?`<div class="stock-alert">⚠ Seuil atteint : ${p.threshold} ${esc(p.unit)}</div>`:''}${p.information?`<div class="info-note">${esc(p.information)}</div>`:''}</div><div class="actions"><button class="secondary icon-btn" onclick="viewPharmacy('${p.id}')">Voir</button><button class="secondary icon-btn" onclick="editPharmacy('${p.id}')">Modifier</button><button class="danger icon-btn" onclick="deletePharmacy('${p.id}')">×</button></div></div>`).join(''):'<div class="card compact-card">Aucun produit à afficher.</div>';dynamicSelect('phUnit','phUnitOther','unit')}
function addLotRow(qty=0,expiry=''){
  const d=document.createElement('div');
  d.className='lot-row';
  d.innerHTML=`<div><label>Quantité</label><input class="lotQty" type="number" min="0" step=".5" value="${Number(qty||0)}"></div><div><label>Péremption</label><div class="expiry-wrap"><input class="lotExpiry" type="date" value="${esc(expiry||'')}"><button type="button" class="expiry-clear danger" title="Vider uniquement la péremption" aria-label="Vider uniquement la péremption">×</button></div></div>`;
  const clearBtn=d.querySelector('.expiry-clear');
  clearBtn.onclick=(ev)=>{
    ev.preventDefault();
    ev.stopPropagation();
    const expiryInput=d.querySelector('.lotExpiry');
    expiryInput.value='';
    expiryInput.dispatchEvent(new Event('change',{bubbles:true}));
  };
  d.querySelector('.lotQty').oninput=updateLotTotal;
  phLots.appendChild(d);
  updateLotTotal();
}
function updateLotTotal(){phStockTotal.value=[...phLots.children].reduce((s,r)=>s+Number(r.querySelector('.lotQty').value||0),0)}
addPhLot.onclick=()=>addLotRow();phUnit.onchange=()=>syncOther('phUnit','phUnitOther');
function resetPharmacy(){pharmacyEditId.value='';pharmacyFormTitle.textContent='Ajouter à la pharmacie';phName.value='';phStrength.value='';dynamicSelect('phUnit','phUnitOther','unit');phThreshold.value=0;phLots.innerHTML='';addLotRow();phPhoto.value='';phCamera.value='';pharmacyImageRemovePending=false;phPhotoView.classList.add('hidden');phPhotoDelete.classList.add('hidden');phPhotoStatus.textContent='';phInformation.value=''}
openPharmacyForm.onclick=()=>{resetPharmacy();pharmacyFormPanel.classList.add('open');pharmacyFormPanel.scrollIntoView({behavior:'smooth'})};cancelPharmacy.onclick=()=>pharmacyFormPanel.classList.remove('open');
function chosenPharmacyImage(){return phCamera.files?.[0]||phPhoto.files?.[0]||null}
function refreshPharmacyImageButtons(hasImage){phPhotoView.classList.toggle('hidden',!hasImage);phPhotoDelete.classList.toggle('hidden',!hasImage)}
phCamera.onchange=()=>{if(phCamera.files?.[0]){phPhoto.value='';pharmacyImageRemovePending=false;phPhotoStatus.textContent='Photo prise : '+(phCamera.files[0].name||'image');refreshPharmacyImageButtons(true)}};
phPhoto.onchange=()=>{if(phPhoto.files?.[0]){phCamera.value='';pharmacyImageRemovePending=false;phPhotoStatus.textContent='Image sélectionnée : '+phPhoto.files[0].name;refreshPharmacyImageButtons(true)}};
phPhotoDelete.onclick=()=>{phCamera.value='';phPhoto.value='';pharmacyImageRemovePending=true;phPhotoStatus.textContent='Photo supprimée à l’enregistrement.';refreshPharmacyImageButtons(false)};
phPhotoView.onclick=async()=>{const f=chosenPharmacyImage();if(f){const u=URL.createObjectURL(f);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000);return}const p=pharmacyItem(pharmacyEditId.value);if(!p)return;if(p.imageKey){const b=await imgGet(p.imageKey);if(b){const u=URL.createObjectURL(b);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000);return}}if(p.photo){window.open(p.photo,'_blank');return}alert('Aucune photo.')};
savePharmacy.onclick=async()=>{try{if(!phName.value.trim())return alert('Indique le nom.');const old=pharmacyItem(pharmacyEditId.value),id=pharmacyEditId.value||uid(),file=chosenPharmacyImage();const lots=[...phLots.children].map(r=>({id:uid(),qty:Number(r.querySelector('.lotQty').value||0),expiry:r.querySelector('.lotExpiry').value||''})).filter(l=>l.qty>0);const p=normalizeLots({id,name:phName.value.trim(),strength:phStrength.value.trim(),unit:selectedOrOther('phUnit','phUnitOther')||'unité',threshold:Number(phThreshold.value||0),lots,information:phInformation.value.trim(),imageKey:old?.imageKey||'',photo:old?.photo||''});const ix=db.pharmacy.findIndex(x=>x.id===p.id);if(ix>=0)db.pharmacy[ix]=p;else db.pharmacy.push(p);if(!save())return;try{if(pharmacyImageRemovePending){if(p.imageKey)await imgDel(p.imageKey);p.imageKey='';p.photo=''}if(file){if(p.imageKey)await imgDel(p.imageKey);await imgPut(id,file);p.imageKey=id;p.photo=''}save()}catch(imgErr){alert("Le médicament a été enregistré, mais pas la photo : "+(imgErr.message||imgErr))}pharmacyFormPanel.classList.remove('open');resetPharmacy();renderAll()}catch(e){alert("Impossible d’enregistrer : "+(e.message||e))}}
function editPharmacy(id){const p=normalizeLots(pharmacyItem(id));if(!p)return;resetPharmacy();pharmacyEditId.value=p.id;pharmacyFormTitle.textContent='Modifier le produit';phName.value=p.name;phStrength.value=p.strength||'';dynamicSelect('phUnit','phUnitOther','unit',p.unit||'');phThreshold.value=p.threshold||0;phLots.innerHTML='';(p.lots.length?p.lots:[{qty:0,expiry:''}]).forEach(l=>addLotRow(l.qty,l.expiry));phInformation.value=p.information||'';phPhotoStatus.textContent=(p.imageKey||p.photo)?'Photo enregistrée — tu peux la voir, la remplacer ou la supprimer.':'';refreshPharmacyImageButtons(!!(p.imageKey||p.photo));pharmacyFormPanel.classList.add('open');pharmacyFormPanel.scrollIntoView({behavior:'smooth'})}
async function viewPharmacy(id){const p=normalizeLots(pharmacyItem(id));if(!p)return;let photoHtml='';if(p.imageKey){const b=await imgGet(p.imageKey);if(b){const u=URL.createObjectURL(b);photoHtml=`<img class="photo-preview" src="${u}">`;setTimeout(()=>URL.revokeObjectURL(u),60000)}}else if(p.photo)photoHtml=`<img class="photo-preview" src="${p.photo}">`;pharmacyDetailTitle.textContent=p.name+(p.strength?' · '+p.strength:'');pharmacyDetailBody.innerHTML=`${photoHtml}<div><strong>Unité :</strong> ${esc(p.unit)}<br><strong>Stock :</strong> ${p.stock}<br><strong>Seuil :</strong> ${p.threshold}<br><strong>Prochaine péremption :</strong> ${esc(p.expiry||'—')}<br><strong>Informations :</strong> ${esc(p.information||'—')}</div><h4>Boîtes / lots</h4>${p.lots.length?p.lots.map(l=>`<div class="detail-lot">${l.qty} ${esc(p.unit)} · péremption ${esc(l.expiry||'non indiquée')}</div>`).join(''):'<div class="muted">Aucun stock.</div>'}`;openModal('pharmacyDetailModal')}
async function showPharmacyPhoto(id){const p=pharmacyItem(id);if(!p)return;if(p.imageKey){const b=await imgGet(p.imageKey);if(!b)return alert('Aucune photo.');const u=URL.createObjectURL(b);pharmacyDetailTitle.textContent=p.name;pharmacyDetailBody.innerHTML=`<img class="photo-preview" src="${u}">`;openModal('pharmacyDetailModal');setTimeout(()=>URL.revokeObjectURL(u),60000);return}if(!p.photo)return alert('Aucune photo.');pharmacyDetailTitle.textContent=p.name;pharmacyDetailBody.innerHTML=`<img class="photo-preview" src="${p.photo}">`;openModal('pharmacyDetailModal')}
function deletePharmacy(id){if(db.treatments.some(t=>t.pharmacyId===id))return alert('Ce produit est utilisé dans Traitements. Supprime d’abord le traitement.');if(confirm('Supprimer ce produit ?')){db.pharmacy=db.pharmacy.filter(x=>x.id!==id);save()}}
importPharmacyBtn.onclick=()=>importPharmacyFile.click();importPharmacyFile.onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text()),list=obj.pharmacy;if(!Array.isArray(list))throw Error('format');let added=0,updated=0;list.forEach(p=>{const old=db.pharmacy.find(x=>x.id===p.id)||db.pharmacy.find(x=>x.name===p.name&&x.strength===p.strength);if(old){Object.assign(old,p);updated++}else{db.pharmacy.push({...p,id:p.id||uid()});added++}});db=migrate(db);save();alert(`Import Pharmacie terminé : ${added} ajoutés, ${updated} mis à jour.`)}catch(err){alert('Fichier Pharmacie non reconnu.')}}

function nextMonday(){let d=new Date(),day=d.getDay(),delta=(8-day)%7;if(!delta)delta=7;d.setDate(d.getDate()+delta);return isoDay(d)}weekStart.value=nextMonday();generateWeek.onclick=()=>generateWeekTable();printWeek.onclick=()=>{generateWeekTable();setTimeout(()=>window.print(),100)};function generateWeekTable(){const start=weekStart.value;if(!start)return;const dates=[];for(let i=0;i<7;i++){const d=new Date(start+'T12:00:00');d.setDate(d.getDate()+i);dates.push(isoDay(d))}const list=[...db.treatments].sort((a,b)=>alpha(getTreatmentProduct(a).name,getTreatmentProduct(b).name));let body='';list.forEach(t=>{const p=getTreatmentProduct(t);const cells=dates.map(d=>{if(!appliesTreatment(t,d))return'—';return t.schedule.map(s=>`<div class="week-dose"><span class="wtime">${esc(s.time)}</span><span class="wqty">${s.qty} ${esc(unitAbbr(p.unit))}</span></div>`).join('')||'—'});if(cells.some(c=>c!=='—'))body+=`<tr><td class="week-med">${p.photo?`<img src="${p.photo}" class="week-photo">`:''}<strong>${esc(p.name)}</strong>${p.strength?`<br><span class="muted">${esc(p.strength)}</span>`:''}</td>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`});weekPlan.innerHTML=`<div class="week-scroll"><table class="week-table"><thead><tr><th>Médicament</th>${dates.map(d=>`<th>${new Date(d+'T12:00').toLocaleDateString('fr-CH',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('')}</tr></thead><tbody>${body||'<tr><td colspan="8">Aucun traitement actif.</td></tr>'}</tbody></table></div>`}
function renderPrescriptions(){
 fillProductSelect('prescriptionProduct');fillPrescriberSelect();
 const today=isoDay(),list=[...db.prescriptions].sort((a,b)=>alpha(pharmacyItem(a.pharmacyId)?.name,pharmacyItem(b.pharmacyId)?.name));
 prescriptionList.innerHTML=list.length?list.map(r=>{
  const p=pharmacyItem(r.pharmacyId),c=db.contacts.find(x=>x.id===r.prescriberContactId),expired=r.validUntil&&r.validUntil<today;
  return`<div class="card compact-card prescription-row"><div><strong>${esc(p?.name||'Produit inconnu')}</strong>
  <div class="muted">${esc(contactDisplayName(c)||'Prescripteur non indiqué')} · ${esc(r.issueDate||'')} → ${esc(r.validUntil||'sans limite')} · renouvellements ${r.renewalsUsed||0}/${r.renewalsAllowed||0}</div>
  <div class="${expired?'status-expired':'status-valid'}">${expired?'Expirée':'Valide / à vérifier'}</div></div>
  <div class="actions">${r.hasPdf?`<button class="secondary icon-btn" onclick="openPrescriptionPdf('${r.id}')">Voir PDF</button>`:''}<button class="secondary icon-btn" onclick="editPrescription('${r.id}')">Modifier</button><button class="danger icon-btn" onclick="deletePrescription('${r.id}')">×</button></div></div>`
 }).join(''):'<div class="card compact-card">Aucune ordonnance.</div>';
}
function resetPrescription(){
 prescriptionEditId.value='';prescriptionFormTitle.textContent='Ajouter une ordonnance';fillProductSelect('prescriptionProduct');fillPrescriberSelect();
 prescriberHint.textContent='';issueDate.value=isoDay();validUntil.value='';renewalsAllowed.value=0;renewalsUsed.value=0;prescriptionPdf.value='';
 prescriptionPdfStatus.textContent='Aucun PDF associé.';viewPrescriptionPdf.classList.add('hidden');removePrescriptionPdf.classList.add('hidden');pdfRemovePending=false;prescriptionNotes.value='';
}
openPrescriptionForm.onclick=()=>{resetPrescription();prescriptionFormPanel.classList.add('open');prescriptionFormPanel.scrollIntoView({behavior:'smooth'})};
cancelPrescription.onclick=()=>{prescriptionDraft=null;prescriptionFormPanel.classList.remove('open')};

prescriptionProduct.onchange=()=>{
 if(prescriptionProduct.value!=='__NEW__')return;
 prescriptionDraft={mode:'product',id:prescriptionEditId.value,prescriberContactId:prescriberContact.value,issueDate:issueDate.value,validUntil:validUntil.value,renewalsAllowed:renewalsAllowed.value,renewalsUsed:renewalsUsed.value,notes:prescriptionNotes.value};
 prescriptionFormPanel.classList.remove('open');
 document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='pharmacy'));
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pharmacy'));
 resetPharmacy();pharmacyFormPanel.classList.add('open');pharmacyFormTitle.textContent='Nouveau médicament pour l’ordonnance';phName.focus();
};
prescriberContact.onchange=()=>{
 if(prescriberContact.value!=='__NEW_CONTACT__')return;
 prescriptionDraft={mode:'contact',id:prescriptionEditId.value,pharmacyId:prescriptionProduct.value,issueDate:issueDate.value,validUntil:validUntil.value,renewalsAllowed:renewalsAllowed.value,renewalsUsed:renewalsUsed.value,notes:prescriptionNotes.value};
 prescriptionFormPanel.classList.remove('open');
 document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='contacts'));
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='contacts'));
 resetContactForm();contactFormPanel.classList.add('open');contactFormTitle.textContent='Nouveau prescripteur';contactType.value='Médecin';contactFormPanel.scrollIntoView({behavior:'smooth'});
};
prescriptionPdf.onchange=()=>{const f=prescriptionPdf.files?.[0];prescriptionPdfStatus.textContent=f?'PDF sélectionné : '+f.name:'Aucun PDF associé.';removePrescriptionPdf.classList.toggle('hidden',!f)};
viewPrescriptionPdf.onclick=()=>{if(prescriptionEditId.value)openPrescriptionPdf(prescriptionEditId.value)};
removePrescriptionPdf.onclick=()=>{prescriptionPdf.value='';pdfRemovePending=!!prescriptionEditId.value;prescriptionPdfStatus.textContent=pdfRemovePending?'Le PDF sera supprimé à l’enregistrement.':'Aucun PDF associé.';viewPrescriptionPdf.classList.add('hidden')};

savePrescription.onclick=async()=>{
 if(!prescriptionProduct.value||prescriptionProduct.value==='__NEW__')return alert('Choisis un médicament.');
 if(prescriberContact.value==='__NEW_CONTACT__')return alert('Choisis ou crée un prescripteur.');
 const id=prescriptionEditId.value||uid(),old=db.prescriptions.find(x=>x.id===id),file=prescriptionPdf.files?.[0];
 try{
  if(pdfRemovePending)await pdfDel(id);if(file)await pdfPut(id,file);
  const r={id,pharmacyId:prescriptionProduct.value,prescriberContactId:prescriberContact.value||'',issueDate:issueDate.value,validUntil:validUntil.value,
  renewalsAllowed:Number(renewalsAllowed.value||0),renewalsUsed:Number(renewalsUsed.value||0),notes:prescriptionNotes.value.trim(),hasPdf:pdfRemovePending?false:(file?true:!!old?.hasPdf)};
  const ix=db.prescriptions.findIndex(x=>x.id===id);if(ix>=0)db.prescriptions[ix]=r;else db.prescriptions.push(r);
  prescriptionFormPanel.classList.remove('open');save();
 }catch(e){alert('Impossible d’enregistrer le PDF : '+(e.message||e))}
};
function editPrescription(id){
 const r=db.prescriptions.find(x=>x.id===id);if(!r)return;resetPrescription();prescriptionEditId.value=r.id;prescriptionFormTitle.textContent='Modifier l’ordonnance';
 fillProductSelect('prescriptionProduct',r.pharmacyId);fillPrescriberSelect(r.prescriberContactId||'');issueDate.value=r.issueDate||'';validUntil.value=r.validUntil||'';
 renewalsAllowed.value=r.renewalsAllowed||0;renewalsUsed.value=r.renewalsUsed||0;prescriptionNotes.value=r.notes||'';prescriptionFormPanel.classList.add('open');
 prescriptionFormPanel.scrollIntoView({behavior:'smooth'});if(r.hasPdf){prescriptionPdfStatus.textContent='PDF enregistré';viewPrescriptionPdf.classList.remove('hidden');removePrescriptionPdf.classList.remove('hidden')}
}
function deletePrescription(id){if(confirm('Supprimer cette ordonnance ?')){db.prescriptions=db.prescriptions.filter(x=>x.id!==id);save()}}

function renderFullHistory(){const meds=db.history.map(h=>({...h,_k:'Médicament',label:h.name,value:`${h.qty} ${h.unit||''}`}));const ms=db.measureHistory.map(h=>({...h,_k:'Mesure',label:h.type,value:`${h.value} ${h.unit||''}`}));const list=[...meds,...ms].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));fullHistory.innerHTML=list.length?list.map(h=>`<div class="history-row"><div>${esc(h.date)}<br><strong>${esc(h.time||'')}</strong></div><div><span class="badge">${h._k}</span> <strong>${esc(h.label)}</strong><div class="muted">${esc(h.value)}${h.note?' · '+esc(h.note):''}</div></div></div>`).join(''):'<div class="muted">Historique vide.</div>'}
document.getElementById('pharmacyFilter')?.addEventListener('change',renderPharmacy);
groupPlannedTime.onclick=()=>commitGroupTake(pendingGroupPlanned);
groupActualTime.onclick=()=>commitGroupTake(currentTime());
groupCustomTime.onclick=()=>{if(!groupTakeTime.value)return alert('Choisis une heure.');commitGroupTake(groupTakeTime.value)};

document.getElementById('pdfPrev').onclick=()=>{if(activePdfDoc&&activePdfPage>1){activePdfPage--;renderActivePdfPage()}};
document.getElementById('pdfNext').onclick=()=>{if(activePdfDoc&&activePdfPage<activePdfDoc.numPages){activePdfPage++;renderActivePdfPage()}};
document.getElementById('pdfZoomOut').onclick=()=>{if(activePdfDoc){activePdfScale=Math.max(.5,activePdfScale-.25);renderActivePdfPage()}};
document.getElementById('pdfZoomIn').onclick=()=>{if(activePdfDoc){activePdfScale=Math.min(3,activePdfScale+.25);renderActivePdfPage()}};

function renderAll(){renderTreatments();renderMeasures();renderTodayAlerts();renderToday();renderPharmacy();renderPrescriptions();renderContacts();renderFullHistory()}
exportBtn.onclick=()=>{const blob=new Blob([JSON.stringify({app:'Ma Santé',version:'0.2.0.3',exportedAt:new Date().toISOString(),data:db},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ma-sante-backup-${isoDay()}.json`;a.click();URL.revokeObjectURL(a.href)};importFile.onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(confirm('Remplacer les données locales ?')){db=migrate(obj.data||obj);save()}}catch(err){alert('Sauvegarde non reconnue.')}}
resetTreatment();resetMeasure();resetPharmacy();resetPrescription();renderAll();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));