"""Regression checks for the image entrance and its scroll animation."""

import json

from playwright.sync_api import sync_playwright
from settings import BASE, OUT

reports = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    for name, viewport, reduced in [
        ("desktop", {"width": 1440, "height": 900}, False),
        ("mobile", {"width": 390, "height": 844}, False),
        ("reduced", {"width": 1280, "height": 720}, True),
    ]:
        context = browser.new_context(
            viewport=viewport,
            reduced_motion="reduce" if reduced else "no-preference",
            is_mobile=name == "mobile",
            has_touch=name == "mobile",
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(1400)
        assert page.locator("#cemetery-gate").evaluate("(el)=>el.tagName") == "DIV"
        assert page.locator("#cemetery-gate img").evaluate_all(
            "(images)=>images.every(im=>im.complete&&im.naturalWidth>0)"
        )
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        gate = page.locator(".gate-left")
        closed = gate.evaluate("(el)=>getComputedStyle(el).transform")
        leaf_before = gate.bounding_box()
        posts_before = page.locator(".gate-post-left").bounding_box()
        title_before = page.locator("#hero-title").bounding_box()
        page.screenshot(path=str(OUT / f"gate-{name}-closed.png"))
        length = page.locator("#intro-runway").evaluate(
            "(el)=>el.offsetHeight-innerHeight"
        )
        page.evaluate("(y)=>scrollTo(0,y)", length * 0.14)
        page.wait_for_timeout(1300)
        opened = gate.evaluate("(el)=>getComputedStyle(el).transform")
        posts_after = page.locator(".gate-post-left").bounding_box()
        assert all(
            abs(posts_before[k] - posts_after[k]) < 1
            for k in ["x", "y", "width", "height"]
        ), "Gate posts moved with the doors"
        if reduced:
            assert opened == closed, "Reduced-motion gate should remain still"
        else:
            assert opened != closed, "Image leaves did not open with scroll"
        page.screenshot(path=str(OUT / f"gate-{name}-opening.png"))
        page.evaluate("scrollTo(0,0)")
        page.wait_for_timeout(1300)
        reset = gate.evaluate("(el)=>getComputedStyle(el).transform")
        leaf_reset = gate.bounding_box()
        assert all(
            abs(leaf_before[k] - leaf_reset[k]) < 1
            for k in ["x", "y", "width", "height"]
        ), "Gate did not close when scrolling back"
        page.locator("#skip-story").click()
        page.wait_for_function(
            "window.experience.mode==='book' && window.experience.bookReady"
        )
        assert page.evaluate("window.experience.bookEngine==='turnjs'")
        page.locator("#back-to-journey").click()
        page.wait_for_timeout(300)
        assert page.evaluate("window.experience.mode==='intro'")
        assert not errors, errors
        reports.append(
            {
                "viewport": name,
                "status": "passed",
                "closed_transform": closed,
                "open_transform": opened,
                "title_bounds": title_before,
                "errors": errors,
            }
        )
        context.close()
    # A failed decorative gate image must never block the narrative or book.
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route("**/cemetery-gate-image.webp", lambda route: route.abort())
    page.goto(BASE, wait_until="networkidle")
    page.locator("#skip-story").click()
    page.wait_for_function("window.experience.mode==='book'")
    assert not errors, errors
    reports.append({"gate_image_failure": "book remains accessible"})
    context.close()
    browser.close()
(OUT / "gate-report.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
print(json.dumps(reports, indent=2))
