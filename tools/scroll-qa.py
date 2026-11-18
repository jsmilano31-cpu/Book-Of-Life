"""Check real scrolling, rendered scene changes, book opening, and stale-entry recovery."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
import json
import re
import subprocess
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-output'
OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:4173'

# Conditional development requests must still retrieve current content.
for path in ('/','/js/main.js','/styles.css'):
    request=Request(BASE+path,headers={'If-Modified-Since':'Wed, 31 Dec 2036 23:59:59 GMT'})
    with urlopen(request) as response:
        assert response.status==200,(path,response.status)
        assert 'no-store' in response.headers.get('Cache-Control',''),path

legacy=subprocess.check_output(['git','show','4ccbba1e2e5da498cd97b4e60dd634cdae871d81:dist/js/main.js'],cwd=ROOT,text=True,encoding='utf-8')
reports=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for name,viewport,mobile in [('desktop-wheel',{'width':1920,'height':1000},False),('mobile-touch',{'width':390,'height':844},True)]:
        context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
        page=context.new_page();errors=[];legacy_used=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        def old_entry(route):
            if not urlparse(route.request.url).query:
                legacy_used.append(True)
                route.fulfill(status=200,content_type='application/javascript',body=legacy)
            else:
                route.continue_()
        page.route(re.compile(r'/js/main\.js(?:\?.*)?$'),old_entry)
        page.goto(BASE,wait_until='networkidle');page.wait_for_timeout(1200)
        assert page.locator('script[type="module"]').get_attribute('src').startswith('js/main.js?v=')
        assert not legacy_used,'Updated page requested the retained legacy entry URL'
        observed=set()
        session=context.new_cdp_session(page) if mobile else None
        page.mouse.move(viewport['width']*.7,viewport['height']*.55)
        for step in range(13):
            if step:
                if mobile:
                    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':195,'y':650}]})
                    page.wait_for_timeout(40)
                    for move in range(1,16):
                        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':195,'y':650-move*32}]})
                        page.wait_for_timeout(25)
                    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                else:
                    page.mouse.wheel(0,600)
                page.wait_for_timeout(750)
            visible=page.locator('.cinematic-scene').evaluate_all('''scenes=>scenes.filter(el=>getComputedStyle(el).visibility==='visible'&&Number(getComputedStyle(el).opacity)>.75).map(el=>el.id)''')
            observed.update(visible)
            if 'scene-awakening' in visible:break
        expected={'scene-cemetery','scene-friends','scene-turning','scene-world','scene-awakening'}
        assert expected.issubset(observed),(name,observed)
        assert page.locator('#artifact-open').is_visible()
        page.screenshot(path=str(OUT/f'{name}-scroll-recovered.png'))
        if mobile:page.locator('#artifact-open').tap()
        else:page.locator('#artifact-open').click()
        page.wait_for_function("window.experience.mode==='book' && window.experience.bookReady")
        page.wait_for_timeout(1200)
        initial=page.locator('#storybook').evaluate("el=>jQuery(el).turn('view')")
        page.locator('#next-page').click();page.wait_for_timeout(1200)
        advanced=page.locator('#storybook').evaluate("el=>jQuery(el).turn('view')")
        assert max(advanced)>max(initial),(initial,advanced)
        assert not errors,errors
        reports.append({'context':name,'rendered_scenes':sorted(observed),'book_open':'passed','page_turn':'passed','stale_entry_bypassed':not legacy_used,'errors':errors})
        print(name+' passed',flush=True)
        context.close()
    browser.close()
(OUT/'scroll-recovery-report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print(json.dumps(reports,indent=2))
