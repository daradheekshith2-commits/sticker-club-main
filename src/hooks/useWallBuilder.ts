/**
 * Builder state for /build-your-wall.
 *
 * Supports both standard preset layouts (Compact, Classic, Studio, Large)
 * and the freeform "Create your own wall" custom layout editor.
 *
 * Manages sheet adding, dragging, resizing, orientation toggles, auto-arranging,
 * stable image fills keyed by sheet ID, and image asset lifecycle (object URLs).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { defaultLayoutId, getLayout, paperSizes, type PaperSizeId, type WallLayout, type WallSlot } from '../data/wallLayouts';
import {
  autoArrangeSlots,
  clampSlotPosition,
  createCustomSlot,
  createCustomWallLayout,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  findNextOpenPosition,
  generateSlotId,
  getOverlappingSlotIds,
  getSlotDimensions,
  MAX_CUSTOM_SHEETS,
} from '../utils/customLayoutBuilder';
import { fillsDroppedBySwitch, initialBuilderState } from '../utils/customWall';
import { objectUrls } from '../utils/objectUrls';
import type { ImageFit, PosterCropEdit, SlotFill } from '../types/wall';

const STORAGE_KEY = 'stickerclub_wall_builder_state_v1';

const releaseIfUpload = (fill: SlotFill | null | undefined) => {
  if (fill?.source === 'upload') objectUrls.release(fill.objectUrl);
};

export interface WallBuilderState {
  layoutId: string;
  presetFills: (SlotFill | null)[];
  customSlots: WallSlot[];
  customFills: Record<string, SlotFill | null>;
  selected: number;
  notice: string | null;
}

type BuilderAction =
  | { type: 'chooseLayout'; layoutId: string }
  | { type: 'select'; index: number }
  | { type: 'setFill'; index: number; fill: SlotFill }
  | { type: 'clearFill'; index: number }
  | { type: 'setFit'; index: number; fit: ImageFit }
  | { type: 'setEdit'; index: number; edit: PosterCropEdit }
  | { type: 'addCustomSheet'; size: PaperSizeId; orientation?: 'portrait' | 'landscape' }
  | { type: 'removeCustomSheet'; index: number }
  | { type: 'duplicateCustomSheet'; index: number }
  | { type: 'changeCustomSheetSize'; index: number; newSize: PaperSizeId }
  | { type: 'toggleCustomSheetOrientation'; index: number }
  | { type: 'moveCustomSheet'; index: number; x: number; y: number }
  | { type: 'nudgeCustomSheet'; index: number; dx: number; dy: number }
  | { type: 'autoArrangeCustom' }
  | { type: 'clearCustom' }
  | { type: 'reset' }
  | { type: 'restore'; state: WallBuilderState };

export function getInitialState(startLayoutId: string): WallBuilderState {
  // Check localStorage for saved session
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.layoutId === 'string') {
        return {
          layoutId: parsed.layoutId,
          presetFills: Array.isArray(parsed.presetFills) ? parsed.presetFills : [],
          customSlots: Array.isArray(parsed.customSlots) ? parsed.customSlots : [],
          customFills: parsed.customFills && typeof parsed.customFills === 'object' ? parsed.customFills : {},
          selected: typeof parsed.selected === 'number' ? parsed.selected : 0,
          notice: null,
        };
      }
    }
  } catch {
    // Ignore storage errors
  }

  const base = initialBuilderState(startLayoutId);
  return {
    layoutId: startLayoutId,
    presetFills: base.fills,
    customSlots: [],
    customFills: {},
    selected: 0,
    notice: null,
  };
}

export function wallReducer(state: WallBuilderState, action: BuilderAction): WallBuilderState {
  switch (action.type) {
    case 'chooseLayout': {
      if (action.layoutId === state.layoutId) return state;

      // Switching TO custom mode
      if (action.layoutId === 'custom') {
        let customSlots = state.customSlots;
        let customFills = { ...state.customFills };

        // If custom slots were empty, convert current preset's layout and fills seamlessly
        if (customSlots.length === 0) {
          const currentLayout = getLayout(state.layoutId);
          if (currentLayout && currentLayout.slots.length > 0) {
            customSlots = currentLayout.slots.map((s, idx) => ({
              ...s,
              id: generateSlotId(),
              number: idx + 1,
              orientation: s.orientation ?? 'portrait',
            }));
            customSlots.forEach((slot, idx) => {
              customFills[slot.id] = state.presetFills[idx] ?? null;
            });
          }
        }

        return {
          ...state,
          layoutId: 'custom',
          customSlots,
          customFills,
          selected: Math.min(state.selected, Math.max(0, customSlots.length - 1)),
          notice: 'Switched to custom layout. Add, resize, and freely arrange your posters.',
        };
      }

      // Switching FROM custom mode OR between presets
      const newLayout = getLayout(action.layoutId);
      if (!newLayout) return state;

      const newCount = newLayout.slots.length;
      let newPresetFills: (SlotFill | null)[] = [];

      if (state.layoutId === 'custom') {
        // Transfer fills from custom slots in slot order
        newPresetFills = Array.from({ length: newCount }, (_, i) => {
          const slot = state.customSlots[i];
          return slot ? state.customFills[slot.id] ?? null : null;
        });

        const transferred = newPresetFills.filter(Boolean).length;
        const totalCustomFilled = Object.values(state.customFills).filter(Boolean).length;
        const dropped = Math.max(0, totalCustomFilled - transferred);

        return {
          ...state,
          layoutId: action.layoutId,
          presetFills: newPresetFills,
          selected: Math.min(state.selected, newCount - 1),
          notice: dropped > 0 ? `${dropped} filled images exceeded ${newCount} preset positions.` : null,
        };
      }

      // Between presets: keep existing order
      const fills = Array.from({ length: newCount }, (_, i) => state.presetFills[i] ?? null);
      const dropped = fillsDroppedBySwitch({ layoutId: state.layoutId, fills: state.presetFills, selected: state.selected, notice: null }, newCount).length;
      const added = Math.max(0, newCount - state.presetFills.length);
      const parts: string[] = [];
      if (dropped) parts.push(`${dropped} ${dropped === 1 ? 'image was' : 'images were'} removed because this layout has only ${newCount} positions`);
      if (added && state.presetFills.some(Boolean)) parts.push(`${added} new empty ${added === 1 ? 'position' : 'positions'} added`);

      return {
        ...state,
        layoutId: action.layoutId,
        presetFills: fills,
        selected: Math.min(state.selected, newCount - 1),
        notice: parts.length ? `${parts.join('; ')}. Your other images kept their positions.` : null,
      };
    }

    case 'select': {
      const maxIndex = state.layoutId === 'custom' ? Math.max(0, state.customSlots.length - 1) : Math.max(0, (getLayout(state.layoutId)?.slots.length ?? 1) - 1);
      return { ...state, selected: Math.max(0, Math.min(action.index, maxIndex)) };
    }

    case 'setFill': {
      if (state.layoutId === 'custom') {
        const slot = state.customSlots[action.index];
        if (!slot) return state;
        return {
          ...state,
          customFills: {
            ...state.customFills,
            [slot.id]: action.fill,
          },
          notice: null,
        };
      }
      const presetFills = [...state.presetFills];
      presetFills[action.index] = action.fill;
      return { ...state, presetFills, notice: null };
    }

    case 'clearFill': {
      if (state.layoutId === 'custom') {
        const slot = state.customSlots[action.index];
        if (!slot) return state;
        const nextFills = { ...state.customFills };
        delete nextFills[slot.id];
        return { ...state, customFills: nextFills };
      }
      const presetFills = [...state.presetFills];
      presetFills[action.index] = null;
      return { ...state, presetFills };
    }

    case 'setFit': {
      if (state.layoutId === 'custom') {
        const slot = state.customSlots[action.index];
        if (!slot) return state;
        const current = state.customFills[slot.id];
        if (!current) return state;
        return {
          ...state,
          customFills: {
            ...state.customFills,
            [slot.id]: { ...current, fit: action.fit },
          },
        };
      }
      const current = state.presetFills[action.index];
      if (!current) return state;
      const presetFills = [...state.presetFills];
      presetFills[action.index] = { ...current, fit: action.fit };
      return { ...state, presetFills };
    }

    case 'setEdit': {
      if (state.layoutId === 'custom') {
        const slot = state.customSlots[action.index];
        if (!slot) return state;
        const current = state.customFills[slot.id];
        if (!current) return state;
        const updatedFit: ImageFit = current.fit
          ? { ...current.fit, mode: action.edit.mode }
          : { mode: action.edit.mode, focusX: 50, focusY: 50 };
        return {
          ...state,
          customFills: {
            ...state.customFills,
            [slot.id]: {
              ...current,
              fit: updatedFit,
              edit: action.edit,
            },
          },
        };
      }
      const current = state.presetFills[action.index];
      if (!current) return state;
      const updatedFit: ImageFit = current.fit
        ? { ...current.fit, mode: action.edit.mode }
        : { mode: action.edit.mode, focusX: 50, focusY: 50 };
      const presetFills = [...state.presetFills];
      presetFills[action.index] = {
        ...current,
        fit: updatedFit,
        edit: action.edit,
      };
      return { ...state, presetFills };
    }

    case 'addCustomSheet': {
      if (state.customSlots.length >= MAX_CUSTOM_SHEETS) return state;
      const orientation = action.orientation ?? 'portrait';
      const pos = findNextOpenPosition(state.customSlots, action.size, orientation);
      const newSlot = createCustomSlot(action.size, pos.x, pos.y, orientation, state.customSlots.length + 1);
      const nextSlots = [...state.customSlots, newSlot];

      return {
        ...state,
        layoutId: 'custom',
        customSlots: nextSlots,
        selected: nextSlots.length - 1,
        notice: null,
      };
    }

    case 'removeCustomSheet': {
      const slotToRemove = state.customSlots[action.index];
      if (!slotToRemove) return state;

      const nextSlots = state.customSlots
        .filter((_, idx) => idx !== action.index)
        .map((s, idx) => ({ ...s, number: idx + 1 }));

      const nextFills = { ...state.customFills };
      const fillToRemove = nextFills[slotToRemove.id];
      if (fillToRemove?.source === 'upload') {
        objectUrls.release(fillToRemove.objectUrl);
      }
      delete nextFills[slotToRemove.id];

      return {
        ...state,
        customSlots: nextSlots,
        customFills: nextFills,
        selected: Math.max(0, Math.min(action.index, nextSlots.length - 1)),
      };
    }

    case 'duplicateCustomSheet': {
      if (state.customSlots.length >= MAX_CUSTOM_SHEETS) return state;
      const orig = state.customSlots[action.index];
      if (!orig) return state;

      const dupId = generateSlotId();
      const dupSlot = clampSlotPosition(
        {
          ...orig,
          id: dupId,
          number: state.customSlots.length + 1,
          x: orig.x + 3,
          y: orig.y + 3,
        },
        DEFAULT_CANVAS_WIDTH + 30,
        DEFAULT_CANVAS_HEIGHT + 30
      );

      const nextSlots = [...state.customSlots, dupSlot];
      const nextFills = { ...state.customFills };
      const origFill = state.customFills[orig.id];
      if (origFill) {
        if (origFill.source === 'upload') {
          objectUrls.retain(origFill.objectUrl);
        }
        nextFills[dupId] = {
          ...origFill,
          fit: origFill.fit ? { ...origFill.fit } : { mode: 'cover', focusX: 50, focusY: 50 },
          edit: origFill.edit ? { ...origFill.edit, crop: { ...origFill.edit.crop } } : undefined,
        };
      }

      return {
        ...state,
        customSlots: nextSlots,
        customFills: nextFills,
        selected: nextSlots.length - 1,
      };
    }

    case 'changeCustomSheetSize': {
      const target = state.customSlots[action.index];
      if (!target || target.size === action.newSize) return state;

      const orientation = target.orientation ?? 'portrait';
      const dims = getSlotDimensions(action.newSize, orientation);
      const updatedSlot = clampSlotPosition(
        {
          ...target,
          size: action.newSize,
          w: dims.w,
          h: dims.h,
        },
        DEFAULT_CANVAS_WIDTH + 30,
        DEFAULT_CANVAS_HEIGHT + 30
      );

      const nextSlots = [...state.customSlots];
      nextSlots[action.index] = updatedSlot;

      return {
        ...state,
        customSlots: nextSlots,
      };
    }

    case 'toggleCustomSheetOrientation': {
      const target = state.customSlots[action.index];
      if (!target) return state;

      const currentOrientation = target.orientation ?? 'portrait';
      const nextOrientation: 'portrait' | 'landscape' = currentOrientation === 'portrait' ? 'landscape' : 'portrait';
      const p = paperSizes[target.size];
      const nextW = nextOrientation === 'landscape' ? p.h : p.w;
      const nextH = nextOrientation === 'landscape' ? p.w : p.h;

      const updatedSlot = clampSlotPosition(
        {
          ...target,
          orientation: nextOrientation,
          w: nextW,
          h: nextH,
        },
        DEFAULT_CANVAS_WIDTH + 30,
        DEFAULT_CANVAS_HEIGHT + 30
      );

      const nextSlots = [...state.customSlots];
      nextSlots[action.index] = updatedSlot;

      return {
        ...state,
        customSlots: nextSlots,
      };
    }

    case 'moveCustomSheet': {
      const target = state.customSlots[action.index];
      if (!target) return state;

      const updatedSlot = clampSlotPosition(
        {
          ...target,
          x: action.x,
          y: action.y,
        },
        DEFAULT_CANVAS_WIDTH + 30,
        DEFAULT_CANVAS_HEIGHT + 30
      );

      const nextSlots = [...state.customSlots];
      nextSlots[action.index] = updatedSlot;

      return {
        ...state,
        customSlots: nextSlots,
      };
    }

    case 'nudgeCustomSheet': {
      const target = state.customSlots[action.index];
      if (!target) return state;

      const updatedSlot = clampSlotPosition(
        {
          ...target,
          x: target.x + action.dx,
          y: target.y + action.dy,
        },
        DEFAULT_CANVAS_WIDTH + 30,
        DEFAULT_CANVAS_HEIGHT + 30
      );

      const nextSlots = [...state.customSlots];
      nextSlots[action.index] = updatedSlot;

      return {
        ...state,
        customSlots: nextSlots,
      };
    }

    case 'autoArrangeCustom': {
      const arranged = autoArrangeSlots(state.customSlots);
      return {
        ...state,
        customSlots: arranged,
      };
    }

    case 'clearCustom': {
      return {
        ...state,
        customSlots: [],
        customFills: {},
        selected: 0,
      };
    }

    case 'reset': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return getInitialState(defaultLayoutId);
    }

    case 'restore':
      return action.state;

    default:
      return state;
  }
}

export function useWallBuilder(startLayoutId = defaultLayoutId) {
  const [state, dispatch] = useReducer(wallReducer, startLayoutId, getInitialState);
  const latest = useRef(state);
  latest.current = state;

  // Persist session to localStorage
  useEffect(() => {
    try {
      const toSave = {
        layoutId: state.layoutId,
        presetFills: state.presetFills.map((f) => (f?.source === 'upload' ? null : f)),
        customSlots: state.customSlots,
        customFills: Object.fromEntries(
          Object.entries(state.customFills).map(([k, v]) => [k, v?.source === 'upload' ? null : v])
        ),
        selected: state.selected,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [state]);

  // Clean up uploads on unmount
  useEffect(() => {
    return () => {
      latest.current.presetFills.forEach(releaseIfUpload);
      Object.values(latest.current.customFills).forEach(releaseIfUpload);
    };
  }, []);

  const isCustom = state.layoutId === 'custom';

  const layout: WallLayout = useMemo(() => {
    if (isCustom) {
      return createCustomWallLayout(state.customSlots);
    }
    return getLayout(state.layoutId) ?? getLayout(defaultLayoutId)!;
  }, [isCustom, state.customSlots, state.layoutId]);

  // Unified fills list strictly matching layout.slots index
  const fills: (SlotFill | null)[] = useMemo(() => {
    if (isCustom) {
      return state.customSlots.map((s) => state.customFills[s.id] ?? null);
    }
    return state.presetFills;
  }, [isCustom, state.customSlots, state.customFills, state.presetFills]);

  const overlappingSlotIds = useMemo(() => {
    if (!isCustom) return new Set<string>();
    return getOverlappingSlotIds(state.customSlots);
  }, [isCustom, state.customSlots]);

  const hasOverlaps = overlappingSlotIds.size > 0;

  // Builder actions
  const chooseLayout = useCallback((layoutId: string) => {
    dispatch({ type: 'chooseLayout', layoutId });
  }, []);

  const select = useCallback((index: number) => {
    dispatch({ type: 'select', index });
  }, []);

  const setFill = useCallback((index: number, fill: SlotFill) => {
    const old = fills[index];
    if (old !== fill) releaseIfUpload(old);
    dispatch({ type: 'setFill', index, fill });
  }, [fills]);

  const clearFill = useCallback((index: number) => {
    releaseIfUpload(fills[index]);
    dispatch({ type: 'clearFill', index });
  }, [fills]);

  const setFit = useCallback((index: number, fit: ImageFit) => {
    dispatch({ type: 'setFit', index, fit });
  }, []);

  const setEdit = useCallback((index: number, edit: PosterCropEdit) => {
    dispatch({ type: 'setEdit', index, edit });
  }, []);

  const addCustomSheet = useCallback((size: PaperSizeId, orientation?: 'portrait' | 'landscape') => {
    dispatch({ type: 'addCustomSheet', size, orientation });
  }, []);

  const removeCustomSheet = useCallback((index: number) => {
    if (isCustom) {
      const slot = state.customSlots[index];
      if (slot) releaseIfUpload(state.customFills[slot.id]);
    }
    dispatch({ type: 'removeCustomSheet', index });
  }, [isCustom, state.customSlots, state.customFills]);

  const duplicateCustomSheet = useCallback((index: number) => {
    dispatch({ type: 'duplicateCustomSheet', index });
  }, []);

  const changeCustomSheetSize = useCallback((index: number, newSize: PaperSizeId) => {
    dispatch({ type: 'changeCustomSheetSize', index, newSize });
  }, []);

  const toggleCustomSheetOrientation = useCallback((index: number) => {
    dispatch({ type: 'toggleCustomSheetOrientation', index });
  }, []);

  const moveCustomSheet = useCallback((index: number, x: number, y: number) => {
    dispatch({ type: 'moveCustomSheet', index, x, y });
  }, []);

  const nudgeCustomSheet = useCallback((index: number, dx: number, dy: number) => {
    dispatch({ type: 'nudgeCustomSheet', index, dx, dy });
  }, []);

  const autoArrangeCustom = useCallback(() => {
    dispatch({ type: 'autoArrangeCustom' });
  }, []);

  const clearCustom = useCallback(() => {
    Object.values(latest.current.customFills).forEach(releaseIfUpload);
    dispatch({ type: 'clearCustom' });
  }, []);

  const reset = useCallback(() => {
    latest.current.presetFills.forEach(releaseIfUpload);
    Object.values(latest.current.customFills).forEach(releaseIfUpload);
    dispatch({ type: 'reset' });
  }, []);

  // Builder view model matching legacy interface with enhancements
  const builderViewModel = useMemo(
    () => ({
      layoutId: state.layoutId,
      fills,
      selected: Math.min(state.selected, Math.max(0, layout.slots.length - 1)),
      notice: state.notice,
      customSlots: state.customSlots,
      isCustom,
    }),
    [state.layoutId, fills, state.selected, layout.slots.length, state.notice, state.customSlots, isCustom]
  );

  return {
    state: builderViewModel,
    layout,
    isCustom,
    overlappingSlotIds,
    hasOverlaps,
    chooseLayout,
    select,
    setFill,
    clearFill,
    setFit,
    setEdit,
    addCustomSheet,
    removeCustomSheet,
    duplicateCustomSheet,
    changeCustomSheetSize,
    toggleCustomSheetOrientation,
    moveCustomSheet,
    nudgeCustomSheet,
    autoArrangeCustom,
    clearCustom,
    reset,
  };
}
