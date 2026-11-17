import {chapters, createPages} from './content.js';

/** Turn.js remains isolated here; cinematic navigation never drives its page state. */
export class BookController {
  constructor({onChapter,onPageSound,reduced}) {
    this.element=document.querySelector('#storybook');this.stage=document.querySelector('#book-stage');
    this.onChapter=onChapter;this.onPageSound=onPageSound;this.reduced=reduced;
    this.currentPage=2;this.ready=false;this.turning=false;this.native=false;this.swipe=null;
    document.querySelector('#previous-page').addEventListener('click',()=>this.navigate(-1));
    document.querySelector('#next-page').addEventListener('click',()=>this.navigate(1));
    document.addEventListener('keydown',event=>{
      if(document.body.dataset.mode!=='book'||document.querySelector('dialog[open]')||!document.querySelector('#chapter-drawer').hidden)return;
      if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
      if(event.key==='ArrowRight'){event.preventDefault();this.navigate(1);}
      if(event.key==='ArrowLeft'){event.preventDefault();this.navigate(-1);}
    });
    this.stage.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch'||event.target.closest('button,a,input'))return;
      const rect=this.stage.getBoundingClientRect();
      const nearSide=event.clientX-rect.left<40||rect.right-event.clientX<40;
      const nearEnd=event.clientY-rect.top<50||rect.bottom-event.clientY<50;
      if(this.native&&nearSide&&nearEnd){this.swipe=null;return;}
      this.swipe={x:event.clientX,y:event.clientY,page:this.currentPage};
    },{passive:true});
    this.stage.addEventListener('pointercancel',()=>{this.swipe=null;},{passive:true});
    this.stage.addEventListener('pointerup',event=>{
      if(!this.swipe)return;
      const start=this.swipe;this.swipe=null;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.7&&this.currentPage===start.page&&!this.turning)this.navigate(dx<0?1:-1);
    },{passive:true});
    let resizeTimer;
    window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(this.ready&&!document.querySelector('#book-section').hidden)this.resize();},160);},{passive:true});
  }
  dimensions(){
    const single=window.innerWidth<=760;
    const section=document.querySelector('#book-section');
    const sectionStyle=getComputedStyle(section);
    const occupied=['.reader-heading','.book-navigation','.reader-footer'].reduce((sum,selector)=>{
      const element=section.querySelector(selector),style=getComputedStyle(element);
      return sum+element.getBoundingClientRect().height+parseFloat(style.marginTop)+parseFloat(style.marginBottom);
    },0);
    const availableHeight=window.innerHeight-parseFloat(sectionStyle.paddingTop)-parseFloat(sectionStyle.paddingBottom)-occupied-8;
    const maxHeight=single?595:620;
    const minHeight=single?290:300;
    const ratio=single?.71:1.83;
    const availableWidth=window.innerWidth*(single?.86:.86);
    let height=Math.min(maxHeight,Math.max(minHeight,availableHeight),availableWidth/ratio);
    let width=height*ratio;
    return {width:Math.round(width),height:Math.round(height),single};
  }
  init(){
    if(this.ready)return;
    this.element.innerHTML=createPages();
    this.pages=[...this.element.children];
    const d=this.dimensions();this.single=d.single;
    this.stage.style.width=d.width+'px';this.stage.style.height=d.height+'px';
    this.stage.classList.toggle('single-page',d.single);
    try {
      if(!window.jQuery?.fn.turn)throw new Error('Turn.js is unavailable');
      this.$book=window.jQuery(this.element);this.native=true;
      this.$book.turn({width:d.width,height:d.height,page:2,display:d.single?'single':'double',
        duration:this.reduced?1:900,acceleration:true,gradients:true,
        when:{
          turning:(event,page)=>{
            if(page<2||page>15){event.preventDefault();return;}
            this.turning=true;this.onPageSound?.();
          },
          turned:(event,page,view)=>{this.turning=false;this.currentPage=page;this.sync(view);},
          end:()=>{this.turning=false;}
        }
      });
      this.native=true;this.element.dataset.engine='turnjs';
      if(this.reduced)this.$book.turn('disable',true);
    } catch(error) {
      this.native=false;console.warn('Using accessible book fallback:',error.message);
      this.element.classList.add('fallback-book');this.element.dataset.engine='fallback';
      this.element.style.width=d.width+'px';this.element.style.height=d.height+'px';
    }
    this.ready=true;this.sync();
  }
  resize(){
    const d=this.dimensions();
    this.stage.style.width=d.width+'px';this.stage.style.height=d.height+'px';
    this.stage.classList.toggle('single-page',d.single);
    if(this.native){
      this.$book.turn('stop');
      if(d.single!==this.single){
        this.$book.turn('display',d.single?'single':'double');
        if(!d.single&&this.currentPage%2===1)this.currentPage--;
        this.$book.turn('page',this.currentPage);
      }
      this.$book.turn('size',d.width,d.height);
    } else {this.element.style.width=d.width+'px';this.element.style.height=d.height+'px';}
    this.single=d.single;this.sync();
  }
  setPage(page){
    const target=Math.max(2,Math.min(15,Number(page)));
    if(!this.ready)this.init();
    if(this.native){
      this.$book.turn('stop');this.turning=false;
      this.$book.turn('page',target);
      if(this.reduced){this.$book.turn('stop');this.turning=false;}
      this.currentPage=target;
    } else this.currentPage=target;
    this.sync();
  }
  setReduced(reduced){
    this.reduced=reduced;
    if(this.ready&&this.native){this.$book.turn('stop');this.$book.turn('disable',reduced);this.turning=false;}
  }
  navigate(direction){
    if(!this.ready||this.turning)return;
    const first=this.single?this.currentPage:Math.floor(this.currentPage/2)*2;
    const target=first+direction*(this.single?1:2);
    if(target<2||target>15)return;
    if(!this.native)this.onPageSound?.();
    this.setPage(target);
  }
  sync(view){
    const chapter=Math.max(0,Math.min(6,Math.floor((this.currentPage-2)/2)));
    const first=2+chapter*2;
    const visible=this.single?[this.currentPage]:[first,first+1];
    for(const page of this.pages||[]){
      const active=visible.includes(Number(page.dataset.page));
      page.classList.toggle('page-active',active);
      page.setAttribute('aria-hidden',String(!active));
      page.inert=!active;
      if(!this.native)page.hidden=!active;
    }
    this.element.classList.toggle('single-fallback',this.single);
    document.querySelector('#previous-page').disabled=this.currentPage<=2;
    document.querySelector('#next-page').disabled=this.single?this.currentPage>=15:chapter>=6;
    document.querySelector('#chapter-caption').textContent=`CHAPTER ${String(chapter+1).padStart(2,'0')} / 07${this.single?' · PAGE '+(this.currentPage-1)+' / 14':''}`;
    document.querySelector('#page-caption').textContent=chapters[chapter].title;
    document.querySelectorAll('[data-chapter-link]').forEach(button=>{
      const active=Number(button.dataset.chapterLink)===chapter;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    document.querySelector('#announcement').textContent=`Chapter ${chapter+1}: ${chapters[chapter].title}`;
    this.onChapter?.(chapter);
  }
}
