from PIL import Image
import os

files = sorted(os.listdir("extracted_images"))
for f in files:
    if f.endswith(".png"):
        p = os.path.join("extracted_images", f)
        im = Image.open(p)
        print(f"{f}: size={im.size}, mode={im.mode}")
