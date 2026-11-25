import sys, glob
from PIL import Image, ImageDraw
pat, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(glob.glob(pat))
ims = [Image.open(f) for f in fs]
W = 480; H = int(ims[0].height * W / ims[0].width)
rows = (len(ims) + cols - 1) // cols
m = Image.new('RGB', (W * cols, H * rows))
d = ImageDraw.Draw(m)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * W, (i // cols) * H
    m.paste(im.resize((W, H)), (x, y)); d.text((x + 4, y + 4), f.split('_')[-1].replace('.png', ''), fill=(255, 255, 0))
m.save(out)
