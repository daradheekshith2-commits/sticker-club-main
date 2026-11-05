/**
 * BUILD YOUR OWN WALL — /build-your-wall
 *
 * 1. Choose a layout (standard presets or "Create your own wall")
 * 2. In custom mode: add, resize, drag, reorient, and arrange A5, A4, A3 sheets
 * 3. Fill each position with one of our designs, a photo from this device,
 *    or a direct image link
 * 4. Adjust how your own images sit, check the price, add the wall to the cart
 *
 * State lives in useWallBuilder (pure logic in utils/customWall.ts & utils/customLayoutBuilder.ts).
 * Prices: A5 = ₹90, A4 = ₹120, A3 = ₹150.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { brand } from '../config/brand';
import { useCart } from '../context/CartContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useWallBuilder } from '../hooks/useWallBuilder';
import { filledCount, toWallConfig, usesOwnImages } from '../utils/customWall';
import { shopUrl } from '../utils/catalogue';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { CustomWallToolbar } from '../components/wall/CustomWallToolbar';
import { ImageSourcePanel } from '../components/wall/ImageSourcePanel';
import { WallCanvas } from '../components/wall/WallCanvas';
import { WallLayoutSelector } from '../components/wall/WallLayoutSelector';
import { WallPriceSummary } from '../components/wall/WallPriceSummary';

function Step({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-lime">{n}</span>
      <div>
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        {children && <p className="text-sm text-ink-soft">{children}</p>}
      </div>
    </div>
  );
}

export function BuildWallPage() {
  usePageMeta('Build your own wall', `Arrange our poster designs and your own photos into a custom wall with ${brand.displayName}.`);
  const {
    state,
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
  } = useWallBuilder();

  const { addCustomWall, openCart } = useCart();
  const [rights, setRights] = useState(false);
  const [added, setAdded] = useState(false);
  const filled = filledCount(state);
  const ownImages = usesOwnImages(state);

  // Confirmation applies to the images present now; new own images need a fresh tick.
  useEffect(() => {
    if (!ownImages) setRights(false);
  }, [ownImages]);

  const add = () => {
    if (hasOverlaps) return;
    const config = toWallConfig(state, rights, layout.isCustom ? layout : undefined);
    addCustomWall(config);
    reset(); // the cart keeps its own copy; start a fresh wall here
    setRights(false);
    setAdded(true);
    openCart();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 sm:pb-24">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Posters', to: shopUrl({ category: 'posters' }) }, { label: 'Build your own wall' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-none font-extrabold md:text-6xl">Build your own wall</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Pick a layout or design your own arrangement from scratch with A5, A4, and A3 sheets. Then fill each poster with one of our designs, a photo from your phone or a direct image link.
          </p>
        </div>
      </div>

      {added && (
        <p role="status" className="mt-4 max-w-3xl rounded-xl note-success p-3 text-sm font-bold">
          Your wall has been added to the cart! You can continue shopping or build another wall below.
        </p>
      )}

      {/* Step 1: Layout Selection */}
      <section aria-label="Step 1: choose a layout" className="mt-8">
        <Step n={1} title="Choose a layout">
          Select a balanced preset or start fresh with "Create your own wall".
        </Step>
        <WallLayoutSelector
          value={state.layoutId}
          onChange={chooseLayout}
          customSlotCount={state.customSlots.length}
        />
        {state.notice && (
          <p role="status" className="mt-3 rounded-xl border-2 border-tomato/40 bg-tomato/10 p-3 text-sm">
            {state.notice}
          </p>
        )}
      </section>

      {/* Custom Wall Toolbar (when in custom wall mode) */}
      {isCustom && (
        <section aria-label="Custom wall controls" className="mt-8">
          <CustomWallToolbar
            slots={state.customSlots}
            selectedIndex={state.selected}
            overlappingIds={overlappingSlotIds}
            onAddSheet={addCustomSheet}
            onRemoveSlot={removeCustomSheet}
            onDuplicateSlot={duplicateCustomSheet}
            onChangeSize={changeCustomSheetSize}
            onToggleOrientation={toggleCustomSheetOrientation}
            onNudge={nudgeCustomSheet}
            onAutoArrange={autoArrangeCustom}
            onClearAll={clearCustom}
          />
        </section>
      )}

      {/* Main Canvas & Configuration Section */}
      <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        {/* Preview: sticky on desktop so it stays in view while editing */}
        <section aria-label="Step 2: your wall preview" className="lg:sticky lg:top-24">
          <Step n={2} title={isCustom ? 'Arrange & tap a sheet to fill' : 'Tap a position to fill it'}>
            {layout.name}: {layout.slots.length} {layout.slots.length === 1 ? 'poster' : 'posters'}
            {isCustom && ' · Drag sheets freely to arrange'}
          </Step>
          <div className="overflow-hidden rounded-[var(--radius-card)] border-2 border-ink bg-[#EDE6D8] shadow-sm">
            <div className="p-2 sm:p-4">
              <WallCanvas
                layout={layout}
                fills={state.fills}
                selectedIndex={state.selected}
                onSelect={select}
                detail="full"
                label={`${layout.name} preview — ${filled} of ${layout.slots.length} positions filled`}
                isCustom={isCustom}
                onMoveSlot={moveCustomSheet}
                overlappingSlotIds={overlappingSlotIds}
                onAddFirstSheet={addCustomSheet}
              />
            </div>
            <div aria-hidden className="h-6 border-t-4 border-ink/80 bg-ink/10" />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Preview only — shows physical proportion (A5, A4, A3) and relative positioning. Prints are produced at full 300 DPI on archival matte cardstock.
          </p>
        </section>

        {/* Step 3: Fill, Adjust & Summary */}
        <div className="space-y-6">
          <div>
            <Step n={3} title="Fill and adjust" />
            <ImageSourcePanel
              layout={layout}
              index={state.selected}
              fill={state.fills[state.selected] ?? null}
              onSelect={select}
              onFill={(fill) => {
                setFill(state.selected, fill);
              }}
              onClear={() => clearFill(state.selected)}
              onFit={(fit) => setFit(state.selected, fit)}
              onEdit={(edit) => setEdit(state.selected, edit)}
            />
          </div>

          <WallPriceSummary
            layout={layout}
            filled={filled}
            usesOwnImages={ownImages}
            rightsConfirmed={rights}
            hasOverlaps={hasOverlaps}
            onRightsChange={setRights}
            onAdd={add}
          />
        </div>
      </div>
    </div>
  );
}
