# Sprint 1 test cases – Campus Canteen Pre-order App

Jira story: **AL-11 (US06) Test ordering flow end to end**
Covers: AL-6 (menu data), AL-7 (category tabs), AL-8 (cart and pre-order), AL-10 (pickup slots), AL-9 (kitchen view)

- **App:** https://harshafiitjee-creator.github.io/canteen-preorder-app/
- **Kitchen view:** https://harshafiitjee-creator.github.io/canteen-preorder-app/kitchen.html (demo manager PIN `1234`)
- **Testing helpers:** add `?time=HH:MM` to the link to pretend it is that time (e.g. `?time=12:10`); add `&test=1` to show a button that fills the 12:30 slot with 20 dummy orders.
- **Start fresh:** clear the site's data in your browser settings (this deletes saved orders on that phone).
- **Sample data only.** Never type real names, phone numbers or emails.

## Results – run on 20 Oct 2026 (version: main after PR #9)

| ID | Story | Steps | Expected result | Pass/Fail | Remarks |
|---|---|---|---|---|---|
| TC01 | AL-6 | Open the app. Tap Snacks, Meals, Beverages in turn and count the items. | Every available item is listed with its name and ₹ price (27 in total). | Pass | 27 available items listed with name and price |
| TC02 | AL-6 | Look through all three tabs for Maggi (Masala), Veg Fried Rice, Cold Coconut Water. | These 3 items (marked unavailable) are not shown anywhere. | Pass | All 3 hidden |
| TC03 | AL-7 | Open the app without tapping anything. | Snacks tab is highlighted and only snacks are shown. | Pass | 9 snack items |
| TC04 | AL-7 | Tap Meals, then Beverages. | Each tab shows only items from that category. | Pass | No mixing between tabs |
| TC05 | AL-7 | On the Meals tab, look at "Paneer Butter Masala with Roti" and the Veg/Non-veg labels. | Long names wrap onto two lines (never cut off with "…"); labels are correct (e.g. Chicken Biryani = Non-veg). | Pass | Names wrap fully; labels match data |
| TC06 | AL-8 | Tap Add on Samosa twice and on Masala Chai once. | Button shows "Added ✓" briefly; a bar at the bottom shows "3 items · ₹65 — View cart". | Pass | 3 items · ₹65 |
| TC07 | AL-8 | In the cart, tap − on an item with quantity 1. | The item disappears; with an empty cart the cart and bar hide. | Pass | Item removed at 0 |
| TC08 | AL-8 | Add an item, choose a slot, leave the name empty, tap Place Order. *(error case)* | Order is not placed; red message "Please enter your name…" under the button. | Pass | Blocked with message |
| TC09 | AL-10 | Open the app with `?time=12:10`, add an item, look at Pickup time. | Only 12:15 onwards are offered (12:00 is not). | Pass | 12:15 – 13:45 offered |
| TC10 | AL-10 | Open with `?time=13:50`, add an item. | "No more pickup slots today." | Pass | Message shown |
| TC11 | AL-10 | Add an item, type a name, do not choose a slot, tap Place Order. *(error case)* | Order is not placed; "Please choose a pickup time". | Pass | Blocked with message |
| TC12 | AL-8 / AL-10 | Add Samosa + Masala Chai, choose 12:45, name "Riya Test", Place Order, then tap View My Orders. | Green confirmation with order number and 12:45 is visible; My Orders shows the order, status **Received**, pickup 12:45, total ₹40. | Pass | Order #1001 confirmed; My Orders correct |
| TC13 | AL-10 | Open with `?time=12:10&test=1`, add an item, tap "Fill 12:30 slot (test)". | 12:30 shows **Full** in grey and cannot be tapped. | Pass | Full and disabled |
| TC14 | AL-10 | Open with `?time=12:10&test=1`, add an item, choose 12:30, then tap the fill button, type a name, Place Order. *(error case)* | Order is not placed; 12:30 still has exactly 20 orders. | Pass | Slot stays at 20 (was a defect, fixed in AL-54) |
| TC15 | AL-9 | Open kitchen.html. Try PIN `0000`. | No orders shown before the PIN; wrong PIN shows "Wrong PIN…" and still no orders. | Pass | Orders hidden |
| TC16 | AL-9 | Place orders for 13:15, 12:00 and 12:30 (any names). Open kitchen.html, enter `1234`. | Orders are grouped and sorted 12:00 → 12:30 → 13:15. | Pass | Sorted correctly |
| TC17 | AL-9 | On the student app, look for any link or button to the kitchen. | There is none. | Pass | No link |
| TC18 | All | Open the app on a small phone (320 px wide) and scroll. | Nothing is cut off; no sideways scrolling. | Pass | Fits the screen |

**Summary:** 18 test cases, 18 passed, 0 failed on this run.

## Defects found during Sprint 1 testing

Every failure found while testing the stories was logged in Jira as a **Bug** linked to its story, fixed on its own branch, and re-tested.

| Bug | Found while testing | Problem | Fixed in | Status |
|---|---|---|---|---|
| AL-52 | AL-6 | Menu page showed "Menu data not found" instead of items | PR #2 | Done |
| AL-53 | AL-8 | No confirmation after ordering; cart was off-screen | PR #5, PR #6 | Done |
| AL-54 | AL-10 | Slot could exceed 20 orders; capacity never reset each day | PR #8 | Done |

Defects found: 3 · Defects fixed: 3 (100%).

## How to re-run automatically (optional, for developers)

`tests/run-tests.mjs` runs all 18 cases in a headless browser and prints Pass/Fail with remarks:

```
npm install playwright
npx playwright install chromium
node tests/run-tests.mjs
```

Test cases drafted and automated with an AI assistant (Claude) and reviewed against each story's acceptance criteria. Recorded in the AI usage log.
