import {chapters,discoveries} from './content.js';
import {BookController} from './book.js';
import {AudioController} from './audio.js';
import {EffectsController} from './effects.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const state={mode:'intro',scene:0,opening:false,reduced:motionQuery.matches,atmospherePaused:false,finaleTimer:null,credits:{}};
const audio=new AudioController();
const effects=new EffectsController(state.reduced);
const book=new BookController({reduced:state.reduced,onPageSound:()=>audio.effect('page'),onChapter:()=>audio.setScene('book')});
let scrollController=null,introTimeline=null,finaleTimeline=null;
let drawerFocus=null;

function announce(text){$('#announcement').textContent=text;}
function animationTo(target,options){if(window.gsap)return gsap.to(target,options);const {onComplete,...styles}=options;Object.assign(typeof target==='string'?$(target).style:target.style,styles);onComplete?.();}

function buildDecorations(){
  const ns='http://www.w3.org/2000/svg';
  const candles=$('#gate-candles');
  [5,8,11,14,18,22,78,82,86,89,92,95].forEach((left,i)=>{
    const candle=document.createElement('i');candle.className='gate-candle';
    candle.style.cssText=`left:${left}%;height:${17+(i*13)%25}px;bottom:${8+(i%3)*2}%;--delay:-${i*.47}s`;candles.append(candle);
  });
  $$('.flower-bank').forEach((bank,b)=>{
    for(let i=0;i<27;i++){
      const flower=document.createElementNS(ns,'svg');flower.classList.add('bank-flower');
      const size=25+(i*23)%48;
      flower.style.cssText=`--size:${size}px;--rotation:${i*31}deg;--color:${['#bd6e25','#d18b30','#9d5526','#d5983b','#83502c'][(i+b)%5]};left:${(i*17)%100}%;bottom:${(i*19)%76}px`;
      flower.innerHTML='<use href="#icon-flower"/>';bank.append(flower);
    }
  });
}

function buildChapterMenu(){
  $('#chapter-list').innerHTML=chapters.map((chapter,i)=>`<li><button data-chapter-link="${i}"><span class="chapter-index">${String(i+1).padStart(2,'0')}</span><span class="chapter-name">${chapter.title}</span><span class="chapter-arrow" aria-hidden="true">↗</span></button></li>`).join('');
  $$('[data-chapter-link]').forEach(button=>button.addEventListener('click',()=>{
    closeDrawer();openBook(2+Number(button.dataset.chapterLink)*2,true);
  }));
}

function setMode(mode){
  state.mode=mode;document.body.dataset.mode=mode;
  const map={intro:'#intro-runway',book:'#book-section',finale:'#finale-section',credits:'#credits-section'};
  for(const [key,selector] of Object.entries(map)){$(selector).hidden=key!==mode;$(selector).inert=key!==mode;}
  effects.setMode(mode);audio.setScene(mode);
  const video=$('#atmosphere-video');
  if(mode==='intro'&&!state.reduced&&!state.atmospherePaused)video.play().catch(()=>{});else video.pause();
  if(mode==='intro')scrollController?.enable();else scrollController?.disable(false);
}

function setActiveScene(index){
  if(state.scene===index&&$('.journey-markers [aria-current]'))return;
  state.scene=index;
  $$('.cinematic-scene').forEach((scene,i)=>{scene.setAttribute('aria-hidden',String(i!==index));scene.inert=i!==index;});
  $$('.journey-markers button').forEach((button,i)=>{button.classList.toggle('active',i===index);if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  $('#scroll-label').textContent=['SCROLL TO BEGIN THE JOURNEY','FOLLOW THEIR STORY','CROSS INTO THE UNKNOWN','A WORLD AWAITS','YOUR NEXT CHAPTER AWAITS'][index];
  $('#scroll-next').style.visibility=index===4?'hidden':'visible';
  $('#skip-story').textContent=index===4?'Open the book ↗':'Enter the book ↗';
}

function initScroll(){
  if(!window.gsap||!window.ScrollTrigger){
    let pending=false;
    const update=()=>{pending=false;if(state.mode!=='intro')return;const p=Math.max(0,Math.min(1,scrollY/($('#intro-runway').offsetHeight-innerHeight)));const index=Math.min(4,Math.floor(p*5));$$('.cinematic-scene').forEach((s,i)=>{s.style.opacity=i===index?1:0;s.style.visibility=i===index?'visible':'hidden';});setActiveScene(index);$('.intro-progress span').style.width=p*100+'%';};
    addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});update();return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const scenes=$$('.cinematic-scene');
  gsap.set(scenes.slice(1),{autoAlpha:0});
  introTimeline=gsap.timeline({defaults:{ease:'none'},paused:true});
  introTimeline.to({}, {duration:5},0);
  if(!state.reduced){
    introTimeline.to('.gate-left',{rotationY:-82,transformOrigin:'0% 50%',duration:1.0,ease:'power1.inOut'},.12);
    introTimeline.to('.gate-right',{rotationY:82,transformOrigin:'100% 50%',duration:1.0,ease:'power1.inOut'},.12);
    introTimeline.to('.hero-copy',{yPercent:-12,scale:.96,duration:.85},.12);
    introTimeline.to('.cemetery-background',{scale:1.22,duration:1.1},0);
  }
  for(let i=1;i<5;i++){
    const at=i-.08;
    introTimeline.to(scenes[i-1],{autoAlpha:0,duration:.26},at);
    introTimeline.to(scenes[i],{autoAlpha:1,duration:.32},at);
    if(!state.reduced){
      const copy=scenes[i].querySelector('.scene-copy, .awakening-copy');
      introTimeline.fromTo(copy,{y:35},{y:0,duration:.6},at);
      const image=scenes[i].querySelector('img.scene-image');
      if(image)introTimeline.fromTo(image,{scale:1.1},{scale:1.02,duration:1.05},at);
    }
  }
  if(!state.reduced){
    introTimeline.fromTo('.artifact-button',{y:70,opacity:0},{y:0,opacity:1,duration:.5},3.95);
    introTimeline.fromTo('.artifact-light',{scale:.2},{scale:1.1,duration:.6},4.1);
    introTimeline.fromTo('.artifact-cover',{rotationY:0},{rotationY:-12,duration:.55,ease:'power1.out'},4.25);
  }
  scrollController=ScrollTrigger.create({trigger:'#intro-runway',start:'top top',end:'bottom bottom',animation:introTimeline,scrub:state.reduced?true:.55,invalidateOnRefresh:true,onUpdate:self=>{
    const p=self.progress;setActiveScene(Math.min(4,Math.floor(p*5)));
    $('.intro-progress span').style.width=(p*100)+'%';
  }});
  gsap.from('.hero-copy>*',{y:state.reduced?0:18,opacity:0,duration:state.reduced?.1:1.2,stagger:state.reduced?0:.1,ease:'power2.out',delay:.1});
}

function scrollToScene(index){
  if(state.mode!=='intro')restartIntro();
  const length=$('#intro-runway').offsetHeight-innerHeight;
  const p=Math.min(.97,(index+.17)/5);
  window.scrollTo({top:length*p,behavior:state.reduced?'instant':'smooth'});
}

async function openBook(page=2,instant=false){
  if(state.opening)return;
  if(state.mode==='book'){book.setPage(page);return;}
  state.opening=true;closeSound();closeDrawer();
  clearTimeout(state.finaleTimer);finaleTimeline?.kill();
  audio.effect('chime');effects.burst();
  const finish=()=>{
    setMode('book');window.scrollTo(0,0);
    book.init();book.resize();book.setPage(page);
    if(window.gsap&&!state.reduced&&!instant)gsap.fromTo('#book-stage',{opacity:0,y:30,rotationX:12},{opacity:1,y:0,rotationX:0,duration:1.0,ease:'power2.out',clearProps:'transform'});
    state.opening=false;announce('The book is open. Use the arrows, page corners, or keyboard to explore.');
    $('#next-page').focus({preventScroll:true});
  };
  if(instant||state.reduced||state.mode!=='intro'){finish();return;}
  if(window.gsap){
    const transition=gsap.timeline({onComplete:()=>{finish();gsap.set('#intro-stage',{opacity:1});}});
    if(state.scene===4)transition.to('.artifact-cover',{rotationY:-72,duration:.65,ease:'power2.inOut'},0);
    transition.to('#intro-stage',{opacity:0,duration:.6},state.scene===4?.3:0);
  }else finish();
}

function restartIntro(){
  state.opening=false;clearTimeout(state.finaleTimer);finaleTimeline?.kill();
  closeDrawer();setMode('intro');window.scrollTo({top:0,behavior:'instant'});
  if(window.gsap){gsap.set('#intro-stage',{opacity:1});gsap.set('#book-stage',{clearProps:'transform,opacity'});}
  introTimeline?.progress(0);window.ScrollTrigger?.refresh();state.scene=-1;setActiveScene(0);
  $('#home-button').focus({preventScroll:true});announce('The journey begins again. Scroll to open the cemetery gate.');
}

function beginFinale(){
  if(state.mode!=='book'||state.opening)return;
  state.opening=true;closeDrawer();audio.effect('chime');effects.burst();
  const reveal=()=>{
    setMode('finale');state.opening=false;window.scrollTo(0,0);
    if(window.gsap){
      gsap.set('.finale-copy',{opacity:0});gsap.set('.finale-world',{scale:1.22,xPercent:0});gsap.set('.finale-light',{opacity:1});
      finaleTimeline=gsap.timeline({onComplete:showCredits});
      finaleTimeline.to('.finale-light',{opacity:0,duration:state.reduced?.4:1.8})
        .to('.finale-world',{scale:1.02,xPercent:state.reduced?0:-2,duration:state.reduced?.8:10,ease:'power1.out'},0)
        .to('.finale-copy',{opacity:1,y:state.reduced?0:-12,duration:1.3},state.reduced?.3:2.5)
        .to('.finale-copy',{opacity:0,duration:1},state.reduced?4:10.8)
        .to('.finale-light',{opacity:.8,duration:1},state.reduced?4.6:12);
    }else {$('#finale-section .finale-copy').style.opacity=1;state.finaleTimer=setTimeout(showCredits,state.reduced?5000:13000);}
    announce('The pages become petals. The remembered world unfolds beyond the book.');
    $('#skip-finale').focus({preventScroll:true});
  };
  if(window.gsap&&!state.reduced){
    gsap.to('#book-stage',{scale:1.25,opacity:0,rotationX:-5,duration:1.4,ease:'power2.in',onComplete:()=>{reveal();gsap.set('#book-stage',{clearProps:'transform,opacity'});}});
  } else reveal();
}

function showCredits(){
  clearTimeout(state.finaleTimer);finaleTimeline?.kill();setMode('credits');renderCredits();window.scrollTo({top:0,behavior:'instant'});
  if(window.gsap&&!state.reduced)gsap.fromTo('.credits-inner',{y:25,opacity:0},{y:0,opacity:1,duration:1.2});
  announce('The journey has reached the credits. Thank you for turning the pages.');
  $('#restart').focus({preventScroll:true});
}

function showDiscovery(key){
  const discovery=discoveries[key];if(!discovery)return;
  $('#detail-title').textContent=discovery.title;
  $('#detail-body').replaceChildren();const p=document.createElement('p');p.textContent=discovery.text;$('#detail-body').append(p);
  $('#detail-dialog').showModal();audio.effect();
}

function openDrawer(){
  closeSound();drawerFocus=document.activeElement;
  $('#chapter-drawer').hidden=false;$('#chapter-drawer').inert=false;$('#chapter-drawer').setAttribute('role','dialog');$('#chapter-drawer').setAttribute('aria-modal','true');
  $('#drawer-backdrop').hidden=false;$('#chapters-toggle').setAttribute('aria-expanded','true');
  $('main').inert=true;$('.site-header').inert=true;
  if(window.gsap&&!state.reduced)gsap.fromTo('#chapter-drawer',{xPercent:100},{xPercent:0,duration:.4,ease:'power2.out'});
  $('#close-drawer').focus();
}
function closeDrawer(){
  if($('#chapter-drawer').hidden)return;
  $('#chapter-drawer').hidden=true;$('#chapter-drawer').inert=true;$('#drawer-backdrop').hidden=true;
  $('#chapters-toggle').setAttribute('aria-expanded','false');$('main').inert=false;$('.site-header').inert=false;
  drawerFocus?.focus({preventScroll:true});
}
function closeSound(){ $('#sound-panel').hidden=true;$('#sound-toggle').setAttribute('aria-expanded','false'); }
function showAbout(){closeDrawer();closeSound();$('#about-dialog').showModal();}

function renderCredits(){
  const root=$('#academic-credits');root.replaceChildren();
  const entries=[['CREATED BY',state.credits.team],['COURSE & SECTION',[state.credits.course,state.credits.section].filter(Boolean).join(' · ')],['INSTRUCTOR',state.credits.instructor],['INSTITUTION',state.credits.institution]];
  for(const [label,value] of entries){
    if(!value)continue;
    const group=document.createElement('div');group.className='credit-group';
    const heading=document.createElement('p');heading.className='eyebrow';heading.textContent=label;
    const content=document.createElement('p');content.className='credit-value';content.textContent=value;
    group.append(heading,content);root.append(group);
  }
  if(!entries.some(([,value])=>value)){
    const group=document.createElement('div');group.className='credit-group';group.innerHTML='<p class="eyebrow">AN ACADEMIC MULTIMEDIA PROJECT</p><p>Storytelling through the art of the web.</p>';root.append(group);
  }
}

async function loadCredits(){
  let configured={};try{const r=await fetch('assets/project-info.json');if(r.ok)configured=await r.json();}catch{}
  let local={};try{local=JSON.parse(localStorage.getItem('bol-project-credits')||'{}');}catch{}
  for(const key of ['team','course','section','instructor','institution'])state.credits[key]=String(local[key]??configured[key]??'').slice(0,2000);
  renderCredits();
}

function bindInteractions(){
  $('#sound-toggle').addEventListener('click',()=>{const open=$('#sound-panel').hidden;$('#sound-panel').hidden=!open;$('#sound-toggle').setAttribute('aria-expanded',String(open));});
  document.addEventListener('click',event=>{if(!event.target.closest('#sound-panel,#sound-toggle'))closeSound();});
  $('#motion-toggle').addEventListener('click',()=>{
    state.atmospherePaused=!state.atmospherePaused;document.body.classList.toggle('motion-paused',state.atmospherePaused);
    effects.setPaused(state.atmospherePaused);$('#motion-toggle').textContent=state.atmospherePaused?'Resume atmosphere':'Pause atmosphere';
    const video=$('#atmosphere-video');if(state.atmospherePaused)video.pause();else if(state.mode==='intro'&&!state.reduced)video.play().catch(()=>{});
  });
  $('#chapters-toggle').addEventListener('click',openDrawer);$('#close-drawer').addEventListener('click',closeDrawer);$('#drawer-backdrop').addEventListener('click',closeDrawer);
  $('#chapter-drawer').addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeDrawer();return;}
    if(event.key==='Tab'){
      const focusable=$$('#chapter-drawer button');const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSound();});
  $('#open-book').addEventListener('click',()=>openBook());$('#artifact-open').addEventListener('click',()=>openBook());
  $('#skip-story').addEventListener('click',()=>openBook());
  $('.skip-link').addEventListener('click',event=>{event.preventDefault();openBook(2,true);});
  $('#scroll-next').addEventListener('click',()=>scrollToScene(Math.min(4,state.scene+1)));
  $$('.journey-markers button').forEach(button=>button.addEventListener('click',()=>scrollToScene(Number(button.dataset.scene))));
  ['#home-button','#back-to-journey','#drawer-replay','#restart'].forEach(id=>$(id).addEventListener('click',restartIntro));
  ['#about-button','#reader-about','#credits-sources'].forEach(id=>$(id).addEventListener('click',showAbout));
  $('#return-book').addEventListener('click',()=>openBook(14,true));
  $('#skip-finale').addEventListener('click',showCredits);
  $$('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
  }));
  $('#storybook').addEventListener('click',event=>{
    const discovery=event.target.closest('[data-discovery]');if(discovery){event.stopPropagation();showDiscovery(discovery.dataset.discovery);return;}
    const bridge=event.target.closest('#light-bridge');if(bridge){
      const on=bridge.getAttribute('aria-pressed')!=='true';bridge.setAttribute('aria-pressed',String(on));
      $('#bridge-interaction').classList.toggle('active',on);$('#bridge-status').textContent=on?'The golden path is lit.':'The path returns to rest.';audio.effect();return;
    }
    const candle=event.target.closest('[data-candle]');if(candle){
      const on=candle.getAttribute('aria-pressed')!=='true';candle.setAttribute('aria-pressed',String(on));candle.classList.toggle('lit',on);
      const content=candle.closest('.page-content');const count=content.querySelectorAll('.memory-candle.lit').length;
      content.classList.toggle('warmed',count>0);content.querySelector('.candle-count').textContent=count===3?'Three lights. A world of memories.':count?`${count} ${count===1?'light':'lights'} for a memory held close.`:'A little light goes a long way.';audio.effect();return;
    }
    if(event.target.closest('#begin-finale'))beginFinale();
  });
  // Keep embedded controls from beginning a page fold while still allowing native corner dragging.
  if(window.jQuery)jQuery('#storybook').on('mousedown touchstart','button,a,input',event=>event.stopPropagation());
  $('#edit-credits').addEventListener('click',()=>{
    for(const [key,value] of Object.entries(state.credits)){const input=$('#credits-form').elements.namedItem(key);if(input)input.value=value;}
    $('#credits-dialog').showModal();
  });
  $('#credits-form').addEventListener('submit',event=>{
    event.preventDefault();const data=new FormData(event.target);
    for(const key of ['team','course','section','instructor','institution'])state.credits[key]=String(data.get(key)||'').trim().slice(0,2000);
    try{localStorage.setItem('bol-project-credits',JSON.stringify(state.credits));}catch{announce('Credits are updated for this visit. Browser storage is unavailable.');}
    renderCredits();$('#credits-dialog').close();announce('Your project credits have been updated.');
  });
  motionQuery.addEventListener('change',()=>{
    state.reduced=motionQuery.matches;effects.setReduced(state.reduced);book.setReduced(state.reduced);
    // Rebuild only the cinematic timeline so the system preference takes effect immediately.
    scrollController?.kill();introTimeline?.kill();
    if(window.gsap)gsap.set('.scene-copy,.awakening-copy,.hero-copy,.gate-leaf,.artifact-button,.world-panorama',{clearProps:'transform,opacity'});
    initScroll();if(state.mode!=='intro')scrollController?.disable(false);
    if(state.reduced)$('#atmosphere-video').pause();else if(state.mode==='intro'&&!state.atmospherePaused)$('#atmosphere-video').play().catch(()=>{});
  });
}

buildDecorations();buildChapterMenu();bindInteractions();initScroll();loadCredits();
setActiveScene(0);
if(state.reduced)$('#atmosphere-video').pause();
// Useful for recovery and deterministic checks without coupling controllers to the DOM globally.
window.experience={get mode(){return state.mode;},get chapter(){return Math.floor((book.currentPage-2)/2);},get bookReady(){return book.ready;},get bookEngine(){return book.native?'turnjs':'fallback';},restart:restartIntro};
window.addEventListener('pageshow',()=>{if(state.mode==='intro'){window.ScrollTrigger?.refresh();}});
