import styled from "styled-components";
import "./App.css";
import { useState } from "react";
import chroma from "chroma-js";
import GraphV2, { Asset, Custom, LineData } from "./GraphV2";

const createAnalog = (index: number) => {
  const analogData: Array<LineData> = [
    ["2020-01-01", getRandom(index), 1, 0],
    ["2020-01-02", getRandom(index), 1, 0],
    ["2020-01-03", getRandom(index), 1, 0],
    ["2020-01-04", getRandom(index), 1, 0],
    ["2020-01-05", getRandom(index), 1, 0],
  ];
  const analog: Asset = {
    name: `T1Sensor${index}`,
    assetId: `assetId${index}`,
    pointId: `pointId${index}`,
    twinName: `twinName${index}`,
    data: analogData,
    unit: "%",
    color: chroma.random().hex(),
    graphType: "analog",
  };
  return analog;
};

const getRandom = (num) => {
  return Math.random() * num;
};
const createBinary = (index: number) => {
  const binaryData: Array<Custom> = [
    [
      index,
      new Date("2020-01-01").getTime(),
      new Date("2020-01-02").getTime(),
      1,
    ],
    [
      index,
      new Date("2020-01-02").getTime(),
      new Date("2020-01-03").getTime(),
      1,
    ],
    [
      index,
      new Date("2020-01-03").getTime(),
      new Date("2020-01-04").getTime(),
      1,
    ],
    [
      index,
      new Date("2020-01-04").getTime(),
      new Date("2020-01-05").getTime(),
      1,
    ],
    [
      index,
      new Date("2020-01-05").getTime(),
      new Date("2020-01-06").getTime(),
      1,
    ],
  ];
  const binary: Asset = {
    name: `T1BinarySensor${index}`,
    assetId: `assetId${index}`,
    pointId: `pointId${index}`,
    twinName: `twinName${index}`,
    data: binaryData,
    color: chroma.random().hex(),
    graphType: "binary",
  };
  return binary;
};

function App() {
  const [binaries, setBinaries] = useState<Array<Asset>>([]);
  const [analogs, setAnalogs] = useState<Array<Asset>>([]);

  const handleOnAddBinary = () => {
    setBinaries((prev) => [...prev, createBinary(binaries.length + 1)]);
  };
  const handleOnAddAnalog = () => {
    setAnalogs((prev) => [...prev, createAnalog(analogs.length + 1)]);
  };

  const twinSample = [...analogs, ...binaries];

  const analog = twinSample.filter((c) => c.graphType === "analog");
  const binary = twinSample.filter((c) => c.graphType === "binary").reverse();

  const sensors = [...binary, ...analog];

  return (
    <div>
      <Card>
        <GraphV2
          option={{
            id: "hello",
            dataset: sensors,
          }}
        />
      </Card>
      <button onClick={handleOnAddBinary}>Add binary</button>
      <button onClick={handleOnAddAnalog}>Add analog</button>
    </div>
  );
}

const Card = styled.div(() => ({
  borderRadius: `4px`,
  background: "#242424",
  padding: "16px",
  overflow: `hidden`,
}));

export default App;
