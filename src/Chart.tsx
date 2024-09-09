import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

type GraphType = "binary" | "analog" | "multistate";

type ShadedRegion = {
  start: number;
  end: number;
  color: string;
};

export interface Asset<T> {
  sensor: string;
  graphType: GraphType;
  unit?: string;
  color: string;
  valueMap?: Record<string, string>;
  shadedRegions?: ShadedRegion[];
  data:
    | [number | string, number | string, number?, number?, T?][]
    | [number | string, number, number | string, T?][];
}

interface ChartOptions<T> {
  id: string;
  title: string;
  dataset: Asset<T>[];
  showLegend: boolean;
}

const generateOpacity = (count: number) => {
  const opacities: number[] = [];
  for (let i = 1; i <= count; i++) {
    opacities.push(parseFloat((i / count).toFixed(2)));
  }
  return opacities;
};

const trySort = (arr: string[]) => {
  const order = ["binary", "multistate", "analog"];
  const orderMap = new Map(order.map((item, index) => [item, index]));

  return arr.sort((a, b) => {
    const indexA = orderMap.has(a) ? orderMap.get(a)! : order.length;
    const indexB = orderMap.has(b) ? orderMap.get(b)! : order.length;
    return indexA - indexB;
  });
};

const Chart = <T,>({ option }: { option: ChartOptions<T> }) => {
  const echartsDomId = `graph-container-${option.id}`;
  const [echart, setEchart] = useState<echarts.ECharts | null>(null);
  const graphContainer = useRef<HTMLElement | null>();
  const tooltipRef = useRef<HTMLElement | null>();

  const assets = option.dataset;
  const assetGroupByGraphType = Object.groupBy(assets, (t) =>
    t.unit ? `${t.graphType}${t.unit}` : t.graphType
  );
  // Order it by binary, multistate, analog
  const assetGroupByGraphTypeKeys = trySort(Object.keys(assetGroupByGraphType));

  const getVisualMap = () => {
    const visualMaps: echarts.EChartOption.VisualMap[] = [];

    assets.forEach((a, index) => {
      if (a.graphType === "binary") {
        visualMaps.push({
          pieces: [
            {
              value: 0,
              color: a.color,
              opacity: 0.5,
            },
            {
              value: 1,
              color: a.color,
              opacity: 1,
            },
          ],
          seriesIndex: index,
          show: false,
          type: "piecewise",
          right: 10,
        });
      } else if (a.graphType === "multistate") {
        if (!a.valueMap) {
          throw new Error("Value map is missing");
        }
        const valueMapCount = Object.keys(a.valueMap).length;
        const opacities = generateOpacity(valueMapCount);

        visualMaps.push({
          pieces: [...Array(valueMapCount + 1).keys()].map((value) => ({
            value: value,
            color: a.color,
            opacity: opacities[value],
          })),
          seriesIndex: index,
          show: false,
          type: "piecewise",
          right: 10,
        });
      }
    });

    return visualMaps;
  };

  const getXAxis = (): echarts.EChartOption.XAxis[] => {
    return assetGroupByGraphTypeKeys.map((a, index) => ({
      gridIndex: index,
      type: "time",
      boundaryGap: false,
    }));
  };

  const getYAxis = (): echarts.EChartOption.YAxis[] => {
    return assetGroupByGraphTypeKeys.map((a, index) => {
      let option: echarts.EChartOption.YAxis = {};
      if (a === "binary") {
        option = {
          ...option,
          axisLabel: {
            formatter: "bool",
          },
          axisLine: {
            onZero: false,
          },
        };
      } else if (a === "multistate") {
        option = {
          ...option,
          axisLabel: {
            formatter: "state",
          },
          axisLine: {
            onZero: false,
          },
        };
      } else {
        option = {
          name: a,
          nameLocation: "middle",
          type: "value",
          splitNumber: 3,
          boundaryGap: true,
        };
      }
      return {
        type: "category",
        gridIndex: index,
        axisLabel: {
          ...option.axisLabel,
          color: "#838383",
        },
        ...option,
      };
    });
  };

  const getDataset = () => {
    return assets.map((asset) => {
      let option: echarts.EChartOption.Dataset = {};

      if (asset.graphType !== "analog") {
        option = {
          ...option,
          dimensions: ["time", "row", "value"],
        };
      } else {
        option = {
          ...option,
          dimensions: ["time", "value", "confidence", "lower"],
        };
      }

      return {
        ...option,
        source: asset.data,
      };
    });
  };

  console.log(getDataset());

  const getSeries = () => {
    let lastGraphType: GraphType | null = null;
    let currentIndex = -1;
    return assets.flatMap<echarts.EChartOption.Series>((sensor, index) => {
      if (sensor.graphType !== lastGraphType) {
        lastGraphType = sensor.graphType;
        currentIndex++;
      }
      let options: echarts.EChartOption.Series[] = [];

      if (sensor.graphType === "binary") {
        options = [
          {
            name: sensor.sensor,
            type: "heatmap",
            xAxisIndex: currentIndex,
            yAxisIndex: currentIndex,
            datasetIndex: index,
            label: {
              show: false,
            },
            itemStyle: {
              color: sensor.color,
            },
          },
        ];
      } else if (sensor.graphType === "multistate") {
        options = [
          {
            name: sensor.sensor,
            type: "heatmap",
            xAxisIndex: currentIndex,
            yAxisIndex: currentIndex,
            datasetIndex: index,
            label: {
              show: false,
            },
            itemStyle: {
              color: sensor.color,
            },
          },
        ];
      }
      if (sensor.graphType === "analog") {
        const unitIndex = assetGroupByGraphTypeKeys.findIndex(
          (d) => d === `${sensor.graphType}${sensor.unit}`
        );

        const axisIndex = unitIndex !== -1 ? unitIndex : currentIndex;

        options = [
          {
            name: sensor.sensor,
            type: "line",
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            datasetIndex: index,
            label: {
              show: false,
            },
            markArea: {
              itemStyle: {
                color: "red",
              },
              data: [
                [
                  {
                    xAxis: "2020-01-01 12:00",
                  },
                  {
                    xAxis: "2020-01-02 15:30",
                  },
                ],
              ],
            },
            stack: `confidence-band-${sensor.sensor}`,
            itemStyle: {
              color: sensor.color,
            },
          },
          {
            type: "line",
            name: `${sensor.sensor}-upper-bound`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            datasetIndex: index,
            lineStyle: {
              opacity: 0,
            },
            encode: {
              y: "confidence",
            },
            areaStyle: {
              color: sensor.color,
            },
            stack: `confidence-band-${sensor.sensor}`,
            symbol: "none",
            showSymbol: false,
          },
          {
            type: "line",
            name: `${sensor.sensor}-lower-bound`,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            datasetIndex: index,
            encode: {
              y: "lower",
            },
            lineStyle: {
              opacity: 0,
            },
            stack: `confidence-band-${sensor.sensor}`,
            symbol: "none",
            showSymbol: false,
          },
        ];
      }
      return options;
    });
  };

  const getChartHeight = () => {
    const numberOfBinary = assetGroupByGraphType["binary"]?.length ?? 0;
    const numberOfMultiState = assetGroupByGraphType["multistate"]?.length ?? 0;

    let lastGraphHeight = 0;

    const rawHeights = assetGroupByGraphTypeKeys.map((graphType) => {
      let height = 0;
      if (graphType === "binary") {
        height = numberOfBinary * 64;
      } else if (graphType === "multistate") {
        height = numberOfMultiState * 64;
      } else {
        height = 400; // Change the value depending on the view
      }
      lastGraphHeight = lastGraphHeight + height;
      return height;
    });

    let start = 40;
    const graphGap = 32;
    const chartHeights = rawHeights.map((height, index) => {
      if (index !== 0) {
        start += rawHeights[index - 1] + graphGap;
      }
      return {
        start: start,
        height: height,
      };
    });

    return chartHeights;
  };

  const chartHeights = getChartHeight();

  const totalGraphHeight =
    chartHeights[chartHeights.length - 1].height +
    chartHeights[chartHeights.length - 1].start +
    64;

  // useEffect(() => {
  //   const toolTipContainer = document.getElementById("test");

  //   if (tooltipRef.current) {
  //     return;
  //   }

  //   tooltipRef.current = toolTipContainer;
  // }, []);

  useEffect(() => {
    const container = document.getElementById(echartsDomId);
    if (!container || !graphContainer) {
      return;
    }
    graphContainer.current = container;
    initializeECharts(container);

    return () => {
      window.removeEventListener("resize", resize);
      echart?.dispose();
      setEchart(null);
    };
  }, []);

  useEffect(() => {
    if (!echart) {
      return;
    }

    window.addEventListener("resize", resize);
  }, [echart]);

  const initializeECharts = (container: HTMLElement) => {
    setEchart(
      echarts.init(container, null, {
        width: 1200,
        height: totalGraphHeight,
      })
    );
  };

  const resize = () => {
    if (echart?.isDisposed()) {
      return;
    }

    echart?.resize();
  };

  useEffect(() => {
    if (!echart) {
      return;
    }

    if (echart.isDisposed() && graphContainer.current) {
      initializeECharts(graphContainer.current);
    }

    echart.setOption({
      title: [
        {
          text: option.title,
          textStyle: {
            color: "#c6c6c6",
          },
        },
      ],
      backgroundColor: "#242424",
      grid: chartHeights.map((chartHeight) => ({
        top: chartHeight.start,
        left: 40,
        right: 16,
        height: chartHeight.height,
        show: true,
        borderWidth: 1,
        borderColor: "rgba(128, 128, 128, 0.5)",
      })),
      tooltip: {
        trigger: "axis",
      },
      dataZoom: [{}],
      xAxis: getXAxis(),
      yAxis: getYAxis(),
      visualMap: getVisualMap(),
      legend: option.showLegend
        ? {
            textStyle: {
              color: "#c6c6c6",
            },
            bottom: 0,
            left: 0,
          }
        : undefined,
      dataset: getDataset(),
      series: getSeries(),
    });
  }, [echart]);

  return <div id={echartsDomId}></div>;
};

export default Chart;
