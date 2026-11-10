# Happy Birthday · 手势粒子生日祝福

用手势把一团流动的粒子变成「生、日、快、乐」。这是一个结合摄像头手势识别与 3D 粒子动画的创意网页，可以用作生日祝福，也可以作为交互视觉实验的起点。

## 体验

在支持摄像头和 WebGL 的浏览器中打开 [在线体验](https://birthday.zhiqiang.chat)，允许访问摄像头，将一只手放在画面中：

| 伸出的手指（不计拇指） | 粒子形状 |
| --- | --- |
| 1 根 | 生 |
| 2 根 | 日 |
| 3 根 | 快 |
| 4 根 | 乐 |

没有匹配手势时，粒子呈球形；拇指与食指的距离会影响球体大小，手的位置会带来轻微旋转。手势识别受光线、遮挡和设备性能影响。

摄像头画面用于浏览器内的手势识别；项目代码不会上传视频。首次使用需要联网加载 MediaPipe 模型和其他外部资源。摄像头需要 HTTPS 或 localhost，并需要浏览器授权。

## 本地运行

需要 Node.js（建议使用 Node.js 20 或更新版本）和 npm。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址，授权摄像头。项目不需要 Gemini API key。

```bash
npm run build    # 生成 dist/
npm run preview  # 本地预览生产构建
```

## 自定义

- 修改 `components/ParticleSystem.tsx` 中的四个文字、粒子数量和动画速度。
- 修改 `App.tsx` 中的手势判断和界面说明。
- `utils/textSampler.ts` 使用 Canvas 将文字采样为粒子坐标。

项目使用 React、React Three Fiber、Three.js、MediaPipe Tasks Vision 和 Vite。部署到 Vercel 时使用 Vite 默认构建设置（`npm run build`，输出目录 `dist`）；生产站点必须启用 HTTPS 才能访问摄像头。

## 许可证

[MIT License](LICENSE)。
