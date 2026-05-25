import React, { useState, useEffect, useRef } from 'react';
import { CardState, BackState, SUITS_INFO, RANKS_INFO } from '../types';
import { PlayingCardView } from './PlayingCardView';
import { PlayingCardBackView } from './PlayingCardBackView';
import { drawRoundedRect } from '../cardRenderer';
import { 
  X, 
  Upload, 
  RotateCcw, 
  Grid3X3, 
  Maximize, 
  Minimize, 
  Move,
  CheckCircle,
  FileImage,
  Sparkles
} from 'lucide-react';

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardState | null; // Null if editing back
  back: BackState | null; // Null if editing front
  isBack: boolean;
  onSaveCard: (updatedCard: CardState, applyToAll: boolean) => void;
  onSaveBack: (updatedBack: BackState) => void;
  showCornerIndicators?: boolean;
}

export function CardEditorModal({
  isOpen,
  onClose,
  card,
  back,
  isBack,
  onSaveCard,
  onSaveBack,
  showCornerIndicators = true,
}: CardEditorModalProps) {
  // Temporary states for local editing in the modal
  const [localCard, setLocalCard] = useState<CardState | null>(null);
  const [localBack, setLocalBack] = useState<BackState | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (isBack && back) {
        setLocalBack({ ...back });
        setLocalCard(null);
      } else if (card) {
        setLocalCard({ ...card });
        setLocalBack(null);
        setApplyToAll(false);
      }
      setDragActive(false);
    }
  }, [isOpen, card, back, isBack]);

  if (!isOpen) return null;

  const currentImage = isBack ? localBack?.imageSrc : localCard?.imageSrc;

  // Handle uploaded images
  const handleImageFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isBack && localBack) {
        setLocalBack({ ...localBack, imageSrc: dataUrl, zoom: 100, xOffset: 0, yOffset: 0 });
      } else if (localCard) {
        setLocalCard({ ...localCard, imageSrc: dataUrl, zoom: 100, xOffset: 0, yOffset: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const onUploadBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    if (isBack && localBack) {
      setLocalBack({
        ...localBack,
        imageSrc: null,
        zoom: 100,
        xOffset: 0,
        yOffset: 0,
        fit: 'cover',
      });
    } else if (localCard) {
      setLocalCard({
        ...localCard,
        imageSrc: null,
        zoom: 100,
        xOffset: 0,
        yOffset: 0,
        fit: 'cover',
      });
    }
  };

  const handleSave = () => {
    if (isBack && localBack) {
      onSaveBack(localBack);
    } else if (localCard) {
      onSaveCard(localCard, applyToAll);
    }
    onClose();
  };

  // Get Uzbek label names
  const getCardTitle = () => {
    if (isBack) return "Karta Orqa Tomoni";
    if (!localCard) return "";
    const suit = SUITS_INFO[localCard.suit];
    const rank = RANKS_INFO[localCard.rank];
    return `${suit.char} ${rank.nameUz} (Guruh: ${suit.nameUz})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[93vh] md:max-h-[90vh] overflow-y-auto md:overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col md:flex-row border border-neutral-100"
        id="card-editor-modal"
      >
        {/* Absolute Close button in top-right */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"
          title="Yopish"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Column 1: Live Card Preview Area */}
        <div className="w-full md:w-5/12 bg-neutral-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-200/50">
          <div className="text-center mb-4">
            <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">Jonli ko'rinish</span>
            <h4 className="text-sm font-medium text-neutral-600 mt-0.5">Sozlamalar oqibatini darhol ko'ring</h4>
          </div>

          <div className="w-full max-w-[210px] drop-shadow-2xl">
            {isBack && localBack ? (
               <PlayingCardBackView back={localBack} className="max-w-full shadow-2xl border-4 border-white rounded-[1.25rem]" />
            ) : localCard ? (
               <PlayingCardView 
                 card={localCard} 
                 className="max-w-full shadow-2xl border-4 border-white rounded-[1.25rem]" 
                 showIndicators={showCornerIndicators}
               />
            ) : null}
          </div>

          {!isBack && localCard && (
            <div className="mt-4 flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 text-[11px] font-medium border border-amber-250/50 text-center">
              <span className="flex items-center justify-center gap-1.5 font-bold text-amber-800">
                <Sparkles className="h-3 w-3 animate-pulse text-amber-600" />
                <span>Chekka belgilar holati ({localCard.suit}{localCard.rank})</span>
              </span>
              <p className="text-[10px] text-amber-700/80 mt-0.5 leading-tight">
                {showCornerIndicators 
                  ? "Yoqilgan: Qiymat belgilari karta burchaklarida o'zgarmas bo'lib ustiga chiziladi" 
                  : "O'chirilgan: Karta burchaklarida hech qanday belgilar chizilmaydi, cheksiz rasm!"}
              </p>
            </div>
          )}
        </div>

        {/* Column 2: Dashboard controls */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between md:overflow-y-auto md:max-h-[90vh]">
          <div>
            {/* Title */}
            <div className="mb-6">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded">Tahrirlash ustaxonasi</span>
              <h3 className="text-xl font-bold text-neutral-800 tracking-tight mt-1">
                {getCardTitle()}
              </h3>
            </div>

            {/* Upload Area */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Rasm yuklash</label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onUploadBoxClick}
                className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  dragActive 
                    ? "border-amber-500 bg-amber-50/50" 
                    : currentImage 
                      ? "border-emerald-200 bg-emerald-50/10 hover:border-emerald-300" 
                      : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100/50 hover:border-neutral-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileInputChange}
                  className="hidden"
                />

                {currentImage ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-3 bg-emerald-100/80 text-emerald-600 rounded-full mb-2">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-emerald-800">Rasm yuklandi!</p>
                    <p className="text-[10px] text-neutral-400 mt-1">O'zgartirish uchun istalgan faylni bosing yoki bu yerga tashlang</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-3 bg-neutral-200/50 group-hover:bg-amber-100 group-hover:text-amber-600 text-neutral-500 rounded-full mb-2 transition-all">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-700">Rasm faylini tanlash yoki bu yerga sudrab olib kelish</p>
                    <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG, JPEG formatlar. Avtomatik ravishda kartaga moslashtiriladi</p>
                  </div>
                )}
              </div>
            </div>

            {/* Only show Adjustment Sliders if an image is loaded */}
            {currentImage ? (
              <div className="space-y-4 border-t border-neutral-100 pt-5 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Rasm sozlamalari</span>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-150 px-2.5 py-1 rounded-full transition-all"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Rasmni o'chirish / Asliga qaytarish</span>
                  </button>
                </div>

                {/* Fit Mode Selection */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Kartaga joylashish uslubi (Fit):</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cover', 'contain', 'fill'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          if (isBack && localBack) setLocalBack({ ...localBack, fit: mode });
                          else if (localCard) setLocalCard({ ...localCard, fit: mode });
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          (isBack ? localBack?.fit : localCard?.fit) === mode
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        {mode === 'cover' ? "To'ldirish (Cover)" : mode === 'contain' ? "Sig'dirish (Contain)" : "Cho'zish (Fill)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range Zoom */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Maximize className="h-3.5 w-3.5 text-neutral-400" /> Kattalashtirish (Zoom)
                    </span>
                    <span className="font-mono text-amber-600 font-bold">{(isBack ? localBack?.zoom : localCard?.zoom)}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="2"
                    value={isBack ? localBack?.zoom : localCard?.zoom}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isBack && localBack) setLocalBack({ ...localBack, zoom: val });
                      else if (localCard) setLocalCard({ ...localCard, zoom: val });
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Range Offset X */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Move className="h-3.5 w-3.5 text-neutral-400 rotate-90" /> Gorizontal siljish (X)
                    </span>
                    <span className="font-mono text-neutral-600">{(isBack ? localBack?.xOffset : localCard?.xOffset)} px</span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="1"
                    value={isBack ? localBack?.xOffset : localCard?.xOffset}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isBack && localBack) setLocalBack({ ...localBack, xOffset: val });
                      else if (localCard) setLocalCard({ ...localCard, xOffset: val });
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Range Offset Y */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Move className="h-3.5 w-3.5 text-neutral-400" /> Vertikal siljish (Y)
                    </span>
                    <span className="font-mono text-neutral-600">{(isBack ? localBack?.yOffset : localCard?.yOffset)} px</span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="1"
                    value={isBack ? localBack?.yOffset : localCard?.yOffset}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isBack && localBack) setLocalBack({ ...localBack, yOffset: val });
                      else if (localCard) setLocalCard({ ...localCard, yOffset: val });
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="border-t border-neutral-100 pt-5 mb-6 text-center py-6 bg-amber-50/20 rounded-2xl border border-amber-100/50">
                <p className="text-xs text-amber-700/80 font-medium px-4">
                  Standart bepul geometric naqshlardan foydalanilmoqda. Tepadagi maydon orqali o'zingiz xohlagan rasm faylini yuklashingiz mumkin.
                </p>
              </div>
            )}

            {/* Apply to All Deck Option - Only for card fronts */}
            {!isBack && localCard && currentImage && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/50 select-none">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="mt-1 h-4.5 w-4.5 rounded text-amber-500 focus:ring-amber-500 border-neutral-300 accent-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Ushbu rasm va moslashlarni barcha 36 ta kartaga joriy qilish</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
                      Deck tarkibidagi barcha 36 ta karta oldi fond rasmiga mana shu rasm va uning siljish sozlamalari ko'chiriladi. Har bir kartaning bosh chekkasidagi belgilar esa o'zining qiymatida qoladi.
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="flex gap-3 justify-end mt-6 border-t border-neutral-100 pt-4 bg-white">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 transition-all border border-neutral-200"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Tayyor, Saqlash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
