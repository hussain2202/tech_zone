import {firebaseConfig,storeDefaults,team,doctor,about,shippingMethods,adminAuth} from './config.js';
import {T,CATS,GROUPS,GOVS} from './i18n.js';
const CFG=!firebaseConfig.apiKey.startsWith('YOUR');
let fbApp,fbS,stor;const ADMIN_EMAIL=adminAuth.email.toLowerCase();let fb={},auth=null,db=null,fn=null,user=null,PRODUCTS=[],store={...storeDefaults};
const MAXC=4;let authReady=!CFG;
let lang=localStorage.getItem('tz_lang')||'ar';
const $=s=>document.querySelector(s),t=k=>T[lang][k]||k,L=(o,k)=>o[k+'_'+lang]||o[k+'_en'];
const ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const money=n=>Number(n).toLocaleString(lang==='ar'?'ar-EG':'en-US')+' '+t('egp');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cart=ls('tz_cart',{}),wish=ls('tz_wish',[]),cmp=ls('tz_cmp',[]),recent=ls('tz_recent',[]);
function toast(m,bad){const e=$('#toast');e.textContent=m;e.className='show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='',2500)}
const P=id=>PRODUCTS.find(p=>p.id===id);
const catName=c=>t(c);
// ---------- Firebase (loaded only when configured)
async function initFB(){
  if(!CFG)return;
  const B='https://www.gstatic.com/firebasejs/10.12.2/';
  const [a,f,fu]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-firestore.js'),import(B+'firebase-auth.js')]);
  const fa=await import(B+'firebase-functions.js');
  const app=fbApp=a.initializeApp(firebaseConfig);db=f.getFirestore(app);auth=fu.getAuth(app);fn=fa.getFunctions(app,'europe-west1');
  fb={...f,...fu,...fa};
  fb.onAuthStateChanged(auth,async u=>{const was=user;user=u;authReady=true;if(u){await syncLists(u);try{const s=await fb.getDoc(fb.doc(db,'carts',u.uid));if(s.exists()){const r=s.data().items||{};for(const k in r)cart[k]=Math.max(cart[k]||0,r[k]);sv('tz_cart',cart)}}catch{}}else if(was){cmp=[];wish=[];prof=null;addrs=null;sv('tz_cmp',cmp);sv('tz_wish',wish)}renderChrome();route()});
}
const isAdmin=()=>!!(user&&user.email&&user.email.toLowerCase()===ADMIN_EMAIL);
const CATALOG=async()=>await (await fetch('catalog.json')).json();
const normImg=s=>String(s||'').replace(/^images\/(?:products\/|team\/)?/,'');
async function loadProducts(){await loadProducts0();PRODUCTS.forEach(p=>{p.images=(p.images||[]).map(normImg)})}
async function loadProducts0(){
  try{
    if(CFG){const s=await fb.getDocs(fb.collection(db,'products'));PRODUCTS=s.docs.map(d=>({...d.data(),id:d.id}))}
    if(!PRODUCTS.length){const r=await fetch('catalog.json');PRODUCTS=await r.json()} // demo/fallback until you import the catalog from admin
  }catch(e){const r=await fetch('catalog.json');PRODUCTS=await r.json()}
  try{if(CFG){const s=await fb.getDoc(fb.doc(db,'settings','store'));if(s.exists())store={...store,...s.data()}}}catch{}
}
// ---------- cart
const cartCount=()=>Object.values(cart).reduce((a,b)=>a+b,0);
async function saveCart(){sv('tz_cart',cart);if(user&&db)try{await fb.setDoc(fb.doc(db,'carts',user.uid),{items:cart,updatedAt:Date.now()})}catch{}renderChrome()}
function addCart(id,q=1,quiet){const p=P(id);if(!p||p.stock<1)return toast(t('out'),1);cart[id]=Math.min((cart[id]||0)+q,p.stock);saveCart();if(!quiet)toast('✓ '+t('added'))}
const SM=id=>shippingMethods.find(m=>m.id===id)||shippingMethods[0];
function shipFee(id,sub,disc){const m=SM(id);if(sub===0)return 0;if(m.id==='standard')return sub-disc>=store.freeShippingOver?0:store.shippingFee;return m.fee}
function totals(coupon,sid='standard'){
  let sub=0,old=0;for(const id in cart){const p=P(id);if(p){sub+=p.price*cart[id]}}
  let disc=0;if(coupon){disc=coupon.type==='percent'?Math.round(sub*coupon.value/100):coupon.value;disc=Math.min(disc,sub)}
  const ship=shipFee(sid,sub,disc);
  return {sub,disc,ship,total:sub-disc+ship}}
// ---------- chrome
function renderChrome(){
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  $('#topbar').innerHTML=`<div class="wrap"><span>${t('welcome')} · ${t('shipTop')}</span><span>📞 <a href="tel:${esc(store.phone)}">${esc(store.phone)}</a> · ✉ ${esc(store.email)}</span></div>`;
  const dm=['laptops','cpu','gpu','motherboards','ram','storage','cases','cooling','psu'].map(c=>`<a href="#/cat/${c}">${t(c)}</a>`).join('');
  const am=['keyboards','mice','headsets'].map(c=>`<a href="#/cat/${c}">${t(c)}</a>`).join('');
  $('#header').innerHTML=`<div class="wrap"><div class="hrow"><a class="logo" href="#/">TECH ZONE</a>
  <div class="sbox"><input id="q" type="search" placeholder="${t('search')}" autocomplete="off" aria-label="search"><div id="sug" class="sug" hidden></div></div>
  <button class="ibtn" id="lg" aria-label="language">${lang==='ar'?'🇬🇧 EN':'🇪🇬 ع'}</button>
  ${userMenu()}<a class="ibtn" href="#/wishlist" title="${t('wishlist')}">❤<span class="badge">${wish.length}</span></a>
  <a class="ibtn" href="#/compare" title="${t('compare')}">⚖<span class="badge">${cmp.length}</span></a>
  <a class="ibtn" href="#/cart" title="${t('cart')}">🛒<span class="badge">${cartCount()}</span></a></div></div>
  <nav class="menu"><div class="wrap"><a href="#/">${t('home')}</a><a href="#/products?cat=laptops">${t('laptops')}</a>
  <div class="dd"><a href="#/products">${t('pcc')} ▾</a><div class="dm">${dm}</div></div>
  <div class="dd"><a href="#/cat/accessories">${t('accessories')} ▾</a><div class="dm">${am}</div></div>
  <a href="#/cat/monitors">${t('monitors')}</a><a href="#/products?deals=1">${t('deals')}</a><a href="#/products?sort=new">${t('newest')}</a>${isAdmin()?`<a href="#/about">${t('aboutUs')}</a><a href="#/admin">⚙ ${lang==='ar'?'لوحة الأدمن':'Admin'}</a>`:''}<a href="#/contact">${t('contact')}</a></div></nav>`;
  $('#lg').onclick=()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem('tz_lang',lang);renderChrome();route()};
  const q=$('#q'),sg=$('#sug');
  q.oninput=()=>{const v=q.value.trim().toLowerCase();if(v.length<2){sg.hidden=true;return}
    const r=search(v).slice(0,6);sg.hidden=!r.length;sg.innerHTML=r.map(p=>`<a href="#/product/${p.id}"><img src="${p.images[0]}" alt=""><span>${esc(L(p,'name'))}</span></a>`).join('')};
  q.onkeydown=e=>{if(e.key==='Enter'){location.hash='#/products?q='+encodeURIComponent(q.value);sg.hidden=true}};
  q.onblur=()=>setTimeout(()=>sg.hidden=true,200);
  $('#footer').innerHTML=`<div class="wrap"><div><b class="logo">TECH ZONE</b><p>GEAR UP YOUR GAME.</p></div><div><b>${t('contactUs')}</b><br>${contactLines()}</div><div><b>${t('follow')}</b><br>${socialLinks()}</div><div>${isAdmin()?`<a href="#/about">${t('aboutUs')}</a><br>`:''}<a href="#/faq">${t('faq')}</a><br><a href="#/privacy">${t('privacy')}</a><br><a href="#/terms">${t('terms')}</a><br><a href="#/track">${t('track')}</a></div>
  <form id="nl" style="max-width:300px"><b>${t('news')}</b><div style="display:flex;gap:6px;margin-top:6px"><input type="email" required placeholder="${t('email')}" name="e"><button class="btn">${t('send')}</button></div></form></div>`;
  $('#nl').onsubmit=async e=>{e.preventDefault();try{if(!CFG)throw 0;await fb.addDoc(fb.collection(db,'newsletter'),{email:e.target.e.value,createdAt:Date.now()});toast('✓');e.target.reset()}catch{toast(t('demo'),1)}};
  $('#bottomnav').innerHTML=`<a href="#/"><b>🏠</b>${t('home')}</a><a href="#/products"><b>🔍</b>${t('products')}</a><a href="#/cart"><b>🛒</b>${t("cart")}</a><a href="#/wishlist"><b>❤</b>${t('wishlist')}</a><a href="#/compare"><b>⚖</b>${t('compare')}</a><a href="#/account"><b>👤</b>${t('account')}</a>`;
  $('#wa').href='https://wa.me/'+store.whatsapp;bindMenu();cbar();botSetup();
}
function search(v){v=v.toLowerCase();return PRODUCTS.filter(p=>[p.name_en,p.name_ar,p.brand,p.model,p.sku,t(p.categoryId),p.categoryId].join(' ').toLowerCase().includes(v))}
// ---------- compare / wishlist / auth helpers
async function saveList(col,arr){if(user&&db)try{await fb.setDoc(fb.doc(db,col,user.uid),{items:arr,updatedAt:Date.now()})}catch{}}
function saveCmp(){sv('tz_cmp',cmp);saveList('comparisons',cmp);renderChrome()}
function saveWish(){sv('tz_wish',wish);saveList('wishlists',wish);renderChrome()}
async function syncLists(u){try{for(const [col,k] of [['comparisons','cmp'],['wishlists','wish']]){
  const s=await fb.getDoc(fb.doc(db,col,u.uid)),rem=s.exists()?(s.data().items||[]):[];
  const m=[...new Set([...rem,...(k==='cmp'?cmp:wish)])].filter(id=>!PRODUCTS.length||P(id)).slice(0,k==='cmp'?MAXC:200);
  if(k==='cmp')cmp=m;else wish=m;sv('tz_'+k,m);await fb.setDoc(fb.doc(db,col,u.uid),{items:m,updatedAt:Date.now()})}}catch(e){console.error(e)}}
function addCmp(id){if(cmp.includes(id))return toast('⚖ '+t('cmpDup'),1);if(cmp.length>=MAXC)return toast(t('cmpMax'),1);cmp=[...cmp,id];saveCmp();toast('✓ '+t('cmpAdd')+` (${cmp.length}/${MAXC})`)}
function syncCmp(){document.querySelectorAll('[data-c]').forEach(b=>{const on=cmp.includes(b.dataset.c);b.classList.toggle('on',on);b.textContent=on?'✓ '+t('inCompare'):'⚖ '+t('compare')})}
const cmpBtn=(id,c='')=>`<button type="button" class="${c} cmpb${cmp.includes(id)?' on':''}" data-c="${id}">${cmp.includes(id)?'✓ '+t('inCompare'):'⚖ '+t('compare')}</button>`;
function cbar(){let b=$('#cbar');if(!b){b=document.createElement('div');b.id='cbar';document.body.appendChild(b)}
 const hide=!cmp.length||location.hash.startsWith('#/compare');b.hidden=hide;if(hide)return;
 b.innerHTML=`<span>⚖ ${cmp.length}/${MAXC}</span><button class="btn" id="cbg">${t('cmpGo')}</button><button class="btn btn2" id="cbc">${t('clearAll')}</button>`;
 $('#cbg').onclick=()=>cmp.length<2?toast(t('cmpMin'),1):(location.hash='#/compare');$('#cbc').onclick=()=>{cmp=[];saveCmp();syncCmp();cbar()}}
const avatar=(src,name,s=30)=>src?`<img class="av" style="width:${s}px;height:${s}px" src="${esc(src)}" alt="" referrerpolicy="no-referrer">`:`<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.45)}px">${esc((name||'?')[0].toUpperCase())}</span>`;
function userMenu(){
 if(!CFG||!user)return `<a class="ibtn hide-m" href="#/login">${t('login')}</a><a class="ibtn show-m" href="#/login" title="${t('account')}" aria-label="${t('account')}">👤</a>`;
 return `<div class="um"><button class="ibtn" id="umb" aria-haspopup="true" aria-expanded="false" aria-label="${t('account')}">${avatar(user.photoURL,user.displayName||user.email)}</button><div class="umm" id="umm" hidden><div class="uh">${esc(user.displayName||'')}<br>${esc(user.email||'')}</div>${isAdmin()?`<a href="#/admin">⚙ ${lang==='ar'?'لوحة الأدمن':'Admin panel'}</a>`:''}<a href="#/account">👤 ${t('tab_profile')}</a><a href="#/account/orders">📦 ${t('tab_orders')}</a><a href="#/wishlist">❤ ${t('wishlist')}</a><a href="#/compare">⚖ ${t('compare')}</a><button id="umo">🚪 ${t('logout')}</button></div></div>`}
let menuBound=false;
function bindMenu(){const b=$('#umb'),m=$('#umm');if(b){b.onclick=e=>{e.stopPropagation();m.hidden=!m.hidden;b.setAttribute('aria-expanded',String(!m.hidden))};m.onclick=e=>{if(e.target.closest('a'))m.hidden=true};$('#umo').onclick=logout}
 if(!menuBound){menuBound=true;document.addEventListener('click',()=>{const m=$('#umm');if(m)m.hidden=true})}}
async function logout(){try{await fb.signOut(auth);toast('✓ '+t('loggedOut'));location.hash='#/'}catch{toast(t('err'),1)}}
function contactLines(){return `📞 <a href="tel:${esc(store.phone)}" dir="ltr">${esc(store.phone)}</a><br>💬 <a href="https://wa.me/${esc(store.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><br>✉ <a href="mailto:${esc(store.email)}">${esc(store.email)}</a>${store.cashNumber?`<br>💳 ${t('vcash')}: <b dir="ltr">${esc(store.cashNumber)}</b>`:''}`}
function socialLinks(){const s=store.social||{};return [['tiktok','TikTok','🎵'],['instagram','Instagram','📸'],['facebook','Facebook','👍']].filter(x=>s[x[0]]).map(x=>`<a href="${esc(s[x[0]])}" target="_blank" rel="noopener noreferrer">${x[2]} ${x[1]}</a>`).join('<br>')}
const vEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),vPhone=p=>/^01[0-9]{9}$/.test(p||''),vPass=p=>(p||'').length>=8&&/[A-Za-z]/.test(p)&&/\d/.test(p);
const aerr=x=>T[lang]['e_'+String(x?.code||'').replace('auth/','').replace(/-/g,'_')]||t('err');
const pw=(n,l,ac,c='')=>`<label class="${c}">${l}<span class="pw"><input type="password" name="${n}" required autocomplete="${ac}"><button type="button" class="eye" data-eye aria-label="${t('showPass')}">👁</button></span></label>`;
const bindEye=r=>r.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const i=b.previousElementSibling;i.type=i.type==='password'?'text':'password'});
async function google(fe){if(!CFG)return fe(t('demo'));try{const c=await fb.signInWithPopup(auth,new fb.GoogleAuthProvider()),r=fb.doc(db,'users',c.user.uid);
 if(!(await fb.getDoc(r)).exists())await fb.setDoc(r,{name:c.user.displayName||'',email:c.user.email||'',phone:'',photoURL:c.user.photoURL||'',createdAt:Date.now()})}catch(x){fe(aerr(x))}}
// ---------- components
const stars=r=>'★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r));
function card(p){const w=wish.includes(p.id);return `<article class="pc">${p.discount?`<span class="dsc">-${p.discount}%</span>`:''}<button class="wl" data-w="${p.id}" aria-label="wishlist">${w?'❤':'🤍'}</button>
<a class="im" href="#/product/${p.id}"><img loading="lazy" src="${p.images[0]}" alt="${esc(L(p,'name'))}"></a><div class="bd"><span class="br">${esc(p.brand)}</span>
<h3><a href="#/product/${p.id}">${esc(L(p,'name'))}</a></h3><p class="sd" dir="auto">${esc(L(p,'description'))}</p><div class="stars">${stars(p.rating)} <small>(${p.reviewCount})</small></div>
<div><span class="pr">${money(p.price)}</span>${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span>`:''}</div>
<span class="${p.stock>0?'ok':'no'}">${p.stock>0?'● '+t('inStock')+(p.stock<=3?` (${p.stock} ${t('left')})`:''):t('out')}</span>
<div class="acts"><button class="btn" style="flex:1" data-a="${p.id}" ${p.stock<1?'disabled':''}>${t('add')}</button><a class="btn btn2" href="#/product/${p.id}">${t('view')}</a></div>${cmpBtn(p.id)}</div></article>`}
function bind(root){root.querySelectorAll('[data-a]').forEach(b=>b.onclick=e=>{e.preventDefault();addCart(b.dataset.a)});
  root.querySelectorAll('[data-w]').forEach(b=>b.onclick=e=>{e.preventDefault();const i=b.dataset.w;wish=wish.includes(i)?wish.filter(x=>x!==i):[...wish,i];saveWish();b.textContent=wish.includes(i)?'❤':'🤍';if(/^#\/(wishlist|account\/wishlist)/.test(location.hash))route()});
  root.querySelectorAll('[data-c]').forEach(b=>b.onclick=e=>{e.preventDefault();addCmp(b.dataset.c);syncCmp()})}
const catImg=c=>(PRODUCTS.find(p=>(GROUPS[c]||[c]).includes(p.categoryId))||{images:['']}).images[0];
// ---------- pages
const R={};
R.home=()=>{const f=PRODUCTS.filter(p=>p.featured||p.discount>=8).slice(0,8),n=[...PRODUCTS].sort((a,b)=>b.createdAt-a.createdAt).slice(0,8);
 return `<div class="wrap">${CFG?'':`<div class="demo">⚠ ${t('demo')}</div>`}
<a class="hero" href="#/products" aria-label="${t('shop')}"><picture><source media="(max-width:700px)" srcset="hero-mobile.jpg"><img src="hero.jpg" alt="THE ULTIMATE GAMING GEAR – TECH ZONE" fetchpriority="high"></picture></a>
<div style="text-align:center"><a class="btn" href="#/products" style="font-size:1.05rem;padding:12px 40px;margin-top:4px">${t('shop')} ›</a></div>
<div class="srv"><div>🛡️ ${t('s1')}</div><div>🏅 ${t('s2')}</div><div>🚚 ${t('s3')}</div><div>🔒 ${t('s4')}</div><div>🎧 ${t('s5')}</div></div>
<h2 class="t">${t('cats')}</h2><div class="cats">${CATS.map(([c,i])=>`<a class="cat" href="#/cat/${c}"><img loading="lazy" src="${catImg(c)}" alt=""><b>${i} ${t(c)}</b></a>`).join('')}</div>
<h2 class="t">${t('featured')}</h2><div class="grid">${f.map(card).join('')}</div>
<h2 class="t">${t('latest')}</h2><div class="grid">${n.map(card).join('')}</div>
${isAdmin()?aboutSection():''}
<!-- ============ FEEDBACK ============ -->
<div class="fbh"><h2 class="t" style="margin:30px 0 14px">${t('feedback')}</h2><button class="btn" id="addfb" type="button">⭐ ${t('addFb')}</button></div><div class="grid" id="fbk"></div></div>`};
const mem=m=>`<div class="mem"><div class="av2"><img src="${m.img}" alt="${esc(L(m,'name'))}" loading="lazy" onerror="this.outerHTML='<div class=ph>👤</div>'"></div><span class="pill">${t('memberBadge')}</span><b>${esc(L(m,'name'))}</b><small>${esc(L(about,'college'))} - ${lang==='ar'?'مجموعة':'Group'} ${esc(about.groupNo)}</small></div>`;
function aboutSection(){return `<section class="about" id="about"><div class="ahead"><span class="pill pill-lg">${esc(L(about,'college'))}</span>
<h2 class="atitle">${t('aboutTitle')} <span class="grad">TECH ZONE</span> 🎓</h2>
<p class="asub">${esc(L(about,'type'))} <i>•</i> <b>${t('groupLbl')}: ${esc(about.groupNo)}</b> <i>•</i> ${t('yearLbl')}: ${esc(about.year)}</p></div>
<div class="dcard"><div class="av2 big"><img src="${doctor.img}" alt="${esc(L(doctor,'name'))}" loading="lazy" onerror="this.outerHTML='<div class=ph>👤</div>'"></div><span class="pill">${t('doctor')}</span><b>${esc(L(doctor,'name'))}</b><small>${esc(L(doctor,'title'))}</small></div>
<div class="team">${team.map(mem).join('')}</div></section>`}
R.about=()=>isAdmin()?`<div class="wrap">${aboutSection()}</div>`:(authReady?go(''):'<div class="spin"></div>');
R.cat=a=>go('products?cat='+a[0]);
function qs(){const h=location.hash.split('?')[1]||'';return Object.fromEntries(new URLSearchParams(h))}
let page=1;
R.products=()=>{const o=qs();const brands=[...new Set(PRODUCTS.map(p=>p.brand))].sort();
 return `<div class="wrap"><h2 class="t">${o.cat?t(o.cat):o.q?`“${esc(o.q)}”`:t('products')}</h2><div class="lay"><aside class="side">
 <select id="fs"><option value="new">${t('nw')}</option><option value="pl">${t('pLow')}</option><option value="ph">${t('pHigh')}</option><option value="best">${t('best')}</option><option value="rate">${t('rated')}</option></select>
 <select id="fb"><option value="">${t('allB')}</option>${brands.map(b=>`<option>${esc(b)}</option>`).join('')}</select>
 <select id="fc"><option value="">${t('cats')}</option>${CATS.map(([c])=>`<option value="${c}">${t(c)}</option>`).join('')}</select>
 <label>${t('maxP')}: <b id="pv"></b><input id="fp" type="range" min="500" max="200000" step="500" value="200000"></label>
 <label><input type="checkbox" id="fst" style="width:auto"> ${t('onlyStock')}</label><label><input type="checkbox" id="fd" style="width:auto"> ${t('onlyDeal')}</label>
 <select id="fr"><option value="0">★ 0+</option><option value="4">★ 4+</option><option value="4.5">★ 4.5+</option></select></aside><div><div class="grid" id="pl"></div><div class="pg" id="pg"></div></div></div></div>`};
R.products.after=()=>{const o=qs();$('#fc').value=o.cat||'';$('#fs').value=o.sort==='new'?'new':'new';$('#fd').checked=!!o.deals;
 const run=()=>{let r=PRODUCTS.slice();const c=$('#fc').value,b=$('#fb').value,mx=+$('#fp').value;$('#pv').textContent=money(mx);
  if(c)r=r.filter(p=>(GROUPS[c]||[c]).includes(p.categoryId));if(b)r=r.filter(p=>p.brand===b);r=r.filter(p=>p.price<=mx&&p.rating>=+$('#fr').value);
  if($('#fst').checked)r=r.filter(p=>p.stock>0);if($('#fd').checked)r=r.filter(p=>p.discount>0);if(o.q)r=search(o.q).filter(p=>r.includes(p));
  const s=$('#fs').value;r.sort({new:(a,b)=>b.createdAt-a.createdAt,pl:(a,b)=>a.price-b.price,ph:(a,b)=>b.price-a.price,best:(a,b)=>b.bestSeller-a.bestSeller,rate:(a,b)=>b.rating-a.rating}[s]);
  const per=12,pages=Math.ceil(r.length/per);page=Math.min(page,pages||1);
  $('#pl').innerHTML=r.length?r.slice((page-1)*per,page*per).map(card).join(''):`<p>${t('empty')}</p>`;bind($('#pl'));
  $('#pg').innerHTML=Array.from({length:pages},(_,i)=>`<button class="${i+1===page?'on':''}" data-p="${i+1}">${i+1}</button>`).join('');
  $('#pg').querySelectorAll('button').forEach(x=>x.onclick=()=>{page=+x.dataset.p;run();scrollTo({top:0,behavior:'smooth'})})};
 document.querySelectorAll('.side select,.side input').forEach(e=>e.oninput=()=>{page=1;run()});run()};
R.product=a=>{const p=P(a[0]);if(!p)return `<div class="wrap"><p>${t('empty')}</p></div>`;recent=[p.id,...recent.filter(x=>x!==p.id)].slice(0,8);sv('tz_recent',recent);
 document.title=L(p,'name')+' | TECH ZONE';
 const sp=L(p,'specifications'),rel=PRODUCTS.filter(x=>x.categoryId===p.categoryId&&x.id!==p.id).slice(0,4),rc=recent.filter(x=>x!==p.id).map(P).filter(Boolean).slice(0,4);
 const fbt=PRODUCTS.filter(x=>x.categoryId!==p.categoryId&&['mice','keyboards','headsets','ram','storage'].includes(x.categoryId)).slice(0,2);
 return `<div class="wrap"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.name_en,sku:p.sku,brand:{'@type':'Brand',name:p.brand},image:p.images,offers:{'@type':'Offer',priceCurrency:'EGP',price:p.price,availability:p.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock'}})}</script>
 <div class="det"><div><div class="main-img" id="mi"><img id="mimg" src="${p.images[0]}" alt="${esc(L(p,'name'))}"></div><div class="thumbs">${p.images.map((x,i)=>`<img src="${x}" class="${i?'':'on'}" alt="">`).join('')}</div></div>
 <div class="box"><span class="br">${esc(p.brand)}</span><h1 style="font-size:1.5rem">${esc(L(p,'name'))}</h1><div class="stars">${stars(p.rating)} (${p.reviewCount} ${t('reviews')})</div>
 <p><span class="pr" style="font-size:1.8rem">${money(p.price)}</span>${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span> <span class="dsc" style="position:static">-${p.discount}%</span>`:''}</p>
 <p class="${p.stock>0?'ok':'no'}">${p.stock>0?'● '+t('inStock')+` (${p.stock})`:t('out')}</p>
 <table><tr><td>${t('brand')}</td><td>${esc(p.brand)}</td></tr><tr><td>${t('model')}</td><td>${esc(p.model)}</td></tr><tr><td>${t('sku')}</td><td>${p.sku}</td></tr><tr><td>${t('warranty')}</td><td>${esc(L(p,'warranty'))}</td></tr><tr><td>🚚</td><td>${t('delivery')}</td></tr></table>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center"><div class="qty"><button id="qm">−</button><span id="qv">1</span><button id="qp">+</button></div>
 <button class="btn" id="ac" ${p.stock<1?'disabled':''}>${t('add')}</button><button class="btn btn2" id="bn" ${p.stock<1?'disabled':''}>${t('buyNow')}</button><button class="btn btn2" data-w="${p.id}">${wish.includes(p.id)?'❤':'🤍'}</button>${cmpBtn(p.id,'btn btn2')}</div></div></div>
 <h2 class="t">${t('desc')}</h2><div class="box">${esc(L(p,'description'))}</div>
 <h2 class="t">${t('specs')}</h2><div class="box"><table>${sp.map(s=>`<tr><td>${esc(s.label)}</td><td dir="auto">${esc(s.value)}</td></tr>`).join('')}</table></div>
 ${fbt.length?`<h2 class="t">${t('fbt')}</h2><div class="grid">${[p,...fbt].map(card).join('')}</div>`:''}
 <h2 class="t">${t('related')}</h2><div class="grid">${rel.map(card).join('')}</div>${rc.length?`<h2 class="t">${t('recent')}</h2><div class="grid">${rc.map(card).join('')}</div>`:''}</div>`};
R.product.after=a=>{const p=P(a[0]);if(!p)return;let q=1;const set=()=>$('#qv').textContent=q;
 $('#qm').onclick=()=>{q=Math.max(1,q-1);set()};$('#qp').onclick=()=>{q=Math.min(p.stock,q+1);set()};
 $('#ac').onclick=()=>addCart(p.id,q);$('#bn').onclick=()=>{addCart(p.id,q,1);location.hash='#/checkout'};
 document.querySelectorAll('.thumbs img').forEach(i=>i.onclick=()=>{$('#mimg').src=i.src;document.querySelectorAll('.thumbs img').forEach(x=>x.classList.remove('on'));i.classList.add('on')});
 $('#mi').onclick=()=>{const l=$('#lightbox');l.innerHTML=`<img src="${$('#mimg').src}" alt="">`;l.hidden=false;l.onclick=()=>l.hidden=true};bind(document)};
let coupon=null;
R.cart=()=>{const ids=Object.keys(cart).filter(P);if(!ids.length)return `<div class="wrap"><h2 class="t">${t('cart')}</h2><div class="box">${t('cartEmpty')}<br><br><a class="btn" href="#/products">${t('cont')}</a></div></div>`;
 const tt=totals(coupon);return `<div class="wrap"><h2 class="t">${t('cart')}</h2><div class="box">${ids.map(id=>{const p=P(id);return `<div class="crow"><img src="${p.images[0]}" alt=""><div><a href="#/product/${id}"><b>${esc(L(p,'name'))}</b></a><br>${money(p.price)}<br><span class="no">${cart[id]>=p.stock?t('left')+': '+p.stock:''}</span></div>
 <div><div class="qty"><button data-q="${id}" data-d="-1">−</button><span>${cart[id]}</span><button data-q="${id}" data-d="1">+</button></div><br><a href="#" data-r="${id}" class="no">${t('remove')}</a></div></div>`}).join('')}</div>
 <div class="box"><div style="display:flex;gap:6px"><input id="cc" placeholder="${t('coupon')}"><button class="btn" id="ca">${t('apply')}</button></div><br>${summary(tt)}<br><a class="btn" href="#/checkout" style="width:100%">${t('checkout')}</a><br><br><a class="btn btn2" href="#/products" style="width:100%">${t('cont')}</a></div></div>`};
const summary=tt=>`<table><tr><td>${t('subtotal')}</td><td>${money(tt.sub)}</td></tr>${tt.disc?`<tr><td>${t('discount')}</td><td>-${money(tt.disc)}</td></tr>`:''}<tr><td>${t('shipping')}</td><td>${tt.ship?money(tt.ship):'🎁 0'}</td></tr><tr><td><b>${t('total')}</b></td><td><b>${money(tt.total)}</b></td></tr></table>`;
async function checkCoupon(code){ // coupon display only; the server re-validates it
  if(!CFG)return toast(t('demo'),1);try{const s=await fb.getDoc(fb.doc(db,'coupons',code.trim().toUpperCase()));if(s.exists()&&s.data().active){coupon=s.data();toast('✓ '+code)}else{coupon=null;toast('✗',1)}}catch{toast(t('err'),1)}route()}
R.cart.after=()=>{document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const id=b.dataset.q,n=cart[id]+ +b.dataset.d;if(n<1)delete cart[id];else cart[id]=Math.min(n,P(id).stock);saveCart();route()});
 document.querySelectorAll('[data-r]').forEach(b=>b.onclick=e=>{e.preventDefault();delete cart[b.dataset.r];saveCart();route()});const ca=$('#ca');if(ca)ca.onclick=()=>checkCoupon($('#cc').value)};
R.checkout=()=>{if(!cartCount())return go('cart');const tt=totals(coupon);
 return `<div class="wrap"><h2 class="t">${t('checkout')}</h2>${CFG?'':`<div class="demo">⚠ ${t('demo')}</div>`}<div class="lay" style="grid-template-columns:1fr 340px"><form id="co" class="box form">
 <input class="f" name="name" required placeholder="${t('name')}" value="${esc(user?.displayName||'')}"><input name="phone" required pattern="01[0-9]{9}" placeholder="${t('phone')} (01xxxxxxxxx)"><input type="email" name="email" required placeholder="${t('email')}" value="${esc(user?.email||'')}">
 <select name="gov" required><option value="">${t('gov')}</option>${GOVS.map(g=>`<option>${g}</option>`).join('')}</select><input name="city" required placeholder="${t('city')}"><input class="f" name="address" required minlength="8" placeholder="${t('addr')}"><textarea class="f" name="notes" placeholder="${t('notes')}"></textarea>
 <div class="f"><b>${t('shipMethod')}</b><div id="shm">${shippingMethods.map((m,n)=>`<label class="opt"><input type="radio" name="sm" value="${m.id}" ${n?'':'checked'} style="width:auto"><span><b>${esc(L(m,'name'))}</b><small>${esc(L(m,'days'))}${m.govs?'':''}</small></span><em>${m.id==='standard'?(totals(coupon,'standard').ship?money(m.fee):'🎁 '+t('freeLbl')):(m.fee?money(m.fee):t('freeLbl'))}</em></label>`).join('')}</div></div>
 <div class="f"><b>${t('pay')}</b><div id="pmm">
 <label class="opt"><input type="radio" name="pm" value="cod" checked style="width:auto"><span><b>💵 ${t('cod')}</b></span></label>
 <label class="opt"><input type="radio" name="pm" value="online" style="width:auto"><span><b>💳 ${t('online')}</b></span></label>
 <label class="opt"><input type="radio" name="pm" value="vcash" style="width:auto"><span><b>📱 ${t('vcash')}</b></span></label>
 <label class="opt"><input type="radio" name="pm" value="instapay" style="width:auto"><span><b>⚡ ${t('instapay')}</b></span></label>
 <label class="opt"><input type="radio" name="pm" value="bank" style="width:auto"><span><b>🏦 ${t('bank')}</b></span></label></div>
 <div id="vbox" class="vbox" hidden></div></div>
 <button class="btn f" id="po">${t('place')}</button></form><div class="box">${Object.keys(cart).filter(P).map(i=>`<p>${cart[i]}× ${esc(L(P(i),'name'))}</p>`).join('')}<br><div id="sm">${summary(tt)}</div></div></div></div>`};
const payBox=(pm)=>{const c=(v)=>`<b dir="ltr">${esc(v||'')}</b> <button type="button" class="btn btn2" data-cp="${esc(v||'')}">${t('copy')}</button>`;
 if(pm==='vcash')return `<p>${t('vcashNote')} ${c(store.cashNumber)}</p><input name="vs" maxlength="11" inputmode="tel" placeholder="${t('payRefVc')}"><small>${t('payAfter')}</small>`;
 if(pm==='instapay')return `<p>${t('instaNote')} ${c(store.instapay)}</p><input name="vs" maxlength="60" placeholder="${t('payRef')}"><small>${t('payAfter')}</small>`;
 if(pm==='bank')return `<p>${t('bankNote')}</p><p>🏦 <b>${esc(store.bankName||'')}</b><br>👤 ${esc(store.bankHolder||'')}<br>${c(store.bankAccount)}</p><input name="vs" maxlength="60" placeholder="${t('payRef')}"><small>${t('payAfter')}</small>`;return ''};
R.checkout.after=()=>{const form=$('#co');if(!form)return;const sel=n=>form.querySelector(`[name=${n}]:checked`)?.value;
 const upd=()=>{const sm=sel('sm'),m=SM(sm),gov=form.gov.value;const bad=m.govs&&gov&&!m.govs.includes(gov);$('#sm').innerHTML=summary(totals(coupon,sm))+(m.govs?`<small>${t('sameDayOnly')}</small>`:'');return !bad};
 const pbox=()=>{const pm=sel('pm'),b=$('#vbox');b.innerHTML=payBox(pm);b.hidden=!b.innerHTML;b.querySelectorAll('[data-cp]').forEach(x=>x.onclick=()=>{navigator.clipboard?.writeText(x.dataset.cp);toast('✓ '+t('copied'))})};
 form.querySelectorAll('[name=sm]').forEach(r=>r.onchange=upd);form.gov.onchange=upd;form.querySelectorAll('[name=pm]').forEach(r=>r.onchange=pbox);upd();pbox();
 form.onsubmit=async e=>{e.preventDefault();if(!CFG)return toast(t('demo'),1);const f=Object.fromEntries(new FormData(form));f.pm=sel('pm');f.sm=sel('sm');
  if(!upd())return toast(t('sameDayOnly'),1);
  if(f.pm==='vcash'&&!/^01[0-9]{9}$/.test(f.vs||''))return toast(t('v_phone'),1);
  if((f.pm==='instapay'||f.pm==='bank')&&String(f.vs||'').trim().length<3)return toast(t('req'),1);
  $('#po').disabled=true;
  try{const r=await fb.httpsCallable(fn,'createOrder')({items:Object.entries(cart).map(([id,qty])=>({id,qty})),customer:{name:f.name,phone:f.phone,email:f.email,gov:f.gov,city:f.city,address:f.address,notes:f.notes},payment:f.pm,shippingMethod:f.sm,vcashSender:f.vs||'',coupon:coupon?coupon.code:null,lang});
   const d=r.data;if(f.pm==='online'&&d.paymentUrl){location.href=d.paymentUrl;return} // order stays "pending/unpaid" until Paymob webhook confirms
   sessionStorage.setItem('tz_vc',['vcash','instapay','bank'].includes(f.pm)?f.pm:'');cart={};coupon=null;await saveCart();location.hash='#/confirm/'+d.orderNumber}catch(x){toast(x.message||t('err'),1);$('#po').disabled=false}}};
R.confirm=a=>`<div class="wrap"><div class="box" style="text-align:center"><h2>✅ ${t('confirmTitle')}</h2><p style="font-size:1.4rem;margin:12px">${t('orderNo')}: <b>${esc(a[0])}</b></p>${({vcash:`<p>${t('vcashAfter')} <b dir="ltr">${esc(store.cashNumber||'')}</b></p>`,instapay:`<p>${t('instaNote')} <b dir="ltr">${esc(store.instapay||'')}</b></p>`,bank:`<p>${t('bankNote')} <b>${esc(store.bankName||'')} – ${esc(store.bankHolder||'')} – <span dir="ltr">${esc(store.bankAccount||'')}</span></b></p>`})[sessionStorage.getItem('tz_vc')]||''}<a class="btn" href="#/track">${t('track')}</a></div></div>`;
const STEPS=['pending','confirmed','processing','shipped','out_for_delivery','delivered'];
const orderBox=o=>`<div class="box"><b>${t('orderNo')}: ${esc(o.orderNumber)}</b> · ${new Date(o.createdAt).toLocaleDateString()}<div class="steps" style="margin:8px 0">${o.status==='cancelled'?`<span class="st on" style="background:var(--disc)">${t('cancelled')}</span>`:STEPS.map((s,i)=>`<span class="st ${i<=STEPS.indexOf(o.status)?'on':''}">${t(s)}</span>`).join('')}</div>
 ${o.items.map(i=>`<p>${i.qty}× ${esc(lang==='ar'?i.name_ar:i.name_en)} — ${money(i.price)}</p>`).join('')}<p>${t('total')}: <b>${money(o.total)}</b> · ${({cod:t('cod'),online:t('online'),vcash:t('vcash'),instapay:t('instapay'),bank:t('bank')})[o.payment]||o.payment} (${o.paid?'✓':'—'})</p><p>📍 ${esc(o.customer.gov)}, ${esc(o.customer.city)}, ${esc(o.customer.address)}</p></div>`;
R.track=()=>`<div class="wrap"><h2 class="t">${t('track')}</h2><div id="ol">${user?t('loading'):''}</div><form id="tf" class="box form"><b class="f">${t('trackBy')}</b><input name="n" placeholder="${t('orderNo')}" required><input name="p" placeholder="${t('phone')}" required><button class="btn f">${t('track')}</button></form><div id="tr"></div></div>`;
R.track.after=async()=>{if(user&&db){const s=await fb.getDocs(fb.query(fb.collection(db,'orders'),fb.where('uid','==',user.uid)));const o=s.docs.map(d=>d.data()).sort((a,b)=>b.createdAt-a.createdAt);$('#ol').innerHTML=o.map(orderBox).join('')||t('empty')}
 $('#tf').onsubmit=async e=>{e.preventDefault();if(!CFG)return toast(t('demo'),1);const f=Object.fromEntries(new FormData(e.target));try{const r=await fb.httpsCallable(fn,'trackOrder')({orderNumber:f.n.trim(),phone:f.p.trim()});$('#tr').innerHTML=orderBox(r.data)}catch(x){toast(x.message||t('err'),1)}}};
R.wishlist=()=>`<div class="wrap"><h2 class="t">${t('wishlist')}</h2><div class="grid">${wish.map(P).filter(Boolean).map(card).join('')||t('empty')}</div></div>`;
R.compare=()=>{const ps=cmp.map(P).filter(Boolean);
 if(!ps.length)return `<div class="wrap"><h2 class="t">${t('compare')}</h2><div class="box empty-st"><div style="font-size:3rem">⚖</div><h3>${t('cmpEmptyTitle')}</h3><p>${t('compareEmpty')}</p><br><a class="btn" href="#/products">＋ ${t('addProduct')}</a></div></div>`;
 const labels=[...new Set(ps.flatMap(p=>L(p,'specifications').map(s=>s.label)))],sv_=(p,k)=>esc((L(p,'specifications').find(s=>s.label===k)||{}).value||'—');
 const row=(k,f)=>`<tr><th scope="row">${k}</th>${ps.map(p=>`<td dir="auto">${f(p)}</td>`).join('')}</tr>`;
 return `<div class="wrap"><div class="cmph"><h2 class="t" style="margin:30px 0 14px">${t('compare')} (${ps.length}/${MAXC})</h2><div class="cmpa"><a class="btn btn2" href="#/products">＋ ${t('addProduct')}</a><button class="btn btn2 dng" id="cclr">🗑 ${t('clearAll')}</button></div></div>
 ${ps.length<2?`<div class="demo">${t('cmpMin')}</div>`:''}<div class="cmpw"><table class="cmpt"><thead><tr><th></th>${ps.map(p=>`<th class="cmpp"><button class="x" data-rc="${p.id}" aria-label="${t('remove')}" title="${t('remove')}">✕</button><a href="#/product/${p.id}"><img src="${p.images[0]}" alt=""><b>${esc(L(p,'name'))}</b></a><br><button class="btn btn2 rm" data-rc="${p.id}">${t('remove')}</button></th>`).join('')}</tr></thead><tbody>
 ${row(t('brand'),p=>esc(p.brand))}${row(t('price'),p=>`<b>${money(p.price)}</b>`)}${row(t('cats'),p=>t(p.categoryId))}${labels.map(k=>row(esc(k),p=>sv_(p,k))).join('')}
 ${row(t('warranty'),p=>esc(L(p,'warranty')))}${row(t('availability'),p=>p.stock>0?`<span class="ok">● ${t('inStock')}</span>`:`<span class="no">${t('out')}</span>`)}${row(t('rating'),p=>p.reviewCount?`<span class="stars">${stars(p.rating)}</span> ${p.rating}`:'—')}
 ${row('',p=>`<button class="btn" data-a="${p.id}" ${p.stock<1?'disabled':''}>${t('add')}</button>`)}</tbody></table></div></div>`};
R.compare.after=()=>{document.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>{cmp=cmp.filter(x=>x!==b.dataset.rc);saveCmp();toast('✓ '+t('cmpRemoved'));route()});
 const c=$('#cclr');if(c)c.onclick=()=>{if(confirm(t('cmpClearQ'))){cmp=[];saveCmp();route()}}};
R.login=()=>{if(CFG&&user)return go(isAdmin()?'admin':'account');
 return `<div class="wrap"><div class="authbox box"><h2>${t('login')}</h2>${CFG?'':`<div class="demo">⚠ ${t('demo')}</div>`}<form id="lf" novalidate><label>${t('email')}<input type="email" name="e" required autocomplete="email"></label>${pw('p',t('pass'),'current-password')}
 <div class="rowb"><label class="chk"><input type="checkbox" name="r" checked> ${t('remember')}</label><a href="#" id="fp">${t('forgot')}</a></div><div class="ferr" id="fe" role="alert"></div><button class="btn" id="lb" style="width:100%">${t('login')}</button></form>
 <div class="or"><span>${t('orWith')}</span></div><button class="btn btn2 gbtn" id="gg">G ${t('google')}</button><p class="sw">${t('noAcc')} <a href="#/register">${t('signup')}</a></p></div></div>`};
R.login.after=()=>{const f=$('#lf');if(!f)return;bindEye(f);const fe=m=>{const e=$('#fe');if(e)e.textContent=m||''};
 f.onsubmit=async e=>{e.preventDefault();fe();const d=Object.fromEntries(new FormData(f));if(!vEmail((d.e||'').trim()))return fe(t('v_email'));if(!d.p)return fe(t('req'));if(!CFG)return fe(t('demo'));
  $('#lb').disabled=true;try{await fb.setPersistence(auth,d.r?fb.browserLocalPersistence:fb.browserSessionPersistence);await fb.signInWithEmailAndPassword(auth,d.e.trim(),d.p)}catch(x){if(d.e.trim().toLowerCase()===ADMIN_EMAIL&&d.p===adminAuth.password&&/user-not-found|invalid-credential|invalid-login/.test(x&&x.code||'')){try{const c=await fb.createUserWithEmailAndPassword(auth,d.e.trim(),d.p);try{await fb.updateProfile(c.user,{displayName:'Admin'})}catch{}return}catch(y){if(!y||y.code!=='auth/email-already-in-use')x=y}}fe(aerr(x));const b=$('#lb');if(b)b.disabled=false}};
 $('#fp').onclick=async e=>{e.preventDefault();fe();const em=f.e.value.trim();if(!vEmail(em))return fe(t('v_email'));if(!CFG)return fe(t('demo'));try{await fb.sendPasswordResetEmail(auth,em);toast('✓ '+t('resetSent'))}catch(x){fe(aerr(x))}};
 $('#gg').onclick=()=>google(fe)};
R.register=()=>{if(CFG&&user)return go(isAdmin()?'admin':'account');
 return `<div class="wrap"><div class="authbox box"><h2>${t('signup')}</h2>${CFG?'':`<div class="demo">⚠ ${t('demo')}</div>`}<form id="rf" novalidate><label>${t('fullName')}<input name="n" required autocomplete="name"></label><label>${t('email')}<input type="email" name="e" required autocomplete="email"></label><label>${t('phone')}<input name="ph" inputmode="tel" placeholder="01xxxxxxxxx" required autocomplete="tel"></label>
 ${pw('p',t('pass'),'new-password')}${pw('c',t('confirmPass'),'new-password')}<small style="color:var(--tx2)">${t('passRule')}</small><label class="chk"><input type="checkbox" name="t"> <span>${t('agree')} <a href="#/terms" target="_blank" rel="noopener">${t('terms')}</a></span></label>
 <div class="ferr" id="fe" role="alert"></div><button class="btn" id="rb" style="width:100%">${t('signup')}</button></form><div class="or"><span>${t('orWith')}</span></div><button class="btn btn2 gbtn" id="gg">G ${t('google')}</button><p class="sw">${t('haveAcc')} <a href="#/login">${t('login')}</a></p></div></div>`};
R.register.after=()=>{const f=$('#rf');if(!f)return;bindEye(f);const fe=m=>{const e=$('#fe');if(e)e.textContent=m||''};
 f.onsubmit=async e=>{e.preventDefault();fe();const d=Object.fromEntries(new FormData(f));
  if((d.n||'').trim().length<3)return fe(t('v_name'));if(!vEmail((d.e||'').trim()))return fe(t('v_email'));if(!vPhone(d.ph))return fe(t('v_phone'));if(!vPass(d.p))return fe(t('v_pass'));if(d.p!==d.c)return fe(t('v_match'));if(!d.t)return fe(t('v_terms'));if(!CFG)return fe(t('demo'));
  $('#rb').disabled=true;try{const c=await fb.createUserWithEmailAndPassword(auth,d.e.trim(),d.p);await fb.updateProfile(c.user,{displayName:d.n.trim()});
   await fb.setDoc(fb.doc(db,'users',c.user.uid),{name:d.n.trim(),email:d.e.trim(),phone:d.ph,photoURL:'',createdAt:Date.now()});prof=null;renderChrome();route()}catch(x){fe(aerr(x));const b=$('#rb');if(b)b.disabled=false}};
 $('#gg').onclick=()=>google(fe)};
let prof=null,addrs=null;
const TABS=[['profile','👤'],['edit','✏️'],['password','🔑'],['addresses','📍'],['orders','📦'],['wishlist','❤'],['compare','⚖']];
R.account=a=>{if(!CFG)return `<div class="wrap"><div class="demo">⚠ ${t('demo')}</div></div>`;if(!authReady)return '<div class="spin"></div>';if(!user)return go('login');
 const tab=a[0]||'profile';
 return `<div class="wrap"><h2 class="t">${t('account')}</h2><div class="lay"><aside class="side dnav"><div style="text-align:center">${avatar(prof?.photoURL||user.photoURL,user.displayName||user.email,72)}<br><b>${esc(user.displayName||'')}</b></div>${TABS.map(([k,i])=>`<a href="#/account/${k}" class="${k===tab?'on':''}">${i} ${t('tab_'+k)}</a>`).join('')}<button class="btn btn2" id="lo">${t('logout')}</button></aside><section id="dc"><div class="spin"></div></section></div></div>`};
R.account.after=async a=>{if(!CFG||!user)return;$('#lo').onclick=logout;const tab=a[0]||'profile',uid=user.uid;
 const c=()=>$('#dc'),box=h=>`<div class="box">${h}</div>`,msg=(el,m,ok)=>{const e=el.querySelector('.ferr');if(e){e.textContent=m;e.style.color=ok?'var(--ok)':''}};
 if(!prof||prof.uid!==uid){try{const s=await fb.getDoc(fb.doc(db,'users',uid));prof={uid,...(s.exists()?s.data():{})}}catch{prof={uid}}}
 if(!c())return;const pf={name:prof.name||user.displayName||'',phone:prof.phone||'',photo:prof.photoURL||user.photoURL||''};
 if(tab==='profile')c().innerHTML=`<div class="box prof">${avatar(pf.photo,pf.name||user.email,96)}<div><h3>${esc(pf.name)}</h3><p>✉ ${esc(user.email)}</p><p>📞 ${esc(pf.phone||'—')}</p><br><a class="btn" href="#/account/edit">${t('editProfile')}</a></div></div><div class="srv"><a class="box" href="#/account/orders">📦 ${t('tab_orders')}</a><a class="box" href="#/account/wishlist">❤ ${t('wishlist')} (${wish.length})</a><a class="box" href="#/compare">⚖ ${t('compare')} (${cmp.length})</a><a class="box" href="#/account/addresses">📍 ${t('tab_addresses')}</a></div>`;
 else if(tab==='edit'){c().innerHTML=box(`<form id="ef" class="form" novalidate><div class="f" style="text-align:center">${avatar(pf.photo,pf.name,96)}</div><label class="f">${t('photo')}<input type="file" name="ph" accept="image/*"></label><label>${t('fullName')}<input name="n" value="${esc(pf.name)}" required></label><label>${t('phone')}<input name="p" value="${esc(pf.phone)}" inputmode="tel" required></label><div class="ferr f" role="alert"></div><button class="btn f">${t('save')}</button></form>`);
  const f=$('#ef');f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f)),fl=f.ph.files[0];
   if(d.n.trim().length<3)return msg(f,t('v_name'));if(!vPhone(d.p))return msg(f,t('v_phone'));if(fl&&(!fl.type.startsWith('image/')||fl.size>2*1024*1024))return msg(f,t('v_photo'));
   const b=f.querySelector('button.btn');b.disabled=true;msg(f,t('loading'),1);
   try{let url=pf.photo;if(fl){const sm=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'),r=sm.ref(sm.getStorage(),'avatars/'+uid+'/avatar');await sm.uploadBytes(r,fl);url=await sm.getDownloadURL(r)}
    await fb.updateProfile(user,{displayName:d.n.trim(),photoURL:url||null});await fb.setDoc(fb.doc(db,'users',uid),{name:d.n.trim(),email:user.email,phone:d.p,photoURL:url||'',createdAt:prof.createdAt||Date.now()});
    prof={...prof,name:d.n.trim(),phone:d.p,photoURL:url||''};toast('✓ '+t('saved'));renderChrome();location.hash='#/account'}catch(x){msg(f,aerr(x));b.disabled=false}}}
 else if(tab==='password'){const hp=user.providerData.some(p=>p.providerId==='password');
  c().innerHTML=box(hp?`<form id="pf" class="form" novalidate>${pw('cp',t('curPass'),'current-password','f')}${pw('np',t('newPass'),'new-password')}${pw('cf',t('confirmPass'),'new-password')}<div class="ferr f" role="alert"></div><button class="btn f">${t('changePass')}</button></form>`:`<p>${t('pwGoogle')}</p>`);
  const f=$('#pf');if(f){bindEye(f);f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));if(!vPass(d.np))return msg(f,t('v_pass'));if(d.np!==d.cf)return msg(f,t('v_match'));
   try{await fb.reauthenticateWithCredential(user,fb.EmailAuthProvider.credential(user.email,d.cp));await fb.updatePassword(user,d.np);f.reset();msg(f,'✓ '+t('passChanged'),1);toast('✓ '+t('passChanged'))}catch(x){msg(f,aerr(x))}}}}
 else if(tab==='addresses'){if(!addrs){try{const s=await fb.getDoc(fb.doc(db,'addresses',uid));addrs=s.exists()?(s.data().items||[]):[]}catch{addrs=[]}}
  const put=()=>fb.setDoc(fb.doc(db,'addresses',uid),{items:addrs,updatedAt:Date.now()}),draw=()=>{if(!c())return;
   c().innerHTML=`<div class="box"><h3>${t('tab_addresses')}</h3>${addrs.map(x=>`<div class="crow" style="grid-template-columns:1fr auto"><div><b>${esc(x.label)}</b><br>${esc(x.name)} · ${esc(x.phone)}<br>📍 ${esc(x.gov)}, ${esc(x.city)}, ${esc(x.address)}</div><button class="btn btn2 dng" data-da="${x.id}">${t('remove')}</button></div>`).join('')||`<p>${t('noAddr')}</p>`}</div><div class="box"><h3>${t('addAddr')}</h3><form id="af2" class="form" novalidate><input name="l" placeholder="${t('addrLabel')}"><input name="n" placeholder="${t('name')}"><input name="p" placeholder="${t('phone')} (01xxxxxxxxx)" inputmode="tel"><select name="g"><option value="">${t('gov')}</option>${GOVS.map(g=>`<option>${g}</option>`).join('')}</select><input name="c" placeholder="${t('city')}"><input class="f" name="a" placeholder="${t('addr')}"><div class="ferr f" role="alert"></div><button class="btn f">${t('save')}</button></form></div>`;
   c().querySelectorAll('[data-da]').forEach(b=>b.onclick=async()=>{const old=addrs;addrs=addrs.filter(x=>x.id!==b.dataset.da);try{await put();draw()}catch{addrs=old;toast(t('err'),1)}});
   const f=$('#af2');f.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));if(addrs.length>=10)return msg(f,t('addrMax'));
    if(!d.l.trim()||d.n.trim().length<3||d.c.trim().length<2||d.a.trim().length<8||!d.g)return msg(f,t('req'));if(!vPhone(d.p))return msg(f,t('v_phone'));
    const old=addrs;addrs=[...addrs,{id:'a'+Date.now(),label:d.l.trim(),name:d.n.trim(),phone:d.p,gov:d.g,city:d.c.trim(),address:d.a.trim()}];try{await put();toast('✓ '+t('saved'));draw()}catch{addrs=old;msg(f,t('err'))}}};
  draw()}
 else if(tab==='orders'){try{const s=await fb.getDocs(fb.query(fb.collection(db,'orders'),fb.where('uid','==',uid))),o=s.docs.map(d=>d.data()).sort((x,y)=>y.createdAt-x.createdAt);if(c())c().innerHTML=o.map(orderBox).join('')||box(`<p>${t('noOrders')}</p><a class="btn" href="#/products">${t('cont')}</a>`)}catch{if(c())c().innerHTML=box(t('err'))}}
 else if(tab==='wishlist'){const ps=wish.map(P).filter(Boolean);c().innerHTML=ps.length?`<div class="grid">${ps.map(card).join('')}</div>`:box(`<p>${t('wlEmpty')}</p><a class="btn" href="#/products">${t('cont')}</a>`);bind(c())}
 else if(tab==='compare'){const ps=cmp.map(P).filter(Boolean);c().innerHTML=box(ps.length?`${ps.map(p=>`<p>⚖ <a href="#/product/${p.id}">${esc(L(p,'name'))}</a></p>`).join('')}<br><a class="btn" href="#/compare">${t('cmpGo')}</a>`:`<p>${t('compareEmpty')}</p><a class="btn" href="#/products">${t('addProduct')}</a>`)}
 else go('account/profile')};
R.contact=()=>`<div class="wrap"><h2 class="t">${t('contact')}</h2><form id="cf" class="box form"><input name="name" required placeholder="${t('name')}"><input name="email" type="email" required placeholder="${t('email')}"><textarea class="f" name="message" required placeholder="${t('msg')}"></textarea><button class="btn f">${t('send')}</button></form><div class="box">${contactLines()}<br><br>${socialLinks().replace(/<br>/g,' · ')}</div></div>`;
R.contact.after=()=>$('#cf').onsubmit=async e=>{e.preventDefault();try{if(!CFG)throw 0;const fd=Object.fromEntries(new FormData(e.target));await fb.addDoc(fb.collection(db,'messages'),{...fd,createdAt:Date.now()});toast('✓');e.target.reset();autoReply(fd.name)}catch{toast(t('demo'),1)}};
R.faq=()=>`<div class="wrap"><h2 class="t">${t('faq')}</h2><div class="box">${t('faqText')}</div></div>`;
R.privacy=()=>`<div class="wrap"><h2 class="t">${t('privacy')}</h2><div class="box">${t('privText')}</div></div>`;
R.terms=()=>`<div class="wrap"><h2 class="t">${t('terms')}</h2><div class="box">${t('termsText')}</div></div>`;
// ============ Admin panel (opens only for ADMIN_EMAIL) ============
async function mountAdmin(){
 const root=$('#root');if(!root)return;
 if(!isAdmin()){root.innerHTML='<div class="box">⛔ Not an admin</div>';return}
 const FBB='https://www.gstatic.com/firebasejs/10.12.2/';
 if(!fbS){fbS=await import(FBB+'firebase-storage.js');stor=fbS.getStorage(fbApp)}
 const F=fb,S=fbS,st=stor;
 const STAT=['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];
 const CIDS=[...new Set((await CATALOG()).map(x=>x.categoryId))];
 const all=async c=>(await F.getDocs(F.collection(db,c))).docs.map(d=>({...d.data(),_id:d.id}));
 const importCat=async()=>{const c=await CATALOG();for(let i=0;i<c.length;i+=400){const b=F.writeBatch(db);c.slice(i,i+400).forEach(x=>b.set(F.doc(db,'products',x.id),x));await b.commit()}};
 const toLines=a=>(a||[]).map(s=>s.label+': '+s.value).join('\n');
 const fromLines=s=>String(s||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.indexOf(':');return i<0?{label:l,value:''}:{label:l.slice(0,i).trim(),value:l.slice(i+1).trim()}});
 const V={};
 function shell(){root.innerHTML=`<div class="tabs">${['dash','products','orders','coupons','messages','settings'].map(t=>`<button class="btn btn2" data-t="${t}">${t}</button>`).join('')}<button class="btn" id="lo">Logout</button></div><div id="v"></div>`;
  $('#lo').onclick=logout;document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>V[b.dataset.t]());V.dash()}
 V.dash=async()=>{const [o,p,u]=await Promise.all([all('orders'),all('products'),all('users')]);const ok=o.filter(x=>x.status!=='cancelled'),sales=ok.reduce((a,b)=>a+(b.total||0),0);
  const by={};ok.forEach(x=>{const d=new Date(x.createdAt).toISOString().slice(0,10);by[d]=(by[d]||0)+x.total});const days=Object.keys(by).sort().slice(-14),mx=Math.max(1,...days.map(d=>by[d]));
  $('#v').innerHTML=`<div class="kpi"><div><b>${sales.toLocaleString()}</b>Sales EGP</div><div><b>${o.length}</b>Orders</div><div><b>${p.length}</b>Products</div><div><b>${u.length}</b>Customers</div><div><b>${o.filter(x=>x.status==='pending').length}</b>Pending</div><div><b>${p.filter(x=>x.stock<=3).length}</b>Low stock</div></div>
  <h3>Sales (14d)</h3><div style="display:flex;gap:4px;align-items:flex-end;height:140px">${days.map(d=>`<div title="${d}: ${by[d]}" style="flex:1;background:linear-gradient(var(--cyan),var(--purple));height:${by[d]/mx*100}%"></div>`).join('')}</div>
  <h3>Low stock</h3>${p.filter(x=>x.stock<=3).map(x=>`<p>${esc(x.name_en)} — ${x.stock}</p>`).join('')}`};
 V.products=async()=>{let p=await all('products');
  if(!p.length){toast('⏳ رفع المنتجات الأساسية...');await importCat();p=await all('products');await loadProducts()}
  $('#v').innerHTML=`<div class="tabs"><button class="btn" id="np">+ إضافة منتج جديد</button><input id="fq" placeholder="search" style="max-width:240px"></div><div class="tw"><table id="pt"></table></div><div id="pf"></div>`;
  const draw=()=>{const q=$('#fq').value.toLowerCase();$('#pt').innerHTML=p.filter(x=>((x.name_en||'')+(x.sku||'')).toLowerCase().includes(q)).map(x=>`<tr><td><img src="${esc(normImg(x.images?.[0]))}" width="40"></td><td>${esc(x.name_en)}${x.needsReview?' ⚠':''}</td><td>${x.price}</td><td>${x.stock}</td><td><button class="btn btn2" data-e="${x._id}">✎</button> <button class="btn btn2" data-d="${x._id}">🗑</button></td></tr>`).join('');
   document.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(p.find(x=>x._id===b.dataset.e)));
   document.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(confirm('Delete?')){await F.deleteDoc(F.doc(db,'products',b.dataset.d));await loadProducts();V.products()}})};
  $('#fq').oninput=draw;draw();$('#np').onclick=()=>{edit({});$('#pf').scrollIntoView({behavior:'smooth'})}};
 function edit(x){const f=['name_ar','name_en','brand','model','sku','price','oldPrice','discount','stock','warranty_ar','warranty_en','rating','reviewCount'];
  $('#pf').innerHTML=`<form id="ef" class="box form"><h3 class="f">${x._id?'تعديل منتج':'منتج جديد'}</h3><label>categoryId<select name="categoryId">${CIDS.map(c=>`<option ${c===x.categoryId?'selected':''}>${c}</option>`).join('')}</select></label>${f.map(k=>`<label>${k}<input name="${k}" value="${esc(x[k]??'')}"></label>`).join('')}<label class="f">description_ar<textarea name="description_ar">${esc(x.description_ar||'')}</textarea></label><label class="f">description_en<textarea name="description_en">${esc(x.description_en||'')}</textarea></label>
  <label class="f">المواصفات بالإنجليزي (سطر لكل مواصفة — الاسم: القيمة)<textarea name="specifications_en">${esc(toLines(x.specifications_en))}</textarea></label><label class="f">المواصفات بالعربي (سطر لكل مواصفة — الاسم: القيمة)<textarea name="specifications_ar">${esc(toLines(x.specifications_ar))}</textarea></label>
  <label class="f">images (رابط صورة في كل سطر)<textarea name="images">${esc((x.images||[]).join('\n'))}</textarea></label><label class="f">أو ارفع صور<input type="file" id="fu" multiple accept="image/*"></label><label><input type="checkbox" name="featured" ${x.featured?'checked':''} style="width:auto"> featured</label><button class="btn f">Save</button></form>`;
  $('#ef').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button.f');btn.disabled=true;
   try{const d=Object.fromEntries(new FormData(e.target));['price','oldPrice','discount','stock','rating','reviewCount'].forEach(k=>d[k]=+d[k]||0);
    d.specifications_en=fromLines(d.specifications_en);d.specifications_ar=fromLines(d.specifications_ar);
    d.images=d.images.split('\n').map(s=>s.trim()).filter(Boolean);
    for(const fl of $('#fu').files){const r=S.ref(st,'products/'+Date.now()+'_'+fl.name);await S.uploadBytes(r,fl);d.images.push(await S.getDownloadURL(r))}
    if(!d.name_ar&&!d.name_en)throw {message:'اكتب اسم المنتج'};if(!d.images.length)throw {message:'أضف صورة للمنتج (رابط أو رفع)'};if(!d.price)throw {message:'اكتب السعر'};
    d.name_ar=d.name_ar||d.name_en;d.name_en=d.name_en||d.name_ar;d.sku=d.sku||('TZ-'+Date.now());
    d.featured=!!d.featured;d.createdAt=x.createdAt||Date.now();const id=x._id||x.id||('p'+Date.now());const {_id:_,...rest}=x;
    await F.setDoc(F.doc(db,'products',id),{...rest,...d},{merge:true});await loadProducts();toast('Saved ✓');$('#pf').innerHTML='';V.products()}
   catch(err){console.error(err);toast(err.code||err.message||'Error',1);btn.disabled=false}}}
 V.orders=async()=>{const o=(await all('orders')).sort((a,b)=>b.createdAt-a.createdAt);$('#v').innerHTML=`<input id="oq" placeholder="search # / phone / name"><div class="tw"><table id="ot"></table></div>`;
  const draw=()=>{const q=$('#oq').value.toLowerCase();$('#ot').innerHTML=o.filter(x=>(x.orderNumber+x.customer.phone+x.customer.name).toLowerCase().includes(q)).map(x=>`<tr><td>${x.orderNumber}</td><td>${esc(x.customer.name)}<br>${x.customer.phone}</td><td>${x.total}</td><td>${x.payment}${x.paid?' ✓':''}<br>🚚 ${x.shippingMethod||'standard'}${x.vcashSender?'<br>'+esc(x.vcashSender):''}</td>
   <td><select data-s="${x._id}">${STAT.map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${x.paid?'':`<button class="btn btn2" data-pd="${x._id}" title="Mark paid">💰</button> `}<button class="btn btn2" data-i="${x._id}">🖨</button></td></tr>`).join('');
   document.querySelectorAll('[data-s]').forEach(s=>s.onchange=async()=>{await F.updateDoc(F.doc(db,'orders',s.dataset.s),{status:s.value});toast('✓')});
   document.querySelectorAll('[data-pd]').forEach(b=>b.onclick=async()=>{await F.updateDoc(F.doc(db,'orders',b.dataset.pd),{paid:true});toast('✓');V.orders()});
   document.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const x=o.find(y=>y._id===b.dataset.i);$('#inv').innerHTML=`<div style="background:#fff;color:#000;padding:20px"><h2>TECH ZONE – Invoice ${x.orderNumber}</h2><p>${esc(x.customer.name)} · ${x.customer.phone}<br>${esc(x.customer.gov)}, ${esc(x.customer.city)}, ${esc(x.customer.address)}</p><table>${x.items.map(i=>`<tr><td>${esc(i.name_en)}</td><td>${i.qty}</td><td>${i.price}</td></tr>`).join('')}</table><p>Shipping ${x.shipping} · Discount ${x.discount} · <b>Total ${x.total} EGP</b></p></div>`;print()})};$('#oq').oninput=draw;draw()};
 V.coupons=async()=>{const c=await all('coupons');$('#v').innerHTML=`<form id="cf2" class="box form"><input name="code" placeholder="CODE" required><select name="type"><option value="percent">%</option><option value="fixed">EGP</option></select><input name="value" type="number" placeholder="value" required><input name="minOrder" type="number" placeholder="min order"><button class="btn f">Add</button></form>${c.map(x=>`<p>${x._id} — ${x.value}${x.type==='percent'?'%':' EGP'} <button class="btn btn2" data-x="${x._id}">🗑</button></p>`).join('')}`;
  $('#cf2').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.code=d.code.toUpperCase();d.value=+d.value;d.minOrder=+d.minOrder||0;d.active=true;await F.setDoc(F.doc(db,'coupons',d.code),d);V.coupons()};
  document.querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{await F.deleteDoc(F.doc(db,'coupons',b.dataset.x));V.coupons()})};
 V.messages=async()=>{const m=(await all('messages')).sort((a,b)=>b.createdAt-a.createdAt);$('#v').innerHTML=m.map(x=>`<div class="box"><b>${esc(x.name)}</b> · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a><br><small>${new Date(x.createdAt).toLocaleString()}</small><p dir="auto">${esc(x.message)}</p></div>`).join('')||'<div class="box">—</div>'};
 V.settings=async()=>{const s=(await F.getDoc(F.doc(db,'settings','store'))).data()||{};const k=['phone','whatsapp','email','cashNumber','instapay','bankName','bankHolder','bankAccount','pickupAddress','shippingFee','freeShippingOver'];
  $('#v').innerHTML=`<form id="sf" class="box form">${k.map(x=>`<label>${x}<input name="${x}" value="${esc(s[x]??store[x]??'')}"></label>`).join('')}<button class="btn f">Save</button></form>`;
  $('#sf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.shippingFee=+d.shippingFee;d.freeShippingOver=+d.freeShippingOver;await F.setDoc(F.doc(db,'settings','store'),d,{merge:true});store={...store,...d};toast('Saved ✓')}};
 Object.keys(V).forEach(k=>{const fn=V[k];V[k]=async(...a)=>{try{return await fn(...a)}catch(e){console.error(e);const v=$('#v');if(v)v.innerHTML=`<div class="box">⚠ ${esc(e.code||e.message)}<br><small>لو الخطأ permission-denied لازم تحدّث قواعد Firestore/Storage (موجودة في ملف firestore.rules و storage.rules).</small></div>`}}});
 shell();
}
R.admin=()=>{if(!authReady)return '<div class="spin"></div>';if(!isAdmin())return go('login');return `<div class="wrap"><h2 class="t">⚙ ${lang==='ar'?'لوحة الأدمن':'Admin panel'}</h2><div id="root"><div class="spin"></div></div></div>`};
R.admin.after=()=>{if(authReady&&isAdmin())mountAdmin()};

// ============ Auto-reply assistant (رد تلقائي) ============
const BOTQ={ar:[['🚚 الشحن والتوصيل','ship'],['💳 طرق الدفع','pay'],['🛡️ الضمان','warr'],['📦 تتبع طلبي','track'],['📞 التواصل معنا','contact']],en:[['🚚 Shipping','ship'],['💳 Payment','pay'],['🛡️ Warranty','warr'],['📦 Track order','track'],['📞 Contact','contact']]};
const BOTT={ar:{title:'مساعد TECH ZONE',hi:'أهلاً بيك في TECH ZONE 👋<br>أنا المساعد الآلي، اختار سؤال من تحت أو اكتب سؤالك.',ph:'اكتب سؤالك...',send:'إرسال',
 warr:'🛡️ كل منتجاتنا بضمان رسمي، ومدة الضمان مكتوبة في صفحة كل منتج.',track:'📦 تقدر تتابع طلبك من هنا: <a href="#/track">تتبع الطلب</a>',
 ret:'↩️ سياسة الاسترجاع والاستبدال موضحة في <a href="#/terms">الشروط والأحكام</a>.',deal:'🔥 شوف أحدث العروض والخصومات: <a href="#/products?deals=1">العروض</a>',
 fall:'شكراً لرسالتك 🙏 لم أفهم سؤالك بالظبط. جرّب أحد الأسئلة السريعة، أو كلمنا مباشرة على واتساب وهنرد عليك في أسرع وقت.',pay:'💳 طرق الدفع المتاحة:<br>• الدفع عند الاستلام<br>• بطاقة بنكية (Paymob)<br>• فودافون كاش',pay2:'• إنستا باي<br>• تحويل بنكي',ship:'🚚 طرق التوصيل:',free:'مجاناً',cur:'ج'},
 en:{title:'TECH ZONE Assistant',hi:'Welcome to TECH ZONE 👋<br>I\'m the auto-reply assistant. Pick a question below or type yours.',ph:'Type your question...',send:'Send',
 warr:'🛡️ All our products come with an official warranty; the period is listed on each product page.',track:'📦 You can follow your order here: <a href="#/track">Track order</a>',
 ret:'↩️ Our return & exchange policy is in the <a href="#/terms">Terms & Conditions</a>.',deal:'🔥 See the latest offers: <a href="#/products?deals=1">Deals</a>',
 fall:'Thanks for your message 🙏 I did not quite get that. Try one of the quick questions, or chat with us on WhatsApp and we will reply as soon as possible.',pay:'💳 Available payment methods:<br>• Cash on delivery<br>• Bank card (Paymob)<br>• Vodafone Cash',pay2:'• InstaPay<br>• Bank transfer',ship:'🚚 Delivery options:',free:'Free',cur:'EGP'}};
function botAnswer(k){const b=BOTT[lang];
 if(k.startsWith('faq:'))return faqA(FAQ[+k.slice(4)]);
 if(k==='ship')return b.ship+'<br>'+shippingMethods.map(m=>`• ${esc(L(m,'name'))}: <b>${m.fee?m.fee+' '+b.cur:b.free}</b> (${esc(L(m,'days'))})`).join('<br>');
 if(k==='pay')return b.pay+(store.cashNumber?` <b dir="ltr">${esc(store.cashNumber)}</b>`:'')+'<br>'+b.pay2;
 if(k==='contact')return `📞 <a href="tel:${esc(store.phone)}" dir="ltr">${esc(store.phone)}</a><br>💬 <a href="https://wa.me/${esc(store.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a><br>✉ <a href="mailto:${esc(store.email)}">${esc(store.email)}</a>`;
 return b[k]||b.fall}
function botMatch(s){s=s.toLowerCase();
 if(/^(hi|hello|hey|مرحبا|اهلا|أهلا|سلام|السلام|صباح|مساء)/.test(s))return 'hi';
 {const i=FAQ.findIndex(f=>f.kw.test(s));if(i>=0)return 'faq:'+i}
 const R2=[['ship',/شحن|توصيل|ship|deliver/],['pay',/دفع|فودافون|كاش|انستا|إنستا|فيزا|كارت|بطاقة|pay|cash|visa|instapay|card/],['warr',/ضمان|warrant|guarant/],['ret',/استرجاع|ارجاع|إرجاع|استبدال|return|refund|exchange/],['track',/تتبع|اوردر|أوردر|طلبي|track|order/],['contact',/تواصل|رقم|تليفون|موبايل|واتس|ايميل|إيميل|contact|phone|whats|email|call/],['deal',/سعر|عرض|عروض|خصم|price|deal|discount|offer|sale/]];
 for(const [k,r] of R2)if(r.test(s))return k;if(/^(hi|hello|hey|مرحبا|اهلا|أهلا|سلام|السلام|صباح|مساء)/.test(s))return 'hi';return 'fall'}
let botMsgs=[],botLang='',botInit=false;
function botDraw(){const p=$('#botp');if(!p)return;const b=BOTT[lang];
 p.querySelector('h4').textContent='🤖 '+b.title;p.querySelector('input').placeholder=b.ph;p.querySelector('.bsend').textContent=b.send;
 p.querySelector('.bchips').innerHTML=BOTQ[lang].map(([l,k])=>`<button type="button" data-k="${k}">${l}</button>`).join('');
 p.querySelectorAll('.bchips button').forEach(x=>x.onclick=()=>botSay(x.textContent,x.dataset.k));
 const m=p.querySelector('.bmsgs');m.innerHTML=botMsgs.map(x=>`<div class="bm ${x.me?'me':'bot'}">${x.h}</div>`).join('');m.scrollTop=m.scrollHeight}
function botSay(label,k){botMsgs.push({me:true,h:esc(label)});botDraw();
 setTimeout(()=>{botMsgs.push({me:false,h:k==='hi'?BOTT[lang].hi:botAnswer(k)});botDraw()},450)}
function botSetup(){
 if(!botInit){botInit=true;const w=document.createElement('div');w.innerHTML=`<button id="botb" type="button" aria-label="assistant">🤖</button><div id="botp" hidden><div class="bh"><h4></h4><button type="button" class="bx" aria-label="close">✕</button></div><div class="bmsgs"></div><div class="bchips"></div><form class="bform"><input autocomplete="off"><button class="bsend btn"></button></form></div>`;document.body.append(...w.children);
  $('#botb').onclick=()=>{const p=$('#botp');p.hidden=!p.hidden;if(!p.hidden)p.querySelector('input').focus()};
  $('#botp .bx').onclick=()=>$('#botp').hidden=true;
  $('#botp .bform').onsubmit=e=>{e.preventDefault();const i=e.target.querySelector('input'),v=i.value.trim();if(!v)return;i.value='';botSay(v,botMatch(v))}}
 if(botLang!==lang){botLang=lang;botMsgs=[{me:false,h:BOTT[lang].hi}]}
 botDraw()}
function autoReply(name){const f=$('#cf');if(!f)return;document.getElementById('ar')?.remove();
 const d=document.createElement('div');d.id='ar';d.className='box';
 d.innerHTML=lang==='ar'?`✅ <b>أهلاً ${esc(name||'')}!</b><br>وصلتنا رسالتك، وده رد تلقائي لتأكيد الاستلام. فريق TECH ZONE هيرد عليك على بريدك خلال 24 ساعة.<br>لو الموضوع مستعجل كلمنا على واتساب: <a href="https://wa.me/${esc(store.whatsapp)}" target="_blank" rel="noopener">اضغط هنا</a>`:`✅ <b>Hello ${esc(name||'')}!</b><br>We received your message — this is an automatic confirmation. The TECH ZONE team will reply to your email within 24 hours.<br>Urgent? Chat on WhatsApp: <a href="https://wa.me/${esc(store.whatsapp)}" target="_blank" rel="noopener">click here</a>`;
 f.after(d)}

// ============ FAQ (الأسئلة الشائعة) ============
const FAQ=[
{kw:/أصلي|اصلي|original|genuine|fake|مضروب|تقليد/i,qa:'هل المنتجات أصلية؟',aa:'أيوه، كل منتجاتنا أصلية 100% وبضمان رسمي.',qe:'Are the products genuine?',ae:'Yes, all our products are 100% genuine with an official warranty.'},
{kw:/ضمان|warrant|guarant/i,qa:'مدة الضمان كام؟',aa:'مدة الضمان بتختلف حسب المنتج وهي مكتوبة في صفحة كل منتج. لو محتاج تفاصيل أكتر كلمنا على واتساب.',qe:'How long is the warranty?',ae:'It depends on the product and is listed on each product page. Contact us on WhatsApp for more details.'},
{kw:/اطلب|أطلب|طلب إزاي|اشتري|اشترى|how to order|how do i order|place an order|buy/i,qa:'أطلب إزاي؟',aa:'ضيف المنتج للسلة 🛒، افتح السلة، اكتب بيانات الشحن، اختار طريقة التوصيل والدفع، وأكد الطلب.',qe:'How do I place an order?',ae:'Add the product to your cart 🛒, open the cart, enter your shipping details, choose delivery and payment, then confirm.'},
{kw:/حساب|تسجيل|account|register|sign ?up|login|دخول/i,qa:'لازم أعمل حساب؟',aa:'يفضّل تعمل حساب عشان تتابع طلباتك وتحفظ المفضلة والمقارنة وعناوينك. التسجيل بالإيميل أو بحساب جوجل.',qe:'Do I need an account?',ae:'An account is recommended so you can track orders and save your wishlist, comparisons and addresses. You can sign up with email or Google.'},
{kw:/طرق الدفع|payment methods|ادفع|أدفع|how to pay|دفع/i,qa:'إيه طرق الدفع المتاحة؟',aa:'الدفع عند الاستلام، بطاقة بنكية (Paymob)، فودافون كاش، إنستا باي، أو تحويل بنكي.',qe:'What payment methods are available?',ae:'Cash on delivery, bank card (Paymob), Vodafone Cash, InstaPay, or bank transfer.'},
{kw:/عند الاستلام|cash on delivery|cod/i,qa:'هل الدفع عند الاستلام متاح؟',aa:'أيوه، الدفع عند الاستلام متاح لكل المحافظات.',qe:'Is cash on delivery available?',ae:'Yes, cash on delivery is available for all governorates.'},
{kw:/فودافون|vodafone|كاش|vcash/i,qa:'أدفع بفودافون كاش إزاي؟',aa:'حوّل إجمالي الطلب على الرقم <b dir="ltr">{cash}</b> واكتب رقم المحوّل منه وانت بتكمل الطلب. الطلب بيفضل "غير مدفوع" لحد ما نتأكد من وصول التحويل.',qe:'How do I pay with Vodafone Cash?',ae:'Transfer the order total to <b dir="ltr">{cash}</b> and enter the sender number at checkout. The order stays "unpaid" until we confirm the transfer.'},
{kw:/انستا|إنستا|instapay/i,qa:'أدفع بإنستا باي إزاي؟',aa:'اختار إنستا باي في صفحة الدفع وهتظهرلك بيانات التحويل. حوّل المبلغ وكمّل الطلب.',qe:'How do I pay with InstaPay?',ae:'Choose InstaPay at checkout to see the transfer details, send the amount, then complete the order.'},
{kw:/بطاقة|بطاقه|كارت|فيزا|ماستر|card|visa|master|paymob|آمن|امان|secure/i,qa:'الدفع بالبطاقة آمن؟',aa:'أيوه، الدفع بيتم عن طريق بوابة Paymob مباشرة، ومبنخزّنش بيانات بطاقتك عندنا نهائياً.',qe:'Is card payment safe?',ae:'Yes. Payments go directly through the Paymob gateway and we never store your card data.'},
{kw:/مصاريف|تكلفة الشحن|سعر الشحن|shipping (cost|fee|price)|delivery (cost|fee)/i,qa:'مصاريف الشحن كام؟',aa:'{ship}',qe:'How much is shipping?',ae:'{ship}'},
{kw:/مدة التوصيل|هيوصل|يوصل امتى|يوصل إمتى|delivery time|how long|when will/i,qa:'التوصيل بياخد قد إيه؟',aa:'التوصيل العادي من 2 لـ 5 أيام عمل، والسريع خلال 24-48 ساعة، ونفس اليوم لسوهاج وأسيوط فقط.',qe:'How long does delivery take?',ae:'Standard delivery takes 2-5 business days, express 24-48 hours, and same-day is for Sohag and Assiut only.'},
{kw:/محافظ|governorate|all cities|كل المحافظات|بتوصلوا/i,qa:'بتوصّلوا لكل المحافظات؟',aa:'أيوه، بنوصّل لكل محافظات مصر.',qe:'Do you deliver to all governorates?',ae:'Yes, we deliver to all governorates in Egypt.'},
{kw:/الفرع|استلام من|pickup|pick up|branch/i,qa:'ينفع أستلم الطلب بنفسي؟',aa:'أيوه، الاستلام من نقطة التسليم مجاني وجاهز خلال 24 ساعة. العنوان: {pickup}',qe:'Can I pick up my order?',ae:'Yes, pickup is free and ready within 24 hours. Address: {pickup}'},
{kw:/تتبع|track|وصل طلبي|فين طلبي|where is my order/i,qa:'أتابع طلبي إزاي؟',aa:'من صفحة <a href="#/track">تتبع الطلب</a> أو من حسابك ← طلباتي.',qe:'How do I track my order?',ae:'Use the <a href="#/track">Track order</a> page or go to your account → Orders.'},
{kw:/الغاء|إلغاء|الغي|ألغي|تعديل الطلب|cancel|edit order|change order/i,qa:'أقدر ألغي أو أعدّل طلبي؟',aa:'أيوه قبل ما الطلب يتشحن. كلمنا بأسرع وقت على واتساب: <a href="https://wa.me/{wa}" target="_blank" rel="noopener">اضغط هنا</a>.',qe:'Can I cancel or edit my order?',ae:'Yes, before it ships. Contact us as soon as possible on WhatsApp: <a href="https://wa.me/{wa}" target="_blank" rel="noopener">click here</a>.'},
{kw:/استرجاع|ارجاع|إرجاع|استبدال|return|refund|exchange/i,qa:'إيه سياسة الاسترجاع والاستبدال؟',aa:'الاسترجاع والاستبدال حسب سياسة المتجر الموضحة في <a href="#/terms">الشروط والأحكام</a>. لازم المنتج يكون بحالته الأصلية وبعبوته. كلمنا وهنساعدك.',qe:'What is the return & exchange policy?',ae:'Returns and exchanges follow the store policy in the <a href="#/terms">Terms & Conditions</a>. The product must be in its original condition and packaging. Contact us and we will help.'},
{kw:/تالف|مكسور|غلط|عيب|damaged|broken|wrong item|defect/i,qa:'استلمت منتج تالف أو غلط، أعمل إيه؟',aa:'صوّر المنتج والعبوة وكلمنا فوراً على واتساب برقم الطلب، وهنحل المشكلة في أسرع وقت.',qe:'I received a damaged or wrong item. What now?',ae:'Take photos of the item and packaging and contact us right away on WhatsApp with your order number. We will fix it as soon as possible.'},
{kw:/سعر|الأسعار|الاسعار|جنيه|price|currency|egp/i,qa:'الأسعار بالجنيه؟ وبتتغير؟',aa:'كل الأسعار بالجنيه المصري. الأسعار ممكن تتغير حسب السوق، والسعر المعروض وقت تأكيد الطلب هو اللي بيتحاسب.',qe:'Are prices in EGP? Do they change?',ae:'All prices are in Egyptian pounds. Prices may change with the market; the price shown when you confirm the order is the one charged.'},
{kw:/تقسيط|قسط|installment|instalment|bnpl/i,qa:'فيه تقسيط؟',aa:'التقسيط مش مفعّل على الموقع حالياً. كلمنا على واتساب نسألك عن أي عروض متاحة.',qe:'Do you offer installments?',ae:'Installments are not enabled on the site right now. Message us on WhatsApp to ask about available offers.'},
{kw:/كوبون|كود خصم|coupon|promo|voucher|discount code/i,qa:'أستخدم كوبون الخصم إزاي؟',aa:'اكتب كود الخصم في صفحة السلة قبل تأكيد الطلب وهيتخصم تلقائياً.',qe:'How do I use a coupon?',ae:'Enter the coupon code in the cart before confirming the order and the discount applies automatically.'},
{kw:/مقارن|compare|comparison/i,qa:'إزاي أقارن بين منتجات؟',aa:'اضغط على أيقونة ⚖ في أي منتج، وتقدر تقارن لحد 4 منتجات مع بعض من صفحة المقارنة.',qe:'How do I compare products?',ae:'Tap the ⚖ icon on a product. You can compare up to 4 products side by side on the Compare page.'},
{kw:/مفضل|wishlist|favorite|favourite|❤/i,qa:'أحفظ المنتجات اللي عجبتني إزاي؟',aa:'اضغط على أيقونة ❤ في المنتج وهتلاقيه في صفحة المفضلة.',qe:'How do I save products I like?',ae:'Tap the ❤ icon on a product and find it later on the Wishlist page.'},
{kw:/نسيت|كلمة السر|كلمة المرور|password|forgot|reset/i,qa:'نسيت كلمة السر',aa:'من صفحة تسجيل الدخول جرّب استعادة كلمة السر، ولو واجهتك مشكلة كلمنا وهنساعدك.',qe:'I forgot my password',ae:'Try the password recovery option on the login page. If you have trouble, contact us and we will help.'},
{kw:/منتجات|أقسام|اقسام|عندكم|categories|what do you sell|products/i,qa:'إيه الأقسام اللي عندكم؟',aa:'لابتوبات جيمنج، كروت شاشة، معالجات، مازربورد، رامات، وحدات تخزين، كيسات، تبريد، مزودات طاقة، شاشات، وملحقات (كيبورد، ماوس، سماعات).',qe:'What categories do you sell?',ae:'Gaming laptops, graphics cards, CPUs, motherboards, RAM, storage, cases, cooling, power supplies, monitors and accessories (keyboards, mice, headsets).'},
{kw:/ترشح|رشح|يناسبني|انصح|أنصح|recommend|suggest|which (laptop|gpu|pc)/i,qa:'مش عارف أختار المنتج المناسب',aa:'كلمنا على واتساب وقولنا ميزانيتك واستخدامك (ألعاب، تصميم، شغل) وهنرشحلك الأنسب. وتقدر تستخدم المقارنة ⚖ كمان.',qe:'I cannot decide which product suits me',ae:'Message us on WhatsApp with your budget and use (gaming, design, work) and we will recommend the best fit. You can also use the ⚖ comparison.'},
{kw:/خصوصي|بياناتي|privacy|my data/i,qa:'بياناتي في أمان؟',aa:'أيوه، بنحترم خصوصيتك ومبنخزّنش بيانات بطاقات الدفع. التفاصيل في صفحة <a href="#/privacy">الخصوصية</a>.',qe:'Is my data safe?',ae:'Yes, we respect your privacy and never store payment card data. Details are on the <a href="#/privacy">Privacy</a> page.'},
{kw:/لغة|لغه|انجليزي|إنجليزي|english|language|arabic/i,qa:'أغيّر لغة الموقع إزاي؟',aa:'اضغط على زر EN / ع في أعلى الصفحة.',qe:'How do I change the language?',ae:'Tap the EN / ع button at the top of the page.'},
{kw:/تواصل|رقم|تليفون|موبايل|واتس|ايميل|إيميل|contact|phone|whats|email|call|support|دعم/i,qa:'أتواصل معاكم إزاي؟',aa:'📞 <a href="tel:{phone}" dir="ltr">{phone}</a><br>💬 <a href="https://wa.me/{wa}" target="_blank" rel="noopener">WhatsApp</a><br>✉ <a href="mailto:{email}">{email}</a>',qe:'How can I contact you?',ae:'📞 <a href="tel:{phone}" dir="ltr">{phone}</a><br>💬 <a href="https://wa.me/{wa}" target="_blank" rel="noopener">WhatsApp</a><br>✉ <a href="mailto:{email}">{email}</a>'}
];
function faqFill(s){const b=BOTT[lang];
 const ship=shippingMethods.map(m=>`• ${L(m,'name')}: <b>${m.fee?m.fee+' '+b.cur:b.free}</b>${m.freeOver?(lang==='ar'?` (مجاني فوق ${store.freeShippingOver} ج)`:` (free over ${store.freeShippingOver} EGP)`):''}`).join('<br>');
 return s.replace(/\{ship\}/g,ship).replace(/\{cash\}/g,esc(store.cashNumber||'')).replace(/\{phone\}/g,esc(store.phone||'')).replace(/\{wa\}/g,esc(store.whatsapp||'')).replace(/\{email\}/g,esc(store.email||'')).replace(/\{pickup\}/g,esc(store.pickupAddress||''))}
const faqQ=f=>lang==='ar'?f.qa:f.qe,faqA=f=>faqFill(lang==='ar'?f.aa:f.ae);
R.faq=()=>`<div class="wrap"><h2 class="t">${t('faq')}</h2><div class="box">${t('faqText')}</div>${FAQ.map(f=>`<details class="box" style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">${faqQ(f)}</summary><p style="margin-top:8px;line-height:1.9">${faqA(f)}</p></details>`).join('')}</div>`;

// ---------- router
function go(h){location.hash='#/'+h;return ''}
function route(){const h=location.hash.replace(/^#\/?/,'').split('?')[0].split('/'),k=h[0]||'home',f=R[k]||R.home;
 document.title='TECH ZONE – GEAR UP YOUR GAME';$('#app').innerHTML=f(h.slice(1));f.after&&f.after(h.slice(1));bind($('#app'));
 if(k==='home')fbk();syncCmp();cbar();scrollTo(0,0)}
const FB0=[['أحمد',5,'سرعة في التوصيل ومنتجات أصلية، تعامل ممتاز.','Fast delivery and genuine products.'],['محمد',5,'سعر ممتاز وضمان حقيقي. أنصح بالتعامل.','Great price and real warranty.'],['Sara',5,'Great support team, highly recommended!','دعم ممتاز، أنصح بالتعامل!']];
const fbCard=(n,r,x)=>`<div class="box"><div class="stars">${'★'.repeat(r)}${'☆'.repeat(5-r)}</div><p dir="auto">${esc(x)}</p><b>${esc(n)}</b></div>`;
async function fbk(){const e=$('#fbk');if(!e)return;
 const base=()=>FB0.map(r=>fbCard(r[0],r[1],lang==='ar'?r[2]:r[3])).join('');
 e.innerHTML=base();
 let list=ls('tz_fb',[]);
 try{if(CFG&&db){const s=await fb.getDocs(fb.query(fb.collection(db,'feedback'),fb.orderBy('createdAt','desc'),fb.limit(12)));list=s.docs.map(d=>d.data())}}catch(x){console.warn(x)}
 if($('#fbk')!==e)return;
 e.innerHTML=list.map(f=>fbCard(f.name,f.rating,f.text)).join('')+base();
 const b=$('#addfb');if(b)b.onclick=openFb}
function openFb(){document.getElementById('fbmodal')?.remove();
 const m=document.createElement('div');m.id='fbmodal';m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
 m.innerHTML=`<form class="mbox" novalidate><h3>${t('fbTitle')}</h3>
 <label>${t('fbName')}<input name="n" maxlength="40" autocomplete="name" value="${esc(user&&user.displayName||'')}"></label>
 <div><small>${t('fbRate')}</small><div class="rpick" role="radiogroup">${[1,2,3,4,5].map(i=>`<button type="button" data-v="${i}" aria-label="${i}">★</button>`).join('')}</div></div>
 <label><textarea name="x" rows="4" maxlength="400" placeholder="${t('fbText')}"></textarea></label>
 <div class="ferr" role="alert"></div>
 <div class="acts"><button class="btn" style="flex:1" type="submit">${t('fbSend')}</button><button class="btn btn2" type="button" data-x>${t('fbCancel')}</button></div></form>`;
 document.body.appendChild(m);let rate=0;const f=m.querySelector('form'),close=()=>m.remove();
 const paint=()=>m.querySelectorAll('.rpick button').forEach(b=>b.classList.toggle('on',+b.dataset.v<=rate));
 m.querySelectorAll('.rpick button').forEach(b=>b.onclick=()=>{rate=+b.dataset.v;paint()});
 m.querySelector('[data-x]').onclick=close;m.onclick=e=>{if(e.target===m)close()};
 addEventListener('keydown',function k(e){if(e.key==='Escape'){close();removeEventListener('keydown',k)}});
 f.n.focus();
 f.onsubmit=async e=>{e.preventDefault();const name=f.n.value.trim(),text=f.x.value.trim(),err=m.querySelector('.ferr');
  if(name.length<2||!rate||text.length<10){err.textContent=t('fbNeed');return}
  const d={name,rating:rate,text,lang,createdAt:Date.now()},btn=f.querySelector('[type=submit]');btn.disabled=true;
  try{if(CFG&&db)await fb.addDoc(fb.collection(db,'feedback'),d);else sv('tz_fb',[d,...ls('tz_fb',[])].slice(0,12));
   toast(t('fbThanks'));close();fbk()}catch(x){console.error(x);err.textContent=t('err')+' ('+(x&&x.code||x&&x.message||'unknown')+')';btn.disabled=false}}}
addEventListener('hashchange',route);
(async()=>{$('#app').innerHTML='<div class="spin"></div>';try{await initFB()}catch(e){console.error(e)}await loadProducts();cmp=cmp.filter(P).slice(0,MAXC);wish=wish.filter(P);renderChrome();route()})();
