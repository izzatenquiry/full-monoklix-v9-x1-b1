/**
 * This service centralizes all prompt engineering logic.
 * Instead of constructing prompts inside UI components, we define them here.
 * This makes prompts easier to manage, version, and test independently of the UI.
 */

// --- AI Support ---
export const getSupportPrompt = (): string => `You are a helpful AI Customer Support Agent for MONOklix.com.  
Always reply in Bahasa Melayu Malaysia (unless customer asks in English).  
Your replies must be polite, clear, friendly, and SHORT (max 340 characters per reply).  

Guidelines:
1. Sentiasa mesra, profesional, dan gunakan bahasa mudah.  
2. Jawab step by step untuk bantu user.  
3. Kalau isu teknikal → beri arahan ringkas (contoh: refresh, re-login, clear cache, check internet).  
4. Kalau tak pasti → beritahu akan escalate kepada team teknikal.  
5. Pastikan jawapan mudah difahami oleh user biasa (bukan developer).  

Persona:  
- Tone: Mesra + professional.  
- Style: Ringkas, elakkan jargon teknikal berlebihan.  
- Target: Pengguna biasa.  

Example replies:  
- "Hai 👋 boleh jelaskan masalah anda? Saya cuba bantu."  
- "Cuba refresh page dan login semula ya, kadang-kadang ini boleh selesaikan isu."  
- "Kalau error masih ada, boleh share screenshot? Saya check sama-sama."  
- "Baik, saya escalate isu ni kepada team teknikal kami."`;

// --- Content Ideas ---
export const getContentIdeasPrompt = (topic: string): string => `
    Hasilkan senarai 5 idea kandungan yang menarik (cth., entri blog, kemas kini media sosial, skrip video) untuk topik berikut: "${topic}".
    Idea-idea tersebut mestilah sohor kini, relevan, dan bertujuan untuk menarik perhatian audiens. Untuk setiap idea, berikan tajuk yang menarik dan penerangan ringkas tentang konsep tersebut.
    The final output language must be strictly in English.
`;

// --- Marketing Copy ---
export const getMarketingCopyPrompt = (details: {
  productDetails: string;
  targetAudience: string;
  keywords: string;
  selectedTone: string;
}): string => `
    Anda adalah seorang penulis iklan pemasaran yang pakar. Hasilkan teks pemasaran yang meyakinkan berdasarkan butiran berikut.
    The final output language must be strictly in English.

    **Butiran Produk/Perkhidmatan:**
    ${details.productDetails}

    **Sasaran Audiens:**
    ${details.targetAudience || 'Khalayak Umum'}

    **Nada Suara:**
    ${details.selectedTone}

    **Kata Kunci untuk disertakan:**
    ${details.keywords || 'Tiada'}

    Teks tersebut mestilah menarik, meyakinkan, dan sedia untuk digunakan dalam siaran media sosial, iklan, atau kandungan laman web. Susun output dengan jelas, mungkin dengan tajuk utama dan badan teks.
`;

// --- Product Ad Storyline ---
export const getProductAdPrompt = (details: {
  productDesc: string;
  vibe: string;
  lighting: string;
  contentType: string;
}): string => `
    Anda adalah seorang penulis iklan dan artis papan cerita yang pakar untuk iklan video media sosial.
    Cipta papan cerita 1 babak yang meyakinkan untuk iklan video berdasarkan imej dan butiran produk yang diberikan.
    The output language for the storyboard must be strictly in English.

    **Penerangan Produk:**
    ${details.productDesc}

    **Arahan Kreatif:**
    - Suasana: ${details.vibe}
    - Pencahayaan: ${details.lighting}
    - Jenis Kandungan: ${details.contentType}

    Berdasarkan semua maklumat ini, terangkan satu babak yang berkesan. Apa yang penonton lihat? Apakah suara latar atau teks pada skrin?
    Pastikan ia pendek, menarik, dan dioptimumkan untuk platform seperti TikTok atau Instagram Reels.
`;

// --- Product Photo (Unified Prompt) ---
export const getProductPhotoPrompt = (details: {
  vibe: string;
  lighting: string;
  camera: string;
  creativityLevel: number;
  customPrompt: string;
  style: string;
  composition: string;
  lensType: string;
  filmSim: string;
  effect: string;
}): string => {
  if (details.customPrompt.trim()) {
    return details.customPrompt.trim() + '\n\nThe final output language must be strictly in English.';
  }

  const promptParts = [
    `Cipta foto produk profesional yang fotorealistik untuk imej yang dimuat naik.`,
    `Jangan sertakan mana-mana orang, model, atau teks. Fokus hanya pada produk itu sendiri.`,

    `**Arahan Kreatif:**`,
    `- Latar Belakang / Suasana: ${details.vibe}`,
    `- Gaya Artistik: ${details.style === 'Random' ? 'fotorealistik' : details.style}`,
    `- Pencahayaan: ${details.lighting === 'Random' ? 'pencahayaan sinematik yang menarik' : details.lighting}`,
    `- Rakaman Kamera: ${details.camera === 'Random' ? 'sudut yang dinamik' : details.camera}`,
    `- Komposisi: ${details.composition === 'Random' ? 'komposisi yang baik' : details.composition}`,
    `- Jenis Lensa: ${details.lensType === 'Random' ? 'lensa standard' : details.lensType}`,
    `- Simulasi Filem: ${details.filmSim === 'Random' ? 'rupa digital moden' : details.filmSim}`,
    `- Kesan Visual: ${details.effect === 'Random' || details.effect === 'None' ? 'tiada' : details.effect}`,
    `- Tahap Kreativiti AI: ${details.creativityLevel} daripada 10 (0 = literal, 10 = kebebasan artistik penuh)`,
    
    `**Keperluan Akhir:**`,
    `- Hasilnya mestilah bersih, estetik, dan sesuai untuk penyenaraian e-dagang atau media sosial.`,
    `- KRITIKAL: Imej akhir mestilah visual semata-mata. JANGAN tambah teks, tera air, atau logo.`,
    `- The final output language must be strictly in English.`
  ];

  return promptParts.join('\n');
};


// --- Product Review (Unified Prompt) ---
export const getProductReviewStoryboardPrompt = (details: {
  productDesc: string;
  selectedVibe: string;
  selectedBackgroundVibe: string;
  selectedContentType: string;
  includeCaptions: 'Yes' | 'No';
  includeVoiceover: 'Yes' | 'No';
  includeModel: 'Yes' | 'No';
  style: string;
  lighting: string;
  camera: string;
  composition: string;
  lensType: string;
  filmSim: string;
  effect: string;
  creativityLevel: number;
}): string => {
  const isMalay = true;
  const sceneTitle = isMalay ? 'Babak' : 'Scene';
  const voiceoverTitle = isMalay ? 'Skrip Suara Latar' : 'Voiceover';
  const captionTitle = isMalay ? 'Kapsyen' : 'Captions';
  const visualTitle = isMalay ? 'Visual' : 'Visuals';

  // Dynamically build the list of required elements and instructions
  const structureElements = [`"**${visualTitle}:**"`];
  let dynamicExtraInstructions = "Untuk setiap babak, cipta penerangan visual.";

  if (details.includeVoiceover === 'Yes') {
    structureElements.push(`"**${voiceoverTitle}:**"`);
    dynamicExtraInstructions += " Juga, tulis skrip suara latar yang berbunyi semula jadi (maks 120 aksara).";
  }

  if (details.includeCaptions === 'Yes') {
    structureElements.push(`"**${captionTitle}:**"`);
    dynamicExtraInstructions += " Juga, sediakan kapsyen pada skrin yang pendek dan menarik.";
  }

  return `
Anda adalah pembantu AI pakar dalam mencipta papan cerita untuk video ulasan produk media sosial.
The output language for all generated text (titles, descriptions, scripts) must be strictly in English.

Cipta **papan cerita 4 babak** untuk video bentuk pendek (TikTok, Instagram Reels, YouTube Shorts) berdasarkan perkara berikut:

**Penerangan Produk:**
${details.productDesc}

**Arahan Kreatif:**
- Sertakan model dalam video: ${details.includeModel}
- Suasana: ${details.selectedVibe}
- Suasana Latar Belakang: ${details.selectedBackgroundVibe}
- Jenis Kandungan: ${details.selectedContentType}
- Gaya Artistik: ${details.style}
- Pencahayaan: ${details.lighting}
- Gaya Rakaman Kamera: ${details.camera}
- Komposisi: ${details.composition}
- Jenis Lensa: ${details.lensType}
- Simulasi Filem: ${details.filmSim}
- Kesan Visual: ${details.effect}
- Tahap Kreativiti AI (0-10): ${details.creativityLevel}
- Teks/Kapsyen Pada Skrin: ${details.includeCaptions}
- Skrip Suara Latar: ${details.includeVoiceover}

**Tugasan:**
${dynamicExtraInstructions}
Papan cerita mesti mengikut aliran yang logik:  
1. Pengenalan (cangkuk & pendedahan produk)  
2. Demonstrasi / Ciri-ciri  
3. Faedah / pengalaman pengguna  
4. Panggilan untuk bertindak (mengapa beli / desakan terakhir)

**Struktur Output:**
Output mesti distrukturkan dengan tajuk yang jelas untuk setiap babak, seperti "**${sceneTitle} 1:**", "**${sceneTitle} 2:**", dsb.
Untuk setiap babak, anda MESTI menggunakan tajuk berikut untuk elemen yang diperlukan: ${structureElements.join(', ')}.
`;
};


// --- Product Review Image Prompt (Unified) ---
export const getProductReviewImagePrompt = (details: {
  productDesc: string;
  sceneDescription: string;
  selectedVibe: string;
  selectedBackgroundVibe: string;
  selectedLighting: string;
  style: string;
  camera: string;
  composition: string;
  lensType: string;
  filmSim: string;
  creativityLevel: number;
  effect: string;
  includeModel: 'Yes' | 'No';
}): string => {
    const promptParts = [
        'Anda adalah pakar penjanaan imej AI. Tugas anda adalah untuk mencipta satu imej gaya UGC fotorealistik untuk video ulasan produk.',
    ];

    if (details.includeModel === 'Yes') {
        promptParts.push(
            'Anda akan menggabungkan seseorang dan produk ke dalam babak baharu.',
            '\n**Aset yang Disediakan:**',
            '1. **Wajah Seseorang:** Imej rujukan orang yang akan dipaparkan.',
            '2. **Produk:** Imej rujukan produk yang sedang diulas.'
        );
    } else {
        promptParts.push(
            'Anda akan meletakkan produk ke dalam babak baharu. Jangan sertakan mana-mana orang atau model.',
            '\n**Aset yang Disediakan:**',
            '1. **Produk:** Imej rujukan produk yang sedang diulas.'
        );
    }

    promptParts.push(
        '\n**Produk yang Diulas:**',
        details.productDesc,
        '\n**Penerangan Babak (apa yang berlaku):**',
        details.sceneDescription,
        '\n**Arahan Kreatif untuk Babak:**',
        `- Suasana: ${details.selectedVibe}`,
        `- Suasana Latar Belakang: ${details.selectedBackgroundVibe}`,
        `- Pencahayaan: ${details.selectedLighting}`,
        `- Gaya Artistik: ${details.style === 'Random' ? 'fotorealistik' : details.style}`,
        `- Rakaman Kamera: ${details.camera === 'Random' ? 'sudut yang dinamik' : details.camera}`,
        `- Komposisi: ${details.composition === 'Random' ? 'komposisi yang baik' : details.composition}`,
        `- Jenis Lensa: ${details.lensType === 'Random' ? 'lensa standard' : details.lensType}`,
        `- Simulasi Filem: ${details.filmSim === 'Random' ? 'rupa digital moden' : details.filmSim}`,
        `- Kesan Visual: ${details.effect === 'Random' || details.effect === 'None' ? 'tiada' : details.effect}`,
        `- Tahap Kreativiti AI (0-10): ${details.creativityLevel}`
    );

    promptParts.push('\n**ARAHAN KRITIKAL:**');

    if (details.includeModel === 'Yes') {
        promptParts.push('1. **Ketepatan Wajah:** Wajah orang dalam imej akhir **MESTI sepadan secara fotorealistik dan tepat** dengan wajah dari imej rujukan wajah yang diberikan. **Jangan ubah** ciri muka, struktur, atau identiti mereka. Imej akhir mesti kelihatan seperti menampilkan orang yang sama.');
    }

    promptParts.push(
        `${details.includeModel === 'Yes' ? '2.' : '1.'} **Integrasi Produk:** Integrasikan produk dari imej rujukan produk ke dalam babak secara lancar dan semula jadi.`,
        `${details.includeModel === 'Yes' ? '3.' : '2.'} **Kualiti Imej Akhir:** Hasilnya mestilah kelihatan seperti bingkai sebenar berkualiti tinggi dari video bentuk pendek (seperti TikTok atau Reels).`,
        `${details.includeModel === 'Yes' ? '4.' : '3.'} **Tiada Teks:** Imej output mestilah visual semata-mata. JANGAN tambah sebarang teks, tera air, atau logo.`
    );

    promptParts.push('\nJana hanya imej yang sepadan dengan penerangan ini dengan sempurna. The final output language must be strictly in English.');

    return promptParts.join('\n');
};


// --- TikTok Affiliate Unified Prompt ---
export const getTiktokAffiliatePrompt = (details: {
  gender: string;
  modelFace: string;
  lighting: string;
  camera: string;
  pose: string;
  vibe: string;
  creativityLevel: number;
  customPrompt: string;
  hasFaceImage?: boolean;
  style: string;
  composition: string;
  lensType: string;
  filmSim: string;
}): string => {
  if (details.customPrompt.trim()) {
    return details.customPrompt.trim() + '\n\nThe final output language must be strictly in English.';
  }

  if (details.hasFaceImage) {
    // Use a much stricter prompt when a face is provided to ensure it's preserved.
    return `
Anda adalah pakar penjanaan imej AI. Tugas anda adalah untuk mencipta satu imej gaya UGC fotorealistik dengan menggabungkan seseorang dan produk ke dalam babak baharu.
The final output language must be strictly in English.

**Aset yang Disediakan:**
1.  **Wajah Seseorang:** Imej rujukan orang yang akan dipaparkan.
2.  **Produk:** Imej rujukan produk.

**Arahan Kreatif untuk Babak Baharu:**
-   **Latar Belakang/Suasana:** ${details.vibe}
-   **Pose Model:** ${details.pose === 'Random' ? 'pose yang semula jadi dan santai, berinteraksi dengan produk jika sesuai' : details.pose}
-   **Gaya Artistik:** ${details.style === 'Random' ? 'fotorealistik' : details.style}
-   **Pencahayaan:** ${details.lighting === 'Random' ? 'pencahayaan yang menyanjung dan kelihatan semula jadi' : details.lighting}
-   **Rakaman Kamera:** ${details.camera === 'Random' ? 'sudut yang dinamik' : details.camera}
-   **Komposisi:** ${details.composition === 'Random' ? 'komposisi yang baik' : details.composition}
-   **Jenis Lensa:** ${details.lensType === 'Random' ? 'lensa standard' : details.lensType}
-   **Simulasi Filem:** ${details.filmSim === 'Random' ? 'rupa digital moden' : details.filmSim}
-   **Tahap Kreativiti AI (0-10):** ${details.creativityLevel}

**ARAHAN KRITIKAL:**
1.  **Ketepatan Wajah:** Wajah orang dalam imej akhir **MESTI sepadan secara fotorealistik dan tepat** dengan wajah dari imej rujukan yang diberikan. **Jangan ubah** ciri muka, struktur, atau identiti mereka. Jantina ditentukan oleh imej wajah.
2.  **Integrasi Produk:** Integrasikan produk ke dalam babak dengan orang itu secara lancar dan semula jadi.
3.  **Kualiti Imej Akhir:** Hasilnya mestilah imej UGC berkualiti tinggi yang kelihatan asli dan sesuai untuk TikTok.
4.  **Tiada Teks:** Imej output mestilah visual semata-mata. JANGAN tambah sebarang teks, tera air, atau logo.

Jana hanya imej yang sepadan dengan penerangan ini dengan sempurna.
`;
  } else {
    // The original prompt for when no face is provided (generates a new face).
    const modelInstruction = `Seorang model ${details.gender} dengan ciri muka tipikal ${details.modelFace === 'Random' ? 'Asia Tenggara' : details.modelFace}. Pastikan wajah kelihatan realistik dan menarik.`;
    const productInstruction = "Sertakan produk dari imej yang dimuat naik.";

    return `
Cipta imej Kandungan Dijana Pengguna (UGC) berkualiti tinggi dan fotorealistik yang sesuai untuk pemasaran affiliate TikTok.
Imej tersebut mesti menampilkan imej produk yang diberikan secara semula jadi.
The final output language must be strictly in English.

**Arahan Teras:**
1. Subjek utama ialah model dan produk bersama-sama. Integrasikan produk secara semula jadi.
2. ${modelInstruction}
3. Estetikanya mestilah menarik perhatian dan terasa asli, seperti kandungan UGC sebenar.

**Arahan Kreatif:**
- Jantina Model: ${details.gender}
- Pose Model: ${details.pose === 'Random' ? 'pose yang semula jadi dan santai, berinteraksi dengan produk jika sesuai' : details.pose}
- Produk: ${productInstruction}
- Latar Belakang/Suasana: ${details.vibe}
- Gaya Artistik: ${details.style === 'Random' ? 'fotorealistik' : details.style}
- Pencahayaan: ${details.lighting === 'Random' ? 'pencahayaan yang menyanjung dan kelihatan semula jadi' : details.lighting}
- Rakaman Kamera: ${details.camera === 'Random' ? 'sudut yang dinamik' : details.camera}
- Komposisi: ${details.composition === 'Random' ? 'komposisi yang baik' : details.composition}
- Jenis Lensa: ${details.lensType === 'Random' ? 'lensa standard' : details.lensType}
- Simulasi Filem: ${details.filmSim === 'Random' ? 'rupa digital moden' : details.filmSim}
- Tahap Kreativiti AI (0-10): ${details.creativityLevel}

**Keperluan Akhir:**
- Hasilnya mestilah imej berkualiti tinggi, kelihatan asli, dan menarik untuk pemasaran affiliate.
- KRITIKAL: Imej mestilah visual semata-mata. JANGAN tambah teks, tera air, atau logo.
`;
  }
};

// --- Background Remover ---
export const getBackgroundRemovalPrompt = (): string => {
    return "Buang latar belakang dari imej yang diberikan. Outputnya hendaklah PNG yang bersih dengan latar belakang lutsinar. Asingkan subjek utama dengan sempurna. The final output language must be strictly in English.";
};

// --- Image Enhancer ---
export const getImageEnhancementPrompt = (type: 'upscale' | 'colors'): string => {
    if (type === 'upscale') {
        return "Tingkatkan kualiti imej berikut. Naikkan resolusinya, tajamkan butirannya, dan kurangkan sebarang hingar atau artifak. Imej akhir sepatutnya kelihatan seperti gambar profesional beresolusi tinggi. Jangan ubah kandungan. The final output language must be strictly in English.";
    }
    // type === 'colors'
    return "Tingkatkan warna imej berikut. Jadikan ia lebih bersemangat, perbaiki kontras, dan laraskan keseimbangan warna agar lebih menarik. Jangan ubah kandungan atau resolusi, hanya jadikan warna lebih menonjol secara semula jadi. The final output language must be strictly in English.";
};

// --- Image Generation (Editing Mode) ---
export const getImageEditingPrompt = (userPrompt: string): string => `
Anda adalah seorang penyunting imej AI yang pakar. Tugas anda adalah untuk mengubah suai imej rujukan yang diberikan berdasarkan permintaan pengguna.
The final output language must be strictly in English.

**Permintaan Pengguna:**
"${userPrompt}"

**GARIS PANDUAN KRITIKAL:**
1.  **Ketepatan Wajah:** Jika imej rujukan mengandungi seseorang, adalah amat kritikal bahawa wajah orang itu dalam imej akhir adalah **padanan fotorealistik dan tepat** dengan wajah dari imej rujukan. JANGAN ubah ciri muka, struktur, atau identiti mereka. Imej akhir mesti kelihatan seperti orang yang sama.
2.  **Guna Suntingan:** Gunakan permintaan pengguna secara kreatif pada imej.
3.  **Kualiti Tinggi:** Hasil akhir mestilah imej fotorealistik berkualiti tinggi.
4.  **Tiada Teks/Logo:** Imej akhir mestilah visual semata-mata. JANGAN tambah sebarang teks, tera air, atau logo.

Jana hanya imej yang disunting berdasarkan arahan ini.
`;

// --- Staff Monoklix ---
export const getStaffMonoklixPrompt = (details: {
  agentId: string;
  userInput: string;
}): string => {
    const baseInstruction = `Anda adalah pembantu AI yang membantu. The final output language must be strictly in English.`;
    let agentSpecificInstruction = '';

    switch (details.agentId) {
        case 'wan':
            agentSpecificInstruction = `Anda adalah Wan, seorang pakar dalam penyelidikan pasaran. Berdasarkan produk/perkhidmatan "${details.userInput}", cipta "Persona Pelanggan Ideal" yang terperinci. Sertakan demografi, minat, titik kesakitan, dan motivasi.`;
            break;
        case 'tina':
            agentSpecificInstruction = `Anda adalah Tina, seorang pakar psikologi tingkah laku. Untuk produk/perkhidmatan "${details.userInput}", kenal pasti "Ketakutan" utama (apa yang pelanggan ingin elakkan) dan "Keinginan" (apa yang pelanggan ingin capai).`;
            break;
        case 'jamil':
            agentSpecificInstruction = `Anda adalah Jamil, seorang ahli strategi pemasaran. Untuk produk/perkhidmatan "${details.userInput}", sumbang saran 3 "Sudut Pemasaran" yang berbeza. Setiap sudut harus membentangkan cara yang unik untuk menarik pelanggan berpotensi.`;
            break;
        case 'najwa':
            agentSpecificInstruction = `Anda adalah Najwa, seorang penulis iklan profesional. Tulis teks pemasaran yang pendek dan meyakinkan untuk produk/perkhidmatan "${details.userInput}". Fokus pada faedah berbanding ciri.`;
            break;
        case 'saifuz':
            agentSpecificInstruction = `Anda adalah Saifuz, seorang pakar ujian A/B. Ambil teks jualan berikut dan cipta 3 variasi yang berbeza daripadanya. Setiap variasi harus mencuba cangkuk atau panggilan untuk bertindak yang berbeza. Teks asal: "${details.userInput}"`;
            break;
        case 'mieya':
            agentSpecificInstruction = `Anda adalah Mieya, seorang pakar dalam formula pemasaran klasik. Tulis teks pemasaran untuk produk/perkhidmatan "${details.userInput}" menggunakan formula AIDA (Attention, Interest, Desire, Action).`;
            break;
        case 'afiq':
            agentSpecificInstruction = `Anda adalah Afiq, seorang ahli strategi kandungan web. Rangkakan bahagian utama untuk halaman jualan yang menukar tinggi untuk produk/perkhidmatan "${details.userInput}". Sertakan bahagian seperti Tajuk Utama, Masalah, Penyelesaian, Testimoni, Tawaran, dan Panggilan untuk Bertindak.`;
            break;
        case 'julia':
            agentSpecificInstruction = `Anda adalah Julia, seorang pakar tajuk utama. Sumbang saran 10 tajuk utama yang menarik dan boleh diklik untuk iklan tentang "${details.userInput}".`;
            break;
        case 'mazrul':
            agentSpecificInstruction = `Anda adalah Mazrul, seorang penulis skrip video. Tulis skrip video pendek (30-60 saat) untuk iklan media sosial tentang "${details.userInput}". Sertakan petunjuk visual dan teks suara latar.`;
            break;
        case 'musa':
            agentSpecificInstruction = `Anda adalah Musa, seorang jurulatih penjenamaan peribadi. Berdasarkan input "${details.userInput}", tulis siaran penjenamaan peribadi yang meyakinkan yang sesuai untuk platform yang dinyatakan. Fokus pada penceritaan dan memberi nilai.`;
            break;
        case 'joe_davinci':
            agentSpecificInstruction = `Anda adalah Joe, seorang jurutera prompt seni AI. Berdasarkan input "${details.userInput}", cipta prompt yang terperinci dan berkesan untuk penjana imej AI bagi mencipta visual yang menakjubkan. Sertakan butiran tentang gaya, pencahayaan, komposisi, dan subjek.`;
            break;
        case 'zaki':
            agentSpecificInstruction = `Anda adalah Zaki, seorang prompter reka bentuk grafik. Berdasarkan input "${details.userInput}", cipta prompt yang terperinci untuk AI bagi menjana poster promosi. Sertakan arahan mengenai teks, susun atur, skema warna, dan suasana keseluruhan.`;
            break;
        default:
            agentSpecificInstruction = `Analisis input pengguna berikut dan berikan respons yang membantu: "${details.userInput}"`;
            break;
    }

    return `${baseInstruction}\n\n${agentSpecificInstruction}`;
};

// --- Social Post Studio AI Writer ---
export const getSocialPostStudioCaptionPrompt = (details: {
  agentId: string;
  userInput: string;
}): string => {
    let agentPersona = '';
    switch (details.agentId) {
        case 'najwa':
            agentPersona = 'Anda adalah Najwa, seorang penulis iklan profesional. Fokus pada faedah berbanding ciri.';
            break;
        case 'julia':
            agentPersona = 'Anda adalah Julia, seorang pakar tajuk utama. Kapsyen anda mestilah sangat menarik dan boleh diklik, seperti tajuk utama yang hebat yang diperluaskan menjadi siaran.';
            break;
        case 'musa':
            agentPersona = 'Anda adalah Musa, seorang jurulatih penjenamaan peribadi. Kapsyen anda harus fokus pada penceritaan dan memberi nilai, dalam gaya penjenamaan peribadi.';
            break;
    }

    return `
Anda adalah seorang pengurus media sosial dan penulis iklan yang pakar.
${agentPersona}
The final output language must be strictly in English.

**Topik/Penerangan dari Pengguna:**
"${details.userInput}"

**Tugasan Anda:**
Hasilkan objek JSON yang sah dengan tiga kunci:
1.  "caption": Kapsyen yang meyakinkan dan menarik untuk siaran media sosial, mengikut gaya persona anda. Ia harus distrukturkan dengan baik dan boleh menggunakan emoji. **KRITIKAL: Teks kapsyen MESTILAH antara 400 dan 450 aksara panjang.**
2.  "hashtags": Rentetan hashtag yang relevan, dipisahkan oleh ruang (cth., "#tag1 #tag2 #tag3").
3.  "cta": Frasa panggilan untuk bertindak (CTA) yang pendek, jelas, dan kuat yang berkaitan dengan siaran (maksimum 5 perkataan).

**Contoh Format Output:**
{
  "caption": "Your generated caption text (400-450 characters) goes here...",
  "hashtags": "#socialmedia #marketing #aipowered",
  "cta": "Your short CTA here"
}

**KRITIKAL:** Hanya output objek JSON mentah. Jangan sertakan sebarang teks lain, penjelasan, atau pemformatan markdown seperti \`\`\`json. JSON mesti sah.
`;
};