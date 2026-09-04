I need to change something in how we're building the product catalog — please read this fully before changing any code.

**What's changing:** I'd tested the WordPress sync as we built it, and on a slow connection it felt risky and fragile — I don't want the booking app's speed or reliability depending on adventure-lombok.com being fast or even online. So I've updated the spec (§5 has been rewritten — please re-read it) to remove the WordPress sync entirely.

**New approach:** every product — Tours, Activities, Car Hire, Transport — gets added by hand into the booking app's own admin, the same way Car Hire was already going to work. I'll copy the content over from adventure-lombok.com myself when I add each product. The booking app should never call the WordPress site for anything at runtime.

**What I need from you:**
1. If you've already built any WordPress REST API sync code, scheduled sync jobs, or webhook listeners — please remove them.
2. Build the "add/edit product" admin screen described in the revised §5 — one form that works for all four product types, covering title, description, price, duration, images, location, category, and per-date capacity (capacity is now entered and tracked directly in our own database, not pulled from anywhere).
3. There's one optional field on each product now: `source_url`, a link to the matching page on adventure-lombok.com. This isn't used for syncing anything — it's just there so we can later push reviews back to the website (that's a Phase 3 feature described in the new §6n, not something to build yet, just wanted you to know why that field exists).
4. Please confirm back to me what still works and what needs rebuilding, before you start rebuilding anything.

To be clear, this doesn't change anything else about Phase 1 — checkout, booking confirmation, the account dashboard, all of that stays exactly as we had it. This is only about how products get into the system.
