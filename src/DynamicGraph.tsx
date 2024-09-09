import { EChartOption, XAXisComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";

type DLineData = [string, number];

type DLine = {
  data: Array<DLineData>;
  type: "A" | "B";
  name: string;
};

interface Props {
  line: DLine;
}

const DynamicGraph = ({ line }: Props) => {
    Object.group

  const xAxis: XAXisComponentOption[] = line.data.map((d, index) => ({
    gridIndex: index,
    type: "time",
    min: "dataMin",
    max: "dataMax",
  }));
  const chartOptions: EChartOption = {
    xAxis: [],
  };

  return <EChartsReact option={} />;
};

export default DynamicGraph;
