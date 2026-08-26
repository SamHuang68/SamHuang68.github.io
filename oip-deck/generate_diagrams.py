"""Module for generating 12 high-fidelity semiconductor diagrams in 100% English for TSMC OIP Secure Storage Presentation."""

import os
from typing import Tuple
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.lines as lines
import numpy as np

# Create output directory
OUTPUT_DIR = "generated_diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Common styling constants
BG_COLOR = "#061B29"
CARD_BG = "#0B2538"
CARD_BORDER = "#1E4765"
CYAN = "#00F0FF"
AMBER = "#FF8C42"
EMERALD = "#10B981"
PURPLE = "#A855F7"
RED = "#EF4444"
TEXT_WHITE = "#FFFFFF"
TEXT_MUTED = "#94A3B8"
ACCENT_BLUE = "#38BDF8"

# Set matplotlib global style
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'DejaVu Sans', 'Arial', 'sans-serif']
plt.rcParams['axes.edgecolor'] = CARD_BORDER
plt.rcParams['figure.facecolor'] = BG_COLOR
plt.rcParams['axes.facecolor'] = BG_COLOR
plt.rcParams['text.color'] = TEXT_WHITE


def save_fig(fig: plt.Figure, filename: str) -> None:
    """Save matplotlib figure with high DPI and close it."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    fig.savefig(filepath, dpi=300, bbox_inches='tight', facecolor=BG_COLOR, edgecolor='none')
    plt.close(fig)
    print(f"[Diagram Generated]: {filepath}")


# ==============================================================================
# SLIDE 1: Subsystem 3D SoC Integrated Architecture
# ==============================================================================
def generate_diagram_1() -> None:
    """Slide 1: Secure Storage 4-in-1 Subsystem on Advanced SoC."""
    fig, ax = plt.subplots(figsize=(10, 5.8))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # SoC Outer Boundary
    soc_box = patches.FancyBboxPatch((4, 6), 92, 88, boxstyle="round,pad=1.5,rounding_size=3",
                                    facecolor="#082032", edgecolor=CARD_BORDER, linewidth=2, linestyle="--")
    ax.add_patch(soc_box)
    ax.text(8, 90, "ADVANCED SoC TRUST BOUNDARY (TSMC N5 / N3)", fontsize=11, fontweight='bold', color=TEXT_MUTED)

    # Secure Storage Subsystem Boundary
    sub_box = patches.FancyBboxPatch((12, 14), 76, 70, boxstyle="round,pad=1.5,rounding_size=3",
                                     facecolor="#0B283E", edgecolor=CYAN, linewidth=2.5)
    ax.add_patch(sub_box)
    ax.text(16, 79, "SECURE STORAGE INTEGRATED SUBSYSTEM (SINGLE IP)", fontsize=12, fontweight='bold', color=CYAN)
    ax.text(16, 75, "Dynamic Root Key Generation  |  AES-256 Crypto  |  Encrypted AntiFuse OTP  |  Hardware APB Control",
            fontsize=8.5, color=TEXT_MUTED)

    # Block 1: SRAM PUF
    b1 = patches.FancyBboxPatch((16, 20), 16, 48, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0F3652", edgecolor=CYAN, linewidth=1.8)
    ax.add_patch(b1)
    ax.text(24, 62, "SRAM PUF", fontsize=11, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(24, 57, "EPHEMERAL ROOT", fontsize=8, fontweight='bold', color=CYAN, ha='center')
    ax.text(24, 48, "• Transistor Mismatch\n• Dynamic Reconstruct\n• Zero Key at Rest\n• Unclonable ID",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(24, 25, "KEY NEVER STORED", fontsize=7.5, fontweight='bold', color="#38BDF8", ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor="#38BDF8", lw=1))

    # Block 2: AES-256 Engine
    b2 = patches.FancyBboxPatch((35, 20), 16, 48, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0F3652", edgecolor=AMBER, linewidth=1.8)
    ax.add_patch(b2)
    ax.text(43, 62, "CRYPTO ENGINE", fontsize=11, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(43, 57, "AES-256 CORE", fontsize=8, fontweight='bold', color=AMBER, ha='center')
    ax.text(43, 48, "• Line-Speed Cipher\n• Transient Key Buffer\n• Hardware Accel\n• Instant Zeroize",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(43, 25, "ON-THE-FLY CIPHER", fontsize=7.5, fontweight='bold', color=AMBER, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor=AMBER, lw=1))

    # Block 3: Antifuse OTP
    b3 = patches.FancyBboxPatch((54, 20), 16, 48, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0F3652", edgecolor=EMERALD, linewidth=1.8)
    ax.add_patch(b3)
    ax.text(62, 62, "ANTIFUSE OTP", fontsize=11, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(62, 57, "NON-VOLATILE NVM", fontsize=8, fontweight='bold', color=EMERALD, ha='center')
    ax.text(62, 48, "• Scrambled Cipher\n• Permanent Storage\n• Split-Channel 1T\n• Anti-FIB Opacity",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(62, 25, "CIPHERTEXT ONLY", fontsize=7.5, fontweight='bold', color=EMERALD, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor=EMERALD, lw=1))

    # Block 4: Secure Controller
    b4 = patches.FancyBboxPatch((73, 20), 12, 48, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0F3652", edgecolor=PURPLE, linewidth=1.8)
    ax.add_patch(b4)
    ax.text(79, 62, "CONTROLLER", fontsize=10.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(79, 57, "APB & POLICY", fontsize=8, fontweight='bold', color=PURPLE, ha='center')
    ax.text(79, 48, "• Addr Scrambler\n• Access Control\n• Lifecycle FSM\n• Tamper Monitor",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(79, 25, "TRUST GATE", fontsize=7.5, fontweight='bold', color=PURPLE, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor=PURPLE, lw=1))

    # Data Interconnects (Arrows)
    ax.annotate('', xy=(35, 44), xytext=(32, 44),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=CYAN, lw=2))
    ax.text(33.5, 47, "Key", fontsize=7.5, color=CYAN, ha='center', fontweight='bold')

    ax.annotate('', xy=(54, 44), xytext=(51, 44),
                arrowprops=dict(arrowstyle="<->,head_width=0.4,head_length=0.6", color=AMBER, lw=2))
    ax.text(52.5, 47, "Cipher", fontsize=7.5, color=AMBER, ha='center', fontweight='bold')

    ax.annotate('', xy=(73, 44), xytext=(70, 44),
                arrowprops=dict(arrowstyle="<->,head_width=0.4,head_length=0.6", color=PURPLE, lw=2))
    ax.text(71.5, 47, "Ctrl", fontsize=7.5, color=PURPLE, ha='center', fontweight='bold')

    # AMBA APB Host Interface
    ax.annotate('', xy=(79, 14), xytext=(79, 6),
                arrowprops=dict(arrowstyle="<->,head_width=0.4,head_length=0.6", color=TEXT_WHITE, lw=2))
    ax.text(79, 4, "HOST AMBA APB INTERFACE", fontsize=8, color=TEXT_WHITE, ha='center', fontweight='bold')

    save_fig(fig, "diagram_slide_01.png")


# ==============================================================================
# SLIDE 2: The Executive Thesis - Power-Off State vs Power-Up
# ==============================================================================
def generate_diagram_2() -> None:
    """Slide 2: Security is Decided When System is Powered Off."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5.5))
    for ax in (ax1, ax2):
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.axis('off')

    # LEFT PANEL: POWER OFF (AT REST)
    bg1 = patches.FancyBboxPatch((3, 3), 94, 94, boxstyle="round,pad=1.5,rounding_size=3",
                                facecolor="#091D2C", edgecolor=RED, linewidth=2)
    ax1.add_patch(bg1)
    ax1.text(50, 91, "STATE 01: POWER-OFF (AT REST)", fontsize=11, fontweight='bold', color=RED, ha='center')
    ax1.text(50, 85, "Physical Attacker / FIB / Voltage Probing Window", fontsize=8, color=TEXT_MUTED, ha='center')

    # SRAM PUF in Power Off
    sram_off = patches.FancyBboxPatch((10, 54), 80, 24, boxstyle="round,pad=1,rounding_size=2",
                                     facecolor="#05121D", edgecolor=TEXT_MUTED, linewidth=1.5, linestyle=":")
    ax1.add_patch(sram_off)
    ax1.text(50, 68, "SRAM PUF (UNPOWERED)", fontsize=10, fontweight='bold', color=TEXT_MUTED, ha='center')
    ax1.text(50, 59, "[ABSENT] ROOT KEY COMPLETELY ABSENT\nNo charge, no physical state, zero leakage",
             fontsize=8, color="#FCA5A5", ha='center', fontweight='bold')

    # OTP in Power Off
    otp_off = patches.FancyBboxPatch((10, 18), 80, 28, boxstyle="round,pad=1,rounding_size=2",
                                    facecolor="#0D2E45", edgecolor=EMERALD, linewidth=1.8)
    ax1.add_patch(otp_off)
    ax1.text(50, 38, "ANTIFUSE OTP (PERSISTENT)", fontsize=10, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax1.text(50, 28, "[CIPHERTEXT] AES-256 SCRAMBLED CIPHERTEXT\nReadout yields only unintelligible random bits",
             fontsize=8, color="#86EFAC", ha='center')

    ax1.text(50, 7, "VERDICT: ATTACKER RECOVERS ZERO ROOT SECRETS", fontsize=8.5, fontweight='bold',
             color=EMERALD, ha='center', bbox=dict(boxstyle="round,pad=0.4", facecolor="#06251A", edgecolor=EMERALD, lw=1.2))

    # RIGHT PANEL: POWER UP (ACTIVE RUNTIME)
    bg2 = patches.FancyBboxPatch((3, 3), 94, 94, boxstyle="round,pad=1.5,rounding_size=3",
                                facecolor="#091D2C", edgecolor=CYAN, linewidth=2)
    ax2.add_patch(bg2)
    ax2.text(50, 91, "STATE 02: POWER-UP (ACTIVE RUNTIME)", fontsize=11, fontweight='bold', color=CYAN, ha='center')
    ax2.text(50, 85, "Hardware-Managed Reconstruction Inside Secure Boundary", fontsize=8, color=TEXT_MUTED, ha='center')

    # SRAM PUF in Power Up
    sram_on = patches.FancyBboxPatch((10, 54), 80, 24, boxstyle="round,pad=1,rounding_size=2",
                                    facecolor="#0B374D", edgecolor=CYAN, linewidth=1.8)
    ax2.add_patch(sram_on)
    ax2.text(50, 68, "SRAM PUF (POWERED)", fontsize=10, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax2.text(50, 59, "[DYNAMIC] DYNAMIC ROOT KEY RECONSTRUCTION\nTransistor mismatch measured -> 256-bit key instantiated",
             fontsize=8, color=CYAN, ha='center', fontweight='bold')

    # Crypto Engine & Decryption
    dec_on = patches.FancyBboxPatch((10, 18), 80, 28, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0F3652", edgecolor=AMBER, linewidth=1.8)
    ax2.add_patch(dec_on)
    ax2.text(50, 38, "ON-THE-FLY CRYPTO DECRYPTION", fontsize=10, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax2.text(50, 28, "[TRANSIENT] Plain data only in secure internal buffer\nImmediate zeroization upon operation finish",
             fontsize=8, color="#FDBA74", ha='center')

    ax2.text(50, 7, "VERDICT: SECURE OPERATION WITHOUT PERMANENT RESIDENCY", fontsize=8.5, fontweight='bold',
             color=CYAN, ha='center', bbox=dict(boxstyle="round,pad=0.4", facecolor="#062233", edgecolor=CYAN, lw=1.2))

    save_fig(fig, "diagram_slide_02.png")


# ==============================================================================
# SLIDE 3: Threat Landscape - RP2350 Multi-Vector Attack Breakdown
# ==============================================================================
def generate_diagram_3() -> None:
    """Slide 3: Public Threat Landscape & RP2350 Physical Attack Chain."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 94, "THE FATAL FLAW OF CONVENTIONAL PLAIN OTP ARCHITECTURE", fontsize=11, fontweight='bold', color=RED, ha='center')
    ax.text(50, 89, "RP2350 Hacking Challenge Lessons: Physical Probing & Fault Injection Bypass Software Locks",
            fontsize=8.5, color=TEXT_MUTED, ha='center')

    # 3 Attack Vectors
    # Box 1: Voltage Glitch / Fault Injection
    b1 = patches.FancyBboxPatch((4, 22), 28, 60, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#161A29", edgecolor=RED, linewidth=1.8)
    ax.add_patch(b1)
    ax.text(18, 76, "VECTOR 01", fontsize=9, fontweight='bold', color=RED, ha='center')
    ax.text(18, 71, "VOLTAGE FAULT\nINJECTION (FI)", fontsize=10.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(18, 55, "• Boot timing glitching\n• Permission lock bypass\n• Readout wrapper evasion\n• Clock / EM disturbance",
            fontsize=8, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(18, 30, "CONSEQUENCE:\nLock Bit Disabled", fontsize=8, fontweight='bold', color="#FCA5A5", ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#260C11", edgecolor=RED, lw=1))

    # Box 2: FIB / Passive Voltage Contrast
    b2 = patches.FancyBboxPatch((36, 22), 28, 60, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#161A29", edgecolor=AMBER, linewidth=1.8)
    ax.add_patch(b2)
    ax.text(50, 76, "VECTOR 02", fontsize=9, fontweight='bold', color=AMBER, ha='center')
    ax.text(50, 71, "FIB & PVC\nINVASIVE PROBING", fontsize=10.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(50, 55, "• Focused Ion Beam delid\n• Passive Voltage Contrast\n• Bit-cell 0/1 observation\n• Direct layout scanning",
            fontsize=8, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(50, 30, "CONSEQUENCE:\nRaw Cell Bits Read Out", fontsize=8, fontweight='bold', color="#FDBA74", ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#2A1608", edgecolor=AMBER, lw=1))

    # Box 3: Plain OTP Compromise
    b3 = patches.FancyBboxPatch((68, 22), 28, 60, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#161A29", edgecolor=PURPLE, linewidth=1.8)
    ax.add_patch(b3)
    ax.text(82, 76, "VECTOR 03", fontsize=9, fontweight='bold', color=PURPLE, ha='center')
    ax.text(82, 71, "CONVENTIONAL\nCOMPROMISE", fontsize=10.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(82, 55, "• Root Key extracted\n• Firmware decrypted\n• Device cloned / spoofed\n• Total IP theft",
            fontsize=8, color=TEXT_MUTED, ha='center', linespacing=1.4)
    ax.text(82, 30, "RESULT:\nFull System Breach", fontsize=8, fontweight='bold', color="#D8B4FE", ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#200B2E", edgecolor=PURPLE, lw=1))

    # Connectors
    ax.annotate('', xy=(36, 52), xytext=(32, 52),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=RED, lw=2))
    ax.annotate('', xy=(68, 52), xytext=(64, 52),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=AMBER, lw=2))

    # Bottom Core Principle Box
    bot_box = patches.FancyBboxPatch((4, 4), 92, 13, boxstyle="round,pad=1,rounding_size=2",
                                    facecolor="#082236", edgecolor=CYAN, linewidth=1.5)
    ax.add_patch(bot_box)
    ax.text(50, 10.5, "SECURE STORAGE PARADIGM: OTP READOUT != SECRET RECOVERY", fontsize=10, fontweight='bold', color=CYAN, ha='center')
    ax.text(50, 6.5, "Transform the physical attack target into cryptographically encrypted ciphertext.", fontsize=8, color=TEXT_WHITE, ha='center')

    save_fig(fig, "diagram_slide_03.png")


# ==============================================================================
# SLIDE 4: Defense-in-Depth - Multi-Layer Cryptographic Transformation
# ==============================================================================
def generate_diagram_4() -> None:
    """Slide 4: Defense in Depth - Transforming Plain Secrets to Ciphertext."""
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 94, "MULTI-LAYER DEFENSE PIPELINE: ISOLATING SECRETS FROM PHYSICAL SILICON",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    steps = [
        ("01. SENSITIVE ASSET", "• Root Firmware\n• Model Weights\n• Device Private Key\n• Rollback Counter", "#38BDF8", 6),
        ("02. AES-256 + PUF", "• Ephemeral Key\n• Hardware Crypto\n• Line-Speed Encr\n• No At-Rest Key", AMBER, 29),
        ("03. ADDR SCRAMBLING", "• Pseudo-random Map\n• Physical Obfuscation\n• Spatial Diffusion\n• Prevents Row Scan", PURPLE, 52),
        ("04. ANTIFUSE OTP", "• Scrambled Cipher\n• Split-Channel 1T\n• Twin-Cell Diff\n• Power Balance", EMERALD, 75)
    ]

    for title, desc, color, x in steps:
        box = patches.FancyBboxPatch((x, 26), 19, 58, boxstyle="round,pad=1,rounding_size=2",
                                     facecolor="#0B2538", edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + 9.5, 78, title, fontsize=9, fontweight='bold', color=color, ha='center')
        ax.text(x + 9.5, 54, desc, fontsize=7.8, color=TEXT_MUTED, ha='center', linespacing=1.4)
        ax.text(x + 9.5, 33, "SHIELD LAYER", fontsize=7, fontweight='bold', color=TEXT_WHITE, ha='center',
                bbox=dict(boxstyle="round,pad=0.2", facecolor=color, edgecolor='none', alpha=0.3))

    # Flow arrows
    for x_arr in (25, 48, 71):
        ax.annotate('', xy=(x_arr + 4, 55), xytext=(x_arr, 55),
                    arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=TEXT_WHITE, lw=2.5))

    # Attack Barrier at OTP
    att_box = patches.FancyBboxPatch((6, 6), 88, 15, boxstyle="round,pad=1,rounding_size=2",
                                     facecolor="#181326", edgecolor=EMERALD, linewidth=1.5)
    ax.add_patch(att_box)
    ax.text(50, 15, "[SHIELD] PHYSICAL INVASIVE ATTACK (FIB / PVC / VOLTAGE FAULT) STOPS HERE",
            fontsize=9.5, fontweight='bold', color=EMERALD, ha='center')
    ax.text(50, 9.5, "Even if attacker extracts 100% of physical OTP bits, they only get AES-256 scrambled ciphertext with zero root key.",
            fontsize=8, color=TEXT_WHITE, ha='center')

    save_fig(fig, "diagram_slide_04.png")


# ==============================================================================
# SLIDE 5: Subsystem Hardware Block Diagram & Trust Boundaries
# ==============================================================================
def generate_diagram_5() -> None:
    """Slide 5: Detailed Hardware Subsystem Block Diagram."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "SECURE STORAGE SUBSYSTEM: DETAILED HARDWARE BLOCK ARCHITECTURE",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    # Main Subsystem Frame
    main_frame = patches.FancyBboxPatch((6, 12), 88, 78, boxstyle="round,pad=1.5,rounding_size=3",
                                        facecolor="#082032", edgecolor=CYAN, linewidth=2.5)
    ax.add_patch(main_frame)
    ax.text(10, 86, "TRUSTED HARDWARE SECURITY BOUNDARY", fontsize=9.5, fontweight='bold', color=CYAN)

    # Sub-block 1: APB Interface & Control Registers
    b_apb = patches.FancyBboxPatch((10, 52), 24, 30, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0E2C44", edgecolor=PURPLE, linewidth=1.8)
    ax.add_patch(b_apb)
    ax.text(22, 76, "AMBA APB SLAVE", fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(22, 70, "• Address Scrambler\n• Access Policy FSM\n• Region Protection Regs", fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.3)

    # Sub-block 2: SRAM PUF Macro
    b_puf = patches.FancyBboxPatch((10, 18), 24, 30, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0E2C44", edgecolor=ACCENT_BLUE, linewidth=1.8)
    ax.add_patch(b_puf)
    ax.text(22, 42, "SRAM PUF MACRO", fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(22, 36, "• Startup Mismatch Core\n• Fuzzy Extractor / ECC\n• Dynamic Root Key Gen", fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.3)

    # Sub-block 3: AES-256 Engine Core
    b_aes = patches.FancyBboxPatch((40, 30), 24, 44, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0E2C44", edgecolor=AMBER, linewidth=2)
    ax.add_patch(b_aes)
    ax.text(52, 68, "AES-256 CRYPTO ENGINE", fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(52, 62, "• High-Throughput Cipher\n• Line-Speed Encr/Decr\n• Zeroized Key Latch\n• Side-Channel Hardened",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.3)

    # Sub-block 4: AntiFuse OTP Array Macro
    b_otp = patches.FancyBboxPatch((70, 24), 20, 56, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0E2C44", edgecolor=EMERALD, linewidth=2)
    ax.add_patch(b_otp)
    ax.text(80, 74, "ANTIFUSE OTP", fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(80, 68, "• Split-Channel 1T\n• Twin-Cell Diff Mode\n• High-Voltage Pump\n• Scrambled Matrix",
            fontsize=7.5, color=TEXT_MUTED, ha='center', linespacing=1.3)

    # Internal routing buses
    ax.annotate('', xy=(40, 52), xytext=(34, 62),
                arrowprops=dict(arrowstyle="->,head_width=0.3,head_length=0.5", color=PURPLE, lw=2))
    ax.annotate('', xy=(40, 42), xytext=(34, 32),
                arrowprops=dict(arrowstyle="->,head_width=0.3,head_length=0.5", color=ACCENT_BLUE, lw=2))
    ax.annotate('', xy=(70, 52), xytext=(64, 52),
                arrowprops=dict(arrowstyle="<->,head_width=0.3,head_length=0.5", color=EMERALD, lw=2))

    # Host bus
    ax.annotate('', xy=(10, 67), xytext=(2, 67),
                arrowprops=dict(arrowstyle="<->,head_width=0.4,head_length=0.6", color=TEXT_WHITE, lw=2.5))
    ax.text(4, 71, "APB BUS", fontsize=7.5, fontweight='bold', color=TEXT_WHITE)

    # Bottom legend
    ax.text(50, 6, "Key Advantage: Pre-integrated single vendor sub-system eliminates cross-IP security assumption gaps.",
            fontsize=8, color=TEXT_MUTED, ha='center')

    save_fig(fig, "diagram_slide_05.png")


# ==============================================================================
# SLIDE 6: Root-Key Lifecycle Circular State Machine & Zeroization
# ==============================================================================
def generate_diagram_6() -> None:
    """Slide 6: Dynamic Root-Key Lifecycle & Instant Zeroization State Machine."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "DYNAMIC ROOT-KEY LIFECYCLE: STRICT RESIDENCY CONTROL & ZEROIZATION",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    # 4 State Nodes
    nodes = [
        ("PHASE 1: POWER OFF", "• Root Key: ABSENT (0 residency)\n• OTP: Retains Scrambled Ciphertext\n• SRAM: Zero charge / No state", RED, 10, 52),
        ("PHASE 2: POWER UP", "• Transistor Mismatch measured\n• Fuzzy Extractor reconstructs root\n• Hardware secure boundary only", CYAN, 56, 52),
        ("PHASE 3: RUNTIME CRYPTO", "• Line-speed AES encryption/decryption\n• Transient session keys derived\n• Protected APB transaction", AMBER, 56, 10),
        ("PHASE 4: ZEROIZATION", "• Task completion trigger\n• Immediate register / latch flush\n• Return to zero-residency state", EMERALD, 10, 10)
    ]

    for title, desc, color, x, y in nodes:
        box = patches.FancyBboxPatch((x, y), 34, 34, boxstyle="round,pad=1,rounding_size=2",
                                     facecolor="#0B2538", edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + 17, y + 28, title, fontsize=9.5, fontweight='bold', color=color, ha='center')
        ax.text(x + 17, y + 14, desc, fontsize=7.8, color=TEXT_WHITE, ha='center', linespacing=1.3)

    # State Transition Arrows
    ax.annotate('', xy=(56, 69), xytext=(44, 69),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=CYAN, lw=2.5))
    ax.text(50, 72, "Power On Reset", fontsize=7.5, color=CYAN, ha='center', fontweight='bold')

    ax.annotate('', xy=(73, 44), xytext=(73, 52),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=AMBER, lw=2.5))
    ax.text(78, 48, "Session Start", fontsize=7.5, color=AMBER, ha='left', fontweight='bold')

    ax.annotate('', xy=(44, 27), xytext=(56, 27),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=EMERALD, lw=2.5))
    ax.text(50, 30, "Clear / Tamper / Done", fontsize=7.5, color=EMERALD, ha='center', fontweight='bold')

    ax.annotate('', xy=(27, 52), xytext=(27, 44),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=RED, lw=2.5))
    ax.text(21, 48, "Zero State", fontsize=7.5, color=RED, ha='right', fontweight='bold')

    save_fig(fig, "diagram_slide_06.png")


# ==============================================================================
# SLIDE 7: SRAM PUF Reconstruction & Helper Data Information-Theoretic Security
# ==============================================================================
def generate_diagram_7() -> None:
    """Slide 7: SRAM PUF Reconstruction Pipeline & Helper Data Security."""
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 94, "SRAM PUF KEY RECONSTRUCTION: INFORMATION-THEORETICALLY SECURE",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    # Stage 1: Noisy Measurement
    b1 = patches.FancyBboxPatch((5, 24), 26, 60, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0B2538", edgecolor=CYAN, linewidth=2)
    ax.add_patch(b1)
    ax.text(18, 78, "RAW SRAM STARTUP", fontsize=9.5, fontweight='bold', color=CYAN, ha='center')
    ax.text(18, 56, "• Transistor threshold mismatch\n• Unclonable silicon fingerprint\n• Inherent physical noise (PVT)\n• Ephemeral response pattern",
            fontsize=7.8, color=TEXT_MUTED, ha='center', linespacing=1.3)
    ax.text(18, 33, "NOISY RESPONSE", fontsize=7.5, fontweight='bold', color=CYAN, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor=CYAN, lw=1))

    # Helper Data Public Box
    h_box = patches.FancyBboxPatch((38, 62), 24, 22, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#182333", edgecolor=TEXT_MUTED, linewidth=1.5, linestyle="--")
    ax.add_patch(h_box)
    ax.text(50, 78, "ACTIVATION CODE", fontsize=8.5, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(50, 68, "Public Helper Data\n(Zero Root-Key Leakage)", fontsize=7.5, color="#38BDF8", ha='center')

    # Stage 2: Fuzzy Extractor / ECC
    b2 = patches.FancyBboxPatch((37, 18), 26, 40, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0B2538", edgecolor=AMBER, linewidth=2)
    ax.add_patch(b2)
    ax.text(50, 50, "FUZZY EXTRACTOR", fontsize=9.5, fontweight='bold', color=AMBER, ha='center')
    ax.text(50, 36, "• Error Correction Code (BCH)\n• Noise Elimination\n• Privacy Amplification",
            fontsize=7.8, color=TEXT_MUTED, ha='center', linespacing=1.3)

    # Stage 3: Stable Root Key
    b3 = patches.FancyBboxPatch((69, 24), 26, 60, boxstyle="round,pad=1,rounding_size=2",
                                facecolor="#0B2538", edgecolor=EMERALD, linewidth=2)
    ax.add_patch(b3)
    ax.text(82, 78, "STABLE ROOT KEY", fontsize=9.5, fontweight='bold', color=EMERALD, ha='center')
    ax.text(82, 56, "• 100% Stable 256-bit Key\n• Zero-Error Reconstruction\n• -40°C to 150°C Qualified\n• Ready for AES Engine",
            fontsize=7.8, color=TEXT_MUTED, ha='center', linespacing=1.3)
    ax.text(82, 33, "256-BIT DEVICE ROOT", fontsize=7.5, fontweight='bold', color=EMERALD, ha='center',
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#082032", edgecolor=EMERALD, lw=1))

    # Connectors
    ax.annotate('', xy=(37, 38), xytext=(31, 38),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=CYAN, lw=2.5))
    ax.annotate('', xy=(50, 58), xytext=(50, 62),
                arrowprops=dict(arrowstyle="->,head_width=0.3,head_length=0.5", color=TEXT_MUTED, lw=2))
    ax.annotate('', xy=(69, 38), xytext=(63, 38),
                arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6", color=AMBER, lw=2.5))

    # Bottom proof note
    ax.text(50, 7, "Mathematical Guarantee: Helper data discloses mathematically zero Shannon information regarding the generated key.",
            fontsize=8, color=TEXT_MUTED, ha='center')

    save_fig(fig, "diagram_slide_07.png")


# ==============================================================================
# SLIDE 8: Commercial Proof & Reliability Metrics Dashboard
# ==============================================================================
def generate_diagram_8() -> None:
    """Slide 8: Commercial Deployment Track Record & Extreme PVT Reliability."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "FIELD-PROVEN MATURITY & COMMERCIAL DEPLOYMENT EVIDENCE",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    # 4 Key Metric Badges
    metrics = [
        ("1.5B+", "DEVICES DEPLOYED", "Commercial & Automotive Silicon", CYAN, 5),
        ("15+ YRS", "FIELD TRACK RECORD", "Aerospace, Defense & Gov", AMBER, 29),
        ("-40°C~150°C", "PVT QUALIFIED", "AEC-Q100 Grade 1 Automotive", EMERALD, 53),
        ("350nm -> 2nm", "NODE AGNOSTIC", "TSMC FinFET & GAA Validated", PURPLE, 77)
    ]

    for num, lbl, sub, col, x in metrics:
        b = patches.FancyBboxPatch((x, 52), 18, 36, boxstyle="round,pad=1,rounding_size=2",
                                   facecolor="#0B2538", edgecolor=col, linewidth=2)
        ax.add_patch(b)
        ax.text(x + 9, 78, num, fontsize=12, fontweight='bold', color=col, ha='center')
        ax.text(x + 9, 68, lbl, fontsize=8, fontweight='bold', color=TEXT_WHITE, ha='center')
        ax.text(x + 9, 58, sub, fontsize=6.8, color=TEXT_MUTED, ha='center')

    # Lower Table: Certification & Standards Compliance
    table_box = patches.FancyBboxPatch((5, 8), 90, 38, boxstyle="round,pad=1,rounding_size=2",
                                       facecolor="#082032", edgecolor=CARD_BORDER, linewidth=1.5)
    ax.add_patch(table_box)
    ax.text(50, 40, "INDUSTRY SECURITY CERTIFICATIONS & QUALIFICATIONS", fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')

    certs = [
        ("PSA Level 3 Certified", "Highest assurance hardware silicon trust root certification for IoT and Connected Devices"),
        ("SESIP Level 3 Qualified", "Standardized Security Evaluation Methodology for IoT Platforms and Edge SoCs"),
        ("AEC-Q100 Grade 1 Qualified", "Full compliance across automotive extreme thermal cycling and accelerated lifetime aging"),
        ("NIST CAVP & CC Ready", "Cryptographic Algorithm Validation Program compliance for AES-256 and DRBG cores")
    ]

    y_t = 32
    for title, desc in certs:
        ax.text(10, y_t, f"[PASS] {title}:", fontsize=8, fontweight='bold', color=CYAN)
        ax.text(35, y_t, desc, fontsize=7.5, color=TEXT_MUTED)
        y_t -= 7

    save_fig(fig, "diagram_slide_08.png")


# ==============================================================================
# SLIDE 9: Integration is the Product - 5-Pillar IP Subsystem Delivery
# ==============================================================================
def generate_diagram_9() -> None:
    """Slide 9: 5-Pillar Cohesive Subsystem vs Fragmented Multi-Vendor Delivery."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "INTEGRATION IS THE PRODUCT: SINGLE-PROVIDER ACCOUNTABILITY",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    pillars = [
        ("01. ROOT", "SRAM PUF", "• Dynamic key gen\n• Zero storage\n• Unclonable ID", CYAN, 5),
        ("02. CRYPTO", "AES-256", "• Line-speed cipher\n• Line-rate OTP R/W\n• SCA hardened", AMBER, 24),
        ("03. STORAGE", "Antifuse OTP", "• Scrambled matrix\n• Split-channel 1T\n• Twin-cell diff", EMERALD, 43),
        ("04. CONTROL", "Secure APB", "• Addr scrambling\n• Access policy\n• Region locks", PURPLE, 62),
        ("05. LIFECYCLE", "Provisioning", "• Zero-trust fab\n• Key activation\n• Long-term support", ACCENT_BLUE, 81)
    ]

    for num, name, details, col, x in pillars:
        p_box = patches.FancyBboxPatch((x, 26), 14, 60, boxstyle="round,pad=1,rounding_size=2",
                                       facecolor="#0B2538", edgecolor=col, linewidth=2)
        ax.add_patch(p_box)
        ax.text(x + 7, 78, num, fontsize=8.5, fontweight='bold', color=col, ha='center')
        ax.text(x + 7, 70, name, fontsize=9.5, fontweight='bold', color=TEXT_WHITE, ha='center')
        ax.text(x + 7, 48, details, fontsize=7.2, color=TEXT_MUTED, ha='center', linespacing=1.3)
        ax.text(x + 7, 30, "VERIFIED", fontsize=7, fontweight='bold', color=col, ha='center',
                bbox=dict(boxstyle="round,pad=0.2", facecolor=col, edgecolor='none', alpha=0.25))

    # Single IP Subsystem Ribbon below
    ribbon = patches.FancyBboxPatch((5, 6), 90, 14, boxstyle="round,pad=1,rounding_size=2",
                                    facecolor="#082236", edgecolor=CYAN, linewidth=1.5)
    ax.add_patch(ribbon)
    ax.text(50, 15, "[SINGLE IP CONTRACT] NO CROSS-VENDOR GAP OR UNVERIFIED HAND-OFF RISKS",
            fontsize=9, fontweight='bold', color=CYAN, ha='center')
    ax.text(50, 9.5, "Eliminates interface misalignment, reset glitches, and fragmented lifecycle provisioning responsibility.",
            fontsize=7.8, color=TEXT_WHITE, ha='center')

    save_fig(fig, "diagram_slide_09.png")


# ==============================================================================
# SLIDE 10: TSMC OIP Ecosystem & Advanced Node Readiness Matrix
# ==============================================================================
def generate_diagram_10() -> None:
    """Slide 10: TSMC Advanced Node Support Matrix & Evidence Closure."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "TSMC OIP ECOSYSTEM: ADVANCED PROCESS NODE READINESS MATRIX",
            fontsize=10.5, fontweight='bold', color=CYAN, ha='center')

    # Left: TSMC Process Nodes Grid
    nodes = [
        ("N7", "High Performance", CYAN, 6, 62),
        ("N7A", "Auto Grade 1", EMERALD, 24, 62),
        ("N6", "Cost & Density", CYAN, 6, 42),
        ("N5", "Flagship HPC/AI", AMBER, 24, 42),
        ("N5A", "Auto Grade 1", EMERALD, 6, 22),
        ("N4P / N3P", "Leading GAA/FinFET", PURPLE, 24, 22)
    ]

    left_frame = patches.FancyBboxPatch((4, 12), 40, 78, boxstyle="round,pad=1,rounding_size=2",
                                        facecolor="#082032", edgecolor=CYAN, linewidth=1.8)
    ax.add_patch(left_frame)
    ax.text(24, 84, "TSMC QUALIFIED PROCESS NODES", fontsize=9.5, fontweight='bold', color=CYAN, ha='center')

    for name, sub, col, x, y in nodes:
        nb = patches.FancyBboxPatch((x, y), 16, 16, boxstyle="round,pad=0.8,rounding_size=1.5",
                                    facecolor="#0E2C44", edgecolor=col, linewidth=1.5)
        ax.add_patch(nb)
        ax.text(x + 8, y + 10.5, name, fontsize=10, fontweight='bold', color=TEXT_WHITE, ha='center')
        ax.text(x + 8, y + 4.5, sub, fontsize=6.8, color=col, ha='center')

    # Right: OIP Evidence Closure Checklist
    right_frame = patches.FancyBboxPatch((48, 12), 48, 78, boxstyle="round,pad=1,rounding_size=2",
                                         facecolor="#082032", edgecolor=AMBER, linewidth=1.8)
    ax.add_patch(right_frame)
    ax.text(72, 84, "OIP SILICON EVIDENCE CLOSURE", fontsize=9.5, fontweight='bold', color=AMBER, ha='center')

    checklist = [
        ("TSMC Silicon Correlation Report", "Target node silicon characterization across full PVT split tables"),
        ("Fault Injection Resistance Data", "Evaluated against voltage, EM, and laser glitching test vectors"),
        ("Physical Invasive Probing Report", "FIB/PVC resistance characterization of twin-cell scrambled OTP"),
        ("Automotive AEC-Q100 Data", "High-temperature operating life (HTOL) & accelerated aging models"),
        ("Full Design Collateral Suite", "GDSII, LEF, LIB, Verilog models, and integration testbenches")
    ]

    y_c = 72
    for title, desc in checklist:
        ax.text(52, y_c, f"[PASS] {title}", fontsize=8.2, fontweight='bold', color=TEXT_WHITE)
        ax.text(54, y_c - 4.5, desc, fontsize=7.2, color=TEXT_MUTED)
        y_c -= 12

    save_fig(fig, "diagram_slide_10.png")


# ==============================================================================
# SLIDE 11: Executive Conclusion & Value Proposition
# ==============================================================================
def generate_diagram_11() -> None:
    """Slide 11: Decoupling Physical Storage from Usable Secrets."""
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Central Core Equation Box
    eq_box = patches.FancyBboxPatch((8, 62), 84, 28, boxstyle="round,pad=1.5,rounding_size=3",
                                    facecolor="#0A2D46", edgecolor=CYAN, linewidth=2.5)
    ax.add_patch(eq_box)
    ax.text(50, 82, "FUNDAMENTAL ARCHITECTURAL PARADIGM", fontsize=10, fontweight='bold', color=CYAN, ha='center')
    ax.text(50, 71, "OTP READOUT   !=   SECRET RECOVERY", fontsize=15, fontweight='bold', color=TEXT_WHITE, ha='center')
    ax.text(50, 65, "Physical memory observability is decoupled from cryptographic confidentiality.", fontsize=8, color=TEXT_MUTED, ha='center')

    # 3 Summary Pillar Cards
    pillars = [
        ("PERMANENT RETENTION", "• AntiFuse OTP preserves scrambled ciphertext\n• High reliability non-volatile code/config", EMERALD, 8),
        ("EPHEMERAL ROOT KEY", "• SRAM PUF dynamically generates key at boot\n• ZERO key residency at rest / power-off", CYAN, 38),
        ("FIRST-TIME SECURE", "• TSMC N7/N5/N3 OIP validated solution\n• Fast time-to-market with reduced risk", AMBER, 68)
    ]

    for title, desc, col, x in pillars:
        c_box = patches.FancyBboxPatch((x, 14), 24, 42, boxstyle="round,pad=1,rounding_size=2",
                                       facecolor="#0B2538", edgecolor=col, linewidth=1.8)
        ax.add_patch(c_box)
        ax.text(x + 12, 49, title, fontsize=8.8, fontweight='bold', color=col, ha='center')
        ax.text(x + 12, 32, desc, fontsize=7.5, color=TEXT_WHITE, ha='center', linespacing=1.3)
        ax.text(x + 12, 19, "READY FOR SILICON", fontsize=6.8, fontweight='bold', color=TEXT_MUTED, ha='center')

    save_fig(fig, "diagram_slide_11.png")


# ==============================================================================
# SLIDE 12: Technical Appendix - RP2350 Threat Vector Deep Dive
# ==============================================================================
def generate_diagram_12() -> None:
    """Slide 12: Detailed RP2350 Attack Paths & Secure Storage Response."""
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 95, "APPENDIX: RP2350 PHYSICAL ATTACK PATH DISSECTION & DEFENSE CLOSURE",
            fontsize=10.5, fontweight='bold', color=RED, ha='center')

    paths = [
        ("PATH 01: FAULT INJECTION", "• Glitch VDD during boot\n• Bypass OTP lock bit state\n• Force unprotected execution",
         "DEFENSE: Ciphertext is stored, so bypassing permission yields only encrypted bits.", RED, 6, 52),
        ("PATH 02: INVASIVE PROBING", "• Delid chip & FIB micro-probe\n• Passive Voltage Contrast (PVC)\n• Read antifuse cell breakdown",
         "DEFENSE: Address scrambling + AES encryption turn raw bits into unusable noise.", AMBER, 52, 52),
        ("PATH 03: SENSOR EVASION", "• Voltage & clock glitch sensors\n• Evasion via shaped transients\n• Bypasses internal watchdog",
         "DEFENSE: Do not rely solely on reactive detectors; enforce mathematical confidentiality.", PURPLE, 6, 12),
        ("PATH 04: DESIGN RESPONSE", "• SRAM PUF dynamic root key\n• Hardware crypto sub-boundary\n• Zero persistent key material",
         "DEFENSE: Complete decoupling of persistent storage from usable cryptographic secrets.", EMERALD, 52, 12)
    ]

    for title, attack, defense, col, x, y in paths:
        box = patches.FancyBboxPatch((x, y), 42, 35, boxstyle="round,pad=1,rounding_size=2",
                                     facecolor="#0B2538", edgecolor=col, linewidth=1.8)
        ax.add_patch(box)
        ax.text(x + 21, y + 29, title, fontsize=9, fontweight='bold', color=col, ha='center')
        ax.text(x + 21, y + 18, attack, fontsize=7.2, color=TEXT_MUTED, ha='center', linespacing=1.2)
        ax.text(x + 21, y + 7, defense, fontsize=7.2, color="#86EFAC" if col==EMERALD else "#FDE047", ha='center', fontweight='bold', linespacing=1.1)

    save_fig(fig, "diagram_slide_12.png")


def main() -> None:
    """Generate all 12 thematic diagrams."""
    print("Generating 12 Enhanced Thematic Diagrams (100% English) for TSMC OIP Secure Storage Presentation...")
    generate_diagram_1()
    generate_diagram_2()
    generate_diagram_3()
    generate_diagram_4()
    generate_diagram_5()
    generate_diagram_6()
    generate_diagram_7()
    generate_diagram_8()
    generate_diagram_9()
    generate_diagram_10()
    generate_diagram_11()
    generate_diagram_12()
    print("All 12 diagrams successfully generated in folder 'generated_diagrams'!")


if __name__ == "__main__":
    main()
