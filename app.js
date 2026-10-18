(function(){
'use strict';
var ADMIN_USER='admin';
var ADMIN_HASH='7fab7f63b4791aaf499b60030103a56e9bd880b42931550b537db88f63ab56d3';
var PAGE_SIZE=10;
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAY=864e5;

var ICONS={
 dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 trash:'<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 alert:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
function ico(n){return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n]+'</svg>';}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function $(id){return document.getElementById(id);}

/* ---------- state ---------- */
var state={rows:[],loaded:false,mode:'local',view:'customers',q:'',page:1,admin:false,modal:null,theme:'auto'};
try{ state.admin=sessionStorage.getItem('vs101.admin')==='1'; }catch(e){}
try{ var th=localStorage.getItem('vs101.theme'); if(th==='light'||th==='dark'){state.theme=th; document.documentElement.setAttribute('data-theme',th);} }catch(e){}
var store=null, lastFocus=null, toastTimer=0, builtView='';

var NAV=[['dashboard','Dashboard','dash'],['customers','Customers','users'],['interactions','Interactions','chat'],['reports','Reports','chart'],['notifications','Notifications','bell'],['settings','Profile / Settings','sliders']];
var TITLES={dashboard:['Dashboard','Where the customer base stands today.'],customers:['Customer records','Search, review, and maintain core customer contact information.'],interactions:['Interactions','Recent customer notes, newest activity first.'],reports:['Reports','Customer records grouped by barangay.'],notifications:['Notifications','Records that need attention.'],settings:['Profile / Settings','Account access and appearance.']};

/* ---------- helpers ---------- */
function dayStart(t){var d=new Date(t);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();}
function fmtDate(ts){
  if(!ts) return '–';
  var d=new Date(ts), n=new Date();
  var diff=Math.round((dayStart(n)-dayStart(d))/DAY);
  if(diff<=0) return 'Today';
  if(diff===1) return 'Yesterday';
  return d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==n.getFullYear()?' '+d.getFullYear():'');
}
function sorted(rows){return rows.slice().sort(function(a,b){return (b.lastActivity||0)-(a.lastActivity||0)||String(a.name).localeCompare(String(b.name));});}
function filtered(){
  var q=state.q.trim().toLowerCase(), r=sorted(state.rows);
  if(!q) return r;
  return r.filter(function(c){return [c.name,c.email,c.contact,c.address,c.notes].join(' ').toLowerCase().indexOf(q)>-1;});
}
function barangay(a){var p=String(a||'').split(',').map(function(s){return s.trim();}).filter(Boolean); if(p.length>1&&/^brgy/i.test(p[0])) return p[1]; return p[0]||'No address';}
function attention(){
  var now=Date.now(), missing=[], stale=[];
  sorted(state.rows).forEach(function(c){
    if(!c.email) missing.push(c);
    if(c.lastActivity && now-c.lastActivity>30*DAY) stale.push(c);
  });
  return {missing:missing,stale:stale,count:new Set(missing.concat(stale).map(function(c){return c.id;})).size};
}
function find(id){for(var i=0;i<state.rows.length;i++) if(state.rows[i].id===id) return state.rows[i]; return null;}
function toast(msg){
  var t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('on');},2800);
}
function sha256(text){
  var enc=new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256',enc).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
  });
}

/* ---------- data layer ---------- */
var SAMPLE=[
 ['Angela Mae Cruz','angela.cruz@example.com','0917-555-0318','Brgy. Maharlika West, Tagaytay City, Cavite',0],
 ['Christine Dela Cruz','','0920-555-0246','Brgy. Silang Junction, Tagaytay City, Cavite',1],
 ['John Carlo Mendoza','jc.mendoza@example.com','0935-555-0182','Brgy. Kaybagal, Tagaytay City, Cavite',24],
 ['Maria Santos','maria.santos@example.com','0919-555-0221','Brgy. Patutu, Tagaytay City, Cavite',26],
 ['Mark Anthony Reyes','','0905-555-0174','Brgy. Maharlika West, Tagaytay City, Cavite',27],
 ['Sarah Jane Tan','sarah.tan@example.com','0915-555-0148','Brgy. Tolentino West, Tagaytay City, Cavite',29],
 ['Rhea Mae Villanueva','rhea.v@example.com','0922-555-0199','Brgy. Iruhin Central, Tagaytay City, Cavite',30],
 ['Michael Angelo Santos','','0938-555-0127','Brgy. Sungay East, Tagaytay City, Cavite',31],
 ['Nicole Anne Rivera','nicole.rivera@example.com','0912-555-0263','Brgy. Calamba Junction, Tagaytay City, Cavite',32],
 ['Arnel Bautista','arnel.b@example.com','0908-555-0158','Brgy. Neogan, Tagaytay City, Cavite',32],
 ['Lorna Pascual','lorna.p@example.com','0917-555-0412','Brgy. Maharlika East, Tagaytay City, Cavite',40],
 ['Dennis Aguinaldo','dennis.a@example.com','0927-555-0377','Brgy. Kaybagal, Tagaytay City, Cavite',44]
];
function localSeed(){
  var base=dayStart(Date.now());
  return SAMPLE.map(function(s,i){return {id:'s'+i,name:s[0],email:s[1],contact:s[2],address:s[3].replace('Brgy. ','Brgy, '),notes:'Sample record.',lastActivity:base-s[4]*DAY,createdAt:base-(s[4]+30)*DAY};});
}
function initStore(){ startLocal(); }
function startLocal(){
  var rows=null;
  try{ var raw=localStorage.getItem('vs101.local'); if(raw) rows=JSON.parse(raw); }catch(e){}
  if(!Array.isArray(rows)) rows=localSeed();
  state.rows=rows; state.mode='local'; state.loaded=true;
  function save(){ try{localStorage.setItem('vs101.local',JSON.stringify(state.rows));}catch(e){} render(); }
  store={mode:'local',
    add:function(d){d.id='l'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); state.rows.push(d); save(); return Promise.resolve();},
    update:function(id,d){var r=find(id); if(r) Object.keys(d).forEach(function(k){r[k]=d[k];}); save(); return Promise.resolve();},
    del:function(id){state.rows=state.rows.filter(function(r){return r.id!==id;}); save(); return Promise.resolve();}};
  render();
}
function writeError(e){
  var c=e&&e.code;
  if(c==='invalid_argument') return 'Your access to this page is view-only, so changes can’t be saved.';
  if(c==='quota_exceeded') return 'The record limit for this page is full. Delete some records first.';
  return 'Couldn’t save that change. Check your connection and try again.';
}

/* ---------- rendering ---------- */
function render(){ renderSide(); renderHead(); renderBody(); }
function renderSide(){
  var n=attention().count;
  var html='<div class="brand"><div class="brand-mark">'+ico('user')+'</div><div><b>VitalSource 101</b><span>CRM System</span></div></div><nav class="nav" aria-label="Main">';
  NAV.forEach(function(x,i){
    if(i===4) html+='<div class="gap"></div>';
    html+='<button data-act="nav" data-v="'+x[0]+'"'+(state.view===x[0]?' aria-current="page"':'')+'>'+ico(x[2])+'<span>'+x[1]+'</span>'+(x[0]==='notifications'&&n?'<span class="badge">'+n+'</span>':'')+'</button>';
  });
  html+='<div class="gap"></div><button class="out" data-act="logout">'+ico('logout')+'<span>'+(state.admin?'Sign out':'Admin sign in')+'</span></button></nav>';
  html+='<div class="account"><div class="avatar">'+(state.admin?'AD':'GU')+'</div><div class="who"><b>'+(state.admin?'Administrator':'Guest')+'</b><span>'+(state.admin?'Full access':'Can view and add')+'</span></div>'+(state.admin?'':'<button class="link-btn" data-act="login">Sign in</button>')+'</div>';
  $('side').innerHTML=html;
}
function renderHead(){
  var t=TITLES[state.view];
  $('crumb').innerHTML=ico('users')+'<span>'+esc(NAV.filter(function(x){return x[0]===state.view;})[0][1])+'</span>';
  var h='<div><h1>'+esc(t[0])+(state.view==='customers'?'<span class="pill" id="count">'+state.rows.length+' customers</span>':'')+'</h1><p>'+esc(t[1])+'</p></div><div class="head-actions">';
  h+=state.admin?'<span class="chip admin">'+ico('lock')+' Admin</span><button class="btn" data-act="logout">Sign out</button>':'<button class="btn" data-act="login">'+ico('lock')+' Admin sign in</button>';
  h+='<button class="btn primary" data-act="add">'+ico('plus')+' Add customer</button></div>';
  $('head').innerHTML=h;
}
function renderBody(){
  var b=$('body');
  if(state.view==='customers'){
    if(builtView!=='customers'){
      b.innerHTML='<section class="panel" aria-label="Customer records"><div class="toolbar"><label class="search" for="q">'+ico('search')+'<input id="q" type="search" placeholder="Search customers..." autocomplete="off" value="'+esc(state.q)+'"></label><button class="btn primary" data-act="search">Search</button><button class="btn quiet" data-act="clear">Clear</button></div><div id="banner"></div><div id="list"></div></section>';
      builtView='customers';
    }
    renderList(); return;
  }
  builtView=state.view;
  var fn={dashboard:vDashboard,interactions:vInteractions,reports:vReports,notifications:vNotifications,settings:vSettings}[state.view];
  b.innerHTML=fn();
}
function renderList(){
  var bn=$('banner'), list=$('list'); if(!list) return;
  bn.innerHTML='';
  var cnt=$('count'); if(cnt) cnt.textContent=state.rows.length+(state.rows.length===1?' customer':' customers');
  if(!state.loaded){ list.innerHTML='<div class="empty"><span>Loading customer records…</span></div>'; return; }
  var rows=filtered(), total=rows.length, pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(state.page>pages) state.page=pages;
  var start=(state.page-1)*PAGE_SIZE, slice=rows.slice(start,start+PAGE_SIZE);
  if(!state.rows.length){
    list.innerHTML='<div class="empty"><b>No customers yet</b><span>Add the first customer to start the record.</span><button class="btn primary" data-act="add">'+ico('plus')+' Add customer</button></div>'; return;
  }
  if(!total){
    list.innerHTML='<div class="empty"><b>No matches for “'+esc(state.q)+'”</b><span>Try a name, phone number, or barangay.</span><button class="btn" data-act="clear">Clear search</button></div>'; return;
  }
  var h='<div class="rows" role="table" aria-label="Customers"><div class="row th" role="row"><div role="columnheader">Customer name</div><div role="columnheader">Contact number</div><div role="columnheader">Address</div><div role="columnheader">Last activity</div><div role="columnheader">Actions</div></div>';
  slice.forEach(function(c){
    h+='<div class="row" role="row"><div class="name" role="cell">'+esc(c.name)+'</div><div class="dim contact" role="cell">'+esc(c.contact)+'</div><div class="dim addr" role="cell">'+esc(c.address)+'</div><div class="dim when" role="cell">'+fmtDate(c.lastActivity)+'</div><div class="acts" role="cell"><button class="act" data-act="view" data-id="'+esc(c.id)+'">'+ico('eye')+' View</button><button class="act del'+(state.admin?'':' locked')+'" data-act="del" data-id="'+esc(c.id)+'" title="'+(state.admin?'Delete customer':'Admin sign-in required')+'">'+ico(state.admin?'trash':'lock')+' Delete</button></div></div>';
  });
  h+='</div><div class="foot"><span>Showing '+(start+1)+' to '+(start+slice.length)+' of '+total+' customer'+(total===1?'':'s')+'</span>'+pager(pages)+'</div>';
  list.innerHTML=h;
}
function pager(pages){
  if(pages<2) return '';
  var p=state.page, lo=Math.max(1,Math.min(p-2,pages-4)), hi=Math.min(pages,lo+4), h='<div class="pager" aria-label="Pages">';
  h+='<button data-act="page" data-p="1" aria-label="First page"'+(p===1?' disabled':'')+'>&laquo;</button><button data-act="page" data-p="'+(p-1)+'" aria-label="Previous page"'+(p===1?' disabled':'')+'>&lsaquo;</button>';
  for(var i=lo;i<=hi;i++) h+='<button data-act="page" data-p="'+i+'"'+(i===p?' aria-current="page"':'')+'>'+i+'</button>';
  h+='<button data-act="page" data-p="'+(p+1)+'" aria-label="Next page"'+(p===pages?' disabled':'')+'>&rsaquo;</button><button data-act="page" data-p="'+pages+'" aria-label="Last page"'+(p===pages?' disabled':'')+'>&raquo;</button></div>';
  return h;
}
function liRow(c,sub){
  return '<div class="li"><div class="t"><b>'+esc(c.name)+'</b><span>'+esc(sub)+'</span></div><div style="display:flex;gap:14px;align-items:center"><time>'+fmtDate(c.lastActivity)+'</time><button class="act" data-act="view" data-id="'+esc(c.id)+'">'+ico('eye')+' View</button></div></div>';
}
function empty(msg){return '<div class="empty"><span>'+msg+'</span></div>';}
function vDashboard(){
  var now=Date.now(), r=sorted(state.rows);
  var week=r.filter(function(c){return now-c.lastActivity<7*DAY;}).length;
  var fresh=r.filter(function(c){return now-(c.createdAt||0)<30*DAY;}).length;
  var miss=r.filter(function(c){return !c.email;}).length;
  var h='<div class="tiles"><div class="tile"><span>Total customers</span><b>'+r.length+'</b></div><div class="tile"><span>Active in the last 7 days</span><b>'+week+'</b></div><div class="tile"><span>Added in the last 30 days</span><b>'+fresh+'</b></div><div class="tile"><span>Missing an email</span><b>'+miss+'</b></div></div>';
  h+='<section class="panel"><h2 class="sub">Recent activity</h2><div class="list">'+(r.length?r.slice(0,6).map(function(c){return liRow(c,c.address);}).join(''):empty('No customers yet.'))+'</div></section>';
  return h;
}
function vInteractions(){
  var r=sorted(state.rows).filter(function(c){return c.notes;});
  return '<section class="panel"><div class="list">'+(r.length?r.slice(0,25).map(function(c){return liRow(c,c.notes);}).join(''):empty('No notes recorded yet. Add notes when you create or edit a customer.'))+'</div></section>';
}
function vReports(){
  var map={}; state.rows.forEach(function(c){var k=barangay(c.address); map[k]=(map[k]||0)+1;});
  var keys=Object.keys(map).sort(function(a,b){return map[b]-map[a]||a.localeCompare(b);}).slice(0,10), max=keys.length?map[keys[0]]:1;
  var h='<section class="panel"><h2 class="sub">Customers by barangay</h2>';
  h+=keys.length?keys.map(function(k){return '<div class="bar-row"><span class="lab" title="'+esc(k)+'">'+esc(k)+'</span><div class="bar"><i style="width:'+Math.round(map[k]/max*100)+'%"></i></div><span class="n">'+map[k]+'</span></div>';}).join(''):empty('No customers yet.');
  return h+'</section>';
}
function vNotifications(){
  var a=attention();
  var h='<section class="panel"><h2 class="sub">Missing an email address ('+a.missing.length+')</h2><div class="list">'+(a.missing.length?a.missing.map(function(c){return liRow(c,'Add an email so this customer can be reached.');}).join(''):empty('Every customer has an email.'))+'</div></section>';
  h+='<section class="panel"><h2 class="sub">No activity for over 30 days ('+a.stale.length+')</h2><div class="list">'+(a.stale.length?a.stale.map(function(c){return liRow(c,'Last activity '+fmtDate(c.lastActivity)+'.');}).join(''):empty('Nobody has gone quiet.'))+'</div></section>';
  return h;
}
function vSettings(){
  var h='<section class="panel"><h2 class="sub">Account</h2><div class="list"><div class="li"><div class="t"><b>'+(state.admin?'Signed in as administrator':'Browsing as guest')+'</b><span>'+(state.admin?'You can add, edit and delete customer records.':'Guests can view and add customers. Editing and deleting need the admin password.')+'</span></div><button class="btn" data-act="'+(state.admin?'logout':'login')+'">'+(state.admin?'Sign out':'Admin sign in')+'</button></div></div></section>';
  h+='<section class="panel"><h2 class="sub">Appearance</h2><div><div class="seg" role="group" aria-label="Theme"><button data-act="theme" data-t="auto" aria-pressed="'+(state.theme==='auto')+'">Auto</button><button data-act="theme" data-t="light" aria-pressed="'+(state.theme==='light')+'">Light</button><button data-act="theme" data-t="dark" aria-pressed="'+(state.theme==='dark')+'">Dark</button></div></div></section>';
  h+='<section class="panel"><h2 class="sub">Data</h2><p class="note" style="margin:0">'+(state.mode==='shared'?'':'Records are saved in this browser only. Clearing your browser data removes them.')+'</p>'+(state.mode==='local'&&state.admin?'<div><button class="btn" data-act="reset">Reset sample data</button></div>':'')+'</section>';
  return h;
}

/* ---------- modals ---------- */
function field(id,label,ph,val,type,extra){
  var tag=type==='textarea'?'textarea':'input';
  return '<div class="field"><label for="'+id+'">'+label+'</label><'+tag+' id="'+id+'" name="'+id+'" placeholder="'+esc(ph)+'"'+(tag==='input'?' type="'+(type||'text')+'" value="'+esc(val||'')+'"':'')+(extra||'')+'>'+(tag==='textarea'?esc(val||''):'')+'</'+tag+'><div class="err" id="'+id+'-err" aria-live="polite"></div></div>';
}
function openModal(m){ lastFocus=document.activeElement; state.modal=m; renderModal(); }
function closeModal(){ state.modal=null; renderModal(); if(lastFocus&&lastFocus.focus&&document.contains(lastFocus)) lastFocus.focus(); }
function renderModal(){
  var m=state.modal, root=$('modal-root'); if(!m){ root.innerHTML=''; return; }
  var c=m.id?find(m.id):null, h='', first='';
  if(m.type==='add'||m.type==='edit'){
    var e=m.type==='edit'&&c, v=e?c:{};
    h='<form class="dialog" id="cust-form" role="dialog" aria-modal="true" aria-labelledby="dlg-title" novalidate><h2 id="dlg-title">'+(e?'Edit customer':'Add Customer')+'</h2>'
     +field('f-name','Customer Name','Enter customer name',v.name)+field('f-email','Email','Enter email address',v.email,'email')+field('f-contact','Contact Number','Enter contact number',v.contact,'tel')+field('f-address','Address','Enter physical address',v.address)+field('f-notes','Notes','Add a short note about the customer',v.notes,'textarea')
     +'<div class="btns"><button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn primary">'+(e?'Save changes':'Save Customer')+'</button></div></form>';
    first='f-name';
  } else if(m.type==='view'&&c){
    h='<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title"><h2 id="dlg-title">'+esc(c.name)+'</h2><dl class="kv"><dt>Contact number</dt><dd>'+esc(c.contact||'–')+'</dd><dt>Email</dt><dd>'+esc(c.email||'–')+'</dd><dt>Address</dt><dd>'+esc(c.address||'–')+'</dd><dt>Last activity</dt><dd>'+fmtDate(c.lastActivity)+'</dd><dt>Notes</dt><dd>'+esc(c.notes||'–')+'</dd></dl>'
     +(state.admin?'<div class="btns"><button class="btn" data-act="edit" data-id="'+esc(c.id)+'">'+ico('edit')+' Edit</button><button class="btn danger" data-act="del" data-id="'+esc(c.id)+'">'+ico('trash')+' Delete</button></div><button class="btn quiet" data-act="close">Close</button>':'<p class="note" style="margin:0">Editing and deleting are limited to the administrator. <button class="link-btn" data-act="login-edit" data-id="'+esc(c.id)+'">Admin sign in</button></p><button class="btn quiet" data-act="close">Close</button>')+'</div>';
    first='';
  } else if(m.type==='delete'&&c){
    h='<div class="dialog sm" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title"><div><h2 id="dlg-title" style="font-size:15px">Delete customer</h2></div><p class="lead" style="margin:-8px 0 0">Permanently remove this customer from the record.</p><div class="warnbox">'+ico('alert')+'<div><b>Delete '+esc(c.name)+'?</b><span>This action cannot be undone.</span></div></div><div class="btns end"><button class="btn" data-act="close">Cancel</button><button class="btn danger" data-act="confirm-del" data-id="'+esc(c.id)+'">Delete customer</button></div></div>';
    first='';
  } else if(m.type==='login'){
    h='<form class="dialog sm" id="login-form" role="dialog" aria-modal="true" aria-labelledby="dlg-title" novalidate><h2 id="dlg-title">Admin sign in</h2><p class="lead">Sign in to edit or delete customer records.</p><div id="login-err"></div>'
     +field('l-user','Username','Enter username','','text',' autocomplete="username" autocapitalize="off"')+field('l-pass','Password','Enter password','','password',' autocomplete="current-password"')
     +'<div class="btns"><button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn primary" id="login-btn">Sign in</button></div></form>';
    first='l-user';
  } else { state.modal=null; root.innerHTML=''; return; }
  root.innerHTML='<div class="scrim" data-act="scrim">'+h+'</div>';
  var f=first&&$(first); if(f) f.focus(); else { var d=root.querySelector('.dialog button'); if(d) d.focus(); }
}
function setErr(id,msg){ var e=$(id+'-err'), i=$(id); if(e) e.textContent=msg||''; if(i){ if(msg) i.setAttribute('aria-invalid','true'); else i.removeAttribute('aria-invalid'); } }

/* ---------- actions ---------- */
function requireAdmin(next){
  if(state.admin) return true;
  openModal({type:'login',next:next}); return false;
}
function submitCustomer(ev){
  ev.preventDefault();
  var m=state.modal, name=$('f-name').value.trim(), email=$('f-email').value.trim(), contact=$('f-contact').value.trim(), address=$('f-address').value.trim(), notes=$('f-notes').value.trim(), ok=true;
  setErr('f-name',''); setErr('f-email',''); setErr('f-contact','');
  if(!name){ setErr('f-name','Enter the customer’s name.'); ok=false; }
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErr('f-email','Enter a valid email address, like name@example.com.'); ok=false; }
  if(contact&&contact.replace(/\D/g,'').length<7){ setErr('f-contact','Enter a phone number with at least 7 digits.'); ok=false; }
  if(!ok){ var bad=document.querySelector('#cust-form [aria-invalid="true"]'); if(bad) bad.focus(); return; }
  var data={name:name,email:email,contact:contact,address:address,notes:notes,lastActivity:Date.now()}, p;
  if(m.type==='edit'){ if(!state.admin) return; p=store.update(m.id,data); }
  else { data.createdAt=Date.now(); p=store.add(data); }
  var btn=ev.target.querySelector('[type="submit"]'); if(btn) btn.disabled=true;
  Promise.resolve(p).then(function(){ var edit=m.type==='edit'; state.modal=null; renderModal(); toast(edit?'Customer updated':'Customer added'); if(!edit){ state.q=''; state.page=1; var q=$('q'); if(q) q.value=''; } renderList(); })
  .catch(function(e){ if(btn) btn.disabled=false; toast(writeError(e)); });
}
function submitLogin(ev){
  ev.preventDefault();
  var u=$('l-user').value.trim().toLowerCase(), pw=$('l-pass').value, box=$('login-err'), btn=$('login-btn');
  var now=Date.now();
  if(state.lockUntil&&now<state.lockUntil){ box.innerHTML='<div class="formerr">Too many attempts. Try again in '+Math.ceil((state.lockUntil-now)/1000)+' seconds.</div>'; return; }
  if(!u||!pw){ box.innerHTML='<div class="formerr">Enter both a username and a password.</div>'; return; }
  btn.disabled=true;
  var done=function(hash){
    btn.disabled=false;
    if(u===ADMIN_USER&&hash===ADMIN_HASH){
      state.admin=true; state.fails=0; try{sessionStorage.setItem('vs101.admin','1');}catch(e){}
      var next=state.modal&&state.modal.next; state.modal=null; renderModal(); render(); toast('Signed in as administrator');
      if(next){ if(next.type==='delete') openModal({type:'delete',id:next.id}); else if(next.type==='edit') openModal({type:'edit',id:next.id}); }
    } else {
      state.fails=(state.fails||0)+1;
      if(state.fails>=5){ state.lockUntil=Date.now()+30000; state.fails=0; box.innerHTML='<div class="formerr">Too many attempts. Try again in 30 seconds.</div>'; }
      else box.innerHTML='<div class="formerr">That username or password is incorrect.</div>';
      $('l-pass').value=''; $('l-pass').focus();
    }
  };
  if(window.crypto&&crypto.subtle){ sha256('vs101|'+u+'|'+pw).then(done,function(){ btn.disabled=false; box.innerHTML='<div class="formerr">Sign-in isn’t available in this browser.</div>'; }); }
  else { btn.disabled=false; box.innerHTML='<div class="formerr">Sign-in isn’t available in this browser.</div>'; }
}
function logout(){
  if(!state.admin){ openModal({type:'login'}); return; }
  state.admin=false; try{sessionStorage.removeItem('vs101.admin');}catch(e){}
  render(); toast('Signed out');
}

document.addEventListener('click',function(ev){
  var el=ev.target.closest('[data-act]'); if(!el) return;
  var a=el.getAttribute('data-act'), id=el.getAttribute('data-id');
  if(a==='scrim'){ if(ev.target===el) closeModal(); return; }
  switch(a){
    case 'nav': state.view=el.getAttribute('data-v'); builtView=''; render(); break;
    case 'add': openModal({type:'add'}); break;
    case 'view': openModal({type:'view',id:id}); break;
    case 'edit': if(requireAdmin({type:'edit',id:id})){ state.modal={type:'edit',id:id}; renderModal(); } break;
    case 'del': if(requireAdmin({type:'delete',id:id})){ if(state.modal&&state.modal.type==='view'){ state.modal={type:'delete',id:id}; renderModal(); } else openModal({type:'delete',id:id}); } break;
    case 'confirm-del':
      if(!state.admin) return;
      el.disabled=true;
      Promise.resolve(store.del(id)).then(function(){ state.modal=null; renderModal(); toast('Customer deleted'); renderList(); }).catch(function(e){ el.disabled=false; toast(writeError(e)); });
      break;
    case 'close': closeModal(); break;
    case 'login': openModal({type:'login'}); break;
    case 'login-edit': state.modal={type:'login',next:{type:'edit',id:id}}; renderModal(); break;
    case 'logout': logout(); break;
    case 'search': var q=$('q'); if(q){ state.q=q.value; state.page=1; renderList(); } break;
    case 'clear': state.q=''; state.page=1; var q2=$('q'); if(q2){ q2.value=''; q2.focus(); } renderList(); break;
    case 'page': state.page=parseInt(el.getAttribute('data-p'),10)||1; renderList(); break;
    case 'theme':
      var t=el.getAttribute('data-t'); state.theme=t;
      if(t==='auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme',t);
      try{ if(t==='auto') localStorage.removeItem('vs101.theme'); else localStorage.setItem('vs101.theme',t); }catch(e){}
      renderBody(); break;
    case 'reset': try{localStorage.removeItem('vs101.local');}catch(e){} state.rows=localSeed(); try{localStorage.setItem('vs101.local',JSON.stringify(state.rows));}catch(e){} render(); toast('Sample data restored'); break;
  }
});
document.addEventListener('input',function(ev){
  if(ev.target.id==='q'){ state.q=ev.target.value; state.page=1; renderList(); }
});
document.addEventListener('keydown',function(ev){
  if(ev.key==='Escape'&&state.modal){ closeModal(); }
  if(ev.key==='Enter'&&ev.target.id==='q'){ state.q=ev.target.value; state.page=1; renderList(); }
});
document.addEventListener('submit',function(ev){
  if(ev.target.id==='cust-form') submitCustomer(ev);
  else if(ev.target.id==='login-form') submitLogin(ev);
});

render();
initStore();
})();
