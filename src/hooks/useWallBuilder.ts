/**
 * Builder state for /build-your-wall.
 *
 * Wraps the pure reducer in utils/customWall.ts and adds the one side effect
 * it can't do: freeing temporary photo URLs (blob:) when a photo is replaced,
 * removed, pushed out by a smaller layout, or when the page closes.
 * (The cart keeps its own hold on photos used by walls added to it.)
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { defaultLayoutId, getLayout } from '../data/wallLayouts';
import { builderReducer, fillsDroppedBySwitch, initialBuilderState } from '../utils/customWall';
import { objectUrls } from '../utils/objectUrls';
import type { ImageFit, SlotFill } from '../types/wall';

const releaseIfUpload = (fill: SlotFill | null | undefined) => {
  if (fill?.source === 'upload') objectUrls.release(fill.objectUrl);
};

export function useWallBuilder(startLayoutId = defaultLayoutId) {
  const [state, dispatch] = useReducer(builderReducer, startLayoutId, initialBuilderState);
  const latest = useRef(state);
  latest.current = state;

  // Free every photo the builder still holds when the page unmounts.
  useEffect(() => () => latest.current.fills.forEach(releaseIfUpload), []);

  const chooseLayout = useCallback((layoutId: string) => {
    const layout = getLayout(layoutId);
    if (!layout) return;
    fillsDroppedBySwitch(latest.current, layout.slots.length).forEach(releaseIfUpload);
    dispatch({ type: 'chooseLayout', layoutId });
  }, []);

  const select = useCallback((index: number) => dispatch({ type: 'select', index }), []);

  const setFill = useCallback((index: number, fill: SlotFill) => {
    const old = latest.current.fills[index];
    if (old !== fill) releaseIfUpload(old);
    dispatch({ type: 'setFill', index, fill });
  }, []);

  const clearFill = useCallback((index: number) => {
    releaseIfUpload(latest.current.fills[index]);
    dispatch({ type: 'clearFill', index });
  }, []);

  const setFit = useCallback((index: number, fit: ImageFit) => dispatch({ type: 'setFit', index, fit }), []);

  /** Start again with an empty wall (e.g. after adding to cart). */
  const reset = useCallback(() => {
    latest.current.fills.forEach(releaseIfUpload);
    dispatch({ type: 'reset' });
  }, []);

  return { state, layout: getLayout(state.layoutId)!, chooseLayout, select, setFill, clearFill, setFit, reset };
}
