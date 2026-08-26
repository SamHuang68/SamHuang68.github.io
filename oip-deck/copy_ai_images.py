import os
import shutil
import glob

artifact_dir = r"C:\Users\Sam\.gemini\antigravity\brain\f49660f9-bbf4-4fb5-b371-2db34bc2f14a"
target_dir = "generated_diagrams"
os.makedirs(target_dir, exist_ok=True)

image_mapping = {
    1: "slide_01_hero_subsystem_*.jpg",
    2: "slide_02_power_off_state_*.jpg",
    3: "slide_03_fib_attack_threat_*.jpg",
    4: "slide_04_defense_in_depth_*.jpg",
    5: "slide_05_soc_subsystem_blocks_*.jpg",
    6: "slide_06_key_lifecycle_fsm_*.jpg",
    7: "slide_07_puf_fuzzy_extractor_*.jpg",
    8: "slide_08_commercial_automotive_*.jpg",
    9: "slide_09_single_ip_contract_*.jpg",
    10: "slide_10_tsmc_nodes_*.jpg",
    11: "slide_11_decoupled_key_*.jpg",
    12: "slide_12_forensic_attack_*.jpg",
}

for slide_num, pattern in image_mapping.items():
    search_path = os.path.join(artifact_dir, pattern)
    matches = glob.glob(search_path)
    if matches:
        latest = sorted(matches)[-1]
        dest_filename = f"ai_visual_slide_{slide_num:02d}.jpg"
        dest_path = os.path.join(target_dir, dest_filename)
        shutil.copy(latest, dest_path)
        print(f"Slide {slide_num}: Copied {latest} -> {dest_path}")
    else:
        print(f"Slide {slide_num}: No match found for pattern {pattern}")
