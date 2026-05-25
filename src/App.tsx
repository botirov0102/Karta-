import { useState, useEffect } from 'react';
import { CardState, BackState, Suit, Rank, SUITS_INFO, RANKS_INFO, generateInitialDeck } from './types';
import { PlayingCardView } from './components/PlayingCardView';
import { PlayingCardBackView } from './components/PlayingCardBackView';
import { CardEditorModal } from './components/CardEditorModal';
import { generateFrontDocx, generateBackDocx } from './docxGenerator';
import { generateFrontPdf, generateBackPdf } from './pdfGenerator';
import { 
  Layers, 
  Download, 
  HelpCircle, 
  Sparkles, 
  Undo,
  CheckCircle, 
  Grid3X3, 
  FileText, 
  Image as ImageIcon,
  Heart,
  Info,
  InfoIcon,
  Check,
  Flame,
  Printer
} from 'lucide-react';

const LOCAL_STORAGE_DECK_KEY = 'karta_maker_deck_v1';
const LOCAL_STORAGE_BACK_KEY = 'karta_maker_back_v1';

// Helper to reliably construct browser-safe base64 SVG data URLs without URL parsing/escaping issues
const buildSvgPreset = (fillColor: string, accentColor: string, shapesXml: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${fillColor}"/>${shapesXml}</svg>`;
  const base64 = btoa(encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return `data:image/svg+xml;base64,${base64}`;
};

// Preset back themes if the user wants beautiful pre-made cards
const BACK_PRESETS = [
  {
    nameUz: "Royal Emerald",
    color: "#064e3b",
    imageSrc: buildSvgPreset("#064e3b", "#fbbf24", `<circle cx="50" cy="50" r="40" fill="none" stroke="#fbbf24" stroke-width="2"/><path d="M50 10 L50 90 M10 50 L90 50" stroke="#fbbf24" stroke-width="1"/><polygon points="50,30 70,50 50,70 30,50" fill="#fbbf24" opacity="0.3"/>`)
  },
  {
    nameUz: "Crimson Floral",
    color: "#881337",
    imageSrc: buildSvgPreset("#881337", "#fef08a", `<path d="M30,30 Q50,0 70,30 Q100,50 70,70 Q50,100 30,70 Q0,50 30,30 Z" fill="none" stroke="#fef08a" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="#fef08a"/>`)
  },
  {
    nameUz: "Midnight Hex",
    color: "#0f172a",
    imageSrc: buildSvgPreset("#0f172a", "#38bdf8", `<path d="M50,15 L80,32 L80,68 L50,85 L20,68 L20,32 Z" fill="none" stroke="#38bdf8" stroke-width="2"/><path d="M50,30 L67,40 L67,60 L50,70 L33,60 L33,40 Z" fill="none" stroke="#3a82f6" stroke-width="1"/>`)
  },
  {
    nameUz: "Sapphire Star",
    color: "#1e3a8a",
    imageSrc: buildSvgPreset("#1e3a8a", "#60a5fa", `<polygon points="50,15 63,40 90,40 68,55 77,82 50,65 23,82 32,55 10,40 37,40" fill="none" stroke="#60a5fa" stroke-width="2"/>`)
  }
];

export default function App() {
  const [deck, setDeck] = useState<CardState[]>([]);
  const [back, setBack] = useState<BackState>({
    imageSrc: null,
    zoom: 100,
    xOffset: 0,
    yOffset: 0,
    fit: 'cover'
  });

  // Mobile navigation tabs to show cards grid or controls
  const [mobileTab, setMobileTab] = useState<'cards' | 'sidebar'>('cards');

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  // Filters for Front Deck
  const [activeSuitFilter, setActiveSuitFilter] = useState<Suit | 'ALL'>('ALL');
  // Active render workspace mode ('standard' grid list or 'print' precise A4 sheets)
  const [viewMode, setViewMode] = useState<'standard' | 'print'>('standard');
  
  // Global setting: whether to show corner value indicators/symbols on card fronts (2ta chetidagi belgilar)
  const [showCornerIndicators, setShowCornerIndicators] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('karta_maker_show_indicators');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const saveIndicatorsToLocalStorage = (val: boolean) => {
    setShowCornerIndicators(val);
    localStorage.setItem('karta_maker_show_indicators', JSON.stringify(val));
  };
  
  // Editor modal bindings
  const [editingCard, setEditingCard] = useState<CardState | null>(null);
  const [editingBack, setEditingBack] = useState<BackState | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorIsBack, setEditorIsBack] = useState(false);

  // Exporter Loading progress
  const [docxTask, setDocxTask] = useState<{
    active: boolean;
    current: number;
    total: number;
    title: string;
  } | null>(null);

  // 1. Initial Deck generator and LocalStorage loader
  useEffect(() => {
    try {
      const savedDeck = localStorage.getItem(LOCAL_STORAGE_DECK_KEY);
      const savedBack = localStorage.getItem(LOCAL_STORAGE_BACK_KEY);

      if (savedDeck) {
        setDeck(JSON.parse(savedDeck));
      } else {
        setDeck(generateInitialDeck());
      }

      if (savedBack) {
        setBack(JSON.parse(savedBack));
      }
    } catch (e) {
      console.error("Local storage ma'lumotlarini yuklashda xatolik:", e);
      setDeck(generateInitialDeck());
    }
  }, []);

  // Save changes to LocalStorage
  const saveDeckToLocalStorage = (newDeck: CardState[]) => {
    setDeck(newDeck);
    localStorage.setItem(LOCAL_STORAGE_DECK_KEY, JSON.stringify(newDeck));
  };

  const saveBackToLocalStorage = (newBack: BackState) => {
    setBack(newBack);
    localStorage.setItem(LOCAL_STORAGE_BACK_KEY, JSON.stringify(newBack));
  };

  // Reset entire deck to default placeholders
  const handleResetEntireDeck = () => {
    if (window.confirm("Rostdan ham barcha yuklangan rasmlarni o'chirib, dastlabki holatga qaytarmoqchimisiz?")) {
      const cleanDeck = generateInitialDeck();
      const cleanBack: BackState = {
        imageSrc: null,
        zoom: 100,
        xOffset: 0,
        yOffset: 0,
        fit: 'cover'
      };
      saveDeckToLocalStorage(cleanDeck);
      saveBackToLocalStorage(cleanBack);
    }
  };

  // 2. Handle card saved from editor modal
  const handleSaveCard = (updatedCard: CardState, applyToAll: boolean) => {
    let newDeck = [...deck];
    if (applyToAll) {
      newDeck = deck.map(c => {
        // Copy the rasm and offset settings but keep the native suit & rank identifiers!
        return {
          ...c,
          imageSrc: updatedCard.imageSrc,
          zoom: updatedCard.zoom,
          xOffset: updatedCard.xOffset,
          yOffset: updatedCard.yOffset,
          fit: updatedCard.fit
        };
      });
    } else {
      newDeck = deck.map(c => c.id === updatedCard.id ? updatedCard : c);
    }
    saveDeckToLocalStorage(newDeck);
  };

  const handleSaveBack = (updatedBack: BackState) => {
    saveBackToLocalStorage(updatedBack);
  };

  // Trigger editing front card
  const handleEditCardClick = (card: CardState) => {
    setEditingCard(card);
    setEditingBack(null);
    setEditorIsBack(false);
    setIsEditorOpen(true);
  };

  // Trigger editing card back
  const handleEditBackClick = () => {
    setEditingBack(back);
    setEditingCard(null);
    setEditorIsBack(true);
    setIsEditorOpen(true);
  };

  // Apply a presets directly to back cover
  const handleApplyBackPreset = (preset: typeof BACK_PRESETS[0]) => {
    const updatedBack: BackState = {
      imageSrc: preset.imageSrc,
      zoom: 100,
      xOffset: 0,
      yOffset: 0,
      fit: 'cover'
    };
    saveBackToLocalStorage(updatedBack);
  };

  // 3. Export Front Word Document (.docx)
  const handleDownloadFrontDocx = async () => {
    setDocxTask({
      active: true,
      current: 0,
      total: deck.length,
      title: "oldi.docx hujjati tayyorlanmoqda"
    });

    try {
      const blob = await generateFrontDocx(deck, (current, total) => {
        setDocxTask(prev => prev ? { ...prev, current, total } : null);
      });

      // Browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oldi.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Hujjatni generatsiya qilishda xatolik yuz berdi.");
    } finally {
      setDocxTask(null);
    }
  };

  // Export Back Word Document (.docx)
  const handleDownloadBackDocx = async () => {
    setDocxTask({
      active: true,
      current: 0,
      total: 4,
      title: "orqa.docx hujjati tayyorlanmoqda"
    });

    try {
      const blob = await generateBackDocx(back, (current, total) => {
        setDocxTask(prev => prev ? { ...prev, current, total } : null);
      });

      // Browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orqa.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Hujjatni generatsiya qilishda xatolik yuz berdi.");
    } finally {
      setDocxTask(null);
    }
  };

  // 4. Export Front PDF Document (.pdf) - Perfect 3x3 A4 Sheets Layout
  const handleDownloadFrontPdf = async () => {
    setDocxTask({
      active: true,
      current: 0,
      total: deck.length,
      title: "oldi.pdf hujjati tayyorlanmoqda (A4 3x3)"
    });

    try {
      const blob = await generateFrontPdf(deck, showCornerIndicators, (current, total) => {
        setDocxTask(prev => prev ? { ...prev, current, total } : null);
      });

      // Browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'oldi_tarafi_3x3_8.5x5.5.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF generatsiya qilishda xatolik yuz berdi.");
    } finally {
      setDocxTask(null);
    }
  };

  // Export Back PDF Document (.pdf) - Perfect 3x3 A4 Sheets Layout
  const handleDownloadBackPdf = async () => {
    setDocxTask({
      active: true,
      current: 0,
      total: 4,
      title: "orqa.pdf hujjati tayyorlanmoqda (A4 3x3)"
    });

    try {
      const blob = await generateBackPdf(back, (current, total) => {
        setDocxTask(prev => prev ? { ...prev, current, total } : null);
      });

      // Browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orqa_tarafi_3x3_8.5x5.5.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF generatsiya qilishda xatolik yuz berdi.");
    } finally {
      setDocxTask(null);
    }
  };

  // Direct Browser Printer Trigger
  const handleDirectPrint = () => {
    window.print();
  };

  // Helpers for stats and counts
  const countCustomizedFronts = deck.filter(c => c.imageSrc !== null).length;
  const filteredDeck = activeSuitFilter === 'ALL' ? deck : deck.filter(c => c.suit === activeSuitFilter);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 antialiased font-sans flex flex-col pb-12">
      
      {/* PROFESSIONAL POLISH TOP BAR HEADER */}
      <header className="bg-slate-900/90 backdrop-blur-md text-white py-4 px-6 flex flex-col md:flex-row justify-between items-center shadow-lg shrink-0 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black tracking-tighter text-indigo-400 lowercase">karta<span className="text-white">.uz</span></span>
          <span className="ml-2.5 opacity-60 text-xs hidden sm:inline font-mono border-l border-slate-700 pl-2.5">36 talik o'yin kartalari ustaxonasi</span>
        </div>
        <div className="flex items-center gap-4 text-xs mt-2 md:mt-0 font-medium text-slate-400">
          <span className="bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono text-[10px]">O'LCHAM: 8.5 x 5.5 SM</span>
          <span className="text-emerald-400 flex items-center gap-1.5 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Saqlangan (Local)
          </span>
        </div>
      </header>

      {/* CORE CONTROL SHEET */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1">

        {/* MOBILE CONTROL TABS (ONLY VISIBLE ON MOBILE) */}
        <div className="lg:hidden mb-5 bg-slate-800/80 p-1.5 rounded-2xl flex gap-1.5 border border-slate-700/50 shadow-lg p-1">
          <button
            onClick={() => setMobileTab('cards')}
            className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'cards'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <span>🃏 Kartalar ({filteredDeck.length})</span>
          </button>
          
          <button
            onClick={() => setMobileTab('sidebar')}
            className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'sidebar'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-slate-400 hover:text-slate-300"
            }`}
          >
            <span>🔧 Sozlamalar & PDF</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR PANEL: SELECTION & CONTROLS */}
          <aside className={`lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex-col gap-5 ${
            mobileTab === 'sidebar' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* BO'LIMNI TANLASH */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Loyihalash bo'limi</span>
              </h3>
              <div className="flex flex-col gap-2">
                {/* Front Side Tab */}
                <button
                  onClick={() => setActiveTab('front')}
                  className={`tab-btn w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-black tracking-wider transition-all uppercase cursor-pointer border ${
                    activeTab === 'front'
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🃏</span>
                    <span>Oldi tarafi (36 karta)</span>
                  </div>
                  {countCustomizedFronts > 0 ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${activeTab === 'front' ? 'bg-indigo-800 text-white border border-indigo-400/20' : 'bg-indigo-950 text-indigo-300'}`}>
                      {countCustomizedFronts}/36
                    </span>
                  ) : (
                    <span className="text-[9px] opacity-60">Andoza</span>
                  )}
                </button>

                {/* Back Side Tab */}
                <button
                  onClick={() => setActiveTab('back')}
                  className={`tab-btn w-full flex items-center justify-between p-3.5 rounded-xl text-xs font-black tracking-wider transition-all uppercase cursor-pointer border ${
                    activeTab === 'back'
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 border-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🎨</span>
                    <span>Orqa tarafi (Yagona)</span>
                  </div>
                  {back.imageSrc ? (
                    <span className="inline-block px-2 py-0.5 text-[9px] bg-emerald-500 text-white rounded font-bold uppercase">Rasm</span>
                  ) : (
                    <span className="text-[9px] opacity-60 font-medium">Andoza</span>
                  )}
                </button>
              </div>
            </div>

            {/* INFO BOX */}
            <div className="info-box border-l-4 border-indigo-500 bg-slate-800/40 p-4 text-[12px] text-slate-300 rounded-r-xl space-y-1.5 border border-slate-800">
              <p className="font-extrabold text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-400" />
                <span>Qolip va Parametrlar (A4)</span>
              </p>
              <div>• Karta o'lchami: <strong className="text-white">8.5 sm × 5.5 sm</strong></div>
              <div>• Joylashish: <strong className="text-white">Har bir A4 varaqda 9 tadan (3×3)</strong></div>
              <div>• Qirqish tirqishi: <strong className="text-white">10 mm oraliq masofa</strong></div>
              <div>• Jami: <strong className="text-white">36 karta (4 sahifa A4)</strong></div>
            </div>

            {/* VIEW MODE SWITCHER (NATIVE PREVIEW CONTROLS) */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ko'rinish boshqaruvi:</p>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('standard')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'standard'
                      ? 'bg-slate-800 text-white shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🗂️ Oddiy Grid
                </button>
                <button
                  onClick={() => setViewMode('print')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'print'
                      ? 'bg-slate-800 text-white shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🖨️ A4 Varaqlar
                </button>
              </div>
            </div>

            {/* CORNER INDICATORS GLOBAL TOGGLE */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Karta burchak belgilari:</span>
              <div 
                onClick={() => saveIndicatorsToLocalStorage(!showCornerIndicators)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                  showCornerIndicators 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                    : "bg-slate-800/40 border-slate-800 text-slate-400"
                }`}
              >
                <div className="pr-2">
                  <span className="text-xs font-bold block">Qiymat va Guruh belgisi</span>
                  <span className="text-[10px] opacity-75 block mt-0.5 leading-tight">
                    {showCornerIndicators ? "Karta burchaklarida belgilar chiziladi" : "O'chirilgan: Belgisiz toza rasm bo'ladi"}
                  </span>
                </div>
                <div className={`w-10 h-6 shrink-0 flex items-center rounded-full p-1 transition-all ${showCornerIndicators ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                </div>
              </div>
            </div>

            {/* PDF DOWNLOAD CONTROLS (TAVSIYA ETILADI) */}
            <div className="space-y-3 border-t border-slate-800 pt-3">
              <p className="text-xs font-extrabold text-[#F43F5E] uppercase tracking-wider flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400">PDF FORMATDA CHOP ETISH 🖨️</span>
              </p>
              
              <div className="flex flex-col gap-2">
                {/* Print Front PDF */}
                <button
                  onClick={handleDownloadFrontPdf}
                  disabled={docxTask?.active}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black active:scale-[0.97] transition-all px-4 py-3.5 rounded-xl text-[12px] flex justify-between items-center shadow-md shadow-rose-600/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-rose-200" />
                    <span>Karta oldi (A4, 3×3 pdf)</span>
                  </span>
                  <span className="bg-rose-800 text-white text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">↓ Yuklash</span>
                </button>

                {/* Print Back PDF */}
                <button
                  onClick={handleDownloadBackPdf}
                  disabled={docxTask?.active}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-white font-black active:scale-[0.97] transition-all px-4 py-3.5 rounded-xl text-[12px] flex justify-between items-center border border-slate-700 shadow-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-slate-400" />
                    <span>Karta orqasi (A4, 3×3 pdf)</span>
                  </span>
                  <span className="bg-slate-705 text-slate-300 text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">↓ Yuklash</span>
                </button>
              </div>
            </div>

            {/* DIRECT PRINT OPTION */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <button
                onClick={handleDirectPrint}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white py-3.5 px-4 rounded-xl text-center font-bold text-xs tracking-wider shadow-md transition-all uppercase cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Qog'ozga to'g'ridan-to'g'ri chop etish</span>
              </button>
            </div>

            {/* PROGRESS FEEDBACK */}
            {docxTask && (
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 animate-pulse space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-505 animate-ping" />
                    {docxTask.title}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {docxTask.current} / {docxTask.total}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(docxTask.current / docxTask.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* RESET / ACTIONS UNIT */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={handleResetEntireDeck}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 text-slate-400 transition-all text-xs font-semibold"
                title="Barcha ma'lumotlarni o'chirish"
              >
                <Undo className="h-3.5 w-3.5" />
                <span>Barcha rasmlarni tozalash</span>
              </button>
            </div>

          </aside>

          {/* RIGHT WORKSPACE BLOCK: THE GRID AND SELECTION PREVIEW */}
          <section className={`lg:col-span-8 bg-slate-950 border border-slate-800 p-4 sm:p-6 rounded-2xl flex flex-col gap-6 ${
            mobileTab === 'cards' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* WORKSPACE INDICATOR HEADER */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="font-extrabold text-slate-200 flex items-center gap-2 text-sm sm:text-base">
                <span>Varaq ko'rinishi:</span>
                <span className="inline-block px-2.5 py-0.5 bg-indigo-500/10 text-indigo-405 text-indigo-300 border border-indigo-500/25 rounded-full text-[11px] font-black uppercase tracking-wider">
                  {activeTab === 'front' ? `${deck.length} Oldi Qismlar` : `Universal Orqa Dizayn`}
                </span>
                {viewMode === 'print' && (
                  <span className="inline-block px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    A4 3x3 Ko'rik
                  </span>
                )}
              </span>
              <span className="text-[11px] font-sans font-semibold text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none">
                <Printer className="h-3.5 w-3.5 text-indigo-400" /> A4 formatiga 100% moslashtirilgan
              </span>
            </div>

            {/* PREVIEW BLOCK UNDER DIFFERENT VIEW MODES */}
            {viewMode === 'standard' ? (
              <>
                {/* IF FRONT CARD VIEW ACTIVE */}
                {activeTab === 'front' && (
                  <div className="space-y-6">
                    
                    {/* ACTIVE SUIT PICKER ACTIONS AND FILTERS */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Guruh bo'yicha saralash</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setActiveSuitFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                            activeSuitFilter === 'ALL'
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-sm font-black"
                              : "bg-slate-800/80 border-slate-800 hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <Layers className="h-3 w-3" /> Barchasi (36)
                        </button>
                        {(['H', 'D', 'C', 'S'] as Suit[]).map(st => {
                          const suitInfo = SUITS_INFO[st];
                          const currentCountInSuit = deck.filter(c => c.suit === st && c.imageSrc !== null).length;
                          return (
                            <button
                              key={st}
                              onClick={() => setActiveSuitFilter(st)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                                activeSuitFilter === st
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-sm font-black"
                                  : "bg-slate-800/80 border-slate-800 hover:bg-slate-800 text-slate-305 text-slate-300"
                              }`}
                            >
                              <span className={suitInfo.colorClass}>{suitInfo.char}</span>
                              <span>{suitInfo.nameUz}</span>
                              <span className={`px-1 rounded text-[10px] font-mono font-black ${
                                currentCountInSuit > 0 
                                  ? "bg-emerald-950 border border-emerald-500/20 text-emerald-405 text-emerald-300"
                                  : "bg-slate-950 text-slate-500"
                              }`}>
                                {currentCountInSuit}/9
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* THE 36 PLAIN CARD VISUAL GRID */}
                    <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                            <Grid3X3 className="h-4 w-4 text-indigo-400" />
                            <span>Karta Oldi Qismlari (Grid)</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tasvir joylash yoki o'zgartirish uchun karta ustiga bosing.</p>
                        </div>

                        <div className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded">
                          Rasm borlar: {deck.filter(c => c.imageSrc !== null).length} / 36 karta
                        </div>
                      </div>

                      {/* High visual card list */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                        {filteredDeck.map((cardItem) => (
                          <div key={cardItem.id} className="flex flex-col items-center bg-slate-950/60 p-2 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-950 transition-all">
                            <PlayingCardView 
                              card={cardItem}
                              onClick={() => handleEditCardClick(cardItem)}
                              showIndicators={showCornerIndicators}
                            />
                            <span className="text-xs font-bold text-slate-400 mt-2 font-mono flex items-center gap-1.5">
                              <span className={SUITS_INFO[cardItem.suit].colorClass}>{SUITS_INFO[cardItem.suit].char}</span>
                              {RANKS_INFO[cardItem.rank].char}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* IF BACK DESIGN VIEW ACTIVE */}
                {activeTab === 'back' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* ONE MASTER CHOSEN BACK SECTION */}
                    <div className="bg-slate-900 p-5 sm:p-6 rounded-xl border border-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        
                        {/* Left side standard showcase item */}
                        <div className="md:col-span-5 flex flex-col items-center">
                          <div className="text-center mb-2">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Asosiy Karta Orqa Ko'rinishi</span>
                          </div>
                          <div className="w-full max-w-[155px]">
                            <PlayingCardBackView 
                              back={back}
                              onClick={handleEditBackClick}
                              className="border border-slate-800 shadow-md rounded-xl"
                            />
                          </div>
                          <button
                            onClick={handleEditBackClick}
                            className="mt-3.5 px-3 py-1.5 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Rasmni O'zgartirish
                          </button>
                        </div>

                        {/* Right side helper presets list */}
                        <div className="md:col-span-7 space-y-4">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Universal orqa dizayn</span>
                            <h3 className="text-base font-bold text-slate-200 tracking-tight mt-1.5">Universal Karta Orqasi</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-1">
                              Siz yuklagan yagona tasvir orqa.pdf hujjati uchun avtomatik tarzda 36 ta kartaning hammasining orqa qismiga mukammal simmetriya bilan joylashtiriladi. Quyidagi tayyor andozalardan foydalanishingiz ham mumkin:
                            </p>
                          </div>

                          {/* Ready backgrounds presets picker */}
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platforma taklif qilgan andozalar:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {BACK_PRESETS.map((p, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleApplyBackPreset(p)}
                                  className="group flex items-center gap-2 p-2 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-500/5 active:scale-95 text-left rounded-lg transition-all cursor-pointer"
                                >
                                  <div 
                                    className="h-8 w-5 rounded border border-neutral-700 shadow-xs shrink-0 flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: p.color }}
                                  >
                                    <span className="text-[8px] text-white font-mono font-bold leading-none opacity-40">Back</span>
                                  </div>
                                  <div>
                                    <h5 className="text-[11.5px] font-bold text-slate-300 leading-none group-hover:text-indigo-400">{p.nameUz}</h5>
                                    <span className="text-[9px] text-slate-500 block mt-1">Classic preset</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Grid repetition demonstration */}
                    <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                      <div className="mb-3.5">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Takrorlanuvchi 36 ta karta orqasi chizmasi:</h4>
                        <p className="text-[11px] text-slate-400">Chop etilganda jami 36 ta kartaning orqasi bir xilda namoyon bo'ladi.</p>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                        {Array.from({ length: 36 }).map((_, id) => (
                          <div key={id} className="relative aspect-[5.5/8.5] border border-slate-800 rounded-md overflow-hidden bg-neutral-900 shadow-xs">
                            <div className="absolute inset-0 scale-[1.01]">
                              <PlayingCardBackView back={back} className="pointer-events-none" />
                            </div>
                            <span className="absolute bottom-1 right-1 font-mono text-[8px] bg-black/60 text-neutral-300 px-1 rounded-sm leading-none z-10 select-none">
                              {id + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </>
            ) : (
              /* MAGNIFICENT ON-SCREEN A4 SHEETS PREVIEW */
              <div className="space-y-8 animate-fade-in">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-305 text-amber-300 leading-relaxed shadow-xs flex items-start gap-2.5">
                  <span className="text-lg">💡</span>
                  <div>
                    <span className="font-extrabold uppercase block text-[10px] text-amber-400 tracking-wider mb-0.5">A4 FORMAT 3x3 SIMMETRIYA PREVIEW:</span>
                    <p>
                      Quyida unikal <strong>oldi-orqa simmetrik A4 varaq qoliplari (4 varaq)</strong> tasvirlangan. Har bir varaqda 9 tadan karta joy oladi. PDF yuklab olganingizda, aynan shu qirqish chiziqlari va o'lchamlarda 100% ideal chiqadi! Istalgan karta ustiga bosib tahrirlashingiz mumkin.
                    </p>
                  </div>
                </div>

                {/* 4 pages simulation wrapper */}
                <div className="space-y-12">
                  {Array.from({ length: 4 }).map((_, pageIdx) => {
                    const pageCards = deck.slice(pageIdx * 9, (pageIdx + 1) * 9);
                    return (
                      <div 
                        key={pageIdx} 
                        className="bg-white border border-slate-300 shadow-2xl rounded-sm mx-auto p-[11mm] relative flex flex-col justify-between" 
                        style={{ width: '100%', maxWidth: '640px', aspectRatio: '210/297' }}
                      >
                        {/* Page header specs */}
                        <div className="absolute top-2.5 left-4 text-[9px] font-mono text-slate-400 select-none">
                          karta.uz | A4 sahifa {pageIdx + 1} / 4 ({activeTab === 'front' ? "Oldi qismlari" : "Orqa dizayni"})
                        </div>
                        <div className="absolute top-2.5 right-4 text-[9px] font-mono text-slate-400 select-none">
                          Karta: 8.5 x 5.5 sm | Oraliq masofa: 1.0 sm
                        </div>

                        {/* 3x3 Card Grid matching millimetric spacing */}
                        <div className="grid grid-cols-3 grid-rows-3 gap-[10px] w-full h-full my-auto mt-4">
                          {activeTab === 'front' ? (
                            pageCards.map((cardItem) => (
                              <div 
                                key={cardItem.id} 
                                className="group/sheetitem relative aspect-[5.5/8.5] border border-slate-205 border-slate-200 hover:ring-2 hover:ring-indigo-550 rounded-lg shadow-xs overflow-hidden transition-all cursor-pointer"
                                onClick={() => handleEditCardClick(cardItem)}
                                title="Karta tasvirini tahrirlash"
                              >
                                <PlayingCardView 
                                  card={cardItem} 
                                  showIndicators={showCornerIndicators} 
                                  className="max-w-none hover:shadow-none hover:-translate-y-0" 
                                />
                                <div className="absolute bottom-1 right-1 bg-black/60 text-white font-mono text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/sheetitem:opacity-100 transition-opacity">
                                  {SUITS_INFO[cardItem.suit].char} {RANKS_INFO[cardItem.rank].char}
                                </div>
                              </div>
                            ))
                          ) : (
                            Array.from({ length: 9 }).map((_, i) => (
                              <div 
                                key={i} 
                                className="relative aspect-[5.5/8.5] border border-slate-200 hover:ring-2 hover:ring-indigo-550 rounded-lg shadow-xs overflow-hidden transition-all cursor-pointer"
                                onClick={handleEditBackClick}
                                title="Orqa dizaynni o'zgartirish"
                              >
                                <PlayingCardBackView 
                                  back={back} 
                                  className="max-w-none hover:shadow-none hover:-translate-y-0" 
                                />
                              </div>
                            ))
                          )}
                        </div>

                        {/* Bottom alignment line watermarks */}
                        <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-mono text-slate-300 pointer-events-none select-none">
                          |   karta.uz professional A4 simulyatori   |   Marginlar: Chap/O'ng 1.25cm, Tepa/Past 1.10cm   |
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PRE-PRINT ASSEMBLY MANUALS */}
            <div className="bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-black tracking-widest text-[#F43F5E] uppercase flex items-center gap-1.5 pb-2 border-b border-rose-950">
                <HelpCircle className="h-4 w-4 text-rose-500 animate-pulse" />
                <span>MUKAMMAL OLD-ORQA CHOP ETISH YO'RIQNOMASI 🖨️</span>
              </h3>

              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs text-amber-305 text-amber-300 leading-relaxed font-sans space-y-1.5 shadow-xs">
                <span className="font-extrabold block uppercase text-[11px] text-amber-400 tracking-wider">⚠️ NEGA OLD VA ORQA TARAFI TO'G'RI KELMAYAPTI?</span>
                <p>
                  Karta old va orqa qoliplari A4 qog'oziga <strong>millimetrigacha simmetrik va markazlashtirilgan holda</strong> joylashtirilgan (Chap/O'ng chekka: 12.5 mm, Tepa/Past chekka: 11.0 mm). Agar chop etganda old/orqa chetlar siljib ketsa, muammo <strong>faqatgina printer drayveri dagi auto-shkala / avto-sig'dirish sozlamalarida</strong> bo'ladi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2.5">
                  <span className="text-[11px] font-black text-slate-350 text-slate-300 uppercase tracking-wider block">1. PRINTER SOZLAMALARI (CRITICAL):</span>
                  <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside pl-0.5">
                    <li className="leading-relaxed">
                      Chop qilish oynasida masalan Adobe Acrobat yoki Google Chrome PDF print bo'limida <strong>"Haqiqiy o'lcham" (Actual Size yoki 100% Scale)</strong> sozlamasini doim yoqing.
                    </li>
                    <li className="leading-relaxed">
                      Hech qachon <strong>"Fit to page" (Varaqqa moslash)</strong> yoki <strong>"Scale to fit"</strong> parametrini yoqmang. Aks holda printer drayveri sahifani o'zgartirib, orqaga mos kelmaydigan qiladi.
                    </li>
                  </ol>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[11px] font-black text-slate-350 text-slate-300 uppercase tracking-wider block">2. IKKI TOMONLAMA CHOP (DUPLEX):</span>
                  <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside pl-0.5">
                    <li className="leading-relaxed">
                      Ikki tomonlama chop etish sozlamasida <strong>"Flip on Long Edge" (Uzun cheti bo'ylab aylantirish)</strong> parametrini tanlang.
                    </li>
                    <li className="leading-relaxed">
                      Mukammal chidamlilik uchun maxsus qalin <strong>250g - 360g zichlikdagi</strong> qog'ozdan foydalanish tavsiya etiladi.
                    </li>
                  </ol>
                </div>
              </div>
            </div>

          </section>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 mt-8 text-center text-xs text-slate-500 border-t border-slate-800 pt-6 w-full">
        <p className="flex items-center justify-center gap-1.5 font-bold text-slate-400">
          <span>karta.uz tahrirlagichi</span> • <span>Barcha huquqlar himoyalangan © {new Date().getFullYear()}</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">
          Bo'yi: 8.5 sm | Eni: 5.5 sm | 36 karta | Grid: 3x3 (4 varaq A4) | PDF format
        </p>
      </footer>

      {/* THE PRIMARY CARD EDITOR MODAL */}
      <CardEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        card={editingCard}
        back={editingBack}
        isBack={editorIsBack}
        onSaveCard={handleSaveCard}
        onSaveBack={handleSaveBack}
        showCornerIndicators={showCornerIndicators}
      />

    </div>
  );
}
