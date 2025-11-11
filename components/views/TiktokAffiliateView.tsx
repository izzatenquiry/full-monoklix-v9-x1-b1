import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ImageUpload from '../common/ImageUpload';
// FIX: Removed invalid import for 'composeImage'.
import { type MultimodalContent, generateVideo } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
// FIX: Added missing UserIcon and TikTokIcon to fix 'Cannot find name' errors.
import { StarIcon, DownloadIcon, ImageIcon, VideoIcon, WandIcon, AlertTriangleIcon, RefreshCwIcon, XIcon, UserIcon, TikTokIcon } from '../Icons';
import { getTiktokAffiliatePrompt } from '../../services/promptManager';
import { type User } from '../../types';
import { MODELS } from '../../services/aiConfig';
import { incrementVideoUsage } from '../../services/userService';
import { addLogEntry } from '../../services/aiLogService';
import { triggerUserWebhook } from '../../services/webhookService';
import PreviewModal from '../common/PreviewModal';
import { handleApiError } from '../../services/errorHandler';
import { editOrComposeWithImagen } from '../../services/imagenV3Service';
// FIX: Add missing Language import.
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';
// FIX: Added missing TwoColumnLayout import to fix 'Cannot find name' error.
import TwoColumnLayout from '../common/TwoColumnLayout';
import { incrementImageUsage } from '../../services/userService';


const CreativeButton: React.FC<{
  label: string;
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}> = ({ label, isSelected, onClick, icon: Icon, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 w-full
      ${isSelected && !disabled
        ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-700/50 hover:border-neutral-400 dark:hover:border-neutral-500'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
    <span className="font-semibold text-sm flex-1 text-center">{label}</span>
  </button>
);

interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}

interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

interface TiktokAffiliateViewProps {
  onReEdit: (preset: ImageEditPreset) => void;
  onCreateVideo: (preset: VideoGenPreset) => void;
  language: Language;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const modelFaceOptions = ["Rawak", "Malaysia", "Vietnam", "England", "AS", "Arab", "Rusia", "Jepun", "Korea", "Thailand"];
const lightingOptions = ["Rawak", "Siang Lembut", "Waktu Keemasan", "Cahaya Keras", "Lampu Belakang Tingkap", "Cahaya Lampu Suam", "Cahaya Campuran", "Lampu Studio", "Dramatik", "Cahaya Semula Jadi", "Neon", "Lampu Belakang", "Pencahayaan Sisi"];
const cameraOptions = ["Rawak", "Perincian / Makro", "Rakaman Dekat", "Rakaman Sederhana Dekat", "Sederhana / Separuh Badan", "Tiga Suku", "Badan Penuh", "Flatlay", "Rakaman Lebar", "Rakaman Sederhana", "Rakaman Jauh", "Sudut Belanda", "Sudut Rendah", "Sudut Tinggi", "Rakaman Atas"];
const poseOptions = ["Rawak", "Pose Model Profesional", "Berdiri Santai", "Duduk di Tepi Kerusi", "Berjalan Perlahan", "Bersandar di Dinding", "Pusingan Separuh Badan"];
const vibeOptions = [ "Rawak", "Studio", "Bilik Tidur", "Bilik Mandi / Meja Solek", "Ruang Tamu", "Dapur / Ruang Makan", "Ruang Kerja / Belajar", "Ruang Masuk / Dobi", "Bandar Bersih", "Estetika Kedai Kopi", "Malam Bandar", "Pantai Tropika", "Apartmen Mewah", "Taman Bunga", "Bangunan Lama", "Perpustakaan Klasik", "Studio Minimalis", "Bar Atas Bumbung", "Taman Musim Luruh", "Jalan Tokyo", "Dalaman Scandinavia", "Hutan Ajaib", "Bandar Cyberpunk", "Gurun Bohemian", "Galeri Seni Moden", "Atas Bumbung Senja", "Kabin Gunung Bersalji", "Loteng Industri", "Makmal Futuristik", "Langit Impian Pastel", "Dalaman Istana", "Dapur Desa", "Terumbu Karang", "Jalan Paris", "Pasar Malam Asia", "Dek Kapal Pesiar", "Stesen Kereta Api Vintaj", "Gelanggang Bola Keranjang Luar", "Dapur Profesional", "Lobi Hotel Mewah", "Pentas Konsert Rock", "Taman Zen", "Teres Vila Mediterranean", "Latar Angkasa / Sci-Fi", "Ruang Kerja Moden", "Kolam Air Panas", "Bilik Takhta Fantasi", "Puncak Pencakar Langit", "Garaj Kereta Sukan", "Rumah Hijau Botani", "Gelanggang Ais", "Studio Tarian Klasik", "Pesta Pantai Malam", "Perpustakaan Kuno", "Dek Pemerhatian Gunung", "Studio Tarian Moden", "Bar Speakeasy", "Denai Hutan Hujan", "Sawah Padi Teres" ];
const styleOptions = ["Rawak", "Realisme", "Fotorealistik", "Sinematik", "Anime", "Vintaj", "Animasi 3D", "Cat Air", "Claymation"];
const compositionOptions = ["Rawak", "Peraturan Pertiga", "Garis Panduan", "Simetri", "Nisbah Keemasan", "Tengah", "Tidak Simetri"];
const lensTypeOptions = ["Rawak", "Lensa Sudut Lebar", "Lensa Telefoto", "Lensa Mata Ikan", "Lensa Makro", "Lensa 50mm", "Lensa 85mm"];
const filmSimOptions = ["Rawak", "Fujifilm Velvia", "Kodak Portra 400", "Kodachrome Sinematik", "Polaroid Vintaj", "Ilford HP5 (B&W)"];

const SESSION_KEY = 'tiktokAffiliateState';

type ImageSlot = string | { error: string } | null;

const SelectControl: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: (string|number)[];
  disabled?: boolean;
}> = ({ id, value, onChange, options, disabled }) => (
    <select 
        id={id} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const triggerDownload = (data: string, fileNameBase: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${data}`;
    link.download = `${fileNameBase}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const TiktokAffiliateView: React.FC<TiktokAffiliateViewProps> = ({ onReEdit, onCreateVideo, language, currentUser, onUserUpdate }) => {
    const [productImage, setProductImage] = useState<MultimodalContent | null>(null);
    const [faceImage, setFaceImage] = useState<MultimodalContent | null>(null);
    const [images, setImages] = useState<ImageSlot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const [gender, setGender] = useState('Female');
    const [modelFace, setModelFace] = useState('Random');
    const [lighting, setLighting] = useState('Random');
    const [camera, setCamera] = useState('Random');
    const [pose, setPose] = useState('Random');
    const [vibe, setVibe] = useState('Random');
    const [style, setStyle] = useState('Random');
    const [composition, setComposition] = useState('Random');
    const [lensType, setLensType] = useState('Random');
    const [filmSim, setFilmSim] = useState('Random');
    const [creativityLevel, setCreativityLevel] = useState(5);
    const [customPrompt, setCustomPrompt] = useState('');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'>('9:16');
    const [productImageUploadKey, setProductImageUploadKey] = useState(Date.now());
    const [faceImageUploadKey, setFaceImageUploadKey] = useState(Date.now() + 1);
    const [progress, setProgress] = useState(0);
    
    // FIX: Access the correct translation key for this view.
    const T = getTranslations(language).tiktokAffiliateView;
    const commonT = getTranslations(language).common;

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.gender) setGender(state.gender);
                if (state.modelFace) setModelFace(state.modelFace);
                if (state.lighting) setLighting(state.lighting);
                if (state.camera) setCamera(state.camera);
                if (state.pose) setPose(state.pose);
                if (state.vibe) setVibe(state.vibe);
                if (state.style) setStyle(state.style);
                if (state.composition) setComposition(state.composition);
                if (state.lensType) setLensType(state.lensType);
                if (state.filmSim) setFilmSim(state.filmSim);
                if (state.creativityLevel) setCreativityLevel(state.creativityLevel);
                if (state.customPrompt) setCustomPrompt(state.customPrompt);
                if (state.numberOfImages) setNumberOfImages(state.numberOfImages);
                if (state.aspectRatio) setAspectRatio(state.aspectRatio);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = {
                gender, modelFace, lighting, camera, pose,
                vibe, style, composition, lensType, filmSim, creativityLevel, customPrompt, numberOfImages, aspectRatio
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        gender, modelFace, lighting, camera, pose,
        vibe, style, composition, lensType, filmSim, creativityLevel, customPrompt, numberOfImages, aspectRatio
    ]);

    const generateOneImage = useCallback(async (index: number) => {
        if (!productImage) return;

        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = null;
            return newImages;
        });
    
        const prompt = getTiktokAffiliatePrompt({ gender, modelFace, lighting, camera, pose, vibe, creativityLevel, customPrompt, hasFaceImage: !!faceImage, style, composition, lensType, filmSim });
        
        const imagesToCompose: { base64: string, mimeType: string, category: string, caption: string }[] = [
            { ...productImage, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'product' }
        ];

        if (faceImage) {
            imagesToCompose.push({ ...faceImage, category: 'MEDIA_CATEGORY_SUBJECT', caption: 'model face' });
        }

        try {
            const result = await editOrComposeWithImagen({
                prompt,
                images: imagesToCompose,
                config: { aspectRatio }
            });
            const imageBase64 = result.imagePanels[0]?.generatedImages[0]?.encodedImage;

            if (!imageBase64) {
                throw new Error("The AI did not return an image. Please try a different prompt.");
            }
            
            await addHistoryItem({ type: 'Image', prompt: `TikTok Affiliate: Vibe - ${vibe}, Model - ${gender}`, result: imageBase64 });
    
            const updateResult = await incrementImageUsage(currentUser);
            if (updateResult.success && updateResult.user) {
                onUserUpdate(updateResult.user);
            }

            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = imageBase64;
                return newImages;
            });
        } catch (e) {
            const userFriendlyMessage = handleApiError(e);
            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = { error: userFriendlyMessage };
                return newImages;
            });
        }
    }, [productImage, faceImage, gender, modelFace, lighting, camera, pose, vibe, creativityLevel, customPrompt, style, composition, lensType, filmSim, aspectRatio, currentUser, onUserUpdate]);
    
    const handleGenerate = useCallback(async () => {
        if (!productImage) {
            setError("Please upload a product image first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setImages(Array(numberOfImages).fill(null));
        setSelectedImageIndex(0);

        for (let i = 0; i < numberOfImages; i++) {
            setProgress(i + 1);
            await generateOneImage(i);
        }

        setIsLoading(false);
        setProgress(0);
    }, [numberOfImages, productImage, generateOneImage]);
    
    const handleRetry = useCallback(async (index: number) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = null;
            return newImages;
        });
        await generateOneImage(index);
    }, [generateOneImage]);
    
    const handleReset = useCallback(() => {
        setProductImage(null);
        setFaceImage(null);
        setImages([]);
        setError(null);
        setGender('Female');
        setModelFace('Rawak');
        setLighting('Rawak');
        setCamera('Rawak');
        setPose('Rawak');
        setVibe('Rawak');
        setStyle('Rawak');
        setComposition('Rawak');
        setLensType('Rawak');
        setFilmSim('Rawak');
        setCreativityLevel(5);
        setCustomPrompt('');
        setNumberOfImages(1);
        setAspectRatio('9:16');
        setProductImageUploadKey(Date.now());
        setFaceImageUploadKey(Date.now() + 1);
        setProgress(0);
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const leftPanel = (
      <>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{T.title}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">{T.subtitle}</p>
          </div>
          
          <Section title={T.assetAndModel}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* FIX: Add missing 'language' prop to ImageUpload component. */}
                  <ImageUpload key={productImageUploadKey} id="tiktok-product-upload" onImageUpload={(base64, mimeType) => setProductImage({base64, mimeType})} onRemove={() => setProductImage(null)} title={T.productPhoto} description={T.productPhotoDesc} language={language}/>
                  {/* FIX: Add missing 'language' prop to ImageUpload component. */}
                  <ImageUpload key={faceImageUploadKey} id="tiktok-face-upload" onImageUpload={(base64, mimeType) => setFaceImage({base64, mimeType})} onRemove={() => setFaceImage(null)} title={T.facePhoto} description={T.facePhotoDesc} language={language}/>
              </div>
          </Section>

          <Section title={T.customPrompt}>
              <textarea id="custom-prompt-model" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder={T.customPromptPlaceholder} rows={3} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{T.customPromptHelp}</p>
          </Section>
          
          <Section title={T.creativeDirection}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={`block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 transition-colors ${!!faceImage ? 'text-gray-400 dark:text-gray-500' : ''}`}>{T.gender}</label>
                    <div className="grid grid-cols-2 gap-3">
                        <CreativeButton label={T.female} isSelected={gender === 'Female'} onClick={() => setGender('Female')} icon={UserIcon} disabled={!!faceImage} />
                        <CreativeButton label={T.male} isSelected={gender === 'Male'} onClick={() => setGender('Male')} icon={UserIcon} disabled={!!faceImage} />
                    </div>
                </div>
                <div>
                    <label htmlFor="model-face-select" className={`block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 transition-colors ${!!faceImage ? 'text-gray-400 dark:text-gray-500' : ''}`}>{T.modelFace}</label>
                    <SelectControl id="model-face-select" value={modelFace} onChange={setModelFace} options={modelFaceOptions} disabled={!!faceImage} />
                </div>
                <div><label htmlFor="style-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.artisticStyle}</label><SelectControl id="style-select" value={style} onChange={setStyle} options={styleOptions} /></div>
                <div><label htmlFor="lighting-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lighting}</label><SelectControl id="lighting-select" value={lighting} onChange={setLighting} options={lightingOptions} /></div>
                <div><label htmlFor="camera-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.cameraShot}</label><SelectControl id="camera-select" value={camera} onChange={setCamera} options={cameraOptions} /></div>
                <div><label htmlFor="pose-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.bodyPose}</label><SelectControl id="pose-select" value={pose} onChange={setPose} options={poseOptions} /></div>
                <div><label htmlFor="vibe-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.vibe}</label><SelectControl id="vibe-select" value={vibe} onChange={setVibe} options={vibeOptions} /></div>
                <div><label htmlFor="composition-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.composition}</label><SelectControl id="composition-select" value={composition} onChange={setComposition} options={compositionOptions} /></div>
                <div><label htmlFor="lens-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.lensType}</label><SelectControl id="lens-select" value={lensType} onChange={setLensType} options={lensTypeOptions} /></div>
                <div><label htmlFor="film-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.filmSim}</label><SelectControl id="film-select" value={filmSim} onChange={setFilmSim} options={filmSimOptions} /></div>
            </div>
          </Section>
          
          <Section title={T.aiSettings}>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label htmlFor="creativity-slider" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{`${T.creativityLevel} (${creativityLevel})`}</label>
                    <input id="creativity-slider" type="range" min="0" max="10" step="1" value={creativityLevel} onChange={(e) => setCreativityLevel(Number(e.target.value))} className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="num-images-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.numberOfImages}</label>
                        <SelectControl id="num-images-select" value={String(numberOfImages)} onChange={(val) => setNumberOfImages(Number(val))} options={[1, 2, 3, 4, 5]} />
                    </div>
                    <div>
                        <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{T.aspectRatio}</label>
                        <select id="aspect-ratio-select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-800 dark:text-neutral-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition">
                            <option value="9:16">Portrait (9:16)</option>
                            <option value="1:1">Square (1:1)</option>
                            <option value="16:9">Landscape (16:9)</option>
                            <option value="3:4">Portrait (3:4)</option>
                            <option value="4:3">Landscape (4:3)</option>
                        </select>
                    </div>
                </div>
            </div>
          </Section>

           <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        {isLoading ? <Spinner /> : T.generateButton}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex-shrink-0 mt-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        {T.resetButton}
                    </button>
                </div>
                {error && !isLoading && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
          </div>
      </>
    );

    const ActionButtons: React.FC<{ imageBase64: string; mimeType: string }> = ({ imageBase64, mimeType }) => (
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => onReEdit({ base64: imageBase64, mimeType })} title="Re-edit this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><WandIcon className="w-4 h-4" /></button>
            <button onClick={() => onCreateVideo({ prompt: getTiktokAffiliatePrompt({ gender, modelFace, lighting, camera, pose, vibe, creativityLevel, customPrompt, style, composition, lensType, filmSim, hasFaceImage: !!faceImage }), image: { base64: imageBase64, mimeType } })} title="Create Video from this image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><VideoIcon className="w-4 h-4" /></button>
            <button onClick={() => triggerDownload(imageBase64, 'monoklix-model-photo')} title="Download Image" className="flex items-center justify-center w-8 h-8 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"><DownloadIcon className="w-4 h-4" /></button>
        </div>
    );
    
    const rightPanel = (
      <>
          {images.length > 0 ? (
               <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                <div className="flex-1 flex items-center justify-center min-h-0 w-full relative group">
                    {(() => {
                        const selectedImage = images[selectedImageIndex];
                        if (typeof selectedImage === 'string') {
                            return (
                                <>
                                    <img src={`data:image/png;base64,${selectedImage}`} alt={`Generated image ${selectedImageIndex + 1}`} className="rounded-md max-h-full max-w-full object-contain" />
                                    <ActionButtons imageBase64={selectedImage} mimeType="image/png" />
                                </>
                            );
                        } else if (selectedImage && typeof selectedImage === 'object') {
                            return (
                                <div className="text-center text-red-500 dark:text-red-400 p-4">
                                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-4" />
                                    <p className="font-semibold">Generation Failed</p>
                                    <p className="text-sm mt-2 max-w-md mx-auto">{selectedImage.error}</p>
                                    <button
                                        onClick={() => handleRetry(selectedImageIndex)}
                                        className="mt-6 flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        <RefreshCwIcon className="w-4 h-4" />
                                        Try Again
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Spinner />
                                {isLoading && numberOfImages > 1 && (
                                    <p className="text-sm text-neutral-500">
                                        {`${commonT.generating} (${progress}/${numberOfImages})`}
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {images.length > 1 && (
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div className="flex gap-2 overflow-x-auto p-2">
                      {images.map((img, index) => (
                        <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 ${selectedImageIndex === index ? 'ring-4 ring-primary-500' : 'ring-2 ring-transparent hover:ring-primary-300'}`}>
                           {typeof img === 'string' ? (
                                <img src={`data:image/png;base64,${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                            ) : img && typeof img === 'object' ? (
                                <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                            ) : (
                                <Spinner />
                            )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Spinner />
                    <p className="text-sm text-neutral-500">
                        {`${commonT.generating}${numberOfImages > 1 ? ` (1/${numberOfImages})` : ''}`}
                    </p>
                </div>
           ) : (
              <div className="text-center text-neutral-500 dark:text-neutral-600"><TikTokIcon className="w-16 h-16 mx-auto" /><p>{T.outputPlaceholder}</p></div>
          )}
      </>
    );

    // FIX: Pass the 'language' prop to the TwoColumnLayout component.
    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div><h2 className="text-lg font-semibold mb-2">{title}</h2>{children}</div>
);

export default TiktokAffiliateView;