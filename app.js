const storeKey='agrawal-tree-v4';
const authKey='agrawal-admin-auth-v1';
const fixedAdminHash='2c9788a3bf817af1e21f4e700ee78b169355850b0aef084a695e2dade8a51e2c';
localStorage.setItem('agrawal-admin-hash',fixedAdminHash);
let state=JSON.parse(localStorage.getItem(storeKey)||'{}');
let edit=false;
let page=Number(location.hash.replace('#page-',''))||1;

function save(){localStorage.setItem(storeKey,JSON.stringify(state));}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function isAdmin(){return sessionStorage.getItem(authKey)==='1';}
function photoFor(x){return state.clearedPhotos?.[x.id]?'':(state.photos?.[x.id]||x.photo||'');}
function nameFor(x){return state.names?.[x.id] ?? x.name ?? ''; }
function logoFor(){return state.logo||'';}
function logoMarkup(extra=''){const src=logoFor();return src?`<img src="${src}" alt="सिहंल परिवार लोगो" class="siteLogoImage ${extra}">`:'<span class="siteLogoText">श्री</span>';}
function roleFor(x){return state.roles?.[x.id] ?? x.role ?? ''; }
function relationFor(x){return state.relations?.[x.id] ?? x.relation ?? ''; }
function pageEditsFor(n){return state.pageEdits?.[n]||{};}
function customMembersFor(n){return state.members?.[n]||[];}
function customPage(n){return state.customPages?.[n]||null;}
function isCustomPage(n){return !!state.customPages?.[n];}
function isMemberDeleted(id){return !!state.deletedMembers?.[id];}
function visible(list){return (list||[]).filter(x=>!isMemberDeleted(x.id));}
function pageData(n){
  const base=customPage(n)||FAMILY.pages[n]||FAMILY.pages[1];
  const overrides=pageEditsFor(n);
  const merged={...base,...overrides};
  if(merged.welcome)return merged;
  return {
    ...merged,
    parents:visible(base.parents),
    children:visible([...(base.children||[]),...customMembersFor(n)]),
    side:visible(base.side),
    loose:visible(base.loose)
  };
}
function branchTarget(x){
  if(Object.prototype.hasOwnProperty.call(state.links||{},x.id)) return state.links[x.id];
  return x.to || state.familyPages?.[x.id] || null;
}

function allKnownPages(){
 const pages={};
 for(const key of Object.keys(FAMILY.pages||{})) pages[key]=FAMILY.pages[key].title||`पेज ${key}`;
 for(const key of Object.keys(state.customPages||{})) pages[key]=state.customPages[key]?.title||`पेज ${key}`;
 return Object.entries(pages).sort((a,b)=>Number(a[0])-Number(b[0]));
}
function openPersonEditor(id){
 if(!isAdmin()){openAuth();return;}
 const p=findPersonEverywhere(id);
 if(!p)return;
 document.getElementById('personEditId').value=id;
 document.getElementById('personEditName').value=nameFor(p);
 document.getElementById('personEditRole').value=roleFor(p);
 document.getElementById('personEditRelation').value=relationFor(p);
 const link=document.getElementById('personEditLink');
 link.innerHTML='<option value="">कोई परिवार पेज लिंक नहीं</option>' + allKnownPages().map(([n,t])=>`<option value="${esc(n)}">${esc(n)} — ${esc(t)}</option>`).join('');
 const target=branchTarget(p);
 link.value=target==null?'':String(target);
 document.getElementById('personEditModal').classList.remove('hidden');
 setTimeout(()=>document.getElementById('personEditName').focus(),40);
}
function closePersonEditor(){document.getElementById('personEditModal').classList.add('hidden')}
function replaceInText(text, oldText, newText){
 if(!text || !oldText || oldText===newText) return text;
 return String(text).split(oldText).join(newText);
}
function syncPersonNameAcrossPageTitles(oldName,newName){
 if(!oldName || oldName===newName)return;
 state.pageEdits=state.pageEdits||{};
 const keys=[...Object.keys(FAMILY.pages||{}),...Object.keys(state.customPages||{})];
 for(const key of keys){
   const n=Number(key);
   if(n===1)continue;
   const base=state.customPages?.[key]||FAMILY.pages?.[key];
   if(!base?.title)continue;
   const existing=state.pageEdits[n];
   const current=existing?.title ?? base.title;
   if(current.includes(oldName)){
     state.pageEdits[n]={...(existing||{}),title:replaceInText(current,oldName,newName)};
   }
 }
}
function savePersonEditor(e){
 e.preventDefault();
 if(!isAdmin()){closePersonEditor();openAuth();return;}
 const id=document.getElementById('personEditId').value;
 const p=findPersonEverywhere(id);
 if(!p){showToast('सदस्य नहीं मिला');return;}
 const oldName=nameFor(p);
 const name=document.getElementById('personEditName').value.trim();
 const role=document.getElementById('personEditRole').value.trim();
 const relation=document.getElementById('personEditRelation').value.trim();
 const linkValue=document.getElementById('personEditLink').value;
 if(!name){showToast('नाम खाली नहीं हो सकता');return;}
 state.names=state.names||{}; state.roles=state.roles||{}; state.relations=state.relations||{}; state.links=state.links||{};
 state.names[id]=name;
 state.roles[id]=role;
 state.relations[id]=relation;
 state.links[id]=linkValue?Number(linkValue):null;
 syncPersonNameAcrossPageTitles(oldName,name);
 save();closePersonEditor();render();showToast('सदस्य की जानकारी हर संबंधित पेज पर अपडेट हो गई');
}
function editMemberName(id){ openPersonEditor(id); }

function openPageEditor(){
 if(!isAdmin()){openAuth();return;}
 const d=pageData(page);
 document.getElementById('pageEditNumber').value=page;
 document.getElementById('pageEditTitle').value=d.title||'';
 document.getElementById('pageEditKicker').value=d.kicker||'';
 document.getElementById('pageEditSubtitle').value=d.subtitle||'';
 document.getElementById('pageEditModal').classList.remove('hidden');
 setTimeout(()=>document.getElementById('pageEditTitle').focus(),40);
}
function closePageEditor(){document.getElementById('pageEditModal').classList.add('hidden')}
function savePageEditor(e){
 e.preventDefault();
 if(!isAdmin()){closePageEditor();openAuth();return;}
 const n=Number(document.getElementById('pageEditNumber').value);
 state.pageEdits=state.pageEdits||{};
 state.pageEdits[n]={
   title:document.getElementById('pageEditTitle').value.trim(),
   kicker:document.getElementById('pageEditKicker').value.trim(),
   subtitle:document.getElementById('pageEditSubtitle').value.trim()
 };
 save();closePageEditor();render();showToast('पेज की जानकारी अपडेट हो गई');
}

function safeId(id){return String(id??'').replace(/'/g,"\\'");}
function person(x,extra=''){
 const image=photoFor(x);
 const displayName=nameFor(x);
 const role=roleFor(x);
 const relation=relationFor(x);
 const target=branchTarget(x);
 const click=target?`onclick=\"go(${target})\" role=\"button\" tabindex=\"0\"`:' ';
 const remove=edit?`<button class=\"removeMember\" title=\"सदस्य हटाएँ\" onclick=\"event.stopPropagation();removeMember('${safeId(x.id)}')\">×</button>`:'';
 const editName=edit?`<button class=\"editName\" type=\"button\" title=\"जानकारी बदलें\" onclick=\"event.stopPropagation();editMemberName('${safeId(x.id)}')\">✎</button>`:'';
 return `<article class=\"person ${target?'linked':''} ${extra}\" ${click}>
   ${remove}
   <div class=\"portrait\">${image?`<img src=\"${image}\" alt=\"${esc(displayName)}\">`:`<div class=\"placeholder\"><strong>श्री</strong><span>PHOTO</span></div>`}${edit?`<div class=\"photoTools\"><label class=\"upload\" title=\"फोटो बदलें\">＋<input type=\"file\" accept=\"image/*\" onchange=\"upload('${safeId(x.id)}',this.files[0])\"></label>${image?`<button class=\"removeImage\" type=\"button\" title=\"फोटो हटाएँ\" onclick=\"event.stopPropagation();removeImage('${safeId(x.id)}')\">×</button>`:''}</div>`:''}</div>
   <div class=\"personText\"><h3>${esc(displayName)} ${editName}</h3>${role?`<p>${esc(role)}</p>`:''}${relation?`<div class=\"relationText\">${esc(relation)}</div>`:''}${target?'<small>परिवार देखें  →</small>':''}</div>
 </article>`;
}

function render(){
 const data=pageData(page);
 document.getElementById('crumb').textContent='FAMILY TREE';
 const adminBtn=document.getElementById('editBtn');
 adminBtn.textContent=isAdmin()?'🔓 Admin':'🔒 Admin';
 if(data.welcome){
  document.getElementById('app').innerHTML=`<section class="cover"><div class="coverInner"><div class="motif">✦</div><div class="largeSeal">${logoMarkup()}</div><div class="english">AGRAWAL FAMILY</div><h1>${esc(data.title||'सिहंल परिवार')}</h1><div class="rule"><span></span><b>❧</b><span></span></div><p>${esc(data.subtitle)}</p><button class="enter" onclick="go(${data.next})">FAMILY TREE <b>→</b></button><div class="coverMeta">A DIGITAL FAMILY ARCHIVE</div>${edit?`<div class="editPanel coverAdmin"><div><b>Admin mode सक्रिय</b><span>मुख्य पेज की जानकारी और लोगो संपादित करें।</span></div><div class="adminActions"><button class="goldBtn" onclick="openPageEditor()">✎ पेज जानकारी</button><button class="ghostBtn" onclick="openLogoModal()">◉ मुख्य लोगो</button><button class="ghostBtn" onclick="logoutAdmin()">🔒 लॉक</button></div></div>`:''}</div></section>`;
  return;
 }
 const parents=data.parents||[];
 const children=data.children||[];
 const side=data.side||[];
 const loose=data.loose||[];
 document.getElementById('app').innerHTML=`<section class="treePage page-${page}">
  <div class="pageHead"><button class="back" onclick="go(${prevPage(page)})">← वापस</button><div><span>${esc(data.kicker||'परिवार की शाखा')}</span><h1>${esc(data.title)}</h1></div><div class="pageNoPlaceholder"></div></div>
  <div class="treeCanvas ${children.length>6?'wide':''}">
   ${parents.length?`<div class="parents">${parents.map(x=>person(x)).join('')}</div>`:''}
   ${children.length?renderChildrenTree(children):''}
   ${loose.length?`<div class="looseBranch ${loose.length===3?'three-up':''}">${loose.map(x=>person(x)).join('')}</div>`:''}
   ${side.length?`<div class="sideFamily"><div class="sideTitle">परिवार</div>${side.map(x=>person(x)).join('')}</div>`:''}
  </div>
  ${edit?`<div class="editPanel"><div><b>Admin mode सक्रिय</b><span>फोटो बदलें, नए सदस्य जोड़ें, नई पति/पत्नी शाखा बनाएं या हटाएँ।</span></div><div class="adminActions"><button class="goldBtn" onclick="openModal()">＋ सदस्य जोड़ें</button><button class="ghostBtn" onclick="openPageEditor()">✎ पेज जानकारी</button><button class="ghostBtn" onclick="openLogoModal()">◉ मुख्य लोगो</button>${isCustomPage(page)?`<button class="dangerBtn" onclick="deleteCurrentPage()">🗑️ यह पेज हटाएँ</button>`:''}<button class="ghostBtn" onclick="logoutAdmin()">🔒 लॉक</button></div></div>`:''}
 </section>`;
}

function childColumns(count){
 if(count<=1)return 1;
 if(count===2)return 2;
 if(count<=6)return 3;
 if(count>=9)return 5;
 return 4;
}
function renderChildrenTree(children){
 const cols=childColumns(children.length);
 return `<div class="childrenGrid ${children.length===3?'three-up':''} ${children.length===1?'one-up':''} ${children.length===2?'two-up':''}" style="--cols:${cols}">${children.map(x=>person(x)).join('')}</div>`;
}

function prevPage(n){
 const customBack=state.pageBack?.[n];
 if(customBack)return customBack;
 const m={2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:7,10:6,11:10,12:10,13:6,14:6,15:14,16:5,17:16,18:16};
 return m[n]||1;
}
function go(n){page=Number(n);location.hash=`page-${page}`;render();scrollTo({top:0,behavior:'smooth'})}

async function hashPassword(password){
 const bytes=new TextEncoder().encode(password);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function openAuth(){
 if(isAdmin()){edit=false;render();showToast('Admin mode locked');return;}
 document.getElementById('authTitle').textContent='Admin login';
 document.getElementById('authText').textContent='Enter the family archive password to edit members and photos.';
 document.getElementById('authForm').reset();
 document.getElementById('authModal').classList.remove('hidden');
 setTimeout(()=>document.getElementById('passwordInput').focus(),50);
}
function closeAuth(){document.getElementById('authModal').classList.add('hidden')}
async function submitAuth(e){
 e.preventDefault();
 const password=document.getElementById('passwordInput').value;
 if(password.length<1){showToast('Password दर्ज करें');return;}
 const hash=await hashPassword(password);
 if(hash!==fixedAdminHash){showToast('गलत password');return;}
 sessionStorage.setItem(authKey,'1');closeAuth();edit=true;render();showToast('Admin mode unlocked');
}
function logoutAdmin(){sessionStorage.removeItem(authKey);edit=false;render();showToast('Admin mode locked')}
function toggleEdit(){openAuth();}

// Preserve the user's original image bytes. No resize, canvas redraw, or JPEG recompression is applied.
function upload(id,file){
 if(!isAdmin()){openAuth();return;}
 if(!file)return;
 state.clearedPhotos=state.clearedPhotos||{};
 delete state.clearedPhotos[id];
 const r=new FileReader();
 r.onload=()=>{state.photos=state.photos||{};state.photos[id]=r.result;save();render();showToast('HD photo saved');};
 r.readAsDataURL(file);
}
function removeImage(id){
 if(!isAdmin()){openAuth();return;}
 const person=findPersonEverywhere(id);
 const image=photoFor(person||{id});
 if(!image)return;
 const name=person?.name||'इस सदस्य';
 if(!confirm(`क्या आप ${name} की फोटो हटाना चाहते हैं?`))return;
 state.photos=state.photos||{};
 delete state.photos[id];
 state.clearedPhotos=state.clearedPhotos||{};
 state.clearedPhotos[id]=true;
 save();
 render();
 showToast('फोटो हटा दी गई');
}


function currentPagePeople(){
 const d=pageData(page);
 return [...(d.children||[]),...(d.side||[]),...(d.loose||[])];
}
function spouseCandidates(){
 return currentPagePeople().filter(x=>x.id);
}
function setupMemberModal(){
 const type=document.getElementById('memberTypeInput');
 const partnerWrap=document.getElementById('partnerWrap');
 const partner=document.getElementById('partnerInput');
 const hint=document.getElementById('memberHint');
 const people=spouseCandidates();
 partner.innerHTML='<option value="">सदस्य चुनें</option>'+people.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 const update=()=>{
   const isSpouse=type.value==='spouse';
   partnerWrap.style.display=isSpouse?'block':'none';
   partner.required=isSpouse;
   hint.textContent=isSpouse
    ?'पत्नी/पति जोड़ने पर चुने गए सदस्य और नए spouse की नई family page अपने-आप बनेगी। बाद में उसी page पर उनके बच्चे जोड़ें।'
    :'बच्चे या अन्य सदस्य इसी family page में जोड़े जाएंगे।';
 };
 type.onchange=update;update();
}
function openModal(){
 if(!isAdmin()){openAuth();return;}
 document.getElementById('addForm').reset();
 document.getElementById('modal').classList.remove('hidden');
 setupMemberModal();
}
function closeModal(){document.getElementById('modal').classList.add('hidden')}

function findPersonEverywhere(id){
 for(const key of Object.keys(FAMILY.pages)){
   const d=FAMILY.pages[key];
   for(const group of ['parents','children','side','loose']){
     const hit=(d[group]||[]).find(x=>x.id===id);
     if(hit)return {...hit,name:nameFor(hit)};
   }
 }
 for(const key of Object.keys(state.customPages||{})){
   const d=state.customPages[key];
   for(const group of ['parents','children','side','loose']){
     const hit=(d[group]||[]).find(x=>x.id===id);
     if(hit)return {...hit,name:nameFor(hit)};
   }
 }
 for(const key of Object.keys(state.members||{})){
   const hit=(state.members[key]||[]).find(x=>x.id===id);
   if(hit)return {...hit,name:nameFor(hit)};
 }
 return null;
}
function nextCustomPageId(){
 const nums=Object.keys(state.customPages||{}).map(Number).filter(Number.isFinite);
 return Math.max(18,...nums)+1;
}
function personHasPage(personId){
 return state.familyPages?.[personId] || findPersonEverywhere(personId)?.to || null;
}

// The page where a person appears as a child is that person's parents page.
// This is deliberately separate from the person's own family page.
function parentPageForPerson(personId){
  // Custom pages and members first, because newly-added family data may not exist in FAMILY.
  for(const key of Object.keys(state.customPages||{})){
    const d=state.customPages[key];
    if((d.children||[]).some(x=>x.id===personId)) return Number(key);
  }
  for(const key of Object.keys(state.members||{})){
    if((state.members[key]||[]).some(x=>x.id===personId)) return Number(key);
  }
  // Original family structure.
  for(const key of Object.keys(FAMILY.pages)){
    const d=FAMILY.pages[key];
    if((d.children||[]).some(x=>x.id===personId)) return Number(key);
  }
  return null;
}

function addSpouseBranch(name,role,relation,photo,partnerId){
 const partner=findPersonEverywhere(partnerId);
 if(!partner){showToast('सदस्य नहीं मिला');return;}
 state.customPages=state.customPages||{};
 state.pageBack=state.pageBack||{};
 state.familyPages=state.familyPages||{};
 const existing=personHasPage(partnerId);
 let branchId=existing;
 if(branchId){
   const parentsPage=parentPageForPerson(partnerId) || page;
   let branch=state.customPages[branchId];
   if(!branch && FAMILY.pages[branchId]){
     branch=JSON.parse(JSON.stringify(FAMILY.pages[branchId]));
     state.customPages[branchId]=branch;
   }
   if(!branch){branchId=null;}
   else {
     branch.parents=branch.parents||[];
     const partnerInBranch=branch.parents.find(x=>x.id===partnerId);
     if(partnerInBranch){
       // Clicking the husband on his branch returns to his parents page.
       partnerInBranch.to=parentsPage;
     }else{
       branch.parents.push({...partner,name:nameFor(partner),to:parentsPage});
     }
   }
 }
 if(!branchId){
   branchId=nextCustomPageId();
   const spouseId='custom-'+Date.now();
   const parentsPage=parentPageForPerson(partnerId) || page;
   state.customPages[branchId]={
     title:`${nameFor(partner)} परिवार`,
     kicker:'नई परिवार शाखा',
     parents:[{...partner,name:nameFor(partner),to:parentsPage},{id:spouseId,name,role:role||'परिवार',relation:relation||'पति / पत्नी',to:null,photo:''}],
     children:[]
   };
   state.pageBack[branchId]=page;
   state.familyPages[partnerId]=branchId;
   if(partnerId.startsWith('custom-')) state.familyPages[partnerId]=branchId;
   if(photo){
     const reader=new FileReader();
     reader.onload=()=>{state.photos=state.photos||{};state.photos[spouseId]=reader.result;save();closeModal();render();go(branchId);showToast('HD photo saved');};
     reader.readAsDataURL(photo);return;
   }
 }else{
   const branch=state.customPages[branchId];
   if(branch){
     const spouseExists=(branch.parents||[]).some(x=>x.name===name);
     if(!spouseExists){
       const spouseId='custom-'+Date.now();
       branch.parents=branch.parents||[];
       branch.parents.push({id:spouseId,name,role:role||'परिवार',relation:relation||'पति / पत्नी',to:null,photo:''});
       if(photo){
         const reader=new FileReader();reader.onload=()=>{state.photos=state.photos||{};state.photos[spouseId]=reader.result;save();closeModal();render();go(branchId);showToast('HD photo saved');};
         reader.readAsDataURL(photo);return;
       }
     }
   }
 }
 save();closeModal();render();go(branchId);showToast('नई family page तैयार है');
}

function removeMember(id){
 if(!isAdmin()){openAuth();return;}
 const person=findPersonEverywhere(id);
 const name=person?.name||'यह सदस्य';
 if(!confirm(`क्या आप \`${name}\` को इस family tree से हटाना चाहते हैं?`))return;
 state.deletedMembers=state.deletedMembers||{};
 state.deletedMembers[id]=true;
 if(state.photos?.[id]){delete state.photos[id];}
 // Remove from custom member arrays immediately so future pageData stays clean.
 for(const key of Object.keys(state.members||{})){
   state.members[key]=(state.members[key]||[]).filter(x=>x.id!==id);
 }
 save();
 render();
 showToast('सदस्य हटा दिया गया');
}

function deleteCurrentPage(){
 if(!isAdmin()){openAuth();return;}
 if(!isCustomPage(page)){showToast('मूल 18 पेज सुरक्षित हैं');return;}
 const d=state.customPages?.[page];
 if(!d)return;
 if(!confirm(`क्या आप \`${d.title||'इस family page'}\` को स्थायी रूप से हटाना चाहते हैं?`))return;
 const deletedPage=page;
 const fallback=state.pageBack?.[deletedPage] || 1;
 delete state.customPages[deletedPage];
 if(state.pageBack)delete state.pageBack[deletedPage];
 // Remove every branch pointer that targeted this custom page.
 for(const key of Object.keys(state.familyPages||{})){
   if(Number(state.familyPages[key])===Number(deletedPage))delete state.familyPages[key];
 }
 for(const key of Object.keys(state.customPages||{})){
   for(const group of ['parents','children','side','loose']){
     for(const person of (state.customPages[key][group]||[])){
       if(Number(person.to)===Number(deletedPage)) person.to=fallback||null;
     }
   }
 }
 save();
 go(fallback);
 showToast('Family page हटा दिया गया');
}

function openLogoModal(){
 if(!isAdmin()){openAuth();return;}
 document.getElementById('logoForm').reset();
 updateLogoPreview();
 document.getElementById('logoModal').classList.remove('hidden');
}
function closeLogoModal(){document.getElementById('logoModal').classList.add('hidden')}
function updateLogoPreview(src){
 const box=document.getElementById('logoPreview');
 const image=src||logoFor();
 box.innerHTML=image?`<img src="${image}" alt="लोगो preview">`:'<span>श्री</span>';
}
function removeLogo(){
 if(!isAdmin()){openAuth();return;}
 if(!logoFor()){closeLogoModal();showToast('मुख्य लोगो सेट नहीं है');return;}
 if(!confirm('क्या आप मुख्य लोगो हटाना चाहते हैं?'))return;
 delete state.logo;
 save();
 updateLogoPreview('');
 render();
 showToast('मुख्य लोगो हटा दिया गया');
}
document.getElementById('logoInput').addEventListener('change',e=>{
 const file=e.target.files[0];
 if(!file){updateLogoPreview();return;}
 const r=new FileReader();
 r.onload=()=>updateLogoPreview(r.result);
 r.readAsDataURL(file);
});
document.getElementById('logoForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!isAdmin()){closeLogoModal();openAuth();return;}
 const file=document.getElementById('logoInput').files[0];
 if(!file && !logoFor()){showToast('लोगो फोटो चुनें');return;}
 if(!file){closeLogoModal();showToast('मुख्य लोगो पहले से सेट है');return;}
 const r=new FileReader();
 r.onload=()=>{state.logo=r.result;save();closeLogoModal();render();showToast('HD logo saved');};
 r.readAsDataURL(file);
});

document.getElementById('addForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!isAdmin()){closeModal();openAuth();return;}
 const name=document.getElementById('nameInput').value.trim();
 const role=document.getElementById('roleInput').value.trim()||'परिवार';
 const relation=document.getElementById('relationInput').value.trim()||'नया सदस्य';
 const type=document.getElementById('memberTypeInput').value;
 const photo=document.getElementById('photoInput').files[0];
 if(type==='spouse'){
   const partnerId=document.getElementById('partnerInput').value;
   if(!partnerId){showToast('पति/पत्नी सदस्य चुनें');return;}
   addSpouseBranch(name,role,relation,photo,partnerId);
   return;
 }
 const id='custom-'+Date.now();
 state.members=state.members||{};state.members[page]=state.members[page]||[];
 state.members[page].push({id,name,role,relation,to:null,photo:''});
 state.relations=state.relations||{};state.relations[id]=relation;state.roles=state.roles||{};state.roles[id]=role;
 if(photo){
  const reader=new FileReader();reader.onload=()=>{state.photos=state.photos||{};state.photos[id]=reader.result;save();closeModal();render();showToast('Member and HD photo saved')};reader.readAsDataURL(photo);
 }else{save();closeModal();render();showToast('Member saved');}
});

document.getElementById('personEditForm').addEventListener('submit',savePersonEditor);
document.getElementById('pageEditForm').addEventListener('submit',savePageEditor);
document.getElementById('authForm').addEventListener('submit',submitAuth);
document.getElementById('editBtn').addEventListener('click',openAuth);
window.addEventListener('hashchange',()=>{page=Number(location.hash.replace('#page-',''))||1;render()});
function showToast(message){
 let t=document.getElementById('toast');if(!t)return;
 t.textContent=message;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200);
}
render();
