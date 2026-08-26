with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

for i in range(1, 13):
    old_str = f"generated_diagrams/diagram_slide_{i:02d}.png"
    new_str = f"generated_diagrams/ai_visual_slide_{i:02d}.jpg"
    content = content.replace(old_str, new_str)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("app.js updated successfully with ai_visual paths!")
