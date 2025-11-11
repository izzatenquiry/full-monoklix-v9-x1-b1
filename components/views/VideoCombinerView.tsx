import React, { useState, useEffect, useRef } from 'react';
import { getHistory } from '../../services/historyService';
// FIX: Add missing Language import.
import { type HistoryItem, type Language } from '../../types';
import Spinner from '../common/Spinner';
import { FilmIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon } from '../Icons';
import TwoColumnLayout from '../common/TwoColumnLayout';

declare global {
    interface Window {
        FFmpeg: any;
        FFmpegUtil: any;
    }
}

type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

// FIX: Add language prop to component props.
const VideoCombinerView: React.FC<{ language: Language }> = ({ language }) => {
    const [allVideos, setAllVideos] = useState<HistoryItem[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
    const [isCombining, setIsCombining] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const ffmpegRef = useRef<any>(null);
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
    const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
    const loadingAttemptRef = useRef(false);

    // ✅ SIMPLE: Just wait for FFmpeg from HTML script tags
    useEffect(() => {
        const initFFmpeg = async () => {
            if (loadingAttemptRef.current || ffmpegRef.current || engineStatus !== 'idle') {
                return;
            }

            loadingAttemptRef.current = true;
            setEngineStatus('loading');
            setError(null);
            setProgressMessage('Menunggu enjin video dimuatkan...');

            try {
                // Wait for FFmpeg libraries (loaded from HTML script tags)
                let attempts = 0;
                const maxAttempts = 60; // 15 seconds
                
                while ((!window.FFmpeg || !window.FFmpegUtil) && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                    attempts++;
                    
                    if (attempts % 4 === 0) {
                        setProgressMessage(`Memuatkan pustaka... (${Math.round(attempts / 4)}s)`);
                    }
                }

                if (!window.FFmpeg || !window.FFmpegUtil) {
                    throw new Error(
                        "Pustaka pemprosesan video gagal dimuatkan. " +
                        "Sila periksa sambungan internet anda dan muat semula halaman. " +
                        "Pastikan tag skrip dalam index.html adalah betul."
                    );
                }

                console.log('✅ FFmpeg libraries detected');
                setProgressMessage('Memulakan FFmpeg...');

                // Create FFmpeg instance
                const { createFFmpeg } = window.FFmpeg;
                const ffmpeg = createFFmpeg({
                    log: true,
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js',
                });

                // Enhanced logger
                ffmpeg.setLogger(({ type, message }: { type: string; message: string }) => {
                    console.log(`[FFmpeg ${type}]`, message);
                    if (isCombining && message.includes('time=')) {
                        const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2})/);
                        if (timeMatch) {
                            setProgressMessage(`Memproses: ${timeMatch[1]}`);
                        }
                    }
                });

                setProgressMessage('Memuatkan teras FFmpeg...');
                await ffmpeg.load();

                ffmpegRef.current = ffmpeg;
                setEngineStatus('ready');
                setProgressMessage('');
                console.log('✅ FFmpeg ready');

            } catch (err) {
                console.error('❌ Ralat init FFmpeg:', err);
                const errorMsg = err instanceof Error ? err.message : 'Gagal memulakan enjin video';
                setError(errorMsg);
                setEngineStatus('error');
                setProgressMessage('');
            } finally {
                loadingAttemptRef.current = false;
            }
        };

        initFFmpeg();
    }, [engineStatus, isCombining]);

    // Fetch videos
    useEffect(() => {
        const fetchVideos = async () => {
            const history = await getHistory();
            const videoItems = history.filter(item => item.type === 'Video');
            setAllVideos(videoItems);

            const newUrls = new Map<string, string>();
            videoItems.forEach(item => {
                if (item.result instanceof Blob) {
                    newUrls.set(item.id, URL.createObjectURL(item.result));
                }
            });
            setBlobUrls(newUrls);
        };
        fetchVideos();

        return () => {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Cleanup output
    useEffect(() => {
        return () => {
            if (outputUrl) URL.revokeObjectURL(outputUrl);
        };
    }, [outputUrl]);

    const toggleVideoSelection = (id: string) => {
        setSelectedVideos(prev => 
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const handleCombine = async () => {
        if (selectedVideos.length < 2) {
            setError("Sila pilih sekurang-kurangnya 2 video untuk digabungkan.");
            return;
        }

        if (engineStatus !== 'ready' || !ffmpegRef.current) {
            setError("Enjin video belum sedia. Sila tunggu atau muat semula.");
            return;
        }

        setIsCombining(true);
        setError(null);
        setProgressMessage('Menyediakan video...');
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(null);

        const tempFiles: string[] = [];

        try {
            const ffmpeg = ffmpegRef.current;
            const selectedItems = allVideos.filter(v => selectedVideos.includes(v.id));
            
            let fileList = '';

            // Write videos to virtual filesystem
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                if (!(item.result instanceof Blob)) {
                    throw new Error(`Video ${i + 1} tidak sah`);
                }

                const fileName = `input${i}.mp4`;
                tempFiles.push(fileName);
                
                setProgressMessage(`Memuatkan video ${i + 1}/${selectedItems.length}...`);
                
                const videoData = await window.FFmpegUtil.fetchFile(item.result);
                ffmpeg.FS('writeFile', fileName, videoData);
                fileList += `file '${fileName}'\n`;
            }

            tempFiles.push('filelist.txt', 'output.mp4');
            ffmpeg.FS('writeFile', 'filelist.txt', fileList);

            setProgressMessage('Menggabungkan video... Ini mungkin mengambil sedikit masa.');
            console.log('🎬 Memulakan penggabungan video...');

            // Combine with re-encoding for better compatibility
            await ffmpeg.run(
                '-f', 'concat',
                '-safe', '0',
                '-i', 'filelist.txt',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '192k',
                'output.mp4'
            );

            console.log('✅ Penggabungan selesai');
            setProgressMessage('Menyelesaikan...');

            const data = ffmpeg.FS('readFile', 'output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            setOutputUrl(url);

        } catch (err) {
            console.error('❌ Ralat penggabungan:', err);
            const errorMsg = err instanceof Error ? err.message : 'Operasi gabungan gagal';
            setError(errorMsg);
        } finally {
            // Clean up virtual files
            if (ffmpegRef.current) {
                for (const file of tempFiles) {
                    try { ffmpegRef.current.FS('unlink', file); } catch (e) {}
                }
            }
            setIsCombining(false);
            setProgressMessage('');
        }
    };
    
    const handleReset = () => {
        setSelectedVideos([]);
        setOutputUrl(null);
        setError(null);
        setProgressMessage('');
    };

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Penggabung Video</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Gabungkan beberapa klip dari galeri anda menjadi satu video.</p>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Pilih Video dari Galeri Anda</h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-neutral-100 dark:bg-neutral-800/50 p-3 rounded-lg">
                    {allVideos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {allVideos.map(video => {
                                const isSelected = selectedVideos.includes(video.id);
                                const url = blobUrls.get(video.id);
                                return (
                                    <div key={video.id} className="relative aspect-square cursor-pointer" onClick={() => toggleVideoSelection(video.id)}>
                                        {url ? <video src={url} className="w-full h-full object-cover rounded-md bg-black" /> : <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary-500/50 flex items-center justify-center rounded-md ring-4 ring-primary-500">
                                                <CheckCircleIcon className="w-8 h-8 text-white"/>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-neutral-500">Tiada video ditemui dalam galeri anda.</p>
                    )}
                </div>
            </div>

            <div className="pt-4 mt-auto flex flex-col gap-4">
                 {engineStatus === 'loading' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-md">
                        <Spinner />
                        <p className="text-sm text-blue-800 dark:text-blue-300">{progressMessage || 'Memuatkan enjin video...'}</p>
                    </div>
                )}
                 {engineStatus === 'error' && (
                    <div className="flex items-start gap-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-md">
                        <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800 dark:text-red-300">
                            <p className="font-semibold">Ralat Pustaka Video</p>
                            <p className="text-xs">{error}</p>
                        </div>
                    </div>
                )}
                 <div className="flex gap-4">
                    <button onClick={handleCombine} disabled={isCombining || selectedVideos.length < 2 || engineStatus !== 'ready'} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isCombining ? <Spinner/> : 'Gabungkan Video'}
                    </button>
                    <button onClick={handleReset} disabled={isCombining} className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                        Set Semula
                    </button>
                </div>
            </div>
        </>
    );

    const rightPanel = (
        <>
            {isCombining ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Spinner />
                    <p className="text-neutral-500 dark:text-neutral-400">{progressMessage || 'Memproses...'}</p>
                </div>
            ) : error ? (
                <div className="text-center p-4 text-red-500 dark:text-red-400">
                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-2"/>
                    <p className="font-semibold">Oh tidak!</p>
                    <p className="text-sm">{error}</p>
                </div>
            ) : outputUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <video src={outputUrl} controls autoPlay className="max-w-full max-h-[80%] rounded-md"/>
                    <a href={outputUrl} download={`monoklix-combined-${Date.now()}.mp4`} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors">
                        <DownloadIcon className="w-4 h-4"/> Muat Turun Video Gabungan
                    </a>
                </div>
            ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-600">
                    <FilmIcon className="w-16 h-16 mx-auto" />
                    <p>Video yang digabungkan akan muncul di sini.</p>
                </div>
            )}
        </>
    );
    
    // FIX: Pass the 'language' prop to the TwoColumnLayout component.
    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};

// FIX: Change to named export to match the import in AiVideoSuiteView
export { VideoCombinerView };