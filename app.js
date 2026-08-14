const KEY='ma-sante-v02001';
const IDB_DB='ma-sante-storage',IDB_STORE='state';
let __idbDb=null;
function openExtendedStorage(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(new Error('IndexedDB indisponible'));
  const r=indexedDB.open(IDB_DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE)};
  r.onsuccess=()=>{__idbDb=r.result;resolve(r.result)};
  r.onerror=()=>reject(r.error);
 });
}
function idbRead(){
 return new Promise((resolve,reject)=>{
  const r=__idbDb.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(KEY);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
 });
}
function idbWrite(text){
 return new Promise((resolve,reject)=>{
  const tx=__idbDb.transaction(IDB_STORE,'readwrite');
  tx.objectStore(IDB_STORE).put(text,KEY);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Écriture annulée'));
 });
}
let __saveTimer=null;
async function bootstrapExtendedStorage(){
 try{
  await openExtendedStorage();
  const stored=await idbRead();
  const legacy=localStorage.getItem(KEY);
  if(stored){
   db=migrate(JSON.parse(stored));renderAll();
   try{localStorage.removeItem(KEY)}catch(_){}
  }else if(legacy){
   await idbWrite(legacy);
   try{localStorage.removeItem(KEY)}catch(_){}
  }else{
   await idbWrite(JSON.stringify(db));
  }
  if(navigator.storage?.persist)try{await navigator.storage.persist()}catch(_){}
 }catch(e){console.error('Stockage étendu indisponible',e)}
}

const OLD_KEYS=['ma-sante-v0200','ma-sante-v0192','ma-sante-v0191','ma-sante-v019','ma-sante-v017','ma-sante-v0183','ma-sante-v0182','ma-sante-v0171','ma-sante-v016','ma-sante-v015','ma-sante-v014','ma-sante-v013','ma-sante-v012','ma-sante-v011','ma-sante-v01'];
function uid(){return(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
function freshDefault(){return{schemaVersion:4,treatments:[],pharmacy:[],takes:{},history:[],measures:[],measureHistory:[],prescriptions:[],contacts:[]}}
function migrate(data){if(!data||typeof data!=='object')data=freshDefault();data.schemaVersion=4;data.pharmacy=Array.isArray(data.pharmacy)?data.pharmacy:[];data.treatments=Array.isArray(data.treatments)?data.treatments:[];data.takes=data.takes||{};data.history=Array.isArray(data.history)?data.history:[];data.measures=Array.isArray(data.measures)?data.measures:[];data.measureHistory=Array.isArray(data.measureHistory)?data.measureHistory:[];data.prescriptions=Array.isArray(data.prescriptions)?data.prescriptions:[];data.contacts=Array.isArray(data.contacts)?data.contacts:[];data.savedReports=Array.isArray(data.savedReports)?data.savedReports:[];
data.pharmacy=data.pharmacy.map(p=>({...p,itemType:p.itemType||'product'}));
data.prescriptions=data.prescriptions.map(r=>({...r,items:Array.isArray(r.items)?r.items:(r.pharmacyId?[{pharmacyId:r.pharmacyId,quantity:1,note:''}]:[]),validityType:r.validityType||((Number(r.renewalsAllowed||0)>0||r.validUntil)?'multiple':'single')}));

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
function mergeById(base,extra,signature){
 const out=[...(base||[])],seen=new Set(out.map(x=>x.id||signature(x)));
 for(const x of extra||[]){const key=x.id||signature(x);if(!seen.has(key)){out.push(x);seen.add(key)}}
 return out;
}
function load(){
 try{
  const snapshots=[];
  for(const k of [KEY,...OLD_KEYS]){
   const raw=localStorage.getItem(k);
   if(!raw)continue;
   try{snapshots.push({key:k,data:migrate(JSON.parse(raw))})}catch(e){console.warn('Snapshot ignoré',k,e)}
  }
  if(!snapshots.length)return freshDefault();

  // Base principale = version actuelle si elle existe, sinon première ancienne base disponible.
  const current=snapshots.find(s=>s.key===KEY);
  const db0=current?current.data:snapshots[0].data;

  // Récupération ciblée : Contacts et Ordonnances peuvent avoir été enregistrés
  // dans une clé antérieure lors des changements de version.
  for(const s of snapshots){
   if(s.data===db0)continue;
   db0.contacts=mergeById(db0.contacts,s.data.contacts,c=>[c.type,c.firstName,c.lastName,c.reference].join('|').toLowerCase());
   db0.prescriptions=mergeById(db0.prescriptions,s.data.prescriptions,r=>[r.issueDate,r.prescriberContactId,r.validUntil].join('|'));
  }
  return migrate(db0);
 }catch(e){console.error(e);return freshDefault()}
}
let db=load();
setTimeout(()=>{try{save()}catch(e){}},0);
async function migrateLegacyPharmacyImages(){let changed=false;for(const p of db.pharmacy||[]){if(p.photo&&typeof p.photo==='string'&&p.photo.startsWith('data:image/')){try{const blob=await (await fetch(p.photo)).blob(),key=p.id||uid();await imgPut(key,blob);p.imageKey=key;p.photo='';changed=true}catch(e){}}}if(changed)save()}

const [today,todayDate,prnBtn,todayList,todayMeasures,todayHistoryCount,todayHistory,treatments,openTreatmentForm,treatmentList,treatmentFormPanel,formTitle,editId,treatmentProduct,treatmentProductInfo,reason,reasonOther,instruction,instructionOther,information,start,end,periodicity,weeklyOptions,monthlyOptions,monthDays,scheduleRows,addSchedule,saveTreatment,cancelEdit,openMeasureForm,measureList,measureFormPanel,measureFormTitle,measureEditId,measureType,measureTypeOther,measureUnit,measureUnitOther,measureInfo,measurePeriodicity,measureWeeklyOptions,measureMonthlyOptions,measureMonthDays,measureTime,saveMeasure,cancelMeasure,pillbox,printWeek,weekStart,weekDays,generateWeek,weekPlan,pharmacy,openPharmacyForm,importPharmacyBtn,importPharmacyFile,pharmacyList,pharmacyFilter,pharmacyFormPanel,pharmacyFormTitle,pharmacyEditId,phItemType,phStockFields,phName,phStrength,phUnit,phUnitOther,phThreshold,phStockTotal,phLots,addPhLot,phCamera,phPhoto,phPhotoView,phPhotoDelete,phPhotoStatus,phInformation,savePharmacy,cancelPharmacy,prescriptions,openPrescriptionForm,prescriptionList,prescriptionFormPanel,prescriptionFormTitle,prescriptionEditId,prescriptionItems,addPrescriptionItem,prescriptionValidityType,prescriptionValidityFields,prescriberContact,prescriberHint,issueDate,validUntil,renewalsAllowed,renewalsUsed,prescriptionPdf,prescriptionPdfStatus,viewPrescriptionPdf,removePrescriptionPdf,prescriptionNotes,savePrescription,cancelPrescription,more,fullHistory,exportBtn,importFile,takeModal,takeModalTitle,takeTreatmentId,takePlannedTime,takeQty,takeUnit,takeDate,takeTime,takeNote,confirmTake,prnChoiceModal,prnChoiceList,prnTakeModal,prnTakeTitle,prnPharmacyId,prnQty,prnUnit,prnDate,prnTime,prnNote,confirmPrn,measureModal,measureModalTitle,measureDefinitionId,measureValue,measureDate,measureActualTime,measureNote,confirmMeasure]=['today','todayDate','prnBtn','todayList','todayMeasures','todayHistoryCount','todayHistory','treatments','openTreatmentForm','treatmentList','treatmentFormPanel','formTitle','editId','treatmentProduct','treatmentProductInfo','reason','reasonOther','instruction','instructionOther','information','start','end','periodicity','weeklyOptions','monthlyOptions','monthDays','scheduleRows','addSchedule','saveTreatment','cancelEdit','openMeasureForm','measureList','measureFormPanel','measureFormTitle','measureEditId','measureType','measureTypeOther','measureUnit','measureUnitOther','measureInfo','measurePeriodicity','measureWeeklyOptions','measureMonthlyOptions','measureMonthDays','measureTime','saveMeasure','cancelMeasure','pillbox','printWeek','weekStart','weekDays','generateWeek','weekPlan','pharmacy','openPharmacyForm','importPharmacyBtn','importPharmacyFile','pharmacyList','pharmacyFilter','pharmacyFormPanel','pharmacyFormTitle','pharmacyEditId','phItemType','phStockFields','phName','phStrength','phUnit','phUnitOther','phThreshold','phStockTotal','phLots','addPhLot','phCamera','phPhoto','phPhotoView','phPhotoDelete','phPhotoStatus','phInformation','savePharmacy','cancelPharmacy','prescriptions','openPrescriptionForm','prescriptionList','prescriptionFormPanel','prescriptionFormTitle','prescriptionEditId','prescriptionItems','addPrescriptionItem','prescriptionValidityType','prescriptionValidityFields','prescriberContact','prescriberHint','issueDate','validUntil','renewalsAllowed','renewalsUsed','prescriptionPdf','prescriptionPdfStatus','viewPrescriptionPdf','removePrescriptionPdf','prescriptionNotes','savePrescription','cancelPrescription','more','fullHistory','exportBtn','importFile','takeModal','takeModalTitle','takeTreatmentId','takePlannedTime','takeQty','takeUnit','takeDate','takeTime','takeNote','confirmTake','prnChoiceModal','prnChoiceList','prnTakeModal','prnTakeTitle','prnPharmacyId','prnQty','prnUnit','prnDate','prnTime','prnNote','confirmPrn','measureModal','measureModalTitle','measureDefinitionId','measureValue','measureDate','measureActualTime','measureNote','confirmMeasure'].map(id=>document.getElementById(id));
const phNameSelect=document.getElementById('phNameSelect');
const phNameSearch=document.getElementById('phNameSearch');
const phNameSuggestions=document.getElementById('phNameSuggestions');
const phMedicationMissing=document.getElementById('phMedicationMissing');
const phMedicationNameWrap=document.getElementById('phMedicationNameWrap');
const phFreeNameWrap=document.getElementById('phFreeNameWrap');
const phMedicationLinkStatus=document.getElementById('phMedicationLinkStatus');

const contactLastNameSelect=document.getElementById('contactLastNameSelect');
const formPanelModal=document.getElementById('formPanelModal');
const formPanelHost=document.getElementById('formPanelHost');
const formPanelHomes=new Map();
function openFormWindow(panel){
 if(!panel)return;
 if(!formPanelHomes.has(panel)){
   const marker=document.createComment('form-home-'+panel.id);
   panel.parentNode.insertBefore(marker,panel);
   formPanelHomes.set(panel,marker);
 }
 formPanelHost.appendChild(panel);
 panel.classList.add('open');
 formPanelModal.classList.add('open');
}
function closeFormWindow(panel){
 if(!panel)return;
 panel.classList.remove('open');
 const marker=formPanelHomes.get(panel);
 if(marker?.parentNode)marker.parentNode.insertBefore(panel,marker.nextSibling);
 if(!formPanelHost.querySelector('.form-panel.open'))formPanelModal.classList.remove('open');
}


function save(){
 const text=JSON.stringify(db);
 if(__idbDb){
  clearTimeout(__saveTimer);
  __saveTimer=setTimeout(()=>idbWrite(text).catch(e=>{
   console.error(e);alert("Impossible d'enregistrer les données dans le stockage étendu : "+(e?.message||e));
  }),25);
  return;
 }
 // Avant l'initialisation IndexedDB, conserver le comportement historique.
 try{localStorage.setItem(KEY,text)}
 catch(e){console.error(e);alert("Impossible d'enregistrer les données : "+e.message)}
}
formPanelModal?.addEventListener('click',e=>{if(e.target===formPanelModal){const p=formPanelHost.querySelector('.form-panel.open');if(p)closeFormWindow(p)}});
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


document.getElementById('pdfPrev').onclick=async()=>{if(activePdfDoc&&activePdfPage>1){activePdfPage--;await renderActivePdfPage()}};
document.getElementById('pdfNext').onclick=async()=>{if(activePdfDoc&&activePdfPage<activePdfDoc.numPages){activePdfPage++;await renderActivePdfPage()}};
document.getElementById('pdfZoomIn').onclick=async()=>{if(activePdfDoc){activePdfScale=Math.min(2.5,activePdfScale+.2);await renderActivePdfPage()}};
document.getElementById('pdfZoomOut').onclick=async()=>{if(activePdfDoc){activePdfScale=Math.max(.6,activePdfScale-.2);await renderActivePdfPage()}};
async function openPrescriptionPdf(id){
 try{
   const f=await pdfGet(id);
   if(!f)return alert('Aucun PDF associé.');
   if(!configurePdfJs())return alert("Le lecteur PDF intégré n’est pas encore chargé. Vérifie la connexion puis réessaie.");
   if(activePdfRenderTask){try{activePdfRenderTask.cancel()}catch(_){}activePdfRenderTask=null}
   if(activePdfDoc){try{activePdfDoc.destroy()}catch(_){}activePdfDoc=null}
   const bytes=new Uint8Array(await f.arrayBuffer());
   activePdfDoc=await pdfjsLib.getDocument({data:bytes}).promise;
   activePdfPage=1;activePdfScale=1;
   const r=(db.prescriptions||[]).find(x=>x.id===id);
   document.getElementById('pdfViewerTitle').textContent='Ordonnance scannée';
   document.getElementById('pdfViewerInfo').textContent=r?[r.issueDate,r.reference||'',r.specialty||''].filter(Boolean).join(' · '):'';
   openModal('pdfViewerModal');
   await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
   await renderActivePdfPage();
 }catch(e){
   console.error(e);
   alert('Impossible d’afficher le PDF : '+(e.message||e));
 }
}
let prescriptionDraft=null,pdfRemovePending=false;
function normalizeLots(p){if(!p)return p;p.itemType=p.itemType||'product';p.lots=Array.isArray(p.lots)?p.lots:[];p.lots=p.lots.filter(l=>Number(l.qty||0)>0);p.stock=p.lots.reduce((s,l)=>s+Number(l.qty||0),0);p.expiry=(p.lots.filter(l=>l.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]||{}).expiry||'';return p}
function consumeStock(p,qty){normalizeLots(p);let left=Number(qty||0);[...p.lots].sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999')).forEach(l=>{if(left<=0)return;const n=Math.min(l.qty,left);l.qty-=n;left-=n});normalizeLots(p)}
function restoreStock(p,qty){normalizeLots(p);let l=p.lots.find(x=>!x.expiry);if(!l){l={id:uid(),qty:0,expiry:''};p.lots.push(l)}l.qty+=Number(qty||0);normalizeLots(p)}
function stockWarning(p){return Number(p.stock||0)<=Number(p.threshold||0)}
function unitAbbr(u=''){const s=u.toLowerCase();if(s.includes('comprim'))return'cpr';if(s.includes('caps'))return'cps';if(s.includes('gél'))return'gél.';if(s.includes('unité'))return'U';if(s.includes('millil'))return'ml';return u}
function getTreatmentProduct(t){return pharmacyItem(t.pharmacyId)||t}
function activeOn(t,date){return(!t.start||date>=t.start)&&(!t.end||date<=t.end)}function applies(periodicity,weekdays,monthDays,dateStr,start='',end=''){if(start&&dateStr<start)return false;if(end&&dateStr>end)return false;if(periodicity==='prn')return false;const d=new Date(dateStr+'T12:00:00');if((periodicity||'daily')==='daily')return true;if(periodicity==='weekly')return(weekdays||[]).map(Number).includes(d.getDay());if(periodicity==='monthly')return(monthDays||[]).map(Number).includes(d.getDate());return true}function appliesTreatment(t,d){return applies(t.periodicity,t.weekdays,t.monthDays,d,t.start,t.end)}function appliesMeasure(m,d){return applies(m.periodicity,m.weekdays,m.monthDays,d)}
function instructionPriority(text){const s=(text||'').toLowerCase();if(s.includes('à jeun'))return 0;if(s.includes('avant'))return 1;if(s.includes('pendant'))return 2;if(s.includes('après'))return 3;return 4}function periodicityLabel(t){if((t.periodicity||'daily')==='daily')return'Tous les jours';if(t.periodicity==='prn')return'Pris au besoin';if(t.periodicity==='weekly'){const n=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];return(t.weekdays||[]).map(x=>n[Number(x)]).join(', ')}return'Jour(s) '+(t.monthDays||[]).join(', ')+' du mois'}
function getCatalog(kind){const vals=new Set();if(kind==='unit'){db.pharmacy.forEach(p=>p.unit&&vals.add(p.unit));db.measures.forEach(m=>m.unit&&vals.add(m.unit))}else if(kind==='reason'||kind==='instruction'){db.treatments.forEach(t=>t[kind]&&vals.add(t[kind]))}else if(kind==='measureType'){db.measures.forEach(m=>m.type&&vals.add(m.type))}return[...vals].sort(alpha)}
function dynamicSelect(selectId,otherId,kind,current=''){const sel=document.getElementById(selectId),vals=getCatalog(kind);sel.innerHTML='<option value="">— Choisir —</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__OTHER__">Autre…</option>';if(current&&vals.includes(current))sel.value=current;else if(current){sel.value='__OTHER__';document.getElementById(otherId).value=current}else sel.value='';syncOther(selectId,otherId)}function syncOther(s,i,clear=false){const sel=document.getElementById(s),other=document.getElementById(i),on=sel.value==='__OTHER__';if(on&&clear)other.value='';other.classList.toggle('hidden',!on)}function selectedOrOther(s,i){return document.getElementById(s).value==='__OTHER__'?document.getElementById(i).value.trim():document.getElementById(s).value}
function isTreatmentCandidate(p){
 const t=String(p?.serviceType||'').trim().toLowerCase();
 if(p?.itemType!=='service')return true;
 if(!t||t==='mesure / prestation')return false;
 if(/ergoth[eé]rapie|physioth[eé]rapie|consultation|prestation|s[eé]ance|soins? infirm/i.test(t))return false;
 return true;
}
function fillProductSelect(id,current=''){const sel=document.getElementById(id),list=[...db.pharmacy].filter(isTreatmentCandidate).sort((a,b)=>alpha(a.name,b.name));const tail=id==='prescriptionProduct'?'<option value="__NEW__">＋ Nouveau médicament…</option>':'';sel.innerHTML='<option value="">— Choisir dans Pharmacie —</option>'+list.map(p=>`<option value="${p.id}">${esc(p.name)}${p.strength?' · '+esc(p.strength):''}</option>`).join('')+tail;sel.value=current||''}

let selectedTodayDay=isoDay();
function selectedDay(){
 const picker=document.getElementById('todayDayPicker');
 const picked=picker?.value;
 if(picked&&/^\d{4}-\d{2}-\d{2}$/.test(picked))selectedTodayDay=picked;
 return selectedTodayDay||isoDay();
}
let showPastPlanExplicitly=false;

function todayPrnHistoryHtml(day){
 const prn=db.history.filter(h=>h.date===day&&h.kind==='prn').sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 if(!prn.length)return '';
 return `<div class="time-head prn-history-head"><div class="time">Pris au besoin</div></div>`+
  prn.map(h=>`<div class="card compact-card dose-row taken prn-history-row"><div class="dose-main"><strong>${esc(h.name||'')}</strong><div class="dose-sub">${esc(h.time||'')} · ${esc(h.qty)} ${esc(h.unit||'')}${h.note?' · '+esc(h.note):''}</div></div><div class="actions prn-edit-actions"><span class="badge">Enregistré</span><button class="secondary prn-modify-btn" onclick="editPrnHistory('${h.id}')">Modifier</button></div></div>`).join('');
}
function renderToday(){
 renderTodayAlerts();
 const day=selectedDay(),todayIso=isoDay(),isToday=day===todayIso,isPast=day<todayIso,isFuture=day>todayIso;
 document.getElementById('todayTitle').textContent=isToday?'Aujourd’hui':'Journée';
 document.getElementById('todayDate').textContent=fmtDate(day);
 document.getElementById('todayDayPicker').value=day;
 const nextBtn=document.getElementById('todayNextDay');if(nextBtn)nextBtn.disabled=false;

 const pastActions=document.getElementById('pastDayActions');
 if(pastActions)pastActions.classList.toggle('hidden',!isPast);
 const futureActions=document.getElementById('futureDayActions');
 if(futureActions)futureActions.classList.toggle('hidden',!isFuture);
 document.getElementById('prnBtn').classList.toggle('hidden',!isToday);

 const heading=document.getElementById('todayTreatmentsHeading');
 let events=[];
 db.treatments.filter(t=>appliesTreatment(t,day)).forEach(t=>t.schedule.forEach(s=>events.push({t,s,p:getTreatmentProduct(t)})));
 events.sort((a,b)=>a.s.time.localeCompare(b.s.time)||instructionPriority(a.t.instruction)-instructionPriority(b.t.instruction)||alpha(a.p.name,b.p.name));

 const showPlan=!isPast||showPastPlanExplicitly;
 if(heading)heading.textContent=isToday?'Mes traitements':isFuture?'Traitements prévus ce jour':(showPlan?'Prises prévues ce jour':'Prises enregistrées');

 let out='',last='';
 if(showPlan){
   events.forEach(({t,s,p})=>{
     if(s.time!==last){
       if(last&&!isFuture)out+=`<div class="actions group-action"><button class="secondary small" onclick="takeGroup('${day}','${last}')">Tout enregistrer à ${last}</button></div>`;
       last=s.time;out+=`<div class="time-head"><div class="time">${s.time}</div></div>`;
     }
     const k=`${day}|${t.id}|${s.time}`,done=db.takes[k];
     const action=isFuture
       ? `<button class="secondary icon-btn" disabled>Prévu</button>`
       : `<button class="${done?'secondary':'primary'} icon-btn" onclick="${done?`cancelTake('${t.id}','${s.time}','${day}')`:`openTake('${t.id}','${s.time}','${day}')`}">${done?'Annuler':'Pris'}</button>`;
     out+=`<div class="card compact-card dose-row ${done?'taken':''}"><div class="dose-main"><strong>${esc(p.name)} ${esc(p.strength||'')}</strong><div class="dose-sub">${s.qty} ${esc(p.unit||'')} ${t.instruction?'· '+esc(t.instruction):''}${done?' · pris '+esc(done.qty)+' '+esc(done.unit||p.unit)+' à '+esc(done.time):''}</div></div>${action}</div>`;
   });
   if(last&&!isFuture)out+=`<div class="actions group-action"><button class="secondary small" onclick="takeGroup('${day}','${last}')">Tout enregistrer à ${last}</button></div>`;
   if(!isFuture)out+=todayPrnHistoryHtml(day);
   document.getElementById('todayList').innerHTML=out||`<div class="card compact-card">${isFuture?'Aucun traitement prévu':'Aucun traitement prévu'} le ${esc(fmtDate(day))}.</div>`;
 }else{
   const actual=db.history.filter(h=>h.date===day).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
   document.getElementById('todayList').innerHTML=actual.length?actual.map(h=>`<div class="card compact-card dose-row taken"><div class="dose-main"><strong>${esc(h.name||'')}</strong><div class="dose-sub">${esc(h.time||'')} · ${esc(h.qty)} ${esc(h.unit||'')} ${h.kind==='prn'?'· au besoin':''}${h.note?' · '+esc(h.note):''}</div></div></div>`).join(''):`<div class="card compact-card muted">Aucune prise enregistrée le ${esc(fmtDate(day))}.</div>`;
 }
 if(isToday){
   const prnTreatments=db.treatments.filter(t=>t.periodicity==='prn'&&activeOn(t,day)).sort((a,b)=>alpha(getTreatmentProduct(a).name,getTreatmentProduct(b).name));
   if(prnTreatments.length){
     const prnHtml=`<div class="time-head"><div class="time">Traitements au besoin disponibles</div></div>`+prnTreatments.map(t=>{
       const p=getTreatmentProduct(t);
       return `<div class="card compact-card dose-row"><div class="dose-main"><strong>${esc(p.name)} ${esc(p.strength||'')}</strong><div class="dose-sub">${esc(t.instruction||'Traitement pris au besoin')}</div></div><button class="primary icon-btn" onclick="choosePrn('${p.id}')">Pris</button></div>`;
     }).join('');
     document.getElementById('todayList').insertAdjacentHTML('beforeend',prnHtml);
   }
 }
 renderTodayMeasures(day);
}function renderTodayMeasures(day=selectedDay()){
 const todayIso=isoDay(),isPast=day<todayIso,isFuture=day>todayIso;
 const list=db.measures.filter(m=>appliesMeasure(m,day)).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||alpha(a.type,b.type));
 if(isPast&&!showPastPlanExplicitly){
   const actual=db.measureHistory.filter(h=>h.date===day).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
   document.getElementById('todayMeasures').innerHTML=actual.length?actual.map(h=>`<div class="card compact-card measure-row"><div><strong>${esc(h.type)}</strong><div class="muted">${esc(h.time||'')} · ${esc(h.value)} ${esc(h.unit||'')} ${h.note?'· '+esc(h.note):''}</div></div></div>`).join(''):`<div class="card compact-card muted">Aucune mesure enregistrée le ${esc(fmtDate(day))}.</div>`;
   return;
 }
 document.getElementById('todayMeasures').innerHTML=list.length?list.map(m=>`<div class="card compact-card measure-row"><div><strong>${esc(m.type)}</strong><div class="muted">${esc(m.time||'')} · ${esc(m.unit||'')} ${m.info?'· '+esc(m.info):''}</div></div>${isFuture?'<button class="secondary icon-btn" disabled>Prévue</button>':`<button class="primary icon-btn" onclick="openMeasureTake('${m.id}','${day}')">Saisir</button>`}</div>`).join(''):`<div class="card compact-card muted">Aucune mesure prévue le ${esc(fmtDate(day))}.</div>`;
}
function renderTodayHistory(day=selectedDay()){
 const med=db.history.filter(h=>h.date===day).map(h=>({...h,_type:'med'}));
 const meas=db.measureHistory.filter(h=>h.date===day).map(h=>({...h,_type:'measure'}));
 const items=[...med,...meas].sort((a,b)=>(b.time||'').localeCompare(a.time||''));
 const hc=document.getElementById('todayHistoryCount'),hh=document.getElementById('todayHistory');if(!hc||!hh)return;
 hc.textContent=items.length;
 hh.innerHTML=items.length?items.map(h=>h._type==='measure'?`<div class="history-row"><div><strong>${esc(h.time)}</strong><br><span class="badge">Mesure</span></div><div><strong>${esc(h.type)}</strong><div class="muted">${esc(h.value)} ${esc(h.unit||'')} ${h.note?'· '+esc(h.note):''}</div></div></div>`:`<div class="history-row"><div><strong>${esc(h.time)}</strong><br><span class="badge">${h.kind==='prn'?'Au besoin':'Planifié'}</span></div><div><strong>${esc(h.name)}</strong><div class="muted">${esc(h.qty)} ${esc(h.unit||'')} ${h.note?'· '+esc(h.note):''}</div></div></div>`).join(''):`<div class="muted">Rien enregistré le ${esc(fmtDate(day))}.</div>`;
}
function openTake(id,time,day=selectedDay()){
 const t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t),s=t?.schedule.find(x=>x.time===time);if(!t||!s)return;
 const k=`${day}|${id}|${time}`,e=db.takes[k];
 takeTreatmentId.value=id;takePlannedTime.value=time;takeTreatmentId.dataset.day=day;takeModalTitle.textContent=p.name;takeQty.value=e?.qty??s.qty;takeUnit.value=p.unit||'';takeDate.value=e?.actualDate||day;takeTime.value=e?.time||currentTime();takeNote.value=e?.note||'';openModal('takeModal');
}
confirmTake.onclick=()=>{
 const id=takeTreatmentId.value,planned=takePlannedTime.value,day=takeTreatmentId.dataset.day||selectedDay(),t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t);if(!t||!p)return;
 const key=`${day}|${id}|${planned}`,qty=Number(takeQty.value||0);if(qty<=0)return alert('Indique la quantité.');
 const old=db.takes[key];if(old?.qty)restoreStock(p,old.qty);consumeStock(p,qty);
 db.takes[key]={qty,unit:p.unit,actualDate:takeDate.value,time:takeTime.value,note:takeNote.value.trim()};
 db.history=db.history.filter(h=>h.eventKey!==key);
 db.history.push({id:uid(),eventKey:key,kind:'planned',date:takeDate.value,time:takeTime.value,name:p.name,strength:p.strength,qty,unit:p.unit,note:takeNote.value.trim()});
 closeModal('takeModal');save();renderToday();
}
function cancelTake(id,time,day=selectedDay()){
 const key=`${day}|${id}|${time}`,old=db.takes[key],t=db.treatments.find(x=>x.id===id),p=getTreatmentProduct(t);
 if(old?.qty&&p)restoreStock(p,old.qty);delete db.takes[key];db.history=db.history.filter(h=>h.eventKey!==key);save();renderToday();
}
let pendingGroupDay='',pendingGroupPlanned='';

const groupTakeModalEl=document.getElementById('groupTakeModal');
const groupTakeTitleEl=document.getElementById('groupTakeTitle');
const groupTakeDateEl=document.getElementById('groupTakeDate');
const groupTakeTimeEl=document.getElementById('groupTakeTime');
const groupPlannedTimeEl=document.getElementById('groupPlannedTime');
const groupActualTimeEl=document.getElementById('groupActualTime');
const groupCustomTimeEl=document.getElementById('groupCustomTime');

function takeGroup(day,time){
 pendingGroupDay=day;pendingGroupPlanned=time;
 groupTakeTitleEl.textContent=`Toutes les prises prévues à ${time}`;
 groupTakeDateEl.value=day;groupTakeTimeEl.value=currentTime();
 openModal('groupTakeModal');
}
function commitGroupTake(actualTime){
 const day=pendingGroupDay,time=pendingGroupPlanned,date=groupTakeDateEl.value||day;
 let count=0;
 db.treatments.filter(t=>appliesTreatment(t,day)).forEach(t=>t.schedule.filter(s=>s.time===time).forEach(s=>{
  const key=`${day}|${t.id}|${time}`;if(db.takes[key])return;
  const p=getTreatmentProduct(t),qty=Number(s.qty||0);if(p)consumeStock(p,qty);
  db.takes[key]={qty,unit:p?.unit||'',actualDate:date,time:actualTime,note:''};
  db.history.push({id:uid(),eventKey:key,kind:'planned',date,time:actualTime,name:p?.name||'',strength:p?.strength||'',qty,unit:p?.unit||'',note:''});
  count++;
 }));
 closeModal('groupTakeModal');
 if(count){save();renderToday();renderPharmacy()}
 else alert('Toutes les prises de ce groupe sont déjà enregistrées.');
}

prnBtn.onclick=()=>{const explicit=new Set(db.treatments.filter(t=>t.periodicity==='prn'&&activeOn(t,selectedDay())).map(t=>t.pharmacyId));const list=[...db.pharmacy].filter(p=>isTreatmentCandidate(p)&&Number(p.stock||0)>0).sort((a,b)=>(explicit.has(b.id)-explicit.has(a.id))||alpha(a.name,b.name));prnChoiceList.innerHTML=list.length?list.map(p=>`<button class="secondary choice" onclick="choosePrn('${p.id}')"><strong>${esc(p.name)}</strong><br><span class="muted">Stock ${p.stock} ${esc(p.unit)}</span></button>`).join(''):'<div class="notice">Pharmacie vide.</div>';openModal('prnChoiceModal')}
function choosePrn(id){const p=pharmacyItem(id);if(!p)return;closeModal('prnChoiceModal');document.getElementById('prnHistoryId').value='';prnPharmacyId.value=id;prnTakeTitle.textContent=p.name;prnQty.value=1;prnUnit.value=p.unit||'';prnDate.value=selectedDay();prnTime.value=currentTime();prnNote.value='';openModal('prnTakeModal')}
function editPrnHistory(id){
 const h=db.history.find(x=>x.id===id&&x.kind==='prn');if(!h)return;
 const p=pharmacyItem(h.pharmacyId)||db.pharmacy.find(x=>x.name===h.name);
 document.getElementById('prnHistoryId').value=h.id;prnPharmacyId.value=h.pharmacyId||p?.id||'';
 prnTakeTitle.textContent='Modifier · '+(h.name||'prise au besoin');prnQty.value=h.qty;prnUnit.value=h.unit||p?.unit||'';
 prnDate.value=h.date;prnTime.value=h.time;prnNote.value=h.note||'';openModal('prnTakeModal');
}
confirmPrn.onclick=()=>{
 const editHistoryId=document.getElementById('prnHistoryId').value;
 const p=pharmacyItem(prnPharmacyId.value),qty=Number(prnQty.value||0);if(!p||qty<=0)return;
 if(editHistoryId){
   const h=db.history.find(x=>x.id===editHistoryId&&x.kind==='prn');if(!h)return;
   const delta=qty-Number(h.qty||0);if(delta>0)consumeStock(p,delta);else if(delta<0){const lot=p.lots?.[0];if(lot)lot.qty=Number(lot.qty||0)+Math.abs(delta);normalizeLots(p)}
   Object.assign(h,{date:prnDate.value,time:prnTime.value,qty,unit:p.unit,note:prnNote.value.trim(),pharmacyId:p.id,name:p.name,strength:p.strength});
 }else{
   consumeStock(p,qty);db.history.push({id:uid(),eventKey:'prn-'+uid(),kind:'prn',date:prnDate.value,time:prnTime.value,name:p.name,strength:p.strength,qty,unit:p.unit,note:prnNote.value.trim(),pharmacyId:p.id});
 }
 closeModal('prnTakeModal');document.getElementById('prnHistoryId').value='';save();renderToday();renderPharmacy();
}

function treatmentScheduleSummary(t,p){
 if(t.periodicity==='prn')return 'Pris au besoin';
 const sched=(t.schedule||[]).map(s=>`${s.time} ${s.qty} ${unitAbbr(p?.unit||'')}`).join(' · ');
 return [sched,periodicityLabel(t),t.instruction].filter(Boolean).join(' · ');
}
function renderTreatments(){
 const list=[...db.treatments].sort((a,b)=>alpha(getTreatmentProduct(a).name,getTreatmentProduct(b).name));
 treatmentList.innerHTML=list.length?list.map(t=>{
  const p=getTreatmentProduct(t);
  const second=[p.strength,treatmentScheduleSummary(t,p)].filter(Boolean).join(' · ');
  return `<div class="card compact-card treatment-row treatment-two-lines">
   <div class="treatment-main">
    <div class="treatment-name-line"><strong>${esc(p.name)}</strong></div>
    <div class="muted treatment-detail-line">${esc(second)}</div>
   </div>
   <div class="actions treatment-actions">
    <button class="secondary icon-btn" onclick="viewTreatment('${t.id}')">Voir</button>
    <button class="secondary icon-btn" onclick="editTreatment('${t.id}')">Modifier</button>
    <button class="danger icon-btn" onclick="deleteTreatment('${t.id}')">×</button>
   </div>
  </div>`;
 }).join(''):'<div class="card compact-card">Aucun traitement.</div>';
 fillProductSelect('treatmentProduct')
}
function addScheduleRow(time='09:00',qty=1){const d=document.createElement('div');d.className='schedule-row';d.innerHTML=`<input type="time" class="stime" value="${time}"><input type="number" class="sqty" min="0" step=".5" value="${qty}"><button class="danger">Retirer</button>`;d.querySelector('button').onclick=()=>d.remove();scheduleRows.appendChild(d)}addSchedule.onclick=()=>addScheduleRow('12:00',1)
function updatePeriodUI(){weeklyOptions.classList.toggle('hidden',periodicity.value!=='weekly');monthlyOptions.classList.toggle('hidden',periodicity.value!=='monthly');const prn=periodicity.value==='prn';scheduleRows.classList.toggle('hidden',prn);addSchedule.classList.toggle('hidden',prn)}periodicity.onchange=updatePeriodUI;reason.onchange=()=>syncOther('reason','reasonOther',true);instruction.onchange=()=>syncOther('instruction','instructionOther',true);
function showProductInfo(){const p=pharmacyItem(treatmentProduct.value);if(!p){treatmentProductInfo?.classList.add('hidden');return}treatmentProductInfo?.classList.remove('hidden');if(treatmentProductInfo)treatmentProductInfo.innerHTML=`<strong>${esc(p.name)}</strong>${p.strength?' · '+esc(p.strength):''}<br>Unité: ${esc(p.unit)} · Stock: ${p.stock} · Péremption: ${esc(p.expiry||'—')}${p.information?'<br>'+esc(p.information):''}`}treatmentProduct.onchange=showProductInfo;
function resetTreatment(){editId.value='';formTitle.textContent='Ajouter un traitement';fillProductSelect('treatmentProduct');treatmentProductInfo?.classList.add('hidden');dynamicSelect('reason','reasonOther','reason');dynamicSelect('instruction','instructionOther','instruction');information.value='';start.value=isoDay();end.value='';periodicity.value='daily';document.querySelectorAll('.weekday').forEach(c=>c.checked=false);monthDays.value='';scheduleRows.innerHTML='';addScheduleRow();updatePeriodUI()}
openTreatmentForm.onclick=()=>{if(!db.pharmacy.length)return alert('Ajoute ou importe d’abord les médicaments dans Pharmacie.');resetTreatment();openFormWindow(treatmentFormPanel)};
document.getElementById('addOneOffTreatment').onclick=()=>{
 if(!db.pharmacy.length)return alert('Ajoute ou importe d’abord les médicaments dans Pharmacie.');
 const day=selectedDay();
 document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='treatments'));
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='treatments'));
 resetTreatment();formTitle.textContent='Ajouter un traitement isolé';start.value=day;end.value=day;periodicity.value='daily';updatePeriodUI();
 openFormWindow(treatmentFormPanel);
};cancelEdit.onclick=()=>closeFormWindow(treatmentFormPanel);
saveTreatment.onclick=()=>{const pid=treatmentProduct.value;if(!pid)return alert('Choisis un médicament de la Pharmacie.');const schedule=[...scheduleRows.children].map(r=>({time:r.querySelector('.stime').value,qty:Number(r.querySelector('.sqty').value||0)})).filter(x=>x.time);if(periodicity.value!=='prn'&&!schedule.length)return alert('Ajoute une heure.');const wd=[...document.querySelectorAll('.weekday:checked')].map(c=>Number(c.value)),md=monthDays.value.split(',').map(x=>Number(x.trim())).filter(x=>x>=1&&x<=31);if(periodicity.value==='weekly'&&!wd.length)return alert('Choisis un jour.');if(periodicity.value==='monthly'&&!md.length)return alert('Indique un jour du mois.');const obj={id:editId.value||uid(),pharmacyId:pid,reason:selectedOrOther('reason','reasonOther'),instruction:selectedOrOther('instruction','instructionOther'),information:information.value.trim(),start:start.value,end:end.value,periodicity:periodicity.value,weekdays:wd,monthDays:md,schedule};const ix=db.treatments.findIndex(x=>x.id===obj.id);if(ix>=0)db.treatments[ix]=obj;else db.treatments.push(obj);closeFormWindow(treatmentFormPanel);save()}
function viewTreatment(id){
 const t=db.treatments.find(x=>x.id===id);if(!t)return;
 const p=getTreatmentProduct(t);
 treatmentDetailTitle.textContent=(p?.name||'Traitement')+(p?.strength?' · '+p.strength:'');
 const rows=[
  ['Médicament',p?.name||'—'],
  ['Dosage',p?.strength||'—'],
  ['Unité',p?.unit||'—'],
  ['Raison',t.reason||'—'],
  ['Instructions',t.instruction||'—'],
  ['Informations',t.information||p?.information||'—'],
  ['Début',t.start?fmtDate(t.start):'—'],
  ['Fin',t.end?fmtDate(t.end):'—'],
  ['Périodicité',periodicityLabel(t)||'—'],
  ['Stock',p?.stock!=null?`${p.stock} ${p?.unit||''}`:'—'],
  ['Prochaine péremption',p?.expiry?fmtDate(p.expiry):'—']
 ];
 treatmentDetailBody.innerHTML=`
   ${p?.photo?`<img class="photo-preview" src="${p.photo}">`:''}
   <div class="treatment-view-grid">
     ${rows.map(([k,v])=>`<div class="treatment-view-row"><div class="treatment-view-label">${esc(k)}</div><div class="treatment-view-value">${esc(v)}</div></div>`).join('')}
   </div>
   ${(t.schedule||[]).length?`<div class="treatment-view-section"><h4>Posologie</h4>${t.schedule.map(s=>`<div class="treatment-view-dose"><strong>${esc(s.time)}</strong> · ${esc(s.qty)} ${esc(unitAbbr(p?.unit||''))}</div>`).join('')}</div>`:''}`;
 openModal('treatmentDetailModal');
}
function editTreatment(id){const t=db.treatments.find(x=>x.id===id);if(!t)return;resetTreatment();editId.value=t.id;formTitle.textContent='Modifier le traitement';fillProductSelect('treatmentProduct',t.pharmacyId);showProductInfo();dynamicSelect('reason','reasonOther','reason',t.reason||'');dynamicSelect('instruction','instructionOther','instruction',t.instruction||'');information.value=t.information||'';start.value=t.start||'';end.value=t.end||'';periodicity.value=t.periodicity||'daily';document.querySelectorAll('.weekday').forEach(c=>c.checked=(t.weekdays||[]).map(Number).includes(Number(c.value)));monthDays.value=(t.monthDays||[]).join(',');scheduleRows.innerHTML='';t.schedule.forEach(s=>addScheduleRow(s.time,s.qty));updatePeriodUI();openFormWindow(treatmentFormPanel)}function deleteTreatment(id){if(confirm('Supprimer ce traitement ?')){db.treatments=db.treatments.filter(x=>x.id!==id);save()}}

function renderMeasures(){const list=[...db.measures].sort((a,b)=>alpha(a.type,b.type));measureList.innerHTML=list.length?list.map(m=>`<div class="card compact-card measure-row"><div><strong>${esc(m.type)}</strong><div class="muted">${esc(m.time)} · ${esc(m.unit)} · ${esc(periodicityLabel(m))}${m.info?' · '+esc(m.info):''}</div></div><div class="actions"><button class="secondary icon-btn" onclick="editMeasure('${m.id}')">Modifier</button><button class="danger icon-btn" onclick="deleteMeasure('${m.id}')">×</button></div></div>`).join(''):'<div class="card compact-card muted">Aucune mesure planifiée.</div>'}
function updateMeasurePeriod(){measureWeeklyOptions.classList.toggle('hidden',measurePeriodicity.value!=='weekly');measureMonthlyOptions.classList.toggle('hidden',measurePeriodicity.value!=='monthly')}measurePeriodicity.onchange=updateMeasurePeriod;measureType.onchange=()=>syncOther('measureType','measureTypeOther',true);measureUnit.onchange=()=>syncOther('measureUnit','measureUnitOther',true);
function resetMeasure(){measureEditId.value='';measureFormTitle.textContent='Ajouter une mesure';dynamicSelect('measureType','measureTypeOther','measureType');dynamicSelect('measureUnit','measureUnitOther','unit');measureInfo.value='';measurePeriodicity.value='daily';document.querySelectorAll('.mweekday').forEach(c=>c.checked=false);measureMonthDays.value='';measureTime.value='08:00';updateMeasurePeriod()}
openMeasureForm.onclick=()=>{resetMeasure();openFormWindow(measureFormPanel)};cancelMeasure.onclick=()=>closeFormWindow(measureFormPanel);saveMeasure.onclick=()=>{const type=selectedOrOther('measureType','measureTypeOther'),unit=selectedOrOther('measureUnit','measureUnitOther');if(!type)return alert('Indique le type de mesure.');const wd=[...document.querySelectorAll('.mweekday:checked')].map(c=>Number(c.value)),md=measureMonthDays.value.split(',').map(x=>Number(x.trim())).filter(x=>x>=1&&x<=31);if(measurePeriodicity.value==='weekly'&&!wd.length)return alert('Choisis un jour.');if(measurePeriodicity.value==='monthly'&&!md.length)return alert('Indique un jour du mois.');const m={id:measureEditId.value||uid(),type,unit,info:measureInfo.value.trim(),periodicity:measurePeriodicity.value,weekdays:wd,monthDays:md,time:measureTime.value};const ix=db.measures.findIndex(x=>x.id===m.id);if(ix>=0)db.measures[ix]=m;else db.measures.push(m);closeFormWindow(measureFormPanel);save()};function editMeasure(id){const m=db.measures.find(x=>x.id===id);if(!m)return;resetMeasure();measureEditId.value=m.id;measureFormTitle.textContent='Modifier la mesure';dynamicSelect('measureType','measureTypeOther','measureType',m.type);dynamicSelect('measureUnit','measureUnitOther','unit',m.unit);measureInfo.value=m.info||'';measurePeriodicity.value=m.periodicity||'daily';document.querySelectorAll('.mweekday').forEach(c=>c.checked=(m.weekdays||[]).map(Number).includes(Number(c.value)));measureMonthDays.value=(m.monthDays||[]).join(',');measureTime.value=m.time||'08:00';updateMeasurePeriod();openFormWindow(measureFormPanel)}function deleteMeasure(id){if(confirm('Supprimer cette mesure ?')){db.measures=db.measures.filter(x=>x.id!==id);save()}}
function openMeasureTake(id,day=selectedDay()){const m=db.measures.find(x=>x.id===id);if(!m)return;measureDefinitionId.value=id;measureModalTitle.textContent=m.type;measureValue.value='';measureDate.value=day;measureActualTime.value=currentTime();measureNote.value='';openModal('measureModal')}confirmMeasure.onclick=()=>{const m=db.measures.find(x=>x.id===measureDefinitionId.value);if(!m||!measureValue.value.trim())return alert('Indique la valeur.');db.measureHistory.push({id:uid(),definitionId:m.id,type:m.type,unit:m.unit,value:measureValue.value.trim(),date:measureDate.value,time:measureActualTime.value,note:measureNote.value.trim()});closeModal('measureModal');save()}



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
function prescriberDisplayLabel(c){
 if(!c)return'Prescripteur non indiqué';
 return [contactDisplayName(c),c.reference,c.specialty].filter(Boolean).join(' · ');
}
function fillPrescriberSelect(current=''){
 const list=db.contacts.filter(c=>c.type==='Médecin'||c.type==='Thérapeute').sort((a,b)=>alpha(contactDisplayName(a),contactDisplayName(b)));
 prescriberContact.innerHTML='<option value="">— Choisir un prescripteur —</option>'+list.map(c=>`<option value="${c.id}">${esc(contactDisplayName(c))}${c.reference?' · '+esc(c.reference):''}${c.specialty?' · '+esc(c.specialty):''}</option>`).join('')+'<option value="__NEW_CONTACT__">＋ Nouveau contact de santé…</option>';
 prescriberContact.value=current||'';
}
contactLastNameSelect.onchange=()=>{
 if(contactLastNameSelect.value==='__OTHER__'){contactLastName.value='';contactLastName.classList.remove('hidden');contactLastName.focus();return}
 if(!contactLastNameSelect.value){contactLastName.value='';contactLastName.classList.add('hidden');return}
 const c=db.contacts.find(x=>x.id===contactLastNameSelect.value);
 if(c){contactLastName.value=c.lastName||contactDisplayName(c);contactLastName.classList.add('hidden');contactReference.value=c.reference||''}
};
function renderContacts(){
 refreshContactNameSuggestions(contactLastName.value,contactReference.value);
 const type=contactFilter.value||'',q=(contactSearch.value||'').toLowerCase().trim();
 const list=[...db.contacts].filter(c=>{
   if(type&&c.type!==type)return false;
   if(!q)return true;
   return [c.type,c.firstName,c.lastName,c.specialty,c.reference,c.city,c.notes].join(' ').toLowerCase().includes(q)
 }).sort((a,b)=>alpha(contactDisplayName(a),contactDisplayName(b)));
 contactList.innerHTML=list.length?list.map(c=>`<div class="card compact-card contact-row"><div>
 <div><span class="contact-badge ${contactBadgeClass(c.type)}">${esc(c.type||'Autre')}</span>${c.primary?'<span class="contact-primary">★ Référent actif</span>':''}</div>
 <div class="contact-name">${esc(contactDisplayName(c))}</div><div class="muted">${c.reference?esc(c.reference)+' · ':''}${esc(c.specialty||'')}${c.city?' · '+esc(c.city):''}${c.phone?' · '+esc(c.phone):''}</div>
 </div><div class="actions"><button class="secondary icon-btn" onclick="viewContact('${c.id}')">Voir</button><button class="secondary icon-btn" onclick="duplicateContact('${c.id}')">Dupliquer</button><button class="secondary icon-btn" onclick="editContact('${c.id}')">Modifier</button><button class="danger icon-btn" onclick="deleteContact('${c.id}')">×</button></div></div>`).join(''):'<div class="card compact-card">Aucun contact.</div>';
}
function resetContactForm(){
 contactEditId.value='';contactFormTitle.textContent='Ajouter un contact de santé';contactType.value='Médecin';contactTypeOther.value='';contactTypeOther.classList.add('hidden');
 ['contactFirstName','contactReference','contactPhone','contactMobile','contactEmail','contactAddress','contactZip','contactCity','contactWebsite','contactNotes'].forEach(id=>document.getElementById(id).value='');
 contactPrimary.checked=false;fillContactSpecialty();refreshContactNameSuggestions('');
}
openContactForm.onclick=()=>{resetContactForm();openFormWindow(contactFormPanel)};
cancelContact.onclick=()=>closeFormWindow(contactFormPanel);
contactType.onchange=()=>{const on=contactType.value==='Autre';if(on)contactTypeOther.value='';contactTypeOther.classList.toggle('hidden',!on)};
contactSpecialty.onchange=()=>{const on=contactSpecialty.value==='__OTHER__';if(on)contactSpecialtyOther.value='';contactSpecialtyOther.classList.toggle('hidden',!on)};
contactFilter.onchange=renderContacts;contactSearch.oninput=renderContacts;

saveContact.onclick=()=>{
 const type=contactType.value==='Autre'?(contactTypeOther.value.trim()||'Autre'):contactType.value;
 const specialty=contactSpecialty.value==='__OTHER__'?contactSpecialtyOther.value.trim():contactSpecialty.value;
 if(!contactLastName.value.trim()&&!contactFirstName.value.trim())return alert('Indique au moins un nom.');
 const c={id:contactEditId.value||uid(),type,firstName:contactFirstName.value.trim(),lastName:contactLastName.value.trim(),specialty,
 reference:contactReference.value.trim(),phone:formatInternationalPhone(contactPhone.value),mobile:formatInternationalPhone(contactMobile.value),email:contactEmail.value.trim(),
 address:contactAddress.value.trim(),zip:contactZip.value.trim(),city:contactCity.value.trim(),website:contactWebsite.value.trim(),
 notes:contactNotes.value.trim(),primary:contactPrimary.checked};
 const ix=db.contacts.findIndex(x=>x.id===c.id);if(ix>=0)db.contacts[ix]=c;else db.contacts.push(c);
 closeFormWindow(contactFormPanel);save();fillPrescriberSelect();renderContacts();revealSavedRow(c.id,'contact');
 if(prescriptionDraft?.mode==='contact'){
   const d=prescriptionDraft;prescriptionDraft=null;
   document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='prescriptions'));
   document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='prescriptions'));
   resetPrescription();openFormWindow(prescriptionFormPanel);
   fillProductSelect('prescriptionProduct',d.pharmacyId||'');fillPrescriberSelect(c.id);
   issueDate.value=d.issueDate||isoDay();validUntil.value=d.validUntil||'';renewalsAllowed.value=d.renewalsAllowed||0;renewalsUsed.value=d.renewalsUsed||0;prescriptionNotes.value=d.notes||'';
   prescriberHint.textContent='Nouveau prescripteur ajouté aux Contacts de santé.';
   prescriptionFormPanel.scrollIntoView({behavior:'smooth'});
 }
};

function formatInternationalPhone(v){
 let raw=String(v||'').trim();if(!raw)return'';
 raw=raw.replace(/^00/,'+');
 const plus=raw.startsWith('+');
 let digits=raw.replace(/\D/g,'');
 if(!digits)return plus?'+':'';

 // Switzerland: +41 xx xxx xx xx (and keep any extra digits visibly grouped).
 if(plus&&digits.startsWith('41')){
   let n=digits.slice(2);if(n.startsWith('0'))n=n.slice(1);
   const parts=[];if(n){parts.push(n.slice(0,2));n=n.slice(2)}
   if(n){parts.push(n.slice(0,3));n=n.slice(3)}
   while(n.length>2){parts.push(n.slice(0,2));n=n.slice(2)}
   if(n)parts.push(n);
   return '+41 '+parts.filter(Boolean).join(' ');
 }
 // Swiss national format.
 if(!plus&&digits.startsWith('0')&&digits.length>=10){
   let n=digits.slice(1),parts=[digits.slice(0,3),n.slice(2,5),n.slice(5,7),n.slice(7)];
   return parts.filter(Boolean).join(' ');
 }

 // Other countries: preserve international prefix and add readable groups.
 if(plus){
   const oneDigit=new Set(['1','7']);
   const twoDigit=new Set(['20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98']);
   let ccLen=oneDigit.has(digits.slice(0,1))?1:(twoDigit.has(digits.slice(0,2))?2:3);
   const cc=digits.slice(0,ccLen);let n=digits.slice(ccLen),parts=[];
   while(n.length>4){parts.push(n.slice(0,3));n=n.slice(3)}
   if(n.length===4){parts.push(n.slice(0,2),n.slice(2))}
   else if(n)parts.push(n);
   return '+'+cc+(parts.length?' '+parts.join(' '):'');
 }
 return raw.replace(/\s+/g,' ');
}
['contactPhone','contactMobile'].forEach(id=>{
 const el=document.getElementById(id);
 if(el){
   el.addEventListener('input',()=>{const end=el.selectionStart===el.value.length;el.value=formatInternationalPhone(el.value);if(end)try{el.setSelectionRange(el.value.length,el.value.length)}catch(_){}});
   el.addEventListener('blur',()=>{el.value=formatInternationalPhone(el.value)});
 }
});
function duplicateContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;
 resetContactForm();contactFormTitle.textContent='Dupliquer le contact';
 if(['Médecin','Thérapeute','Pharmacie'].includes(c.type)){contactType.value=c.type;contactTypeOther.classList.add('hidden')}else{contactType.value='Autre';contactTypeOther.value=c.type||'';contactTypeOther.classList.remove('hidden')}
 contactFirstName.value='';refreshContactNameSuggestions(c.lastName||'',c.reference||'');fillContactSpecialty(c.specialty||'');contactReference.value='';
 contactPhone.value=c.phone||'';contactMobile.value=c.mobile||'';contactEmail.value=c.email||'';contactAddress.value=c.address||'';contactZip.value=c.zip||'';
 contactCity.value=c.city||'';contactWebsite.value=c.website||'';contactNotes.value=c.notes||'';contactPrimary.checked=false;
 openFormWindow(contactFormPanel);
}
function editContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;resetContactForm();contactEditId.value=c.id;contactFormTitle.textContent='Modifier le contact';
 if(['Médecin','Thérapeute','Pharmacie'].includes(c.type)){contactType.value=c.type;contactTypeOther.classList.add('hidden')}else{contactType.value='Autre';contactTypeOther.value=c.type||'';contactTypeOther.classList.remove('hidden')}
 contactFirstName.value=c.firstName||'';contactLastName.value=c.lastName||'';fillContactSpecialty(c.specialty||'');contactReference.value=c.reference||'';
 contactPhone.value=c.phone||'';contactMobile.value=c.mobile||'';contactEmail.value=c.email||'';contactAddress.value=c.address||'';contactZip.value=c.zip||'';
 contactCity.value=c.city||'';contactWebsite.value=c.website||'';contactNotes.value=c.notes||'';contactPrimary.checked=!!c.primary;
 openFormWindow(contactFormPanel);
}
function viewContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;contactDetailTitle.textContent=contactDisplayName(c);
 contactDetailBody.innerHTML=`<div><span class="contact-badge ${contactBadgeClass(c.type)}">${esc(c.type||'Autre')}</span>${c.primary?'<span class="contact-primary">★ Référent actif</span>':''}</div>
 <div class="contact-detail-grid"><strong>Spécialité</strong><span>${esc(c.specialty||'—')}</span><strong>Référence</strong><span>${esc(c.reference||'—')}</span>
 <strong>Téléphone</strong><span>${esc(c.phone||'—')}</span><strong>Mobile</strong><span>${esc(c.mobile||'—')}</span><strong>E-mail</strong><span>${esc(c.email||'—')}</span>
 <strong>Adresse</strong><span>${esc(c.address||'—')}</span><strong>NPA / localité</strong><span>${esc([c.zip,c.city].filter(Boolean).join(' ')||'—')}</span>
 <strong>Site web</strong><span>${esc(c.website||'—')}</span><strong>Remarques</strong><span>${esc(c.notes||'—')}</span></div><div class="actions top-gap"><button class="secondary" onclick="printContact('${c.id}')">Imprimer</button></div>`;
 openModal('contactDetailModal');
}
function printContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;
 const body=`<table><tbody><tr><th>Type</th><td>${reportEscape(c.type||'')}</td></tr><tr><th>Nom / établissement</th><td>${reportEscape(contactDisplayName(c))}</td></tr><tr><th>Personne de référence</th><td>${reportEscape(c.reference||'')}</td></tr><tr><th>Spécialité</th><td>${reportEscape(c.specialty||'')}</td></tr><tr><th>Téléphone</th><td>${reportEscape(c.phone||'')}</td></tr><tr><th>Mobile</th><td>${reportEscape(c.mobile||'')}</td></tr><tr><th>E-mail</th><td>${reportEscape(c.email||'')}</td></tr><tr><th>Adresse</th><td>${reportEscape(c.address||'')}</td></tr><tr><th>NPA / localité</th><td>${reportEscape([c.zip,c.city].filter(Boolean).join(' '))}</td></tr><tr><th>Site web</th><td>${reportEscape(c.website||'')}</td></tr><tr><th>Remarques</th><td>${reportEscape(c.notes||'')}</td></tr></tbody></table>`;
 reportPrintDocument('Contact — '+contactDisplayName(c),body);
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
   if(p.itemType==='service')return;
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

function pharmacyTypeLabel(t,serviceType=''){
 if(t==='service')return serviceType||'Mesure / prestation';
 if(String(serviceType||'').toLowerCase().includes('médicament')||String(serviceType||'').toLowerCase().includes('medicament'))return'Médicament';
 if(serviceType)return serviceType;
 return'Médicament / produit';
}
function fillPhItemType(itemType='product',serviceType=''){
 const sel=document.getElementById('phItemType'),other=document.getElementById('phItemTypeOther');
 const custom=uniqueSorted((db.pharmacy||[]).map(p=>p.serviceType).filter(v=>v&&!['Médicament','Produit / accessoire','Mesure / prestation'].includes(v)));
 sel.innerHTML='<option value="medication">Médicament</option><option value="product">Produit / accessoire</option><option value="service">Mesure / prestation</option>'
   +custom.map(v=>`<option value="service::${esc(v)}">${esc(v)}</option>`).join('')
   +'<option value="__OTHER__">Autre…</option>';
 const normalized=String(serviceType||'').toLowerCase();
 if(itemType==='product'&&(normalized.includes('médicament')||normalized.includes('medicament'))){sel.value='medication'}
 else if(itemType==='product'&&serviceType==='Produit / accessoire'){sel.value='product'}
 else if(itemType==='product'&&!serviceType){sel.value='medication'}
 else if(itemType==='service'&&(!serviceType||serviceType==='Mesure / prestation')){sel.value='service'}
 else if(serviceType){
   const val='service::'+serviceType;
   if([...sel.options].some(o=>o.value===val))sel.value=val;
   else{sel.value='__OTHER__';other.value=serviceType;other.classList.remove('hidden')}
 }
 updatePharmacyNameMode();
}
function currentPharmacyType(){
 const v=document.getElementById('phItemType').value,other=document.getElementById('phItemTypeOther');
 if(v==='medication')return{itemType:'product',serviceType:'Médicament'};
 if(v==='product')return{itemType:'product',serviceType:'Produit / accessoire'};
 if(v==='service')return{itemType:'service',serviceType:'Mesure / prestation'};
 if(v==='__OTHER__')return{itemType:'service',serviceType:other.value.trim()||'Mesure / prestation'};
 if(v.startsWith('service::'))return{itemType:'service',serviceType:v.slice(9)};
 return{itemType:'product',serviceType:'Produit / accessoire'};
}

function medicationCatalogNames(){
 return [...new Set([
   ...Object.keys(COMPENDIUM_SEED||{}).map(k=>db.pharmacy.find(p=>compendiumKey(p.name)===k)?.name||k.replace(/\b\w/g,c=>c.toUpperCase())),
   ...db.pharmacy.filter(isCompendiumMedication).map(p=>p.name)
 ].filter(Boolean))].sort(alpha);
}
function orderedLettersMatch(text,query){
 const t=pvNorm(text),q=pvNorm(query).replace(/\s+/g,'');if(!q)return true;
 let i=0;for(const ch of t){if(ch===q[i])i++;if(i===q.length)return true}return false;
}
function refreshPharmacyCompendiumNames(current=''){
 const names=medicationCatalogNames();
 phNameSelect.value='';
 phNameSearch.value=current||'';
 phName.value=current||'';
 phMedicationLinkStatus.textContent=current&&names.some(n=>pvNorm(n)===pvNorm(current))?'Lié au Compendium':'';
 renderMedicationSuggestions(current||'');
}
function renderMedicationSuggestions(query=''){
 const names=medicationCatalogNames(),q=String(query||'').trim();
 const matches=names.filter(n=>orderedLettersMatch(n,q)).slice(0,30);
 phNameSuggestions.innerHTML=matches.length?matches.map(n=>`<button type="button" class="smart-option" data-name="${escAttr(n)}">${esc(n)}</button>`).join(''):`<div class="smart-empty">Aucun médicament correspondant.</div>`;
 phNameSuggestions.classList.toggle('hidden',!q);
 phNameSuggestions.querySelectorAll('.smart-option').forEach(b=>b.onclick=()=>{
   const n=b.dataset.name;phNameSearch.value=n;phName.value=n;phNameSelect.value=n;
   phMedicationLinkStatus.textContent='Lié au Compendium';phNameSuggestions.classList.add('hidden');
 });
}
function updatePharmacyNameMode(){
 const medication=document.getElementById('phItemType').value==='medication';
 phMedicationNameWrap.classList.toggle('hidden',!medication);
 phFreeNameWrap.classList.toggle('hidden',medication);
 if(medication){
   if(phName.value)phNameSearch.value=phName.value;
 }else{
   phNameSuggestions.classList.add('hidden');phMedicationLinkStatus.textContent='';
 }
}
phNameSearch.oninput=()=>{
 phName.value=phNameSearch.value;phNameSelect.value='';
 const exact=medicationCatalogNames().some(n=>pvNorm(n)===pvNorm(phNameSearch.value));
 phMedicationLinkStatus.textContent=exact?'Lié au Compendium':'';
 renderMedicationSuggestions(phNameSearch.value);
};
phNameSearch.onfocus=()=>{if(phNameSearch.value.trim())renderMedicationSuggestions(phNameSearch.value)};
document.addEventListener('click',e=>{if(!e.target.closest('.smart-combo'))phNameSuggestions.classList.add('hidden')});
phMedicationMissing.onclick=()=>{
 phNameSuggestions.classList.add('hidden');phNameSearch.value='';phName.value='';phNameSelect.value='__OTHER__';
 phMedicationLinkStatus.textContent='Non lié au Compendium — saisie libre autorisée.';
 phNameSearch.placeholder='Saisir le nom absent du Compendium…';phNameSearch.focus();
};
function refreshContactNameSuggestions(current='',currentReference=''){
 const entries=db.contacts.filter(c=>c.lastName||c.reference).map(c=>({
   value:c.id,
   name:c.lastName||contactDisplayName(c),
   reference:c.reference||'sans référence'
 })).sort((a,b)=>alpha(a.name+' '+a.reference,b.name+' '+b.reference));
 contactLastNameSelect.innerHTML='<option value="">— Choisir —</option>'+entries.map(e=>`<option value="${e.value}">${esc(e.name)} · ${esc(e.reference)}</option>`).join('')+'<option value="__OTHER__">…Ajouter</option>';
 const match=entries.find(e=>e.name===current&&(!currentReference||e.reference===currentReference));
 if(match){contactLastNameSelect.value=match.value;contactLastName.value=match.name;contactLastName.classList.add('hidden')}
 else if(current){contactLastNameSelect.value='__OTHER__';contactLastName.value=current;contactLastName.classList.remove('hidden')}
 else{contactLastNameSelect.value='';contactLastName.value='';contactLastName.classList.add('hidden')}
}function revealSavedRow(id,kind){
 requestAnimationFrame(()=>setTimeout(()=>{
   const fn=kind==='pharmacy'?`viewPharmacy('${id}')`:kind==='contact'?`viewContact('${id}')`:null;
   const row=[...document.querySelectorAll(kind==='pharmacy'?'.pharmacy-row':'.contact-row')].find(r=>r.innerHTML.includes(`'${id}'`));
   if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('just-saved');setTimeout(()=>row.classList.remove('just-saved'),1800)}
 },40));
}
function renderPharmacy(){refreshPharmacyCompendiumNames(phName.value);const filter=document.getElementById('pharmacyFilter'),list=[...db.pharmacy].map(normalizeLots).sort((a,b)=>alpha(a.name,b.name)),keep=filter?.value||'';if(filter){filter.innerHTML='<option value="">— Tous les médicaments —</option>'+list.map(p=>`<option value="${p.id}">${esc(p.name)}${p.strength?' · '+esc(p.strength):''}</option>`).join('');filter.value=keep}const visible=keep?list.filter(p=>p.id===keep):list;pharmacyList.innerHTML=visible.length?visible.map(p=>`<div class="card compact-card pharmacy-row ${p.itemType==='service'?'pharmacy-service':(stockWarning(p)?'low-stock':'')} ${isTreatmentProduct(p.id)?'pharmacy-treatment':''}"><div class="pharmacy-main"><div class="pharmacy-name-line">${p.photo?`<img class="photo" src="${p.photo}" onclick="showPharmacyPhoto('${p.id}')">`:''}<strong>${esc(p.name)}</strong>${p.itemType==='service'?`<span class="service-badge">${esc(pharmacyTypeLabel(p.itemType,p.serviceType))}</span>`:''}${isTreatmentProduct(p.id)?'<span class="treatment-badge">Traitement</span>':''}${p.strength?' <span class="muted">'+esc(p.strength)+'</span>':''}</div><div class="muted">${p.itemType==='service'?`${esc(pharmacyTypeLabel(p.itemType,p.serviceType))} · Quantité ${p.stock} ${esc(p.unit)} · ${p.lots.length} lot(s)${p.expiry?' · échéance '+esc(p.expiry):''}`:`Stock ${p.stock} ${esc(p.unit)} · ${p.lots.length} lot(s)${p.expiry?' · prochaine péremption '+esc(p.expiry):''}`}</div>${stockWarning(p)?`<div class="stock-alert">⚠ Seuil atteint : ${p.threshold} ${esc(p.unit)}</div>`:''}${p.information?`<div class="info-note">${esc(p.information)}</div>`:''}</div><div class="actions"><button class="secondary icon-btn" onclick="viewPharmacy('${p.id}')">Voir</button><button class="secondary icon-btn" onclick="editPharmacy('${p.id}')">Modifier</button><button class="danger icon-btn" onclick="deletePharmacy('${p.id}')">×</button></div></div>`).join(''):'<div class="card compact-card">Aucun produit à afficher.</div>';dynamicSelect('phUnit','phUnitOther','unit')}
function addLotRow(qty=0,expiry=''){
 const d=document.createElement('div');d.className='lot-row';
 d.innerHTML=`<div><label>Quantité</label><input class="lotQty" type="number" min="0" step=".5" value="${Number(qty||0)}"></div><div><label>Péremption</label><div class="expiry-wrap"><input class="lotExpiry" type="date" value="${esc(expiry||'')}"><button type="button" class="danger expiry-clear" title="Vider uniquement la péremption">×</button></div></div>`;
 d.querySelector('.expiry-clear').onclick=e=>{e.preventDefault();e.stopPropagation();d.querySelector('.lotExpiry').value=''};
 d.querySelector('.lotQty').oninput=updateLotTotal;phLots.appendChild(d);updateLotTotal()
}
function updateLotTotal(){phStockTotal.value=[...phLots.children].reduce((s,r)=>s+Number(r.querySelector('.lotQty').value||0),0)}
addPhLot.onclick=()=>addLotRow();phItemType.onchange=()=>{phStockFields.classList.remove('hidden');const other=document.getElementById('phItemTypeOther'),on=phItemType.value==='__OTHER__';if(on)other.value='';other.classList.toggle('hidden',!on);updatePharmacyNameMode()};phUnit.onchange=()=>syncOther('phUnit','phUnitOther',true);
function resetPharmacy(){pharmacyEditId.value='';pharmacyFormTitle.textContent='Ajouter à la pharmacie';fillPhItemType('product','Médicament');phStockFields.classList.remove('hidden');refreshPharmacyCompendiumNames('');phStrength.value='';dynamicSelect('phUnit','phUnitOther','unit');phThreshold.value=0;phLots.innerHTML='';addLotRow();phPhoto.value='';phCamera.value='';pharmacyImageRemovePending=false;phPhotoView.classList.add('hidden');phPhotoDelete.classList.add('hidden');phPhotoStatus.textContent='';phInformation.value=''}
openPharmacyForm.onclick=()=>{resetPharmacy();openFormWindow(pharmacyFormPanel)};cancelPharmacy.onclick=()=>closeFormWindow(pharmacyFormPanel);
function chosenPharmacyImage(){return phCamera.files?.[0]||phPhoto.files?.[0]||null}
function refreshPharmacyImageButtons(hasImage){phPhotoView.classList.toggle('hidden',!hasImage);phPhotoDelete.classList.toggle('hidden',!hasImage)}
phCamera.onchange=()=>{if(phCamera.files?.[0]){phPhoto.value='';pharmacyImageRemovePending=false;phPhotoStatus.textContent='Photo prise : '+(phCamera.files[0].name||'image');refreshPharmacyImageButtons(true)}};
phPhoto.onchange=()=>{if(phPhoto.files?.[0]){phCamera.value='';pharmacyImageRemovePending=false;phPhotoStatus.textContent='Image sélectionnée : '+phPhoto.files[0].name;refreshPharmacyImageButtons(true)}};
phPhotoDelete.onclick=()=>{phCamera.value='';phPhoto.value='';pharmacyImageRemovePending=true;phPhotoStatus.textContent='Photo supprimée à l’enregistrement.';refreshPharmacyImageButtons(false)};
phPhotoView.onclick=async()=>{const f=chosenPharmacyImage();if(f){const u=URL.createObjectURL(f);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000);return}const p=pharmacyItem(pharmacyEditId.value);if(!p)return;if(p.imageKey){const b=await imgGet(p.imageKey);if(b){const u=URL.createObjectURL(b);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000);return}}if(p.photo){window.open(p.photo,'_blank');return}alert('Aucune photo.')};
savePharmacy.onclick=async()=>{if(savePharmacy.disabled)return;savePharmacy.disabled=true;try{if(!phName.value.trim()){savePharmacy.disabled=false;return alert('Indique le nom.');}const old=pharmacyItem(pharmacyEditId.value),id=pharmacyEditId.value||uid(),file=chosenPharmacyImage();const lots=[...phLots.children].map(r=>({id:uid(),qty:Number(r.querySelector('.lotQty').value||0),expiry:r.querySelector('.lotExpiry').value||''})).filter(l=>l.qty>0);const typ=currentPharmacyType(),isService=typ.itemType==='service';const p=normalizeLots({id,itemType:typ.itemType,serviceType:typ.serviceType,name:phName.value.trim(),strength:phStrength.value.trim(),unit:selectedOrOther('phUnit','phUnitOther')||(isService?'séance':'unité'),threshold:Number(phThreshold.value||0),lots:lots,information:phInformation.value.trim(),imageKey:old?.imageKey||'',photo:old?.photo||''});const ix=db.pharmacy.findIndex(x=>x.id===p.id);if(ix>=0)db.pharmacy[ix]=p;else db.pharmacy.push(p);save();try{if(pharmacyImageRemovePending){if(p.imageKey)await imgDel(p.imageKey);p.imageKey='';p.photo=''}if(file){if(p.imageKey)await imgDel(p.imageKey);await imgPut(id,file);p.imageKey=id;p.photo=''}save()}catch(imgErr){alert("Le médicament a été enregistré, mais pas la photo : "+(imgErr.message||imgErr))}closeFormWindow(pharmacyFormPanel);const savedId=id;resetPharmacy();renderAll();revealSavedRow(savedId,'pharmacy')}catch(e){alert("Impossible d’enregistrer : "+(e.message||e))}finally{savePharmacy.disabled=false}}
function editPharmacy(id){const p=normalizeLots(pharmacyItem(id));if(!p)return;resetPharmacy();pharmacyEditId.value=p.id;pharmacyFormTitle.textContent='Modifier le produit';fillPhItemType(p.itemType||'product',p.serviceType||(isCompendiumMedication(p)?'Médicament':'Produit / accessoire'));phStockFields.classList.remove('hidden');refreshPharmacyCompendiumNames(p.name);phStrength.value=p.strength||'';dynamicSelect('phUnit','phUnitOther','unit',p.unit||'');phThreshold.value=p.threshold||0;phLots.innerHTML='';(p.lots.length?p.lots:[{qty:0,expiry:''}]).forEach(l=>addLotRow(l.qty,l.expiry));phInformation.value=p.information||'';phPhotoStatus.textContent=(p.imageKey||p.photo)?'Photo enregistrée — tu peux la voir, la remplacer ou la supprimer.':'';refreshPharmacyImageButtons(!!(p.imageKey||p.photo));openFormWindow(pharmacyFormPanel)}
async function viewPharmacy(id){
 const p=normalizeLots(pharmacyItem(id));if(!p)return;
 let photoHtml='';
 if(p.imageKey){const b=await imgGet(p.imageKey);if(b){const u=URL.createObjectURL(b);photoHtml=`<img class="photo-preview" src="${u}">`;setTimeout(()=>URL.revokeObjectURL(u),60000)}}
 else if(p.photo)photoHtml=`<img class="photo-preview" src="${p.photo}">`;
 pharmacyDetailTitle.textContent=p.name+(p.strength?' · '+p.strength:'');
 const rows=[
   ['Type',pharmacyTypeLabel(p.itemType,p.serviceType)],
   ['Unité',p.unit||'—'],
   [p.itemType==='service'?'Quantité':'Stock',p.itemType==='service'?`${p.stock} ${p.unit||''}`:`${p.stock}`],
   ...(p.itemType==='service'?[]:[['Seuil',`${p.threshold}`],['Prochaine péremption',p.expiry||'—']]),
   ['Informations',p.information||'—']
 ];
 pharmacyDetailBody.innerHTML=`${photoHtml}
   <div class="treatment-view-grid">
     ${rows.map(([k,v])=>`<div class="treatment-view-row"><div class="treatment-view-label">${esc(k)}</div><div class="treatment-view-value">${esc(v)}</div></div>`).join('')}
   </div>
   <div class="treatment-view-section"><h4>Boîtes / lots</h4>
     ${p.lots.length?p.lots.map(l=>`<div class="detail-lot">${l.qty} ${esc(p.unit)} · péremption ${esc(l.expiry||'non indiquée')}</div>`).join(''):'<div class="muted">Aucun stock.</div>'}
   </div>
   ${isCompendiumMedication(p)?`<div class="actions top-gap"><button class="primary" onclick="closeModal('pharmacyDetailModal');openCompendium('${p.id}')">Compendium</button><button class="secondary" onclick="closeModal('pharmacyDetailModal');openPharmacovigilance('${p.id}')">Pharmacovigilance</button></div>`:''}`;
 openModal('pharmacyDetailModal')
}
async function showPharmacyPhoto(id){const p=pharmacyItem(id);if(!p)return;if(p.imageKey){const b=await imgGet(p.imageKey);if(!b)return alert('Aucune photo.');const u=URL.createObjectURL(b);pharmacyDetailTitle.textContent=p.name;pharmacyDetailBody.innerHTML=`<img class="photo-preview" src="${u}">`;openModal('pharmacyDetailModal');setTimeout(()=>URL.revokeObjectURL(u),60000);return}if(!p.photo)return alert('Aucune photo.');pharmacyDetailTitle.textContent=p.name;pharmacyDetailBody.innerHTML=`<img class="photo-preview" src="${p.photo}">`;openModal('pharmacyDetailModal')}
function deletePharmacy(id){if(db.treatments.some(t=>t.pharmacyId===id))return alert('Ce produit est utilisé dans Traitements. Supprime d’abord le traitement.');if(db.prescriptions.some(r=>(r.items||[]).some(it=>it.pharmacyId===id)))return alert('Cet élément est utilisé dans une ordonnance.');if(confirm('Supprimer ce produit ?')){db.pharmacy=db.pharmacy.filter(x=>x.id!==id);save();renderAll();requestAnimationFrame(renderPharmacy)}}
importPharmacyBtn.onclick=()=>importPharmacyFile.click();importPharmacyFile.onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text()),list=obj.pharmacy;if(!Array.isArray(list))throw Error('format');let added=0,updated=0;list.forEach(p=>{const old=db.pharmacy.find(x=>x.id===p.id)||db.pharmacy.find(x=>x.name===p.name&&x.strength===p.strength);if(old){Object.assign(old,p);updated++}else{db.pharmacy.push({...p,id:p.id||uid()});added++}});db=migrate(db);save();alert(`Import Pharmacie terminé : ${added} ajoutés, ${updated} mis à jour.`)}catch(err){alert('Fichier Pharmacie non reconnu.')}}

function nextMonday(){let d=new Date(),day=d.getDay(),delta=(8-day)%7;if(!delta)delta=7;d.setDate(d.getDate()+delta);return isoDay(d)}weekStart.value=nextMonday();generateWeek.onclick=()=>generateWeekTable();printWeek.onclick=()=>{generateWeekTable();setTimeout(()=>window.print(),100)};function generateWeekTable(){const start=weekStart.value;if(!start)return;const dates=[];for(let i=0;i<7;i++){const d=new Date(start+'T12:00:00');d.setDate(d.getDate()+i);dates.push(isoDay(d))}const list=[...db.treatments].sort((a,b)=>alpha(getTreatmentProduct(a).name,getTreatmentProduct(b).name));let body='';list.forEach(t=>{const p=getTreatmentProduct(t);const cells=dates.map(d=>{if(!appliesTreatment(t,d))return'—';return t.schedule.map(s=>`<div class="week-dose"><span class="wtime">${esc(s.time)}</span><span class="wqty">${s.qty} ${esc(unitAbbr(p.unit))}</span></div>`).join('')||'—'});if(cells.some(c=>c!=='—'))body+=`<tr><td class="week-med">${p.photo?`<img src="${p.photo}" class="week-photo">`:''}<strong>${esc(p.name)}</strong>${p.strength?`<br><span class="muted">${esc(p.strength)}</span>`:''}</td>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`});weekPlan.innerHTML=`<div class="week-scroll"><table class="week-table"><thead><tr><th>Médicament</th>${dates.map(d=>`<th>${new Date(d+'T12:00').toLocaleDateString('fr-CH',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('')}</tr></thead><tbody>${body||'<tr><td colspan="8">Aucun traitement actif.</td></tr>'}</tbody></table></div>`}
function addPrescriptionItemRow(pharmacyId='',quantity=1,note=''){
 const row=document.createElement('div');row.className='prescription-item-row';
 const list=[...db.pharmacy].sort((a,b)=>alpha(a.name,b.name));
 row.innerHTML=`<div><select class="rxItemProduct"><option value="">— Choisir dans Pharmacie —</option>${list.map(p=>`<option value="${p.id}">${esc(p.name)}${p.strength?' · '+esc(p.strength):''}${p.itemType==='service'?' · prestation':''}</option>`).join('')}<option value="__NEW__">＋ Nouveau médicament / prestation…</option></select><div class="grid2"><div><label>Quantité / nombre</label><input class="rxItemQty" type="number" min="0" step=".5" value="${Number(quantity||1)}"></div><div><label>Note</label><input class="rxItemNote" value="${esc(note||'')}"></div></div></div><button type="button" class="danger rxItemRemove">×</button>`;
 row.querySelector('.rxItemProduct').value=pharmacyId||'';row.querySelector('.rxItemRemove').onclick=()=>row.remove();
 row.querySelector('.rxItemProduct').onchange=()=>{if(row.querySelector('.rxItemProduct').value!=='__NEW__')return;prescriptionDraft={mode:'product',prescriberContactId:prescriberContact.value,issueDate:issueDate.value,validUntil:validUntil.value,validityType:prescriptionValidityType.value,renewalsAllowed:renewalsAllowed.value,renewalsUsed:renewalsUsed.value,notes:prescriptionNotes.value,items:collectPrescriptionItems().filter(x=>x.pharmacyId!=='__NEW__')};closeFormWindow(prescriptionFormPanel);document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='pharmacy'));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='pharmacy'));resetPharmacy();openFormWindow(pharmacyFormPanel);pharmacyFormTitle.textContent='Nouveau médicament / prestation pour l’ordonnance'};
 prescriptionItems.appendChild(row)
}
function collectPrescriptionItems(){return[...prescriptionItems.querySelectorAll('.prescription-item-row')].map(r=>({pharmacyId:r.querySelector('.rxItemProduct').value,quantity:Number(r.querySelector('.rxItemQty').value||0),note:r.querySelector('.rxItemNote').value.trim()})).filter(x=>x.pharmacyId)}
function setPrescriptionValidityUI(){const multi=prescriptionValidityType.value==='multiple';prescriptionValidityFields.classList.toggle('hidden',!multi);if(!multi){validUntil.value='';renewalsAllowed.value=0;renewalsUsed.value=0}}
addPrescriptionItem.onclick=()=>addPrescriptionItemRow();prescriptionValidityType.onchange=setPrescriptionValidityUI;
function renderPrescriptions(){
 const list=[...db.prescriptions].sort((a,b)=>(b.issueDate||'').localeCompare(a.issueDate||'')||alpha(prescriberDisplayLabel(db.contacts.find(c=>c.id===a.prescriberContactId)),prescriberDisplayLabel(db.contacts.find(c=>c.id===b.prescriberContactId))));
 prescriptionList.innerHTML=list.length?list.map(r=>{
  const c=db.contacts.find(x=>x.id===r.prescriberContactId);
  const items=(r.items||[]).map(it=>{const p=pharmacyItem(it.pharmacyId);return p?`<div>${esc(p.name)}${p.strength?' · '+esc(p.strength):''}${it.quantity?` · ${it.quantity} ${esc(unitAbbr(p.unit))}`:''}${it.note?' · '+esc(it.note):''}</div>`:''}).join('');
  return`<div class="card compact-card prescription-row">
   <div>
    <div><strong>${esc(r.issueDate||'Sans date')} · ${esc(prescriberDisplayLabel(c))}</strong></div>
    <div class="muted">${r.validityType==='single'?'Retrait unique':`Plusieurs retraits${r.validUntil?' jusqu’au '+esc(r.validUntil):''} · ${r.renewalsUsed||0}/${r.renewalsAllowed||0}`}</div>
    <div class="prescription-summary-items">${items||'<div class="muted">Aucun élément</div>'}</div>
   </div>
   <div class="actions">
    <button class="secondary icon-btn" onclick="viewPrescription('${r.id}')">Voir</button>
    ${r.hasPdf?`<button class="secondary icon-btn" onclick="openPrescriptionPdf('${r.id}')">Voir PDF</button>`:''}
    <button class="secondary icon-btn" onclick="editPrescription('${r.id}')">Modifier</button>
    <button class="danger icon-btn" onclick="deletePrescription('${r.id}')">×</button>
   </div>
  </div>`
 }).join(''):'<div class="card compact-card">Aucune ordonnance.</div>'
}
function viewPrescription(id){
 const r=db.prescriptions.find(x=>x.id===id);if(!r)return;
 const c=db.contacts.find(x=>x.id===r.prescriberContactId);
 const items=(r.items||[]).map(it=>{const p=pharmacyItem(it.pharmacyId);return p?`<div class="detail-lot"><strong>${esc(p.name)}</strong>${p.strength?' · '+esc(p.strength):''}${p.itemType==='service'?' <span class="service-badge">Prestation</span>':''}<br><span class="muted">${it.quantity||0} ${esc(unitAbbr(p.unit))}${it.note?' · '+esc(it.note):''}</span></div>`:''}).join('');
 prescriptionDetailTitle.textContent='Ordonnance du '+(r.issueDate||'—');
 prescriptionDetailBody.innerHTML=`<div class="contact-detail-grid">
  <strong>Prescripteur</strong><span>${esc(contactDisplayName(c)||'—')}</span>
  <strong>Personne de référence</strong><span>${esc(c?.reference||'—')}</span>
  <strong>Spécialité</strong><span>${esc(c?.specialty||'—')}</span>
  <strong>Date d’émission</strong><span>${esc(r.issueDate||'—')}</span>
  <strong>Validité</strong><span>${r.validityType==='single'?'Retrait unique':`Plusieurs retraits${r.validUntil?' jusqu’au '+esc(r.validUntil):''}`}</span>
  <strong>Retraits</strong><span>${r.validityType==='multiple'?`${r.renewalsUsed||0} / ${r.renewalsAllowed||0}`:'—'}</span>
  <strong>Remarques</strong><span>${esc(r.notes||'—')}</span>
 </div>
 <h4>Médicaments / prestations</h4>
 ${items||'<div class="muted">Aucun élément.</div>'}
 ${r.hasPdf?`<div class="actions top-gap"><button class="secondary" onclick="openPrescriptionPdf('${r.id}')">Voir PDF</button></div>`:''}`;
 openModal('prescriptionDetailModal');
}

function resetPrescription(){prescriptionEditId.value='';prescriptionFormTitle.textContent='Ajouter une ordonnance';prescriptionItems.innerHTML='';addPrescriptionItemRow();fillPrescriberSelect();prescriberHint.textContent='';issueDate.value=isoDay();prescriptionValidityType.value='single';validUntil.value='';renewalsAllowed.value=0;renewalsUsed.value=0;setPrescriptionValidityUI();prescriptionPdf.value='';prescriptionPdfStatus.textContent='Aucun PDF associé.';viewPrescriptionPdf.classList.add('hidden');removePrescriptionPdf.classList.add('hidden');pdfRemovePending=false;prescriptionNotes.value=''}
openPrescriptionForm.onclick=()=>{resetPrescription();openFormWindow(prescriptionFormPanel)};cancelPrescription.onclick=()=>{prescriptionDraft=null;closeFormWindow(prescriptionFormPanel)};
prescriberContact.onchange=()=>{if(prescriberContact.value!=='__NEW_CONTACT__')return;alert('Crée le contact dans Contacts de santé, puis reviens à l’ordonnance.')};
prescriptionPdf.onchange=()=>{const f=prescriptionPdf.files?.[0];prescriptionPdfStatus.textContent=f?'PDF sélectionné : '+f.name:'Aucun PDF associé.'};viewPrescriptionPdf.onclick=()=>{if(prescriptionEditId.value)openPrescriptionPdf(prescriptionEditId.value)};
savePrescription.onclick=async()=>{const items=collectPrescriptionItems().filter(x=>x.pharmacyId!=='__NEW__');if(!items.length)return alert('Ajoute au moins un médicament ou une prestation.');const id=prescriptionEditId.value||uid(),old=db.prescriptions.find(x=>x.id===id),file=prescriptionPdf.files?.[0];if(file)await pdfPut(id,file);const r={id,items,prescriberContactId:prescriberContact.value||'',issueDate:issueDate.value,validityType:prescriptionValidityType.value,validUntil:prescriptionValidityType.value==='multiple'?validUntil.value:'',renewalsAllowed:prescriptionValidityType.value==='multiple'?Number(renewalsAllowed.value||0):0,renewalsUsed:prescriptionValidityType.value==='multiple'?Number(renewalsUsed.value||0):0,notes:prescriptionNotes.value.trim(),hasPdf:file?true:!!old?.hasPdf};const ix=db.prescriptions.findIndex(x=>x.id===id);if(ix>=0)db.prescriptions[ix]=r;else db.prescriptions.push(r);closeFormWindow(prescriptionFormPanel);save()}
function editPrescription(id){const r=db.prescriptions.find(x=>x.id===id);if(!r)return;resetPrescription();prescriptionEditId.value=r.id;prescriptionFormTitle.textContent='Modifier l’ordonnance';prescriptionItems.innerHTML='';(r.items||[]).forEach(it=>addPrescriptionItemRow(it.pharmacyId,it.quantity,it.note));fillPrescriberSelect(r.prescriberContactId||'');issueDate.value=r.issueDate||'';prescriptionValidityType.value=r.validityType||'single';validUntil.value=r.validUntil||'';renewalsAllowed.value=r.renewalsAllowed||0;renewalsUsed.value=r.renewalsUsed||0;setPrescriptionValidityUI();prescriptionNotes.value=r.notes||'';openFormWindow(prescriptionFormPanel);if(r.hasPdf){prescriptionPdfStatus.textContent='PDF enregistré';viewPrescriptionPdf.classList.remove('hidden')}}
function deletePrescription(id){if(confirm('Supprimer cette ordonnance ?')){db.prescriptions=db.prescriptions.filter(x=>x.id!==id);save()}}


const reportTypeEl=document.getElementById('reportType');
const reportTakesOptionsEl=document.getElementById('reportTakesOptions');
const reportContactsOptionsEl=document.getElementById('reportContactsOptions');
const reportPharmacyOptionsEl=document.getElementById('reportPharmacyOptions');
const reportFromEl=document.getElementById('reportFrom');
const reportToEl=document.getElementById('reportTo');
const reportMedicationEl=document.getElementById('reportMedication');
const reportTakeTypeEl=document.getElementById('reportTakeType');
const reportContactStatusEl=document.getElementById('reportContactStatus');
const reportContactSpecialtyEl=document.getElementById('reportContactSpecialty');
const reportContactCityEl=document.getElementById('reportContactCity');
const reportContactNameEl=document.getElementById('reportContactName');
const reportPharmacyTypeEl=document.getElementById('reportPharmacyType');
const reportExpiryStatusEl=document.getElementById('reportExpiryStatus');
const generateReportEl=document.getElementById('generateReport');
const saveReportEl=document.getElementById('saveReport');
const printReportEl=document.getElementById('printReport');
const reportPreviewEl=document.getElementById('reportPreview');
const savedReportsEl=document.getElementById('savedReports');

let currentReport=null;

function reportDateLabel(d){if(!d)return'';try{return new Date(d+'T12:00:00').toLocaleDateString('fr-CH')}catch(e){return d}}
function reportEscape(v){return esc(v==null?'':String(v))}
function uniqueSorted(values){return[...new Set(values.filter(Boolean).map(v=>String(v).trim()).filter(Boolean))].sort(alpha)}
function setSelectValues(sel,firstLabel,values,current=''){
 if(!sel)return;
 sel.innerHTML=`<option value="">${reportEscape(firstLabel)}</option>`+values.map(v=>`<option value="${reportEscape(v)}">${reportEscape(v)}</option>`).join('');
 if(values.includes(current))sel.value=current;
}
function reportMedicationOptions(){
 const kind=reportTakeTypeEl.value;
 const names=new Set();
 if(kind!=='measure'){
   (db.history||[]).filter(h=>h.kind==='planned'||h.kind==='prn').forEach(h=>h.name&&names.add(h.name));
   (db.pharmacy||[]).filter(p=>(p.itemType||'product')!=='service').forEach(p=>p.name&&names.add(p.name));
 }
 if(kind!=='medication'){
   (db.history||[]).filter(h=>h.kind==='measure').forEach(h=>h.name&&names.add(h.name));
   (db.measures||[]).forEach(m=>m.name&&names.add(m.name));
   (db.pharmacy||[]).filter(p=>(p.itemType||'product')==='service').forEach(p=>p.name&&names.add(p.name));
 }
 const first=kind==='medication'?'Tous les médicaments':kind==='measure'?'Toutes les mesures':'Tous les médicaments et mesures';
 const label=document.getElementById('reportItemLabel');
 if(label)label.textContent=kind==='medication'?'Médicament':kind==='measure'?'Mesure':'Médicament / mesure';
 setSelectValues(reportMedicationEl,first,[...names].sort(alpha),reportMedicationEl?.value||'');
}
function reportContactOptions(){
 const contacts=db.contacts||[];
 setSelectValues(reportContactSpecialtyEl,'Toutes les spécialités',uniqueSorted(contacts.map(c=>c.specialty)),reportContactSpecialtyEl?.value||'');
 setSelectValues(reportContactCityEl,'Tous les lieux',uniqueSorted(contacts.map(c=>c.city)),reportContactCityEl?.value||'');
 setSelectValues(reportContactNameEl,'Tous les noms',uniqueSorted(contacts.map(c=>contactDisplayName(c))),reportContactNameEl?.value||'');
}

function reportPharmacyOptionsFill(){
 const types=uniqueSorted((db.pharmacy||[]).map(p=>pharmacyTypeLabel(p.itemType||'product',p.serviceType||'')));
 setSelectValues(reportPharmacyTypeEl,'Tous les types',types,reportPharmacyTypeEl?.value||'');
}
function reportDefaultDates(){
 if(!reportFromEl.value){const d=new Date();d.setDate(d.getDate()-30);reportFromEl.value=isoDay(d)}
 if(!reportToEl.value)reportToEl.value=isoDay();
}
function mondayOf(d){const x=new Date(d);x.setHours(12,0,0,0);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x}
function setReportRange(a,b){reportFromEl.value=isoDay(a);reportToEl.value=isoDay(b)}
function bindReportShortcuts(){
 document.getElementById('reportPrevWeek').onclick=()=>{const thisMon=mondayOf(new Date()),from=new Date(thisMon),to=new Date(thisMon);from.setDate(from.getDate()-7);to.setDate(to.getDate()-1);setReportRange(from,to)};
 document.getElementById('reportThisWeek').onclick=()=>{const from=mondayOf(new Date()),to=new Date(from);to.setDate(to.getDate()+6);setReportRange(from,to)};
 document.getElementById('reportPrevMonth').onclick=()=>{const n=new Date(),from=new Date(n.getFullYear(),n.getMonth()-1,1,12),to=new Date(n.getFullYear(),n.getMonth(),0,12);setReportRange(from,to)};
 document.getElementById('reportThisMonth').onclick=()=>{const n=new Date(),from=new Date(n.getFullYear(),n.getMonth(),1,12),to=new Date(n.getFullYear(),n.getMonth()+1,0,12);setReportRange(from,to)};
 document.getElementById('reportAllTakes').onclick=()=>{reportFromEl.value='';reportToEl.value=''};
}
function reportTypeUI(){
 const t=reportTypeEl.value;
 reportTakesOptionsEl.classList.toggle('hidden',t!=='takes');
 reportContactsOptionsEl.classList.toggle('hidden',t!=='contacts');
 reportPharmacyOptionsEl.classList.toggle('hidden',t!=='pharmacy');
 if(t==='takes')reportMedicationOptions();
 if(t==='contacts')reportContactOptions();
 if(t==='pharmacy')reportPharmacyOptionsFill();
 reportPreviewEl.classList.add('hidden');saveReportEl.classList.add('hidden');printReportEl.classList.add('hidden');currentReport=null;
}
reportTypeEl.onchange=reportTypeUI;
reportTakeTypeEl.onchange=reportMedicationOptions;


function reportMedicationTokens(v){
 return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\baspirine\b/g,'aspirin').replace(/\bvitamine\b/g,'vitamin')
  .replace(/\bcomprime(?:s)?\b/g,' cpr ').replace(/\bcapsule(?:s)?\b/g,' caps ')
  .replace(/\bret\b/g,' retard ')
  .replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/)
  .filter(t=>t&&!/^\d+(?:\.\d+)?$/.test(t)&&![
   'cpr','pell','caps','bte','pce','stylo','pre','preremplie','sol','inj','empl',
   'moll','mini','fl','tb','mg','ml','g','u','ui','retard','hc','fixdose'
  ].includes(t));
}
function reportCurrentMedication(rawName){
 const raw=reportMedicationTokens(rawName);
 if(!raw.length)return null;
 let best=null,bestScore=0;
 for(const t of (db.treatments||[])){
  const p=getTreatmentProduct(t);if(!p)continue;
  const cand=reportMedicationTokens(p.name);
  if(!cand.length)continue;
  const common=raw.filter(x=>cand.includes(x));
  let score=common.length/Math.max(1,Math.min(raw.length,cand.length));
  if(raw[0]===cand[0])score+=0.35;
  if(raw.length>1&&cand.length>1&&raw[0]===cand[0]&&raw[1]===cand[1])score+=0.45;
  if(score>bestScore){bestScore=score;best=p}
 }
 return bestScore>=0.78?best:null;
}
function reportMedicationHeading(rawName){
 const p=reportCurrentMedication(rawName);
 if(!p)return reportEscape(rawName||'(sans nom)');
 return `<span class="mx-med-name">${reportEscape(p.name||rawName)}</span>${p.strength?`<span class="mx-med-strength">${reportEscape(p.strength)}</span>`:''}`;
}
function buildTakesReport(){
 const from=reportFromEl.value||'0000-01-01',to=reportToEl.value||'9999-12-31',item=reportMedicationEl.value,takeType=reportTakeTypeEl.value;
 const isMedication=h=>h.kind==='planned'||h.kind==='prn';
 const isMeasure=h=>h.kind==='measure';
 const rows=(db.history||[]).filter(h=>(isMedication(h)||isMeasure(h))&&h.date>=from&&h.date<=to&&(!item||h.name===item)&&(!takeType||(takeType==='medication'?isMedication(h):isMeasure(h)))).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 const typeLabel=takeType==='medication'?'Médicaments':takeType==='measure'?'Mesures':'Médicaments et mesures';
 const title=item?`${typeLabel} — ${item}`:'Prises des médicaments et mesures';
 const subtitle=(reportFromEl.value||reportToEl.value?`Du ${reportDateLabel(reportFromEl.value)||'début'} au ${reportDateLabel(reportToEl.value)||'aujourd’hui'}`:'Toutes les dates')+` · ${typeLabel}`;
 const monthNames=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

 const byMonth={};
 rows.forEach(h=>{const ym=(h.date||'').slice(0,7);if(ym)(byMonth[ym]||(byMonth[ym]=[])).push(h)});

 const entryHtml=(h,measure)=>{
   const time=reportEscape(h.time||'');
   if(measure){
     const val=reportEscape(h.value??'');
     const unit=h.unit?' '+reportEscape(unitAbbr(h.unit)):'';
     return `<span class="mx-time">${time}</span><br><strong>${val}${unit}</strong>`;
   }
   const qty=reportEscape(h.qty??'');
   const star=h.kind==='prn'?'<sup>*</sup>':'';
   return `<span class="mx-time">${time}</span><br><strong>${qty}</strong>${star}`;
 };

 const tableFor=(ym,list,measure)=>{
   const [yy,mm]=ym.split('-').map(Number),days=new Date(yy,mm,0).getDate();
   const groups={};
   list.filter(measure?isMeasure:isMedication).forEach(h=>{
     const name=h.name||'(sans nom)';
     (groups[name]||(groups[name]=[])).push(h);
   });
   const names=Object.keys(groups).sort(alpha);
   if(!names.length)return'';
   const headers=Array.from({length:days},(_,i)=>`<th>${i+1}</th>`).join('');
   const rowsHtml=names.map(name=>{
     const cells=Array.from({length:days},()=>[]);
     groups[name].forEach(h=>{
       const d=parseInt((h.date||'').slice(8,10),10);
       if(d>=1&&d<=days)cells[d-1].push(h);
     });
     const tds=cells.map(dayRows=>`<td>${dayRows.map(h=>`<div class="mx-entry">${entryHtml(h,measure)}</div>`).join('')}</td>`).join('');
     return `<tr><th class="mx-name">${measure?reportEscape(name):reportMedicationHeading(name)}</th>${tds}</tr>`;
   }).join('');
   const label=`${monthNames[mm-1]} ${yy}${measure?' — Mesures':''}`;
   return `<section class="mx-month"><h4>${label}</h4><div class="report-scroll"><table class="mx-table"><thead><tr><th class="mx-name">${measure?'Mesure':'Traitement'}</th>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table></div></section>`;
 };

 let body='';
 Object.keys(byMonth).sort().forEach(ym=>{
   const list=byMonth[ym];
   if(takeType!=='measure')body+=tableFor(ym,list,false);
   if(takeType!=='medication')body+=tableFor(ym,list,true);
 });
 if(!body)body='<div class="report-empty">Aucune prise ou mesure pour ces critères.</div>';
 body+='<div class="report-legend">Chaque case indique l’heure puis la quantité réellement prise. L’unité figure dans la présentation du traitement lorsqu’il est encore enregistré dans Ma Santé.'+(rows.some(h=>h.kind==='prn')?' <sup>*</sup> = prise au besoin / spontanée.':'')+'</div>';
 return{type:'takes',title,subtitle,html:body,criteria:{from:reportFromEl.value,to:reportToEl.value,item,takeType}};
}
function buildContactsReport(){
 let list=[...(db.contacts||[])];
 const status=reportContactStatusEl.value,specialty=reportContactSpecialtyEl.value,city=reportContactCityEl.value,name=reportContactNameEl.value;
 if(status==='primary')list=list.filter(c=>c.primary);
 if(specialty)list=list.filter(c=>c.specialty===specialty);
 if(city)list=list.filter(c=>c.city===city);
 if(name)list=list.filter(c=>contactDisplayName(c)===name);
 list.sort((a,b)=>alpha(contactDisplayName(a),contactDisplayName(b)));
 const active=[status==='primary'?'Référents':'',specialty,city,name].filter(Boolean).join(' · ')||'Tous les contacts';
 const body=list.length?`<div class="report-scroll"><table class="report-table"><thead><tr><th>Type</th><th>Nom / établissement</th><th>Référence</th><th>Spécialité</th><th>Localité</th><th>Téléphone</th><th>E-mail</th></tr></thead><tbody>${list.map(c=>`<tr><td>${reportEscape(c.type||'')}</td><td><strong>${reportEscape(contactDisplayName(c))}</strong>${c.primary?' ★':''}</td><td>${reportEscape(c.reference||'')}</td><td>${reportEscape(c.specialty||'')}</td><td>${reportEscape([c.zip,c.city].filter(Boolean).join(' '))}</td><td>${reportEscape(c.phone||c.mobile||'')}</td><td>${reportEscape(c.email||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="report-empty">Aucun contact pour ces critères.</div>';
 return{type:'contacts',title:'Contacts de santé',subtitle:active,html:body,criteria:{status,specialty,city,name}};
}
function daysUntil(date){if(!date)return null;return Math.ceil((new Date(date+'T12:00:00')-new Date(isoDay()+'T12:00:00'))/86400000)}
function buildPharmacyReport(){
 let items=[...(db.pharmacy||[])].map(normalizeLots);
 const typeLabel=reportPharmacyTypeEl.value,expiry=reportExpiryStatusEl.value;
 if(typeLabel)items=items.filter(p=>pharmacyTypeLabel(p.itemType||'product',p.serviceType||'')===typeLabel);
 if(expiry){
   items=items.filter(p=>(p.lots||[]).some(l=>{
     if(!l.expiry)return false;const du=daysUntil(l.expiry);
     if(expiry==='expired')return du<0;
     if(expiry==='near')return du>=0&&du<=30;
     return du<=30;
   }));
 }
 items.sort((a,b)=>alpha(a.name,b.name));
 const rows=[];
 items.forEach(p=>{
  if((p.itemType||'product')==='service')rows.push({p,l:null});
  else if((p.lots||[]).length)p.lots.forEach(l=>rows.push({p,l}));
  else rows.push({p,l:{qty:p.stock||0,expiry:''}});
 });
 const body=rows.length?`<div class="report-scroll"><table class="report-table"><thead><tr><th>Type</th><th>Médicament / prestation</th><th>Dosage</th><th class="num">Quantité</th><th>Péremption</th><th>Statut</th></tr></thead><tbody>${rows.map(({p,l})=>{const du=l?.expiry?daysUntil(l.expiry):null;let st='';if((p.itemType||'product')!=='service'&&stockWarning(p))st+='Stock au seuil';if(l?.expiry&&du<0)st+=(st?' · ':'')+'Périmé';else if(l?.expiry&&du<=30)st+=(st?' · ':'')+`Péremption dans ${du} j.`;return`<tr><td>${reportEscape(pharmacyTypeLabel(p.itemType||'product',p.serviceType||''))}</td><td><strong>${reportEscape(p.name)}</strong></td><td>${reportEscape(p.strength||'')}</td><td class="num">${reportEscape(l?.qty)+' '+reportEscape(unitAbbr(p.unit||''))}</td><td>${(p.itemType||'product')==='service'?'—':reportEscape(l?.expiry?reportDateLabel(l.expiry):'—')}</td><td>${reportEscape(st)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="report-empty">Aucun élément pour ces critères.</div>';
 const active=[typeLabel,expiry==='expired'?'Périmés':expiry==='near'?'Péremption proche':expiry==='expiredNear'?'Périmés + proches':''].filter(Boolean).join(' · ')||'Tous les éléments';
 return{type:'pharmacy',title:'Pharmacie',subtitle:active,html:body,criteria:{type:typeLabel,expiry}};
}
function renderCurrentReport(){
 if(!currentReport){reportPreviewEl.classList.add('hidden');return}
 reportPreviewEl.innerHTML=`<div class="report-sheet"><div class="report-head"><h3>${reportEscape(currentReport.title)}</h3><div class="report-meta">${reportEscape(currentReport.subtitle||'')} · Généré le ${new Date().toLocaleString('fr-CH')}</div></div>${currentReport.html}</div>`;
 reportPreviewEl.classList.remove('hidden');saveReportEl.classList.remove('hidden');printReportEl.classList.remove('hidden');reportPreviewEl.scrollIntoView({behavior:'smooth',block:'start'});
}
generateReportEl.onclick=()=>{currentReport=reportTypeEl.value==='takes'?buildTakesReport():reportTypeEl.value==='contacts'?buildContactsReport():buildPharmacyReport();renderCurrentReport()};
function reportPrintDocument(title,body,landscape=false){
 const w=window.open('','_blank');if(!w)return alert("Le navigateur a bloqué la fenêtre d'impression.");
 const page=landscape?'@page{size:A4 landscape;margin:5mm}':'@page{size:A4 portrait;margin:14mm}';
 w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${reportEscape(title)}</title><style>${page}
 body{font-family:Arial,sans-serif;margin:0;color:#111}h1{font-size:13pt;margin:0 0 2px}.meta{font-size:7pt;color:#555;margin-bottom:5px}
 table{width:100%;border-collapse:collapse}th,td{border:1px solid #bfc7d1;vertical-align:top}
 .report-table{font-size:8pt}.report-table th,.report-table td{padding:3px;text-align:left}
 .mx-month{page-break-inside:avoid;margin:0 0 5mm}.mx-month h4{font-size:9pt;margin:2mm 0;text-transform:capitalize}
 .mx-table{table-layout:fixed;font-size:4.7pt}.mx-table th,.mx-table td{padding:.8mm .45mm;text-align:center;overflow:hidden}
 .mx-table .mx-name{width:31mm;text-align:left;font-size:5.2pt;line-height:1.08;background:#f0f3f6;font-weight:700}.mx-med-name{display:block;font-weight:700}.mx-med-strength{display:block;font-size:4.5pt;font-weight:400;color:#444;margin-top:.4mm}
 .mx-table td{height:auto;line-height:1.05}.mx-entry{white-space:nowrap;margin-bottom:.4mm}.mx-time{font-size:4.3pt;color:#444}
 .report-legend{font-size:6pt;margin-top:2mm}.report-scroll{overflow:visible}
 </style></head><body><h1>${reportEscape(title)}</h1><div class="meta">Ma Santé · ${new Date().toLocaleString('fr-CH')}</div>${body}</body></html>`);
 w.document.close();w.focus();setTimeout(()=>w.print(),250);
}
printReportEl.onclick=()=>{if(currentReport)reportPrintDocument(currentReport.title,currentReport.html,currentReport.type==='takes')};
saveReportEl.onclick=()=>{if(!currentReport)return;db.savedReports.unshift({id:uid(),savedAt:new Date().toISOString(),title:currentReport.title,subtitle:currentReport.subtitle,type:currentReport.type,criteria:currentReport.criteria,html:currentReport.html});save();renderSavedReports();alert('Rapport enregistré dans Ma Santé.')};
function renderSavedReports(){
 const list=db.savedReports||[];
 savedReportsEl.innerHTML=list.length?list.map(r=>`<div class="card compact-card saved-report-row"><div><div class="saved-report-title">${reportEscape(r.title)}</div><div class="muted">${reportEscape(r.subtitle||'')} · enregistré le ${new Date(r.savedAt).toLocaleString('fr-CH')}</div></div><div class="actions"><button class="secondary icon-btn" onclick="openSavedReport('${r.id}')">Voir</button><button class="secondary icon-btn" onclick="printSavedReport('${r.id}')">Imprimer</button><button class="danger icon-btn" onclick="deleteSavedReport('${r.id}')">×</button></div></div>`).join(''):'<div class="card compact-card">Aucun rapport enregistré.</div>';
}
function savedTakeReportFromCriteria(r){
 if(!r||r.type!=='takes'||!r.criteria)return null;
 const old={from:reportFromEl.value,to:reportToEl.value,item:reportMedicationEl.value,takeType:reportTakeTypeEl.value};
 reportFromEl.value=r.criteria.from||'';reportToEl.value=r.criteria.to||'';reportMedicationEl.value=r.criteria.item||'';reportTakeTypeEl.value=r.criteria.takeType||'';
 const fresh=buildTakesReport();
 reportFromEl.value=old.from;reportToEl.value=old.to;reportMedicationEl.value=old.item;reportTakeTypeEl.value=old.takeType;
 return fresh;
}
function openSavedReport(id){const r=(db.savedReports||[]).find(x=>x.id===id);if(!r)return;currentReport=savedTakeReportFromCriteria(r)||{type:r.type,title:r.title,subtitle:r.subtitle,criteria:r.criteria,html:r.html};renderCurrentReport()}
function printSavedReport(id){const r=(db.savedReports||[]).find(x=>x.id===id);if(!r)return;const fresh=savedTakeReportFromCriteria(r)||r;reportPrintDocument(fresh.title,fresh.html,fresh.type==='takes')}
function deleteSavedReport(id){if(confirm('Supprimer ce rapport enregistré ?')){db.savedReports=(db.savedReports||[]).filter(x=>x.id!==id);save();renderSavedReports();renderCompendium()}}


const todayDayPickerEl=document.getElementById('todayDayPicker');
todayDayPickerEl.onchange=()=>{
 if(!todayDayPickerEl.value)return;
 selectedTodayDay=todayDayPickerEl.value;
 showPastPlanExplicitly=false;
 todayDayPickerEl.value=selectedTodayDay;
 renderToday();
};
function moveDisplayedDay(delta){
 const base=selectedTodayDay||todayDayPickerEl.value||isoDay();
 const d=new Date(base+'T12:00:00');d.setDate(d.getDate()+delta);
 selectedTodayDay=isoDay(d);
 showPastPlanExplicitly=false;todayDayPickerEl.value=selectedTodayDay;renderToday();
}
document.getElementById('todayPrevDay').onclick=()=>moveDisplayedDay(-1);
document.getElementById('todayNextDay').onclick=()=>moveDisplayedDay(1);
document.getElementById('todayGoToday').onclick=()=>{
 selectedTodayDay=isoDay();showPastPlanExplicitly=false;todayDayPickerEl.value=selectedTodayDay;renderToday();
};


document.getElementById('showPastPlan').onclick=()=>{
 showPastPlanExplicitly=!showPastPlanExplicitly;
 document.getElementById('showPastPlan').textContent=showPastPlanExplicitly?'Masquer les prises prévues':'Afficher les prises prévues ce jour';
 renderToday();
};

document.getElementById('addMissedTake').onclick=()=>{
 const day=selectedDay();
 const choices=[];
 db.treatments.filter(t=>appliesTreatment(t,day)).forEach(t=>t.schedule.forEach(s=>{
   const p=getTreatmentProduct(t),key=`${day}|${t.id}|${s.time}`;
   if(!db.takes[key])choices.push({t,s,p});
 }));
 const sel=document.getElementById('missedTakeChoice');
 sel.innerHTML=choices.length?choices.map(x=>`<option value="${x.t.id}|${x.s.time}">${esc(x.s.time)} · ${esc(x.p.name)} ${esc(x.p.strength||'')} · ${esc(x.s.qty)} ${esc(x.p.unit||'')}</option>`).join(''):'<option value="">Aucune prise prévue non enregistrée</option>';
 openModal('missedTakeModal');
};

document.getElementById('confirmMissedChoice').onclick=()=>{
 const v=document.getElementById('missedTakeChoice').value;
 if(!v)return alert('Aucune prise à ajouter.');
 const sep=v.lastIndexOf('|'),id=v.slice(0,sep),time=v.slice(sep+1);
 closeModal('missedTakeModal');
 openTake(id,time,selectedDay());
};

const cleanupTypeEl=document.getElementById('cleanupType');
const cleanupPeriodEl=document.getElementById('cleanupPeriod');
const cleanupFromEl=document.getElementById('cleanupFrom');
const cleanupToEl=document.getElementById('cleanupTo');
const cleanupToWrapEl=document.getElementById('cleanupToWrap');
const cleanupFromLabelEl=document.getElementById('cleanupFromLabel');
const cleanupPreviewEl=document.getElementById('cleanupPreview');

function cleanupDateMatch(date){
 if(cleanupPeriodEl.value==='all')return true;
 if(cleanupPeriodEl.value==='before')return !!cleanupFromEl.value&&date<cleanupFromEl.value;
 return !!cleanupFromEl.value&&!!cleanupToEl.value&&date>=cleanupFromEl.value&&date<=cleanupToEl.value;
}
function cleanupMatches(){
 const type=cleanupTypeEl.value;
 const meds=(type==='both'||type==='medication')?db.history.filter(h=>cleanupDateMatch(h.date)):[];
 const measures=(type==='both'||type==='measure')?db.measureHistory.filter(h=>cleanupDateMatch(h.date)):[];
 return{meds,measures};
}
function updateCleanupUI(){
 const between=cleanupPeriodEl.value==='between',all=cleanupPeriodEl.value==='all';
 document.getElementById('cleanupDates').classList.toggle('hidden',all);
 cleanupToWrapEl.classList.toggle('hidden',!between);
 cleanupFromLabelEl.textContent=between?'Du':'Avant le';
 const {meds,measures}=cleanupMatches();
 cleanupPreviewEl.innerHTML=`<strong>${meds.length}</strong> prise(s) de médicament et <strong>${measures.length}</strong> mesure(s) seront supprimées.`;
}
cleanupTypeEl.onchange=updateCleanupUI;cleanupPeriodEl.onchange=updateCleanupUI;cleanupFromEl.onchange=updateCleanupUI;cleanupToEl.onchange=updateCleanupUI;
cleanupFromEl.value=isoDay();cleanupToEl.value=isoDay();updateCleanupUI();

document.getElementById('cleanupDelete').onclick=()=>{
 const {meds,measures}=cleanupMatches(),total=meds.length+measures.length;
 if(!total)return alert('Aucun enregistrement ne correspond aux critères.');
 if(!confirm(`${meds.length} prise(s) de médicament et ${measures.length} mesure(s) seront supprimées définitivement.\n\nContinuer ?`))return;
 const medIds=new Set(meds.map(h=>h.id)),measureIds=new Set(measures.map(h=>h.id)),eventKeys=new Set(meds.map(h=>h.eventKey).filter(Boolean));
 db.history=db.history.filter(h=>!medIds.has(h.id));
 db.measureHistory=db.measureHistory.filter(h=>!measureIds.has(h.id));
 Object.keys(db.takes||{}).forEach(k=>{if(eventKeys.has(k))delete db.takes[k]});
 save();renderToday();renderSavedReports();updateCleanupUI();
 alert(`${total} enregistrement(s) supprimé(s).`);
};

function renderFullHistory(){const meds=db.history.map(h=>({...h,_k:'Médicament',label:h.name,value:`${h.qty} ${h.unit||''}`}));const ms=db.measureHistory.map(h=>({...h,_k:'Mesure',label:h.type,value:`${h.value} ${h.unit||''}`}));const list=[...meds,...ms].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));fullHistory.innerHTML=list.length?list.map(h=>`<div class="history-row"><div>${esc(h.date)}<br><strong>${esc(h.time||'')}</strong></div><div><span class="badge">${h._k}</span> <strong>${esc(h.label)}</strong><div class="muted">${esc(h.value)}${h.note?' · '+esc(h.note):''}</div></div></div>`).join(''):'<div class="muted">Historique vide.</div>'}
document.getElementById('pharmacyFilter')?.addEventListener('change',renderPharmacy);
groupPlannedTimeEl.onclick=()=>commitGroupTake(pendingGroupPlanned);
groupActualTimeEl.onclick=()=>commitGroupTake(currentTime());
groupCustomTimeEl.onclick=()=>{if(!groupTakeTimeEl.value)return alert('Choisis une heure.');commitGroupTake(groupTakeTimeEl.value)};

document.getElementById('pdfPrev').onclick=()=>{if(activePdfDoc&&activePdfPage>1){activePdfPage--;renderActivePdfPage()}};
document.getElementById('pdfNext').onclick=()=>{if(activePdfDoc&&activePdfPage<activePdfDoc.numPages){activePdfPage++;renderActivePdfPage()}};
document.getElementById('pdfZoomOut').onclick=()=>{if(activePdfDoc){activePdfScale=Math.max(.5,activePdfScale-.25);renderActivePdfPage()}};
document.getElementById('pdfZoomIn').onclick=()=>{if(activePdfDoc){activePdfScale=Math.min(3,activePdfScale+.25);renderActivePdfPage()}};


const COMPENDIUM_VERSION='2026-08-13.2';
const COMPENDIUM_SEED={
 "aspirin cardio 100":{
  active:"Acide acétylsalicylique",
  indication:"Prévention de certains événements thrombotiques cardiovasculaires, notamment après infarctus ou dans d’autres situations à risque, selon l’information suisse.",
  official:{
   summary:"La notice décrit notamment un risque accru de saignement et des effets digestifs; des réactions d’hypersensibilité peuvent également survenir.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment un risque accru de saignement et des effets digestifs; des réactions d’hypersensibilité peuvent également survenir.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "meto zerok":{
  active:"Métoprolol (succinate)",
  indication:"Hypertension artérielle, angine de poitrine, certaines arythmies, insuffisance cardiaque chronique et autres indications cardiovasculaires selon l’information suisse.",
  official:{
   summary:"Les effets décrits comprennent notamment fatigue, vertiges, ralentissement du rythme cardiaque et baisse de la tension; d’autres effets sont possibles.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Les effets décrits comprennent notamment fatigue, vertiges, ralentissement du rythme cardiaque et baisse de la tension; d’autres effets sont possibles.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "pantoprazol-mepha":{
  active:"Pantoprazole",
  indication:"Réduction de la sécrétion acide gastrique, notamment dans le reflux, certains ulcères et situations d’hypersécrétion acide.",
  official:{
   summary:"La notice décrit notamment céphalées et troubles digestifs possibles; des effets plus rares, notamment réactions d’hypersensibilité et anomalies biologiques, sont également décrits.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment céphalées et troubles digestifs possibles; des effets plus rares, notamment réactions d’hypersensibilité et anomalies biologiques, sont également décrits.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "rosuvastatin-mepha":{
  active:"Rosuvastatine",
  indication:"Traitement de l’hypercholestérolémie et de certaines dyslipidémies, en complément des mesures non médicamenteuses.",
  official:{
   summary:"Les informations officielles suisses décrivent notamment des effets musculaires possibles et d’autres effets indésirables. La formulation détaillée reste celle des documents officiels.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Les informations officielles suisses décrivent notamment des effets musculaires possibles et d’autres effets indésirables. La formulation détaillée reste celle des documents officiels.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "tresiba flextouch insulin degludec":{
  active:"Insuline dégludec",
  indication:"Insuline basale à action prolongée utilisée dans le traitement du diabète.",
  official:{
   summary:"L’hypoglycémie est un effet indésirable important des traitements par insuline. La notice décrit également notamment des réactions au site d’injection et des modifications du tissu sous-cutané.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"L’hypoglycémie est un effet indésirable important des traitements par insuline. La notice décrit également notamment des réactions au site d’injection et des modifications du tissu sous-cutané.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "xigduo xr":{
  active:"Dapagliflozine + metformine",
  indication:"Traitement du diabète de type 2 chez l’adulte, seul dans certaines situations ou en association à d’autres traitements hypoglycémiants.",
  official:{
   summary:"La documentation décrit notamment des effets digestifs liés à la metformine, des infections génitales/urinaires et une augmentation des mictions avec la dapagliflozine; des effets rares mais sérieux sont aussi décrits.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La documentation décrit notamment des effets digestifs liés à la metformine, des infections génitales/urinaires et une augmentation des mictions avec la dapagliflozine; des effets rares mais sérieux sont aussi décrits.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "ozempic fixdose 1mg":{
  active:"Sémaglutide",
  indication:"Traitement du diabète de type 2 chez l’adulte; l’information suisse mentionne aussi le retardement de la progression d’une maladie rénale chronique chez certains patients diabétiques de type 2.",
  official:{
   summary:"La notice décrit fréquemment des effets gastro-intestinaux tels que nausées, diarrhée ou vomissements. D’autres risques et mises en garde, notamment ophtalmologiques et digestifs, figurent dans l’information officielle.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit fréquemment des effets gastro-intestinaux tels que nausées, diarrhée ou vomissements. D’autres risques et mises en garde, notamment ophtalmologiques et digestifs, figurent dans l’information officielle.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "dafalgan dolo":{
  active:"Paracétamol",
  indication:"Traitement de courte durée de douleurs et de fièvre selon la présentation.",
  official:{
   summary:"Le paracétamol est généralement bien toléré aux doses recommandées, mais la notice décrit des réactions cutanées ou d’hypersensibilité rares; le surdosage peut provoquer des lésions hépatiques graves.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Le paracétamol est généralement bien toléré aux doses recommandées, mais la notice décrit des réactions cutanées ou d’hypersensibilité rares; le surdosage peut provoquer des lésions hépatiques graves.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "dafalgan":{
  active:"Paracétamol",
  indication:"Traitement de la douleur et de la fièvre selon la présentation et l’information suisse.",
  official:{
   summary:"Le paracétamol est généralement bien toléré aux doses recommandées, mais des réactions cutanées ou d’hypersensibilité rares sont décrites; le surdosage peut provoquer des lésions hépatiques graves.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Le paracétamol est généralement bien toléré aux doses recommandées, mais des réactions cutanées ou d’hypersensibilité rares sont décrites; le surdosage peut provoquer des lésions hépatiques graves.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "fiasp flextouch insulin aspart":{
  active:"Insuline asparte",
  indication:"Insuline à action rapide utilisée dans le traitement du diabète, habituellement autour des repas.",
  official:{
   summary:"L’hypoglycémie est l’effet indésirable majeur des traitements par insuline. La notice décrit également des réactions au site d’injection et d’autres effets possibles.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"L’hypoglycémie est l’effet indésirable majeur des traitements par insuline. La notice décrit également des réactions au site d’injection et d’autres effets possibles.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "isoket spray":{
  active:"Dinitrate d’isosorbide",
  indication:"Traitement et prévention à court terme des crises d’angor; certaines utilisations cardiovasculaires aiguës sont également décrites dans l’information suisse.",
  official:{
   summary:"La vasodilatation peut notamment provoquer céphalées, vertiges et baisse de la tension artérielle; d’autres effets sont décrits dans la notice.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La vasodilatation peut notamment provoquer céphalées, vertiges et baisse de la tension artérielle; d’autres effets sont décrits dans la notice.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "levocetirizin-mepha":{
  active:"Lévocétirizine",
  indication:"Traitement de manifestations allergiques, notamment rhinite/conjonctivite allergique et urticaire idiopathique chronique.",
  official:{
   summary:"La notice décrit notamment somnolence, fatigue, céphalées et sécheresse buccale chez certains patients; d’autres effets sont possibles.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment somnolence, fatigue, céphalées et sécheresse buccale chez certains patients; d’autres effets sont possibles.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "mirtazapin-mepha":{
  active:"Mirtazapine",
  indication:"Traitement des épisodes dépressifs unipolaires.",
  official:{
   summary:"Les effets fréquemment décrits comprennent notamment somnolence/sédation, augmentation de l’appétit et du poids, sécheresse buccale et fatigue; d’autres effets et mises en garde figurent dans la notice.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Les effets fréquemment décrits comprennent notamment somnolence/sédation, augmentation de l’appétit et du poids, sécheresse buccale et fatigue; d’autres effets et mises en garde figurent dans la notice.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "mefenacide":{
  active:"Acide méfénamique",
  indication:"Anti-inflammatoire non stéroïdien utilisé contre certaines douleurs, la fièvre et, selon la présentation, l’hyperménorrhée.",
  official:{
   summary:"Comme les autres AINS, la notice décrit notamment des troubles digestifs et un risque de saignement/ulcération gastro-intestinale; des effets rénaux, cardiovasculaires, cutanés et allergiques sont également possibles.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Comme les autres AINS, la notice décrit notamment des troubles digestifs et un risque de saignement/ulcération gastro-intestinale; des effets rénaux, cardiovasculaires, cutanés et allergiques sont également possibles.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "perindopril- indapamid-mepha":{
  active:"Périndopril + indapamide",
  indication:"Traitement de l’hypertension artérielle essentielle.",
  official:{
   summary:"La documentation décrit notamment toux, vertiges ou baisse de tension, ainsi que des modifications des électrolytes ou de la fonction rénale; un angio-œdème est un effet rare mais important des inhibiteurs de l’ECA.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La documentation décrit notamment toux, vertiges ou baisse de tension, ainsi que des modifications des électrolytes ou de la fonction rénale; un angio-œdème est un effet rare mais important des inhibiteurs de l’ECA.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "prednisone spirig hc":{
  active:"Prednisone",
  indication:"Glucocorticoïde systémique utilisé dans de nombreuses maladies inflammatoires, allergiques, rhumatologiques, dermatologiques ou immunologiques selon l’information suisse.",
  official:{
   summary:"Les effets dépendent fortement de la dose et de la durée. La notice décrit notamment troubles métaboliques, augmentation du risque infectieux, effets digestifs, cutanés, osseux, musculaires et psychiques, surtout lors d’un traitement prolongé.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Les effets dépendent fortement de la dose et de la durée. La notice décrit notamment troubles métaboliques, augmentation du risque infectieux, effets digestifs, cutanés, osseux, musculaires et psychiques, surtout lors d’un traitement prolongé.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "solmucol":{
  active:"Acétylcystéine",
  indication:"Mucolytique/expectorant utilisé lorsque les voies respiratoires contiennent des sécrétions épaisses; utilisé aussi comme adjuvant dans la mucoviscidose.",
  official:{
   summary:"La notice décrit notamment des troubles digestifs et, plus rarement, des réactions d’hypersensibilité ou respiratoires.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment des troubles digestifs et, plus rarement, des réactions d’hypersensibilité ou respiratoires.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "sulgan n":{
  active:"Lidocaïne + lévomenthol + camphre (selon la forme)",
  indication:"Traitement symptomatique local des hémorroïdes et de certaines irritations ou inflammations de la région anale.",
  official:{
   summary:"Des réactions locales d’irritation ou d’hypersensibilité peuvent survenir; les effets dépendent de la forme utilisée et figurent dans la notice correspondante.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"Des réactions locales d’irritation ou d’hypersensibilité peuvent survenir; les effets dépendent de la forme utilisée et figurent dans la notice correspondante.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "tramadol-mepha":{
  active:"Tramadol",
  indication:"Analgésique opioïde destiné au traitement de douleurs modérées à fortes.",
  official:{
   summary:"La notice décrit notamment nausées, vertiges, somnolence, constipation et autres effets. Le tramadol expose aussi à des risques de dépendance, de dépression respiratoire, de convulsions et de syndrome sérotoninergique dans certaines situations.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment nausées, vertiges, somnolence, constipation et autres effets. Le tramadol expose aussi à des risques de dépendance, de dépression respiratoire, de convulsions et de syndrome sérotoninergique dans certaines situations.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "angina mcc":{
  active:"Chlorure de cétylpyridinium + lidocaïne + lévomenthol",
  indication:"Traitement adjuvant local lors d’inflammations et d’infections de la bouche et de la gorge.",
  official:{
   summary:"La notice peut décrire des réactions locales, troubles de la sensibilité ou réactions d’hypersensibilité. Les effets sont à interpréter selon la notice du produit.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice peut décrire des réactions locales, troubles de la sensibilité ou réactions d’hypersensibilité. Les effets sont à interpréter selon la notice du produit.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
 "irfen ibuprofenum":{
  active:"Ibuprofène",
  indication:"AINS utilisé notamment dans certaines douleurs, maladies rhumatismales, dysménorrhée, céphalées/migraine et comme traitement adjuvant dans certaines infections.",
  official:{
   summary:"La notice décrit notamment des troubles digestifs et un risque de saignement/ulcération gastro-intestinale; des effets rénaux, cardiovasculaires, cutanés et allergiques sont également possibles.",
   sources:[
    {name:'Notice d’emballage',meta:'Information destinée aux patients approuvée dans le cadre de l’autorisation suisse',detail:null,url:null},
    {name:'SwissmedicInfo',meta:'Base suisse des informations sur les médicaments · version française',detail:"La notice décrit notamment des troubles digestifs et un risque de saignement/ulcération gastro-intestinale; des effets rénaux, cardiovasculaires, cutanés et allergiques sont également possibles.",url:"https://www.swissmedicinfo.ch/?Lang=FR"}
   ]
  },
  recognized:null,
  unverified:null
 },
};


const PHARMACOVIGILANCE_FAMILY_VERSION='2026-08-14';
const PHARMACOVIGILANCE_FAMILIES=[{"stem":"-statine","type":"suffixe","className":"Inhibiteurs de l’HMG-CoA réductase","examples":"atorvastatine; rosuvastatine; simvastatine","domain":"Cardiovasculaire","practical":"Hypolipémiants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Myalgies; troubles digestifs; céphalées; fatigue","serious":"Myopathie/rhabdomyolyse; atteinte hépatique; hausse de la glycémie/diabète; très rares réactions immunomusculaires","monitoring":"CK si symptômes musculaires; bilan hépatique selon contexte; interactions augmentant l’exposition","safetySource":"https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=d9adb9e4-c495-9530-e5e3-7e3b01d53e4c","sourceRemark":"Référence ciblée utilisée pour un signal de sécurité important."},{"stem":"-pril","type":"suffixe","className":"Inhibiteurs de l’enzyme de conversion (IEC)","examples":"ramipril; lisinopril; périndopril","domain":"Cardiovasculaire","practical":"HTA, insuffisance cardiaque","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Toux sèche; hypotension/vertiges; hyperkaliémie; altération rénale transitoire","serious":"Angio-œdème; insuffisance rénale aiguë; hyperkaliémie sévère","monitoring":"Créatinine et K+ après initiation/augmentation; grossesse contre-indiquée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-sartan","type":"suffixe","className":"Antagonistes des récepteurs AT1 de l’angiotensine II (ARA II)","examples":"losartan; valsartan; candésartan","domain":"Cardiovasculaire","practical":"HTA, insuffisance cardiaque","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Vertiges; hypotension; hyperkaliémie; altération rénale transitoire","serious":"Insuffisance rénale aiguë; hyperkaliémie sévère; angio-œdème rare","monitoring":"Créatinine et K+; grossesse contre-indiquée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-olol","type":"suffixe","className":"Bêtabloquants","examples":"propranolol; bisoprolol; métoprolol","domain":"Cardiovasculaire","practical":"Sélectivité variable selon molécule","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bradycardie; fatigue; hypotension; extrémités froides; troubles du sommeil","serious":"Bloc AV; bronchospasme (surtout non sélectifs); aggravation aiguë d’IC; masquage d’hypoglycémie","monitoring":"Fréquence cardiaque/TA; prudence asthme, troubles conductifs; arrêt progressif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-dipine","type":"suffixe","className":"Inhibiteurs calciques de type dihydropyridine","examples":"amlodipine; nifédipine; félodipine","domain":"Cardiovasculaire","practical":"Vasodilatateurs","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Œdèmes des chevilles; céphalées; bouffées vasomotrices; palpitations; vertiges","serious":"Hypotension marquée; aggravation d’angor au début (rare); hyperplasie gingivale","monitoring":"TA; œdèmes; interactions CYP3A4 pour certaines molécules","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-zem","type":"suffixe","className":"Inhibiteurs calciques de type benzothiazépine","examples":"diltiazem","domain":"Cardiovasculaire","practical":"Stem moins productif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bradycardie; œdèmes; céphalées; vertiges; constipation/nausées","serious":"Bloc AV; insuffisance cardiaque; hypotension sévère; atteinte hépatique rare","monitoring":"FC/TA/ECG; prudence avec bêtabloquants","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-zosine","type":"suffixe","className":"Antagonistes alpha-1 adrénergiques","examples":"prazosine; doxazosine; térazosine","domain":"Cardiovasculaire/Urologie","practical":"HTA, symptômes prostatiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Hypotension orthostatique; vertiges; céphalées; fatigue; congestion nasale","serious":"Syncope surtout première dose; priapisme rare","monitoring":"TA couchée/debout; titration progressive","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-afil","type":"suffixe","className":"Inhibiteurs de la phosphodiestérase 5 (PDE5)","examples":"sildénafil; tadalafil; vardénafil","domain":"Cardiovasculaire/Urologie","practical":"Dysfonction érectile, HTAP","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; bouffées vasomotrices; dyspepsie; congestion nasale; troubles visuels","serious":"Hypotension sévère avec dérivés nitrés; priapisme; perte brutale vision/audition rare","monitoring":"Contre-indication avec nitrés; prudence cardiovasculaire","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-entan","type":"suffixe","className":"Antagonistes des récepteurs de l’endothéline","examples":"bosentan; ambrisentan; macitentan","domain":"Cardiovasculaire","practical":"HTAP","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; œdèmes; bouffées vasomotrices; anémie","serious":"Hépatotoxicité (notamment bosentan); rétention hydrosodée; tératogénicité","monitoring":"Bilan hépatique selon molécule; Hb; contraception/grossesse","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-prost","type":"suffixe","className":"Analogues/prostanoïdes liés aux prostaglandines","examples":"iloprost; latanoprost; travoprost","domain":"Cardio/Ophtalmo","practical":"Activités variables selon sous-groupe","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; bouffées vasomotrices; douleur mandibulaire; nausées; effets locaux oculaires selon voie","serious":"Hypotension; saignement; bronchospasme; effets oculaires pigmentaires/uvéite selon molécule","monitoring":"Très dépendant de la voie et du récepteur ciblé","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-parine","type":"suffixe","className":"Héparines et dérivés anticoagulants","examples":"énoxaparine; dalteparine; tinzaparine","domain":"Hématologie","practical":"HBPM notamment","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Saignements; hématomes au point d’injection; thrombopénie légère","serious":"Hémorragie majeure; thrombopénie induite par l’héparine (TIH); hyperkaliémie; ostéoporose au long cours","monitoring":"Plaquettes si risque de TIH; fonction rénale pour HBPM; signes de saignement","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gatran","type":"suffixe","className":"Inhibiteurs directs de la thrombine","examples":"dabigatran; ximélagatran","domain":"Hématologie","practical":"Anticoagulants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Saignements; dyspepsie; douleurs abdominales","serious":"Hémorragie majeure; anémie; thrombose si arrêt brutal","monitoring":"Fonction rénale; interactions P-gp; observance","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-xaban","type":"suffixe","className":"Inhibiteurs directs du facteur Xa","examples":"rivaroxaban; apixaban; édoxaban","domain":"Hématologie","practical":"Anticoagulants oraux directs","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Saignements; ecchymoses; anémie; nausées","serious":"Hémorragie majeure; hématome rachidien/épidural; thrombose si arrêt prématuré","monitoring":"Fonction rénale/hépatique; interactions CYP3A4/P-gp selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-grel","type":"suffixe","className":"Inhibiteurs de l’agrégation plaquettaire, récepteur P2Y12","examples":"clopidogrel; prasugrel; cangrelor","domain":"Hématologie","practical":"Antiagrégants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Ecchymoses; épistaxis; saignements digestifs; diarrhée","serious":"Hémorragie majeure; purpura thrombotique thrombocytopénique rare; neutropénie rare","monitoring":"Saignement; NFS si suspicion; interactions et chirurgie","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-plase","type":"suffixe","className":"Activateurs du plasminogène","examples":"altéplase; ténectéplase; rétéplase","domain":"Hématologie","practical":"Thrombolytiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Saignements; ecchymoses; hypotension","serious":"Hémorragie intracrânienne ou majeure; angio-œdème (surtout avec IEC); arythmies de reperfusion","monitoring":"Contre-indications hémorragiques strictes; surveillance neurologique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-poétine","type":"suffixe","className":"Érythropoïétines et analogues","examples":"époétine alfa; époétine bêta","domain":"Hématologie","practical":"Stimulent l’érythropoïèse","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"HTA; céphalées; symptômes pseudo-grippaux; réactions au point d’injection","serious":"Événements thrombotiques; HTA sévère; aplasie érythrocytaire pure rare","monitoring":"Hb, TA, fer; éviter correction excessive de l’Hb","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-grastim","type":"suffixe","className":"Facteurs stimulant les colonies granulocytaires (G-CSF)","examples":"filgrastim; pegfilgrastim; lenograstim","domain":"Hématologie","practical":"Neutropénie","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Douleurs osseuses/musculaires; céphalées; réactions au point d’injection","serious":"Splénomégalie/rupture splénique; syndrome de détresse respiratoire; syndrome de fuite capillaire; aortite rare","monitoring":"NFS; douleur quadrant supérieur gauche; symptômes respiratoires","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-grélide","type":"suffixe","className":"Agents affectant les mégacaryocytes/plaquettes","examples":"anagrélide","domain":"Hématologie","practical":"Stem peu productif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; palpitations; diarrhée; œdèmes; vertiges","serious":"Tachyarythmie/insuffisance cardiaque; hémorragie; thrombopénie excessive","monitoring":"NFS; ECG/cardiologie selon risque","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-cilline","type":"suffixe","className":"Antibiotiques pénicillines","examples":"amoxicilline; ampicilline; flucloxacilline","domain":"Infectiologie","practical":"Bêta-lactamines","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées; éruption cutanée; candidose","serious":"Anaphylaxie; colite à C. difficile; néphrite interstitielle; cytopénies; réactions cutanées sévères rares","monitoring":"Allergies bêta-lactamines; fonction rénale; diarrhée sévère","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"cef- / ceph-","type":"préfixe","className":"Antibiotiques céphalosporines","examples":"céfazoline; ceftriaxone; céfépime","domain":"Infectiologie","practical":"Préfixe plutôt que terminaison","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées; éruption; douleur au site d’injection","serious":"Anaphylaxie; colite à C. difficile; cytopénies; neurotoxicité/convulsions surtout si insuffisance rénale","monitoring":"Allergie bêta-lactamines; adaptation rénale","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-cycline","type":"suffixe","className":"Antibiotiques tétracyclines","examples":"doxycycline; minocycline; tétracycline","domain":"Infectiologie","practical":"Inhibiteurs de la synthèse protéique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; photosensibilité; œsophagite","serious":"Hépatotoxicité; hypertension intracrânienne; réactions cutanées sévères; atteinte dentaire/osseuse pendant développement","monitoring":"Prise avec eau; éviter coucher immédiat; grossesse/enfant selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-floxacine","type":"suffixe","className":"Antibiotiques fluoroquinolones","examples":"ciprofloxacine; lévofloxacine; moxifloxacine","domain":"Infectiologie","practical":"Inhibiteurs ADN-gyrase/topoisomérase","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; céphalées; insomnie/vertiges","serious":"Tendinite/rupture tendineuse; neuropathie périphérique; effets SNC/psychiatriques; dysglycémie; QT long; risque aortique rare","monitoring":"Réserver selon indications; arrêter si douleur tendineuse/neuropathie; interactions QT","safetySource":"https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/019537s093%2C020780s049lbl.pdf","sourceRemark":"Référence ciblée utilisée pour un signal de sécurité important."},{"stem":"-thromycine","type":"suffixe","className":"Antibiotiques macrolides apparentés","examples":"azithromycine; clarithromycine; érythromycine","domain":"Infectiologie","practical":"Le motif -mycine seul est moins spécifique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; douleurs abdominales","serious":"QT long/torsades; hépatotoxicité cholestatique; interactions CYP3A4; hypoacousie réversible à fortes doses","monitoring":"ECG/interactions selon risque; fonction hépatique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-kacine","type":"suffixe","className":"Antibiotiques aminoglycosides","examples":"amikacine; arbekacine","domain":"Infectiologie","practical":"Sous-groupe","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Néphrotoxicité; ototoxicité; nausées; réactions au site d’injection","serious":"Surdité/atteinte vestibulaire irréversible; insuffisance rénale; bloc neuromusculaire","monitoring":"Dosages plasmatiques; fonction rénale; audition","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-conazole","type":"suffixe","className":"Antifongiques azolés systémiques/topiques","examples":"fluconazole; itraconazole; voriconazole","domain":"Infectiologie","practical":"Inhibition de la synthèse d’ergostérol","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; douleurs abdominales; céphalées; éruption","serious":"Hépatotoxicité; QT long; interactions médicamenteuses importantes; effets endocriniens selon molécule","monitoring":"Bilan hépatique; interactions CYP; ECG selon risque","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-fungine","type":"suffixe","className":"Antifongiques échinocandines","examples":"caspofungine; micafungine; anidulafungine","domain":"Infectiologie","practical":"Inhibiteurs de la synthèse du bêta-glucane","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fièvre; céphalées; nausées; diarrhée; réactions à la perfusion","serious":"Anaphylaxie; hépatotoxicité; réactions histaminiques sévères","monitoring":"Bilan hépatique; surveillance perfusion","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-vir","type":"suffixe","className":"Antiviraux (stem général historique)","examples":"aciclovir; ganciclovir; remdésivir","domain":"Infectiologie","practical":"Nombreux sous-stems plus spécifiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; céphalées; fatigue; effets digestifs","serious":"Toxicités très variables: rénale, hépatique, hématologique ou mitochondriale selon molécule; interactions","monitoring":"Stem trop large: se référer impérativement à la molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ciclovir","type":"suffixe","className":"Antiviraux analogues nucléosidiques anti-herpès","examples":"aciclovir; valaciclovir; ganciclovir","domain":"Infectiologie","practical":"Anti-herpèsvirus","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; céphalées; réactions locales IV","serious":"Néphrotoxicité/cristallurie; neurotoxicité (confusion, tremor, convulsions) surtout insuffisance rénale; cytopénies avec ganciclovir","monitoring":"Hydratation; adaptation rénale; NFS pour ganciclovir","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-amivir","type":"suffixe","className":"Inhibiteurs de la neuraminidase grippale","examples":"oseltamivir; zanamivir; péramivir","domain":"Infectiologie","practical":"Antigrippaux","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; vomissements; céphalées","serious":"Réactions cutanées sévères rares; effets neuropsychiatriques rares; bronchospasme avec zanamivir inhalé","monitoring":"Prudence maladie respiratoire pour voie inhalée; adaptation rénale selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gravir","type":"suffixe","className":"Inhibiteurs de l’intégrase du VIH","examples":"raltegravir; dolutégravir; bictégravir","domain":"Infectiologie","practical":"Antirétroviraux","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; insomnie; nausées; diarrhée; prise de poids possible","serious":"Hypersensibilité; hépatotoxicité; interactions avec cations/inducteurs; anomalies neuropsychiatriques rares","monitoring":"Bilan hépatique; espacer antiacides/cations; interactions","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-navir","type":"suffixe","className":"Inhibiteurs de protéases virales","examples":"ritonavir; darunavir; nirmatrelvir (apparenté)","domain":"Infectiologie","practical":"Stem utilisé dans plusieurs antiviraux","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; dyslipidémie; insulinorésistance selon molécule","serious":"Hépatotoxicité; interactions CYP majeures; pancréatite/saignement chez certains; toxicité très variable selon virus ciblé","monitoring":"Interactions indispensables à vérifier; bilan hépatique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-vudine","type":"suffixe","className":"Analogues nucléosidiques inhibiteurs de transcriptase inverse","examples":"zidovudine; lamivudine; stavudine","domain":"Infectiologie","practical":"Antirétroviraux","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; fatigue; céphalées; troubles digestifs","serious":"Acidose lactique/stéatose hépatique; cytopénies (zidovudine); neuropathie/pancréatite selon analogue","monitoring":"NFS, foie; effets mitochondriaux; dépend de la molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-buvir","type":"suffixe","className":"Antiviraux inhibant la polymérase NS5B du VHC","examples":"sofosbuvir; dasabuvir","domain":"Infectiologie","practical":"Hépatite C","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fatigue; céphalées; nausées","serious":"Bradycardie sévère avec amiodarone (sofosbuvir en combinaison); réactivation VHB; interactions","monitoring":"Dépistage VHB; interactions; schéma combiné déterminant","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-asvir","type":"suffixe","className":"Inhibiteurs de NS5A du VHC","examples":"daclatasvir; ledipasvir; velpatasvir","domain":"Infectiologie","practical":"Hépatite C","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fatigue; céphalées; nausées","serious":"Réactivation VHB; interactions; bradycardie dans certains schémas avec sofosbuvir/amiodarone","monitoring":"Dépistage VHB; interactions; effets du traitement combiné","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-previr","type":"suffixe","className":"Inhibiteurs de protéase NS3/4A du VHC","examples":"simeprevir; glecaprevir; grazoprevir","domain":"Infectiologie","practical":"Hépatite C","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fatigue; céphalées; nausées; prurit","serious":"Hépatotoxicité/décompensation chez maladie hépatique avancée; interactions majeures; réactivation VHB","monitoring":"Fonction hépatique; interactions; dépistage VHB","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-quantel","type":"suffixe","className":"Anthelminthiques apparentés au praziquantel","examples":"praziquantel","domain":"Infectiologie","practical":"Antiparasitaires","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Vertiges; somnolence; céphalées; nausées; douleurs abdominales","serious":"Réactions inflammatoires neurologiques liées à la destruction parasitaire; arythmies/convulsions rares","monitoring":"Prudence conduite; contexte neurocysticercose","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-nidazole","type":"suffixe","className":"Dérivés nitro-imidazolés anti-infectieux","examples":"métronidazole; tinidazole; ornidazole","domain":"Infectiologie","practical":"Anaérobies/protozoaires","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; goût métallique; douleurs abdominales; céphalées","serious":"Neuropathie périphérique; convulsions/encéphalopathie rares; leucopénie; réaction avec alcool discutée mais prudence","monitoring":"Limiter exposition prolongée; NFS si long cours; interactions anticoagulants","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-prazole","type":"suffixe","className":"Inhibiteurs de la pompe à protons","examples":"oméprazole; pantoprazole; ésoméprazole","domain":"Gastro-entérologie","practical":"Suppression acide gastrique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; diarrhée/constipation; douleurs abdominales; nausées","serious":"Hypomagnésémie; déficit B12; fractures/infections digestives au long cours; néphrite interstitielle; lupus médicamenteux rare","monitoring":"Réévaluer indication au long cours; Mg/B12/rein selon contexte","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-tidine","type":"suffixe","className":"Antagonistes H2 de l’histamine","examples":"famotidine; ranitidine; cimétidine","domain":"Gastro-entérologie","practical":"Attention: stem non exclusif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; diarrhée/constipation; vertiges","serious":"Confusion surtout sujet âgé/IR; bradycardie rare; cytopénies; interactions importantes avec cimétidine","monitoring":"Adapter à la fonction rénale; vigilance confusion/interactions","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-setron","type":"suffixe","className":"Antagonistes 5-HT3","examples":"ondansétron; granisétron; palonosétron","domain":"Gastro/Oncologie","practical":"Antiemétiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; constipation; bouffées vasomotrices","serious":"QT long/torsades; syndrome sérotoninergique rare; élévation enzymes hépatiques","monitoring":"ECG si risque/QT; constipation; interactions sérotoninergiques","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-pride","type":"suffixe","className":"Agents gastroprocinétiques apparentés","examples":"cisapride; prucalopride; mosapride","domain":"Gastro-entérologie","practical":"Cibles sérotoninergiques variables","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; diarrhée; douleurs abdominales; nausées","serious":"Troubles du rythme/QT pour certains anciens agents (cisapride); événements psychiatriques rares selon molécule","monitoring":"Effets très dépendants de la molécule; vérifier QT/interactions","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-lotide","type":"suffixe","className":"Peptides/analogues utilisés notamment en gastro-endocrino","examples":"linaclotide; plécanatide","domain":"Gastro-entérologie","practical":"Sous-groupes mécanistiques différents","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; douleurs abdominales; ballonnements; gaz","serious":"Diarrhée sévère avec déshydratation; troubles hydro-électrolytiques","monitoring":"Hydratation; contre-indications pédiatriques spécifiques selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gliptine","type":"suffixe","className":"Inhibiteurs de la DPP-4","examples":"sitagliptine; linagliptine; vildagliptine","domain":"Diabétologie","practical":"Antidiabétiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Rhinopharyngite; céphalées; troubles digestifs","serious":"Pancréatite; réactions d’hypersensibilité; pemphigoïde bulleuse; insuffisance cardiaque signalée avec certaines molécules","monitoring":"Symptômes pancréatite; peau; fonction rénale selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gliflozine","type":"suffixe","className":"Inhibiteurs du cotransporteur SGLT2","examples":"dapagliflozine; empagliflozine; canagliflozine","domain":"Diabétologie/Cardio","practical":"Diabète, IC, maladie rénale","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Mycoses génitales; polyurie; infections urinaires; déplétion volémique","serious":"Acidocétose parfois euglycémique; gangrène de Fournier très rare; urosepsis; amputation/fracture signalées pour certaines molécules","monitoring":"Hydratation; suspendre autour chirurgie/jeûne selon recommandations; fonction rénale","safetySource":"https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/209805s017lbledt.pdf","sourceRemark":"Référence ciblée utilisée pour un signal de sécurité important."},{"stem":"-glutide","type":"suffixe","className":"Agonistes/analogues du GLP-1","examples":"liraglutide; sémaglutide; dulaglutide","domain":"Diabétologie","practical":"Peptides incrétinomimétiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; vomissements; diarrhée/constipation; douleur abdominale; diminution appétit","serious":"Pancréatite; maladie biliaire; gastroparésie/occlusion rare; déshydratation avec atteinte rénale; risque thyroïdien spécifique aux étiquettes de certaines molécules","monitoring":"Titration; symptômes digestifs sévères; prudence gastroparésie; recommandations propres à chaque produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-glitazone","type":"suffixe","className":"Thiazolidinediones, agonistes PPARγ","examples":"pioglitazone; rosiglitazone","domain":"Diabétologie","practical":"Sensibilisateurs à l’insuline","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Prise de poids; œdèmes; céphalées","serious":"Insuffisance cardiaque/aggravation; fractures; anémie; atteinte hépatique rare; risque vésical discuté pour pioglitazone","monitoring":"Éviter IC symptomatique; poids/œdèmes; bilan hépatique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-formin(e)","type":"suffixe","className":"Biguanides antidiabétiques","examples":"metformine","domain":"Diabétologie","practical":"Stem peu productif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées; douleurs abdominales; goût métallique","serious":"Acidose lactique très rare surtout situations à risque; déficit en vitamine B12 au long cours","monitoring":"Fonction rénale; suspendre dans certaines situations aiguës/produit de contraste selon protocole; B12","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-glinide","type":"suffixe","className":"Sécrétagogues d’insuline, méglitinides","examples":"répaglinide; natéglinide","domain":"Diabétologie","practical":"Action courte","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Hypoglycémie; prise de poids; céphalées","serious":"Hypoglycémie sévère; réactions hépatiques rares","monitoring":"Glycémie; prise liée aux repas; fonction hépatique/rénale selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-terol","type":"suffixe","className":"Agonistes bêta-2 adrénergiques bronchodilatateurs","examples":"salmétérol; formotérol; indacatérol","domain":"Pneumologie","practical":"LABA/ultra-LABA selon molécule","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Tremblements; palpitations; tachycardie; céphalées; crampes","serious":"Hypokaliémie; arythmies; hyperglycémie; bronchospasme paradoxal","monitoring":"Technique inhalation; FC/K+ si fortes doses; LABA non utilisés seuls dans l’asthme selon recommandations","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-tropium","type":"suffixe","className":"Antimuscariniques inhalés bronchodilatateurs","examples":"ipratropium; tiotropium; glycopyrronium","domain":"Pneumologie","practical":"SAMA/LAMA","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Sécheresse buccale; toux; irritation pharyngée; constipation","serious":"Rétention urinaire; glaucome aigu si contact oculaire; tachycardie; bronchospasme paradoxal","monitoring":"Prudence HBP/glaucome; technique inhalation","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-lukast","type":"suffixe","className":"Antagonistes des récepteurs des leucotriènes","examples":"montélukast; zafirlukast","domain":"Pneumologie/Allergologie","practical":"Asthme/allergie","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; douleurs abdominales; infections respiratoires","serious":"Événements neuropsychiatriques (agitation, rêves anormaux, dépression, idées suicidaires); réactions d’hypersensibilité","monitoring":"Informer sur symptômes neuropsychiatriques; réévaluer bénéfice","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-fylline","type":"suffixe","className":"Méthylxanthines bronchodilatatrices","examples":"théophylline; aminophylline","domain":"Pneumologie","practical":"Stem historique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; tremblements; insomnie; céphalées; palpitations","serious":"Arythmies; convulsions; toxicité potentiellement mortelle à forte concentration","monitoring":"Marge thérapeutique étroite; concentrations plasmatiques et interactions","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-caïne","type":"suffixe","className":"Anesthésiques locaux","examples":"lidocaïne; bupivacaïne; ropivacaïne","domain":"Anesthésie","practical":"Blocage des canaux sodiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Engourdissement local; paresthésies; vertiges; nausées","serious":"Toxicité systémique: convulsions, troubles du rythme, arrêt cardiaque; méthémoglobinémie pour certaines molécules; allergie rare","monitoring":"Dose maximale; injection intravasculaire accidentelle; surveillance neurologique/cardiaque","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-fentanil","type":"suffixe","className":"Opioïdes apparentés au fentanyl","examples":"fentanyl; sufentanil; alfentanil; rémifentanil","domain":"Anesthésie/Douleur","practical":"Agonistes µ puissants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; nausées/vomissements; constipation; prurit","serious":"Dépression respiratoire/apnée; rigidité thoracique; bradycardie; dépendance; syndrome sérotoninergique rare","monitoring":"Respiration/sédation; interactions dépresseurs SNC; antidote naloxone","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-adol","type":"suffixe","className":"Analgésiques opioïdes apparentés","examples":"tramadol; tapentadol","domain":"Douleur","practical":"Mécanismes mixtes","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; vertiges; somnolence; constipation; céphalées","serious":"Dépression respiratoire; convulsions (tramadol); syndrome sérotoninergique; dépendance; hypoglycémie/hyponatrémie rares","monitoring":"Interactions sérotoninergiques; fonction rénale/hépatique; risque de dépendance","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-coxib","type":"suffixe","className":"Inhibiteurs sélectifs de COX-2","examples":"célécoxib; étoricoxib; parecoxib","domain":"Douleur/Rhumatologie","practical":"AINS sélectifs","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Dyspepsie; douleurs abdominales; œdèmes; HTA; céphalées","serious":"Infarctus/AVC; insuffisance rénale; hémorragie/ulcère digestif malgré sélectivité; réactions cutanées sévères","monitoring":"Risque cardiovasculaire/rénal; dose minimale durée minimale","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-profen","type":"suffixe","className":"AINS dérivés de l’acide propionique","examples":"ibuprofène; kétoprofène; flurbiprofène","domain":"Douleur/Rhumatologie","practical":"AINS","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Dyspepsie; nausées; douleurs abdominales; céphalées","serious":"Ulcère/hémorragie digestive; insuffisance rénale; événements cardiovasculaires; bronchospasme; réactions cutanées sévères","monitoring":"Risque GI/rénal/CV; interactions anticoagulants; grossesse tardive contre-indiquée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-icam","type":"suffixe","className":"AINS de la famille des oxicams","examples":"piroxicam; méloxicam; ténoxicam","domain":"Douleur/Rhumatologie","practical":"AINS","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Dyspepsie; nausées; œdèmes; vertiges","serious":"Hémorragie/ulcère digestif; insuffisance rénale; événements cardiovasculaires; réactions cutanées sévères","monitoring":"Longue demi-vie pour plusieurs molécules; mêmes précautions AINS","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-zepam","type":"suffixe","className":"Benzodiazépines, souvent anxiolytiques","examples":"diazépam; lorazépam; clonazépam","domain":"Neurologie/Psychiatrie","practical":"Modulateurs GABA-A","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; vertiges; ataxie; troubles de mémoire; faiblesse musculaire","serious":"Dépression respiratoire surtout avec opioïdes/alcool; dépendance et sevrage; chutes; réactions paradoxales","monitoring":"Usage court si possible; pas d’arrêt brutal après usage prolongé; conduite","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-zolam","type":"suffixe","className":"Benzodiazépines apparentées","examples":"alprazolam; midazolam; triazolam","domain":"Neurologie/Psychiatrie","practical":"Anxiolytiques/hypnotiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; amnésie; ataxie; vertiges","serious":"Dépression respiratoire avec dépresseurs SNC; dépendance/sevrage; comportements paradoxaux","monitoring":"Interactions CYP selon molécule; conduite; arrêt progressif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-barbital","type":"suffixe","className":"Barbituriques","examples":"phénobarbital; pentobarbital","domain":"Neurologie/Anesthésie","practical":"Modulateurs GABA-A","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; vertiges; ataxie; nausées","serious":"Dépression respiratoire/cardiovasculaire; dépendance; coma en surdosage; réactions cutanées sévères","monitoring":"Marge étroite; interactions inductrices enzymatiques; sevrage progressif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-triptyline","type":"suffixe","className":"Antidépresseurs tricycliques","examples":"amitriptyline; nortriptyline","domain":"Psychiatrie","practical":"Stem de sous-groupe","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Sécheresse buccale; constipation; somnolence; prise de poids; hypotension orthostatique","serious":"Arythmies/QRS-QT; convulsions; syndrome sérotoninergique; rétention urinaire/glaucome; toxicité sévère en surdosage","monitoring":"ECG si risque; effets anticholinergiques; risque suicidaire au début comme antidépresseurs","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-oxetine","type":"suffixe","className":"Antidépresseurs inhibiteurs de recapture de la sérotonine apparentés","examples":"fluoxétine; paroxétine; duloxétine","domain":"Psychiatrie","practical":"Description INN en révision; pharmacologie variable","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; troubles sexuels; insomnie ou somnolence; céphalées; sueurs","serious":"Syndrome sérotoninergique; hyponatrémie/SIADH; saignement; virage maniaque; idées suicidaires chez certains jeunes; sevrage selon molécule","monitoring":"Stem pharmacologiquement hétérogène (inclut duloxétine); interactions et arrêt progressif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-faxine","type":"suffixe","className":"Antidépresseurs apparentés inhibant la recapture monoaminergique","examples":"venlafaxine; desvenlafaxine","domain":"Psychiatrie","practical":"Description INN en révision","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; sueurs; insomnie; troubles sexuels; sécheresse buccale","serious":"HTA/tachycardie; syndrome sérotoninergique; hyponatrémie; sevrage marqué; idées suicidaires chez certains jeunes","monitoring":"TA; arrêt progressif; interactions sérotoninergiques","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-apine","type":"suffixe","className":"Antipsychotiques tricycliques/atypiques apparentés","examples":"clozapine; olanzapine; quétiapine","domain":"Psychiatrie","practical":"Motif non totalement spécifique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; prise de poids; bouche sèche; constipation; vertiges","serious":"Syndrome malin des neuroleptiques; dyskinésie tardive; troubles métaboliques; QT; agranulocytose/myocardite surtout clozapine","monitoring":"Poids, glycémie, lipides; NFS spécifique clozapine; stem hétérogène","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ridone","type":"suffixe","className":"Antipsychotiques apparentés","examples":"rispéridone; palipéridone","domain":"Psychiatrie","practical":"Motif non totalement spécifique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; hyperprolactinémie; symptômes extrapyramidaux; prise de poids","serious":"Syndrome malin; dyskinésie tardive; QT; AVC/mortalité accrue chez personnes âgées avec psychose liée à démence","monitoring":"Poids/métabolisme; prolactine/EPS; prudence sujet âgé","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-piprazole","type":"suffixe","className":"Antipsychotiques apparentés à l’aripiprazole","examples":"aripiprazole; brexpiprazole","domain":"Psychiatrie","practical":"Agonisme partiel dopaminergique selon molécule","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Akathisie; nausées; insomnie; anxiété; céphalées","serious":"Syndrome malin; dyskinésie tardive; troubles du contrôle des impulsions; hyperglycémie; idées suicidaires selon indication/molécule","monitoring":"Akathisie/impulsivité; métabolisme; interactions CYP","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-racetam","type":"suffixe","className":"Nootropiques/antiépileptiques apparentés au piracétam","examples":"piracétam; lévétiracétam; brivaracétam","domain":"Neurologie","practical":"Activités diverses","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; vertiges; asthénie; irritabilité","serious":"Troubles comportementaux/psychiatriques; idées suicidaires; réactions cutanées/hématologiques rares","monitoring":"Stem très hétérogène; adaptation rénale pour lévétiracétam","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gabaline","type":"suffixe","className":"Ligands α2δ des canaux calciques","examples":"gabapentine; prégabaline","domain":"Neurologie/Douleur","practical":"Antiépileptiques/douleur neuropathique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; vertiges; œdèmes périphériques; prise de poids; ataxie","serious":"Dépression respiratoire surtout avec opioïdes; idées suicidaires; angio-œdème; mésusage/dépendance possible","monitoring":"Fonction rénale; conduite; association opioïdes","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-triptan","type":"suffixe","className":"Agonistes 5-HT1B/1D antimigraineux","examples":"sumatriptan; rizatriptan; zolmitriptan","domain":"Neurologie","practical":"Crise migraineuse","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Paresthésies; sensation d’oppression thoracique/cervicale; vertiges; somnolence; nausées","serious":"Ischémie myocardique/AVC; vasospasme; HTA sévère; syndrome sérotoninergique rare","monitoring":"Contre-indications vasculaires; éviter surconsommation","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gepant","type":"suffixe","className":"Antagonistes du récepteur CGRP","examples":"ubrogepant; rimegepant; atogepant","domain":"Neurologie","practical":"Migraine","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; somnolence/fatigue; bouche sèche; constipation selon molécule","serious":"Hypersensibilité; élévation enzymes hépatiques rare; HTA/Raynaud signalés avec antagonisme CGRP selon produits","monitoring":"Interactions CYP3A4 selon molécule; foie; TA si concerné","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ditan","type":"suffixe","className":"Agonistes 5-HT1F antimigraineux","examples":"lasmiditan","domain":"Neurologie","practical":"Migraine","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Vertiges; somnolence; paresthésies; fatigue","serious":"Dépression SNC importante; syndrome sérotoninergique rare; abus potentiel","monitoring":"Ne pas conduire pendant la durée recommandée après prise; interactions sédatives","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-dopa","type":"suffixe","className":"Précurseurs/analogues de la dopamine","examples":"lévodopa; méthyldopa","domain":"Neurologie/Cardio","practical":"Mécanismes différents","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; hypotension orthostatique; somnolence; effets variables","serious":"Levodopa: dyskinésies, hallucinations, fluctuations; méthyldopa: hépatotoxicité, anémie hémolytique","monitoring":"Stem non homogène: effets à interpréter selon molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-giline","type":"suffixe","className":"Inhibiteurs de la MAO-B antiparkinsoniens","examples":"sélégiline; rasagiline; safinamide (exception)","domain":"Neurologie","practical":"Parkinson","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; céphalées; vertiges; hypotension orthostatique; insomnie","serious":"Syndrome sérotoninergique/hypertension avec interactions; hallucinations/dyskinésies; hépatotoxicité selon molécule","monitoring":"Interactions serotonergiques/sympathomimétiques; régime tyramine selon sélectivité/dose","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-capone","type":"suffixe","className":"Inhibiteurs de la COMT","examples":"entacapone; opicapone; tolcapone","domain":"Neurologie","practical":"Parkinson","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Dyskinésies; nausées; diarrhée; hypotension; coloration urines","serious":"Hépatotoxicité sévère (tolcapone); rhabdomyolyse rare; somnolence/hallucinations","monitoring":"Bilan hépatique surtout tolcapone; ajuster lévodopa","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-pezil","type":"suffixe","className":"Inhibiteurs de l’acétylcholinestérase apparentés","examples":"donépézil","domain":"Neurologie","practical":"Alzheimer; stem peu productif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; insomnie; crampes; perte de poids","serious":"Bradycardie/syncope; bloc cardiaque; ulcère/saignement GI; convulsions; QT rare","monitoring":"FC/poids; interactions bradycardisantes; stem peu productif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-stigmine","type":"suffixe","className":"Inhibiteurs de l’acétylcholinestérase","examples":"néostigmine; pyridostigmine; rivastigmine","domain":"Neurologie","practical":"Usages variés","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; diarrhée; hypersalivation; sueurs; crampes abdominales","serious":"Bradycardie; bronchospasme; crise cholinergique; syncope","monitoring":"FC; symptômes cholinergiques; indication/molécule déterminante","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-curium","type":"suffixe","className":"Bloquants neuromusculaires non dépolarisants","examples":"atracurium; cisatracurium; mivacurium","domain":"Anesthésie","practical":"Curarisants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Hypotension; rougeur; réactions au site; faiblesse résiduelle","serious":"Anaphylaxie; libération d’histamine; bronchospasme; paralysie prolongée","monitoring":"Monitorage neuromusculaire; ventilation jusqu’à récupération","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-curonium","type":"suffixe","className":"Bloquants neuromusculaires aminostéroïdes","examples":"rocuronium; vécuronium; pancuronium","domain":"Anesthésie","practical":"Curarisants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Tachy/bradycardie selon molécule; faiblesse résiduelle","serious":"Anaphylaxie; paralysie prolongée; troubles hémodynamiques","monitoring":"Monitorage neuromusculaire; fonction hépatique/rénale selon produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-astine","type":"suffixe","className":"Antihistaminiques H1 apparentés","examples":"azélastine; ébastine","domain":"Allergologie","practical":"Motif non exclusif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence variable; goût amer; sécheresse buccale; irritation nasale/oculaire","serious":"Réactions d’hypersensibilité; troubles du rythme rares selon molécule","monitoring":"Stem non exclusif; dépend de la voie et de la molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-izine","type":"suffixe","className":"Antihistaminiques H1 de certaines familles","examples":"cétirizine; lévocétirizine; hydroxyzine","domain":"Allergologie","practical":"Motif non spécifique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Somnolence; sécheresse buccale; fatigue; céphalées","serious":"Rétention urinaire; confusion; QT/arythmie surtout certaines molécules; réaction allergique","monitoring":"Prudence alcool/sédatifs; hydroxyzine plus sédative et à risque QT","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-mab","type":"suffixe","className":"Anticorps monoclonaux (nomenclature historique)","examples":"rituximab; trastuzumab; adalimumab","domain":"Immunologie/Oncologie","practical":"Système INN des anticorps révisé depuis 2021","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions à la perfusion/injection; céphalées; fatigue; infections selon cible","serious":"Anaphylaxie; infections graves; réactions immunitaires/auto-immunes; cytopénies ou toxicités d’organe selon cible","monitoring":"Aucun profil unique: cible, Fc et indication déterminent la toxicité","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-tug","type":"suffixe","className":"Anticorps monoclonaux non modifiés, nouveau schéma INN","examples":"exemples récents selon nouvelles DCI","domain":"Immunologie/Oncologie","practical":"Nouveau schéma anticorps","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions d’administration; infections ou symptômes inflammatoires possibles","serious":"Hypersensibilité; toxicités immunologiques ou d’organe dépendantes de la cible","monitoring":"Nouveau stem structurel, pas une classe pharmacologique homogène","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-bart","type":"suffixe","className":"Anticorps monoclonaux artificiels, nouveau schéma INN","examples":"exemples récents selon nouvelles DCI","domain":"Immunologie/Oncologie","practical":"Nouveau schéma anticorps","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions d’administration; effets liés à la cible","serious":"Hypersensibilité; immunotoxicités/infections/toxicités d’organe selon cible","monitoring":"Nouveau stem structurel; pas d’effets de classe généralisables","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-mig","type":"suffixe","className":"Anticorps multi-immunoglobulines, nouveau schéma INN","examples":"exemples récents selon nouvelles DCI","domain":"Immunologie/Oncologie","practical":"Nouveau schéma anticorps","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions d’administration; effets liés à la cible","serious":"Hypersensibilité; immunotoxicités/infections/toxicités d’organe selon cible","monitoring":"Stem structurel; données à lire molécule par molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ment","type":"suffixe","className":"Fragments d’anticorps, nouveau schéma INN","examples":"exemples récents selon nouvelles DCI","domain":"Immunologie/Oncologie","practical":"Nouveau schéma anticorps","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions d’administration; effets liés à la cible","serious":"Hypersensibilité; toxicités spécifiques de la cible; immunogénicité","monitoring":"Fragments d’anticorps: profil non homogène","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-cept","type":"suffixe","className":"Protéines de fusion avec portion réceptrice","examples":"étanercept; aflibercept; abatacept","domain":"Immunologie","practical":"Famille large de protéines de fusion","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions au site d’injection/perfusion; céphalées; infections selon cible","serious":"Infections graves; hypersensibilité; événements immunologiques; toxicités spécifiques de la protéine de fusion","monitoring":"Famille très hétérogène: étanercept, aflibercept et abatacept diffèrent fortement","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-kinra","type":"suffixe","className":"Antagonistes du récepteur de l’interleukine-1","examples":"anakinra","domain":"Immunologie","practical":"Stem peu productif","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions au site d’injection; céphalées; nausées","serious":"Infections graves; neutropénie; hypersensibilité","monitoring":"NFS; signes d’infection; stem peu productif","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-limus","type":"suffixe","className":"Immunosuppresseurs apparentés au sirolimus","examples":"sirolimus; tacrolimus; évérolimus","domain":"Immunologie/Oncologie","practical":"Cibles et structures apparentées","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Tremblements; HTA; hyperglycémie; dyslipidémie; troubles GI","serious":"Néphrotoxicité (tacrolimus); infections/malignités; pneumopathie interstitielle; cytopénies; toxicités métaboliques","monitoring":"Concentrations plasmatiques pour certains; rein; interactions CYP3A","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-citinib","type":"suffixe","className":"Inhibiteurs de Janus kinases (JAK)","examples":"tofacitinib; baricitinib; upadacitinib","domain":"Immunologie","practical":"Sous-stem de -tinib","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Infections respiratoires; nausées; céphalées; élévation lipides/enzymes hépatiques","serious":"Infections graves/zona; thromboses; événements cardiovasculaires majeurs; cancers; cytopénies; perforation GI rare","monitoring":"NFS, foie, lipides; dépistage TB/hépatites; risque CV/thrombotique","safetySource":"https://www.fda.gov/drugs/drug-safety-and-availability/fda-requires-warnings-about-increased-risk-serious-heart-related-events-cancer-blood-clots-and-death","sourceRemark":"Référence ciblée utilisée pour un signal de sécurité important."},{"stem":"-tinib","type":"suffixe","className":"Inhibiteurs de tyrosine kinases et kinases apparentées","examples":"imatinib; erlotinib; sunitinib","domain":"Oncologie","practical":"Très grande famille; sous-stems plus précis","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées; fatigue; éruption; HTA ou cytopénies selon cible","serious":"Hépatotoxicité; cardiotoxicité/QT; pneumopathie; hémorragie/thrombose; perforation; effets très dépendants de la kinase ciblée","monitoring":"Pas de profil unique: surveillances spécifiques à chaque TKI","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-alkib","type":"suffixe","className":"Inhibiteurs d’ALK","examples":"dirozalkib; envonalkib; zotizalkib","domain":"Oncologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Données limitées; effets attendus d’inhibiteurs ALK: troubles GI, fatigue, œdèmes possibles","serious":"Toxicités potentielles de TKI ALK: hépatotoxicité, pneumopathie, bradycardie/QT selon molécule","monitoring":"Stem récent: vérifier impérativement le RCP/label de la molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-menib","type":"suffixe","className":"Inhibiteurs de l’interaction avec la ménine","examples":"revumenib; ziftomenib","domain":"Oncologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Nausées; diarrhée; fatigue; différenciation possible selon indication","serious":"Syndrome de différenciation; QT; cytopénies/infections; toxicité hépatique selon molécule","monitoring":"Stem récent en hémato-oncologie; surveillance spécialisée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ciclib","type":"suffixe","className":"Inhibiteurs des kinases dépendantes des cyclines (CDK)","examples":"palbociclib; ribociclib; abémaciclib","domain":"Oncologie","practical":"Notamment CDK4/6","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Neutropénie; fatigue; nausées; diarrhée (surtout abémaciclib); alopécie","serious":"Neutropénie fébrile; hépatotoxicité; QT long (ribociclib); pneumopathie; thrombose (abémaciclib)","monitoring":"NFS, foie; ECG pour ribociclib; symptômes respiratoires","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-parib","type":"suffixe","className":"Inhibiteurs de PARP","examples":"olaparib; niraparib; rucaparib","domain":"Oncologie","practical":"Réparation de l’ADN","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; fatigue; anémie; thrombopénie; constipation","serious":"Syndrome myélodysplasique/LAM rare; pneumopathie; HTA (niraparib); toxicité hématologique prolongée","monitoring":"NFS; TA selon produit; fonction rénale/hépatique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-rafenib","type":"suffixe","className":"Inhibiteurs de kinases RAF apparentés","examples":"sorafénib; régorafénib","domain":"Oncologie","practical":"Sous-groupe historique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Syndrome main-pied; diarrhée; éruption; fatigue; HTA","serious":"Ischémie/événements cardiaques; hémorragie; perforation GI; hépatotoxicité; réactions cutanées sévères","monitoring":"TA; peau; foie; interactions; profil selon multikinase ciblée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-sertib","type":"suffixe","className":"Inhibiteurs de sérine/thréonine kinases","examples":"capivasertib; ipatasertib","domain":"Oncologie","practical":"Souvent AKT","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées; éruption; hyperglycémie; fatigue","serious":"Hyperglycémie sévère; diarrhée sévère; pneumopathie; hépatotoxicité","monitoring":"Glycémie; foie; peau; symptômes respiratoires","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-lisib","type":"suffixe","className":"Inhibiteurs de PI3K","examples":"alpelisib; idélalisib; copanlisib","domain":"Oncologie","practical":"PI3 kinase","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; éruption; hyperglycémie; nausées; fatigue","serious":"Colite; pneumopathie; hépatotoxicité; infections; hyperglycémie sévère","monitoring":"Glycémie; foie; diarrhée; symptômes respiratoires","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-metinib","type":"suffixe","className":"Inhibiteurs de MEK","examples":"tramétinib; cobimétinib; binimétinib","domain":"Oncologie","practical":"Voie MAPK","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Éruption; diarrhée; œdèmes; fatigue; nausées","serious":"Cardiomyopathie; atteinte oculaire; pneumopathie; hémorragie; réactions cutanées sévères","monitoring":"FEVG; symptômes visuels/respiratoires; peau","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-degib","type":"suffixe","className":"Inhibiteurs de la voie Hedgehog/SMO","examples":"vismodégib; sonidégib","domain":"Oncologie","practical":"Antinéoplasiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Spasmes musculaires; alopécie; dysgueusie; perte de poids; fatigue","serious":"Tératogénicité majeure; rhabdomyolyse/élévation CK; toxicité musculaire","monitoring":"Contraception stricte; CK si symptômes","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-platin","type":"suffixe","className":"Complexes de platine antinéoplasiques","examples":"cisplatine; carboplatine; oxaliplatine","domain":"Oncologie","practical":"Agents alkylants-like","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées/vomissements; fatigue; cytopénies; neuropathie selon composé","serious":"Néphrotoxicité/ototoxicité (cisplatine); neuropathie (oxaliplatine); myélosuppression; anaphylaxie","monitoring":"NFS; rein; électrolytes; audition/neuropathie selon composé","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-rubicine","type":"suffixe","className":"Anthracyclines antinéoplasiques","examples":"doxorubicine; daunorubicine; épirubicine","domain":"Oncologie","practical":"Inhibiteurs topoisomérase II, radicaux libres","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; alopécie; mucite; myélosuppression; coloration rouge des urines","serious":"Cardiomyopathie/insuffisance cardiaque cumulative; leucémie secondaire; nécrose en extravasation","monitoring":"Dose cumulée; FEVG; NFS; protection contre extravasation","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-taxel","type":"suffixe","className":"Taxanes stabilisant les microtubules","examples":"paclitaxel; docétaxel; cabazitaxel","domain":"Oncologie","practical":"Antimitotiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Neuropathie périphérique; myélosuppression; alopécie; arthralgies/myalgies; nausées","serious":"Réactions d’hypersensibilité; neutropénie fébrile; toxicité cardiaque rare; pneumopathie","monitoring":"NFS; neuropathie; prémédication selon produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-técan","type":"suffixe","className":"Inhibiteurs de topoisomérase I, camptothécines","examples":"irinotécan; topotécan","domain":"Oncologie","practical":"Antinéoplasiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Diarrhée; nausées/vomissements; myélosuppression; fatigue; alopécie","serious":"Diarrhée sévère/déshydratation (irinotécan); neutropénie fébrile; pneumopathie; toxicité cholinergique aiguë irinotécan","monitoring":"NFS; gestion précoce diarrhée; pharmacogénétique UGT1A1 selon contexte","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-mustine","type":"suffixe","className":"Moutardes azotées alkylantes","examples":"bendamustine; chlorambucil (exception)","domain":"Oncologie","practical":"Agents alkylants","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Nausées; fatigue; myélosuppression; éruption","serious":"Infections/hémorragie par cytopénies; cancers secondaires; infertilité; réactions cutanées sévères selon molécule","monitoring":"NFS; fertilité; fonction hépatique/rénale selon produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-bortezomib","type":"suffixe","className":"Inhibiteurs du protéasome apparentés","examples":"bortézomib; ixazomib; carfilzomib","domain":"Oncologie","practical":"Le stem utile est souvent -zomib","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Neuropathie; thrombopénie; fatigue; nausées; diarrhée/constipation","serious":"Neuropathie sévère; zona/infections; hypotension; insuffisance cardiaque; syndrome de lyse tumorale","monitoring":"NFS; neuropathie; prophylaxie antivirale selon protocole","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-zomib","type":"suffixe","className":"Inhibiteurs du protéasome","examples":"bortézomib; ixazomib","domain":"Oncologie","practical":"Antinéoplasiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Neuropathie; thrombopénie; fatigue; troubles GI","serious":"Neuropathie sévère; infections/zona; hypotension; cardiotoxicité; syndrome de lyse tumorale","monitoring":"NFS; neuropathie; prophylaxie antivirale selon protocole","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-drostat","type":"suffixe","className":"Inhibiteurs de synthèse de l’aldostérone/cortisol","examples":"osilodrostat; baxdrostat; lorundrostat","domain":"Endocrinologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Fatigue; céphalées; nausées; œdèmes; déséquilibres hormonaux/électrolytiques selon cible","serious":"Insuffisance surrénalienne; QT ou troubles électrolytiques selon molécule; effets endocriniens excessifs","monitoring":"Stem récent et hétérogène; cortisol/aldostérone, électrolytes, TA selon indication","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-relin","type":"suffixe","className":"Analogues/agonistes de la GnRH","examples":"goséréline; leuproréline; triptoréline","domain":"Endocrinologie","practical":"Formes françaises variables","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bouffées de chaleur; sueurs; céphalées; baisse libido; réactions injection","serious":"Perte osseuse; allongement QT; poussée tumorale initiale avec agonistes; troubles métaboliques","monitoring":"Densité osseuse si long cours; hormones; stratégie anti-flare en oncologie","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-relix","type":"suffixe","className":"Antagonistes de la GnRH","examples":"dégarélix; ganirélix; cetrorelix","domain":"Endocrinologie","practical":"Suppression gonadotrope","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bouffées de chaleur; céphalées; réactions au site; baisse libido","serious":"Réactions allergiques; perte osseuse; troubles hépatiques rares; syndrome d’hyperstimulation ovarienne dans certains contextes","monitoring":"Indication déterminante; hormones et grossesse","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-gestrel","type":"suffixe","className":"Progestatifs","examples":"lévonorgestrel; désogestrel; norgestrel","domain":"Gynécologie","practical":"Contraception","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Saignements irréguliers; céphalées; acné; nausées; modifications humeur","serious":"Thrombose surtout si combiné avec œstrogène; grossesse ectopique rare si échec; kystes ovariens selon dispositif","monitoring":"Risque dépend fortement de la voie et association œstrogénique","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-estrant","type":"suffixe","className":"Antagonistes/dégradeurs du récepteur des œstrogènes","examples":"fulvestrant; élacestrant","domain":"Oncologie/Gynécologie","practical":"SERD","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bouffées de chaleur; nausées; fatigue; douleurs musculosquelettiques","serious":"Hépatotoxicité; hémorragie au site IM pour fulvestrant; anomalies lipidiques/QT selon molécule","monitoring":"Foie; interactions; profil spécifique au SERD","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-oxifène","type":"suffixe","className":"Modulateurs sélectifs du récepteur des œstrogènes","examples":"tamoxifène; raloxifène","domain":"Oncologie/Gynécologie","practical":"SERM","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Bouffées de chaleur; crampes; pertes vaginales; nausées","serious":"Thromboembolie; cancer de l’endomètre (tamoxifène); AVC; cataracte","monitoring":"Risque thrombotique; symptômes gynécologiques; bénéfices/risques diffèrent selon SERM","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-asteride","type":"suffixe","className":"Inhibiteurs de la 5-alpha-réductase","examples":"finastéride; dutastéride","domain":"Urologie","practical":"HBP, alopécie","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Baisse libido; dysfonction érectile; troubles éjaculation; baisse volume sperme","serious":"Dépression/idées suicidaires signalées; infertilité réversible; réactions d’hypersensibilité","monitoring":"PSA diminué sous traitement; grossesse: éviter exposition aux comprimés écrasés chez femmes enceintes","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-osin","type":"suffixe","className":"Antagonistes alpha-1 utilisés en urologie","examples":"tamsulosine; alfuzosine","domain":"Urologie","practical":"Motif voisin de -zosine","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Vertiges; hypotension orthostatique; troubles de l’éjaculation; congestion nasale","serious":"Syncope; priapisme rare; syndrome de l’iris flasque peropératoire","monitoring":"Prévenir ophtalmologiste avant chirurgie cataracte; TA","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-olamide","type":"suffixe","className":"Inhibiteurs de l’anhydrase carbonique ophtalmiques","examples":"dorzolamide; brinzolamide","domain":"Ophtalmologie","practical":"Glaucome","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Picotements/brûlure oculaire; goût amer; vision trouble","serious":"Réactions d’hypersensibilité/sulfonamide; kératite; déséquilibre acido-basique rare si absorption systémique","monitoring":"Effets surtout locaux; prudence insuffisance rénale sévère","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-caftor","type":"suffixe","className":"Modulateurs de CFTR","examples":"ivacaftor; tezacaftor; elexacaftor","domain":"Pneumologie/Génétique","practical":"Mucoviscidose","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Céphalées; infections respiratoires; douleur abdominale; diarrhée; éruption","serious":"Élévation transaminases/atteinte hépatique; cataracte pédiatrique; interactions CYP3A; réactions d’hypersensibilité","monitoring":"Bilan hépatique; examen ophtalmo pédiatrique; interactions","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ersen","type":"suffixe","className":"Oligonucléotides antisens","examples":"nusinersen; inotersen; volanesorsen","domain":"Génétique/Neurologie","practical":"Thérapies à acides nucléiques","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Réactions au site/injection; céphalées; symptômes pseudo-grippaux; thrombopénie selon produit","serious":"Thrombopénie sévère; glomérulonéphrite/atteinte rénale; neurotoxicité selon voie intrathécale","monitoring":"NFS/plaquettes, rein; profil très spécifique à l’oligonucléotide","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-vovec","type":"suffixe","className":"Vecteurs de thérapie génique à virus adéno-associé","examples":"voretigene neparvovec; onasemnogene abeparvovec","domain":"Thérapie génique","practical":"Ancien schéma de dénomination génique","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fièvre; vomissements; élévation transaminases; réactions immunes","serious":"Hépatotoxicité aiguë; thrombopénie/microangiopathie thrombotique; myocardite/neurotoxicité selon produit; réponse immune au vecteur","monitoring":"Thérapie génique: surveillance spécialisée prolongée et spécifique au produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-cel","type":"suffixe","className":"Produits de thérapie cellulaire","examples":"divers produits cellulaires INN","domain":"Thérapies avancées","practical":"Stem générique; nomenclature spécialisée","stemSource":"https://www.who.int/publications/i/item/9789240099388","frequent":"Fièvre; fatigue; réactions à l’administration; cytopénies/infections selon produit","serious":"Syndrome de relargage cytokinique; neurotoxicité; infections graves; cytopénies prolongées; malignités secondaires possibles selon thérapie","monitoring":"Stem très large; thérapies cellulaires nécessitent surveillance spécialisée","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-turev","type":"suffixe","className":"Virus oncolytiques dans le schéma des thérapies avancées","examples":"canerpaturev; lerapolturev","domain":"Thérapies avancées/Oncologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Fièvre; frissons; fatigue; symptômes pseudo-grippaux; réactions au site","serious":"Infection virale disséminée chez immunodéprimé; inflammation/tumor flare; toxicités spécifiques du vecteur","monitoring":"Stem récent; mesures de biosécurité et profil propres au virus","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-ampator","type":"suffixe","className":"Modulateurs des récepteurs AMPA","examples":"farampator; mibampator; tulrampator","domain":"Neurologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Céphalées; vertiges; nausées; insomnie/excitation possibles","serious":"Convulsions, agitation ou neurotoxicité théoriquement possibles selon modulation AMPA","monitoring":"Stem récent/expérimental: données humaines limitées, pas de profil de classe robuste","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-cirnon","type":"suffixe","className":"Antagonistes des récepteurs CCR des chimiokines","examples":"vercirnon; zelnecirnon","domain":"Immunologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Effets GI; céphalées; infections possibles selon modulation immunitaire","serious":"Toxicités immunologiques/hépatiques possibles; données limitées","monitoring":"Stem récent: effets à vérifier molécule par molécule","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-protafib","type":"suffixe","className":"Inhibiteurs des protéines tyrosine phosphatases","examples":"razuprotafib; vociprotafib","domain":"Oncologie/Immunologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Fatigue; troubles GI; effets liés à la cible possibles","serious":"Toxicités hématologiques, vasculaires ou immunologiques possibles selon cible; données limitées","monitoring":"Stem récent/peu de recul: pas de profil de classe établi","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."},{"stem":"-rogant","type":"suffixe","className":"Antagonistes/agonistes inverses de RORγ","examples":"cedirogant; vimirogant","domain":"Immunologie","practical":"Stem OMS récent","stemSource":"https://www.who.int/publications/m/item/inn-26-638","frequent":"Céphalées; troubles GI; infections respiratoires possibles","serious":"Toxicité hépatique, immunologique ou lipidique possible selon molécule; données limitées","monitoring":"Stem récent: pas de profil de classe robuste, se référer au produit","safetySource":"https://dailymed.nlm.nih.gov/dailymed/","sourceRemark":"Label/référence générale; vérifier le RCP/notice de la molécule exacte."}];
function pvNorm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[®™]/g,'').replace(/[^a-z0-9+\- ]+/g,' ').replace(/\s+/g,' ').trim()}
function pvTokensForMedicine(p,seed){return [seed?.active,p?.name,p?.information].filter(Boolean).map(pvNorm).join(' ; ')}
function stemAlternatives(stem){return String(stem||'').split('/').map(x=>pvNorm(x).trim()).filter(Boolean)}
function stemMatchesToken(alt,type,text){
 const clean=alt.replace(/^[-+]+|[-+]+$/g,'');if(!clean)return false;
 const words=text.split(/[^a-z0-9]+/).filter(Boolean);
 if(type==='préfixe')return words.some(w=>w.startsWith(clean));
 return words.some(w=>w.endsWith(clean));
}
function pharmacovigilanceFamiliesFor(p,seed){
 const text=pvTokensForMedicine(p,seed);
 return PHARMACOVIGILANCE_FAMILIES.filter(f=>stemAlternatives(f.stem).some(a=>stemMatchesToken(a,f.type,text)));
}
function familySummary(f){
 const parts=[];if(f.frequent)parts.push('Effets fréquents / typiques : '+f.frequent+'.');if(f.serious)parts.push('Effets rares ou graves à connaître : '+f.serious+'.');
 return parts.join(' ')||"Pas d'informations disponibles.";
}
function recognizedFamilyGroup(p,seed){
 const matches=pharmacovigilanceFamiliesFor(p,seed);if(!matches.length)return seed?.recognized||null;
 return {summary:matches.map(f=>`${f.className||f.stem} : ${familySummary(f)}`).join(' '),sources:matches.map(f=>({
  name:`${f.className||'Famille pharmacologique'} (${f.stem})`,
  meta:`Information générale de classe · ${f.domain||'pharmacovigilance'}`,
  detail:[f.frequent?`Effets fréquents / typiques : ${f.frequent}`:null,f.serious?`Effets rares ou graves à connaître : ${f.serious}`:null,f.monitoring?`Surveillance / points de vigilance : ${f.monitoring}`:null,f.sourceRemark?`Remarque de la source : ${f.sourceRemark}`:null,'Cette information concerne la famille pharmacologique et ne remplace pas la notice/RCP de la molécule exacte.'].filter(Boolean).join('\n\n'),
  url:f.safetySource||null
 }))};
}

function compendiumKey(name){
 return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[®™]/g,'').replace(/\s+/g,' ').trim()
  .replace(/\s+\d+(?:[.,]\d+)?\s*mg.*$/,'')
  .replace(/\s+\d+(?:[.,]\d+)?\s*u\/ml.*$/,'')
  .replace(/\s+\d+(?:[.,]\d+)?\s*e\/u\/ml.*$/,'');
}
function compendiumSeedFor(p){
 const k=compendiumKey(p?.name);
 if(COMPENDIUM_SEED[k])return COMPENDIUM_SEED[k];
 const aliases=[
  ['rosuvastatin-mepha','rosuvastatin-mepha'],
  ['xigduo xr','xigduo xr'],
  ['dafalgan dolo','dafalgan dolo'],
  ['dafalgan','dafalgan'],
  ['prednison spirig hc','prednisone spirig hc'],
  ['prednisone spirig hc','prednisone spirig hc'],
  ['perindopril- indapamid-mepha','perindopril- indapamid-mepha'],
  ['perindopril-indapamid-mepha','perindopril- indapamid-mepha'],
  ['irfen','irfen ibuprofenum']
 ];
 for(const [prefix,target] of aliases)if(k.startsWith(prefix))return COMPENDIUM_SEED[target];
 return null;
}
function isCompendiumMedication(p){
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const raw=norm(p?.serviceType);
 if(raw.includes('produit / accessoire'))return false;
 if(raw&&raw.includes('medicament'))return true;
 if(compendiumSeedFor(p))return true;
 if((p?.itemType||'product')==='product'&&!raw){
  const text=norm((p?.name||'')+' '+(p?.information||''));
  if(/tegaderm|lancette|microlet|novofine|aiguille|bandelette|contour next|compresse|pansement/.test(text))return false;
  return true;
 }
 return false;
}
function compendiumMedicines(){
 return [...(db.pharmacy||[])].filter(isCompendiumMedication).sort((a,b)=>alpha(a.name,b.name));
}
function pvEmpty(){return "<div class=\"pv-empty\">Pas d'informations disponibles.</div>"}
function pvGroup(group){
 if(!group)return pvEmpty();
 const sources=Array.isArray(group.sources)?group.sources:[];
 const srcHtml=sources.length?`<div class="pv-sources">${sources.map((s,i)=>{
   const more=!!(s.detail||s.url);
   return `<div class="pv-source-row"><div><strong>${esc(s.name||'Source')}</strong>${s.meta?`<div class="muted">${esc(s.meta)}</div>`:''}</div>${more?`<button class="secondary pv-more" onclick="openPvSource('${currentPvMedicineId}', '${escAttr(s._group||'')}', ${i})">Voir plus</button>`:''}</div>`;
 }).join('')}</div>`:'';
 return `<div class="pv-summary">${esc(group.summary||"Pas d'informations disponibles.")}</div>${srcHtml}`;
}
let currentPvMedicineId=null;
function escAttr(s){return String(s||'').replace(/'/g,"&#39;").replace(/"/g,"&quot;")}
function pvGroupByKey(seed,key){
 const g=seed?.[key];
 if(!g)return null;
 return {summary:g.summary,sources:(g.sources||[]).map(x=>({...x,_group:key}))};
}
function openPvSource(id,key,index){
 const p=pharmacyItem(id);if(!p)return;
 const seed=compendiumSeedFor(p);let src=null;if(key==='family')src=recognizedFamilyGroup(p,seed)?.sources?.[index];else src=seed?.[key]?.sources?.[index];
 if(!src)return;
 document.getElementById('pvSourceTitle').textContent=src.name||'Source';
 document.getElementById('pvSourceMeta').textContent=src.meta||'';
 document.getElementById('pvSourceBody').innerHTML=`${src.detail?`<div class="pv-source-detail">${esc(src.detail)}</div>`:''}${src.url?`<div class="top-gap"><a class="secondary link-button" href="${esc(src.url)}" target="_blank" rel="noopener">Ouvrir la source en français</a></div>`:''}`;
 openModal('pvSourceModal');
}
function renderCompendium(){
 const box=document.getElementById('compendiumList'),q=(document.getElementById('compendiumSearch')?.value||'').trim().toLowerCase();
 if(!box)return;
 const allMeds=compendiumMedicines();
 const meds=allMeds.filter(p=>{
   const seed=compendiumSeedFor(p),families=pharmacovigilanceFamiliesFor(p,seed),hay=[p.name,p.strength,p.information,seed?.active,seed?.indication,...families.map(f=>f.className+' '+f.stem+' '+f.examples)].filter(Boolean).join(' ').toLowerCase();
   return !q||hay.includes(q);
 });
 const subtitle=document.querySelector('#compendium .title-row .muted');
 const informed=allMeds.filter(p=>{const s=compendiumSeedFor(p),f=pharmacovigilanceFamiliesFor(p,s);return !!(s?.active||s?.indication||f.length)});
 if(subtitle)subtitle.textContent=`Base documentaire · ${allMeds.length} médicament(s) trouvé(s) dans Pharmacie.`;
 const summary=document.getElementById('compendiumSummary');
 if(summary)summary.innerHTML=`<span class="compendium-count">${informed.length} médicament(s) renseigné(s)</span><span class="muted">sur ${allMeds.length} dans la Pharmacie · liste simplifiée ci-dessous</span>`;
 box.innerHTML=meds.length?meds.map(p=>{
   const seed=compendiumSeedFor(p);
   const families=pharmacovigilanceFamiliesFor(p,seed);const descriptor=seed?.active||families.map(f=>f.className).join(' · ')||'Principe actif : pas encore renseigné';return `<div class="card compact-card compendium-row"><div><strong>${esc(p.name)}</strong>${p.strength?` <span class="muted">${esc(p.strength)}</span>`:''}<div class="muted">${esc(descriptor)}</div></div><div class="actions"><button class="secondary icon-btn" onclick="openCompendium('${p.id}')">Voir</button></div></div>`;
 }).join(''):'<div class="card compact-card">Aucun médicament correspondant.</div>';
}
function openCompendium(id){
 const p=pharmacyItem(id);if(!p)return;
 const seed=compendiumSeedFor(p),families=pharmacovigilanceFamiliesFor(p,seed);
 document.getElementById('compendiumDetailTitle').textContent=p.name||'Médicament';
 document.getElementById('compendiumDetailSubtitle').textContent=p.strength||'';
 const rows=[
   ['Type',p.serviceType||'Médicament'],
   ['Principe actif',seed?.active||"Pas d'informations disponibles."],
   ['Famille(s)',families.length?families.map(f=>`${f.className} (${f.stem})`).join(' · '):"Pas d'informations disponibles."],
   ['Pourquoi est-il prescrit ?',seed?.indication||families.map(f=>f.practical).filter(Boolean).join(' · ')||"Pas d'informations disponibles."],
   ['Source médicament','Swissmedic / SwissmedicInfo'],
   ['Version documentaire',COMPENDIUM_VERSION]
 ];
 document.getElementById('compendiumDetailBody').innerHTML=`
   <div class="treatment-view-grid">
     ${rows.map(([k,v])=>`<div class="treatment-view-row"><div class="treatment-view-label">${esc(k)}</div><div class="treatment-view-value">${esc(v)}</div></div>`).join('')}
   </div>
   <div class="actions top-gap"><button class="primary" onclick="closeModal('compendiumDetailModal');openPharmacovigilance('${p.id}')">Pharmacovigilance</button></div>`;
 openModal('compendiumDetailModal');
}
function openPharmacovigilance(id){
 const p=pharmacyItem(id);if(!p)return;
 const seed=compendiumSeedFor(p);
 document.getElementById('pharmacovigilanceTitle').textContent='Pharmacovigilance — '+(p.name||'Médicament');
 document.getElementById('pharmacovigilanceSubtitle').textContent=p.strength||'';
 currentPvMedicineId=id;
 document.getElementById('pvOfficial').innerHTML=pvGroup(pvGroupByKey(seed,'official'));
 const recognized=recognizedFamilyGroup(p,seed);document.getElementById('pvRecognized').innerHTML=pvGroup(recognized?{summary:recognized.summary,sources:(recognized.sources||[]).map(x=>({...x,_group:'family'}))}:null);
 document.getElementById('pvUnverified').innerHTML=pvGroup(pvGroupByKey(seed,'unverified'));
 document.getElementById('pvSubmitNotice').classList.add('hidden');
 openModal('pharmacovigilanceModal');
}
const compSearch=document.getElementById('compendiumSearch');
if(compSearch)compSearch.oninput=renderCompendium;
const pvSubmitInfo=document.getElementById('pvSubmitInfo');
if(pvSubmitInfo)pvSubmitInfo.onclick=()=>document.getElementById('pvSubmitNotice').classList.toggle('hidden');

function renderAll(){renderTreatments();renderMeasures();renderTodayAlerts();renderToday();renderPharmacy();renderPrescriptions();renderContacts();reportMedicationOptions();reportContactOptions();reportPharmacyOptionsFill();renderSavedReports();renderCompendium()}

const backupTransferStatus=document.getElementById('backupTransferStatus');
const lastDeviceAction=document.getElementById('lastDeviceAction');
const LAST_DEVICE_ACTION_KEY='ma-sante-last-device-action';
function renderLastDeviceAction(){
 const value=localStorage.getItem(LAST_DEVICE_ACTION_KEY);
 if(lastDeviceAction)lastDeviceAction.textContent=value?`Dernière action : ${value}`:'';
}
function rememberLastDeviceAction(kind,filename){
 if(!filename)return;
 localStorage.setItem(LAST_DEVICE_ACTION_KEY,`${kind} ${filename}`);
 renderLastDeviceAction();
}
renderLastDeviceAction();


function backupDeviceLabel(){
 const ua=navigator.userAgent||'';
 if(/Android|iPhone|iPad|Mobile/i.test(ua))return 'Smartphone';
 if(/Windows/i.test(ua))return 'Notebook';
 return 'Appareil';
}
function buildBackupPayload(){
 return {
  app:'Ma Santé',
  version:'0.2.4.8',
  exportedAt:new Date().toISOString(),
  exportedLocal:new Date().toLocaleString('fr-CH'),
  device:backupDeviceLabel(),
  schemaVersion:db.schemaVersion||null,
  data:db
 };
}
function buildBackupFile(){
 const payload=buildBackupPayload();
 const filename=`Ma-Sante_${backupStamp()}.habak`;
 const text=JSON.stringify(payload,null,2);
 return {payload,filename,text,file:new File([text],filename,{type:'application/json'})};
}
function setBackupStatus(text){if(backupTransferStatus)backupTransferStatus.textContent=text}
function backupStamp(d=new Date()){
 const p=n=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}
exportBtn.onclick=async()=>{
 const b=buildBackupFile();
 if(typeof window.showSaveFilePicker==='function'){
  try{
   const handle=await window.showSaveFilePicker({
    suggestedName:b.filename,
    types:[{description:'Sauvegarde Ma Santé',accept:{'application/json':['.habak']}}]
   });
   const writable=await handle.createWritable();
   await writable.write(b.text);
   await writable.close();
   setBackupStatus(`Sauvegarde exportée : ${b.filename} · ${b.payload.device} · ${b.payload.exportedLocal}`);
   rememberLastDeviceAction('Export',b.filename);
   return;
  }catch(e){
   if(e?.name==='AbortError'){
    setBackupStatus('Export annulé.');
    return;
   }
   console.warn('Enregistrer sous indisponible, repli sur téléchargement',e);
  }
 }
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([b.text],{type:'application/json'}));
 a.download=b.filename;
 a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 setBackupStatus(`Sauvegarde exportée dans les téléchargements : ${b.filename} · ${b.payload.device} · ${b.payload.exportedLocal}`);
 rememberLastDeviceAction('Export',b.filename);
};
importFile.onchange=async e=>{
 const f=e.target.files?.[0];
 if(!f)return;
 try{
  const obj=JSON.parse(await f.text());
  const incoming=migrate(obj.data||obj);
  const fromDevice=obj.device||'appareil inconnu';
  const when=obj.exportedLocal||(obj.exportedAt?new Date(obj.exportedAt).toLocaleString('fr-CH'):'date inconnue');
  const counts=[
   `${(incoming.treatments||[]).length} traitement(s)`,
   `${(incoming.pharmacy||[]).length} article(s) Pharmacie`,
   `${(incoming.history||[]).length} prise(s) historique`,
   `${(incoming.contacts||[]).length} contact(s)`,
   `${(incoming.prescriptions||[]).length} ordonnance(s)`
  ].join(' · ');
  const ok=confirm(`Importer ${f.name} ?\n\nOrigine : ${fromDevice}\nSauvegarde : ${when}\n${counts}\n\nLes données locales seront remplacées après confirmation.`);
  if(!ok){e.target.value='';return}
  // Safety snapshot in memory/IndexedDB before replacement.
  try{await idbWrite(JSON.stringify(db))}catch(_){}
  db=incoming;
  save();renderAll();
  setBackupStatus(`Import terminé : ${f.name} · origine ${fromDevice} · ${when}`);
  rememberLastDeviceAction('Import',f.name);
  alert('Import terminé avec succès.');
 }catch(err){
  console.error(err);
  alert('Sauvegarde non reconnue ou illisible.');
 }finally{
  e.target.value='';
 }
};
resetTreatment();resetMeasure();resetPharmacy();resetPrescription();bindReportShortcuts();reportDefaultDates();reportTypeUI();renderAll();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
bootstrapExtendedStorage();

// v0.2.2.4 — rapports mensuels compacts en paysage
const importTomHistoryFile=document.getElementById('importTomHistoryFile');
if(importTomHistoryFile)importTomHistoryFile.onchange=async e=>{
 try{
  const obj=JSON.parse(await e.target.files[0].text());
  if(obj.format!=='ma-sante-historical-import'||!Array.isArray(obj.medicationHistory)||!Array.isArray(obj.measureHistory))throw Error('format');
  const medSeen=new Set((db.history||[]).map(h=>[h.date,h.time,h.name,Number(h.qty),h.kind||'planned'].join('|')));
  const measureSeen=new Set((db.measureHistory||[]).map(h=>[h.date,h.time,h.type,Number(h.value),h.unit||''].join('|')));
  let medAdded=0,measureAdded=0,takesLinked=0;
  for(const h of obj.medicationHistory){
   const sig=[h.date,h.time,h.name,Number(h.qty),h.kind||'planned'].join('|');
   if(medSeen.has(sig))continue;
   const rec={id:uid(),eventKey:h.eventKey||('tom-'+uid()),kind:h.kind==='prn'?'prn':'planned',date:h.date,time:h.time,name:h.name,strength:h.strength||'',qty:Number(h.qty||0),unit:h.unit||'',note:'Importé de TOM-Medications'};
   db.history.push(rec);medSeen.add(sig);medAdded++;
   // Si le traitement existe encore, relier la prise planifiée à son créneau Ma Santé.
   if(rec.kind==='planned'&&h.plannedTime){
    const t=(db.treatments||[]).find(t=>{const p=getTreatmentProduct(t);return p&&p.name===h.name});
    if(t){const key=`${h.date}|${t.id}|${h.plannedTime}`;if(!db.takes[key]){db.takes[key]={qty:rec.qty,unit:rec.unit,actualDate:h.date,time:h.time,note:'Importé de TOM-Medications'};rec.eventKey=key;takesLinked++}}
   }
  }
  for(const h of obj.measureHistory){
   const sig=[h.date,h.time,h.type,Number(h.value),h.unit||''].join('|');
   if(measureSeen.has(sig))continue;
   db.measureHistory.push({id:uid(),date:h.date,time:h.time,type:h.type||'Poids',value:Number(h.value),unit:h.unit||'kg',note:'Importé de TOM-Medications'});measureSeen.add(sig);measureAdded++;
  }
  save();alert(`Historique TOM fusionné : ${medAdded} prises et ${measureAdded} mesures ajoutées.${takesLinked?` ${takesLinked} prises ont aussi été reliées aux traitements actuels.`:''}`);
 }catch(err){console.error(err);alert('Fichier historique TOM non reconnu.')}
 finally{e.target.value=''}
};
