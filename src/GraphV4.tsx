import { useCallback, useMemo, useState } from "react";
import * as echarts from "echarts";
import {
  SeriesOption,
  LineSeriesOption,
  CustomSeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from "echarts";
import EChartsReact from "echarts-for-react";

export type GraphType = "binary" | "analog" | "multiState";

export interface AnalogGraph {
  minimum: number;
  maximum?: number;
  average?: number;
}

export type LineData = [
  string,
  number | string,
  number?,
  number?,
  AnalogGraph?
];
// export type Line = {
//   null: Array<LineData>;
//   valid: Array<LineData>;
//   isOutOfRange: Array<LineData>;
// };
export interface Asset {
  name: string;
  twinName: string;
  assetId: string;
  pointId: string;
  graphType: GraphType;
  unit?: string;
  color: string;
  valueMap?: Record<string, string>;
  data: Array<LineData>;
}

interface ChartOptions {
  id: string;
  title: string;
  dataset: Array<Asset>;
  showLegend: boolean;
}

const trySort = (arr: string[]) => {
  const order = ["binary", "multiState", "analog"];
  const orderMap = new Map(order.map((item, index) => [item, index]));

  return arr.sort((a, b) => {
    const indexA = orderMap.has(a) ? orderMap.get(a)! : order.length;
    const indexB = orderMap.has(b) ? orderMap.get(b)! : order.length;
    return indexA - indexB;
  });
};

const getGraphTypeKey = (asset: Asset) =>
  asset.unit ? `${asset.graphType}${asset.unit}` : asset.graphType;

const GraphV4 = ({
  option,
}: {
  zoom: number[];
  setZoom: React.Dispatch<React.SetStateAction<number[]>>;
  option: ChartOptions;
}) => {
  const yAxisLabelGap = 48;
  const assets = option.dataset;
  const assetsStringify = JSON.stringify(assets);

  // Group the assets by the graph type.
  // If the view is shared, we don't differentiate the unit all analog are grouped together
  const assetGroupByGraphType = Object.groupBy(assets, (asset) =>
    getGraphTypeKey(asset)
  );

  // Order it by binary, multistate, analog
  const assetGroupByGraphTypeKeys = trySort(Object.keys(assetGroupByGraphType));

  const xAxis: XAXisComponentOption[] = useMemo(
    () =>
      assetGroupByGraphTypeKeys.map<XAXisComponentOption>((a, index) => ({
        id: `${a}`,
        gridIndex: index,
        type: "time",
        min: "dataMin",
        max: "dataMax",
        boundaryGap: false,
      })),
    [assetGroupByGraphTypeKeys]
  );

  const yAxis: YAXisComponentOption[] = useMemo(
    () =>
      assetGroupByGraphTypeKeys.map((graphType, index) => {
        let axis: YAXisComponentOption = {
          id: `${graphType}`,
          type: "category",
          gridIndex: index,
          axisPointer: {
            show: false,
          },
          splitLine: {
            lineStyle: {
              color: "red",
            },
          },
        };
        if (graphType === "binary") {
          axis = {
            ...axis,
            axisLabel: {
              color: "red",
              formatter: "bool",
            },
            axisLine: {
              onZero: false,
            },
          };
        } else {
          const unit = graphType.slice(6);
          axis = {
            ...axis,
            type: "value",
            name: unit,
            nameGap: yAxisLabelGap,
            nameLocation: "middle",
            nameTextStyle: {
              color: "red",
            },
            max: "dataMax",
            min: "dataMin",
            splitNumber: 3,
            axisPointer: {
              show: true,
              snap: false,
            },
          };
        }
        return {
          ...axis,
          axisLabel: {
            ...axis.axisLabel,
            color: "red",
          },
        };
      }),
    [assetGroupByGraphTypeKeys]
  );

  const dataset = useMemo(
    () =>
      assets.flatMap((asset) => {
        return [
          {
            dimensions: ["time", "value", "confidence", "lower"],
            source: asset.data,
            name: `${asset.pointId}-valid`,
          },
        ];
      }),
    [assetsStringify]
  );

  const getSeries = useCallback(() => {
    let lastGraphType: GraphType | null = null;
    let currentIndex = -1;
    let datasetIndex = 0;

    const result = assets.flatMap<SeriesOption>((asset) => {
      if (asset.graphType !== lastGraphType) {
        lastGraphType = asset.graphType;
        currentIndex += 1;
      }

      let options: Array<SeriesOption | CustomSeriesOption> = [];

      if (asset.graphType === "analog") {
        const unitIndex = assetGroupByGraphTypeKeys.findIndex(
          (d) => d === `${asset.graphType}${asset.unit}`
        );

        const axisIndex = unitIndex !== -1 ? unitIndex : currentIndex;

        options = [
          {
            id: `primary_${asset.pointId}`,
            name: asset.name,
            type: "line",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            datasetIndex,
            label: {
              show: false,
            },
            encode: {
              x: "time",
              y: "value",
            },
            itemStyle: {
              color: asset.color,
            },
            showSymbol: false,
          } as LineSeriesOption,
        ];
        datasetIndex += 1;
      }

      return options;
    });
    console.log(result);

    return result;
  }, [assetsStringify, selectedLegends]);

  const getChartHeight = useCallback(() => {
    const numberOfBinary = assetGroupByGraphType.binary?.length ?? 0;
    const numberOfMultiState = assetGroupByGraphType.multiState?.length ?? 0;

    const rawHeights = assetGroupByGraphTypeKeys.map((graphType) => {
      let height = 0;
      if (graphType === "binary") {
        height = numberOfBinary * 64;
      } else if (graphType === "multiState") {
        height = numberOfMultiState * 64;
      } else {
        height = 300;
      }
      return {
        height,
        graphType,
      };
    });

    let start = 48;
    const graphGap = 32;
    const chartHeights = rawHeights.map((height, index) => {
      if (index !== 0) {
        start += rawHeights[index - 1].height + graphGap;
      }
      return {
        start,
        height: height.height,
        type: height.graphType,
      };
    });

    return chartHeights;
  }, [assetsStringify]);

  const chartHeights = getChartHeight();

  const totalGraphHeight =
    chartHeights.length > 0
      ? chartHeights[chartHeights.length - 1].height +
        chartHeights[chartHeights.length - 1].start +
        24 +
        (option.showLegend ? 24 : 0)
      : 0;

  const grid = useMemo(
    () =>
      chartHeights.map((chartHeight) => ({
        id: chartHeight.type,
        top: chartHeight.start,
        left: 60,
        right: 8,
        height: chartHeight.height,
        show: true,
        borderWidth: 1,
        borderColor: "rgba(128, 128, 128, 0.5)",
      })),
    [chartHeights]
  );

  console.log("----------------");
  console.log("xAxis", xAxis);
  console.log("yAxis", yAxis);
  console.log("grid", grid);
  console.log("dataset", dataset);
  console.log("series", getSeries());

  const chartOption = {
    grid,
    xAxis,
    yAxis,
    dataset,
    series: getSeries(),
  };

  return (
    <EChartsReact
      onEvents={onEvents}
      
      option={chartOption}
      style={{
        height: totalGraphHeight,
        width: 1000,
      }}
    />
  );
};

export default GraphV4;
