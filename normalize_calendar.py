from pathlib import Path
path = Path("frontend/src/components/CalendarPage.vue")
data = path.read_bytes()
text = data.decode("utf-8", errors="ignore")
path.write_text(text, encoding="utf-8")
