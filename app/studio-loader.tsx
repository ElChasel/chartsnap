"use client";
import { useEffect,useState } from "react";
export default function StudioLoader() {
  const [Studio,setStudio]=useState<any>(null);
  useEffect(() => {
    import("../src/main.jsx").then(m=>setStudio(()=>m.default));
  }, []);
  return (
    <div id="root">{Studio?<Studio/>:
      <div
        style={{
          padding: 50,
          fontFamily: "Segoe UI, sans-serif",
          color: "#6d6b9d",
        }}
      >
        ChartSnap · 611 Studio
        <br />
        正在准备本地数据工作台…
      </div>}
    </div>
  );
}
