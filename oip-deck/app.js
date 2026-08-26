/**
 * Presentation Viewer Application Logic
 * Renders 12 executive presentation slides in 100% English with bilingual speaker notes.
 */

const SLIDES_DATA = [
  {
    id: 1,
    category: "TSMC OIP Technical Briefing · August 2026",
    title: "Mitigating OTP Data Leakage Risks in Advanced SoCs",
    subtitle: "Eliminating Raw Data Exposure in Leading-Edge Silicon Through Secure Storage Architectures",
    diagram: "generated_diagrams/ai_visual_slide_01.jpg",
    takeaway: "Core Thesis: Decouple physical storage from usable cryptographic secrets.",
    cards: [
      {
        title: "Subsystem Composition",
        border: "border-blue",
        bullets: [
          "SRAM PUF: Dynamic device-unique root key generator (zero key at rest)",
          "Crypto Engine: Line-speed AES-256 hardware encryption / decryption",
          "AntiFuse OTP: Permanent non-volatile scrambled ciphertext array",
          "Secure Controller: APB slave, address scrambling & access control FSM"
        ]
      },
      {
        title: "Advanced Node Assurance",
        border: "border-emerald",
        bullets: [
          "TSMC N7, N6, N5, N4P, N3P and automotive N7A, N5A qualified",
          "Monolithic single-IP delivery eliminates cross-block handoff gaps",
          "Certified to PSA Level 3, SESIP Level 3 & AEC-Q100 Grade 1",
          "Delivers first-time-secure silicon assurance for AI, Auto, IoT & HPC"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Good morning, esteemed TSMC OIP partners and semiconductor architects. Today, we address a critical security challenge facing advanced node SoCs: 'Mitigating OTP Data Leakage Risks in Advanced SoCs Through Secure Storage Architectures.'
Recent public hacking challenges, such as the Raspberry Pi RP2350 disclosure, have demonstrated that conventional AntiFuse OTP memory bits are physically observable under voltage fault injection and Focused Ion Beam (FIB) / Passive Voltage Contrast (PVC) probing. When root keys or firmware secrets are directly stored in OTP, physical readout leads to complete IP theft and device cloning.
Our Secure Storage solution integrates SRAM PUF, AES-256 hardware crypto engines, AntiFuse OTP, and a Secure Controller into a single pre-integrated IP subsystem, ensuring that root keys are dynamically generated at power-up and never stored on-chip, turning OTP into a cryptographically protected repository.

[中文講者備忘與論述重點]
各位 TSMC OIP 夥伴與晶片架構師好。今天報告的主題聚焦於先進製程 SoC 中的 OTP 資料外洩防護。
從 Raspberry Pi RP2350 公開挑戰賽可知，傳統 AntiFuse OTP 記憶體在 FIB/PVC 與電壓故障注入下，其實體 0/1 位元已不再具備物理不透明性。若直接於 OTP 存放根金鑰，將面臨災難性的複製風險。
本 Secure Storage 架構將 SRAM PUF（動態根金鑰）、AES-256（硬體全加密）、AntiFuse OTP（亂序密文）與安全控制器整合為單一硬體子系統，達成『永久保存資料，根金鑰斷電零駐留』的根本安全突破。`
  },
  {
    id: 2,
    category: "01 / The Executive Thesis",
    title: "Security is Decided When the System is Powered Off",
    subtitle: "Durable Storage Decoupled from Permanent Root Key Persistence",
    diagram: "generated_diagrams/ai_visual_slide_02.jpg",
    takeaway: "Design Rule: Durable storage + Non-persistent root key + Hardware reconstruction",
    cards: [
      {
        title: "Power-Off State (At-Rest Security)",
        border: "border-red",
        bullets: [
          "SRAM PUF unpowered: Root key is physically ABSENT",
          "AntiFuse OTP retains only AES-256 scrambled ciphertext",
          "Invasive physical readout recovers zero usable root secrets",
          "Eliminates the static at-rest attack surface of NVM/OTP-PUFs"
        ]
      },
      {
        title: "Power-Up State (Active Runtime Reconstruction)",
        border: "border-cyan",
        bullets: [
          "Transistor mismatch dynamically reconstructs 256-bit key",
          "Root key restricted entirely within hardware trust boundary",
          "On-the-fly decryption buffer instantly zeroized after task",
          "Achieves complete separation of retention vs key residence"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
The highest level of hardware security is determined by what remains on the silicon when the system is powered down.
Traditional OTP solves the retention problem, but fails the confidentiality challenge under invasive physical inspection. In our Secure Storage architecture, when power is removed, the SRAM PUF cells retain zero charge and zero state—the root key simply does not exist. Only scrambled AES-256 ciphertext remains in OTP. At power-up, the device reconstructs its unique root key on the fly within the secure hardware boundary, ensuring zero permanent key exposure.

[中文講者備忘與論述重點]
硬體安全的最高防線取決於斷電時晶片中還留下什麼。
傳統 OTP 僅保證了資料留存 (Retention)，但無法保證實體機密性 (Confidentiality)。Secure Storage 的核心設計在於：斷電時 SRAM PUF 無任何電荷與金鑰殘留，OTP 內僅有 AES-256 密文；上電時才在內部安全邊界重建金鑰並即時解密，徹底杜絕晶片靜態提取風險。`
  },
  {
    id: 3,
    category: "02 / Threat Landscape",
    title: "Public Attacks Expose the Limits of Stored-Bit Secrecy",
    subtitle: "Lessons from the RP2350 Challenge: Physical Probing & Fault Injection Bypass Software Locks",
    diagram: "generated_diagrams/ai_visual_slide_03.jpg",
    takeaway: "Real-world Signal: Memory security is a system property, not merely a bit-cell property.",
    cards: [
      {
        title: "RP2350 Attack Demonstrations",
        border: "border-red",
        bullets: [
          "Voltage Fault Injection (FI): Bypassed boot timing & lock bits",
          "FIB / Passive Voltage Contrast: Imaged antifuse breakdown state",
          "Proved: Bit-cell opacity cannot serve as final security barrier",
          "Plain OTP Model: Extracting physical bits equals full compromise"
        ]
      },
      {
        title: "Architectural Design Consequence",
        border: "border-amber",
        bullets: [
          "Assume physical observability: Do not rely solely on cell opacity",
          "Cryptographic transformation: Turn readout into ciphertext problem",
          "Composed defense: Ephemeral PUF root + AES-256 + Scrambling",
          "Architectural Rule: OTP Physical Readout != Secret Recovery"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
The RP2350 Hacking Challenge results in early 2025 served as a critical wake-up call for the semiconductor industry.
Security researchers (such as IOActive) demonstrated that standard failure analysis equipment—specifically Focused Ion Beam (FIB) and Passive Voltage Contrast (PVC)—can directly inspect the physical programmed state of antifuse cells. Combined with voltage glitching during boot to bypass software permission wrappers, the raw bits of plain OTP were fully recovered.
This proves that bit-cell opacity is not a sufficient defense. Our design response is clear: we assume the physical layer can eventually be imaged, but ensure that any extracted bitstream is cryptographically uncrackable ciphertext.

[中文講者備忘與論述重點]
RP2350 挑戰賽證實：硬體逆向工程團隊可利用標準失效分析設備（FIB 與被動電壓對比 PVC），直接讀出 AntiFuse 擊穿位元。
若加上開機時序的電壓微擾 (Voltage Glitch)，傳統的暫存器鎖定與軟體保護將被輕易繞過。因此，系統架構不能假設『位元永遠無法被讀出』，而必須以密碼學手段確保『讀出結果僅為隨機密文』。`
  },
  {
    id: 4,
    category: "03 / Defense in Depth",
    title: "Multi-Layer Pipeline: Restricting Physical Recovery to Ciphertext",
    subtitle: "Four Independent Protective Barriers from Asset Ingestion to Silicon Storage",
    diagram: "generated_diagrams/ai_visual_slide_04.jpg",
    takeaway: "Defense Principle: Address scrambling raises mapping cost; AES-256 creates the mathematical barrier.",
    cards: [
      {
        title: "Target Sensitive Assets",
        border: "border-blue",
        bullets: [
          "Firmware anti-rollback monotonic counters",
          "AI model weight decryption keys & proprietary neural IP",
          "Device-unique private identity keys (ECC / RSA)",
          "Secure boot parameters & authorization policies"
        ]
      },
      {
        title: "Four-Tier Shield Mechanism",
        border: "border-emerald",
        bullets: [
          "Tier 1: SRAM PUF Dynamic Root (Zero at-rest footprint)",
          "Tier 2: AES-256 Hardware Encryption (Ciphertext barrier)",
          "Tier 3: Pseudo-random Address Scrambler (Obscures mapping)",
          "Tier 4: Split-Channel 1T Twin-Cell OTP (Power-balanced read)"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Here we illustrate the four-tier defense-in-depth pipeline.
When high-value assets—such as AI model keys, firmware counters, or device identities—enter the subsystem, they are encrypted via AES-256 using keys derived on-the-fly from the SRAM PUF root. The resulting ciphertext is then scrambled across physical rows and columns before programming into the 1T antifuse array.
This creates an impenetrable dual barrier: address scrambling dramatically elevates the reverse engineering cost of physical reconstruction, while AES-256 provides mathematical confidentiality against raw bit recovery.

[中文講者備忘與論述重點]
本頁闡述四層多維度縱深防禦管線。
敏感資產（AI 權重金鑰、防回滾計數器、私鑰）在寫入前，先經由 PUF 衍生金鑰進行 AES-256 加密，再經由位址混淆器 (Address Scrambler) 打亂邏輯對實體陣列的映射，最終寫入 1T 差動 AntiFuse 陣列。位址混淆提高尋址逆向成本，AES-256 建立數學級防線。`
  },
  {
    id: 5,
    category: "04 / Integrated Architecture",
    title: "Unified Subsystem: Four Blocks Under One Trust Boundary",
    subtitle: "Pre-Integrated Hardware Security Subsystem Eliminating Cross-IP Vulnerabilities",
    diagram: "generated_diagrams/ai_visual_slide_05.jpg",
    takeaway: "Pre-integrated architecture eliminates cross-IP assumptions and hand-off risks.",
    cards: [
      {
        title: "Four Core Hardware Blocks",
        border: "border-cyan",
        bullets: [
          "SRAM PUF: Dynamic key generator & silicon fingerprint core",
          "Crypto Engine: High-throughput line-speed AES-256 core",
          "AntiFuse OTP: Persistent encrypted storage matrix",
          "Secure Controller: APB slave, address scrambler & access FSM"
        ]
      },
      {
        title: "Subsystem Integration Advantages",
        border: "border-purple",
        bullets: [
          "Eliminates cross-IP interface timing & reset glitch vulnerabilities",
          "Standard AMBA APB interface simplifies SoC host integration",
          "Hardware-enforced region access control & tamper response",
          "Single accountable IP provider for full security closure"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
A common pitfall in SoC security is assembling discrete IP blocks from different vendors—purchasing PUF from Vendor A, Controller from Vendor B, and OTP from Vendor C. Such fragmented architectures create unverified hand-offs, bus probe exposures, and reset synchronization glitches.
Our Secure Storage IP delivers a pre-integrated, monolithic hardware subsystem. Key generation, cryptographic acceleration, address scrambling, and NVM access are entirely enclosed within a certified internal trust boundary, presenting only a clean, policy-protected APB interface to the host SoC.

[中文講者備忘與論述重點]
晶片安全最常見的破口往往是不同供應商 IP 之間的串接縫隙（如重置競爭、匯流排探針暴露）。
Secure Storage 提供四合一單一 IP 交付：SRAM PUF、AES-256 引擎、AntiFuse OTP 與安全控制器封閉於同一硬體信任邊界內，向外部 SoC 僅暴露受保護的標準 APB 介面，消弭跨區塊假設風險。`
  },
  {
    id: 6,
    category: "05 / Key Lifecycle",
    title: "Root-Key Lifecycle: Strict Residency Control & Instant Zeroization",
    subtitle: "Minimizing Key Exposure Windows Through Hardware-Enforced State Transitions",
    diagram: "generated_diagrams/ai_visual_slide_06.jpg",
    takeaway: "Security Property: Minimize key residency, not merely key visibility.",
    cards: [
      {
        title: "Four-Phase Key Lifecycle",
        border: "border-amber",
        bullets: [
          "Phase 1 (Power-Off): Root key ABSENT; OTP holds ciphertext",
          "Phase 2 (Power-Up): SRAM mismatch measured & key reconstructed",
          "Phase 3 (Authorized Use): Session keys derived for APB crypto",
          "Phase 4 (Zeroization): Immediate register flush upon task end"
        ]
      },
      {
        title: "Zero-Residency Security Assurance",
        border: "border-emerald",
        bullets: [
          "Core Metric: Minimize key residency time across execution",
          "Hardware tamper triggers force single-cycle latch clear",
          "Volatile register state dissipates within milliseconds of power cut",
          "Fully compliant with stringent anti-tamper security standards"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Key management philosophy must focus on 'Minimizing Key Residency' rather than merely attempting to conceal stored keys.
Our hardware state machine ensures that root key material exists only during the brief execution window required for cryptographic operations. As soon as reading, writing, or authentication is complete—or if a physical tamper event is detected—the controller executes hardware zeroization, flushing all key latches to zero in a single clock cycle.

[中文講者備忘與論述重點]
密鑰管理的核心準則是『Minimize Key Residency（最小化金鑰駐留時間）』。\n透過硬體狀態機控管，根金鑰僅在執行加解密時暫態存在。一旦操作完成或觸發入侵微擾偵測，硬體控制器會在一週期內執行 Zeroization（強制清零），徹底消除側信道洩漏的時間窗口。`
  },
  {
    id: 7,
    category: "06 / PUF Physics & Security",
    title: "SRAM PUF Reconstruction: Information-Theoretically Secure Helper Data",
    subtitle: "Public Activation Code Discloses Mathematically Zero Shannon Information Regarding Root Key",
    diagram: "generated_diagrams/ai_visual_slide_07.jpg",
    takeaway: "Information-Theoretic Proof: Public helper data discloses mathematically zero key bits.",
    cards: [
      {
        title: "PUF Key Reconstruction Pipeline",
        border: "border-cyan",
        bullets: [
          "Physical source: MOSFET threshold mismatch in standard SRAM",
          "Noise correction: BCH Error Correction Code (ECC) engine",
          "Privacy amplification: Compresses entropy to remove bias",
          "Output: 100% stable, unique 256-bit cryptographic root key"
        ]
      },
      {
        title: "Activation Code Security Guarantees",
        border: "border-emerald",
        bullets: [
          "Activation Code contains only syndrome data for ECC alignment",
          "Mathematical proof: Leaks exactly 0 bits of mutual information",
          "Publicly stored in Flash/OTP without compromising root secret",
          "Rigorously audited by leading academic and commercial certifiers"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
A common technical question is: 'Does storing the Activation Code (helper data) publicly create a new attack vector?'
The answer is an unequivocal no. The fuzzy extractor is constructed with information-theoretic security guarantees. The Activation Code consists purely of error-correction syndrome offsets. In information theory terms, the mutual Shannon information between the public helper data and the derived 256-bit secret key is mathematically zero. An adversary with infinite computing power cannot extract the key from the helper data alone.

[中文講者備忘與論述重點]
針對客戶常見的疑問：『公開存放的 Activation Code（輔助資料）是否會洩漏金鑰？』
SRAM PUF 模糊提取器 (Fuzzy Extractor) 具備資訊理論安全性 (Information-Theoretic Security)。Activation Code 僅記錄糾錯症狀碼 (Syndrome)，其與最終 256-bit 金鑰之互資訊量 (Mutual Information) 嚴格為零，無任何密鑰位元洩漏風險。`
  },
  {
    id: 8,
    category: "07 / Commercial Evidence",
    title: "Commercial Proof: 1.5B+ Devices and Extreme Automotive Reliability",
    subtitle: "Field Maturity Informs—and Target Silicon Evaluation Closes the Security Claim",
    diagram: "generated_diagrams/ai_visual_slide_08.jpg",
    takeaway: "Field maturity reduces uncertainty; target silicon evaluation closes the claim.",
    cards: [
      {
        title: "Global Production Deployment Track Record",
        border: "border-cyan",
        bullets: [
          "1.5B+ devices shipped with SRAM PUF hardware technology",
          "15+ years commercial deployment in aerospace, defense & auto",
          "Node-agnostic architecture validated from 350nm down to 2nm",
          "Pure standard CMOS compatible: No extra masks or custom layers"
        ]
      },
      {
        title: "Extreme Environment & Security Standards",
        border: "border-amber",
        bullets: [
          "Qualified across -40°C to 150°C PVT & accelerated aging models",
          "AEC-Q100 Grade 1 automotive certification compliance",
          "PSA Certified Level 3 & SESIP Level 3 hardware security",
          "NIST CAVP cryptographic algorithm validation compliance"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Security claims must be backed by massive production maturity and stringent third-party certifications.
SRAM PUF technology has been deployed in more than 1.5 billion commercial devices over 15+ years, spanning defense, aerospace, automotive, and IoT. Operating reliably across -40°C to 150°C with zero key error rate (0 ppm KER), it holds PSA Certified Level 3 and SESIP Level 3 accreditations. Because it relies on standard CMOS mismatch, it ports seamlessly across process nodes without requiring exotic foundry steps.

[中文講者備忘與論述重點]
SRAM PUF 技術具備超過 15 億顆晶片量產實績與 15 年以上商用經驗（廣泛用於航太、國防與車用晶片）。
在 -40°C 至 150°C 寬溫域與 15 年老化模型下維持 0 ppm 金鑰重建錯誤率。並通過 AEC-Q100 Grade 1、PSA Level 3、SESIP Level 3 與 NIST CAVP 國際權威認證。`
  },
  {
    id: 9,
    category: "08 / Integrated Delivery",
    title: "Integration is the Product: Single-Provider Accountability",
    subtitle: "Customers Buy One Accountable Outcome: Root, Crypto, Storage, Control & Lifecycle",
    diagram: "generated_diagrams/ai_visual_slide_09.jpg",
    takeaway: "A secure primitive can still fail when interfaces, resets or ownership are fragmented.",
    cards: [
      {
        title: "Five-Pillar Cohesive Delivery",
        border: "border-purple",
        bullets: [
          "1. ROOT: SRAM PUF dynamic key generation",
          "2. CRYPTO: High-speed line-rate AES-256 core",
          "3. STORAGE: AntiFuse OTP permanent ciphertext array",
          "4. CONTROL: Secure APB controller & address scrambling",
          "5. LIFECYCLE: Zero-trust provisioning & lifetime support"
        ]
      },
      {
        title: "Eliminating Multi-Vendor Fragmentation Risks",
        border: "border-cyan",
        bullets: [
          "Multi-vendor risks: Incompatible resets, bus leaks, finger-pointing",
          "Monolithic IP: Single contract, pre-verified silicon boundary",
          "Accelerates SoC time-to-market and simplifies cert audit trails",
          "Comprehensive wafer test, production provisioning & response"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Security is an integrated property, not a catalog of separate primitives.
When SoC teams buy separate security blocks from disparate suppliers, integration bugs and unverified reset states create severe vulnerability windows. With our Secure Storage solution, customers license a unified five-pillar system (Root, Crypto, Storage, Control, Lifecycle) under a single contract with guaranteed silicon closure and dedicated qualification collateral.

[中文講者備忘與論述重點]
安全是系統整合的結果，而非零散元件的拼湊。
若分別採購 PUF、控制器與 OTP，整合時的時序與重置漏洞往往成為攻擊目標。本方案以單一 IP 交付五大支柱（Root, Crypto, Storage, Control, Lifecycle），為客戶提供單一責任窗口與完整的流片前驗證保證。`
  },
  {
    id: 10,
    category: "09 / TSMC OIP Ecosystem",
    title: "TSMC OIP Readiness: Leading Process Nodes & Evidence Closure",
    subtitle: "Silicon-Verified Collateral Across N7, N6, N5, N4P, N3P and Automotive Variants",
    diagram: "generated_diagrams/ai_visual_slide_10.jpg",
    takeaway: "TSMC OIP readiness: Close evidence loop with qualified macro and target SoC boundary.",
    cards: [
      {
        title: "TSMC Advanced Process Node Support",
        border: "border-cyan",
        bullets: [
          "HPC & AI Nodes: N7, N6, N5, N4P, N3P silicon correlation",
          "Automotive Grades: N7A, N5A AEC-Q100 Grade 1 qualified",
          "Inherent PUF portability: No process-specific analog tuning",
          "Ready for TSMC GAA (N2) next-generation roadmap"
        ]
      },
      {
        title: "OIP Silicon Evidence Closure Matrix",
        border: "border-amber",
        bullets: [
          "Full TSMC silicon correlation reports across PVT corners",
          "Fault Injection (FI) & Side-Channel Analysis (SCA) test data",
          "FIB / Passive Voltage Contrast physical characterization",
          "Complete design deliverables: GDSII, LEF, LIB, Verilog, Testbenches"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
Within the TSMC Open Innovation Platform (OIP), we deliver comprehensive silicon correlation across all flagship nodes, including N7, N6, N5, N4P, and N3P, as well as automotive N7A and N5A variants.
We adhere to the 'Evidence Closure' principle: we provide customers with exhaustive PVT characterization tables, fault injection resistance reports, and physical FIB/PVC analysis data, ensuring first-time-right and first-time-secure silicon execution.

[中文講者備忘與論述重點]
在 TSMC OIP 架構下，本方案全面支援 N7、N6、N5、N4P、N3P 及車規 N7A/N5A 節點。\n我們堅持『Evidence Closure（證據閉環）』原則：提供完整的矽關聯報告、故障注入 (FI) 與 FIB/PVC 實體測試數據，並交付完整 GDSII/LEF/LIB/Verilog 檔案，確保一次流片即成功。`
  },
  {
    id: 11,
    category: "10 / Executive Conclusion",
    title: "Conclusion: Decoupling Physical Storage from Usable Secrets",
    subtitle: "Delivering First-Time-Secure Silicon Assurance for AI, Automotive, IoT and HPC",
    diagram: "generated_diagrams/ai_visual_slide_11.jpg",
    takeaway: "Next Step: Agree the evidence plan for target node, macro configuration and SoC boundary.",
    cards: [
      {
        title: "Core Paradigm Breakthrough",
        border: "border-cyan",
        bullets: [
          "Core Breakthrough: OTP Readout != Secret Recovery",
          "Permanent Retention: Scrambled AES-256 ciphertext in AntiFuse",
          "Ephemeral Root: SRAM PUF dynamically reconstructed at boot",
          "Invasive Resilience: Eliminates FIB, PVC & voltage glitch risks"
        ]
      },
      {
        title: "Strategic Business & Time-to-Market Value",
        border: "border-emerald",
        bullets: [
          "Drastically mitigates multi-million dollar post-silicon re-spin risk",
          "Accelerates time-to-market for mission-critical AI, Auto & HPC",
          "Single accountable IP contract simplifies security compliance",
          "Engage today for target node macro specs and evaluation kits"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
In conclusion, conventional plain OTP architectures can no longer safeguard sensitive secrets against modern invasive physical attacks.
By fundamentally decoupling physical non-volatile storage from usable cryptographic root keys, Secure Storage converts OTP from an observable attack surface into a cryptographically protected repository. This guarantees first-time-secure silicon for AI, automotive, and HPC applications while protecting corporate IP and time-to-market. Thank you, and we welcome your questions.

[中文講者備忘與論述重點]
總結而言，傳統 Plain OTP 架構已無法抵禦現代侵入式實體攻擊。\nSecure Storage 透過『解耦物理儲存與可用秘密』，將 OTP 轉化為受密碼學保護的密文儲存庫，實現『OTP 讀出 ≠ 秘密外洩』。為 AI、車用、IoT 與 HPC 晶片提供 First-Time-Secure 矽智財保證，大幅降低流片失敗風險。`
  },
  {
    id: 12,
    category: "Appendix / Threat Deep-Dive",
    title: "Technical Deep-Dive: RP2350 Attack Paths & Countermeasures",
    subtitle: "Comprehensive Failure Mode Analysis and Secure Storage Architectural Responses",
    diagram: "generated_diagrams/ai_visual_slide_12.jpg",
    takeaway: "Use in Q&A if asked about technical trigger and failure-analysis attack countermeasures.",
    cards: [
      {
        title: "RP2350 Physical Attack Vector Analysis",
        border: "border-red",
        bullets: [
          "Path 1 (Fault Injection): Glitched VDD at boot to bypass lock checks",
          "Path 2 (Invasive Probing): FIB/PVC imaged antifuse breakdown bits",
          "Path 3 (Sensor Evasion): Shaped glitch transients bypassed detectors",
          "Path 4 (Impact): Plain OTP exposed plaintext keys & boot secrets"
        ]
      },
      {
        title: "Secure Storage Defense Closure",
        border: "border-emerald",
        bullets: [
          "Response 1: All OTP data is AES-256 encrypted; bypassing locks yields cipher",
          "Response 2: Pseudo-random address scrambling destroys bit regularity",
          "Response 3: Mathematical confidentiality replaces reliance on reactive sensors",
          "Response 4: SRAM PUF dynamic key vanishes at power-off, zero at-rest secret"
        ]
      }
    ],
    notes: `================================================================================
[ENGLISH SPEAKER SCRIPT]
This technical appendix is reserved for deep-dive Q&A discussions regarding the exact physical mechanisms demonstrated in the RP2350 challenge.
We dissect the four critical attack paths—voltage fault injection, invasive FIB/PVC imaging, sensor evasion, and permission collapse—and demonstrate how Secure Storage creates a closed-loop cryptographic defense against each vector. Even if every detector is bypassed and every bit is physically imaged, the adversary cannot extract the ephemeral SRAM PUF root key.

[中文講者備忘與論述重點]
本技術附錄供 Q&A 環節深入探討 RP2350 實體攻擊途徑與防禦閉環。\n分析涵蓋電壓故障注入 (FI)、FIB/PVC 被動電壓對比、感測器規避與權限崩塌四大路徑，說明 Secure Storage 如何以 AES-256 加密、位址混淆與動態無常駐 PUF 金鑰達成完整的防禦閉環。`
  }
];

let currentSlideIndex = 0;

// DOM Elements
const slideCardEl = document.getElementById("currentSlideCard");
const currentSlideNumEl = document.getElementById("currentSlideNum");
const totalSlidesNumEl = document.getElementById("totalSlidesNum");
const thumbnailsStripEl = document.getElementById("thumbnailsStrip");
const prevSlideBtn = document.getElementById("prevSlideBtn");
const nextSlideBtn = document.getElementById("nextSlideBtn");
const notesDrawerEl = document.getElementById("notesDrawer");
const notesContentEl = document.getElementById("notesContent");
const notesToggleBtn = document.getElementById("notesToggleBtn");
const closeNotesBtn = document.getElementById("closeNotesBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

// Initialize
function initPresentation() {
  totalSlidesNumEl.textContent = SLIDES_DATA.length;
  renderThumbnails();
  renderSlide(0);
  bindEvents();
}

// Render Slide
function renderSlide(index) {
  if (index < 0 || index >= SLIDES_DATA.length) return;
  currentSlideIndex = index;
  const slide = SLIDES_DATA[index];

  currentSlideNumEl.textContent = slide.id;

  // Build Card HTML
  let cardsHtml = "";
  slide.cards.forEach(card => {
    let bulletsHtml = card.bullets.map(b => `<li><span class="bullet-dot">▸</span> <span>${b}</span></li>`).join("");
    cardsHtml += `
      <div class="info-card ${card.border}">
        <h4>${card.title}</h4>
        <ul>${bulletsHtml}</ul>
      </div>
    `;
  });

  slideCardEl.innerHTML = `
    <div class="slide-top-bar">
      <div>
        <div class="slide-eyebrow">${slide.category}</div>
        <h2 class="slide-main-title">${slide.title}</h2>
        <div class="slide-subtitle">${slide.subtitle}</div>
      </div>
      <div class="slide-badge-num">${String(slide.id).padStart(2, '0')} / 12</div>
    </div>

    <div class="slide-content-grid">
      <div class="cards-column">
        ${cardsHtml}
      </div>
      <div class="diagram-column">
        <img src="${slide.diagram}" alt="${slide.title} Diagram">
      </div>
    </div>

    <div class="slide-bottom-bar">
      <div>TSMC OIP TECHNICAL BRIEFING · SECURE STORAGE ARCHITECTURES · CONFIDENTIAL</div>
      <div class="slide-takeaway">${slide.takeaway}</div>
    </div>
  `;

  // Update Notes
  notesContentEl.textContent = slide.notes;

  // Update Thumbnails Active State
  document.querySelectorAll(".thumbnail-item").forEach((el, idx) => {
    if (idx === index) {
      el.classList.add("active");
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } else {
      el.classList.remove("active");
    }
  });

  // Update Buttons
  prevSlideBtn.disabled = index === 0;
  nextSlideBtn.disabled = index === SLIDES_DATA.length - 1;
}

// Render Thumbnails
function renderThumbnails() {
  thumbnailsStripEl.innerHTML = "";
  const strip = document.createElement("div");
  strip.className = "thumbnails-strip";

  SLIDES_DATA.forEach((slide, idx) => {
    const item = document.createElement("div");
    item.className = `thumbnail-item ${idx === 0 ? "active" : ""}`;
    item.innerHTML = `
      <div class="thumbnail-num">${String(slide.id).padStart(2, '0')}</div>
      <div class="thumbnail-title">${slide.title}</div>
    `;
    item.addEventListener("click", () => renderSlide(idx));
    strip.appendChild(item);
  });

  thumbnailsStripEl.appendChild(strip);
}

// Event Bindings
function bindEvents() {
  prevSlideBtn.addEventListener("click", () => {
    if (currentSlideIndex > 0) renderSlide(currentSlideIndex - 1);
  });

  nextSlideBtn.addEventListener("click", () => {
    if (currentSlideIndex < SLIDES_DATA.length - 1) renderSlide(currentSlideIndex + 1);
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      if (currentSlideIndex < SLIDES_DATA.length - 1) renderSlide(currentSlideIndex + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      if (currentSlideIndex > 0) renderSlide(currentSlideIndex - 1);
    } else if (e.key === "n" || e.key === "N") {
      notesDrawerEl.classList.toggle("open");
    } else if (e.key === "f" || e.key === "F") {
      toggleFullScreen();
    }
  });

  // Notes drawer toggle
  notesToggleBtn.addEventListener("click", () => {
    notesDrawerEl.classList.toggle("open");
  });

  closeNotesBtn.addEventListener("click", () => {
    notesDrawerEl.classList.remove("open");
  });

  // Fullscreen toggle
  fullscreenBtn.addEventListener("click", toggleFullScreen);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initPresentation);
