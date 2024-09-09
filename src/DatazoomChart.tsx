import { EChart } from "@kbox-labs/react-echarts";
import HorizontalBar from "./DateRangeBar";

const DatazoomChart = ({ zoom, setZoom }) => {
  return (
    <>
      <div
        style={{
          height: 24,
          position: "relative",
          zIndex: 1,
        }}
      >
        <EChart
          style={{
            width: 1000,
            height: 24,
          }}
          xAxis={[
            {
              type: "time",
            },
          ]}
          yAxis={[
            {
              type: "value",
            },
          ]}
          grid={{
            left: 0,
            right: 0,
          }}
          series={[]}
          dataZoom={[
            {
              start: zoom[0],
              end: zoom[1],
              backgroundColor: "#ffffff00",
              moveHandleSize: 1,
              moveHandleStyle: {
                color: "#5945D733",
                borderColor: "#7D62DF",
              },
              selectedDataBackground: {
                areaStyle: {
                  color: "#5945D7",
                  opacity: 0.2,
                },
                lineStyle: {
                  width: 0,
                },
              },
              dataBackground: {
                areaStyle: {
                  opacity: 0,
                },
                lineStyle: {
                  width: 0,
                },
              },
              height: 20,
              fillerColor: "#5945D733",
              handleStyle: {
                color: "#5945D733",
                borderWidth: 1,
              },
              borderRadius: 0,
              borderColor: "#ffffff00",
              top: 0,
            },
          ]}
        />
      </div>
    </>
  );
};

export default DatazoomChart;
