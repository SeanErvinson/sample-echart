import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import {
  SeriesOption,
  LineSeriesOption,
  CustomSeriesOption,
  XAXisComponentOption,
  YAXisComponentOption,
  DatasetComponentOption,
  CustomSeriesRenderItemReturn,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemAPI,
} from "echarts";
import EChartsReact from "echarts-for-react";

export type GraphType = "binary" | "analog" | "multiState";

export interface BoolGraph {
  onCount: number;
  offCount?: number;
}

export interface MultistateGraph {
  state?: Record<string, number>;
}

export interface AnalogGraph {
  minimum: number;
  maximum?: number;
  average?: number;
}

export type Custom = [
  number, // row
  number, // start
  number, // end
  (number | string)?, // value
  (MultistateGraph | BoolGraph)?
];

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
  data: Array<LineData> | Array<Custom>;
}

export interface ShadedRegion {
  start: string;
  end: string;
  color: string;
  boundaryGap?: boolean;
}

interface ChartOptions {
  id: string;
  title: string;
  dataset: Array<Asset>;
  showLegend: boolean;
  shadedRegions?: Array<ShadedRegion>;
  boundaryGap?: Array<string>;
}

const generateOpacity = (count: number) => {
  const opacities: number[] = [];
  for (let i = 1; i <= count; i++) {
    opacities.push(parseFloat((i / count).toFixed(2)));
  }
  return opacities;
};

const trySort = (arr: string[]) => {
  const order = ["binary", "multiState", "analog"];
  const orderMap = new Map(order.map((item, index) => [item, index]));

  return arr.sort((a, b) => {
    const indexA = orderMap.has(a) ? orderMap.get(a)! : order.length;
    const indexB = orderMap.has(b) ? orderMap.get(b)! : order.length;
    return indexA - indexB;
  });
};

const isDataCustom = (
  data: Line | Array<Custom>,
  asset: Asset
): data is Array<Custom> => asset.graphType !== "analog";

const getGraphTypeKey = (asset: Asset) =>
  asset.unit ? `${asset.graphType}${asset.unit}` : asset.graphType;

const GraphV3 = ({
  zoom,
  setZoom,
  option,
}: {
  zoom: number[];
  setZoom: React.Dispatch<React.SetStateAction<number[]>>;
  option: ChartOptions;
}) => {
  const yAxisLabelGap = 48;
  const assets = option.dataset;
  const chartRef = useRef<EChartsReact>(null);
  const assetsStringify = JSON.stringify(assets);
  const [selectedLegends, setSelectedLegends] = useState<
    Record<string, boolean>
  >({});

  // Group the assets by the graph type.
  // If the view is shared, we don't differentiate the unit all analog are grouped together
  const assetGroupByGraphType = Object.groupBy(assets, (asset) =>
    getGraphTypeKey(asset)
  );

  // Order it by binary, multistate, analog
  const assetGroupByGraphTypeKeys = trySort(Object.keys(assetGroupByGraphType));

  useEffect(() => {
    console.log(chartRef.current?.getEchartsInstance());
  });

  const xAxis: XAXisComponentOption[] = useMemo(
    () =>
      assetGroupByGraphTypeKeys.map<XAXisComponentOption>((a, index) => ({
        gridIndex: index,
        type: "time",
        min: "dataMin",
        max: "dataMax",
        boundaryGap: false,
      })),
    [assetsStringify]
  );

  const yAxis: YAXisComponentOption[] = useMemo(
    () =>
      assetGroupByGraphTypeKeys.map((graphType, index) => {
        let axis: YAXisComponentOption = {
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
    [assetsStringify]
  );

  const dataset = useMemo(
    () =>
      assets.flatMap((asset) => {
        let data: DatasetComponentOption[] = [];

        if (isDataCustom(asset.data, asset)) {
          data = [
            {
              ...data,
              dimensions: ["row", "start", "end", "value"],
              source: asset.data,
            },
          ];
        } else {
          data = [
            {
              ...data,
              dimensions: ["time", "value", "confidence", "lower"],
              source: asset.data,
              name: `${asset.pointId}-valid`,
            },
          ];
        }
        return data;
      }),
    [assetsStringify]
  );

  const renderRectItem = (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
  ): CustomSeriesRenderItemReturn => {
    if (
      api.value == null ||
      api.coord == null ||
      api.size == null ||
      api.style == null
    ) {
      throw new Error("Api is undefined");
    }
    if (params.coordSys == null) {
      throw new Error("Params is undefined");
    }

    let opacity = 1;

    if (api.value(3) === 0) {
      opacity = 0.5;
    }

    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);

    const height = api.size([0, 1])[1];
    const width = end[0] - start[0];
    const rectShape = echarts.graphic.clipRectByRect(
      {
        x: start[0] - width / 2,
        y: start[1] - height / 2,
        width,
        height,
      },
      {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height,
      }
    );
    return {
      type: "rect",
      shape: rectShape,
      ignore: Number.isNaN(api.value(3)),
      style: api.style({
        opacity,
        lineWidth: 0,
      }),
      transition: ["shape"],
      emphasisDisabled: true,
    };
  };

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

      if (asset.graphType === "binary") {
        options = [
          {
            name: asset.name,
            type: "custom",
            clip: true,
            encode: {
              x: ["start", "end"],
              y: "time",
              value: "value",
            },
            renderItem: renderRectItem,
            xAxisIndex: currentIndex,
            yAxisIndex: currentIndex,
            datasetIndex,
            itemStyle: {
              color: asset.color,
            },
            zlevel: -1,
          } as CustomSeriesOption,
        ];
        datasetIndex += 1;
      }
      if (asset.graphType === "analog") {
        const unitIndex = assetGroupByGraphTypeKeys.findIndex(
          (d) => d === `${asset.graphType}${asset.unit}`
        );

        const axisIndex = unitIndex !== -1 ? unitIndex : currentIndex;

        options = [
          {
            name: asset.name,
            type: "line",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            datasetIndex,
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

    return result;
  }, [assetsStringify, JSON.stringify(selectedLegends)]);

  const getAnalogHeight = () => {
    return 300;
  };

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
        height = getAnalogHeight();
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
      chartHeights.map((chartHeight, i) => ({
        top: chartHeight.start,
        left: 60,
        right: 8,
        height: chartHeight.height,
        show: true,
        borderWidth: 1,
        borderColor: "rgba(128, 128, 128, 0.5)",
      })),
    [JSON.stringify(chartHeights)]
  );

  // console.log("----------------");
  // console.log("xAxis", xAxis);
  // console.log("yAxis", yAxis);
  // console.log("grid", grid);
  // console.log("dataset", dataset);
  // console.log("series", getSeries());

  const chartOption = {
    grid,
    xAxis,
    yAxis,
    dataset,
    series: getSeries(),
  };

  // useEffect(() => {
  //   const chart = chartRef.current?.getEchartsInstance();
  //   chart?.setOption(chartOption, {
  //     replaceMerge: ["xAxis", "yAxis", "grid", "dataset", "series"],
  //   });
  // }, [dataset, chartRef, chartOption]);

  return (
    <EChartsReact
      ref={chartRef}
      notMerge
      option={chartOption}
      style={{
        height: totalGraphHeight,
        width: 1000,
      }}
    />
  );
};

export default GraphV3;
