import { EChart } from "@kbox-labs/react-echarts";
import { useContext, useCallback, useRef } from "react";
import { DataZoomContext } from "./DataZoomContext";

export type LineData = [string, number];
export type BarData = [string, number];
export interface DataSet {
  data: Array<LineData | BarData>;
  type: "line" | "bar";
}
interface Props {
  dataset: Array<DataSet>;
}

const MainChart = ({ dataset }: Props) => {
  const { zoom, onZoom } = useContext(DataZoomContext);
  const chartRef = useRef();

  const groupedDataset: Record<
    string,
    Array<LineData | BarData>
  > = Object.groupBy(dataset, (d) => d.type);

  const handleDataZoom = useCallback(
    (params) => {
      onZoom(params.start, params.end);
    },
    [onZoom]
  );
  // console.log(chartRef?.current?.getEchartsInstance());
  // console.log("this is in main chart");
  return (
    <EChart
      // notMerge
      ref={chartRef}
      replaceMerge={["xAxis"]}
      onDataZoom={handleDataZoom}
      style={{
        height: 200,
        width: 1000,
      }}
      grid={dataset.map(() => ({}))}
      dataZoom={[
        {
          type: "inside",
          start: zoom.start,
          end: zoom.end,
        },
        {
          start: zoom.start,
          end: zoom.end,
          //   show: false,
          type: "slider",
        },
      ]}
      xAxis={dataset.map(() => ({
        type: "time",
      }))}
      yAxis={dataset.map(() => ({
        type: "category",
      }))}
      series={[
        {
          type: "line",
          data: [
            ["2022-10-17", 300],
            ["2022-10-18", 100],
            ["2022-10-19", 500],
            ["2022-10-20", 900],
          ],
        },
      ]}
    />
  );
};

export default MainChart;
