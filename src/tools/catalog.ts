/**
 * 工具登记表。新增工具时在这里加一条，
 * 再在 pages/tools/[id].astro 里静态引入它的界面。
 */

export interface Category {
  id: string;
  name: string;
  blurb: string;
}

export interface ToolEntry {
  id: string;
  name: string;
  summary: string;
  detail: string;
  categoryId: string;
  aliases: string[];
  tags: string[];
}

export const siteName = 'SincerityMinecraft工具聚合站';

export const siteDescription = '常用的 Minecraft 小工具。计算在浏览器里完成。';

export const categories: Category[] = [
  {id: 'coords', name: '坐标', blurb: '主世界与下界'},
  {id: 'time', name: '时间', blurb: '游戏刻与昼夜'},
  {id: 'calc', name: '计算', blurb: '等级与经验'},
  {id: 'query', name: '查询', blurb: '玩家与服务器'},
  {id: 'generate', name: '生成', blurb: '公告与指令'},
  {id: 'world', name: '世界', blurb: '种子与区块'},
  {id: 'skin', name: '皮肤', blurb: '预览与渲染'},
];

export const tools: ToolEntry[] = [
  {
    id: 'nether-coords',
    name: '下界坐标',
    summary: '主世界和下界的水平坐标按 8:1 互转。',
    detail: 'X 和 Z 从主世界到下界除以 8，从下界到主世界乘以 8。Y 轴不换算。',
    categoryId: 'coords',
    aliases: ['nether', '下界', '传送门'],
    tags: ['坐标', '下界'],
  },
  {
    id: 'tick-time',
    name: '游戏刻换算',
    summary: '在游戏刻、秒和分钟之间换算。',
    detail: 'Java 版每秒 20 游戏刻。',
    categoryId: 'time',
    aliases: ['tick', 'gt', '红石'],
    tags: ['时间', '红石'],
  },
  {
    id: 'day-clock',
    name: '游戏内时间',
    summary: '把一天中的游戏刻换成钟面时间。',
    detail: '一天 24000 刻。第 0 刻是清晨 6:00，第 13000 刻进入夜晚。',
    categoryId: 'time',
    aliases: ['白天', '昼夜', 'clock'],
    tags: ['时间', '昼夜'],
  },
  {
    id: 'xp-level',
    name: '经验等级',
    summary: '查询到达某一级需要的经验，以及升到下一级还要多少。',
    detail: '按 Java 版原版经验公式计算，不含附魔和铁砧的额外消耗。',
    categoryId: 'calc',
    aliases: ['xp', '经验', '等级'],
    tags: ['经验'],
  },
  {
    id: 'uuid-skin',
    name: 'UUID 皮肤查询',
    summary: '用玩家名查出 UUID，并看到头像和皮肤。',
    detail: '查询走 playerdb。皮肤图来自 Crafatar。需要这台浏览器能访问这两个网站。',
    categoryId: 'query',
    aliases: ['uuid', 'skin', '玩家', '正版'],
    tags: ['UUID', '皮肤'],
  },
  {
    id: 'server-status',
    name: '服务器状态',
    summary: '查看 Java 或基岩服务器是否在线、人数和 MOTD。',
    detail: '状态由 mcstatus.io 代为探测。查到的是探测那一刻的结果。',
    categoryId: 'query',
    aliases: ['motd', 'ping', '服务器', '在线'],
    tags: ['服务器', 'Java', '基岩'],
  },
  {
    id: 'motd',
    name: 'MOTD 生成器',
    summary: '用颜色和样式码写出服务器公告，并直接预览。',
    detail: '输出带 § 的文本，可粘进 server.properties 的 motd。预览按原版颜色显示。',
    categoryId: 'generate',
    aliases: ['motd', '公告', '颜色代码'],
    tags: ['MOTD', '颜色'],
  },
  {
    id: 'command-gen',
    name: '指令生成器',
    summary: '按版本生成给予、召唤、传送、游戏模式、效果、时间和天气指令。',
    detail: 'Java 1.12、Java 1.13 到 1.20.4、Java 1.20.5 及更新、基岩版的写法分开。物品用英文 ID。',
    categoryId: 'generate',
    aliases: ['command', 'give', '指令', '命令'],
    tags: ['指令', '多版本'],
  },
  {
    id: 'seed-finder',
    name: '种子查找器',
    summary: '按版本画出种子地图，并标出出生点、结构和史莱姆区块。',
    detail: '计算来自 Seeder 预编译的 cubiomes。链接的 # 会记住种子、版本、维度和镜头。Java 从 Beta 1.7 到 26.3。1.18 起生物群系图也适用于基岩版。结构、要塞和史莱姆区块只对 Java 准确。',
    categoryId: 'world',
    aliases: ['seed', '种子', '史莱姆', 'slime'],
    tags: ['种子', 'Java', '地图'],
  },
  {
    id: 'skin-preview',
    name: '3D 皮肤预览',
    summary: '把皮肤转成立体模型，可切换粗手臂和细手臂。',
    detail: '可按玩家名拉取皮肤，或上传 png。粗手臂是 4 像素宽，细手臂是 3 像素宽。',
    categoryId: 'skin',
    aliases: ['skin', '3d', 'alex', 'steve', '细手臂'],
    tags: ['皮肤', '3D'],
  },
  {
    id: 'skin-render',
    name: '皮肤渲染',
    summary: '导入皮肤和资源包物品，调整位置与旋转，用路径追踪看效果。',
    detail: '中间是几何视口，可以改每个部位的位置和旋转，也能把手持物品和自发光体放进场景。右侧是路径追踪面板，可调焦距、反弹和采样。皮肤方块按 Minecraft 盒子 UV 展开。',
    categoryId: 'skin',
    aliases: ['render', 'pathtrace', 'pose', '渲染', '姿势'],
    tags: ['皮肤', '渲染'],
  },
];

/** 按分类 id 查找分类。 */
export function categoryById(id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}

/** 按工具 id 查找登记项。 */
export function toolById(id: string): ToolEntry | undefined {
  return tools.find((tool) => tool.id === id);
}

/** 同一分类下的工具。 */
export function toolsInCategory(categoryId: string): ToolEntry[] {
  return tools.filter((tool) => tool.categoryId === categoryId);
}

/** 同分类里的其他工具。 */
export function relatedTools(tool: ToolEntry): ToolEntry[] {
  return tools.filter((item) => item.categoryId === tool.categoryId && item.id !== tool.id);
}

/** 按名称、简介、分类、别名和标签筛选，最多 8 条。 */
export function filterTools(query: string): ToolEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return [];
  }
  return tools.filter((tool) => {
    const category = categoryById(tool.categoryId);
    const haystack = [
      tool.name,
      tool.summary,
      category?.name ?? '',
      ...tool.aliases,
      ...tool.tags,
    ].join(' ').toLowerCase();
    return haystack.includes(needle);
  }).slice(0, 12);
}
