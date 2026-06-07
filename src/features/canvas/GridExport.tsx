import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface GridExportProps {
  onClose: () => void;
}

export function GridExport({ onClose }: GridExportProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [ratioW, setRatioW] = useState(16);
  const [ratioH, setRatioH] = useState(9);
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [cellSize, setCellSize] = useState(200);
  const [thickness, setThickness] = useState(2);
  const [lineColor, setLineColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellWidth = cellSize * (ratioW / ratioH);
    const cellHeight = cellSize;

    const canvasWidth = cols * cellWidth;
    const canvasHeight = rows * cellHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Lines
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = thickness;

    // Vertical lines
    for (let i = 1; i < cols; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 1; i < rows; i++) {
      const y = i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }, [ratioW, ratioH, rows, cols, cellSize, thickness, lineColor, bgColor]);

  // Draw on mount and when params change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `storyboard-grid-${ratioW}x${ratioH}-${rows}x${cols}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        width: "800px",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#333" }}>{t('gridExport.title')}</h2>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: "none",
              background: "#f5f5f5",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          {/* Controls */}
          <div style={{ width: "280px", flexShrink: 0 }}>
            {/* Aspect Ratio */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t('gridExport.cellRatio')}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  value={ratioW}
                  onChange={(e) => setRatioW(parseInt(e.target.value) || 16)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
                <span style={{ lineHeight: "40px", color: "#999" }}>:</span>
                <input
                  type="number"
                  value={ratioH}
                  onChange={(e) => setRatioH(parseInt(e.target.value) || 9)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Rows & Cols */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t('gridExport.gridSettings')}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  min={1}
                  max={10}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
                <span style={{ lineHeight: "40px", color: "#999" }}>×</span>
                <input
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  min={1}
                  max={10}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    fontSize: "14px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Cell Size */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t('gridExport.cellSize', { size: cellSize })}
              </label>
              <input
                type="range"
                min={50}
                max={500}
                value={cellSize}
                onChange={(e) => setCellSize(parseInt(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Thickness */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t('gridExport.lineThickness', { thickness })}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={thickness}
                onChange={(e) => setThickness(parseInt(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Colors */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t('gridExport.colorSettings')}
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>{t('gridExport.background')}</span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: "32px", height: "32px", border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>{t('gridExport.line')}</span>
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    style={{ width: "32px", height: "32px", border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              {t('gridExport.downloadImage')}
            </button>
          </div>

          {/* Preview */}
          <div style={{
            flex: 1,
            background: "#f9f9f9",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
          }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: "400px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "#999" }}>
          {t('gridExport.status', { ratioW, ratioH, rows, cols, thickness })}
        </div>
      </div>
    </div>
  );
}
