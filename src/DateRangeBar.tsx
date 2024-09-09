import React from "react";

interface BarProps {
  startDate: Date;
  endDate: Date;
}

const HorizontalBar: React.FC<BarProps> = ({ startDate, endDate }) => {
  const intervals = 9;
  const labels = [1, 3, 5, 7, 9];

  const getIntervalWidth = () => {
    return 100 / intervals;
  };

  const getIntervalDates = () => {
    const intervalDates = [];
    const timeDiff = endDate.getTime() - startDate.getTime();
    const intervalTime = timeDiff / intervals;

    for (let i = 0; i <= intervals; i++) {
      const intervalDate = new Date(startDate.getTime() + intervalTime * i);
      intervalDates.push(intervalDate);
    }

    return intervalDates;
  };

  const renderLabels = () => {
    const intervalDates = getIntervalDates();
    return labels.map((label) => (
      <div
        key={label}
        style={{
          position: "absolute",
          left: `${(label - 1) * getIntervalWidth()}%`,
          transform: "translateX(-50%)",
        }}
      >
        {intervalDates[label - 1].toLocaleDateString()}
      </div>
    ));
  };

  const renderIntervals = () => {
    return Array.from({ length: intervals }).map((_, index) => (
      <div
        key={index}
        style={{
          position: "absolute",
          left: `${index * getIntervalWidth()}%`,
          height: "100%",
          top: "-50%",
          borderLeft: "1px solid #363636",
        }}
      />
    ));
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "24px" }}>
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "2px",
          backgroundColor: "#363636",
        }}
      />
      {renderIntervals()}
      {renderLabels()}
    </div>
  );
};

export default HorizontalBar;
