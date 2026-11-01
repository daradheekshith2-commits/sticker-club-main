/** Pure crop export geometry. Inputs are in stable canvas coordinates. */
export interface CropDimensions { width: number; height: number }
export function cropExportDimensions(crop: CropDimensions,longSide=1200):CropDimensions {
 if(!Number.isFinite(crop.width)||!Number.isFinite(crop.height)||crop.width<=0||crop.height<=0)throw Error('Invalid crop size');
 if(!Number.isSafeInteger(longSide)||longSide<1||longSide>8192)throw Error('Invalid maximum output dimension');
 const ratio=crop.width/crop.height;
 return ratio>=1
  ? {width:longSide,height:Math.max(1,Math.round(longSide/ratio))}
  : {width:Math.max(1,Math.round(longSide*ratio)),height:longSide};
}
