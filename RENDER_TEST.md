# Minecraft 皮肤渲染系统测试指南

## 功能说明

皮肤渲染工具已集成到主站工具页面：`/tools/skin-render/`

### 1. 路径追踪渲染器
- **文件**: `public/render/skin-pathtrace.html`
- **功能**: 完整移植 Blockbench pathtracer.js 插件
- **技术**: WebGL2 路径追踪、BVH 加速、GGX BSDF、降噪、泛光、色调映射

### 2. 可弯曲关节系统
- **文件**: `src/tools/skin-render/bendy.ts`
- **功能**: 两段式手臂/腿（上下各 6 像素）
- **接口**:
  - `createBendyArm(isSlim: boolean, isLeft: boolean): BendyLimb`
  - `createBendyLeg(isLeft: boolean): BendyLimb`
  - `applyBend(limb, shoulderPos, shoulderRot, elbowBend)`

### 3. 物品模型导入
- **文件**: `src/tools/skin-render/items.ts`
- **功能**: 解析 Java 版方块/物品模型 JSON
- **接口**: `parseJavaModel(json: JavaModel): ItemModel`

### 4. 皮肤渲染工具
- **文件**: `src/tools/skin-render/Widget.tsx`
- **功能**: 
  - 导入玩家名或上传皮肤
  - 选择模型（粗/细手臂）
  - 选择姿势（站立/行走/奔跑/坐下/招手/指向/欢呼）
  - 128 采样路径追踪渲染
- **访问路径**: `/tools/skin-render/`（主站工具页面）

### 5. 3D 编辑器（测试用）
- **文件**: `src/tools/skin-render/Editor.tsx`
- **功能**: Blockbench 风格三栏布局
  - 左侧：对象大纲树
  - 中央：three.js 视口 + OrbitControls
  - 右侧：8 个肢体段独立旋转控制
- **访问路径**: `/test-render/`（测试页面）

## 安装和运行

**当前状态**：node_modules 符号链接损坏，需要手动清理。

### 方法 1：使用批处理脚本（推荐）
双击运行 `INSTALL.bat`，自动完成清理和安装。

### 方法 2：手动执行
在 Windows PowerShell 中执行：

```powershell
cd C:\Users\mckafei\Desktop\SincerityMinecraft工作站

# 强制删除损坏的 node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# 安装依赖（使用 --legacy-peer-deps 解决 three.js 版本冲突）
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev
```

### 访问路径
- **主工具页面**: http://localhost:4321/tools/skin-render/
- **测试页面**: http://localhost:4321/test-render/

**注意**：URL 末尾的斜杠是必需的（Astro 的 `trailingSlash: 'always'` 配置）

## 技术要点

### 旋转顺序一致性
- 预览和渲染都使用 **Z·Y·X** 欧拉角顺序
- `quaternionFromDegrees` 和 `applyBend` 使用相同的旋转矩阵构建方式

### 三角形数据格式
- 每个三角形 20 个浮点数：
  - 9 个位置 (v0.xyz, v1.xyz, v2.xyz)
  - 9 个法线 (n0.xyz, n1.xyz, n2.xyz)
  - 2 个 UV (u, v) - 三个顶点共享同一 UV

### 肢体坐标系统
- 上段：Y = 6-12（肩膀/髋部端）
- 下段：Y = 0-6（手腕/脚踝端）
- 关节：Y = 6

### 姿势定义
```typescript
const POSE_DEG = {
  walk: {
    rightUpperArm: [35, 0, 0],
    leftUpperArm: [-35, 0, 0],
    rightUpperLeg: [-32, 0, 0],
    leftUpperLeg: [32, 0, 0],
  },
  sit: {
    rightUpperLeg: [-80, -12, 0],
    rightLowerLeg: [85, 0, 0],  // 膝盖弯曲
    leftUpperLeg: [-80, 12, 0],
    leftLowerLeg: [85, 0, 0],
  },
  // ... 更多姿势
};
```

## 依赖版本

```json
{
  "three": "0.156.0",        // 精确版本，与 skinview3d 兼容
  "skinview3d": "^3.4.2",    // 皮肤预览
  "react": "^19.3.0",
  "astro": "^7.3.5"
}
```

## 已知问题

1. **node_modules 权限**: 在 Linux VM 中删除 node_modules 可能超时，需要在 Windows 侧手动删除
2. **three.js 版本冲突**: vgpu 需要 three >= 0.180，但 skinview3d 需要 0.156，使用 --legacy-peer-deps 安装
3. **Editor.tsx 肢体应用**: `updateLimbRotation` 中标记了 TODO，需要实际应用旋转到 three.js 网格

## 下一步优化

1. 在 Editor.tsx 中完整实现可弯曲肢体的 three.js 渲染
2. 添加物品导入到手部的功能
3. 添加自发光材质支持
4. 集成到主导航菜单
