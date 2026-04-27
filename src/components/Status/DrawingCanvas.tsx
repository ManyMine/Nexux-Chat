import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Layers, 
  Settings2, 
  Undo2, 
  Redo2, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Plus,
  Scissors,
  Palette,
  Type,
  Square,
  Circle,
  Minus,
  Download,
  X,
  MousePointer2,
  Pipette,
  Wind,
  FolderPlus,
  Maximize2,
  Move,
  Shapes,
  Type as TextIcon,
  Hand,
  PenTool,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Share2,
  Send,
  RefreshCw,
  MoveHorizontal,
  Play,
  Pause,
  Film,
  Type as FontIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Search,
  GripVertical,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import gifshot from 'gifshot';
import { cn } from '@/src/lib/utils';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isClipping: boolean;
  parentId?: string;
  isFolder?: boolean;
  collapsed?: boolean;
}

interface DrawingCanvasProps {
  onSave: (blob: Blob, mediaType: 'image' | 'video' | 'gif') => void;
  onCancel: () => void;
}

const BRUSH_TYPES = [
  { id: 'basic', name: 'Básico', icon: Pencil },
  { id: 'soft', name: 'Macio', icon: Pencil },
  { id: 'hard', name: 'Duro', icon: Pencil },
  { id: 'airbrush', name: 'Aerógrafo', icon: Pencil },
  { id: 'pencil', name: 'Lápis', icon: Pencil },
  { id: 'ink_pencil', name: 'Ink Pencil', icon: Pencil },
  { id: 'g_pen', name: 'Real G-Pen', icon: Pencil },
  { id: 'sketch_pencil', name: 'Sketch Pencil', icon: Pencil },
  { id: 'flat_brush', name: 'Flat Brush', icon: Pencil },
  { id: 'round_brush', name: 'Round Brush', icon: Pencil },
  { id: 'texture_brush', name: 'Texture Brush', icon: Pencil },
  { id: 'dry_ink', name: 'Dry Ink', icon: Pencil },
  { id: 'charcoal', name: 'Carvão', icon: Pencil },
  { id: 'watercolor', name: 'Aquarela', icon: Pencil },
  { id: 'oil', name: 'Óleo', icon: Pencil },
  { id: 'calligraphy', name: 'Caligrafia', icon: Pencil },
  { id: 'spray', name: 'Spray', icon: Pencil },
  { id: 'neon', name: 'Neon', icon: Pencil },
  { id: 'chalk', name: 'Giz', icon: Pencil },
  { id: 'marker', name: 'Marcador', icon: Pencil },
  { id: 'ink', name: 'Nanquim', icon: Pencil },
  { id: 'pixel', name: 'Pixel', icon: Pencil },
  { id: 'dot', name: 'Pontilhado', icon: Pencil },
  { id: 'dash', name: 'Tracejado', icon: Pencil },
  { id: 'star', name: 'Estrela', icon: Pencil },
  { id: 'heart', name: 'Coração', icon: Pencil },
  { id: 'cloud', name: 'Nuvem', icon: Pencil },
  { id: 'grass', name: 'Grama', icon: Pencil },
  { id: 'fur', name: 'Pelo', icon: Pencil },
];

const ERASER_TEXTURES = [
  { id: 'solid', name: 'Sólido' },
  { id: 'soft', name: 'Macio' },
  { id: 'rough', name: 'Áspero' },
  { id: 'grainy', name: 'Granulado' },
  { id: 'splatter', name: 'Respingo' },
];

const BLEND_MODES_MAP = [
  { id: 'source-over', name: 'Normal' },
  { id: 'multiply', name: 'Multiplicar' },
  { id: 'screen', name: 'Tela' },
  { id: 'overlay', name: 'Sobreposição' },
  { id: 'lighter', name: 'Adicionar' },
  { id: 'difference', name: 'Diferença' },
  { id: 'exclusion', name: 'Exclusão' },
  { id: 'color', name: 'Cor' },
  { id: 'hue', name: 'Matiz' },
  { id: 'saturation', name: 'Saturação' },
  { id: 'luminosity', name: 'Luminosidade' },
  { id: 'darken', name: 'Escurecer' },
  { id: 'lighten', name: 'Clarear' },
  { id: 'hard-light', name: 'Luz Brilhante' },
  { id: 'soft-light', name: 'Luz Suave' },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'bucket' | 'select' | 'transform' | 'text' | 'shape' | 'eyedropper' | 'gradient' | 'blur' | 'pan' | 'bezier' | 'free_transform' | 'marionete'>('brush');
  const [brushSettings, setBrushSettings] = useState({
    size: 5,
    color: '#ffffff',
    opacity: 1,
    type: 'basic',
    stabilizer: 5,
    blendMode: 'source-over' as GlobalCompositeOperation
  });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const pointsRef = useRef<{x: number, y: number}[]>([]);
  const [eraserSettings, setEraserSettings] = useState({
    size: 20,
    texture: 'solid'
  });
  const [bucketSettings, setBucketSettings] = useState({
    tolerance: 30,
    contiguous: true,
    antiAlias: true,
    opacity: 1
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(window.innerWidth > 768);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [showRotationSlider, setShowRotationSlider] = useState(false);
  
  // Bezier state
  const [bezierPoints, setBezierPoints] = useState<{
    x: number;
    y: number;
    cp1: { x: number; y: number };
    cp2: { x: number; y: number };
  }[]>([]);
  const [selectedBezierTarget, setSelectedBezierTarget] = useState<{ index: number; type: 'point' | 'cp1' | 'cp2' } | null>(null);

  // Marionete / Mesh state
  const [meshPoints, setMeshPoints] = useState<{x: number, y: number, ox: number, oy: number}[]>([]);
  const [selectedMeshPoint, setSelectedMeshPoint] = useState<number | null>(null);

  // Text state
  const [textSettings, setTextSettings] = useState({
    font: 'Inter',
    size: 24,
    bold: false,
    italic: false,
    align: 'left' as CanvasTextAlign,
    color: '#ffffff',
    content: ''
  });

  // Animation state
  const [isAnimationMode, setIsAnimationMode] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [frames, setFrames] = useState<string[]>([]);
  const [showOnionSkin, setShowOnionSkin] = useState(true);
  const [onionSkinSettings, setOnionSkinSettings] = useState({
    before: 1,
    after: 1,
    opacity: 0.3
  });
  const [frameSearch, setFrameSearch] = useState('');
  const [showOnionSettings, setShowOnionSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const frameImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const startPosRef = useRef<{x: number, y: number} | null>(null);

  // Zoom and Pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0, flipX: 1, flipY: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
  const lastDistRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Initialize first layer
  useEffect(() => {
    if (layers.length === 0) {
      addLayer('Camada 1');
    }
  }, []);

  const addLayer = (name?: string, isFolder = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || (isFolder ? `Pasta ${layers.filter(l => l.isFolder).length + 1}` : `Camada ${layers.filter(l => !l.isFolder).length + 1}`),
      visible: true,
      opacity: 1,
      blendMode: 'source-over',
      canvas,
      ctx,
      isClipping: false,
      isFolder,
      collapsed: false
    };

    setLayers(prev => [newLayer, ...prev]);
    if (!isFolder) setActiveLayerId(newLayer.id);
    saveHistory();
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newLayers = [...prev];
      const [moved] = newLayers.splice(index, 1);
      newLayers.splice(newIndex, 0, moved);
      return newLayers;
    });
  };

  const resizeCanvas = (width: number, height: number) => {
    setCanvasSize({ width, height });
    layers.forEach(layer => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      tempCanvas.getContext('2d')?.drawImage(layer.canvas, 0, 0);
      
      layer.canvas.width = width;
      layer.canvas.height = height;
      layer.ctx.drawImage(tempCanvas, 0, 0);
    });
    renderMainCanvas();
  };

  const saveHistory = () => {
    // Simplified history: store dataURLs of all layers
    const state = layers.map(l => l.canvas.toDataURL());
    setHistory(prev => [...prev.slice(0, historyIndex + 1), state].slice(-20));
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      applyHistoryState(prevState);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      applyHistoryState(nextState);
    }
  };

  const applyHistoryState = (state: string[]) => {
    layers.forEach((layer, i) => {
      if (state[i]) {
        const img = new Image();
        img.src = state[i];
        img.onload = () => {
          layer.ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
          layer.ctx.drawImage(img, 0, 0);
          renderMainCanvas();
        };
      }
    });
  };

  const renderRequestedRef = useRef(false);
  const flipLayer = (id: string, axis: 'x' | 'y') => {
    setLayers(prev => prev.map(layer => {
      if (layer.id !== id) return layer;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return layer;
      
      tempCtx.save();
      if (axis === 'x') {
        tempCtx.translate(layer.canvas.width, 0);
        tempCtx.scale(-1, 1);
      } else {
        tempCtx.translate(0, layer.canvas.height);
        tempCtx.scale(1, -1);
      }
      tempCtx.drawImage(layer.canvas, 0, 0);
      tempCtx.restore();
      
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.ctx.drawImage(tempCanvas, 0, 0);
      return { ...layer };
    }));
    renderMainCanvas();
    saveHistory();
  };

  const rotateLayer = (id: string) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id !== id) return layer;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return layer;
      
      tempCtx.save();
      tempCtx.translate(layer.canvas.width / 2, layer.canvas.height / 2);
      tempCtx.rotate(Math.PI / 2);
      tempCtx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2);
      tempCtx.restore();
      
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.ctx.drawImage(tempCanvas, 0, 0);
      return { ...layer };
    }));
    renderMainCanvas();
    saveHistory();
  };

  const initMesh = () => {
    const cols = 4;
    const rows = 4;
    const points = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const px = (x / cols) * canvasSize.width;
        const py = (y / rows) * canvasSize.height;
        points.push({ x: px, y: py, ox: px, oy: py });
      }
    }
    setMeshPoints(points);
  };

  const applyMeshWarp = () => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || meshPoints.length === 0) return;

    // Simple mesh warp implementation using triangles
    const cols = 4;
    const rows = 4;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p1 = meshPoints[y * (cols + 1) + x];
        const p2 = meshPoints[y * (cols + 1) + x + 1];
        const p3 = meshPoints[(y + 1) * (cols + 1) + x];
        const p4 = meshPoints[(y + 1) * (cols + 1) + x + 1];

        drawTriangle(tempCtx, activeLayer.canvas, p1, p2, p3);
        drawTriangle(tempCtx, activeLayer.canvas, p2, p4, p3);
      }
    }

    activeLayer.ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    activeLayer.ctx.drawImage(tempCanvas, 0, 0);
    setMeshPoints([]);
    renderMainCanvas();
    saveHistory();
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, p0: any, p1: any, p2: any) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();

    const x0 = p0.x, y0 = p0.y;
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const u0 = p0.ox, v0 = p0.oy;
    const u1 = p1.ox, v1 = p1.oy;
    const u2 = p2.ox, v2 = p2.oy;

    const delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
    const a = (x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2) / delta;
    const b = (u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2) / delta;
    const c = (u0 * v1 * x2 + v0 * x1 * u2 + x0 * u1 * v2 - x0 * v1 * u2 - v0 * u1 * x2 - u0 * x1 * v2) / delta;
    const d = (y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2) / delta;
    const e = (u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2) / delta;
    const f = (u0 * v1 * y2 + v0 * y1 * u2 + y0 * u1 * v2 - y0 * v1 * u2 - v0 * u1 * y2 - u0 * y1 * v2) / delta;

    ctx.transform(a, d, b, e, c, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };

  const shareToTelegram = async () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    const handleShareFallback = (blob: Blob, fileName: string) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Open Telegram share link (only URL/Text, files can't be sent this way)
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Confira minha animação!')}`;
        window.open(shareUrl, '_blank');
      } catch (err) {
        console.error('Fallback sharing failed:', err);
      } finally {
        setIsExporting(false);
      }
    };

    if (isAnimationMode && frames.length > 1) {
      if (frames.length >= 4) {
        // Export as MP4 (using MediaRecorder API)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvasSize.width;
        exportCanvas.height = canvasSize.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) { setIsExporting(false); return; }

        const stream = exportCanvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const extension = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
          const fileName = `animacao.${extension}`;
          const file = new File([blob], fileName, { type: blob.type });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Minha Animação',
                text: 'Confira minha animação feita no Nexus Chat!'
              });
              setIsExporting(false);
            } catch (err) {
              console.warn('Share API failed, using fallback:', err);
              handleShareFallback(blob, fileName);
            }
          } else {
            handleShareFallback(blob, fileName);
          }
        };

        recorder.start();

        // Play frames onto the export canvas
        let frameIdx = 0;
        const playNextFrame = () => {
          if (frameIdx >= frames.length) {
            recorder.stop();
            return;
          }

          const img = new Image();
          img.onload = () => {
            exportCtx.fillStyle = backgroundColor;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            exportCtx.drawImage(img, 0, 0);
            frameIdx++;
            setTimeout(playNextFrame, 1000 / fps);
          };
          img.src = frames[frameIdx];
        };

        playNextFrame();
        return;
      } else {
        // Share as GIF (for 2-3 frames)
        gifshot.createGIF({
          images: frames,
          interval: 1 / fps,
          gifWidth: canvasSize.width,
          gifHeight: canvasSize.height
        }, (obj: any) => {
          if (!obj.error) {
            const base64 = obj.image;
            fetch(base64)
              .then(res => res.blob())
              .then(async (blob) => {
                const fileName = "animacao.gif";
                const file = new File([blob], fileName, { type: "image/gif" });
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  try {
                    await navigator.share({
                      files: [file],
                      title: 'Minha Animação',
                      text: 'Confira minha animação feita no Nexus Chat!'
                    });
                    setIsExporting(false);
                  } catch (err) {
                    console.warn('Share API failed, using fallback:', err);
                    handleShareFallback(blob, fileName);
                  }
                } else {
                  handleShareFallback(blob, fileName);
                }
              });
          } else {
            setIsExporting(false);
          }
        });
        return;
      }
    }

    canvas.toBlob(async (blob) => {
      if (!blob) { setIsExporting(false); return; }
      
      const fileName = "desenho.png";
      const file = new File([blob], fileName, { type: "image/png" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Meu Desenho',
            text: 'Confira meu desenho feito no Nexus Chat!'
          });
          setIsExporting(false);
        } catch (err) {
          console.warn('Share API failed, using fallback:', err);
          handleShareFallback(blob, fileName);
        }
      } else {
        handleShareFallback(blob, fileName);
      }
    }, 'image/png');
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && frames.length > 0) {
      interval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % frames.length);
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  const addFrameLeft = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    
    // Save current state as a frame
    const data = canvas.toDataURL();
    
    setFrames(prev => {
      const next = [...prev];
      // Insert before current frame
      next.splice(currentFrame, 0, data);
      return next;
    });
    
    // Clear the canvas for the new frame
    layers.forEach(layer => {
      layer.ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    });
    
    // currentFrame stays the same index, but it's now the new empty frame
    renderMainCanvas();
    saveHistory();
  };

  const addFrameRight = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    
    // Save current state as a frame
    const data = canvas.toDataURL();
    
    setFrames(prev => {
      const next = [...prev];
      // Insert after current frame
      next.splice(currentFrame + 1, 0, data);
      return next;
    });
    
    // Clear the canvas for the new frame
    layers.forEach(layer => {
      layer.ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    });
    
    setCurrentFrame(prev => prev + 1);
    renderMainCanvas();
    saveHistory();
  };

  const removeAnimationFrame = (index: number) => {
    setFrames(prev => prev.filter((_, i) => i !== index));
    if (currentFrame >= frames.length - 1) {
      setCurrentFrame(Math.max(0, frames.length - 2));
    }
  };

  const renderMainCanvas = useCallback(() => {
    if (renderRequestedRef.current) return;
    renderRequestedRef.current = true;

    requestAnimationFrame(() => {
      renderRequestedRef.current = false;
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const mainCtx = mainCanvas.getContext('2d', { alpha: false });
      if (!mainCtx) return;

      mainCtx.fillStyle = backgroundColor;
      mainCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // If playing, render the current frame image instead of layers
      if (isPlaying && frames[currentFrame]) {
        let img = frameImagesRef.current.get(frames[currentFrame]);
        if (!img) {
          img = new Image();
          img.onload = () => renderMainCanvas();
          img.src = frames[currentFrame];
          frameImagesRef.current.set(frames[currentFrame], img);
        }
        if (img.complete) {
          mainCtx.drawImage(img, 0, 0);
        }
        return;
      }

      // Onion Skinning
      if (isAnimationMode && !isPlaying && showOnionSkin && frames.length > 0) {
        mainCtx.save();
        // Before frames (Draw from oldest to newest for correct layering)
        for (let i = onionSkinSettings.before; i >= 1; i--) {
          const idx = currentFrame - i;
          if (idx >= 0 && frames[idx]) {
            let img = frameImagesRef.current.get(frames[idx]);
            if (!img) {
              img = new Image();
              img.onload = () => renderMainCanvas();
              img.src = frames[idx];
              frameImagesRef.current.set(frames[idx], img);
            }
            if (img.complete) {
              mainCtx.globalAlpha = onionSkinSettings.opacity / i;
              mainCtx.drawImage(img, 0, 0);
            }
          }
        }
        // After frames (Draw from furthest to closest)
        for (let i = onionSkinSettings.after; i >= 1; i--) {
          const idx = currentFrame + i;
          if (idx < frames.length && frames[idx]) {
            let img = frameImagesRef.current.get(frames[idx]);
            if (!img) {
              img = new Image();
              img.onload = () => renderMainCanvas();
              img.src = frames[idx];
              frameImagesRef.current.set(frames[idx], img);
            }
            if (img.complete) {
              mainCtx.globalAlpha = onionSkinSettings.opacity / i;
              mainCtx.drawImage(img, 0, 0);
            }
          }
        }
        mainCtx.restore();
      }

      // Render layers from bottom to top
      [...layers].reverse().forEach((layer, index, arr) => {
        if (!layer.visible) return;

        mainCtx.save();
        mainCtx.globalAlpha = layer.opacity;
        mainCtx.globalCompositeOperation = layer.blendMode;

        if (layer.isClipping && index > 0) {
          const prevLayer = arr[index - 1];
          mainCtx.drawImage(prevLayer.canvas, 0, 0);
          mainCtx.globalCompositeOperation = 'source-in';
        }

        if (tool === 'marionete' && layer.id === activeLayerId && meshPoints.length > 0) {
          // Render warped preview
          const cols = 4;
          const rows = 4;
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const p1 = meshPoints[y * (cols + 1) + x];
              const p2 = meshPoints[y * (cols + 1) + x + 1];
              const p3 = meshPoints[(y + 1) * (cols + 1) + x];
              const p4 = meshPoints[(y + 1) * (cols + 1) + x + 1];
              drawTriangle(mainCtx, layer.canvas, p1, p2, p3);
              drawTriangle(mainCtx, layer.canvas, p2, p4, p3);
            }
          }
        } else {
          mainCtx.drawImage(layer.canvas, 0, 0);
        }
        mainCtx.restore();
      });

      // Render Bezier Overlay
      if (tool === 'bezier' && bezierPoints.length > 0) {
        mainCtx.save();
        mainCtx.strokeStyle = brushSettings.color;
        mainCtx.lineWidth = 2 / transform.scale;
        mainCtx.setLineDash([5 / transform.scale, 5 / transform.scale]);
        
        // Draw Path
        mainCtx.beginPath();
        mainCtx.moveTo(bezierPoints[0].x, bezierPoints[0].y);
        for (let i = 1; i < bezierPoints.length; i++) {
          const p0 = bezierPoints[i-1];
          const p1 = bezierPoints[i];
          mainCtx.bezierCurveTo(p0.cp2.x, p0.cp2.y, p1.cp1.x, p1.cp1.y, p1.x, p1.y);
        }
        mainCtx.stroke();

        // Draw Handles and Points
        mainCtx.setLineDash([]);
        bezierPoints.forEach((p, i) => {
          const isSelected = selectedBezierTarget?.index === i;
          
          // Lines to control points
          mainCtx.strokeStyle = '#949ba4';
          mainCtx.lineWidth = 1 / transform.scale;
          mainCtx.beginPath();
          mainCtx.moveTo(p.x, p.y);
          mainCtx.lineTo(p.cp1.x, p.cp1.y);
          mainCtx.moveTo(p.x, p.y);
          mainCtx.lineTo(p.cp2.x, p.cp2.y);
          mainCtx.stroke();

          // Control points
          mainCtx.fillStyle = '#5865f2';
          mainCtx.beginPath();
          mainCtx.arc(p.cp1.x, p.cp1.y, 4 / transform.scale, 0, Math.PI * 2);
          mainCtx.arc(p.cp2.x, p.cp2.y, 4 / transform.scale, 0, Math.PI * 2);
          mainCtx.fill();

          // Main point
          mainCtx.fillStyle = isSelected && selectedBezierTarget?.type === 'point' ? '#ffffff' : '#5865f2';
          mainCtx.strokeStyle = '#ffffff';
          mainCtx.lineWidth = 2 / transform.scale;
          mainCtx.beginPath();
          mainCtx.rect(p.x - 5 / transform.scale, p.y - 5 / transform.scale, 10 / transform.scale, 10 / transform.scale);
          mainCtx.fill();
          mainCtx.stroke();
        });
        mainCtx.restore();
      }

      // Render Mesh Overlay
      if (tool === 'marionete' && meshPoints.length > 0) {
        mainCtx.save();
        mainCtx.strokeStyle = '#5865f2';
        mainCtx.lineWidth = 1 / transform.scale;
        
        const cols = 4;
        const rows = 4;
        
        // Draw Grid
        for (let y = 0; y <= rows; y++) {
          mainCtx.beginPath();
          for (let x = 0; x <= cols; x++) {
            const p = meshPoints[y * (cols + 1) + x];
            if (x === 0) mainCtx.moveTo(p.x, p.y);
            else mainCtx.lineTo(p.x, p.y);
          }
          mainCtx.stroke();
        }
        for (let x = 0; x <= cols; x++) {
          mainCtx.beginPath();
          for (let y = 0; y <= rows; y++) {
            const p = meshPoints[y * (cols + 1) + x];
            if (y === 0) mainCtx.moveTo(p.x, p.y);
            else mainCtx.lineTo(p.x, p.y);
          }
          mainCtx.stroke();
        }

        // Draw Points
        meshPoints.forEach((p, i) => {
          mainCtx.fillStyle = selectedMeshPoint === i ? '#ffffff' : '#5865f2';
          mainCtx.beginPath();
          mainCtx.arc(p.x, p.y, 5 / transform.scale, 0, Math.PI * 2);
          mainCtx.fill();
          mainCtx.stroke();
        });
        mainCtx.restore();
      }

      // Render Pixel Grid
      if (brushSettings.type === 'pixel' && transform.scale > 5) {
        mainCtx.save();
        mainCtx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
        mainCtx.lineWidth = 0.5 / transform.scale;
        const pxSize = Math.max(1, Math.floor(brushSettings.size / 2));
        
        mainCtx.beginPath();
        for (let x = 0; x <= canvasSize.width; x += pxSize) {
          mainCtx.moveTo(x, 0);
          mainCtx.lineTo(x, canvasSize.height);
        }
        for (let y = 0; y <= canvasSize.height; y += pxSize) {
          mainCtx.moveTo(0, y);
          mainCtx.lineTo(canvasSize.width, y);
        }
        mainCtx.stroke();
        mainCtx.restore();
      }
    });
  }, [layers, canvasSize, tool, bezierPoints, selectedBezierTarget, transform.scale, brushSettings.color, meshPoints, selectedMeshPoint, isAnimationMode, isPlaying, frames, currentFrame, showOnionSkin, backgroundColor, brushSettings.type, brushSettings.size]);

  useEffect(() => {
    renderMainCanvas();
  }, [renderMainCanvas]);

  const canvasRectRef = useRef<DOMRect | null>(null);

  const updateCanvasRect = useCallback(() => {
    if (mainCanvasRef.current) {
      canvasRectRef.current = mainCanvasRef.current.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    updateCanvasRect();
    window.addEventListener('resize', updateCanvasRect);
    return () => window.removeEventListener('resize', updateCanvasRect);
  }, [updateCanvasRect, transform]);

  const floodFill = (startX: number, startY: number) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return;

    const ctx = activeLayer.ctx;
    const imageData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
    const data = imageData.data;
    const width = canvasSize.width;
    const height = canvasSize.height;

    const targetPos = (startY * width + startX) * 4;
    const targetR = data[targetPos];
    const targetG = data[targetPos + 1];
    const targetB = data[targetPos + 2];
    const targetA = data[targetPos + 3];

    const fillColor = hexToRgb(brushSettings.color);
    const fillR = fillColor[0];
    const fillG = fillColor[1];
    const fillB = fillColor[2];
    const fillA = Math.round(bucketSettings.opacity * 255);
    
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const stack: [number, number][] = [[startX, startY]];
    const tolerance = bucketSettings.tolerance;

    const checkColor = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return Math.abs(data[i] - targetR) <= tolerance &&
             Math.abs(data[i + 1] - targetG) <= tolerance &&
             Math.abs(data[i + 2] - targetB) <= tolerance &&
             Math.abs(data[i + 3] - targetA) <= tolerance;
    };

    const setFill = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = fillA;
    };

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      let currentY = y;

      while (currentY >= 0 && checkColor(x, currentY)) {
        currentY--;
      }
      currentY++;

      let reachLeft = false;
      let reachRight = false;

      while (currentY < height && checkColor(x, currentY)) {
        setFill(x, currentY);

        if (x > 0) {
          if (checkColor(x - 1, currentY)) {
            if (!reachLeft) {
              stack.push([x - 1, currentY]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < width - 1) {
          if (checkColor(x + 1, currentY)) {
            if (!reachRight) {
              stack.push([x + 1, currentY]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        currentY++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    renderMainCanvas();
    saveHistory();
  };

  const getPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const setPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number, color: number[]) => {
    const i = (y * width + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  };

  const colorsMatch = (c1: number[], c2: number[], tolerance: number) => {
    return Math.abs(c1[0] - c2[0]) <= tolerance &&
           Math.abs(c1[1] - c2[1]) <= tolerance &&
           Math.abs(c1[2] - c2[2]) <= tolerance &&
           Math.abs(c1[3] - c2[3]) <= tolerance;
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    updateCanvasRect();
    
    // Clear points to prevent "continuing" lines from previous stroke
    pointsRef.current = [];

    // Check for middle mouse button (button 1) or Pan tool for panning
    if (('button' in e && (e as any).button === 1) || tool === 'pan') {
      setIsPanning(true);
      let clientX, clientY;
      const touches = (e as any).touches;
      if (touches && touches.length > 0) {
        clientX = touches[0].clientX;
        clientY = touches[0].clientY;
      } else {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }
      lastTouchRef.current = { x: clientX, y: clientY };
      return;
    }

    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    const touches = (e as any).touches;
    if (touches && touches.length > 0) {
      clientX = touches[0].clientX;
      clientY = touches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }
    const x = Math.round((clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((clientY - rect.top) * (canvas.height / rect.height));
    startPosRef.current = { x, y };

    if (tool === 'bezier') {
      const threshold = 15 / transform.scale;
      let found = false;
      
      // Check for existing targets
      for (let i = 0; i < bezierPoints.length; i++) {
        const p = bezierPoints[i];
        if (Math.hypot(p.x - x, p.y - y) < threshold) {
          setSelectedBezierTarget({ index: i, type: 'point' });
          found = true;
          break;
        }
        if (Math.hypot(p.cp1.x - x, p.cp1.y - y) < threshold) {
          setSelectedBezierTarget({ index: i, type: 'cp1' });
          found = true;
          break;
        }
        if (Math.hypot(p.cp2.x - x, p.cp2.y - y) < threshold) {
          setSelectedBezierTarget({ index: i, type: 'cp2' });
          found = true;
          break;
        }
      }

      if (!found) {
        // Add new point
        const newPoint = { x, y, cp1: { x: x - 30, y }, cp2: { x: x + 30, y } };
        setBezierPoints(prev => [...prev, newPoint]);
        setSelectedBezierTarget({ index: bezierPoints.length, type: 'cp2' }); // Select CP2 to allow immediate dragging like Photoshop
      }
      setIsDrawing(true);
      return;
    }

    if (tool === 'marionete') {
      if (meshPoints.length === 0) {
        initMesh();
        return;
      }
      const threshold = 20 / transform.scale;
      const idx = meshPoints.findIndex(p => Math.hypot(p.x - x, p.y - y) < threshold);
      if (idx !== -1) {
        setSelectedMeshPoint(idx);
        setIsDrawing(true);
      }
      return;
    }

    if (tool === 'free_transform') {
      setIsDrawing(true);
      return;
    }

    if (tool === 'bucket') {
      floodFill(x, y);
      return;
    }

    // Handle touch panning/zooming with 2 fingers
    const touches2 = (e as any).touches;
    if (touches2 && touches2.length >= 2) {
      setIsPanning(true);
      const dist = Math.hypot(
        touches2[0].clientX - touches2[1].clientX,
        touches2[0].clientY - touches2[1].clientY
      );
      lastDistRef.current = dist;
      lastTouchRef.current = {
        x: (touches2[0].clientX + touches2[1].clientX) / 2,
        y: (touches2[0].clientY + touches2[1].clientY) / 2
      };
      return;
    }

    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsPanning(false);
    lastTouchRef.current = null;
    lastDistRef.current = null;
    setIsDrawing(false);
    setSelectedBezierTarget(null);
    setSelectedMeshPoint(null);

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer) {
      activeLayer.ctx.beginPath();
    }
    saveHistory();
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDrawing || isPanning) {
        stopDrawing();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDrawing, isPanning]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.1), 10);
    
    // Zoom towards mouse position
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const dx = (mouseX - transform.x) / transform.scale;
      const dy = (mouseY - transform.y) / transform.scale;
      
      setTransform({
        scale: newScale,
        x: mouseX - dx * newScale,
        y: mouseY - dy * newScale,
        rotation: transform.rotation,
        flipX: transform.flipX,
        flipY: transform.flipY
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    if (isPanning) {
      let clientX, clientY;
      const touches = (e as any).touches;
      if (touches && touches.length >= 2) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        clientX = (touch1.clientX + touch2.clientX) / 2;
        clientY = (touch1.clientY + touch2.clientY) / 2;

        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        if (lastDistRef.current) {
          const deltaDist = dist - lastDistRef.current;
          const zoomSpeed = 0.01;
          const newScale = Math.min(Math.max(transform.scale + deltaDist * zoomSpeed, 0.1), 10);
          
          // Zoom towards center of fingers
          const rect = viewportRef.current?.getBoundingClientRect();
          if (rect) {
            const centerX = clientX - rect.left;
            const centerY = clientY - rect.top;
            const dx = (centerX - transform.x) / transform.scale;
            const dy = (centerY - transform.y) / transform.scale;
            
            setTransform(prev => ({
              ...prev,
              scale: newScale,
              x: centerX - dx * newScale,
              y: centerY - dy * newScale
            }));
          }
        }
        lastDistRef.current = dist;
      } else {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      }

      if (lastTouchRef.current) {
        const dx = clientX - lastTouchRef.current.x;
        const dy = clientY - lastTouchRef.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }
      lastTouchRef.current = { x: clientX, y: clientY };
      return;
    }

    if (!isDrawing || !activeLayerId) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return;

    const canvas = mainCanvasRef.current;
    if (!canvas || !canvasRectRef.current) return;
    const rect = canvasRectRef.current;
    if (rect.width === 0 || rect.height === 0) return;
    
    let clientX, clientY;
    const drawTouches = (e as any).touches;
    if (drawTouches && drawTouches.length > 0) {
      clientX = drawTouches[0].clientX;
      clientY = drawTouches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    if (tool === 'bezier' && selectedBezierTarget) {
      setBezierPoints(prev => {
        const next = [...prev];
        const p = { ...next[selectedBezierTarget.index] };

        if (selectedBezierTarget.type === 'point') {
          const dx = x - p.x;
          const dy = y - p.y;
          p.x = x;
          p.y = y;
          p.cp1 = { x: p.cp1.x + dx, y: p.cp1.y + dy };
          p.cp2 = { x: p.cp2.x + dx, y: p.cp2.y + dy };
        } else if (selectedBezierTarget.type === 'cp1') {
          p.cp1 = { x, y };
        } else if (selectedBezierTarget.type === 'cp2') {
          p.cp2 = { x, y };
        }
        
        next[selectedBezierTarget.index] = p;
        return next;
      });
      renderMainCanvas();
      return;
    }

    if (tool === 'marionete' && selectedMeshPoint !== null) {
      setMeshPoints(prev => {
        const next = [...prev];
        next[selectedMeshPoint] = { ...next[selectedMeshPoint], x, y };
        return next;
      });
      renderMainCanvas();
      return;
    }

    if (tool === 'free_transform' && isDrawing && startPosRef.current) {
      const dx = x - startPosRef.current.x;
      const dy = y - startPosRef.current.y;
      
      setLayers(prev => prev.map(layer => {
        if (layer.id !== activeLayerId) return layer;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return layer;
        
        tempCtx.drawImage(layer.canvas, dx, dy);
        
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(tempCanvas, 0, 0);
        return { ...layer };
      }));
      
      startPosRef.current = { x, y };
      renderMainCanvas();
      return;
    }

    // Stabilizer
    pointsRef.current.push({ x, y });
    if (pointsRef.current.length > brushSettings.stabilizer) {
      pointsRef.current.shift();
    }

    const avgX = pointsRef.current.reduce((sum, p) => sum + p.x, 0) / pointsRef.current.length;
    const avgY = pointsRef.current.reduce((sum, p) => sum + p.y, 0) / pointsRef.current.length;

    const ctx = activeLayer.ctx;
    
    if (tool === 'brush') {
      applyBrushSettings(ctx, avgX, avgY);
    } else if (tool === 'eraser') {
      applyEraserSettings(ctx, avgX, avgY);
    } else if (tool === 'eyedropper') {
      pickColor(avgX, avgY);
      setIsDrawing(false);
    } else if (tool === 'bucket') {
      floodFill(Math.round(avgX), Math.round(avgY));
      setIsDrawing(false);
    } else if (tool === 'shape') {
      if (startPosRef.current) {
        drawShapeTool(ctx, startPosRef.current.x, startPosRef.current.y, avgX, avgY);
      }
    } else if (tool === 'blur') {
      applyBlur(ctx, avgX, avgY);
    } else if (tool === 'text') {
      addText(ctx, avgX, avgY);
      setIsDrawing(false);
    } else if (tool === 'gradient') {
      if (startPosRef.current) {
        applyGradient(ctx, startPosRef.current.x, startPosRef.current.y, avgX, avgY);
      }
    } else if (tool === 'select') {
      if (startPosRef.current) {
        setSelection({
          x: Math.min(startPosRef.current.x, avgX),
          y: Math.min(startPosRef.current.y, avgY),
          w: Math.abs(avgX - startPosRef.current.x),
          h: Math.abs(avgY - startPosRef.current.y)
        });
      }
    } else if (tool === 'transform') {
      if (lastTouchRef.current) {
        const dx = avgX - lastTouchRef.current.x;
        const dy = avgY - lastTouchRef.current.y;
        moveLayerContent(activeLayer, dx, dy);
      }
    }

    renderMainCanvas();
  };

  const drawShapeTool = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    // For preview we'd need a temp canvas, but for now let's just draw on release or simple shapes
    // To make it "functional" as requested, we'll draw a shape based on the current brush settings
    ctx.strokeStyle = brushSettings.color;
    ctx.fillStyle = brushSettings.color;
    ctx.lineWidth = brushSettings.size;
    
    const w = x2 - x1;
    const h = y2 - y1;

    // We can use brushSettings.type to determine shape if we want, or just default to Circle for now
    // But let's add a simple toggle or just use Square/Circle based on a new setting
    // For now, let's just do a Circle
    ctx.beginPath();
    ctx.arc(x1 + w/2, y1 + h/2, Math.sqrt(w*w + h*h)/2, 0, Math.PI * 2);
    ctx.stroke();
  };

  const applyGradient = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, brushSettings.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  };

  const moveLayerContent = (layer: Layer, dx: number, dy: number) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layer.canvas.width;
    tempCanvas.height = layer.canvas.height;
    tempCanvas.getContext('2d')?.drawImage(layer.canvas, 0, 0);
    
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(tempCanvas, dx, dy);
  };

  const applyBlur = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.filter = `blur(${brushSettings.size / 2}px)`;
    ctx.drawImage(ctx.canvas, x - brushSettings.size, y - brushSettings.size, brushSettings.size * 2, brushSettings.size * 2, x - brushSettings.size, y - brushSettings.size, brushSettings.size * 2, brushSettings.size * 2);
    ctx.restore();
  };

  const addText = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const text = textSettings.content || prompt('Digite o texto:');
    if (text) {
      ctx.save();
      ctx.font = `${textSettings.bold ? 'bold ' : ''}${textSettings.italic ? 'italic ' : ''}${textSettings.size}px ${textSettings.font}`;
      ctx.fillStyle = textSettings.color;
      ctx.textAlign = textSettings.align;
      ctx.fillText(text, x, y);
      ctx.restore();
    }
  };

  const pickColor = (x: number, y: number) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [data[0], data[1], data[2]].map(x => x.toString(16).padStart(2, '0')).join('');
    setBrushSettings(prev => ({ ...prev, color: hex }));
  };

  const drawPixelLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      const pxSize = Math.max(1, Math.floor(size / 2));
      ctx.fillRect(Math.floor(x1 / pxSize) * pxSize, Math.floor(y1 / pxSize) * pxSize, pxSize, pxSize);

      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
    }
  };

  const applyBrushSettings = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.globalCompositeOperation = brushSettings.blendMode;
    ctx.strokeStyle = brushSettings.color;
    ctx.lineWidth = brushSettings.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = brushSettings.opacity;

    switch (brushSettings.type) {
      case 'soft':
        ctx.shadowBlur = brushSettings.size;
        ctx.shadowColor = brushSettings.color;
        break;
      case 'hard':
        ctx.shadowBlur = 0;
        ctx.lineWidth = brushSettings.size;
        break;
      case 'airbrush':
        ctx.globalAlpha = brushSettings.opacity * 0.1;
        for (let i = 0; i < 20; i++) {
          const offsetX = (Math.random() - 0.5) * brushSettings.size * 3;
          const offsetY = (Math.random() - 0.5) * brushSettings.size * 3;
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
        return;
      case 'pencil':
        ctx.lineWidth = 1;
        ctx.globalAlpha = brushSettings.opacity * 0.8;
        break;
      case 'ink_pencil':
        ctx.lineWidth = Math.max(0.5, brushSettings.size * (0.5 + Math.random() * 0.5));
        ctx.globalAlpha = brushSettings.opacity * 0.9;
        break;
      case 'g_pen':
        ctx.lineWidth = brushSettings.size;
        ctx.lineCap = 'round';
        ctx.globalAlpha = brushSettings.opacity;
        // Simulate smooth taper (simplified)
        break;
      case 'sketch_pencil':
        ctx.globalAlpha = brushSettings.opacity * 0.5;
        ctx.lineWidth = brushSettings.size * 0.8;
        ctx.setLineDash([1, 1]);
        break;
      case 'flat_brush':
        ctx.lineWidth = brushSettings.size;
        ctx.lineCap = 'butt';
        ctx.globalAlpha = brushSettings.opacity * 0.8;
        break;
      case 'round_brush':
        ctx.lineWidth = brushSettings.size;
        ctx.shadowBlur = brushSettings.size / 4;
        ctx.shadowColor = brushSettings.color;
        break;
      case 'texture_brush':
        ctx.globalAlpha = brushSettings.opacity * 0.4;
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(x + (Math.random() - 0.5) * brushSettings.size, y + (Math.random() - 0.5) * brushSettings.size, 2, 2);
        }
        return;
      case 'dry_ink':
        ctx.globalAlpha = brushSettings.opacity * 0.7;
        ctx.lineWidth = brushSettings.size;
        ctx.setLineDash([2, 4]);
        break;
      case 'charcoal':
        ctx.globalAlpha = brushSettings.opacity * 0.3;
        ctx.lineWidth = brushSettings.size;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 5);
          ctx.lineTo(x + (Math.random() - 0.5) * 5, y + (Math.random() - 0.5) * 5);
          ctx.stroke();
        }
        return;
      case 'watercolor':
        ctx.globalAlpha = brushSettings.opacity * 0.05;
        ctx.shadowBlur = brushSettings.size * 2;
        ctx.shadowColor = brushSettings.color;
        break;
      case 'oil':
        ctx.lineWidth = brushSettings.size;
        ctx.lineCap = 'butt';
        break;
      case 'calligraphy':
        ctx.lineWidth = brushSettings.size;
        ctx.scale(1, 0.5);
        ctx.rotate(Math.PI / 4);
        break;
      case 'spray':
        ctx.globalAlpha = brushSettings.opacity * 0.5;
        for (let i = 0; i < 15; i++) {
          const r = Math.random() * brushSettings.size;
          const theta = Math.random() * 2 * Math.PI;
          ctx.fillRect(x + r * Math.cos(theta), y + r * Math.sin(theta), 1, 1);
        }
        return;
      case 'neon':
        ctx.shadowBlur = 20;
        ctx.shadowColor = brushSettings.color;
        ctx.lineWidth = brushSettings.size / 3;
        ctx.strokeStyle = '#fff';
        break;
      case 'chalk':
        ctx.globalAlpha = brushSettings.opacity * 0.4;
        ctx.lineWidth = brushSettings.size;
        ctx.setLineDash([1, 2]);
        break;
      case 'marker':
        ctx.globalAlpha = brushSettings.opacity * 0.7;
        ctx.lineWidth = brushSettings.size;
        ctx.lineCap = 'square';
        break;
      case 'ink':
        ctx.lineWidth = Math.random() * brushSettings.size;
        break;
      case 'pixel':
        if (pointsRef.current.length > 1) {
          const p1 = pointsRef.current[pointsRef.current.length - 2];
          drawPixelLine(ctx, p1.x, p1.y, x, y, brushSettings.size);
        } else {
          const pxSize = Math.max(1, Math.floor(brushSettings.size / 2));
          ctx.fillRect(Math.floor(x / pxSize) * pxSize, Math.floor(y / pxSize) * pxSize, pxSize, pxSize);
        }
        return;
      case 'dot':
        ctx.setLineDash([1, brushSettings.size * 2]);
        break;
      case 'dash':
        ctx.setLineDash([brushSettings.size * 2, brushSettings.size]);
        break;
      case 'star':
        ctx.fillStyle = brushSettings.color;
        drawShape(ctx, x, y, 5, brushSettings.size, brushSettings.size / 2);
        return;
      case 'heart':
        ctx.fillStyle = brushSettings.color;
        drawHeart(ctx, x, y, brushSettings.size);
        return;
      case 'cloud':
        ctx.fillStyle = brushSettings.color;
        ctx.globalAlpha = brushSettings.opacity * 0.3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, brushSettings.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      case 'grass':
        ctx.strokeStyle = brushSettings.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 5, y - brushSettings.size);
        ctx.stroke();
        return;
      case 'fur':
        ctx.globalAlpha = brushSettings.opacity * 0.2;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * brushSettings.size, y + (Math.random() - 0.5) * brushSettings.size);
          ctx.stroke();
        }
        return;
      default:
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const applyEraserSettings = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = eraserSettings.size;
    ctx.globalAlpha = 1;

    if (eraserSettings.texture === 'soft') {
      ctx.shadowBlur = eraserSettings.size;
      ctx.shadowColor = 'black';
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, points: number, outer: number, inner: number) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI * i) / points;
      ctx.lineTo(x + radius * Math.sin(angle), y - radius * Math.cos(angle));
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    ctx.fill();
  };

  const finalizeBezier = (mode: 'stroke' | 'fill') => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || bezierPoints.length < 2) return;

    const ctx = activeLayer.ctx;
    ctx.save();
    ctx.strokeStyle = brushSettings.color;
    ctx.fillStyle = brushSettings.color;
    ctx.lineWidth = brushSettings.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = brushSettings.opacity;
    ctx.globalCompositeOperation = brushSettings.blendMode;

    ctx.beginPath();
    ctx.moveTo(bezierPoints[0].x, bezierPoints[0].y);
    for (let i = 1; i < bezierPoints.length; i++) {
      const p0 = bezierPoints[i-1];
      const p1 = bezierPoints[i];
      ctx.bezierCurveTo(p0.cp2.x, p0.cp2.y, p1.cp1.x, p1.cp1.y, p1.x, p1.y);
    }

    if (mode === 'stroke') {
      ctx.stroke();
    } else {
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    setBezierPoints([]);
    renderMainCanvas();
    saveHistory();
  };

  const handleSave = async () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    if (isAnimationMode && frames.length > 1) {
      if (frames.length >= 4) {
        // Export as MP4
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvasSize.width;
        exportCanvas.height = canvasSize.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) { setIsExporting(false); return; }

        const stream = exportCanvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          onSave(blob, 'video');
          setIsExporting(false);
        };

        recorder.start();

        let frameIdx = 0;
        const playNextFrame = () => {
          if (frameIdx >= frames.length) {
            recorder.stop();
            return;
          }

          const img = new Image();
          img.onload = () => {
            exportCtx.fillStyle = backgroundColor;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            exportCtx.drawImage(img, 0, 0);
            frameIdx++;
            setTimeout(playNextFrame, 1000 / fps);
          };
          img.src = frames[frameIdx];
        };

        playNextFrame();
      } else {
        // Export as GIF
        gifshot.createGIF({
          images: frames,
          interval: 1 / fps,
          gifWidth: canvasSize.width,
          gifHeight: canvasSize.height
        }, (obj: any) => {
          if (!obj.error) {
            fetch(obj.image)
              .then(res => res.blob())
              .then(blob => {
                onSave(blob, 'gif');
                setIsExporting(false);
              });
          } else {
            setIsExporting(false);
          }
        });
      }
    } else {
      canvas.toBlob((blob) => {
        if (blob) onSave(blob, 'image');
        setIsExporting(false);
      }, 'image/png');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#313338] text-[#ffffff] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e1f22] flex items-center justify-between bg-[#2b2d31]">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="p-2 hover:bg-[#1e1f22] rounded-lg">
            <X className="w-5 h-5 text-[#dbdee1]" />
          </button>
          <h2 className="font-bold text-[#ffffff]">Editor de Desenho</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-[#1e1f22] rounded-lg disabled:opacity-30 text-[#dbdee1]">
            <Undo2 className="w-5 h-5" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-[#1e1f22] rounded-lg disabled:opacity-30 text-[#dbdee1]">
            <Redo2 className="w-5 h-5" />
          </button>
          <button 
            onClick={shareToTelegram}
            className="p-2 hover:bg-[#1e1f22] rounded-lg text-[#dbdee1] flex items-center space-x-2"
            title="Compartilhar no Telegram"
          >
            <Send className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-bold">Telegram</span>
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-[#5865f2] text-white font-bold rounded-lg hover:bg-[#4752c4] transition-colors">
            Salvar
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 md:w-20 border-r border-[#1e1f22] bg-[#2b2d31] flex flex-col items-center py-4 space-y-4 overflow-y-auto scrollbar-hide">
          <button 
            onClick={() => setTool('brush')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'brush' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Pincel"
          >
            <Pencil className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'eraser' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Borracha"
          >
            <Eraser className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('bucket')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'bucket' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Balde de Tinta"
          >
            <PaintBucket className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('eyedropper')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'eyedropper' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Conta-gotas"
          >
            <Pipette className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('transform')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'transform' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Mover/Transformar"
          >
            <Move className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('text')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'text' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Texto"
          >
            <TextIcon className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('bezier')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'bezier' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Caneta Bezier"
          >
            <PenTool className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('pan')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'pan' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Mover Tela (Pan)"
          >
            <Hand className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('shape')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'shape' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Formas"
          >
            <Shapes className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('marionete')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'marionete' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Marionete (Mesh Warp)"
          >
            <RefreshCw className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setIsAnimationMode(!isAnimationMode)}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", isAnimationMode ? "bg-[#248046] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Modo Animação"
          >
            <Film className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('free_transform')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'free_transform' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Transformação Livre"
          >
            <Maximize className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => setTool('blur')}
            className={cn("p-3 md:p-4 rounded-xl transition-colors", tool === 'blur' ? "bg-[#5865f2] text-white" : "text-[#dbdee1] hover:bg-[#1e1f22]")}
            title="Desfoque"
          >
            <Wind className="w-6 h-6 md:w-7 md:h-7" />
          </button>
          <div className="w-10 h-px bg-[#1e1f22] my-2" />
          <div className="relative group">
            <div 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg cursor-pointer"
              style={{ backgroundColor: brushSettings.color }}
            />
            <input 
              type="color" 
              value={brushSettings.color}
              onChange={(e) => setBrushSettings(prev => ({ ...prev, color: e.target.value }))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div 
          ref={viewportRef}
          className="flex-1 bg-[#1e1f22] flex items-center justify-center p-4 md:p-8 overflow-hidden relative"
          onWheel={handleWheel}
        >
          <button 
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="absolute top-4 right-4 z-20 p-3 bg-[#2b2d31] border border-[#1e1f22] rounded-xl shadow-lg text-[#ffffff] md:hidden"
          >
            <Settings2 className="w-6 h-6" />
          </button>

          <div 
            className="relative shadow-2xl bg-white origin-center will-change-transform" 
            style={{ 
              width: canvasSize.width, 
              height: canvasSize.height,
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale * transform.flipX}, ${transform.scale * transform.flipY}) rotate(${transform.rotation}deg)`
            }}
          >
            <canvas 
              ref={mainCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className={cn(
                "w-full h-full touch-none will-change-contents",
                isPanning ? "cursor-grabbing" : "cursor-crosshair"
              )}
              style={{ touchAction: 'none' }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
            />
            {selection && (
              <div 
                className="absolute border-2 border-dashed border-[#5865f2] pointer-events-none"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.w,
                  height: selection.h
                }}
              />
            )}
          </div>
          
          {/* Animation Timeline */}
        <AnimatePresence>
          {isAnimationMode && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-[#2b2d31] border-t border-[#1e1f22] p-4 z-40"
            >
              <div className="max-w-7xl mx-auto flex flex-col space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 bg-[#5865f2] text-white rounded-lg hover:bg-[#4752c4] disabled:opacity-50"
                      disabled={isExporting}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={addFrameLeft}
                        className="p-2 bg-[#248046] text-white rounded-lg hover:bg-[#1a6334] flex items-center space-x-2 disabled:opacity-50"
                        disabled={isExporting}
                        title="Novo quadro à esquerda"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <Plus className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={addFrameRight}
                        className="p-2 bg-[#248046] text-white rounded-lg hover:bg-[#1a6334] flex items-center space-x-2 disabled:opacity-50"
                        disabled={isExporting}
                        title="Novo quadro à direita"
                      >
                        <Plus className="w-3 h-3" />
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => setFrames([])}
                      className="p-2 bg-[#f23f42] text-white rounded-lg hover:bg-[#d83538] flex items-center space-x-2 disabled:opacity-50"
                      title="Limpar Todos os Quadros"
                      disabled={isExporting}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-bold">Limpar Tudo</span>
                    </button>
                    <div className="flex items-center space-x-2 bg-[#1e1f22] px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] font-bold text-[#949ba4] uppercase">FPS</span>
                      <input 
                        type="number" 
                        value={fps}
                        onChange={(e) => setFps(parseInt(e.target.value) || 1)}
                        className="w-12 bg-transparent text-white text-xs font-bold outline-none"
                        disabled={isExporting}
                      />
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => setShowOnionSkin(!showOnionSkin)}
                        className={cn(
                          "px-3 py-1.5 rounded-l-lg text-[10px] font-bold uppercase transition-all",
                          showOnionSkin ? "bg-[#5865f2] text-white" : "bg-[#1e1f22] text-[#949ba4] hover:text-white"
                        )}
                        disabled={isExporting}
                      >
                        Papel Vegetal
                      </button>
                      <button 
                        onClick={() => setShowOnionSettings(!showOnionSettings)}
                        className={cn(
                          "px-2 py-1.5 rounded-r-lg border-l border-white/10 transition-all",
                          showOnionSkin ? "bg-[#5865f2] text-white" : "bg-[#1e1f22] text-[#949ba4] hover:text-white"
                        )}
                        disabled={isExporting}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <AnimatePresence>
                        {showOnionSettings && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 left-0 bg-[#1e1f22] p-3 rounded-xl border border-[#5865f2]/30 shadow-2xl z-50 w-48 space-y-3"
                          >
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#949ba4] uppercase">Quadros Antes: {onionSkinSettings.before}</label>
                              <input 
                                type="range" min="0" max="5" 
                                value={onionSkinSettings.before}
                                onChange={(e) => setOnionSkinSettings(prev => ({ ...prev, before: parseInt(e.target.value) }))}
                                className="w-full h-1 bg-[#2b2d31] rounded-full appearance-none cursor-pointer accent-[#5865f2]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#949ba4] uppercase">Quadros Depois: {onionSkinSettings.after}</label>
                              <input 
                                type="range" min="0" max="5" 
                                value={onionSkinSettings.after}
                                onChange={(e) => setOnionSkinSettings(prev => ({ ...prev, after: parseInt(e.target.value) }))}
                                className="w-full h-1 bg-[#2b2d31] rounded-full appearance-none cursor-pointer accent-[#5865f2]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#949ba4] uppercase">Opacidade: {Math.round(onionSkinSettings.opacity * 100)}%</label>
                              <input 
                                type="range" min="0" max="100" 
                                value={onionSkinSettings.opacity * 100}
                                onChange={(e) => setOnionSkinSettings(prev => ({ ...prev, opacity: parseInt(e.target.value) / 100 }))}
                                className="w-full h-1 bg-[#2b2d31] rounded-full appearance-none cursor-pointer accent-[#5865f2]"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                    {isExporting && (
                      <div className="flex items-center space-x-2 text-[#5865f2] animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-bold uppercase">Exportando...</span>
                      </div>
                    )}
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#949ba4]" />
                      <input 
                        type="text"
                        placeholder="Ir para quadro..."
                        value={frameSearch}
                        onChange={(e) => {
                          setFrameSearch(e.target.value);
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0 && val <= frames.length) {
                            setCurrentFrame(val - 1);
                          }
                        }}
                        className="bg-[#1e1f22] text-white text-xs pl-9 pr-3 py-1.5 rounded-lg border border-transparent focus:border-[#5865f2] outline-none w-full md:w-32"
                      />
                    </div>
                    <div className="text-xs font-bold text-[#949ba4] whitespace-nowrap">
                      Quadro {currentFrame + 1} / {frames.length || 1}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide h-24">
                  {frames.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#1e1f22] rounded-xl text-[#949ba4] text-xs">
                      Nenhum quadro adicionado. Clique em "Novo Quadro" para começar.
                    </div>
                  ) : (
                    frames.map((frame, i) => (
                      <div 
                        key={i}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', i.toString())}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const toIndex = i;
                          if (fromIndex === toIndex) return;
                          const newFrames = [...frames];
                          const [moved] = newFrames.splice(fromIndex, 1);
                          newFrames.splice(toIndex, 0, moved);
                          setFrames(newFrames);
                          setCurrentFrame(toIndex);
                        }}
                        onClick={() => setCurrentFrame(i)}
                        className={cn(
                          "relative flex-shrink-0 w-32 h-20 rounded-lg border-2 transition-all cursor-pointer overflow-hidden group",
                          currentFrame === i ? "border-[#5865f2] bg-[#5865f2]/10" : "border-[#1e1f22] hover:border-[#3f4147]"
                        )}
                      >
                        <img src={frame} className="w-full h-full object-contain" alt={`Frame ${i}`} />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center space-x-1">
                          <GripVertical className="w-2 h-2" />
                          <span>{i + 1}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeAnimationFrame(i); }}
                          className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom & Rotation Indicators */}
          <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-30">
            {/* Zoom Control */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowZoomSlider(!showZoomSlider);
                  setShowRotationSlider(false);
                }}
                className={cn(
                  "bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-black/80 transition-all flex items-center space-x-1 shadow-lg border border-white/10",
                  showZoomSlider && "bg-[#5865f2] hover:bg-[#4752c4]"
                )}
              >
                <span>{Math.round(transform.scale * 100)}%</span>
                <ChevronUp className={cn("w-3 h-3 transition-transform", showZoomSlider ? "rotate-0" : "rotate-180")} />
              </button>

              <AnimatePresence>
                {showZoomSlider && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full left-0 mb-3 bg-[#2b2d31] border border-[#1e1f22] rounded-2xl shadow-2xl p-4 w-48 flex flex-col space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[#949ba4]">Zoom</span>
                      <span className="text-[10px] font-bold text-[#ffffff]">{Math.round(transform.scale * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="1000" 
                      step="1"
                      value={transform.scale * 100}
                      onChange={(e) => {
                        const newScale = parseInt(e.target.value) / 100;
                        const rect = viewportRef.current?.getBoundingClientRect();
                        if (rect) {
                          const centerX = rect.width / 2;
                          const centerY = rect.height / 2;
                          const dx = (centerX - transform.x) / transform.scale;
                          const dy = (centerY - transform.y) / transform.scale;
                          setTransform({
                            scale: newScale,
                            x: centerX - dx * newScale,
                            y: centerY - dy * newScale,
                            rotation: transform.rotation,
                            flipX: transform.flipX,
                            flipY: transform.flipY
                          });
                        } else {
                          setTransform(prev => ({ ...prev, scale: newScale }));
                        }
                      }}
                      className="w-full h-1.5 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 200, 400].map(z => (
                        <button
                          key={z}
                          onClick={() => {
                            const newScale = z / 100;
                            const rect = viewportRef.current?.getBoundingClientRect();
                            if (rect) {
                              const centerX = rect.width / 2;
                              const centerY = rect.height / 2;
                              const dx = (centerX - transform.x) / transform.scale;
                              const dy = (centerY - transform.y) / transform.scale;
                              setTransform({
                                scale: newScale,
                                x: centerX - dx * newScale,
                                y: centerY - dy * newScale,
                                rotation: transform.rotation,
                                flipX: transform.flipX,
                                flipY: transform.flipY
                              });
                            } else {
                              setTransform(prev => ({ ...prev, scale: newScale }));
                            }
                          }}
                          className="text-[9px] font-bold bg-[#1e1f22] hover:bg-[#3f4147] py-1 rounded transition-colors"
                        >
                          {z}%
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rotation Control */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowRotationSlider(!showRotationSlider);
                  setShowZoomSlider(false);
                }}
                className={cn(
                  "bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-black/80 transition-all flex items-center space-x-1 shadow-lg border border-white/10",
                  showRotationSlider && "bg-[#5865f2] hover:bg-[#4752c4]"
                )}
              >
                <span>{transform.rotation}°</span>
                <RotateCw className={cn("w-3 h-3 transition-transform", showRotationSlider ? "rotate-0" : "rotate-180")} />
              </button>

              <AnimatePresence>
                {showRotationSlider && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full left-0 mb-3 bg-[#2b2d31] border border-[#1e1f22] rounded-2xl shadow-2xl p-4 w-48 flex flex-col space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[#949ba4]">Rotação</span>
                      <span className="text-[10px] font-bold text-[#ffffff]">{transform.rotation}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="1"
                      value={transform.rotation}
                      onChange={(e) => {
                        const newRotation = parseInt(e.target.value);
                        setTransform(prev => ({ ...prev, rotation: newRotation }));
                      }}
                      className="w-full h-1.5 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 90, 180, 270].map(r => (
                        <button
                          key={r}
                          onClick={() => setTransform(prev => ({ ...prev, rotation: r }))}
                          className="text-[9px] font-bold bg-[#1e1f22] hover:bg-[#3f4147] py-1 rounded transition-colors"
                        >
                          {r}°
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => {
                setTransform({ x: 0, y: 0, scale: 1, rotation: 0, flipX: 1, flipY: 1 });
                setShowZoomSlider(false);
                setShowRotationSlider(false);
              }}
              className="bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-black/80 transition-all shadow-lg border border-white/10"
              title="Resetar Visualização"
            >
              Resetar
            </button>
            <button 
              onClick={() => setTransform(prev => ({ ...prev, flipX: prev.flipX * -1 }))}
              className="bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-all shadow-lg border border-white/10"
              title="Inverter Tela H (Espelhar)"
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setTransform(prev => ({ ...prev, flipY: prev.flipY * -1 }))}
              className="bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-all shadow-lg border border-white/10"
              title="Inverter Tela V"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Panels */}
        <AnimatePresence>
          {showRightPanel && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-80 md:relative md:z-0 md:w-80 md:flex md:flex-col border-l border-[#1e1f22] bg-[#2b2d31] overflow-hidden shadow-2xl md:shadow-none"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#1e1f22] md:hidden">
                <span className="font-bold text-[#ffffff]">Configurações</span>
                <button onClick={() => setShowRightPanel(false)} className="p-2 hover:bg-[#1e1f22] rounded-lg">
                  <X className="w-5 h-5 text-[#dbdee1]" />
                </button>
              </div>
              {/* Tool Settings */}
              <div className="p-6 border-b border-[#1e1f22] overflow-y-auto">
            <div className="flex items-center space-x-2 mb-6">
              <Settings2 className="w-5 h-5 text-[#949ba4]" />
              <span className="text-sm font-bold uppercase text-[#949ba4]">Configurações</span>
            </div>
            
            {tool === 'brush' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Tamanho: {brushSettings.size}px</label>
                  <input 
                    type="range" min="1" max="100" 
                    value={brushSettings.size}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Opacidade: {Math.round(brushSettings.opacity * 100)}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={brushSettings.opacity * 100}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, opacity: (parseInt(e.target.value) || 0) / 100 }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Estabilizador: {brushSettings.stabilizer}</label>
                  <input 
                    type="range" min="0" max="20" 
                    value={brushSettings.stabilizer}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, stabilizer: parseInt(e.target.value) || 0 }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Modo de Mesclagem</label>
                  <select 
                    value={brushSettings.blendMode}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, blendMode: e.target.value as GlobalCompositeOperation }))}
                    className="w-full bg-[#1e1f22] border-none rounded-lg px-3 py-2 text-sm outline-none text-[#ffffff]"
                  >
                    {BLEND_MODES_MAP.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-[#1e1f22] pb-2">
                    <Palette className="w-4 h-4 text-[#949ba4]" />
                    <span className="text-xs font-bold uppercase text-[#949ba4]">Biblioteca de Pincéis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#1e1f22]">
                    {BRUSH_TYPES.map(b => (
                      <button 
                        key={b.id}
                        onClick={() => setBrushSettings(prev => ({ ...prev, type: b.id }))}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex flex-col items-center justify-center space-y-2",
                          brushSettings.type === b.id ? "border-[#5865f2] bg-[#5865f2]/20 shadow-[0_0_10px_rgba(88,101,242,0.3)]" : "border-[#1e1f22] hover:bg-[#1e1f22]"
                        )}
                        title={b.name}
                      >
                        <b.icon className="w-5 h-5 text-[#ffffff]" />
                        <span className="text-[10px] font-medium truncate w-full text-center text-[#ffffff]">{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tool === 'text' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#5865f2]/30">
                  <h4 className="text-xs font-bold uppercase text-[#949ba4] mb-3">Configurações de Texto</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#949ba4] mb-2 block">Conteúdo</label>
                      <textarea 
                        value={textSettings.content}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Digite o texto aqui..."
                        className="w-full bg-[#0e0e10] text-white text-xs p-2 rounded-lg border border-[#1e1f22] focus:border-[#5865f2] outline-none h-20 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#949ba4] mb-2 block">Fonte</label>
                      <select 
                        value={textSettings.font}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, font: e.target.value }))}
                        className="w-full bg-[#0e0e10] text-white text-xs p-2 rounded-lg border border-[#1e1f22] outline-none"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#949ba4] mb-2 block">Tamanho</label>
                        <input 
                          type="number" 
                          value={textSettings.size}
                          onChange={(e) => setTextSettings(prev => ({ ...prev, size: parseInt(e.target.value) || 12 }))}
                          className="w-full bg-[#0e0e10] text-white text-xs p-2 rounded-lg border border-[#1e1f22] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#949ba4] mb-2 block">Cor</label>
                        <input 
                          type="color" 
                          value={textSettings.color}
                          onChange={(e) => setTextSettings(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full h-8 bg-[#0e0e10] rounded-lg border border-[#1e1f22] cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex bg-[#0e0e10] rounded-lg p-1">
                        <button 
                          onClick={() => setTextSettings(prev => ({ ...prev, align: 'left' }))}
                          className={cn("p-1.5 rounded", textSettings.align === 'left' ? "bg-[#5865f2] text-white" : "text-[#949ba4] hover:text-white")}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setTextSettings(prev => ({ ...prev, align: 'center' }))}
                          className={cn("p-1.5 rounded", textSettings.align === 'center' ? "bg-[#5865f2] text-white" : "text-[#949ba4] hover:text-white")}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setTextSettings(prev => ({ ...prev, align: 'right' }))}
                          className={cn("p-1.5 rounded", textSettings.align === 'right' ? "bg-[#5865f2] text-white" : "text-[#949ba4] hover:text-white")}
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex bg-[#0e0e10] rounded-lg p-1">
                        <button 
                          onClick={() => setTextSettings(prev => ({ ...prev, bold: !prev.bold }))}
                          className={cn("p-1.5 rounded", textSettings.bold ? "bg-[#5865f2] text-white" : "text-[#949ba4] hover:text-white")}
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setTextSettings(prev => ({ ...prev, italic: !prev.italic }))}
                          className={cn("p-1.5 rounded", textSettings.italic ? "bg-[#5865f2] text-white" : "text-[#949ba4] hover:text-white")}
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[#949ba4] italic">
                  Clique no canvas para inserir o texto com as configurações acima.
                </p>
              </div>
            )}

            {tool === 'marionete' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#5865f2]/30">
                  <h4 className="text-xs font-bold uppercase text-[#949ba4] mb-3">Controles Marionete</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={applyMeshWarp}
                      className="w-full py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Aplicar Deformação</span>
                    </button>
                    <button 
                      onClick={initMesh}
                      className="w-full py-2 bg-[#2b2d31] hover:bg-[#3f4147] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Resetar Mesh</span>
                    </button>
                    <button 
                      onClick={() => setMeshPoints([])}
                      className="w-full py-2 bg-[#f23f42] hover:bg-[#d83538] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpar Mesh</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[#949ba4] italic">
                  Arraste os pontos azuis para deformar o desenho. Clique em "Aplicar" para salvar as alterações na camada.
                </p>
              </div>
            )}

            {tool === 'free_transform' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#5865f2]/30">
                  <h4 className="text-xs font-bold uppercase text-[#949ba4] mb-3">Transformação de Camada</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => activeLayerId && flipLayer(activeLayerId, 'x')}
                      className="py-2 bg-[#2b2d31] hover:bg-[#3f4147] text-white text-[10px] font-bold rounded-lg transition-colors flex flex-col items-center space-y-1"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span>Inverter H</span>
                    </button>
                    <button 
                      onClick={() => activeLayerId && flipLayer(activeLayerId, 'y')}
                      className="py-2 bg-[#2b2d31] hover:bg-[#3f4147] text-white text-[10px] font-bold rounded-lg transition-colors flex flex-col items-center space-y-1"
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span>Inverter V</span>
                    </button>
                    <button 
                      onClick={() => activeLayerId && rotateLayer(activeLayerId)}
                      className="py-2 bg-[#2b2d31] hover:bg-[#3f4147] text-white text-[10px] font-bold rounded-lg transition-colors flex flex-col items-center space-y-1"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Girar 90°</span>
                    </button>
                    <button 
                      onClick={() => {
                        setLayers(prev => prev.map(l => {
                          if (l.id !== activeLayerId) return l;
                          // This is tricky because we don't store the original offset.
                          // But we can assume the user wants to center it or something.
                          // For now, let's just provide a way to clear the layer if they messed up, 
                          // or better, just rely on Undo.
                          return l;
                        }));
                      }}
                      className="py-2 bg-[#2b2d31] hover:bg-[#3f4147] text-white text-[10px] font-bold rounded-lg transition-colors flex flex-col items-center space-y-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Resetar</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#949ba4] italic text-center">
                    Arraste no canvas para mover a camada.
                  </p>
                </div>
              </div>
            )}

            {tool === 'bezier' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#5865f2]/30">
                  <h4 className="text-xs font-bold uppercase text-[#949ba4] mb-3">Controles Bezier</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => finalizeBezier('stroke')}
                      className="w-full py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Contornar Caminho</span>
                    </button>
                    <button 
                      onClick={() => finalizeBezier('fill')}
                      className="w-full py-2 bg-[#248046] hover:bg-[#1a6334] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <PaintBucket className="w-4 h-4" />
                      <span>Preencher Caminho</span>
                    </button>
                    <button 
                      onClick={() => setBezierPoints([])}
                      className="w-full py-2 bg-[#f23f42] hover:bg-[#d83538] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpar Pontos</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Espessura do Traço: {brushSettings.size}px</label>
                  <input 
                    type="range" min="1" max="100" 
                    value={brushSettings.size}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Opacidade: {Math.round(brushSettings.opacity * 100)}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={brushSettings.opacity * 100}
                    onChange={(e) => setBrushSettings(prev => ({ ...prev, opacity: (parseInt(e.target.value) || 0) / 100 }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <p className="text-[10px] text-[#949ba4] italic">
                  Dica: Clique para adicionar pontos. Arraste os quadrados para mover pontos e os círculos para ajustar as curvas.
                </p>
              </div>
            )}

            {tool === 'eraser' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Tamanho: {eraserSettings.size}px</label>
                  <input 
                    type="range" min="1" max="100" 
                    value={eraserSettings.size}
                    onChange={(e) => setEraserSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div className="space-y-3">
                  {ERASER_TEXTURES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setEraserSettings(prev => ({ ...prev, texture: t.id }))}
                      className={cn(
                        "w-full p-3 text-left text-sm rounded-xl border transition-all text-[#ffffff]",
                        eraserSettings.texture === t.id ? "border-[#5865f2] bg-[#5865f2]/10" : "border-[#1e1f22] hover:bg-[#1e1f22]"
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool === 'bucket' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Tolerância: {bucketSettings.tolerance}</label>
                  <input 
                    type="range" min="0" max="255" 
                    value={bucketSettings.tolerance}
                    onChange={(e) => setBucketSettings(prev => ({ ...prev, tolerance: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">Opacidade: {Math.round(bucketSettings.opacity * 100)}%</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={bucketSettings.opacity * 100}
                    onChange={(e) => setBucketSettings(prev => ({ ...prev, opacity: (parseInt(e.target.value) || 0) / 100 }))}
                    className="w-full h-2 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                  />
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => setBucketSettings(prev => ({ ...prev, contiguous: !prev.contiguous }))}
                    className={cn(
                      "w-full p-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between text-[#ffffff]",
                      bucketSettings.contiguous ? "border-[#5865f2] bg-[#5865f2]/10" : "border-[#1e1f22] hover:bg-[#1e1f22]"
                    )}
                  >
                    <span className="font-medium">Contíguo</span>
                    <div className={cn("w-4 h-4 rounded-full", bucketSettings.contiguous ? "bg-[#5865f2]" : "bg-[#949ba4]")} />
                  </button>
                  <button 
                    onClick={() => setBucketSettings(prev => ({ ...prev, antiAlias: !prev.antiAlias }))}
                    className={cn(
                      "w-full p-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between text-[#ffffff]",
                      bucketSettings.antiAlias ? "border-[#5865f2] bg-[#5865f2]/10" : "border-[#1e1f22] hover:bg-[#1e1f22]"
                    )}
                  >
                    <span className="font-medium">Suavização (Anti-alias)</span>
                    <div className={cn("w-4 h-4 rounded-full", bucketSettings.antiAlias ? "bg-[#5865f2]" : "bg-[#949ba4]")} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Layers Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#1e1f22] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#949ba4]" />
                <span className="text-sm font-bold uppercase text-[#949ba4]">Camadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => addLayer(undefined, true)} className="p-2 hover:bg-[#1e1f22] rounded-lg" title="Nova Pasta">
                  <FolderPlus className="w-5 h-5 text-[#dbdee1]" />
                </button>
                <button onClick={() => addLayer()} className="p-2 hover:bg-[#1e1f22] rounded-lg" title="Nova Camada">
                  <Plus className="w-5 h-5 text-[#ffffff]" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {layers.map((layer, idx) => (
                <div 
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer group",
                    activeLayerId === layer.id ? "border-[#5865f2] bg-[#5865f2]/20" : "border-[#1e1f22] hover:bg-[#3f4147]",
                    layer.isFolder && "bg-[#111214]/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l));
                        }}
                        className="p-1.5 hover:bg-[#1e1f22] rounded-lg"
                      >
                        {layer.visible ? <Eye className="w-5 h-5 text-[#ffffff]" /> : <EyeOff className="w-5 h-5 text-[#949ba4]" />}
                      </button>
                      <span className={cn("text-sm font-medium text-[#ffffff] truncate w-32", layer.isFolder && "font-bold")}>
                        {layer.isFolder ? '📁 ' : ''}{layer.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
                        className="p-1.5 hover:bg-[#3f4147] rounded-lg disabled:opacity-10 text-[#ffffff]"
                        disabled={idx === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
                        className="p-1.5 hover:bg-[#3f4147] rounded-lg disabled:opacity-10 text-[#ffffff]"
                        disabled={idx === layers.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {!layer.isFolder && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, isClipping: !l.isClipping } : l));
                          }}
                          className={cn("p-1.5 rounded-lg", layer.isClipping ? "bg-[#5865f2] text-white" : "hover:bg-[#3f4147] text-[#ffffff]")}
                          title="Máscara de Corte"
                        >
                          <Scissors className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          layer.ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
                          renderMainCanvas();
                          saveHistory();
                        }}
                        className="p-1.5 hover:bg-[#f23f42] hover:text-white text-[#949ba4] rounded-lg transition-colors"
                        title="Limpar Camada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (layers.length > 1) {
                            setLayers(prev => prev.filter(l => l.id !== layer.id));
                            if (activeLayerId === layer.id) setActiveLayerId(layers[0].id);
                          }
                        }}
                        className="p-1.5 hover:bg-[#f23f42] hover:text-white text-[#f23f42] rounded-lg transition-colors"
                        title="Excluir Camada"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {!layer.isFolder && (
                    <div className="flex items-center space-x-3 mt-2">
                      <select 
                        value={layer.blendMode}
                        onChange={(e) => {
                          e.stopPropagation();
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, blendMode: e.target.value as GlobalCompositeOperation } : l));
                        }}
                        className="text-xs bg-[#0e0e10] border-none rounded-lg px-2 py-1 outline-none text-[#ffffff] w-28"
                      >
                        {BLEND_MODES_MAP.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input 
                        type="range" min="0" max="100" 
                        value={layer.opacity * 100}
                        onChange={(e) => {
                          e.stopPropagation();
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: (parseInt(e.target.value) || 0) / 100 } : l));
                        }}
                        className="flex-1 h-1 bg-[#0e0e10] rounded-full appearance-none cursor-pointer accent-[#5865f2]"
                      />
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); flipLayer(layer.id, 'x'); }}
                          className="p-1 hover:bg-[#1e1f22] rounded text-[#949ba4] hover:text-white"
                          title="Inverter Horizontal"
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); flipLayer(layer.id, 'y'); }}
                          className="p-1 hover:bg-[#1e1f22] rounded text-[#949ba4] hover:text-white"
                          title="Inverter Vertical"
                        >
                          <FlipVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Canvas Size Settings */}
            <div className="p-4 border-t border-[#1e1f22] bg-[#1e1f22]/10">
              <div className="flex items-center space-x-2 mb-2">
                <Maximize2 className="w-3 h-3 text-[#949ba4]" />
                <span className="text-[10px] font-bold uppercase text-[#949ba4]">Tamanho da Tela</span>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  value={canvasSize.width || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) resizeCanvas(val, canvasSize.height);
                  }}
                  className="w-full bg-[#1e1f22] border-none rounded px-2 py-1 text-[10px] outline-none text-[#ffffff]"
                />
                <span className="text-[#949ba4]">x</span>
                <input 
                  type="number" 
                  value={canvasSize.height || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) resizeCanvas(canvasSize.width, val);
                  }}
                  className="w-full bg-[#1e1f22] border-none rounded px-2 py-1 text-[10px] outline-none text-[#ffffff]"
                />
                <div className="relative group">
                  <div 
                    className="w-6 h-6 rounded border border-[#1e1f22] cursor-pointer"
                    style={{ backgroundColor: backgroundColor }}
                  />
                  <input 
                    type="color" 
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Cor de Fundo"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>
  );
};
