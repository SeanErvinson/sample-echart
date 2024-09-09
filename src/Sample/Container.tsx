import { useState } from "react";
import DataZoomChart from "./DataZoomChart";
import DataZoomProvider from "./DataZoomContext";
import MainChart, { BarData, DataSet, LineData } from "./MainChart";

const getRandom = (num) => {
  return Math.random() * num;
};

const createBinary = (index: number) => {
  const data: Array<BarData> = [
    ["2020-01-01", getRandom(index)],
    ["2020-01-02", getRandom(index)],
    ["2020-01-03", getRandom(index)],
    ["2020-01-04", getRandom(index)],
    ["2020-01-05", getRandom(index)],
    ["2020-01-06", getRandom(index)],
  ];
  const binary: DataSet = {
    data: data,
    type: "bar",
  };
  return binary;
};

const createAnalog = (index: number) => {
  const data: Array<LineData> = [
    ["2020-01-01", getRandom(index)],
    ["2020-01-02", getRandom(index)],
    ["2020-01-03", getRandom(index)],
    ["2020-01-04", getRandom(index)],
    ["2020-01-05", getRandom(index)],
    ["2020-01-06", getRandom(index)],
  ];
  const binary: DataSet = {
    data: data,
    type: "line",
  };
  return binary;
};

const Container = () => {
  const [binaries, setBinaries] = useState<Array<DataSet>>([]);
  const [analogs, setAnalogs] = useState<Array<DataSet>>([]);

  const handleOnAddBinary = () => {
    setBinaries((prev) => [...prev, createBinary(binaries.length + 1)]);
  };
  const handleOnAddAnalog = () => {
    setAnalogs((prev) => [...prev, createAnalog(analogs.length + 1)]);
  };

  const twinSample = [...analogs, ...binaries];

  const analog = twinSample.filter((c) => c.type === "line");
  const binary = twinSample.filter((c) => c.type === "bar").reverse();
  const dataset = [...binary, ...analog];

  return (
    <>
      <DataZoomProvider>
        <DataZoomChart></DataZoomChart>
        {dataset.length > 0 && <MainChart dataset={dataset}></MainChart>}
      </DataZoomProvider>
      <button onClick={handleOnAddBinary}>Add binary</button>
      <button onClick={handleOnAddAnalog}>Add analog</button>
    </>
  );
};

export default Container;
