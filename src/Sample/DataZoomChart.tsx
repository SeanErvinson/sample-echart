import { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";
import { useCallback, useContext, useMemo } from "react";
import { DataZoomContext } from "./DataZoomContext";
import { EChart } from "@kbox-labs/react-echarts";

const DataZoomChart = () => {
  const { zoom, onZoom } = useContext(DataZoomContext);
  const chartOption: EChartsOption = {
    dataZoom: [
      {
        start: zoom.start,
        end: zoom.end,
      },
    ],
    xAxis: {
      type: "time",
    },
    yAxis: {
      type: "category",
    },
    dataset: {
      source: [["2020-01-01"]],
    },
    series: {
      type: "line",
      datasetIndex: 0,
    },
  };

  const handleDataZoom = useCallback(
    (params) => {
      onZoom(params.start, params.end);
    },
    [onZoom]
  );

  console.log("this is in datazoom");

  return (
    <EChart
      onDataZoom={handleDataZoom}
      style={{
        height: 200,
        width: 1000,
      }}
      dataZoom={[
        {
          start: zoom.start,
          end: zoom.end,
        },
      ]}
      xAxis={{
        type: "time",
        show: false,
      }}
      yAxis={{
        type: "category",
        show: false,
      }}
      series={[
        {
          type: "line",
          data: [],
        },
      ]}
    />
  );
};

export default DataZoomChart;
