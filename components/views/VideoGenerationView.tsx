import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import { DownloadIcon, TrashIcon, StarIcon, AlertTriangleIcon, RefreshCwIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';
import ImageUpload from '../common/ImageUpload';
import { MODELS } from '../../services/aiConfig';
import { addLogEntry } from '../../services/aiLogService';
import { triggerUserWebhook } from '../../services/webhookService';
import { handleApiError } from '../../services/errorHandler';
// FIX: Add missing Language import.
import { type User, type Language } from '../../types';
import { incrementVideoUsage } from '../../services/userService';


interface ImageData {
  base64: string;
  mimeType: string;
}

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface VideoGenerationViewProps {
  preset: VideoGenPreset | null;
  clearPreset: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  // FIX: Add language to props.
  language: Language;
}

const styleOptions = ["Rawak", "Realisme", "Fotorealistik", "Sinematik", "Anime", "Vintaj", "Animasi 3D", "Cat Air", "Claymation"];
const lightingOptions = ["Rawak", "Lampu Studio", "Dramatik", "Cahaya Semula Jadi", "Neon", "Waktu Keemasan", "Cahaya Siang Lembut"];
const cameraOptions = ["Rawak", "Perincian / Makro", "Rakaman Dekat", "Rakaman Sederhana Dekat", "Sederhana / Separuh Badan", "Tiga Suku", "Badan Penuh", "Flatlay", "Rakaman Lebar", "Rakaman Sederhana", "Rakaman Jauh", "Sudut Belanda", "Sudut Rendah", "Sudut Tinggi", "Rakaman Atas"];
const compositionOptions = ["Rawak", "Peraturan Pertiga", "Garis Panduan", "Simetri", "Nisbah Keemasan", "Tengah", "Tidak Simetri"];
const lensTypeOptions = ["Rawak", "Lensa Sudut Lebar", "Lensa Telefoto", "Lensa Mata Ikan", "Lensa Makro", "Lensa 50mm", "Lensa 85mm"];
const filmSimOptions = ["Rawak", "Fujifilm Velvia", "Kodak Portra 400", "Kodachrome Sinematik", "Polaroid Vintaj", "Ilford HP5 (B&W)"];
const effectOptions = ["Tiada", "Rawak", "Percikan Air", "Asap", "Api", "Terapung di Air", "Titisan Hujan", "Jejak Cahaya", "Konfeti", "Glitter", "Letupan Serbuk"];
const resolutions = ["720p", "1080p"];
const moodOptions = [
    'Normal', 
    'Ceria - Laju', 
    'Semangat', 
    'Jualan', 
    'Sedih',
    'Berbisik',
    'Marah',
    'Tenang',
    'Rasmi',
    'Teruja',
    'Penceritaan',
    'Berwibawa',
    'Mesra'
];

const SESSION_KEY = 'videoGenerationState';

const VideoGenerationView: React.FC<VideoGenerationViewProps> = ({ preset, clearPreset, currentUser, onUserUpdate, language }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [dialogueAudio, setDialogueAudio] = useState('');
  
  // Creative Direction State
  const [style, setStyle] = useState('Rawak');
  const [lighting, setLighting] = useState('Rawak');
  const [camera, setCamera] = useState('Rawak');
  const [composition, setComposition] = useState('Rawak');
  const [lensType, setLensType] = useState('Rawak');
  const [filmSim, setFilmSim] = useState('Rawak');
  const [effect, setEffect] = useState('Tiada');

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<ImageData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState("720p");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageUploadKey, setImageUploadKey] = useState(Date.now());
  const [voiceoverLanguage, setVoiceoverLanguage] = useState('English');
  const [voiceoverMood, setVoiceoverMood] = useState('Normal');
  const languages = ["English", "Bahasa Malaysia", "Chinese"];

  const model = MODELS.videoGenerationDefault;
  const isVeo3 = model.startsWith('veo-3');

  const allStates = {
    prompt, negativePrompt, dialogue, dialogueAudio,
    style, lighting, camera, composition, lensType, filmSim, effect,
    referenceImage, previewUrl, resolution, aspectRatio, voiceoverLanguage, voiceoverMood
  };

  useEffect(() => {
    try {
        const savedState = sessionStorage.getItem(SESSION_KEY);
        if (savedState) {
            const state = JSON.parse(savedState);
            Object.keys(state).forEach(key => {
                if (key === 'prompt') setPrompt(state[key]);
                if (key === 'negativePrompt') setNegativePrompt(state[key]);
                if (key === 'dialogue') setDialogue(state[key]);
                if (key === 'dialogueAudio') setDialogueAudio(state[key]);
                if (key === 'style') setStyle(state[key]);
                if (key === 'lighting') setLighting(state[key]);
                if (key === 'camera') setCamera(state[key]);
                if (key === 'composition') setComposition(state[key]);
                if (key === 'lensType') setLensType(state[key]);
                if (key === 'filmSim') setFilmSim(state[key]);
                if (key === 'effect') setEffect(state[key]);
                if (key === 'referenceImage') setReferenceImage(state[key]);
                if (key === 'previewUrl') setPreviewUrl(state[key]);
                if (key === 'resolution') setResolution(state[key]);
                if (key === 'aspectRatio') setAspectRatio(state[key]);
                if (key === 'voiceoverLanguage') setVoiceoverLanguage(state[key]);
                if (key === 'voiceoverMood') setVoiceoverMood(state[key]);
            });
        }
    } catch (e) { console.error("Failed to load state from session storage", e); }
  }, []);
  
  useEffect(() => {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(allStates));
    } catch (e) { console.error("Failed to save state to session storage", e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prompt, negativePrompt, dialogue, dialogueAudio,
    style, lighting, camera, composition, lensType, filmSim, effect,
    referenceImage, previewUrl, resolution, aspectRatio, voiceoverLanguage, voiceoverMood
  ]);

  const loadingMessages = [
    "Memanaskan pengarah AI...",
    "Mencari lokasi digital...",
    "Memilih pelakon maya...",
    "Menyelaraskan kamera dan pencahayaan...",
    "Aksi! Memaparkan babak...",
    "Ini mungkin mengambil masa beberapa minit. Sila bersabar.",
    "AI sedang berusaha keras untuk karya agung anda...",
    "Menambah sentuhan sinematik terakhir...",
    "Hampir sedia untuk tayangan perdana...",
  ];

  useEffect(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      if (isLoading) {
        interval = setInterval(() => {
          setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
        }, 3000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
  }, [isLoading, loadingMessages.length]);

  useEffect(() => {
      if (preset) {
          const sceneText = preset.prompt;
          let voiceover = '';
          let caption = '';
          let visualDescription = sceneText;

          const voiceoverRegex = /\*\*(?:Voiceover|Skrip Suara Latar):\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i;
          const voiceoverMatch = sceneText.match(voiceoverRegex);
          if (voiceoverMatch) {
              voiceover = voiceoverMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(voiceoverRegex, '');
          }

          const captionRegex = /\*\*(?:Captions?|Kapsyen):\*\*([\s\S]*?)(?=\n\*\*|$)/i;
          const captionMatch = sceneText.match(captionRegex);
          if (captionMatch) {
              caption = captionMatch[1].trim().replace(/"/g, "'");
              visualDescription = visualDescription.replace(captionRegex, '');
          }

          visualDescription = visualDescription.replace(/\*\*(.*?):\*\*/g, '').replace(/[\*\-]/g, '').replace(/\s+/g, ' ').trim();

          setPrompt(visualDescription);
          setDialogueAudio(voiceover);
          setDialogue(caption);
          setReferenceImage(preset.image);
          setPreviewUrl(`data:${preset.image.mimeType};base64,${preset.image.base64}`);
          
          clearPreset();
          window.scrollTo(0, 0);
      }
  }, [preset, clearPreset]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
      const urlToClean = videoUrl;
      return () => {
          if (urlToClean && urlToClean.startsWith('blob:')) {
              URL.revokeObjectURL(urlToClean);
          }
      };
  }, [videoUrl]);

  const handleImageUpload = useCallback((base64: string, mimeType: string, file: File) => {
      setReferenceImage({ base64, mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
      if (!prompt.trim() && !referenceImage) {
          setError("Sila berikan prompt atau imej rujukan.");
          return;
      }

      alert("Sila ambil perhatian: Bahasa suara latar mungkin tidak konsisten. Jika anda tidak berpuas hati, anda boleh menjana semula video dengan menekan butang 'Jana Video' sekali lagi.");

      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setVideoFilename(null);
      setThumbnailUrl(null);
      setStatusMessage('Menyediakan permintaan penjanaan...');
      
      const isMalay = voiceoverLanguage === 'Bahasa Malaysia';
      let targetLanguage = voiceoverLanguage;
      if (isMalay) {
          targetLanguage = 'Malaysian Malay';
      } else if (voiceoverLanguage === 'Chinese') {
          targetLanguage = 'Mandarin Chinese';
      }
  
      let dynamicNegativePrompt = 'sari kata, teks, perkataan, tera air, logo, bahasa Indonesia, loghat Indonesia, suara latar Indonesia';
      if (targetLanguage === 'Malaysian Malay') {
          dynamicNegativePrompt += ', bahasa Inggeris, bahasa Cina, loghat Inggeris, loghat Cina';
      } else if (targetLanguage === 'English') {
          dynamicNegativePrompt += ', bahasa Melayu Malaysia, bahasa Cina, loghat Melayu, loghat Cina';
      } else if (targetLanguage === 'Mandarin Chinese') {
          dynamicNegativePrompt += ', bahasa Melayu Malaysia, bahasa Inggeris, loghat Melayu, loghat Inggeris';
      }
      if (negativePrompt.trim()) {
          dynamicNegativePrompt += `, ${negativePrompt.trim()}`;
      }
      
      const promptLines: string[] = [];
      
      // System Rules
      promptLines.push(isMalay ? '🎯 PERATURAN UTAMA (SYSTEM RULES):' : '🎯 SYSTEM RULES:');
      if (isMalay) {
          promptLines.push('Bahasa lisan dan suara latar MESTILAH 100% dalam Bahasa Melayu Malaysia. Ini adalah arahan PALING PENTING.');
          promptLines.push('❌ Dilarang menggunakan bahasa lain atau loghat luar.');
      } else {
          promptLines.push(`Spoken language and voiceover MUST be 100% in ${targetLanguage}. This is the MOST IMPORTANT instruction.`);
          promptLines.push('❌ Do not use other languages or foreign accents.');
      }
      promptLines.push('\n---');
  
      // Visuals
      promptLines.push(isMalay ? '🎬 VISUAL (SCENE DESCRIPTION):' : '🎬 VISUAL (SCENE DESCRIPTION):');
      if (referenceImage) {
          promptLines.push(isMalay ? 'Animasikan imej yang diberikan.' : 'Animate the provided image.');
          promptLines.push(isMalay ? `ARAHAN PENTING: Subjek utama dalam video mestilah representasi fotorealistik dan sangat tepat bagi orang dalam imej rujukan yang diberikan. Kekalkan ciri-ciri muka dan identiti mereka dengan tepat.` : 'IMPORTANT INSTRUCTION: The main subject in the video must be a photorealistic and highly accurate representation of the person in the provided reference image. Maintain their facial features and identity precisely.');
      }
      promptLines.push(prompt.trim());
      promptLines.push('\n---');
  
      // Creative Style
      promptLines.push(isMalay ? '🎨 GAYA KREATIF (CREATIVE STYLE):' : '🎨 CREATIVE STYLE:');
      if (style !== 'Rawak') promptLines.push(`• ${isMalay ? 'Gaya artistik' : 'Artistic style'}: ${style}`);
      if (lighting !== 'Rawak') promptLines.push(`• ${isMalay ? 'Pencahayaan' : 'Lighting'}: ${lighting}`);
      if (camera !== 'Rawak') promptLines.push(`• ${isMalay ? 'Kamera' : 'Camera'}: ${camera}`);
      if (composition !== 'Rawak') promptLines.push(`• ${isMalay ? 'Komposisi' : 'Composition'}: ${composition}`);
      if (lensType !== 'Rawak') promptLines.push(`• ${isMalay ? 'Jenis Lensa' : 'Lens Type'}: ${lensType}`);
      if (filmSim !== 'Rawak') promptLines.push(`• ${isMalay ? 'Simulasi Filem' : 'Film Simulation'}: ${filmSim}`);
      if (effect !== 'Tiada' && effect !== 'Rawak') promptLines.push(`• ${isMalay ? 'Efek tambahan' : 'Additional Effect'}: ${effect}`);
      promptLines.push('\n---');
  
      // Audio
      if (dialogueAudio.trim() && isVeo3) {
          promptLines.push(isMalay ? '🔊 AUDIO (DIALOGUE):' : '🔊 AUDIO (DIALOGUE):');
          promptLines.push(isMalay ? `Gunakan hanya dialog berikut dalam Bahasa Melayu Malaysia:` : `Use only the following dialogue in ${targetLanguage}:`);
          promptLines.push(`"${dialogueAudio.trim()}"`);
          promptLines.push(isMalay ? 'ARAHAN PENTING: Sebutkan skrip ini dengan lengkap, perkataan demi perkataan. Jangan ubah atau ringkaskan ayat.' : 'CRITICAL INSTRUCTION: Speak this script completely, word for word. Do not change or shorten the sentences.');
          promptLines.push(isMalay ? `Nada suara: ${voiceoverMood}.` : `Voice tone: ${voiceoverMood}.`);
          promptLines.push('\n---');
      }
  
      // Additional Reminders
      promptLines.push(isMalay ? '🚫 PERINGATAN TAMBAHAN:' : '🚫 ADDITIONAL REMINDERS:');
      if (dialogue.trim()) {
          promptLines.push(isMalay ? `• Paparkan teks pada skrin ini sahaja: "${dialogue.trim()}".` : `• Display this exact on-screen text: "${dialogue.trim()}".`);
      } else {
          promptLines.push(isMalay ? '• Jangan sertakan teks, kapsyen, atau sari kata pada skrin.' : '• Do not include any on-screen text, captions, or subtitles.');
      }
      promptLines.push(isMalay ? '• Jangan ubah bahasa.' : '• Do not change the language.');
      
      const fullPrompt = promptLines.join('\n');

      try {
          const image = referenceImage ? { imageBytes: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined;
          
          const { videoFile, thumbnailUrl: newThumbnailUrl } = await generateVideo(fullPrompt, model, aspectRatio, resolution, dynamicNegativePrompt, image, setStatusMessage);

          if (videoFile) {
              const objectUrl = URL.createObjectURL(videoFile);
              console.log('✅ Fail video diterima dan URL objek dicipta:', objectUrl);
              setVideoUrl(objectUrl);
              setVideoFilename(videoFile.name);
              setThumbnailUrl(newThumbnailUrl);
              
              // Save to history in the background
              addHistoryItem({
                  type: 'Video',
                  prompt: `Penjanaan Video: ${prompt.trim().substring(0, 100)}...`,
                  result: videoFile,
              }).then(async () => {
                  const updateResult = await incrementVideoUsage(currentUser);
                  if (updateResult.success && updateResult.user) {
                      onUserUpdate(updateResult.user);
                  }
              }).catch(err => {
                  console.error("Gagal menyimpan video ke sejarah:", err);
                  setError("Video dijana tetapi gagal disimpan ke galeri. Sila muat turun sekarang.");
              });
          }
      } catch (e) {
          const userFriendlyMessage = handleApiError(e);
          setError(userFriendlyMessage);
      } finally {
          setIsLoading(false);
          setStatusMessage('');
      }
  }, [prompt, style, lighting, camera, composition, lensType, filmSim, effect, dialogue, dialogueAudio, isVeo3, referenceImage, model, aspectRatio, resolution, negativePrompt, voiceoverLanguage, voiceoverMood, currentUser, onUserUpdate]);

  const handleDownloadVideo = async () => {
    if (!videoUrl || !videoFilename) return;
    setIsDownloading(true);
    try {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = videoFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Ralat muat turun:", error);
        setError(error instanceof Error ? error.message : "Gagal memuat turun video.");
    } finally {
        setIsDownloading(false);
    }
  };

  const removeReferenceImage = () => {
      setReferenceImage(null);
      setPreviewUrl(null);
      setImageUploadKey(Date.now());
  };

  const handleReset = useCallback(() => {
    setPrompt('');
    setNegativePrompt('');
    setDialogue('');
    setDialogueAudio('');
    
    setStyle('Rawak');
    setLighting('Rawak');
    setCamera('Rawak');
    setComposition('Rawak');
    setLensType('Rawak');
    setFilmSim('Rawak');
    setEffect('Tiada');
    
    setVideoUrl(null);
    setVideoFilename(null);
    setThumbnailUrl(null);
    setError(null);
    setReferenceImage(null);
    setPreviewUrl(null);
    setResolution("720p");
    setAspectRatio("9:16");
    setVoiceoverLanguage('English');
    setVoiceoverMood('Normal');
    setImageUploadKey(Date.now());
    setStatusMessage('');
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const leftPanel = (
    <>
        <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Penjana Video AI</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Cipta video berkualiti tinggi dari teks atau imej.</p>
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">Model & Format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nisbah Aspek</label>
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {["9:16", "16:9", "1:1", "4:3", "3:4"].map(ar => <option key={ar} value={ar}>{ar}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Resolusi</label>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                        {resolutions.map(res => <option key={res} value={res}>{res}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Imej Rujukan (Pilihan)</h2>
            {previewUrl ? (
                 <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="Pratonton Rujukan" className="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-800" />
                    <button onClick={removeReferenceImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                // FIX: Add missing 'language' prop to ImageUpload component.
                <ImageUpload id="video-ref-upload" key={imageUploadKey} onImageUpload={handleImageUpload} title="Muat Naik Imej Permulaan" language={language}/>
            )}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
                AI akan menggunakan imej ini sebagai titik permulaan untuk video.
            </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Prompt Utama</h2>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="cth., Sebuah bandar futuristik dengan kereta terbang pada waktu senja..." rows={5} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
        </div>
        
        <div>
            <h2 className="text-lg font-semibold mb-2">Arahan Kreatif</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Gaya Artistik</label><select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{styleOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Pencahayaan</label><select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{lightingOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Shot Kamera</label><select value={camera} onChange={e => setCamera(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{cameraOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Komposisi</label><select value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{compositionOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Jenis Lensa</label><select value={lensType} onChange={e => setLensType(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{lensTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Simulasi Filem</label><select value={filmSim} onChange={e => setFilmSim(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{filmSimOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Kesan Visual</label><select value={effect} onChange={e => setEffect(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none">{effectOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Prompt Negatif (Apa yang perlu dielakkan)</label><textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="cth., kabur, bergegar, tera air" rows={1} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none" /></div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Dialog & Teks</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="on-screen-text" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Teks Pada Skrin (Kapsyen)</label>
                    <textarea id="on-screen-text" value={dialogue} onChange={e => setDialogue(e.target.value)} placeholder="Masukkan sebarang teks yang anda mahu muncul pada video." rows={2} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="spoken-dialogue" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Dialog Lisan (Suara Latar)</label>
                        <div className={`relative ${!isVeo3 ? 'opacity-50' : ''}`}>
                            <textarea
                                id="spoken-dialogue"
                                value={dialogueAudio}
                                onChange={e => setDialogueAudio(e.target.value)}
                                placeholder="Masukkan dialog tepat untuk dituturkan oleh AI."
                                rows={2}
                                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:cursor-not-allowed"
                                disabled={!isVeo3}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="voiceover-language" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Bahasa Suara Latar</label>
                        <select
                            id="voiceover-language"
                            value={voiceoverLanguage}
                            onChange={(e) => setVoiceoverLanguage(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="voiceover-mood" className={`block text-sm font-medium mb-1 ${!isVeo3 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Mood Suara Latar</label>
                        <select
                            id="voiceover-mood"
                            value={voiceoverMood}
                            onChange={(e) => setVoiceoverMood(e.target.value)}
                            disabled={!isVeo3}
                            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {moodOptions.map(mood => <option key={mood} value={mood}>{mood}</option>)}
                        </select>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-md" dangerouslySetInnerHTML={{ __html: 'Suara latar hanya disokong oleh <strong>model Veo 3</strong> dan berfungsi terbaik dengan Bahasa Inggeris.' }}/>
            </div>
        </div>
        
        <div className="pt-4 mt-auto">
            <div className="flex gap-4">
                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? <Spinner /> : 'Jana Video'}
                </button>
                <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    Set Semula
                </button>
            </div>
             {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
        </div>
    </>
  );

  const rightPanel = (
      <>
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Spinner />
                  <p className="mt-4 text-neutral-500 dark:text-neutral-400">{statusMessage || 'Menjana...'}</p>
                  <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{loadingMessages[loadingMessageIndex]}</p>
              </div>
          ) : error && !videoUrl ? ( // Only show error if there's no video to display
               <div className="text-center text-red-500 dark:text-red-400 p-4">
                   <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-semibold">Penjanaan Gagal</p>
                   <p className="text-sm mt-2 max-w-md mx-auto">{error}</p>
                   <button
                       onClick={handleGenerate}
                       className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 mx-auto"
                   >
                       <RefreshCwIcon className="w-4 h-4" />
                       Cuba Lagi
                   </button>
              </div>
          ) : videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <video 
                      key={videoUrl}
                      src={videoUrl}
                      poster={thumbnailUrl || undefined}
                      controls 
                      autoPlay 
                      playsInline
                      muted
                      className="max-h-full max-w-full rounded-md"
                  >
                      Penyemak imbas anda tidak menyokong tag video.
                  </video>
                  
                  {error && <p className="text-red-500 dark:text-red-400 text-center text-sm">{error}</p>}

                  <button
                    onClick={handleDownloadVideo}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Spinner /> : <DownloadIcon className="w-4 h-4" />}
                    {isDownloading ? 'Memuat turun...' : 'Muat Turun Video'}
                  </button>
              </div>
          ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600">
                  <StarIcon className="w-16 h-16 mx-auto" />
                  <p>Video yang anda jana akan muncul di sini.</p>
              </div>
          )}
      </>
  );

  // FIX: Pass the 'language' prop to the TwoColumnLayout component.
  return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

export default VideoGenerationView;