AGOS LLC inquiry routing update — October 22, 2026

Preserved existing contact Worker endpoint and request schema (name, email, topic, message, company).
Added optional Subject input, embedded at the top of the message to remain compatible with the existing Worker.
Whitelisted topic query parameters for automated inquiry selection; subject limited to 120 characters.
Replaced mailto links in HTML, including press and TACH withdrawal, with contact form routes.
Retained existing functional TACH launch signup and consent checkbox; switched its failure fallback away from mailto to contact page.
Kept existing privacy text, GA4, site styling and footer.
Note: Existing TACH launch signup is an email-delivered request, not a subscription database. Consent retention, withdrawal handling, and future notifications remain manual unless the backend is extended.
Do not claim a dedicated waitlist system exists.
Deploy all included files with original folder structure.
