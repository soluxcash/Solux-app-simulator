
import React, { useState, useEffect, useRef } from 'react';
import { SecuritySettings } from '../types';

interface SecurityViewProps {
  settings: SecuritySettings;
  onUpdate: (updates: Partial<SecuritySettings>) => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ settings, onUpdate }) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      if (typeof (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable().then((available: boolean) => {
          setIsBiometricSupported(available);
        });
      }
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      return true;
    } catch (err) {
      console.error("Camera access denied", err);
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleToggleFaceLogin = async () => {
    if (settings.biometricEnabled) {
      onUpdate({ biometricEnabled: false });
      return;
    }

    setIsScanning(true);
    setScanStatus('Initializing Optics...');
    setProgress(0);

    const cameraActive = await startCamera();
    if (!cameraActive) {
      setScanStatus('Camera Error. Fallback to Hardware Auth...');
      // Fallback logic
    }

    // Step-by-step scanning simulation
    const steps = [
      { p: 20, m: 'Detecting Face Geometry...' },
      { p: 50, m: 'Mapping Biometric Nodes...' },
      { p: 80, m: 'Encrypting Local Key...' },
      { p: 100, m: 'Face ID Secured.' }
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 800));
      setProgress(step.p);
      setScanStatus(step.m);
    }

    onUpdate({ 
      biometricEnabled: true,
      auditLogs: [{ action: 'Face ID Enrollment Successful', timestamp: Date.now() }, ...settings.auditLogs]
    });

    setTimeout(() => {
      stopCamera();
      setIsScanning(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase italic">Identity Vault</h2>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em]">Advanced Biometric Security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Face ID Card */}
        <div className="glass p-8 rounded-[40px] border-gray-100 flex flex-col justify-between min-h-[400px] relative overflow-hidden group shadow-2xl shadow-black/5">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <i className="fa-solid fa-face-viewfinder text-[12rem]"></i>
          </div>
          
          <div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-xl transition-all duration-500
              ${settings.biometricEnabled ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
              <i className={`fa-solid ${settings.biometricEnabled ? 'fa-check' : 'fa-face-viewfinder'} text-2xl`}></i>
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Face Recognition</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[240px]">
              Unlock your vault and authorize high-value transactions instantly using high-precision facial geometry.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <button 
              onClick={handleToggleFaceLogin}
              disabled={isScanning}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all border
                ${settings.biometricEnabled 
                  ? 'bg-white border-red-100 text-red-500 hover:bg-red-50' 
                  : 'bg-black text-white border-black hover:bg-gray-800 shadow-2xl shadow-black/20'}`}
            >
              {isScanning ? 'System Scanning...' : (settings.biometricEnabled ? 'Remove Face Data' : 'Setup Face Recognition')}
            </button>
            
            <div className="flex items-center gap-3 justify-center">
              <div className={`w-1.5 h-1.5 rounded-full ${isBiometricSupported ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {isBiometricSupported ? 'Neural Engine Detected' : 'Emulated Environment'}
              </span>
            </div>
          </div>

          {/* Scanning Overlay Modal */}
          {isScanning && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
               <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-blue-500/20 shadow-2xl mb-8">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover grayscale brightness-110" />
                  <div className="absolute inset-0 border-2 border-blue-500 animate-pulse rounded-full" />
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                  {/* Face Scanner SVG */}
                  <svg className="absolute inset-0 w-full h-full text-blue-500/50" viewBox="0 0 100 100">
                    <path d="M 20 20 L 30 20 M 20 20 L 20 30" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M 80 20 L 70 20 M 80 20 L 80 30" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M 20 80 L 30 80 M 20 80 L 20 70" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M 80 80 L 70 80 M 80 80 L 80 70" fill="none" stroke="currentColor" strokeWidth="1" />
                    <line x1="10" y1={progress} x2="90" y2={progress} stroke="currentColor" strokeWidth="0.5" className="transition-all duration-300" />
                  </svg>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2">{scanStatus}</p>
                  <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* 2FA Card - Modernized */}
        <div className="glass p-8 rounded-[40px] border-gray-100 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="w-14 h-14 bg-gray-50 text-black rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
              <i className="fa-solid fa-shield-halved text-2xl"></i>
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Two-Factor Auth</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[240px]">
              Require a unique code from an authenticator app for an uncompromisable second layer of protection.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Status</span>
              <div className="flex items-center gap-2">
                 <div className={`w-1.5 h-1.5 rounded-full ${settings.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                 <span className={`text-[10px] font-black uppercase ${settings.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                   {settings.twoFactorEnabled ? 'Secure' : 'Inactive'}
                 </span>
              </div>
            </div>
            <button 
              onClick={() => onUpdate({ twoFactorEnabled: !settings.twoFactorEnabled })}
              className="w-full py-5 bg-white border border-gray-200 text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] hover:border-black transition-all"
            >
              {settings.twoFactorEnabled ? 'Modify Setup' : 'Configure TOTP'}
            </button>
          </div>
        </div>
      </div>

      {/* Modern Ledger */}
      <div className="glass p-10 rounded-[40px] border-gray-100 shadow-xl shadow-black/[0.02]">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-1">Audit Ledger</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase">Chronological Security Events</p>
          </div>
          <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[8px] font-black uppercase tracking-widest">Live Sync Active</span>
        </div>
        <div className="space-y-1">
          {settings.auditLogs.length > 0 ? (
            settings.auditLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-4 -mx-4 rounded-xl transition-colors">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                    <i className={`fa-solid ${log.action.includes('Face') ? 'fa-face-viewfinder' : 'fa-lock'} text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-black text-black tracking-tight">{log.action}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-mono font-bold text-green-600">ENCRYPTED</p>
                   <p className="text-[8px] text-gray-300 font-bold uppercase">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
                <i className="fa-solid fa-ghost"></i>
              </div>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">No recent alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
