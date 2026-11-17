"""Targeted checks for physical page interaction, resizing, and dependency fallbacks."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

BASE='http://127.0.0.1:4173'
OUT=Path(__file__).resolve().parents[1]/'qa-output'
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    context=browser.new_context(viewport={'width':1366,'height':820},reduced_motion='no-preference')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='networkidle')
    page.locator('#skip-story').click();page.wait_for_function("window.experience.mode==='book'")
    page.wait_for_timeout(1200)
    # Drag the bottom-right corner of the real Turn.js book.
    bounds=page.locator('#storybook').bounding_box()
    x=bounds['x']+bounds['width']-3;y=bounds['y']+bounds['height']-3
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(bounds['x']+bounds['width']*.18,y-45,steps=35);page.mouse.up()
    page.wait_for_timeout(1300)
    assert page.evaluate('window.experience.chapter')==1,'Physical corner drag did not turn to chapter 2'
    results.append('Real Turn.js corner dragging')
    # Reflow the same initialized book, then restore desktop mode.
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600)
    assert page.locator('#book-stage').evaluate("el=>el.classList.contains('single-page')")
    assert page.locator('#storybook').evaluate("el=>jQuery(el).turn('display')")=='single'
    page.set_viewport_size({'width':1366,'height':820});page.wait_for_timeout(600)
    assert page.locator('#storybook').evaluate("el=>jQuery(el).turn('display')")=='double'
    results.append('Live desktop/mobile/desktop resizing')
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(300)
    page.locator('#next-page').click();page.wait_for_timeout(100)
    assert page.evaluate('window.experience.chapter')==2
    results.append('Runtime reduced-motion change')
    assert not errors,errors
    context.close()
    # Real touch events in an isolated emulated mobile context.
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=context.new_page();page.goto(BASE,wait_until='networkidle')
    page.locator('#skip-story').tap();page.wait_for_function("window.experience.mode==='book'");page.wait_for_timeout(1200)
    session=context.new_cdp_session(page);bounds=page.locator('#storybook').bounding_box()
    x=bounds['x']+bounds['width']*.85;y=bounds['y']+bounds['height']*.6
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for step in range(1,13):
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-210*step/12,'y':y}]})
    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.wait_for_timeout(1200)
    assert page.locator('#storybook').evaluate("el=>jQuery(el).turn('page')")>=3,'Touch swipe failed'
    results.append('Emulated touch swipe')
    context.close()
    # Missing libraries and blocked video retain usable text and page controls.
    context=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/assets/vendor/turn.js',lambda route:route.abort())
    page.route('**/assets/vendor/gsap.min.js',lambda route:route.abort())
    page.route('**/assets/vendor/ScrollTrigger.min.js',lambda route:route.abort())
    page.route('**/assets/video/atmosphere.mp4',lambda route:route.abort())
    page.goto(BASE,wait_until='networkidle');page.locator('#skip-story').click();page.wait_for_function("window.experience.mode==='book'")
    assert page.evaluate("window.experience.bookEngine==='fallback'")
    page.locator('#next-page').click()
    assert page.evaluate('window.experience.chapter')==1
    page.locator('#light-bridge').click()
    assert page.locator('#light-bridge').get_attribute('aria-pressed')=='true'
    page.locator('#back-to-journey').click()
    assert page.evaluate("window.experience.mode==='intro'")
    assert not errors,errors
    results.append('Missing-library and blocked-video fallbacks')
    context.close();browser.close()
(OUT/'interaction-report.json').write_text(json.dumps({'status':'passed','checks':results},indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
