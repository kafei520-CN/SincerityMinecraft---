/** 原版贴图，放在 public/icons。百科标题用中文维基的页面名。 */
export type MarkerIcon = {
  src: string;
  wiki: string;
};

const ICONS: Record<number, MarkerIcon> = {
  5: {src: '/icons/village.png', wiki: '村庄'},
  6: {src: '/icons/ocean_ruin.png', wiki: '海底废墟'},
  7: {src: '/icons/shipwreck.png', wiki: '沉船'},
  1: {src: '/icons/desert.png', wiki: '沙漠神殿'},
  2: {src: '/icons/jungle.png', wiki: '丛林神庙'},
  3: {src: '/icons/hut.png', wiki: '沼泽小屋'},
  4: {src: '/icons/igloo.png', wiki: '雪屋'},
  8: {src: '/icons/monument.png', wiki: '海底神殿'},
  9: {src: '/icons/mansion.png', wiki: '林地府邸'},
  10: {src: '/icons/outpost.png', wiki: '掠夺者前哨站'},
  11: {src: '/icons/portal.png', wiki: '废弃传送门'},
  12: {src: '/icons/nether_portal.png', wiki: '废弃传送门'},
  14: {src: '/icons/treasure.png', wiki: '埋藏的宝藏'},
  15: {src: '/icons/mineshaft.png', wiki: '废弃矿井'},
  16: {src: '/icons/well.png', wiki: '沙漠水井'},
  17: {src: '/icons/geode.png', wiki: '紫晶洞'},
  13: {src: '/icons/ancient.png', wiki: '远古城市'},
  24: {src: '/icons/trail.png', wiki: '古迹废墟'},
  25: {src: '/icons/trial.png', wiki: '试炼密室'},
  26: {src: '/icons/camp.png', wiki: '废弃营地'},
  18: {src: '/icons/fortress.png', wiki: '下界要塞'},
  19: {src: '/icons/bastion.png', wiki: '堡垒遗迹'},
  20: {src: '/icons/fossil.png', wiki: '下界化石'},
  21: {src: '/icons/end_city.png', wiki: '末地城'},
  22: {src: '/icons/gateway.png', wiki: '末地折跃门'},
};

export const SPAWN_ICON: MarkerIcon = {src: '/icons/compass.png', wiki: '世界出生点'};
export const STRONGHOLD_ICON: MarkerIcon = {src: '/icons/stronghold.png', wiki: '要塞'};
export const SLIME_ICON: MarkerIcon = {src: '/icons/slime.png', wiki: '史莱姆区块'};

export function structureIcon(id: number): MarkerIcon {
  return ICONS[id] ?? {src: '/icons/village.png', wiki: '结构'};
}

const loaded = new Map<string, HTMLImageElement>();

/** 贴图还没到就返回空，到了之后调用 onLoad 再画一次。 */
export function markerImage(src: string, onLoad: () => void): HTMLImageElement | undefined {
  let image = loaded.get(src);
  if (!image) {
    image = new Image();
    image.onload = onLoad;
    image.src = src;
    loaded.set(src, image);
  }
  if (image.complete && image.naturalWidth > 0) {
    return image;
  }
  return undefined;
}

export function wikiUrl(title: string): string {
  return `https://zh.minecraft.wiki/w/${encodeURIComponent(title)}`;
}
