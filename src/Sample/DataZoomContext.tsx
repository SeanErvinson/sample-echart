import { createContext, ReactNode, useContext, useState } from "react";

interface Zoom {
  start: number;
  end: number;
}
interface DataZoom {
  zoom: Zoom;
  onZoom: (start: number, end: number) => void;
}

export const DataZoomContext = createContext<DataZoom>();

const DataZoomProvider = ({ children }: { children: ReactNode }) => {
  const [zoom, setZoom] = useState<Zoom>({ start: 0, end: 100 });

  const onZoom = (start: number, end: number) => {
    setZoom({
      end,
      start,
    });
  };

  return (
    <DataZoomContext.Provider value={{ zoom, onZoom }}>
      {children}
    </DataZoomContext.Provider>
  );
};

export default DataZoomProvider;
