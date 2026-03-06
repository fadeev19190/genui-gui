import React from "react";
import { Card, CardBody, CardHeader, Badge, Alert } from "reactstrap";
import { Chart } from "react-chartjs-2";
import "chart.js/auto";

/**
 * Parses REINVENT training log to extract useful information
 */
function parseTrainingLog(logContent) {
  if (!logContent) return null;

  const lines = logContent.split('\n');
  const info = {
    currentEpoch: null,
    totalEpochs: null,
    bestEpoch: null,
    bestValidationLoss: null,
    warnings: [],
    errors: [],
    isFinished: false,
    peakMemory: null,
    startTime: null,
    endTime: null,
    progress: []
  };

  lines.forEach(line => {
    // Extract epoch progress: "Epoch 10: |##########|00:29"
    const epochMatch = line.match(/Epoch\s+(\d+):/);
    if (epochMatch) {
      const epoch = parseInt(epochMatch[1]);
      info.currentEpoch = Math.max(info.currentEpoch || 0, epoch);
      info.totalEpochs = Math.max(info.totalEpochs || 0, epoch);

      // Extract progress bar to estimate completion
      const progressMatch = line.match(/\|([#\s]+)\|/);
      if (progressMatch) {
        const bar = progressMatch[1];
        const filled = (bar.match(/#/g) || []).length;
        const total = bar.length;
        info.progress.push({ epoch, percent: (filled / total) * 100 });
      }
    }

    // Extract best validation loss: "Best validation loss (29.721) was at epoch 10"
    const bestLossMatch = line.match(/Best validation loss \(([0-9.]+)\) was at epoch (\d+)/);
    if (bestLossMatch) {
      info.bestValidationLoss = parseFloat(bestLossMatch[1]);
      info.bestEpoch = parseInt(bestLossMatch[2]);
    }

    // Extract warnings
    if (line.includes('<WARN>')) {
      const warnMatch = line.match(/<WARN>\s*(.+)/);
      if (warnMatch) {
        info.warnings.push(warnMatch[1].trim());
      }
    }

    // Extract errors
    if (line.includes('<ERROR>') || line.includes('ERROR')) {
      info.errors.push(line.trim());
    }

    // Check if finished
    if (line.includes('Finished REINVENT')) {
      info.isFinished = true;
      const dateMatch = line.match(/on (\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        info.endTime = dateMatch[1];
      }
    }

    // Extract start time
    if (line.includes('Started REINVENT')) {
      const dateMatch = line.match(/on (\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        info.startTime = dateMatch[1];
      }
    }

    // Extract peak memory
    const memMatch = line.match(/Peak main memory usage:\s*([0-9.]+)\s*MiB/);
    if (memMatch) {
      info.peakMemory = parseFloat(memMatch[1]);
    }
  });

  return info;
}

function TrainingLogViewer(props) {
  const [logContent, setLogContent] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [tbInfo, setTbInfo] = React.useState(null);
  const [tbError, setTbError] = React.useState(null);
  const intervalRef = React.useRef(null);

  // Keep a ref to the latest props so fetch functions inside the interval
  // always see current values without being listed as effect dependencies.
  const propsRef = React.useRef(props);
  React.useEffect(() => {
    propsRef.current = props;
  });

  // Stable fetch functions — never recreated, always read from propsRef.
  const fetchLog = React.useCallback(async () => {
    const { model, apiUrls } = propsRef.current;
    const modelId = model?.id;
    const apiUrl = apiUrls?.reinventRoot;
    if (!modelId || !apiUrl) return;

    setLoading(true);
    setError(null);
    try {
      const url = new URL(`networks/${modelId}/training-log/`, apiUrl);
      const resp = await fetch(url, { credentials: "include" });
      const data = await resp.json();
      if (resp.ok && data.exists) {
        setLogContent(data.content);
      } else {
        setLogContent(null);
        setError(data.message || "Log not available");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch training log");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTb = React.useCallback(async () => {
    const { model, apiUrls } = propsRef.current;
    const modelId = model?.id;
    const apiUrl = apiUrls?.reinventRoot;
    if (!modelId || !apiUrl) return;

    setTbError(null);
    try {
      const url = new URL(`networks/${modelId}/training-tb/`, apiUrl);
      const resp = await fetch(url, { credentials: "include" });
      const data = await resp.json();
      if (resp.ok && data.exists) {
        setTbInfo(data);
      } else {
        setTbInfo(null);
        if (data.message) setTbError(data.message);
      }
    } catch (err) {
      setTbError(err.message || "Failed to fetch TensorBoard data");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // This effect only runs when the model ID changes (e.g. user opens a
  // different model). It is NOT triggered by parent re-renders.
  const modelId = props.model?.id;
  React.useEffect(() => {
    if (!modelId) return;

    // Initial fetch always
    fetchLog();
    fetchTb();

    if (intervalRef.current) clearInterval(intervalRef.current);

    // Poll every 5s, but only when a training task is actually running.
    // propsRef.current always holds the latest props without being a dependency.
    intervalRef.current = setInterval(() => {
      if (propsRef.current.tasksRunning) {
        fetchLog();
        fetchTb();
      }
    }, 5000);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [modelId, fetchLog, fetchTb]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !logContent && !tbInfo) {
    return <div style={{ padding: "1rem" }}>Loading training info...</div>;
  }
  if (error && !logContent && !tbInfo) {
    return <Alert color="info" style={{ margin: "1rem" }}>{error}</Alert>;
  }
  if (!logContent && !tbInfo) return null;

  const info = parseTrainingLog(logContent || "");
  const safeInfo = info || {
    currentEpoch: null,
    totalEpochs: null,
    bestEpoch: null,
    bestValidationLoss: null,
    warnings: [],
    errors: [],
    isFinished: false,
    peakMemory: null,
    startTime: null,
    endTime: null,
    progress: []
  };

  const tbSub = tbInfo?.subfolders || {};
  const tbSample = tbSub.sample || null;
  const tbTrain = tbSub.train || null;
  const tbValid = tbSub.valid || null;
  const sampleSeries = tbSample?.series || [];
  const trainSeries = tbTrain?.series || [];
  const validSeries = tbValid?.series || [];
  const hasSeries = sampleSeries.length || trainSeries.length || validSeries.length;

  const currentEpoch = safeInfo.currentEpoch ?? tbInfo?.valid?.latest?.step ?? null;
  const bestLoss = safeInfo.bestValidationLoss ?? tbInfo?.valid?.best?.value ?? null;
  const bestEpoch = safeInfo.bestEpoch ?? tbInfo?.valid?.best?.step ?? null;
  const latestTrain = tbInfo?.train?.latest;

  const seriesToDataset = (label, color, series) => ({
    label,
    data: series.map(p => ({ x: p.step, y: p.value })),
    borderColor: color, backgroundColor: color, fill: false, tension: 0.1,
  });

  return (
    <Card style={{ margin: "1rem 0" }}>
      <CardHeader style={{ backgroundColor: "#f8f9fa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h5 style={{ margin: 0 }}>📊 Training Progress</h5>
          {safeInfo.isFinished
            ? <Badge color="success">✓ Completed</Badge>
            : <Badge color="primary">⚙ Running</Badge>}
        </div>
      </CardHeader>
      <CardBody>
        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          {currentEpoch !== null && (
            <div>
              <strong>Current Epoch:</strong>
              <div style={{ fontSize: "1.5rem", color: "#007bff" }}>
                {currentEpoch}{safeInfo.totalEpochs ? ` / ${safeInfo.totalEpochs}` : ''}
              </div>
            </div>
          )}
          {bestLoss !== null && (
            <div>
              <strong>Best Validation Loss:</strong>
              <div style={{ fontSize: "1.5rem", color: "#28a745" }}>{Number(bestLoss).toFixed(3)}</div>
              {bestEpoch !== null && <div style={{ fontSize: "0.9rem", color: "#6c757d" }}>at epoch {bestEpoch}</div>}
            </div>
          )}
          {latestTrain?.value != null && (
            <div>
              <strong>Latest Train Loss:</strong>
              <div style={{ fontSize: "1.2rem", color: "#6c757d" }}>{Number(latestTrain.value).toFixed(3)}</div>
            </div>
          )}
          {safeInfo.peakMemory !== null && (
            <div>
              <strong>Peak Memory:</strong>
              <div style={{ fontSize: "1.2rem", color: "#6c757d" }}>{safeInfo.peakMemory.toFixed(1)} MiB</div>
            </div>
          )}
        </div>

        {/* TensorBoard subfolder metrics */}
        {(tbSample?.latest || tbTrain?.latest || tbValid?.latest) && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>TensorBoard NLL (A_Mean)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {tbSample?.latest && (
                <div>
                  <strong>Sample Loss:</strong>
                  <div style={{ fontSize: "1.1rem" }}>{Number(tbSample.latest.value).toFixed(3)}</div>
                  {tbSample.best && <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>best {Number(tbSample.best.value).toFixed(3)} @ {tbSample.best.step}</div>}
                </div>
              )}
              {tbTrain?.latest && (
                <div>
                  <strong>Training Loss:</strong>
                  <div style={{ fontSize: "1.1rem" }}>{Number(tbTrain.latest.value).toFixed(3)}</div>
                  {tbTrain.best && <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>best {Number(tbTrain.best.value).toFixed(3)} @ {tbTrain.best.step}</div>}
                </div>
              )}
              {tbValid?.latest && (
                <div>
                  <strong>Validation Loss:</strong>
                  <div style={{ fontSize: "1.1rem" }}>{Number(tbValid.latest.value).toFixed(3)}</div>
                  {tbValid.best && <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>best {Number(tbValid.best.value).toFixed(3)} @ {tbValid.best.step}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NLL curves chart */}
        {hasSeries ? (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>TensorBoard NLL Curves</div>
            <Chart
              type="line"
              data={{
                datasets: [
                  ...(sampleSeries.length ? [seriesToDataset("Sample", "#36a2eb", sampleSeries)] : []),
                  ...(trainSeries.length ? [seriesToDataset("Train", "#ff6384", trainSeries)] : []),
                  ...(validSeries.length ? [seriesToDataset("Valid", "#7fd280", validSeries)] : []),
                ]
              }}
              options={{
                parsing: false,
                animation: false,
                scales: {
                  x: { type: "linear", title: { display: true, text: "Epoch" } },
                  y: { title: { display: true, text: "NLL" } }
                },
                plugins: { legend: { display: true } }
              }}
            />
          </div>
        ) : null}

        {tbError && <Alert color="info" style={{ marginTop: "0.5rem" }}>TensorBoard: {tbError}</Alert>}

        {safeInfo.warnings.length > 0 && (
          <Alert color="warning" style={{ marginTop: "1rem" }}>
            <strong>⚠️ Warnings:</strong>
            <ul style={{ marginBottom: 0, marginTop: "0.5rem" }}>
              {safeInfo.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Alert>
        )}

        {safeInfo.errors.length > 0 && (
          <Alert color="danger" style={{ marginTop: "1rem" }}>
            <strong>❌ Errors:</strong>
            <ul style={{ marginBottom: 0, marginTop: "0.5rem" }}>
              {safeInfo.errors.map((e, i) => <li key={i} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{e}</li>)}
            </ul>
          </Alert>
        )}

        {safeInfo.progress.length > 0 && !safeInfo.isFinished && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>Training Progress</div>
            <div style={{ width: "100%", height: "20px", backgroundColor: "#e9ecef", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                width: `${safeInfo.progress[safeInfo.progress.length - 1]?.percent || 0}%`,
                height: "100%", backgroundColor: "#007bff", transition: "width 0.3s ease"
              }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#6c757d" }}>
          {safeInfo.startTime && <div>Started: {safeInfo.startTime}</div>}
          {safeInfo.endTime && <div>Finished: {safeInfo.endTime}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

// Only re-render when the model ID or API root URL actually changes.
// This prevents the 2-second polling in ModelPerformance from
// constantly unmounting/remounting the chart and resetting state.
export default React.memo(TrainingLogViewer, (prev, next) => {
  return (
    prev.model?.id === next.model?.id &&
    prev.apiUrls?.reinventRoot === next.apiUrls?.reinventRoot
  );
});

