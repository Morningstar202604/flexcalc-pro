/**
 * ECharts 懒加载与模块注册（ChartBox 与地图组件共用）。
 *
 * 首次调用时才动态 import，注册一次后复用；地图相关（MapChart/GeoComponent）
 * 也在这里注册——charts/components 的 barrel 本来就是整包动态载入，
 * 多注册类型不额外增加 chunk 体积。
 */

let initFn: typeof import('echarts/core').init | null = null
let registerMapFn: typeof import('echarts/core').registerMap | null = null
let isRegistered = false

export async function ensureECharts(): Promise<{
  init: typeof import('echarts/core').init
  registerMap: typeof import('echarts/core').registerMap
}> {
  if (initFn && registerMapFn) return { init: initFn, registerMap: registerMapFn }

  const [{ init, registerMap }, { use }, { CanvasRenderer }, charts, components] = await Promise.all([
    import('echarts/core'),
    import('echarts/core'),
    import('echarts/renderers'),
    import('echarts/charts'),
    import('echarts/components'),
  ])

  if (!isRegistered) {
    use([
      CanvasRenderer,
      charts.BarChart, charts.LineChart, charts.PieChart, charts.ScatterChart,
      charts.HeatmapChart, charts.MapChart,
      components.TitleComponent, components.TooltipComponent, components.LegendComponent,
      components.GridComponent, components.VisualMapComponent, components.DatasetComponent,
      components.ToolboxComponent, components.DataZoomComponent,
      components.DataZoomInsideComponent, components.DataZoomSliderComponent,
      components.GeoComponent,
    ])
    isRegistered = true
  }

  initFn = init
  registerMapFn = registerMap
  return { init: initFn, registerMap: registerMapFn }
}
