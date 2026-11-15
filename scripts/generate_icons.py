from PIL import Image, ImageDraw, ImageFont
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO_ROOT, "frontend", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

BG = (249, 115, 22)  # orange-500
FG = (255, 255, 255)

def make_icon(size, path):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    # Simple basketball-ish circle + seams as a placeholder mark.
    margin = int(size * 0.12)
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        outline=FG,
        width=max(2, size // 32),
    )
    draw.line([(size // 2, margin), (size // 2, size - margin)], fill=FG, width=max(2, size // 40))
    draw.line([(margin, size // 2), (size - margin, size // 2)], fill=FG, width=max(2, size // 40))
    draw.arc(
        [margin, margin, size - margin, size - margin],
        start=20, end=160, fill=FG, width=max(2, size // 40),
    )
    draw.arc(
        [margin, margin, size - margin, size - margin],
        start=200, end=340, fill=FG, width=max(2, size // 40),
    )
    img.save(path)

sizes = [192, 512]
for s in sizes:
    make_icon(s, os.path.join(OUT_DIR, f"icon-{s}.png"))

# Maskable variant (same art, PWA maskable icons just need extra safe padding
# baked into the same square canvas; our design already has margin).
for s in sizes:
    make_icon(s, os.path.join(OUT_DIR, f"icon-{s}-maskable.png"))

print("icons written to", OUT_DIR)
