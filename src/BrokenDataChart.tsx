import { EChart } from "@kbox-labs/react-echarts";
import { useRef } from "react";
console.log(new Date(1577836800000).toISOString());

const data = [
  [1577836800000, 22], //86400000
  [1577836800000 + 86400000, 66],
  [1577836800000 + 86400000 * 2, 4],
  [1577836800000 + 86400000 * 3, "-"],
  [1577836800000 + 86400000 * 4, 16],
  [1577836800000 + 86400000 * 5, 2],
  [1577836800000 + 86400000 * 6, 52],
  [1577836800000 + 86400000 * 7, 39],
  [1577836800000 + 86400000 * 8, 2],
  [1577836800000 + 86400000 * 9, 10],
  [1577836800000 + 86400000 * 10, 5],
  [1577836800000 + 86400000 * 11, 27],
];

// const nulls = [
//   ["2020-01-03", 4],
//   ["2020-01-04", 8], // Missing
//   ["2020-01-05", 16],
//   ["2020-01-07", "-"],

//   ["2020-01-08", 52],
//   ["2020-01-09", 52],
//   ["2020-01-10", 52],
// ];

const BrokenDataChart = () => {
  return (
    <EChart
      style={{
        width: 1000,
        height: 1000,
      }}
      tooltip={{
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
      }}
      xAxis={[
        {
          type: "time",
          min: "dataMin",
          max: "dataMax",
          axisLabel: {
            color: (value) => "#fa113a",
          },
        },
      ]}
      yAxis={[
        {
          type: "value",
        },
      ]}
      dataset={[
        {
          source: data,
        },
        // {
        //   source: nulls,
        // },
      ]}
      series={[
        {
          type: "line",
          markArea: {
            itemStyle: {
              color: "red",
            },
            data: [
              [
                {
                  xAxis: "2020-01-03",
                },
                {
                  xAxis: "2020-01-05",
                },
              ],
            ],
          },
        },
        {
          type: "line",
          datasetIndex: 1,
        },
      ]}
    />
  );
};

export default BrokenDataChart;
