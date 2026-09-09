/**
 * Pure TypeScript Vector Chart Layout Engine
 * Supports Bar, Line, Pie, and Donut charts.
 * Resolves static data or dynamic data sources from report context.
 * Generates coordinate primitives for vector rendering across Canvas, React, HTML, and PDF.
 */

import type { ChartElement, ChartDataPoint } from '@report/schema';
import type { ReportDataContext } from '@report/data';

export interface BarShape {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  value: number;
}

export interface LinePoint {
  x: number;
  y: number;
  label: string;
  value: number;
  color: string;
}

export interface PieSlice {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  pathD: string;
  color: string;
  label: string;
  value: number;
  percentage: number;
}

export interface ChartLegendItem {
  color: string;
  label: string;
  value: number;
}

export interface LayoutChartData {
  chartType: 'bar' | 'line' | 'pie' | 'donut';
  title?: string;
  dataPoints: ChartDataPoint[];
  colors: string[];
  bars?: BarShape[];
  linePoints?: LinePoint[];
  linePathD?: string;
  areaPathD?: string;
  pieSlices?: PieSlice[];
  legend: ChartLegendItem[];
  plotArea: { x: number; y: number; width: number; height: number };
  yTicks?: { y: number; label: string }[];
  xLabels?: { x: number; label: string }[];
}

const DEFAULT_PALETTE = [
  '#2563eb', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16'  // lime
];

export function resolveChartData(
  element: ChartElement,
  context: ReportDataContext
): ChartDataPoint[] {
  if (element.dataSource && context.data) {
    const rawList = context.data[element.dataSource];
    if (Array.isArray(rawList) && rawList.length > 0) {
      const catField = element.categoryField || 'label';
      const valField = element.valueField || 'value';

      return rawList.map(item => ({
        label: String(item[catField] ?? ''),
        value: Number(item[valField]) || 0
      }));
    }
  }

  if (element.data && element.data.length > 0) {
    return element.data;
  }

  return [
    { label: 'Item A', value: 30 },
    { label: 'Item B', value: 65 },
    { label: 'Item C', value: 45 },
    { label: 'Item D', value: 80 }
  ];
}

export function layoutChart(
  element: ChartElement,
  widthPt: number,
  heightPt: number,
  context: ReportDataContext
): LayoutChartData {
  const dataPoints = resolveChartData(element, context);
  const colors = element.colors && element.colors.length > 0 ? element.colors : DEFAULT_PALETTE;

  const showLegend = element.showLegend ?? true;
  const titleHeight = element.title ? 20 : 6;
  const legendHeight = showLegend ? 22 : 4;

  const plotMargin = {
    top: titleHeight,
    bottom: legendHeight + 20,
    left: 36,
    right: 16
  };

  const plotArea = {
    x: plotMargin.left,
    y: plotMargin.top,
    width: Math.max(20, widthPt - plotMargin.left - plotMargin.right),
    height: Math.max(20, heightPt - plotMargin.top - plotMargin.bottom)
  };

  const legend: ChartLegendItem[] = dataPoints.map((dp, i) => ({
    label: dp.label,
    value: dp.value,
    color: colors[i % colors.length]!
  }));

  const chartType = element.chartType || 'bar';

  if (chartType === 'pie' || chartType === 'donut') {
    const total = dataPoints.reduce((acc, dp) => acc + Math.max(0, dp.value), 0) || 1;
    const cx = widthPt / 2;
    const cy = titleHeight + plotArea.height / 2;
    const radius = Math.min(plotArea.width, plotArea.height) / 2 - 4;
    const innerRadius = chartType === 'donut' ? radius * 0.55 : 0;

    let currentAngle = -Math.PI / 2;
    const pieSlices: PieSlice[] = [];

    dataPoints.forEach((dp, i) => {
      const sliceAngle = (Math.max(0, dp.value) / total) * (Math.PI * 2);
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;
      currentAngle = endAngle;

      // Calculate path arc
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      let pathD = '';
      if (innerRadius > 0) {
        const ix1 = cx + innerRadius * Math.cos(endAngle);
        const iy1 = cy + innerRadius * Math.sin(endAngle);
        const ix2 = cx + innerRadius * Math.cos(startAngle);
        const iy2 = cy + innerRadius * Math.sin(startAngle);
        pathD = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z`;
      } else {
        pathD = `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      }

      pieSlices.push({
        startAngle,
        endAngle,
        midAngle,
        pathD,
        color: colors[i % colors.length]!,
        label: dp.label,
        value: dp.value,
        percentage: Math.round((dp.value / total) * 100)
      });
    });

    return {
      chartType,
      title: element.title,
      dataPoints,
      colors,
      pieSlices,
      legend,
      plotArea
    };
  }

  // Calculate Y-axis scaling for Bar and Line charts
  const maxValue = Math.max(...dataPoints.map(d => d.value), 10);
  const niceMax = Math.ceil(maxValue * 1.15);

  const numTicks = 4;
  const yTicks: { y: number; label: string }[] = [];
  for (let i = 0; i <= numTicks; i++) {
    const val = Math.round((niceMax / numTicks) * i);
    const tickY = plotArea.y + plotArea.height - (val / niceMax) * plotArea.height;
    yTicks.push({
      y: tickY,
      label: val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)
    });
  }

  const xLabels: { x: number; label: string }[] = [];

  if (chartType === 'bar') {
    const barCount = dataPoints.length;
    const bandWidth = plotArea.width / Math.max(1, barCount);
    const barWidth = Math.max(6, bandWidth * 0.65);
    const bars: BarShape[] = [];

    dataPoints.forEach((dp, i) => {
      const barHeight = Math.max(2, (dp.value / niceMax) * plotArea.height);
      const barX = plotArea.x + i * bandWidth + (bandWidth - barWidth) / 2;
      const barY = plotArea.y + plotArea.height - barHeight;

      bars.push({
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        color: colors[i % colors.length]!,
        label: dp.label,
        value: dp.value
      });

      xLabels.push({
        x: plotArea.x + (i + 0.5) * bandWidth,
        label: dp.label
      });
    });

    return {
      chartType: 'bar',
      title: element.title,
      dataPoints,
      colors,
      bars,
      legend,
      plotArea,
      yTicks,
      xLabels
    };
  }

  // Line Chart
  const linePoints: LinePoint[] = [];
  const pointCount = dataPoints.length;
  const stepX = pointCount > 1 ? plotArea.width / (pointCount - 1) : plotArea.width / 2;

  dataPoints.forEach((dp, i) => {
    const px = pointCount > 1 ? plotArea.x + i * stepX : plotArea.x + plotArea.width / 2;
    const py = plotArea.y + plotArea.height - (dp.value / niceMax) * plotArea.height;
    linePoints.push({
      x: px,
      y: py,
      label: dp.label,
      value: dp.value,
      color: colors[0] || '#2563eb'
    });

    xLabels.push({
      x: px,
      label: dp.label
    });
  });

  let linePathD = '';
  let areaPathD = '';
  if (linePoints.length > 0) {
    linePathD = `M ${linePoints[0]!.x.toFixed(2)} ${linePoints[0]!.y.toFixed(2)}`;
    for (let i = 1; i < linePoints.length; i++) {
      linePathD += ` L ${linePoints[i]!.x.toFixed(2)} ${linePoints[i]!.y.toFixed(2)}`;
    }

    const last = linePoints[linePoints.length - 1]!;
    const first = linePoints[0]!;
    const bottomY = plotArea.y + plotArea.height;
    areaPathD = `${linePathD} L ${last.x.toFixed(2)} ${bottomY.toFixed(2)} L ${first.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  }

  return {
    chartType: 'line',
    title: element.title,
    dataPoints,
    colors,
    linePoints,
    linePathD,
    areaPathD,
    legend,
    plotArea,
    yTicks,
    xLabels
  };
}

/**
 * Generate full SVG markup for chart
 */
export function chartToSvg(
  chart: LayoutChartData,
  widthPt: number,
  heightPt: number
): string {
  let content = '';

  // Title
  if (chart.title) {
    content += `<text x="${(widthPt / 2).toFixed(1)}" y="15" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b" text-anchor="middle">${chart.title}</text>`;
  }

  if (chart.chartType === 'pie' || chart.chartType === 'donut') {
    // Render Slices
    for (const slice of chart.pieSlices || []) {
      content += `<path d="${slice.pathD}" fill="${slice.color}" stroke="#ffffff" stroke-width="1.5" />`;
    }
  } else {
    // Grid lines
    for (const tick of chart.yTicks || []) {
      content += `<line x1="${chart.plotArea.x}" y1="${tick.y.toFixed(1)}" x2="${(chart.plotArea.x + chart.plotArea.width).toFixed(1)}" y2="${tick.y.toFixed(1)}" stroke="#e2e8f0" stroke-dasharray="2 2" stroke-width="0.75" />`;
      content += `<text x="${(chart.plotArea.x - 4).toFixed(1)}" y="${(tick.y + 3).toFixed(1)}" font-family="sans-serif" font-size="8" fill="#64748b" text-anchor="end">${tick.label}</text>`;
    }

    // X-axis line
    const axisY = chart.plotArea.y + chart.plotArea.height;
    content += `<line x1="${chart.plotArea.x}" y1="${axisY.toFixed(1)}" x2="${(chart.plotArea.x + chart.plotArea.width).toFixed(1)}" y2="${axisY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" />`;

    // X Labels
    for (const xLabel of chart.xLabels || []) {
      content += `<text x="${xLabel.x.toFixed(1)}" y="${(axisY + 12).toFixed(1)}" font-family="sans-serif" font-size="8" fill="#64748b" text-anchor="middle">${xLabel.label}</text>`;
    }

    if (chart.chartType === 'bar') {
      for (const bar of chart.bars || []) {
        content += `<rect x="${bar.x.toFixed(1)}" y="${bar.y.toFixed(1)}" width="${bar.width.toFixed(1)}" height="${bar.height.toFixed(1)}" fill="${bar.color}" rx="2" />`;
        content += `<text x="${(bar.x + bar.width / 2).toFixed(1)}" y="${(bar.y - 3).toFixed(1)}" font-family="sans-serif" font-size="7" font-weight="600" fill="#475569" text-anchor="middle">${bar.value}</text>`;
      }
    } else if (chart.chartType === 'line') {
      if (chart.areaPathD) {
        content += `<path d="${chart.areaPathD}" fill="${chart.colors[0] || '#2563eb'}" fill-opacity="0.15" />`;
      }
      if (chart.linePathD) {
        content += `<path d="${chart.linePathD}" fill="none" stroke="${chart.colors[0] || '#2563eb'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
      }
      for (const pt of chart.linePoints || []) {
        content += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3" fill="#ffffff" stroke="${pt.color}" stroke-width="2" />`;
        content += `<text x="${pt.x.toFixed(1)}" y="${(pt.y - 5).toFixed(1)}" font-family="sans-serif" font-size="7" font-weight="600" fill="#475569" text-anchor="middle">${pt.value}</text>`;
      }
    }
  }

  // Legend at bottom
  if (chart.legend && chart.legend.length > 0) {
    const legendY = heightPt - 10;
    const totalItems = chart.legend.length;
    const itemWidth = Math.min(65, widthPt / totalItems);
    const startX = (widthPt - itemWidth * totalItems) / 2;

    chart.legend.forEach((item, idx) => {
      const ix = startX + idx * itemWidth;
      content += `<rect x="${ix.toFixed(1)}" y="${(legendY - 6).toFixed(1)}" width="8" height="8" rx="1.5" fill="${item.color}" />`;
      content += `<text x="${(ix + 11).toFixed(1)}" y="${legendY.toFixed(1)}" font-family="sans-serif" font-size="7" fill="#475569">${item.label}</text>`;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthPt} ${heightPt}" width="100%" height="100%">
  <rect width="${widthPt}" height="${heightPt}" fill="#ffffff" rx="4" />
  ${content}
</svg>`;
}
