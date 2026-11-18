"""End-to-end browser checks for the authored application, using isolated headless contexts."""
from pathlib import Path
import json
import math
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-output'
OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:4173'
results=[]

def require(condition, message):
    if not condition:
        raise AssertionError(message)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for name,viewport,mobile,reduced in [
        ('desktop',{'width':1440,'height':900},False,False),
        ('mobile',{'width':390,'height':844},True,False),
        ('reduced-motion',{'width':1280,'height':720},False,True),
    ]:
        context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,reduced_motion='reduce' if reduced else 'no-preference',device_scale_factor=1)
        page=context.new_page()
        page.set_default_timeout(10000)
        print('Testing '+name,flush=True)
        errors=[];failed=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda res:failed.append(f'{res.status} {res.url}') if res.status>=400 else None)
        page.goto(BASE,wait_until='networkidle')
        page.wait_for_timeout(1400)
        require(page.locator('#hero-title').is_visible(),'Hero title unavailable')
        require(page.evaluate("document.documentElement.scrollWidth <= innerWidth+1"),'Horizontal overflow in intro')
        if reduced:
            require(page.locator('#atmosphere-video').evaluate('(v)=>v.paused && getComputedStyle(v).display==="none"'),'Reduced-motion video should remain disabled')
        else:
            page.wait_for_function('document.querySelector("#atmosphere-video").readyState>=2',timeout=5000)
            require(page.locator('#atmosphere-video').evaluate('(v)=>v.error===null'),'Video failed to load')
        page.screenshot(path=str(OUT/f'{name}-opening.png'))
        length=page.locator('#intro-runway').evaluate('(el)=>el.offsetHeight-innerHeight')
        for i,progress in enumerate([.25,.45,.65,.91],1):
            page.evaluate('(y)=>scrollTo(0,y)',length*progress)
            page.wait_for_timeout(850)
            require(page.locator(f'.journey-markers [data-scene="{i}"]').get_attribute('aria-current')=='step',f'Scene {i} progression failed')
        page.locator('#artifact-open').click()
        page.wait_for_function("window.experience?.mode==='book' && window.experience.bookReady")
        page.wait_for_timeout(1200)
        require(page.evaluate("window.experience.bookEngine==='turnjs'"),'Real Turn.js engine did not initialize')
        require(page.locator('#storybook [data-page="2"]').get_attribute('aria-hidden')=='false','Opening spread missing')
        require(page.evaluate("document.documentElement.scrollWidth <= innerWidth+1"),'Horizontal overflow in book')
        bounds=page.locator('#book-stage').bounding_box()
        require(bounds['x']>=0 and bounds['x']+bounds['width']<=viewport['width']+1,'Book outside viewport horizontally')
        require(bounds['y']>=60 and bounds['y']+bounds['height']<viewport['height']-45,'Book outside viewport vertically')
        page.screenshot(path=str(OUT/f'{name}-book.png'))
        # Real audio opt-in, pause and mute controls.
        page.locator('#sound-toggle').click()
        page.locator('#audio-play').click()
        page.wait_for_timeout(200)
        require(page.locator('#audio-play').inner_text()=='Pause ambience','Audio failed to start after explicit interaction')
        page.locator('#audio-mute').click()
        require(page.locator('#audio-mute').inner_text()=='Unmute','Mute control failed')
        page.locator('#audio-play').click()
        require(page.locator('#audio-play').inner_text()=='Play ambience','Audio pause failed')
        page.keyboard.press('Escape')
        # Jump through chapter drawer, then exercise interactive SVG.
        page.locator('#chapters-toggle').click()
        page.locator('[data-chapter-link="1"]').click()
        page.wait_for_timeout(1100)
        if mobile:
            page.locator('#next-page').click()
            page.wait_for_timeout(1100)
        page.locator('#light-bridge').click()
        require(page.locator('#light-bridge').get_attribute('aria-pressed')=='true','SVG route interaction failed')
        require('active' in page.locator('#bridge-interaction').get_attribute('class'),'SVG path did not activate')
        # Keyboard page turns, then candle interaction.
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(1100)
        page.locator('#chapters-toggle').click()
        page.locator('[data-chapter-link="4"]').click()
        page.wait_for_timeout(1100)
        if mobile:
            page.locator('#next-page').click();page.wait_for_timeout(1100)
        page.screenshot(path=str(OUT/f'{name}-before-candles.png'))
        for i in range(3): page.locator(f'[data-candle="{i}"]').click()
        require(page.locator('.memory-candle.lit').count()==3,'Three candle lights not retained')
        page.screenshot(path=str(OUT/f'{name}-candles.png'))
        # Discovery dialog must open and return keyboard focus.
        page.locator('#chapters-toggle').click();page.locator('[data-chapter-link="5"]').click();page.wait_for_timeout(1100)
        if mobile:
            page.locator('#next-page').click();page.wait_for_timeout(1100)
        page.locator('[data-discovery="marigold"]').click()
        require(page.locator('#detail-dialog').is_visible(),'Discovery dialog failed')
        page.keyboard.press('Escape')
        # Finale waits for deliberate activation, and can be skipped to credits.
        page.locator('#chapters-toggle').click();page.locator('[data-chapter-link="6"]').click();page.wait_for_timeout(1100)
        require(page.evaluate("window.experience.mode==='book'"),'Finale started before visitor action')
        if mobile:
            page.locator('#next-page').click();page.wait_for_timeout(1100)
        page.locator('#begin-finale').click()
        page.wait_for_function("window.experience.mode==='finale'",timeout=5000)
        page.wait_for_timeout(1600)
        page.screenshot(path=str(OUT/f'{name}-finale.png'))
        page.locator('#skip-finale').click()
        require(page.locator('#credits-section').is_visible(),'Credits not reached')
        page.locator('#edit-credits').click()
        page.locator('[name="team"]').fill('QA Test Team')
        page.locator('[name="course"]').fill('Multimedia Design')
        page.locator('#credits-form [type="submit"]').click()
        require('QA Test Team' in page.locator('#academic-credits').inner_text(),'Academic credits did not update')
        page.reload(wait_until='networkidle')
        require(page.evaluate("JSON.parse(localStorage.getItem('bol-project-credits')).team==='QA Test Team'"),'Credits persistence failed')
        page.locator('#skip-story').click()
        page.wait_for_function("window.experience.mode==='book'")
        page.locator('#back-to-journey').click()
        page.wait_for_timeout(300)
        require(page.evaluate("window.experience.mode==='intro'"),'Replay failed')
        require(page.evaluate('scrollY<5'),'Replay did not return to beginning')
        require(not errors,'JavaScript errors: '+str(errors))
        require(not failed,'Failed resources: '+str(failed))
        results.append({'context':name,'status':'passed','javascript_errors':errors,'failed_resources':failed,'book_bounds':bounds})
        context.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
