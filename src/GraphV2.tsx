import { useCallback, useEffect, useMemo, useRef } from "react";
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

export type Custom = [
  number, // row
  number, // start
  number, // end
  (number | string)? // value
];

export type LineData = [string, number | string, number?, number?];

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

interface ChartOptions {
  id: string;
  dataset: Array<Asset>;
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
  const orderMap = new Map(order.map((item, i) => [item, i]));

  return arr.sort((a, b) => {
    const indexA = orderMap.has(a) ? orderMap.get(a)! : order.length;
    const indexB = orderMap.has(b) ? orderMap.get(b)! : order.length;
    return indexA - indexB;
  });
};

const isDataCustom = (
  data: Array<LineData> | Array<Custom>,
  asset: Asset
): data is Array<Custom> => asset.graphType !== "analog";

const getGraphTypeKey = (asset: Asset) =>
  asset.unit ? `${asset.graphType}${asset.unit}` : asset.graphType;

const GraphV2 = ({ option }: { option: ChartOptions }) => {
  const assets = option.dataset;
  const chartRef = useRef<EChartsReact>(null);
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
      assetGroupByGraphTypeKeys.map<XAXisComponentOption>((graphType) => ({
        id: graphType,
        gridId: graphType,
        type: "time",
        min: "dataMin",
        max: "dataMax",
        boundaryGap: false,
      })),
    [assetGroupByGraphTypeKeys]
  );

  const yAxis: YAXisComponentOption[] = useMemo(
    () =>
      assetGroupByGraphTypeKeys.map((graphType) => {
        let axis: YAXisComponentOption = {
          id: graphType,
          gridId: graphType,
          type: "category",
          mainType: "yAxis",
          axisPointer: {
            show: false,
          },
          splitLine: {
            lineStyle: {
              color: "green",
            },
          },
        };
        if (graphType === "binary") {
          axis = {
            ...axis,
            axisLabel: {
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
            nameLocation: "middle",
            max: "dataMax",
            min: "dataMin",
          };
        }
        return {
          ...axis,
          axisLabel: {
            ...axis.axisLabel,
            color: "white",
          },
        };
      }),
    [assetGroupByGraphTypeKeys]
  );

  const dataset = useMemo(
    () =>
      assets.flatMap((asset) => {
        let data: DatasetComponentOption[] = [];

        if (isDataCustom(asset.data, asset)) {
          data = [
            {
              dimensions: ["row", "start", "end", "value"],
              source: asset.data,
            },
          ];
        } else {
          data = [
            {
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
    const id = params.seriesId?.split("_")[1];
    const isBinary = params.seriesId?.includes("binary");

    let opacity = 1;
    if (isBinary) {
      if (api.value(3) === 0) {
        opacity = 0.5;
      }
    } else {
      const valueMap = assets.find((c) => c.pointId === id)?.valueMap;
      if (!valueMap) {
        throw new Error("Value map is missing");
      }
      const valueMapCount = Object.keys(valueMap).length;
      const opacities = generateOpacity(valueMapCount);
      opacity = opacities[api.value(3)];
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
    let datasetIndex = 0;
    const result = assets.flatMap<SeriesOption>((asset) => {
      let options: Array<SeriesOption | CustomSeriesOption> = [];

      if (asset.graphType === "binary") {
        options = [
          {
            id: `primary-binary_${asset.pointId}`,
            name: asset.name,
            type: "custom",
            clip: true,
            encode: {
              x: ["start", "end"],
              y: "time",
              value: "value",
            },
            renderItem: renderRectItem,
            xAxisId: asset.graphType,
            yAxisId: asset.graphType,
            datasetIndex,
            label: {
              show: false,
            },
            itemStyle: {
              color: asset.color,
            },
            zlevel: -1,
          } as CustomSeriesOption,
        ];
        datasetIndex += 1;
      }
      if (asset.graphType === "analog") {
        options = [
          {
            id: `primary_${asset.pointId}`,
            name: asset.name,
            type: "line",
            xAxisId: `${asset.graphType}${asset.unit}`,
            yAxisId: `${asset.graphType}${asset.unit}`,
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

    return result;
  }, [assetsStringify]);

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
    const chartHeights = rawHeights.map((height, i) => {
      if (i !== 0) {
        start += rawHeights[i - 1].height + graphGap;
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
        24
      : 0;

  const grid = useMemo(
    () =>
      chartHeights.map((chartHeight) => ({
        id: chartHeight.type,
        top: chartHeight.start,
        left: 60,
        right: 8,
        height: chartHeight.height,
      })),
    [chartHeights]
  );

  const chartOption = {
    grid,
    xAxis,
    yAxis,
    dataset,
    series: getSeries(),
  };

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chart = chartRef.current.getEchartsInstance();
    if (!chart) {
      return;
    }

    chart.setOption(
      {
        grid: [
          {
            id: "binary",
          },
        ],
      },
      {
        replaceMerge: ["xAxis", "yAxis", "grid", "dataset", "series"],
      }
    );
  }, [chartRef]);

  console.log(chartRef?.current?.getEchartsInstance()?._componentsViews);

  return (
    <EChartsReact
      ref={chartRef}
      option={chartOption}
      style={{
        height: totalGraphHeight,
        width: 1000,
      }}
    />
  );
};

export default GraphV2;
