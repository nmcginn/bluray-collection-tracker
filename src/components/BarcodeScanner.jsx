import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatOneDReader } from '@zxing/browser';

// Camera needs HTTPS (or localhost) — see PLAN.md; Pages serves HTTPS in prod.
const BARCODE_RE = /^\d{8,14}$/; // UPC-A/EAN-8/EAN-13 lengths

function messageFor(err) {
  if (err && err.name === 'NotAllowedError') {
    return 'Camera access was denied. Allow camera access for this site and try again.';
  }
  if (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
    return 'No camera was found on this device.';
  }
  return 'Could not start the camera.';
}

export default function BarcodeScanner({ onScan }) {
  const videoRef = useRef(null);
  // Keep the latest callback in a ref so a parent re-render doesn't restart
  // the camera (the effect below must run exactly once per mount).
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatOneDReader();
    let controls = null;
    let done = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, ctl) => {
        if (done || !result) return;
        const text = result.getText();
        if (!BARCODE_RE.test(text)) return; // ignore non-UPC/EAN 1D codes
        done = true;
        ctl.stop();
        onScanRef.current(text);
      })
      .then((ctl) => {
        controls = ctl;
        if (done) ctl.stop(); // unmounted or scanned before startup resolved
      })
      .catch((err) => setError(messageFor(err)));

    return () => {
      done = true;
      if (controls) controls.stop();
    };
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div className="scanner">
      {/* muted + playsInline keep mobile browsers from blocking/fullscreening playback */}
      <video ref={videoRef} className="scanner-video" muted playsInline />
      <p className="tagline">Point the camera at the disc barcode…</p>
    </div>
  );
}
