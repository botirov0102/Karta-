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
      const blob = await generateFrontPdf(deck, (current, total) => {
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
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 antialiased font-sans flex flex-col pb-12">
      
      {/* PROFESSIONAL POLISH TOP BAR HEADER */}
      <header className="bg-[#1E293B] text-white py-3 px-6 flex flex-col sm:flex-row justify-between items-center shadow-md shrink-0 border-b border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-white uppercase" style={{ letterSpacing: "-0.5px" }}>CARDPRO</span>
          <span className="ml-2.5 opacity-75 text-sm hidden sm:inline font-medium">| Professional Karta Generator</span>
        </div>
        <div className="flex items-center gap-6 text-sm mt-1 sm:mt-0 font-medium text-slate-300">
          <span>Loyiha: <strong className="text-white">Mening Kolleksiyam</strong></span>
          <span className="text-[#34D399] flex items-center gap-1.5 font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#34D399] animate-pulse inline-block" /> Saqlangan
          </span>
        </div>
      </header>

      {/* CORE CONTROL SHEET */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1">

        {/* MOBILE CONTROL TABS (ONLY VISIBLE ON MOBILE) */}
        <div className="lg:hidden mb-5 bg-slate-200 p-1 rounded-xl flex gap-1 border border-slate-300 shadow-sm">
          <button
            onClick={() => setMobileTab('cards')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'cards'
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "bg-transparent text-slate-600 hover:bg-slate-300/40"
            }`}
          >
            <span>🃏 Kartalar ({filteredDeck.length})</span>
          </button>
          
          <button
            onClick={() => setMobileTab('sidebar')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'sidebar'
                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                : "bg-transparent text-slate-600 hover:bg-slate-300/40"
            }`}
          >
            <span>🔧 Sozlamalar & Yuklash</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR PANEL: SELECTION & CONTROLS */}
          <aside className={`lg:col-span-4 bg-white rounded-xl p-5 shadow-[0_4_6px_rgba(0,0,0,0.05)] flex-col gap-6 border border-slate-200/50 h-fit ${
            mobileTab === 'sidebar' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* BO'LIMNI TANLASH */}
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#2563EB]" />
                <span>Bo'limni tanlang</span>
              </h3>
              <div className="flex flex-col gap-2">
                {/* Front Side Tab */}
                <button
                  onClick={() => setActiveTab('front')}
                  className={`tab-btn w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                    activeTab === 'front'
                      ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/15"
                      : "bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🃏</span>
                    <span>Oldi tarafi (36 karta)</span>
                  </div>
                  {countCustomizedFronts > 0 ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${activeTab === 'front' ? 'bg-blue-750 text-white border border-blue-400/20' : 'bg-blue-100 text-blue-800'}`}>
                      {countCustomizedFronts}/36
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-65">Andoza</span>
                  )}
                </button>

                {/* Back Side Tab */}
                <button
                  onClick={() => setActiveTab('back')}
                  className={`tab-btn w-full flex items-center justify-between p-3.5 rounded-lg text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                    activeTab === 'back'
                      ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/15"
                      : "bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🎨</span>
                    <span>Orqa tarafi (Universal)</span>
                  </div>
                  {back.imageSrc ? (
                    <span className="inline-block px-1.5 py-0.5 text-[9px] bg-emerald-500 text-white rounded font-bold">Faol</span>
                  ) : (
                    <span className="text-[10px] opacity-65">Standart</span>
                  )}
                </button>
              </div>
            </div>

            {/* INFO BOX */}
            <div className="info-box border-l-4 border-[#2563EB] bg-[#F8FAFC] p-4 text-[13px] text-[#475569] rounded-r-xl space-y-1">
              <p className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <InfoIcon className="h-3.5 w-3.5 text-[#2563EB]" /> O'lcham & Miqdor andozalari:
              </p>
              <div><strong>Karta o'lchami:</strong> 8.5 sm × 5.5 sm (Aniq)</div>
              <div><strong>Varaq sig'imi:</strong> Har bir A4 da 9 tadan karta (3×3)</div>
              <div><strong>Araliq masofa:</strong> Qirqish uchun 1 sm bo'sh joy</div>
              <div><strong>Jami:</strong> 36 ta karta (4 ta A4 varaq)</div>
            </div>

            {/* VIEW MODE SWITCHER (NATIVE PREVIEW CONTROLS) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ko'rinish rejimi:</p>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('standard')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'standard'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🗂️ Oddiy Grid
                </button>
                <button
                  onClick={() => setViewMode('print')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'print'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🖨️ A4 Varaqlar
                </button>
              </div>
            </div>

            {/* PDF DOWNLOAD CONTROLS (TAVSIYA ETILADI) */}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-[#E11D48] uppercase tracking-wider flex items-center gap-1 bg-rose-50/80 p-2.5 rounded-lg border border-rose-100">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                <span className="text-rose-700 font-extrabold">TAVSIYA: PREMIUM PDF YUKLASH 🖨️</span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Har qanday printerda o'lchamlar buzilmaydi! <strong>8.5 sm × 5.5 sm</strong> o'lcham va <strong>1 sm li oraliq masofada</strong>, 4 ta A4 varaqqa 3×3 qolipda mukammal joylashadi.
              </p>
              
              <div className="flex flex-col gap-2">
                {/* Print Front PDF */}
                <button
                  onClick={handleDownloadFrontPdf}
                  disabled={docxTask?.active}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold active:scale-98 transition-all px-4 py-3 rounded-xl text-[13px] flex justify-between items-center shadow-md shadow-rose-600/10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-white" />
                    <span>Karta oldi tarafi (3×3, pdf)</span>
                  </span>
                  <span className="bg-rose-700/60 text-white text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase">↓ PDF</span>
                </button>

                {/* Print Back PDF */}
                <button
                  onClick={handleDownloadBackPdf}
                  disabled={docxTask?.active}
                  className="w-full bg-slate-800 hover:bg-slate-900 border border-slate-705 text-white font-bold active:scale-98 transition-all px-4 py-3 rounded-xl text-[13px] flex justify-between items-center shadow-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-300" />
                    <span>Karta orqa tarafi (3×3, pdf)</span>
                  </span>
                  <span className="bg-slate-755 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase">↓ PDF</span>
                </button>
              </div>
            </div>

            {/* DIRECT PRINT OPTION */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">To'g'ridan-to'g'ri chop etish:</p>
              <button
                onClick={handleDirectPrint}
                className="w-full bg-[#10B981] hover:bg-[#059669] active:scale-[0.98] text-white py-3.5 px-4 rounded-xl text-center font-bold text-sm tracking-wide shadow-md transition-all uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>brauzerdan chop etish</span>
              </button>
            </div>

            {/* WORD DOCUMENTS (SOBIQ ANDOZA) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Tuzatilgan Word varianti (DOCX):</span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Word fayldagi tasvirlar yuklanish muammosi ham to'liq bartaraf qilindi (Daqiq santimetrlarda):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadFrontDocx}
                  disabled={docxTask?.active}
                  className="bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 p-2.5 rounded-lg text-xs text-slate-600 font-semibold cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <span>oldi_kabi.docx</span>
                </button>
                <button
                  onClick={handleDownloadBackDocx}
                  disabled={docxTask?.active}
                  className="bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 p-2.5 rounded-lg text-xs text-slate-600 font-semibold cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <span>orqa_kabi.docx</span>
                </button>
              </div>
            </div>

            {/* PROGRESS FEEDBACK */}
            {docxTask && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 animate-pulse space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#2563EB] font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-ping" />
                    {docxTask.title}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {docxTask.current} / {docxTask.total}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(docxTask.current / docxTask.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* RESET / ACTIONS UNIT */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleResetEntireDeck}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-slate-500 transition-all text-xs font-semibold"
                title="Barcha ma'lumotlarni o'chirish"
              >
                <Undo className="h-3.5 w-3.5" />
                <span>Barcha rasmlarni tozalash</span>
              </button>
            </div>

          </aside>

          {/* RIGHT WORKSPACE BLOCK: THE GRID AND SELECTION PREVIEW */}
          <section className={`lg:col-span-8 bg-[#E2E8F0] border-2 border-dashed border-[#CBD5E1] p-5 sm:p-6 rounded-xl flex-col gap-6 ${
            mobileTab === 'cards' ? 'flex' : 'hidden lg:flex'
          }`}>
            
            {/* WORKSPACE INDICATOR HEADER */}
            <div className="bg-white p-3.5 px-5 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="font-semibold text-[#1E293B] flex items-center gap-2 text-sm sm:text-base">
                <span>Varaq 1 / 4</span>
                <span className="stat-pill inline-block px-2 py-0.5 bg-[#DBEAFE] text-[#1E40AF] rounded-full text-[11px] font-bold">
                  {activeTab === 'front' ? `${deck.length} QIYMATLI KARTALAR` : `UNIVERSAL ORQA DIZAYN`}
                </span>
              </span>
              <span className="text-xs text-[#64748B] font-mono bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                A4 Formatda chop etishga mukammal sozlangan
              </span>
            </div>

            {/* IF FRONT CARD VIEW ACTIVE */}
            {activeTab === 'front' && (
              <div className="space-y-6">
                
                {/* ACTIVE SUIT PICKER ACTIONS AND FILTERS */}
                <div className="bg-white p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-slate-200/55 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider block">Guruh boyicha saralash</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setActiveSuitFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                        activeSuitFilter === 'ALL'
                          ? "bg-[#1E293B] border-[#1E293B] text-white shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
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
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                            activeSuitFilter === st
                              ? "bg-[#1E293B] border-[#1E293B] text-white shadow-sm"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className={suitInfo.colorClass}>{suitInfo.char}</span>
                          <span>{suitInfo.nameUz}</span>
                          <span className={`px-1 rounded text-[10px] ${
                            currentCountInSuit > 0 
                              ? "bg-amber-100 text-amber-800 font-bold"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {currentCountInSuit}/9
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* THE 36 PLAIN CARD VISUAL GRID */}
                <div className="bg-white p-5 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-slate-200/50">
                  <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                        <Grid3X3 className="h-4 w-4 text-[#2563EB]" />
                        <span>Karta Oldi Qismlari</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Rasm joylash uchun karta ustiga bosing.</p>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded">
                      Chop qilinayapti: {filteredDeck.length} / 36 karta
                    </div>
                  </div>

                  {/* High visual card list */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredDeck.map((cardItem) => (
                      <div key={cardItem.id} className="flex flex-col items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                        <PlayingCardView 
                          card={cardItem}
                          onClick={() => handleEditCardClick(cardItem)}
                        />
                        <span className="text-xs font-bold text-slate-500 mt-2 font-mono flex items-center gap-1">
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
                <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200/50">
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
                          className="border border-slate-200 shadow-md rounded-xl"
                        />
                      </div>
                      <button
                        onClick={handleEditBackClick}
                        className="mt-3.5 px-3 py-1.5 border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 text-xs font-bold rounded-lg transition-all"
                      >
                        Rasmni O'zgartirish
                      </button>
                    </div>

                    {/* Right side helper presets list */}
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Yagona orqa dizayn</span>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight mt-1.5">Universal Karta Orqasi</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          Siz yuklagan yagona rasm orqa.docx faylida avtomatik tarzda 36 ta kartaning hammasiga yagona orqa dizayn qilib joylashtiriladi. Quyidagi tayyor andozalardan ham bemalol foydalanishingiz mumkin:
                        </p>
                      </div>

                      {/* Ready backgrounds presets picker */}
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platforma taklif qilgan andozalar (Presets):</span>
                        <div className="grid grid-cols-2 gap-2">
                          {BACK_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleApplyBackPreset(p)}
                              className="group flex items-center gap-2 p-2 border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/20 active:scale-95 text-left rounded-lg transition-all"
                            >
                              <div 
                                className="h-8 w-5 rounded border border-neutral-300 shadow-xs shrink-0 flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: p.color }}
                              >
                                <span className="text-[8px] text-white font-mono font-bold leading-none opacity-45">Back</span>
                              </div>
                              <div>
                                <h5 className="text-[11px] font-bold text-slate-700 leading-none group-hover:text-[#2563EB]">{p.nameUz}</h5>
                                <span className="text-[9px] text-slate-400 block mt-0.5">Classic design</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Grid repetition demonstration */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/50">
                  <div className="mb-3.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Takrorlanuvchi 36 ta karta orqasi chizmasi:</h4>
                    <p className="text-[11px] text-slate-400">Chop etilganda jami 36 ta kartaning orqasi bir xilda namoyon bo'ladi.</p>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    {Array.from({ length: 36 }).map((_, id) => (
                      <div key={id} className="relative aspect-[5.5/8.5] border border-slate-200 rounded-md overflow-hidden bg-neutral-100 shadow-xs">
                        <div className="absolute inset-0 scale-[1.01]">
                          <PlayingCardBackView back={back} className="pointer-events-none" />
                        </div>
                        <span className="absolute bottom-0.5 right-0.5 font-mono text-[8px] bg-black/40 text-neutral-100 px-0.5 rounded-xs leading-none z-10">
                          {id + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* PRE-PRINT ASSEMBLY MANUALS */}
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/50 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <HelpCircle className="h-4 w-4 text-[#2563EB]" />
                <span>Chop etish va Yig'ish yo'riqnomasi</span>
              </h3>

              <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside pl-0.5 font-normal">
                <li className="leading-relaxed"><strong className="text-slate-900">Yuklab olish:</strong> Tayyor holatda har ikkala front va back DOCX fayllarini yuklab oling.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Printer sozlamalari:</strong> Qog'oz formatini <strong className="text-slate-900">A4 format</strong> deb belgilang hamda "Fit to page" parametrlarini <strong className="text-slate-900">o'chirib qo'ying</strong>.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Qalinlik:</strong> Sifat kafolati uchun <strong className="text-slate-900">250g - 300g zichlikdagi</strong> qalin qog'oz ishlating.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Ikki tomonlama chop etish:</strong> Agar printer qo'llab-quvvatlasa, ikki tomonlama (duplex) formatida chop eting.</li>
              </ol>
            </div>

          </section>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 mt-8 text-center text-xs text-neutral-400 border-t border-neutral-200/50 pt-6 w-full">
        <p className="flex items-center justify-center gap-1.5 font-medium text-neutral-500">
          <span>Karta Yasovchi professional dasturi</span> • <span>Barcha huquqlar himoyalangan © {new Date().getFullYear()}</span>
        </p>
        <p className="text-[10px] text-neutral-400 mt-1 font-mono">
          Bo'yi: 8.5 sm | Eni: 5.5 sm | 36 karta | Grid: 3x3 (4 varaq A4)
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
      />

    </div>
  );
}
