import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { type Flashcard } from '../types/types';
import styles from './Timeline.module.css';
import { supabase } from '../lib/supabaseClient';
import { type Category } from '../types/types';


interface TimelineProps {
  cards: Flashcard[];
}

const ABSOLUTE_MIN_YEAR = -4000;
const ABSOLUTE_MAX_YEAR = 2500;

const COLOR_PALETTE = ['#88c0d0', '#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'];

const getColorByKey = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash * 31 + key.charCodeAt(i)) & 0xffffffff) >>> 0;
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
};

const getContrastText = (hexcolor: string): string => {
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  return yiq >= 128 ? '#1a1a1a' : '#ffffff';
};

const parseYear = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
};

const getLayoutConstants = (containerWidth: number) => {
  const isMobile = containerWidth < 768;
  return {
    START_BUFFER: isMobile ? 40 : 80,
    END_BUFFER: isMobile ? 40 : 80,
    AXIS_BOTTOM: 30,
    ERA_HEIGHT: 18,
    ERA_GAP: 4,
    LABEL_WIDTH: isMobile ? 80 : 100,
    HEIGHT_WITH_DATE: 42,
    HEIGHT_NO_DATE: 28,
    HEIGHT_DIAMOND_ADD: 16,
    VERTICAL_GAP: isMobile ? 4 : 6,
  };
};

interface CalculatedItem extends Flashcard {
  left: number;
  bottom: number;
  isRange: boolean;
  showYear?: boolean;
  width?: number;
  isFloating?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ cards }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pixelsPerYear, setPixelsPerYear] = useState<number>(2);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [scrollPos, setScrollPos] = useState<number>(0);
  const scrollRafRef = useRef<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomAnchor = useRef<{ year: number, mouseOffset: number } | null>(null);

  const initPhase = useRef(0);

  const dragRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const touchPinchRef = useRef<{ startDist: number, startZoom: number, midX: number } | null>(null);

  const lastWheelTime = useRef<number>(0);

  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layoutConstants = useMemo(() => getLayoutConstants(containerWidth), [containerWidth]);
  const { AXIS_BOTTOM } = layoutConstants;

  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
      });
    };
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    };
  }, []);

  // --- CORE LAYOUT ENGINE ---
  const { items, totalWidth, canvasHeight, dataMinYear, dataSpan } = useMemo(() => {
    const { START_BUFFER, END_BUFFER, AXIS_BOTTOM, ERA_HEIGHT, ERA_GAP, LABEL_WIDTH, HEIGHT_WITH_DATE, HEIGHT_NO_DATE, HEIGHT_DIAMOND_ADD, VERTICAL_GAP } = layoutConstants;

    const datedCards = cards.filter(c => parseYear(c.start_year) !== null);
    const years = datedCards.flatMap(c => [parseYear(c.start_year), parseYear(c.end_year)]).filter(y => y !== null) as number[];

    const dataMin = years.length > 0 ? Math.min(...years) : 0;
    let dataMax = years.length > 0 ? Math.max(...years) : 0;
    if (dataMax === dataMin) dataMax = dataMin + 10;
    const dataSpan = dataMax - dataMin;

    const eras = datedCards.filter(c => parseYear(c.end_year) !== null);
    const points = datedCards.filter(c => parseYear(c.end_year) === null);

    eras.sort((a, b) => (parseYear(a.start_year) || 0) - (parseYear(b.start_year) || 0) || a.id.localeCompare(b.id));
    points.sort((a, b) => (parseYear(a.start_year) || 0) - (parseYear(b.start_year) || 0) || a.id.localeCompare(b.id));

    const eraLanes: number[] = [];
    let maxEraTop = AXIS_BOTTOM;

    const calculatedEras = eras.map(card => {
      const start = parseYear(card.start_year)!;
      const end = parseYear(card.end_year)!;
      const left = (start - ABSOLUTE_MIN_YEAR) * pixelsPerYear + START_BUFFER;
      const width = Math.max((end - start) * pixelsPerYear, 10);

      let lane = 0;
      while (eraLanes[lane] > start) { lane++; }
      eraLanes[lane] = end;

      const bottom = AXIS_BOTTOM + (lane * (ERA_HEIGHT + ERA_GAP));
      maxEraTop = Math.max(maxEraTop, bottom + ERA_HEIGHT);

      return { ...card, left, width, bottom, isRange: true };
    }) as CalculatedItem[];

    const placedBoxes: { left: number, right: number, bottom: number, ceiling: number }[] = [];
    let maxPointTop = maxEraTop;

    const lastCardPerYear = new Map<number, string>();
    points.forEach(card => lastCardPerYear.set(parseYear(card.start_year)!, card.id));

    const calculatedPoints = points.map(card => {
      const start = parseYear(card.start_year)!;
      const showYear = lastCardPerYear.get(start) === card.id;
      const labelHeight = showYear ? HEIGHT_WITH_DATE : HEIGHT_NO_DATE;

      const centerX = (start - ABSOLUTE_MIN_YEAR) * pixelsPerYear + START_BUFFER;
      const halfWidth = LABEL_WIDTH / 2;
      const itemLeft = centerX - halfWidth;
      const itemRight = centerX + halfWidth;

      let highestEraTop = AXIS_BOTTOM;
      for (const era of calculatedEras) {
        if (parseYear(era.start_year)! <= start && parseYear(era.end_year)! >= start) {
          if (era.bottom + ERA_HEIGHT > highestEraTop) highestEraTop = era.bottom + ERA_HEIGHT;
        }
      }

      const baseGround = highestEraTop + 4;
      const obstacles = placedBoxes.filter(box => !(itemRight < box.left || itemLeft > box.right));

      const candidates = [baseGround];
      obstacles.forEach(ob => candidates.push(ob.ceiling + VERTICAL_GAP));
      candidates.sort((a, b) => a - b);

      let landHeight = baseGround;
      let actualHeightUsed = labelHeight;

      for (const y of candidates) {
        if (y < baseGround) continue;
        const isAtBottom = Math.abs(y - baseGround) < 1;
        const currentHeight = labelHeight + (isAtBottom ? HEIGHT_DIAMOND_ADD : 0);

        const collision = obstacles.some(ob => {
          return !(y >= ob.ceiling + VERTICAL_GAP - 1 || (y + currentHeight + VERTICAL_GAP) <= ob.bottom + 1);
        });

        if (!collision) {
          landHeight = y;
          actualHeightUsed = currentHeight;
          break;
        }
      }

      placedBoxes.push({ left: itemLeft, right: itemRight, bottom: landHeight, ceiling: landHeight + actualHeightUsed });
      if (landHeight + actualHeightUsed > maxPointTop) maxPointTop = landHeight + actualHeightUsed;

      const isFloating = landHeight > baseGround + 5;

      return { ...card, left: centerX, bottom: landHeight, showYear, isFloating, isRange: false } as CalculatedItem;
    });

    const totalWidth = ((ABSOLUTE_MAX_YEAR - ABSOLUTE_MIN_YEAR) * pixelsPerYear) + START_BUFFER + END_BUFFER;

    return {
      items: [...calculatedEras, ...calculatedPoints].sort((a, b) => b.bottom - a.bottom),
      totalWidth,
      canvasHeight: Math.max(500, maxPointTop + 100),
      dataMinYear: dataMin,
      dataSpan
    };
  }, [cards, pixelsPerYear, layoutConstants]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    // Create a fast lookup dictionary for category colors
    const catDict = new Map(categories.map(c => [c.id, c.color]));

    items.forEach(item => {
      if (item.category_id && catDict.has(item.category_id)) {
        // 1. Use the Category Color if it exists!
        map.set(item.id, catDict.get(item.category_id)!);
      } else {
        // 2. Fallback to the random hashed color
        map.set(item.id, getColorByKey(item.start_year ? String(item.start_year) : item.id));
      }
    });
    return map;
  }, [items, categories]);

  //keep this
  // const colorMap = useMemo(() => {
  //   const map = new Map<string, string>();
  //   items.forEach(item => map.set(item.id, getColorByKey(item.start_year ? String(item.start_year) : item.id)));
  //   return map;
  // }, [items]);

  const markers = useMemo(() => {
    const rawStep = 80 / pixelsPerYear;
    const niceSteps = [5, 10, 20, 25, 50, 100, 250, 500, 1000, 2000, 5000];
    const step = niceSteps.find(s => s >= rawStep) || niceSteps[niceSteps.length - 1];

    // 1. Calculate the visible boundaries based on scroll position
    const visibleStartYear = ((scrollPos - layoutConstants.START_BUFFER) / pixelsPerYear) + ABSOLUTE_MIN_YEAR;
    const visibleEndYear = visibleStartYear + (containerWidth / pixelsPerYear);

    // 2. Add a rendering buffer (e.g., 2 screen widths on either side)
    const yearSpan = visibleEndYear - visibleStartYear;
    const renderStartYear = Math.max(ABSOLUTE_MIN_YEAR, visibleStartYear - yearSpan);
    const renderEndYear = Math.min(ABSOLUTE_MAX_YEAR, visibleEndYear + yearSpan);

    const firstMarker = Math.ceil(renderStartYear / step) * step;
    const lastMarker = Math.floor(renderEndYear / step) * step;

    const m = [];
    for (let y = firstMarker; y <= lastMarker; y += step) {
      m.push({ year: y, left: (y - ABSOLUTE_MIN_YEAR) * pixelsPerYear + layoutConstants.START_BUFFER });
    }
    return m;
  }, [pixelsPerYear, layoutConstants, scrollPos, containerWidth]);

  // --- PHASE 1. INITIALIZATION: CALCULATE ZOOM ---
  useEffect(() => {
    if (initPhase.current === 0 && containerWidth > 0 && dataSpan > 0) {
      const idealZoom = (containerWidth - layoutConstants.START_BUFFER - layoutConstants.END_BUFFER) / dataSpan;
      const clampedZoom = Math.min(Math.max(idealZoom, 0.1), 50);

      setPixelsPerYear(clampedZoom);
      initPhase.current = 1;
    }
  }, [containerWidth, dataSpan, layoutConstants]);

  // --- PHASE 2. TELEPORT SCROLL (FIREFOX SAFE) ---
  useLayoutEffect(() => {
    if (initPhase.current === 1 && containerRef.current && totalWidth > 0) {
      const targetScrollLeft = (dataMinYear - ABSOLUTE_MIN_YEAR) * pixelsPerYear;
      const el = containerRef.current;

      el.scrollLeft = targetScrollLeft;
      el.scrollTop = el.scrollHeight;

      let attempts = 0;
      const forceScroll = () => {
        if (!containerRef.current) return;

        if (containerRef.current.scrollLeft < targetScrollLeft - 10 && attempts < 15) {
          containerRef.current.scrollLeft = targetScrollLeft;
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
          attempts++;
          setTimeout(forceScroll, 20);
        } else {
          setScrollPos(containerRef.current.scrollLeft);
          initPhase.current = 2;
        }
      };

      forceScroll();
    }
  }, [pixelsPerYear, totalWidth, dataMinYear]);

  // --- VERTICAL GROUNDING ---
  const prevCanvasHeight = useRef(canvasHeight);
  useLayoutEffect(() => {
    if (containerRef.current && initPhase.current === 2) {
      const heightDiff = canvasHeight - prevCanvasHeight.current;
      if (heightDiff !== 0) {
        containerRef.current.scrollTop += heightDiff;
      }
    }
    prevCanvasHeight.current = canvasHeight;
  }, [canvasHeight]);


  // --- MANUAL ZOOM HORIZONTAL ANCHORING ---
  useLayoutEffect(() => {
    if (initPhase.current === 2 && containerRef.current && zoomAnchor.current) {
      const { year, mouseOffset } = zoomAnchor.current;
      const newCanvasX = (year - ABSOLUTE_MIN_YEAR) * pixelsPerYear + layoutConstants.START_BUFFER;
      containerRef.current.scrollLeft = newCanvasX - mouseOffset;
      zoomAnchor.current = null;
    }
  }, [pixelsPerYear, layoutConstants]);

  const handleZoom = useCallback((zoomDelta: number, mouseX: number) => {
    if (initPhase.current !== 2) return;

    setPixelsPerYear(prev => {
      const newZoom = Math.min(Math.max(prev * zoomDelta, 0.1), 50);
      if (newZoom !== prev) {
        const canvasX = containerRef.current!.scrollLeft + mouseX;
        const anchorYear = ((canvasX - layoutConstants.START_BUFFER) / prev) + ABSOLUTE_MIN_YEAR;
        zoomAnchor.current = { year: anchorYear, mouseOffset: mouseX };
      }
      return newZoom;
    });
  }, [layoutConstants]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;

    const now = Date.now();
    if (now - lastWheelTime.current < 20) return;
    lastWheelTime.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    handleZoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - rect.left);
  };

  const handleButtonZoom = (delta: number) => {
    if (!containerRef.current) return;
    handleZoom(delta, containerRef.current.clientWidth / 2);
  };

  const handleRecenter = useCallback(() => {
    if (!containerRef.current || dataSpan === 0) return;

    // 1. Recalculate the ideal zoom to fit the current deck
    const idealZoom = (containerWidth - layoutConstants.START_BUFFER - layoutConstants.END_BUFFER) / dataSpan;
    const clampedZoom = Math.min(Math.max(idealZoom, 0.1), 50);

    // 2. Apply the zoom
    setPixelsPerYear(clampedZoom);

    // 3. Calculate where the start of the deck is on the new zoom scale
    const targetScrollLeft = (dataMinYear - ABSOLUTE_MIN_YEAR) * clampedZoom;

    // 4. Give React a tiny moment to update the canvas width, then smooth scroll
    setTimeout(() => {
      containerRef.current?.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }, 50);
  }, [containerWidth, dataSpan, layoutConstants, dataMinYear]);

  const handleScroll = useCallback(() => {
    if (initPhase.current !== 2 || !containerRef.current) return;

    // requestAnimationFrame ensures we don't spam the state on mobile
    if (!scrollRafRef.current) {
      scrollRafRef.current = requestAnimationFrame(() => {
        setScrollPos(containerRef.current!.scrollLeft);
        scrollRafRef.current = null;
      });
    }
  }, []);


  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    handleZoom(1.5, e.clientX - rect.left);
  };

  // --- TOUCH & MOUSE HANDLERS ---
  const getPinchData = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return {
      dist: Math.sqrt(dx * dx + dy * dy),
      midX: (touches[0].clientX + touches[1].clientX) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && containerRef.current && initPhase.current === 2) {
      const { dist, midX } = getPinchData(e.touches);
      const rect = containerRef.current.getBoundingClientRect();
      touchPinchRef.current = { startDist: dist, startZoom: pixelsPerYear, midX: midX - rect.left };
    } else {
      touchPinchRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchPinchRef.current && containerRef.current && initPhase.current === 2) {
      const { dist } = getPinchData(e.touches);
      const { startDist, startZoom, midX } = touchPinchRef.current;

      const scale = dist / startDist;
      const newZoom = Math.min(Math.max(startZoom * scale, 0.1), 50);

      if (newZoom !== pixelsPerYear) {
        const canvasX = containerRef.current.scrollLeft + midX;
        const anchorYear = ((canvasX - layoutConstants.START_BUFFER) / pixelsPerYear) + ABSOLUTE_MIN_YEAR;

        zoomAnchor.current = { year: anchorYear, mouseOffset: midX };
        setPixelsPerYear(newZoom);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    dragRef.current = { isDragging: true, startX: e.pageX, scrollLeft: containerRef.current.scrollLeft };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDragging || !containerRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - dragRef.current.startX) * 1.5;
    containerRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const handleMouseUp = () => dragRef.current.isDragging = false;

  if (items.length === 0) return <div className={styles.empty}>No dates found.</div>;

  const handleTripleClickZoom = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (initPhase.current !== 2 || !containerRef.current) return;

    // Track the number of rapid clicks
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current === 3) {
      // 3 clicks detected! Reset the counter.
      clickCountRef.current = 0;

      // Get the clientX whether it's a mouse event or a touch event
      let clientX = 0;
      if ('touches' in e) {
        // Optional: you can attach this to onTouchEnd if you prefer, 
        // but for onClick, React handles mobile taps as MouseEvents anyway.
        clientX = e.changedTouches[0].clientX;
      } else {
        clientX = (e as React.MouseEvent).clientX;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = clientX - rect.left;

      // Calculate the exact year at the pointer position
      const canvasX = containerRef.current.scrollLeft + mouseX;
      const anchorYear = ((canvasX - layoutConstants.START_BUFFER) / pixelsPerYear) + ABSOLUTE_MIN_YEAR;

      // Leverage your existing anchor effect
      zoomAnchor.current = { year: anchorYear, mouseOffset: mouseX };

      // Instantly jump to max zoom
      setPixelsPerYear(30);
    } else {
      // Give the user 500ms to complete the 3 taps before resetting
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  }, [pixelsPerYear, layoutConstants]);


  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <button onClick={() => handleButtonZoom(0.6)}>−</button>
        <span className={styles.zoomLabel}>{Math.round(pixelsPerYear * 10) / 10}x</span>
        <button onClick={() => handleButtonZoom(1.6)}>+</button>
        <button onClick={handleRecenter} title="Center on Deck" style={{ marginLeft: '10px' }}>
          ⌖
        </button>
      </div>

      <div
        className={styles.scrollContainer}
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={handleTripleClickZoom}
        onDoubleClick={handleDoubleClick}
        onScroll={handleScroll}
        style={{ cursor: dragRef.current.isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className={styles.timelineCanvas}
          style={{ width: `${Math.max(totalWidth, 100)}px`, minWidth: '100%', height: `${canvasHeight}px` }}
        >
          <div className={styles.axisLine} style={{ bottom: `${AXIS_BOTTOM}px` }}></div>

          {markers.map(m => (
            <div key={`marker-${m.year}`} className={styles.axisMarker} style={{ left: `${m.left}px`, bottom: `${AXIS_BOTTOM - 25}px` }}>
              <div className={styles.markerTick}></div>
              <div className={styles.markerLabel}>{m.year}</div>
            </div>
          ))}

          {items.map((item: CalculatedItem) => {
            const color = colorMap.get(item.id) ?? COLOR_PALETTE[0];
            const isActive = activeId === item.id;

            if (item.isRange) {
              const textColor = getContrastText(color);
              const lineDropHeight = 15 + 18 + item.bottom;
              
              // NEW: Determine shadow based on the text color
              const textShadow = textColor === '#ffffff' ? '1px 1px 2px rgba(0, 0, 0, 0.8)' : 'none';

              return (
                <div
                  key={item.id}
                  className={`${styles.item} ${styles.range} ${isActive ? styles.isActive : ''}`}
                  style={{ left: `${item.left}px`, width: `${item.width}px`, bottom: `${item.bottom}px`, backgroundColor: color }}
                  onClick={(e) => { e.stopPropagation(); setActiveId(item.id); setTimeout(() => setActiveId(null), 5000); }}
                >
                  <div className={styles.rangeContent}>
                    {/* UPDATED: Apply the dynamic textShadow here */}
                    <span 
                      className={styles.eraTitle} 
                      style={{ color: textColor, backgroundColor: color, textShadow: textShadow }}
                    >
                      {item.title || item.front}
                    </span>
                  </div>

                  <div className={styles.eraGuideStart}>
                    <div className={styles.eraGuideLabel} style={{ backgroundColor: color, color: textColor }}>
                      {item.start_year}
                    </div>
                    <div
                      className={styles.eraGuideLine}
                      style={{ backgroundColor: color, height: `${lineDropHeight}px` }}
                    />
                  </div>

                  <div className={styles.eraGuideEnd}>
                    <div className={styles.eraGuideLabel} style={{ backgroundColor: color, color: textColor }}>
                      {item.end_year}
                    </div>
                    <div
                      className={styles.eraGuideLine}
                      style={{ backgroundColor: color, height: `${lineDropHeight}px` }}
                    />
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={item.id}
                  className={`${styles.pointWrapper} ${isActive ? styles.isActive : ''}`}
                  style={{ left: `${item.left}px`, bottom: `${item.bottom}px` }}
                  onClick={(e) => { e.stopPropagation(); setActiveId(item.id); setTimeout(() => setActiveId(null), 5000); }}
                >
                  <div className={styles.pointLabel} style={{ borderBottom: `3px solid ${color}` }}>
                    {item.showYear && <span className={styles.pointDate}>{item.start_year}</span>}
                    <span className={styles.pointTitle}>{item.title || item.front}</span>
                  </div>
                  {!item.isFloating && <div className={styles.pointShape} style={{ backgroundColor: color }}></div>}
                  <div className={styles.connector} style={{ height: `${item.bottom}px` }} />
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;