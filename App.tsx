
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AssetType, UserState, Transaction, CollateralAsset, SecuritySettings, LithicEnrollment, LithicCardDetails } from './types';
import { INITIAL_COLLATERAL, MOCK_MARKET_PRICES, ASSET_ICONS } from './constants';
import { Sidebar } from './components/Sidebar';
import { StatsGrid } from './components/StatsGrid';
import { CreditCard } from './components/CreditCard';
import { CollateralManager } from './components/CollateralManager';
import { TransactionList } from './components/TransactionList';
import { SecurityView } from './components/SecurityView';
import { lithic } from './services/lithicService';
import { 
  calculateTotalCollateralValue, 
  calculateMaxCreditLimit, 
  calculateHealthFactor 
} from './services/collateralService';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

interface AuthCompleteData {
  account: string;
  card: string;
  cardDetails?: LithicCardDetails;
}

const AuthFlow: React.FC<{ onComplete: (name: string, data: AuthCompleteData) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'email-login' | 'verify-code' | 'face-scan' | 'doc-upload' | 'signup' | 'pii' | 'verifying' | 'success'>('welcome');
  const [formData, setFormData] = useState<LithicEnrollment>({
    first_name: '',
    last_name: '',
    email: '',
    dob: '',
    address: {
      address1: '',
      city: '',
      state: 'NY',
      postal_code: '',
      country: 'USA'
    },
    ssn_last_four: ''
  });
  
  const [verifyingStatus, setVerifyingStatus] = useState('Initializing...');
  const [scanProgress, setScanProgress] = useState(0);
  const [isDocScanning, setIsDocScanning] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const sendVerificationCode = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsSendingCode(true);
    setEmailError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }
      
      setStep('verify-code');
    } catch (e: any) {
      setEmailError(e.message || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setEmailError('Please enter the 6-digit code');
      return;
    }
    
    setIsVerifyingCode(true);
    setEmailError('');
    
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: verificationCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }
      
      setStep('face-scan');
    } catch (e: any) {
      setEmailError(e.message || 'Failed to verify code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Handle camera lifecycle
  useEffect(() => {
    let interval: any;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Start the scanning simulation progress
          let p = 0;
          interval = setInterval(() => {
            p += 1;
            setScanProgress(p);
            if (p >= 100) {
              clearInterval(interval);
              setTimeout(() => {
                stopCamera();
                setStep('doc-upload');
                setScanProgress(0);
              }, 1200);
            }
          }, 45);
        }
      } catch (e) {
        console.error("Camera access denied or failed", e);
        alert("Camera is required for Identity Verification. Please enable permissions.");
        setStep('welcome');
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    if (step === 'face-scan') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDoc(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = () => {
    if (!uploadedDoc) {
      fileInputRef.current?.click();
      return;
    }
    
    setIsDocScanning(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setScanProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsDocScanning(false);
          setStep('signup');
        }, 1000);
      }
    }, 80);
  };

  const handleEnroll = async () => {
    setStep('verifying');
    setVerifyingStatus('Executing Cryptographic Handshake...');
    
    try {
      const account = await lithic.enrollAccount(formData);
      setVerifyingStatus('Provisioning Virtual Asset Vault...');
      const accountToken = account.account_token || account.token;
      const card = await lithic.createCard(accountToken);
      
      const cardDetails: LithicCardDetails = {
        token: card.token,
        pan: card.pan,
        cvv: card.cvv,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        last_four: card.last_four,
        spend_limit: card.spend_limit || 0,
        state: card.state
      };
      
      setVerifyingStatus('Finalizing Global Credit Line...');
      setTimeout(() => {
        setStep('success');
        onComplete(`${formData.first_name} ${formData.last_name}`, { 
          account: account.token, 
          card: card.token,
          cardDetails 
        });
      }, 2000);
    } catch (e: any) {
      console.error('Enrollment error:', e);
      setVerifyingStatus('Error: ' + (e.message || 'Connection failed. Please try again.'));
    }
  };

  const logoUrl = "/logo.png";
  const stepsList = ['Email', 'Face ID', 'Documents', 'Profile', 'Vault'];
  const currentIdx = ['email-login', 'verify-code', 'face-scan', 'doc-upload', 'signup', 'pii'].indexOf(step);
  const displayIdx = step === 'verify-code' ? 0 : currentIdx;

  return (
    <div className="fixed inset-0 bg-[#ffffff] z-[100] flex items-center justify-center p-6 overflow-hidden font-sans">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#eff6ff_0%,#ffffff_50%)]"></div>
        <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-blue-100 rounded-full blur-[120px] opacity-40"></div>
      </div>

      <div className="max-w-2xl w-full relative z-10 flex flex-col items-center">
        {/* Minimal Progress Tracker */}
        {currentIdx !== -1 && (
          <div className="flex justify-center items-center gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
            {stepsList.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${i <= displayIdx ? 'bg-black' : 'bg-gray-200'}`}></div>
                <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${i <= displayIdx ? 'text-black' : 'text-gray-300'}`}>{s}</span>
                {i < stepsList.length - 1 && <div className="w-3 h-[1px] bg-gray-100 ml-1"></div>}
              </div>
            ))}
          </div>
        )}

        <div className="w-full bg-white rounded-[50px] border border-gray-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] relative overflow-hidden min-h-[640px] flex flex-col transition-all duration-700">
          
          <div className="flex-1 p-16 flex flex-col justify-center">
            
            {step === 'welcome' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 text-center">
                <div className="space-y-8">
                  <div className="w-20 h-20 flex items-center justify-center mx-auto transition-transform hover:scale-110">
                    <img src={logoUrl} alt="Solux" className="w-20 h-20 object-contain" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black tracking-tighter text-black uppercase italic">Solux</h2>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">The New Standard of Credit</p>
                  </div>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">
                    Secure your assets with next-generation identity verification. Begin your journey.
                  </p>
                </div>
                <button onClick={() => setStep('email-login')} className="w-full py-6 bg-black text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl hover:bg-gray-800 active:scale-95 transition-all">
                  Identity Enrollment
                </button>
              </div>
            )}

            {step === 'email-login' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                    <i className="fa-solid fa-envelope text-2xl text-blue-500"></i>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Email Verification</h3>
                  <p className="text-sm text-gray-400 font-medium">We'll send a verification code to your email.</p>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      setEmailError('');
                    }}
                    placeholder="Enter your email address"
                    className="w-full px-6 py-5 bg-gray-50 rounded-2xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-black border border-gray-100 transition-all"
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm font-medium text-center">{emailError}</p>
                  )}
                </div>

                <button 
                  onClick={sendVerificationCode}
                  disabled={isSendingCode || !formData.email}
                  className="w-full py-5 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingCode ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending Code...
                    </span>
                  ) : 'Send Verification Code'}
                </button>
              </div>
            )}

            {step === 'verify-code' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                    <i className="fa-solid fa-shield-check text-2xl text-green-500"></i>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Enter Code</h3>
                  <p className="text-sm text-gray-400 font-medium">We sent a 6-digit code to <span className="text-black font-bold">{formData.email}</span></p>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(val);
                      setEmailError('');
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-6 py-5 bg-gray-50 rounded-2xl text-3xl font-black text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-black border border-gray-100 transition-all"
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm font-medium text-center">{emailError}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={verifyCode}
                    disabled={isVerifyingCode || verificationCode.length !== 6}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingCode ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Verifying...
                      </span>
                    ) : 'Verify Code'}
                  </button>
                  <button 
                    onClick={() => { setStep('email-login'); setVerificationCode(''); setEmailError(''); }}
                    className="w-full py-3 text-gray-400 font-bold text-xs hover:text-black transition-colors"
                  >
                    Use Different Email
                  </button>
                </div>
              </div>
            )}

            {step === 'face-scan' && (
              <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 text-center flex flex-col items-center">
                <div className="relative">
                  <div className="w-80 h-80 rounded-full overflow-hidden border-[8px] border-gray-50 shadow-2xl bg-black relative">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1] brightness-125 contrast-110" 
                    />
                    {/* Scanner Effects Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] z-10" 
                         style={{ transform: `translateY(${scanProgress * 3.2}px)` }}></div>
                    
                    {/* Corner Frames */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg"></div>
                    <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg"></div>
                    <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg"></div>
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg"></div>
                  </div>
                  
                  {/* Outer Circular Progress */}
                  <svg className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] -rotate-90">
                    <circle cx="168" cy="168" r="160" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                    <circle cx="168" cy="168" r="160" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="1005" strokeDashoffset={1005 - (10.05 * scanProgress)} className="transition-all duration-300" />
                  </svg>
                </div>

                <div className="space-y-3 mt-4">
                  <h3 className="text-xl font-black tracking-[0.2em] uppercase italic">Face Identity Scan</h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">
                      {scanProgress < 100 ? `Analyzing Landmarks: ${scanProgress}%` : 'Identity Verified'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 'doc-upload' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="space-y-2 text-center">
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Document Repository</h3>
                  <p className="text-sm text-gray-400 font-medium">Upload your legal identity document.</p>
                </div>

                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div 
                  onClick={() => !uploadedDoc && fileInputRef.current?.click()}
                  className={`group relative h-72 bg-gray-50 border-2 border-dashed border-gray-100 rounded-[40px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-black hover:bg-white overflow-hidden
                    ${isDocScanning ? 'pointer-events-none' : ''}`}
                >
                  {isDocScanning ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center space-y-8">
                      <div className="w-full max-w-[240px] h-32 bg-gray-100 rounded-2xl relative overflow-hidden border border-gray-200">
                         <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] z-10 transition-all duration-500" style={{ top: `${scanProgress}%` }}></div>
                         {docPreview && <img src={docPreview} alt="Document" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Verifying Document...</p>
                    </div>
                  ) : uploadedDoc ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                      {docPreview && docPreview.startsWith('data:image') ? (
                        <img src={docPreview} alt="Document Preview" className="max-h-40 max-w-full object-contain rounded-lg border border-gray-200 shadow-lg" />
                      ) : (
                        <div className="w-20 h-24 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100">
                          <i className="fa-solid fa-file-pdf text-3xl text-red-500"></i>
                        </div>
                      )}
                      <p className="text-xs font-bold text-gray-600">{uploadedDoc.name}</p>
                      <p className="text-[9px] text-gray-400">({(uploadedDoc.size / 1024).toFixed(1)} KB)</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-gray-50 group-hover:rotate-6 transition-transform">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl"></i>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-black">Click to Upload ID / Passport</p>
                    </>
                  )}
                </div>
                
                {uploadedDoc && !isDocScanning && (
                  <div className="flex gap-4">
                    <button onClick={() => { setUploadedDoc(null); setDocPreview(null); }} className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-sm hover:bg-gray-50">
                      Change File
                    </button>
                    <button onClick={handleDocUpload} className="flex-1 py-4 bg-black text-white rounded-2xl font-bold text-sm">
                      Verify Document
                    </button>
                  </div>
                )}
                
                <p className="text-[9px] text-center text-gray-300 font-bold uppercase tracking-widest">Supports JPG, PNG, PDF up to 10MB</p>
              </div>
            )}

            {step === 'signup' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Customer Profile</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Step 03 of 04</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
                       <input type="text" placeholder="John" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
                       <input type="text" placeholder="Doe" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                     <input type="email" placeholder="john.doe@email.com" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Street Address</label>
                     <input type="text" placeholder="123 Main Street, Apt 4B" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.address.address1} onChange={e => setFormData({...formData, address: {...formData.address, address1: e.target.value}})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">City</label>
                       <input type="text" placeholder="New York" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">State</label>
                       <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})}>
                         {US_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                       </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Postal Code</label>
                       <input type="text" placeholder="10001" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.address.postal_code} onChange={e => setFormData({...formData, address: {...formData.address, postal_code: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Country</label>
                       <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.address.country} onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})}>
                         <option value="USA">United States</option>
                       </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setStep('pii')} 
                  disabled={!formData.first_name || !formData.last_name || !formData.email || !formData.address.address1 || !formData.address.city || !formData.address.postal_code}
                  className="w-full py-5 bg-black text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Next Step
                </button>
              </div>
            )}

            {step === 'pii' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="space-y-2 text-center">
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">Regulatory Check</h3>
                  <p className="text-sm text-gray-400 font-medium">Final compliance verification.</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Date of Birth</label>
                     <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[18px] text-sm font-bold focus:bg-white focus:border-black transition-all outline-none" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                  </div>
                  <div className="p-8 bg-black rounded-[32px] space-y-5 shadow-2xl shadow-black/20">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Last 4 Digits SSN</label>
                        <span className="text-[8px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-black border border-green-500/20">ENCRYPTED</span>
                     </div>
                     <input type="password" maxLength={4} placeholder="••••" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-2xl font-bold text-white tracking-[1.5em] text-center outline-none focus:border-blue-500 transition-all" value={formData.ssn_last_four} onChange={e => setFormData({...formData, ssn_last_four: e.target.value.replace(/\D/g, '').slice(0, 4)})} />
                     <p className="text-[9px] text-white/30 text-center font-medium leading-relaxed">Required for identity verification. Never stored.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep('signup')} className="w-1/3 py-5 bg-white border border-gray-100 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50">Back</button>
                  <button onClick={handleEnroll} disabled={!formData.first_name || !formData.last_name || !formData.email || !formData.dob || formData.ssn_last_four.length < 4} className="flex-1 py-5 bg-black text-white rounded-[20px] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Submit Enrollment</button>
                </div>
              </div>
            )}

            {step === 'verifying' && (
              <div className="flex flex-col items-center justify-center text-center space-y-12 py-12 animate-in fade-in zoom-in duration-700">
                 <div className="relative">
                    <div className={`w-36 h-36 border-[1px] border-gray-100 border-t-black rounded-full ${verifyingStatus.startsWith('Error') ? '' : 'animate-spin'}`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       {verifyingStatus.startsWith('Error') ? (
                         <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500"></i>
                       ) : (
                         <img src={logoUrl} className="w-10 h-10 object-contain animate-pulse" alt="Solux" />
                       )}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-xl font-black tracking-[0.2em] uppercase italic">
                      {verifyingStatus.startsWith('Error') ? 'Enrollment Failed' : 'Deploying Smart Vault'}
                    </h3>
                    <div className={`px-10 py-4 rounded-full border inline-block shadow-sm ${verifyingStatus.startsWith('Error') ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                       <p className={`text-[11px] font-mono font-bold ${verifyingStatus.startsWith('Error') ? 'text-red-500' : 'text-gray-400'}`}>{verifyingStatus}</p>
                    </div>
                    {verifyingStatus.startsWith('Error') && (
                      <button onClick={() => setStep('pii')} className="mt-4 px-8 py-3 bg-black text-white rounded-full font-bold text-sm">
                        Try Again
                      </button>
                    )}
                 </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col justify-center text-center space-y-12 py-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                 <div className="relative w-44 h-44 mx-auto">
                    <div className="absolute inset-0 bg-black/5 rounded-full animate-ping duration-[3s]"></div>
                    <div className="relative w-44 h-44 bg-black text-white rounded-full flex items-center justify-center text-7xl border border-gray-100 shadow-2xl z-10 transition-transform hover:scale-105">
                      <i className="fa-solid fa-check scale-75"></i>
                    </div>
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-4xl font-black tracking-tighter uppercase italic">Welcome Aboard.</h3>
                   <p className="text-sm text-gray-400 font-medium px-16 leading-relaxed">Your credit line is secured by your assets and authenticated by your identity.</p>
                 </div>
                 <button onClick={() => {}} className="w-full py-6 bg-black text-white rounded-[28px] font-black text-[12px] uppercase tracking-[0.3em] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all">
                  Access Mainframe
                </button>
              </div>
            )}

          </div>

          <div className="px-16 py-8 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Session Protocol</span>
                <span className="text-[10px] font-bold text-black flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                   TLS 1.3 // End-to-End Encrypted
                </span>
             </div>
             <div className="flex gap-6 opacity-20">
                <i className="fa-solid fa-fingerprint text-xs"></i>
                <i className="fa-solid fa-microchip text-xs"></i>
                <i className="fa-solid fa-shield-halved text-xs"></i>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeView, setActiveView] = useState('Overview');
  const [isLoading, setIsLoading] = useState(true);
  const [userState, setUserState] = useState<UserState>({
    walletAddress: '0xLithic_Mainnet_Gateway',
    collateral: INITIAL_COLLATERAL,
    creditUsed: 1250.45,
    totalLimit: calculateMaxCreditLimit(INITIAL_COLLATERAL),
    transactions: [],
    isCardFrozen: false,
    security: {
      biometricEnabled: false,
      twoFactorEnabled: false,
      spendingLimit: 5000,
      ipWhitelist: ['127.0.0.1'],
      auditLogs: []
    }
  });


  const handleAuthComplete = (name: string, data: AuthCompleteData) => {
    setUserName(name);
    const cardLimit = data.cardDetails?.spend_limit && data.cardDetails.spend_limit > 0 
      ? data.cardDetails.spend_limit / 100 
      : 10000;
    setUserState(prev => ({
      ...prev,
      lithicAccountToken: data.account,
      lithicCardToken: data.card,
      lithicCardDetails: data.cardDetails ? {
        ...data.cardDetails,
        spend_limit: data.cardDetails.spend_limit > 0 ? data.cardDetails.spend_limit : 1000000
      } : undefined,
      creditUsed: 0,
      totalLimit: cardLimit
    }));
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const simulateSwipe = async () => {
    if (!userState.lithicCardToken) return;

    const merchants = ['Amazon', 'Uber', 'Starbucks', 'App Store'];
    const amount = parseFloat((Math.random() * 200 + 10).toFixed(2));
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];

    try {
      const lithicResp = await lithic.simulateAuthorization(userState.lithicCardToken, amount * 100, merchant);

      const newTx: Transaction = {
        id: lithicResp.token,
        merchant: merchant,
        amount,
        timestamp: Date.now(),
        status: 'COMPLETED',
        category: 'Sandbox'
      };

      setUserState(prev => ({
        ...prev,
        creditUsed: prev.creditUsed + amount,
        transactions: [newTx, ...prev.transactions]
      }));
    } catch (e) {
      console.error("Auth simulation failed");
    }
  };

  if (!isAuthenticated) return <AuthFlow onComplete={handleAuthComplete} />;

  const renderContent = () => {
    switch (activeView) {
      case 'Overview':
        return (
          <>
            <StatsGrid 
              totalCollateral={calculateTotalCollateralValue(userState.collateral)}
              creditUsed={userState.creditUsed}
              maxLimit={userState.totalLimit}
              healthFactor={calculateHealthFactor(userState.totalLimit, userState.creditUsed)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                <CreditCard balance={userState.creditUsed} limit={userState.totalLimit} isFrozen={userState.isCardFrozen} onToggleFreeze={() => setUserState(p => ({...p, isCardFrozen: !p.isCardFrozen}))} cardDetails={userState.lithicCardDetails} />
                <TransactionList transactions={userState.transactions.slice(0, 5)} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-8 space-y-8">
                 <CollateralManager assets={userState.collateral} onDeposit={(type, amt) => {
                    console.log('Deposit:', type, amt);
                 }} isLoading={isLoading} />
                 <div className="glass p-8 rounded-[32px] border border-gray-100 flex flex-col items-center justify-center text-center shadow-xl shadow-black/[0.02]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Live Lithic Context</p>
                    <p className="text-[10px] font-mono font-bold bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 mb-2">{userState.lithicAccountToken}</p>
                    <div className="flex gap-2">
                       <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[8px] font-bold">API_KEY_LOADED</span>
                       <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-bold">SANDBOX_ACTIVE</span>
                    </div>
                 </div>
              </div>
            </div>
          </>
        );
      case 'Security':
        return (
          <SecurityView 
            settings={userState.security} 
            onUpdate={(updates) => setUserState(prev => ({
              ...prev,
              security: { ...prev.security, ...updates }
            }))}
          />
        );
      default:
        return <div className="flex items-center justify-center h-64 text-gray-400 italic">Module {activeView} is coming soon...</div>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#ffffff]">
      <Sidebar walletAddress={userState.walletAddress} userName={userName} activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-black tracking-tighter uppercase italic">SOLUX</h1>
            <div className="px-3 py-1 bg-black text-white rounded-full text-[8px] font-black tracking-widest uppercase shadow-lg shadow-black/10">Real Sandbox Active</div>
          </div>
          <div className="flex gap-3">
            <button onClick={simulateSwipe} className="px-6 py-2.5 bg-black text-white rounded-lg font-bold text-sm shadow-xl shadow-black/10 active:scale-95 transition-all">
              <i className="fa-solid fa-credit-card mr-2"></i> Simulate Swipe
            </button>
            <button onClick={() => setActiveView('Security')} className="border px-4 py-2.5 rounded-lg flex items-center gap-2 bg-white border-gray-200 shadow-sm hover:border-black transition-colors">
              <div className={`w-2 h-2 rounded-full animate-pulse ${userState.security.biometricEnabled ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span className="text-xs font-mono font-bold tracking-tight">{userName || 'Connecting...'}</span>
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
