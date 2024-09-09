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

const CustomChart = <T,>({ option }: { option: ChartOptions<T> }) => {
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

    const renderItem = (
      params: echarts.EChartOption.SeriesCustom.RenderItemParams,
      api: echarts.EChartOption.SeriesCustom.RenderItemApi
    ): echarts.EChartOption.SeriesCustom.RenderItem => {
      const categoryIndex = api.value(0);
      const start = api.coord([api.value(1), categoryIndex]);
      const end = api.coord([api.value(2), categoryIndex]);

      console.log(api.value(1));

      const height = api.size([0, 1])[1];
      const width = end[0] - start[0];
      const coordSys = params.coordSys!;
      const rectShape = echarts.graphic.clipRectByRect(
        {
          x: start[0] - width / 2,
          y: start[1] - height / 2,
          width: width,
          height: height,
        },
        {
          x: coordSys.x!,
          y: coordSys.y!,
          width: coordSys.width!,
          height: coordSys.height!,
        }
      );
      return (
        rectShape && {
          type: "rect",
          shape: rectShape,
          ignore: isNaN(api.value(3)),
          style: api.style({}),
          emphasisDisabled: true,
          transition: ["shape"],
        }
      );
    };

    let baseTime = new Date("2020-01-01 00:00").getTime();

    const data = [
      ["2020-01-01 00:00", 0, 0],
      ["2020-01-01 00:15", 0, 1],
      ["2020-01-01 00:30", 0, 1],
      ["2020-01-01 00:45", 0, 0],
      ["2020-01-01 03:00", 0, "-"],
      ["2020-01-02 00:00", 0, 0],
      //   ["2020-01-01", 1, 0],
      //   ["2020-01-02", 1, 1],
      //   ["2020-01-03", 1, 1],
      //   ["2020-01-04", 1, 0],
      //   ["2020-01-05", 1, 0],
    ];
    // const x = [];
    // const durationGranulairty = 900000;
    // for (let i = 0; i < data.length; i++) {
    //   x.push({
    //     value: [
    //       data[i][1],
    //       baseTime,
    //       (baseTime += durationGranulairty),
    //       data[i][2],
    //     ],
    //     itemStyle: {
    //       color: "#7b9ce1",
    //       opacity: data[i][2] === 0 ? 0.5 : 1,
    //     },
    //   });

    //   if (i === data.length - 1) {
    //     baseTime = new Date(data[data.length - 1][0]).getTime();
    //     continue;
    //   }
    //   baseTime = new Date(data[i + 1][0]).getTime();
    // }

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
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          console.log(params);
        },
        axisPointer: {
          axis: "x",
          snap: true,
        },
      },
      //   dataZoom: [{}],
      xAxis: [
        {
          type: "time",
          min: "dataMin",
          max: "dataMax",
        },
      ],
      yAxis: [
        {
          type: "value",
          minInterval: 2,
        },
      ],
      //   visualMap: getVisualMap(),
      legend: option.showLegend
        ? {
            textStyle: {
              color: "#c6c6c6",
            },
            bottom: 0,
            left: 0,
          }
        : undefined,
      // dataset: [
      //   {
      //     dimensions: ["row", "start", "end", "value"],
      //     source: [
      //       [0, 1577797200000, 1577798100000, 0, { A: 1 }],
      //       [0, 1577798100000, 1577799000000, 1, { A: 1 }],
      //       [0, 1577799000000, 1577799900000, 1, { A: 1 }],
      //       [0, 1577799900000, 1577800800000, 0, { A: 1 }],
      //       [0, 1577808000000, 1577808900000, "-", { A: 1 }],
      //       [0, 1577883600000, 1577884500000, 0, { A: 1 }],
      //     ],
      //   },
      //   {
      //     dimensions: ["row", "start", "end", "value"],
      //     source: [
      //       [1, 1577797200000, 1577798100000, 0, { A: 1 }],
      //       [1, 1577798100000, 1577799000000, 1, { A: 1 }],
      //       [1, 1577799000000, 1577799900000, 1, { A: 1 }],
      //       [1, 1577799900000, 1577800800000, 0, { A: 1 }],
      //       [1, 1577808000000, 1577808900000, "-", { A: 1 }],
      //       [1, 1577883600000, 1577884500000, 0, { A: 1 }],
      //     ],
      //   },
      // ],
      series: [
        {
          type: "line",
          data: [
            ["2020-01-01", 1],
            ["2020-01-02", 0],
            ["2020-01-03", 0.4],
            ["2020-01-04", 3],
            ["2020-01-05", 2],
          ],
        },
        // {
        //   type: "custom",
        //   renderItem: renderItem,
        //   datasetIndex: 0,
        //   stack: "binary",
        //   itemStyle: {
        //     opacity: 0.8,
        //   },
        //   encode: {
        //     x: ["start", "end"],
        //     y: "time",
        //     value: "value",
        //   },
        // },
      ],
    });
  }, [echart]);

  return <div id={echartsDomId}></div>;
};

export default CustomChart;
